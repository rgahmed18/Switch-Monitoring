package com.hps.switchmonitoring.service.emv;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Parseur EMV pour le champ chip_tvr (Terminal Verification Results).
 *
 * Structure : 5 octets (10 caractères hex), chaque bit encode une vérification
 * effectuée par le terminal pendant la transaction chip.
 * Référence : EMV Book 3, Annex C1 - Terminal Verification Results.
 */
public final class TvrParser {

    // ─── Byte 1 : Offline Data Authentication ────────────────────────────────
    private static final int B1_OFFLINE_AUTH_NOT_PERFORMED = 0x80;
    private static final int B1_SDA_FAILED                 = 0x40;
    private static final int B1_ICC_DATA_MISSING           = 0x20;
    private static final int B1_CARD_ON_EXCEPTION_FILE     = 0x10;
    private static final int B1_DDA_FAILED                 = 0x08;
    private static final int B1_CDA_FAILED                 = 0x04;

    // ─── Byte 2 : Application / Expiry ───────────────────────────────────────
    private static final int B2_VERSION_MISMATCH           = 0x80;
    private static final int B2_EXPIRED_APP               = 0x40;
    private static final int B2_APP_NOT_YET_EFFECTIVE      = 0x20;
    private static final int B2_SERVICE_NOT_ALLOWED        = 0x10;
    private static final int B2_NEW_CARD                   = 0x08;

    // ─── Byte 3 : Cardholder Verification ────────────────────────────────────
    private static final int B3_CVM_NOT_SUCCESSFUL         = 0x80;
    private static final int B3_UNRECOGNISED_CVM           = 0x40;
    private static final int B3_PIN_TRY_LIMIT_EXCEEDED     = 0x20;
    private static final int B3_PIN_PAD_NOT_PRESENT        = 0x10;
    private static final int B3_PIN_REQUIRED_NOT_AVAILABLE = 0x08;
    private static final int B3_ONLINE_PIN_ENTERED         = 0x04;

    // ─── Byte 4 : Terminal Risk Management ───────────────────────────────────
    private static final int B4_EXCEEDS_FLOOR_LIMIT        = 0x80;
    private static final int B4_LOWER_CONSEC_OFFLINE       = 0x40;
    private static final int B4_UPPER_CONSEC_OFFLINE       = 0x20;
    private static final int B4_RANDOM_SELECTED_ONLINE     = 0x10;
    private static final int B4_MERCHANT_FORCED_ONLINE     = 0x08;

    // ─── Byte 5 : Issuer Authentication ──────────────────────────────────────
    private static final int B5_DEFAULT_TDOL               = 0x80;
    private static final int B5_ISSUER_AUTH_FAILED         = 0x40;
    private static final int B5_SCRIPT_FAILED_BEFORE_AC    = 0x20;
    private static final int B5_SCRIPT_FAILED_AFTER_AC     = 0x10;

    /**
     * Score de risque par flag (0–100).
     * Calibré selon la gravité réelle en environnement de production.
     */
    private static final Map<String, Integer> RISK_WEIGHTS = Map.ofEntries(
        Map.entry("CARD_ON_EXCEPTION_FILE",      100),
        Map.entry("SDA_FAILED",                   80),
        Map.entry("DDA_FAILED",                   80),
        Map.entry("CDA_FAILED",                   80),
        Map.entry("PIN_TRY_LIMIT_EXCEEDED",       75),
        Map.entry("ISSUER_AUTH_FAILED",           70),
        Map.entry("SCRIPT_FAILED_BEFORE_AC",      65),
        Map.entry("ICC_DATA_MISSING",             60),
        Map.entry("CVM_NOT_SUCCESSFUL",           55),
        Map.entry("SCRIPT_FAILED_AFTER_AC",       50),
        Map.entry("EXPIRED_APP",                  45),
        Map.entry("OFFLINE_AUTH_NOT_PERFORMED",   35),
        Map.entry("EXCEEDS_FLOOR_LIMIT",          30),
        Map.entry("MERCHANT_FORCED_ONLINE",       30),
        Map.entry("PIN_PAD_NOT_PRESENT",          25),
        Map.entry("UPPER_CONSEC_OFFLINE",         20),
        Map.entry("LOWER_CONSEC_OFFLINE",         15),
        Map.entry("VERSION_MISMATCH",             15),
        Map.entry("SERVICE_NOT_ALLOWED",          15),
        Map.entry("PIN_REQUIRED_NOT_AVAILABLE",   10),
        Map.entry("RANDOM_SELECTED_ONLINE",        5),
        Map.entry("APP_NOT_YET_EFFECTIVE",        10),
        Map.entry("NEW_CARD",                      5),
        Map.entry("ONLINE_PIN_ENTERED",            0)
    );

    private static final Map<String, String> FLAG_LABELS_FR = Map.ofEntries(
        Map.entry("CARD_ON_EXCEPTION_FILE",      "Carte présente dans la liste d'exception"),
        Map.entry("SDA_FAILED",                  "Authentification SDA échouée"),
        Map.entry("DDA_FAILED",                  "Authentification DDA échouée"),
        Map.entry("CDA_FAILED",                  "Authentification CDA échouée"),
        Map.entry("PIN_TRY_LIMIT_EXCEEDED",      "Nombre de tentatives PIN dépassé"),
        Map.entry("ISSUER_AUTH_FAILED",          "Authentification émetteur échouée"),
        Map.entry("SCRIPT_FAILED_BEFORE_AC",     "Script émetteur échoué (avant GENERATE AC)"),
        Map.entry("ICC_DATA_MISSING",            "Données ICC absentes"),
        Map.entry("CVM_NOT_SUCCESSFUL",          "Vérification porteur non réussie"),
        Map.entry("SCRIPT_FAILED_AFTER_AC",      "Script émetteur échoué (après GENERATE AC)"),
        Map.entry("EXPIRED_APP",                 "Application carte expirée"),
        Map.entry("OFFLINE_AUTH_NOT_PERFORMED",  "Authentification offline non effectuée"),
        Map.entry("EXCEEDS_FLOOR_LIMIT",         "Montant dépasse le floor limit"),
        Map.entry("MERCHANT_FORCED_ONLINE",      "Commerçant forcé en ligne"),
        Map.entry("PIN_PAD_NOT_PRESENT",         "Lecteur PIN absent ou défectueux"),
        Map.entry("UPPER_CONSEC_OFFLINE",        "Limite haute offline consécutive dépassée"),
        Map.entry("LOWER_CONSEC_OFFLINE",        "Limite basse offline consécutive dépassée"),
        Map.entry("VERSION_MISMATCH",            "Version d'application différente"),
        Map.entry("SERVICE_NOT_ALLOWED",         "Service non autorisé pour ce produit"),
        Map.entry("PIN_REQUIRED_NOT_AVAILABLE",  "PIN requis mais non disponible"),
        Map.entry("RANDOM_SELECTED_ONLINE",      "Transaction sélectionnée aléatoirement online"),
        Map.entry("APP_NOT_YET_EFFECTIVE",       "Application pas encore effective"),
        Map.entry("NEW_CARD",                    "Nouvelle carte détectée"),
        Map.entry("ONLINE_PIN_ENTERED",          "PIN online saisi")
    );

    // ─── Public record résultat ───────────────────────────────────────────────

    public record TvrAnalysis(
        List<String>         activeFlags,
        List<String>         activeFlagsLabels,
        int                  riskScore,
        String               riskLevel,
        Map<String, Boolean> byteDetail,
        String               rawHex,
        boolean              isFraudSuspect,
        List<String>         criticalFlags
    ) {}

    private TvrParser() {}

    // ─── Point d'entrée principal ─────────────────────────────────────────────

    public static TvrAnalysis parse(String tvrHex) {
        if (tvrHex == null || tvrHex.isBlank()) {
            return emptyAnalysis(tvrHex);
        }

        String clean = tvrHex.trim().toUpperCase().replaceAll("[^0-9A-F]", "");
        if (clean.length() < 10) {
            return emptyAnalysis(tvrHex);
        }

        int[] bytes = extractBytes(clean);
        Map<String, Boolean> detail = buildDetailMap(bytes);

        List<String> active = new ArrayList<>();
        List<String> labels = new ArrayList<>();
        List<String> critical = new ArrayList<>();

        detail.forEach((flag, set) -> {
            if (set) {
                active.add(flag);
                labels.add(FLAG_LABELS_FR.getOrDefault(flag, flag));
                if (isCriticalFlag(flag)) critical.add(flag);
            }
        });

        int score = computeScore(active);
        String level = scoreToLevel(score);
        boolean fraud = !critical.isEmpty() || score >= 70;

        return new TvrAnalysis(
            Collections.unmodifiableList(active),
            Collections.unmodifiableList(labels),
            score,
            level,
            Collections.unmodifiableMap(detail),
            clean,
            fraud,
            Collections.unmodifiableList(critical)
        );
    }

    // ─── Helpers privés ──────────────────────────────────────────────────────

    private static int[] extractBytes(String hex) {
        int[] b = new int[5];
        for (int i = 0; i < 5; i++) {
            b[i] = Integer.parseInt(hex.substring(i * 2, i * 2 + 2), 16);
        }
        return b;
    }

    private static Map<String, Boolean> buildDetailMap(int[] b) {
        Map<String, Boolean> m = new LinkedHashMap<>();
        // Byte 1
        m.put("CARD_ON_EXCEPTION_FILE",      (b[0] & B1_CARD_ON_EXCEPTION_FILE)     != 0);
        m.put("SDA_FAILED",                  (b[0] & B1_SDA_FAILED)                 != 0);
        m.put("DDA_FAILED",                  (b[0] & B1_DDA_FAILED)                 != 0);
        m.put("CDA_FAILED",                  (b[0] & B1_CDA_FAILED)                 != 0);
        m.put("ICC_DATA_MISSING",            (b[0] & B1_ICC_DATA_MISSING)           != 0);
        m.put("OFFLINE_AUTH_NOT_PERFORMED",  (b[0] & B1_OFFLINE_AUTH_NOT_PERFORMED) != 0);
        // Byte 2
        m.put("EXPIRED_APP",                 (b[1] & B2_EXPIRED_APP)                != 0);
        m.put("VERSION_MISMATCH",            (b[1] & B2_VERSION_MISMATCH)           != 0);
        m.put("SERVICE_NOT_ALLOWED",         (b[1] & B2_SERVICE_NOT_ALLOWED)        != 0);
        m.put("APP_NOT_YET_EFFECTIVE",       (b[1] & B2_APP_NOT_YET_EFFECTIVE)      != 0);
        m.put("NEW_CARD",                    (b[1] & B2_NEW_CARD)                   != 0);
        // Byte 3
        m.put("PIN_TRY_LIMIT_EXCEEDED",      (b[2] & B3_PIN_TRY_LIMIT_EXCEEDED)     != 0);
        m.put("CVM_NOT_SUCCESSFUL",          (b[2] & B3_CVM_NOT_SUCCESSFUL)         != 0);
        m.put("UNRECOGNISED_CVM",            (b[2] & B3_UNRECOGNISED_CVM)           != 0);
        m.put("PIN_PAD_NOT_PRESENT",         (b[2] & B3_PIN_PAD_NOT_PRESENT)        != 0);
        m.put("PIN_REQUIRED_NOT_AVAILABLE",  (b[2] & B3_PIN_REQUIRED_NOT_AVAILABLE) != 0);
        m.put("ONLINE_PIN_ENTERED",          (b[2] & B3_ONLINE_PIN_ENTERED)         != 0);
        // Byte 4
        m.put("EXCEEDS_FLOOR_LIMIT",         (b[3] & B4_EXCEEDS_FLOOR_LIMIT)        != 0);
        m.put("MERCHANT_FORCED_ONLINE",      (b[3] & B4_MERCHANT_FORCED_ONLINE)     != 0);
        m.put("RANDOM_SELECTED_ONLINE",      (b[3] & B4_RANDOM_SELECTED_ONLINE)     != 0);
        m.put("UPPER_CONSEC_OFFLINE",        (b[3] & B4_UPPER_CONSEC_OFFLINE)       != 0);
        m.put("LOWER_CONSEC_OFFLINE",        (b[3] & B4_LOWER_CONSEC_OFFLINE)       != 0);
        // Byte 5
        m.put("ISSUER_AUTH_FAILED",          (b[4] & B5_ISSUER_AUTH_FAILED)         != 0);
        m.put("SCRIPT_FAILED_BEFORE_AC",     (b[4] & B5_SCRIPT_FAILED_BEFORE_AC)    != 0);
        m.put("SCRIPT_FAILED_AFTER_AC",      (b[4] & B5_SCRIPT_FAILED_AFTER_AC)     != 0);
        m.put("DEFAULT_TDOL",                (b[4] & B5_DEFAULT_TDOL)               != 0);
        return m;
    }

    private static int computeScore(List<String> flags) {
        int raw = flags.stream()
            .mapToInt(f -> RISK_WEIGHTS.getOrDefault(f, 5))
            .sum();
        return Math.min(raw, 100);
    }

    private static String scoreToLevel(int score) {
        if (score >= 70) return "HIGH";
        if (score >= 40) return "MEDIUM";
        if (score >  0)  return "LOW";
        return "CLEAN";
    }

    private static boolean isCriticalFlag(String flag) {
        return switch (flag) {
            case "CARD_ON_EXCEPTION_FILE",
                 "SDA_FAILED", "DDA_FAILED", "CDA_FAILED",
                 "PIN_TRY_LIMIT_EXCEEDED",
                 "ISSUER_AUTH_FAILED" -> true;
            default -> false;
        };
    }

    private static TvrAnalysis emptyAnalysis(String raw) {
        return new TvrAnalysis(
            List.of(), List.of(), 0, "UNKNOWN",
            Map.of(), raw != null ? raw : "",
            false, List.of()
        );
    }
}
