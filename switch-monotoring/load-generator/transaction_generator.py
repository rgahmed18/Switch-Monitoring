"""
Switch Monitoring — Load Generator
Simule 100 000 transactions ISO 8583 vers Kafka (topic: channel-transactions)
Canaux: ATM/GAB, POS, E-Commerce | 5 % fraude | comportement humain réaliste

Usage:
    python transaction_generator.py [--total 100000] [--tps 200] [--broker localhost:9092]
"""

import argparse
import json
import logging
import random
import signal
import sys
import threading
import time
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

try:
    from kafka import KafkaProducer
    from kafka.errors import KafkaError, NoBrokersAvailable
except ImportError:
    print("[ERREUR] kafka-python non installé. Lancer: pip install kafka-python")
    sys.exit(1)

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("load-gen")

# ─── Configuration ────────────────────────────────────────────────────────────
DEFAULT_BROKER   = "localhost:9092"
TOPIC            = "channel-transactions"
TOTAL_DEFAULT    = 100_000
TPS_DEFAULT      = 200          # transactions par seconde cible
BATCH_SIZE       = 50           # messages par lot Kafka
FRAUD_RATE       = 0.05         # 5 % de transactions frauduleuses
TIMEOUT_RATE     = 0.02         # 2 % de timeouts réseau
REVERSAL_RATE    = 0.04         # 4 % de reversals

# ─── Référentiel Maroc ────────────────────────────────────────────────────────
BANKS_MA = ["ATW", "BCP", "BMCE", "CIH", "BMCI", "CDM", "SG", "CFG", "CAM", "ABB"]

ZONES   = ["Local", "International"]
COUNTRIES = {
    "Local":         [("504", "MAD")],
    "International": [("250", "EUR"), ("826", "GBP"), ("840", "USD"),
                      ("276", "EUR"), ("724", "EUR"), ("380", "EUR")],
}

# MTI PowerCARD (4 caractères)
MTI = {
    "auth_req":  "1100",
    "auth_resp": "1110",
    "fin_req":   "1200",
    "fin_resp":  "1210",
    "reversal":  "1420",
}

# Codes réponse PowerCARD (3 chiffres)
RESPONSE_CODES = {
    "approved":    ("000", "APPROVED"),
    "insuf_funds": ("051", "DECLINED"),
    "blocked":     ("102", "DECLINED"),
    "expired":     ("033", "DECLINED"),
    "fraud":       ("105", "DECLINED"),
    "timeout":     ("906", "DECLINED"),
    "unavail":     ("911", "DECLINED"),
    "limit":       ("061", "DECLINED"),
}

# MCC codes (activité commerciale)
MCC_POS  = ["5411", "5541", "5812", "5912", "4111", "5999", "7011", "5651",
             "5311", "5331", "7296", "8011", "5621", "5661", "5732"]
MCC_ECOM = ["5999", "7372", "5045", "5961", "7011", "5734", "5963", "4816"]

MERCHANTS_ECOM = [
    "JUMIA MAROC", "AVITO MAROC", "AMAZON.FR", "BOOKING.COM",
    "ALIEXPRESS", "MARJANE ONLINE", "PAYPAL", "FNAC.COM",
    "AIR ARABIA ECOM", "CMAM ECOM",
]
MERCHANTS_POS = [
    "MARJANE ANFA", "CARREFOUR MAARIF", "STATION ZAKA",
    "PHARMACIE ATLAS", "RESTAURANT RIAD", "HOTEL KENZI",
    "LABEL VIE AIN DIAB", "BOULANGERIE BRIOCHES", "OPTICIEN OPTIKA",
]

SECURITY_METHODS = {
    "ATM":  "PIN",
    "POS":  random.choice(["PIN", "EMV_CHIP", "CONTACTLESS"]),
    "ECOM": "3DS",
}
POS_ENTRY_MODES = {
    "ATM":  "01",
    "POS":  random.choice(["05", "07", "02"]),
    "ECOM": "81",
}

# ─── Compteurs globaux ────────────────────────────────────────────────────────
_counters = {
    "sent": 0, "errors": 0, "fraud": 0,
    "atm": 0,  "pos": 0,    "ecom": 0,
    "approved": 0, "declined": 0,
}
_lock = threading.Lock()
_stop = threading.Event()


def _inc(key: str, n: int = 1):
    with _lock:
        _counters[key] += n


# ─── Générateurs de données ───────────────────────────────────────────────────

def _stan() -> str:
    return str(random.randint(100000, 999999))


def _rrn() -> str:
    return str(random.randint(100000000000, 999999999999))


def _card() -> str:
    prefix = random.choice(["4539", "5168", "3714", "4111", "4916"])
    mid    = "".join([str(random.randint(0, 9)) for _ in range(8)])
    last4  = str(random.randint(1000, 9999))
    return f"{prefix[:4]} **** **** {last4}"


def _pick_zone_country() -> tuple:
    zone = random.choices(["Local", "International"], weights=[80, 20])[0]
    country_code, currency = random.choice(COUNTRIES[zone])
    return zone, country_code, currency


def _response(is_fraud: bool, is_timeout: bool) -> tuple:
    if is_timeout:
        code, status = RESPONSE_CODES["timeout"]   if random.random() < 0.5 else RESPONSE_CODES["unavail"]
        return code, status
    if is_fraud:
        code, status = random.choice([
            RESPONSE_CODES["fraud"],
            RESPONSE_CODES["blocked"],
            RESPONSE_CODES["approved"],  # fraude non détectée
        ])
        return code, status
    weights = [88, 5, 2, 2, 1, 1, 1]
    choices = ["approved", "insuf_funds", "expired", "limit", "blocked", "fraud", "timeout"]
    key = random.choices(choices, weights=weights)[0]
    return RESPONSE_CODES[key]


def _latency(response_code: str) -> int:
    if response_code in ("906", "911", "908", "909"):
        return random.randint(8000, 30000)
    if response_code == "000":
        return random.randint(80, 600)
    return random.randint(150, 1500)


def _now_offset(max_sec: int = 3600) -> str:
    dt = datetime.now() - timedelta(seconds=random.randint(0, max_sec))
    return dt.isoformat()


def generate_atm_transaction(seq_id: int, is_fraud: bool, is_timeout: bool) -> dict:
    zone, country, currency = _pick_zone_country()
    bank        = random.choice(BANKS_MA)
    acquirer_id = f"ATM{bank}{random.randint(100, 999):03d}"
    terminal_id = f"T{random.randint(10000000, 99999999)}"
    resp_code, status = _response(is_fraud, is_timeout)

    amount = (
        round(random.uniform(50000, 200000), 2) if is_fraud
        else round(random.uniform(200, 5000), 2)
    )

    return {
        "id":               seq_id,
        "external_id":      f"ATM-{uuid.uuid4().hex[:12].upper()}",
        "timestamp":        _now_offset(3600),
        "event_timestamp":  datetime.now().isoformat(),
        "mti_code":         MTI["fin_req"],
        "stan":             _stan(),
        "rrn":              _rrn(),
        "amount":           amount,
        "currency":         currency,
        "response_code":    resp_code,
        "terminal_id":      terminal_id,
        "atm_id":           acquirer_id,
        "merchant_name":    f"Retrait GAB {bank}-{terminal_id[-4:]}",
        "acquirer_id":      acquirer_id,
        "issuer_id":        random.choice(BANKS_MA),
        "latency_ms":       _latency(resp_code),
        "status":           status,
        "zone":             zone,
        "channel":          "ATM",
        "actor_type":       "ACQUIRER",
        "payment_network":  random.choice(["CMI", "VISA", "MASTERCARD"]),
        "operation_type":   "RETRAIT",
        "security_method":  "PIN",
        "card_number_masked": _card(),
        "mcc_code":         "6011",
        "pos_entry_mode":   "01",
        "is_same_bank":     random.random() < 0.4,
        "bill_level":       random.choice([200, 100, 50, 500, 1000]),
        "country_code":     country,
    }


def generate_pos_transaction(seq_id: int, is_fraud: bool, is_timeout: bool) -> dict:
    zone, country, currency = _pick_zone_country()
    bank        = random.choice(BANKS_MA)
    mcc         = random.choice(MCC_POS)
    terminal_id = f"T{random.randint(10000000, 99999999)}"
    acquirer_id = f"POS{bank}{random.randint(1000, 9999)}"
    merchant    = random.choice(MERCHANTS_POS)
    resp_code, status = _response(is_fraud, is_timeout)
    entry_mode  = random.choices(["05", "07", "02"], weights=[60, 30, 10])[0]
    sec_method  = "CONTACTLESS" if entry_mode == "07" else "EMV_CHIP" if entry_mode == "05" else "MAG_STRIPE"

    amount = (
        round(random.uniform(5000, 50000), 2) if is_fraud
        else round(random.uniform(20, 3000), 2)
    )

    return {
        "id":               seq_id,
        "external_id":      f"POS-{uuid.uuid4().hex[:12].upper()}",
        "timestamp":        _now_offset(3600),
        "event_timestamp":  datetime.now().isoformat(),
        "mti_code":         MTI["fin_req"],
        "stan":             _stan(),
        "rrn":              _rrn(),
        "amount":           amount,
        "currency":         currency,
        "response_code":    resp_code,
        "terminal_id":      terminal_id,
        "merchant_name":    merchant,
        "acquirer_id":      acquirer_id,
        "issuer_id":        random.choice(BANKS_MA),
        "latency_ms":       _latency(resp_code),
        "status":           status,
        "zone":             zone,
        "channel":          "POS",
        "actor_type":       "ACQUIRER",
        "payment_network":  random.choice(["CMI", "VISA", "MASTERCARD"]),
        "operation_type":   "PAIEMENT",
        "security_method":  sec_method,
        "card_number_masked": _card(),
        "mcc_code":         mcc,
        "pos_entry_mode":   entry_mode,
        "is_same_bank":     random.random() < 0.3,
        "country_code":     country,
    }


def generate_ecom_transaction(seq_id: int, is_fraud: bool, is_timeout: bool) -> dict:
    zone, country, currency = _pick_zone_country()
    bank     = random.choice(BANKS_MA)
    merchant = random.choice(MERCHANTS_ECOM)
    mcc      = random.choice(MCC_ECOM)
    resp_code, status = _response(is_fraud, is_timeout)

    amount = (
        round(random.uniform(2000, 80000), 2) if is_fraud
        else round(random.uniform(50, 5000), 2)
    )

    # 3DS échoue plus souvent sur fraude
    sec_method = "3DS" if not is_fraud or random.random() < 0.3 else "3DS_FAILED"

    return {
        "id":               seq_id,
        "external_id":      f"ECM-{uuid.uuid4().hex[:12].upper()}",
        "timestamp":        _now_offset(3600),
        "event_timestamp":  datetime.now().isoformat(),
        "mti_code":         MTI["auth_req"],
        "stan":             _stan(),
        "rrn":              _rrn(),
        "amount":           amount,
        "currency":         currency,
        "response_code":    resp_code,
        "terminal_id":      None,
        "merchant_name":    merchant,
        "acquirer_id":      f"ECOM{bank}",
        "issuer_id":        random.choice(BANKS_MA),
        "latency_ms":       _latency(resp_code),
        "status":           status,
        "zone":             zone,
        "channel":          "ECOM",
        "actor_type":       "ISSUER",
        "payment_network":  random.choice(["VISA", "MASTERCARD"]),
        "operation_type":   "PAIEMENT_EN_LIGNE",
        "security_method":  sec_method,
        "card_number_masked": _card(),
        "mcc_code":         mcc,
        "pos_entry_mode":   "81",
        "is_same_bank":     False,
        "country_code":     country,
    }


def generate_reversal(seq_id: int) -> dict:
    """Reversal MTI 1420 — annulation d'une transaction précédente."""
    zone, country, currency = _pick_zone_country()
    channel = random.choice(["ATM", "POS", "ECOM"])
    bank    = random.choice(BANKS_MA)

    return {
        "id":               seq_id,
        "external_id":      f"REV-{uuid.uuid4().hex[:12].upper()}",
        "timestamp":        _now_offset(7200),
        "event_timestamp":  datetime.now().isoformat(),
        "mti_code":         MTI["reversal"],
        "stan":             _stan(),
        "rrn":              _rrn(),
        "amount":           round(random.uniform(100, 5000), 2),
        "currency":         currency,
        "response_code":    "000",
        "terminal_id":      f"T{random.randint(10000000,99999999)}",
        "merchant_name":    "REVERSAL AUTO",
        "acquirer_id":      f"{channel}{bank}",
        "issuer_id":        random.choice(BANKS_MA),
        "latency_ms":       random.randint(200, 800),
        "status":           "REVERSED",
        "zone":             zone,
        "channel":          channel,
        "actor_type":       "ACQUIRER",
        "payment_network":  random.choice(["CMI", "VISA", "MASTERCARD"]),
        "operation_type":   "REVERSAL",
        "security_method":  "NONE",
        "card_number_masked": _card(),
        "mcc_code":         "0000",
        "pos_entry_mode":   "00",
        "is_same_bank":     random.random() < 0.3,
        "country_code":     country,
    }


def pick_generator(seq_id: int) -> dict:
    """Choisit le générateur selon les probabilités canal + type."""
    is_fraud   = random.random() < FRAUD_RATE
    is_timeout = random.random() < TIMEOUT_RATE
    is_reversal = random.random() < REVERSAL_RATE

    if is_reversal:
        return generate_reversal(seq_id), "reversal"

    # Distribution: ATM 30%, POS 50%, ECOM 20%
    channel = random.choices(["ATM", "POS", "ECOM"], weights=[30, 50, 20])[0]

    if channel == "ATM":
        return generate_atm_transaction(seq_id, is_fraud, is_timeout), "atm"
    elif channel == "POS":
        return generate_pos_transaction(seq_id, is_fraud, is_timeout), "pos"
    else:
        return generate_ecom_transaction(seq_id, is_fraud, is_timeout), "ecom"


# ─── Kafka Publisher ──────────────────────────────────────────────────────────

def create_producer(broker: str) -> KafkaProducer:
    return KafkaProducer(
        bootstrap_servers=broker,
        value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
        key_serializer=lambda k: k.encode("utf-8") if k else None,
        acks="all",
        retries=5,
        retry_backoff_ms=300,
        linger_ms=10,           # batch jusqu'à 10ms pour regrouper les messages
        batch_size=16384,
        compression_type="gzip",
        request_timeout_ms=30000,
        max_block_ms=10000,
    )


def on_send_success(record_metadata, tx_id: str):
    _inc("sent")


def on_send_error(exc, tx_id: str):
    _inc("errors")
    log.debug("[ERREUR KAFKA] %s — %s", tx_id, exc)


# ─── Progress reporter ────────────────────────────────────────────────────────

def _progress_reporter(total: int, interval: float = 5.0):
    start = time.time()
    while not _stop.is_set():
        time.sleep(interval)
        with _lock:
            sent    = _counters["sent"]
            errors  = _counters["errors"]
            fraud   = _counters["fraud"]
            atm     = _counters["atm"]
            pos     = _counters["pos"]
            ecom    = _counters["ecom"]
        elapsed = time.time() - start
        tps     = sent / elapsed if elapsed > 0 else 0
        pct     = sent / total * 100

        log.info(
            "[%6.1f%%] %7d/%d  |  TPS: %5.0f  |  ATM: %d  POS: %d  ECOM: %d  "
            "Fraude: %d  Erreurs: %d",
            pct, sent, total, tps, atm, pos, ecom, fraud, errors,
        )
        if sent >= total:
            break


# ─── Main ─────────────────────────────────────────────────────────────────────

def run(broker: str, total: int, tps: int):
    log.info("=" * 65)
    log.info("  SWITCH MONITORING — LOAD GENERATOR")
    log.info("  Broker    : %s", broker)
    log.info("  Topic     : %s", TOPIC)
    log.info("  Volume    : %s transactions", f"{total:,}")
    log.info("  Cible TPS : %s", tps)
    log.info("  Fraude    : %.0f %%  |  Timeout: %.0f %%", FRAUD_RATE*100, TIMEOUT_RATE*100)
    log.info("=" * 65)

    # Connexion Kafka
    producer = None
    for attempt in range(1, 6):
        try:
            producer = create_producer(broker)
            log.info("[OK] Connecté à Kafka (%s)", broker)
            break
        except NoBrokersAvailable:
            log.warning("[%d/5] Kafka indisponible, nouvelle tentative dans 5s...", attempt)
            time.sleep(5)

    if producer is None:
        log.error("[FATAL] Impossible de joindre Kafka après 5 tentatives.")
        sys.exit(1)

    # Thread de progression
    reporter = threading.Thread(
        target=_progress_reporter, args=(total,), daemon=True
    )
    reporter.start()

    # Gestion Ctrl+C
    def _graceful_stop(sig, frame):
        log.info("\n[ARRET] Signal reçu — vidage du buffer Kafka...")
        _stop.set()
        producer.flush(timeout=10)
        _print_summary(total, time.time() - start_time)
        sys.exit(0)

    signal.signal(signal.SIGINT, _graceful_stop)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, _graceful_stop)

    sleep_per_tx = 1.0 / tps  # secondes entre chaque transaction
    start_time   = time.time()

    for seq in range(1, total + 1):
        if _stop.is_set():
            break

        tx, channel = pick_generator(seq)

        # Compteurs par canal
        if channel in ("atm", "pos", "ecom"):
            _inc(channel)
        if tx.get("response_code") in ("102", "105", "106", "129"):
            _inc("fraud")
        if tx["status"] == "APPROVED":
            _inc("approved")
        else:
            _inc("declined")

        key = tx["external_id"]
        try:
            producer.send(TOPIC, value=tx, key=key) \
                    .add_callback(on_send_success, key) \
                    .add_errback(on_send_error, key)
        except KafkaError as e:
            _inc("errors")
            log.debug("[ERREUR] %s", e)

        # Flush par lot pour gérer la backpressure
        if seq % BATCH_SIZE == 0:
            producer.flush(timeout=5)

        # Micro-sleep humain réaliste (±30 % de jitter)
        jitter = sleep_per_tx * random.uniform(0.7, 1.3)
        time.sleep(jitter)

    # Flush final
    producer.flush(timeout=15)
    _stop.set()
    reporter.join(timeout=2)

    _print_summary(total, time.time() - start_time)
    producer.close()


def _print_summary(total: int, elapsed: float):
    with _lock:
        c = dict(_counters)
    tps_avg = c["sent"] / elapsed if elapsed > 0 else 0

    log.info("")
    log.info("═" * 65)
    log.info("  RAPPORT FINAL")
    log.info("─" * 65)
    log.info("  Envoyées     : %s / %s", f"{c['sent']:,}", f"{total:,}")
    log.info("  Erreurs Kafka: %s", f"{c['errors']:,}")
    log.info("  Durée totale : %.1f s  |  TPS moyen : %.0f", elapsed, tps_avg)
    log.info("  ATM : %s  |  POS : %s  |  ECOM : %s",
             f"{c['atm']:,}", f"{c['pos']:,}", f"{c['ecom']:,}")
    log.info("  Approuvées   : %s  |  Refusées : %s",
             f"{c['approved']:,}", f"{c['declined']:,}")
    log.info("  Transactions fraude détectées : %s (%.1f %%)",
             f"{c['fraud']:,}", c['fraud'] / max(c['sent'], 1) * 100)
    log.info("═" * 65)


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Load Generator — Switch Monitoring"
    )
    parser.add_argument("--total",  type=int, default=TOTAL_DEFAULT,
                        help=f"Nombre total de transactions (défaut: {TOTAL_DEFAULT:,})")
    parser.add_argument("--tps",    type=int, default=TPS_DEFAULT,
                        help=f"Transactions par seconde cible (défaut: {TPS_DEFAULT})")
    parser.add_argument("--broker", type=str, default=DEFAULT_BROKER,
                        help=f"Broker Kafka (défaut: {DEFAULT_BROKER})")
    args = parser.parse_args()

    run(broker=args.broker, total=args.total, tps=args.tps)
