package com.hps.switchmonitoring.service;

import com.hps.switchmonitoring.api.dto.CreateAuthoActivityAdmRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Simulateur de trafic ISO 8583 : genere automatiquement des transactions
 * realistes (montants, devises alpha ISO 4217, modes d'entree carte, reseaux)
 * par lots de {@link #TXS_PER_MINUTE} toutes les 60 secondes, jusqu'a
 * atteindre {@link #MAX_TOTAL} transactions.
 *
 * Utilise pour peupler le dashboard en environnement de demonstration/test
 * sans dependre d'un flux ISO 8583 reel. Pilotable via SimulatorController
 * (reset du compteur, purge et regeneration).
 */
@Component
public class IsoSimulatorTask {

    private static final int TXS_PER_MINUTE = 50;
    private static final int MAX_TOTAL       = 2000;

    private final AutohoActivityAdmService autohoActivityAdmService;
    private final Random random = new Random();
    private final AtomicInteger generated = new AtomicInteger(0);

    public void resetCounter() {
        generated.set(0);
    }

    public int getGenerated() {
        return generated.get();
    }

    // PowerCARD MTI format: 1100=auth request, 1200=presentment, 1420=reversal
    private static final String[] MTIS = {
        "1100", "1100", "1100", "1100", "1100",
        "1200", "1200",
        "1420"
    };

    // 3-char ISO 8583 action codes (matching REJECT_DESCRIPTIONS in ZoneHealthService)
    private static final String[] ACTION_CODES = {
        "000", "000", "000", "000", "000", "000", // approved (majority)
        "116",  // insufficient funds
        "117",  // wrong PIN
        "051",  // do not honor
        "014",  // invalid card
        "101",  // expired card
        "102"   // suspected fraud
    };

    // ISO 3166-1 numeric acquiring country codes
    private static final String[] COUNTRIES = {
        "504", "504", "504", "504",  // Morocco (majority domestic)
        "840",                        // USA
        "978",                        // Euro-zone (France)
        "826",                        // UK
        "682",                        // Saudi Arabia
        "784",                        // UAE
        "012",                        // Algeria
        "788"                         // Tunisia
    };

    // Country (ISO 3166 numeric) → devise ISO 4217 alpha-3 (cf. inject_data.sql
    // qui utilise deja des codes alpha : MAD/EUR/GBP/USD/TND — la table
    // AUTHO_ACTIVITY_ADM attend un CHAR(3) alpha, pas un code numerique).
    private static final Map<String, String> COUNTRY_CURRENCY = Map.of(
        "504", "MAD",   // Maroc
        "840", "USD",   // Etats-Unis
        "978", "EUR",   // Zone Euro
        "250", "EUR",   // France
        "826", "GBP",   // Royaume-Uni
        "682", "SAR",   // Arabie Saoudite
        "784", "AED",   // Emirats Arabes Unis
        "012", "DZD",   // Algerie
        "788", "TND"    // Tunisie
    );

    // Approximate conversion rate to MAD (1 foreign unit = N MAD)
    private static final Map<String, Double> RATE_TO_MAD = Map.of(
        "MAD", 1.0,
        "USD", 10.30,
        "EUR", 11.15,
        "GBP", 13.05,
        "SAR", 2.75,
        "AED", 2.80,
        "DZD", 0.075,
        "TND", 3.30
    );

    // POS merchants avec leur MCC associé [nom, mcc]
    private static final String[][] POS_MERCHANTS = {
        {"Marjane Casablanca",  "5411"},  // Supermarché
        {"Carrefour Rabat",     "5411"},  // Supermarché
        {"IKEA Zenata",         "5311"},  // Grand Magasin
        {"Decathlon Tangier",   "5651"},  // Vêtements/Sport
        {"Zara Mall",           "5651"},  // Vêtements
        {"H&M Maarif",          "5651"},  // Vêtements
        {"Sephora Casablanca",  "5912"},  // Pharmacie/Beauté
        {"Shell Station",       "5541"},  // Station Service
        {"Total Energies",      "5541"},  // Station Service
        {"McDonalds Rabat",     "5812"},  // Restaurant
        {"Pizza Hut Casa",      "5812"},  // Restaurant
        {"Pharmacie Centrale",  "5912"},  // Pharmacie
        {"Apple Store",         "5732"},  // Electronique
        {"Samsung Casa",        "5732"},  // Electronique
        {"Oncf Tickets",        "4111"},  // Transport
    };
    private static final String[] ECOM_MERCHANTS = {
        "JUMIA MAROC", "AMAZON.FR", "BOOKING.COM", "PAYPAL MAROC",
        "AIR ARABIA", "ALIEXPRESS", "FNAC.COM", "AVITO MAROC"
    };
    // Banques marocaines — codes alignes avec load_test_2500.sql et bank-project-store
    // AWBx3, BMCEx3, BPMx3, CIHx2, BOAx2, BCPx2, CAGMx1, CDMx1, SGMx1, BCMx1 => 19 entrees
    private static final String[] ACQUIRERS = {
        "AWB",  "AWB",  "AWB",
        "BMCE", "BMCE", "BMCE",
        "BPM",  "BPM",  "BPM",
        "CIH",  "CIH",
        "BOA",  "BOA",
        "BCP",  "BCP",
        "CAGM",
        "CDM",
        "SGM",
        "BCM"
    };

    // Network: [networkCode, networkId, productCode, panPrefix6]
    // Distribution: 50% Visa, 50% Mastercard
    private static final String[][] NETWORKS = {
        {"01", "VISA", "VIS", "455600"},  // Visa
        {"01", "VISA", "VIS", "462000"},  // Visa
        {"01", "VISA", "VIS", "476400"},  // Visa
        {"01", "VISA", "VIS", "400000"},  // Visa
        {"01", "VISA", "VIS", "411111"},  // Visa
        {"02", "MC  ", "MSC", "531000"},  // Mastercard
        {"02", "MC  ", "MSC", "535678"},  // Mastercard
        {"02", "MC  ", "MSC", "555555"},  // Mastercard
        {"02", "MC  ", "MSC", "559000"},  // Mastercard
        {"02", "MC  ", "MSC", "522000"},  // Mastercard
    };

    public IsoSimulatorTask(AutohoActivityAdmService autohoActivityAdmService) {
        this.autohoActivityAdmService = autohoActivityAdmService;
    }

    @Scheduled(fixedRate = 60_000)
    public void generateSimulatedTransaction() {
        if (generated.get() >= MAX_TOTAL) return;

        int toGenerate = Math.min(TXS_PER_MINUTE, MAX_TOTAL - generated.get());
        LocalDateTime batchTime = LocalDateTime.now();

        for (int i = 0; i < toGenerate; i++) {
            generateOneTx(batchTime);
            generated.incrementAndGet();
        }
    }

    private void generateOneTx(LocalDateTime batchTime) {
        CreateAuthoActivityAdmRequest request = new CreateAuthoActivityAdmRequest();

        // Exactly 12 chars — no prefix
        request.setReferenceNumber(String.format("%012d", (long) (random.nextDouble() * 999_999_999_999L)));
        request.setInternalStan(String.format("%06d", random.nextInt(999999)));
        request.setExternalStan(String.format("%06d", random.nextInt(999999)));
        request.setRoutingCode(String.format("%06d", random.nextInt(999999)));
        request.setCaptureCode(String.format("%06d", random.nextInt(999999)));

        String mti = MTIS[random.nextInt(MTIS.length)];
        request.setMessageType(mti);

        String countryCode = COUNTRIES[random.nextInt(COUNTRIES.length)];
        request.setAcquiringCountryCode(countryCode);

        String txCurrency = COUNTRY_CURRENCY.getOrDefault(countryCode, "MAD");
        request.setTransactionCurrency(txCurrency);

        double baseAmount = 10 + (1500 - 10) * random.nextDouble();
        request.setTransactionAmount(bd(baseAmount, 3));

        // Billing toujours en MAD
        double rateToMad = RATE_TO_MAD.getOrDefault(txCurrency, 1.0);
        double billingAmt = baseAmount * rateToMad;
        request.setBillingCurrency("MAD");
        request.setBillingAmount(bd(billingAmt, 3));
        request.setConversionRate(bd(rateToMad, 6));

        // Pick a random network and generate matching PAN BIN
        String[] net = NETWORKS[random.nextInt(NETWORKS.length)];
        request.setNetworkCode(net[0]);
        request.setNetworkId(net[1]);
        request.setProductCode(net[2]);

        StringBuilder pan = new StringBuilder(net[3]);
        for (int i = 0; i < 10; i++) pan.append(random.nextInt(10));
        request.setCardNumber(pan.toString());

        String actionCode = ACTION_CODES[random.nextInt(ACTION_CODES.length)];
        // Reversals are always approved at network level
        if ("1420".equals(mti)) actionCode = "000";
        request.setActionCode(actionCode);

        request.setTransactionLocalDate(batchTime.toLocalDate());
        request.setTransmissionDateAndTime(batchTime);
        request.setBusinessDate(batchTime.toLocalDate());

        String acquirer = ACQUIRERS[random.nextInt(ACQUIRERS.length)];
        request.setAcquirerBank(acquirer);

        // Émetteur : banque différente de l'acquéreur (simule transactions inter-bancaires)
        String issuer;
        do { issuer = ACQUIRERS[random.nextInt(ACQUIRERS.length)]; } while (issuer.equals(acquirer));
        request.setIssuingBank(issuer);

        // Canal : ATM 30% | ECOM 20% | POS 50%
        int channelRoll = random.nextInt(10);
        if (channelRoll < 3) {
            // ATM / GAB — saisie PIN clavier (mode d'entrée '05' EMV majoritaire)
            String atmId = "ATM" + acquirer + String.format("%03d", random.nextInt(999));
            request.setCardAcceptorId(atmId.length() > 15 ? atmId.substring(0, 15) : atmId);
            request.setCardAcceptorTermId(atmId.length() > 15 ? atmId.substring(0, 15) : atmId);
            request.setCardAccNameAddress("Retrait GAB " + acquirer);
            request.setCardAcceptorActivity("6011");
            request.setPosEntryMode("05");
        } else if (channelRoll < 5) {
            // ECOM — posConditionCode '59' = norme ISO 8583 E-commerce, saisie web '81'
            String ecomId = "ECOM" + String.format("%04d", random.nextInt(9999));
            request.setCardAcceptorId(ecomId);
            request.setCardAccNameAddress(ECOM_MERCHANTS[random.nextInt(ECOM_MERCHANTS.length)]);
            request.setPosConditionCode("59");
            request.setSecurityVerifLevel("3DS");
            request.setPosEntryMode("81");
        } else {
            // POS — avec MCC réel ; mix EMV(60%) / NFC(20%) / manuel(11%) / bande(9%)
            String[] merchant = POS_MERCHANTS[random.nextInt(POS_MERCHANTS.length)];
            String termId = "TRM" + String.format("%03d", random.nextInt(999));
            request.setCardAcceptorId(termId);
            request.setCardAcceptorTermId(termId);
            request.setCardAccNameAddress(merchant[0]);
            request.setCardAcceptorActivity(merchant[1]);

            int entryRoll = random.nextInt(100);
            if (entryRoll < 11)      request.setPosEntryMode("01"); // manuel
            else if (entryRoll < 20) request.setPosEntryMode("02"); // bande magnétique
            else if (entryRoll < 40) request.setPosEntryMode("07"); // NFC / sans contact
            else                     request.setPosEntryMode("05"); // EMV
        }

        // Simulate latency: mostly 30–150 ms, 4% chance of SLA breach (>5 s)
        long latencyMs = 30 + random.nextInt(120);
        if (random.nextInt(100) > 96) latencyMs += 2000 + random.nextInt(3000);
        request.setResponseDateAndTime(LocalDateTime.now().plusNanos(latencyMs * 1_000_000L));

        autohoActivityAdmService.createTransaction(request);
    }

    private static BigDecimal bd(double value, int scale) {
        return BigDecimal.valueOf(value).setScale(scale, RoundingMode.HALF_UP);
    }
}
