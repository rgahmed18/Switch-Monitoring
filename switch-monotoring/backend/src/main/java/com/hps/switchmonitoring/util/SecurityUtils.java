package com.hps.switchmonitoring.util;

/**
 * Utilitaire de sécurité PCI-DSS pour le masquage des données sensibles.
 *
 * Règle PCI-DSS v4.0 §3.3.1 :
 *   Le PAN ne doit jamais apparaître en clair dans les journaux, les interfaces
 *   ou les réponses API. Seuls le BIN (6 premiers chiffres) et les 4 derniers
 *   chiffres peuvent être affichés.
 *
 * Exemple : 4000005327187750  →  400000XXXXXX7750
 */
public final class SecurityUtils {

    /** Nombre de chiffres BIN/IIN conservés (standard internationale : 6). */
    public static final int BIN_LENGTH    = 6;

    /** Nombre de chiffres de fin conservés (maximum autorisé par PCI-DSS : 4). */
    public static final int SUFFIX_LENGTH = 4;

    private SecurityUtils() {}

    // -------------------------------------------------------------------------
    // Masquage PAN
    // -------------------------------------------------------------------------

    /**
     * Masque un PAN selon PCI-DSS §3.3.1 : BIN (6) + 'X' répété + 4 derniers.
     *
     * <pre>
     *   maskCardNumber("4000005327187750")  →  "400000XXXXXX7750"
     *   maskCardNumber("4111 1111 1111 1111") →  "411111XXXXXX1111"
     * </pre>
     *
     * @param pan numéro de carte brut (espaces et tirets acceptés, ignorés)
     * @return PAN masqué
     * @throws IllegalArgumentException si le PAN est null ou trop court
     *         (minimum BIN_LENGTH + SUFFIX_LENGTH + 1 chiffres significatifs)
     */
    public static String maskCardNumber(String pan) {
        if (pan == null) {
            throw new IllegalArgumentException("PAN ne peut pas être null");
        }

        String digits = stripSeparators(pan);
        int minLength = BIN_LENGTH + SUFFIX_LENGTH + 1;

        if (digits.length() < minLength) {
            throw new IllegalArgumentException(
                "PAN trop court pour être masqué selon PCI-DSS " +
                "(reçu " + digits.length() + " chiffres, minimum " + minLength + ")");
        }

        String bin    = digits.substring(0, BIN_LENGTH);
        String suffix = digits.substring(digits.length() - SUFFIX_LENGTH);
        String mask   = "X".repeat(digits.length() - BIN_LENGTH - SUFFIX_LENGTH);

        return bin + mask + suffix;
    }

    /**
     * Version permissive : ne lève pas d'exception.
     *
     * Retourne {@code "****"} si l'entrée est null ou trop courte — utile
     * dans les logs où on ne veut jamais faire planter l'application.
     *
     * @param pan numéro de carte (peut être null)
     * @return PAN masqué ou {@code "****"} si le masquage est impossible
     */
    public static String maskCardNumberSafe(String pan) {
        if (pan == null) {
            return null;
        }
        String digits = stripSeparators(pan);
        if (digits.length() < BIN_LENGTH + SUFFIX_LENGTH + 1) {
            return "****";
        }
        return maskCardNumber(pan);
    }

    /**
     * Indique si une chaîne ressemble à un PAN complet (non masqué).
     *
     * Utilisé pour détecter les fuites accidentelles dans les logs.
     *
     * @param value valeur à inspecter
     * @return {@code true} si la valeur contient 13 à 19 chiffres consécutifs
     */
    public static boolean looksLikeRawPan(String value) {
        if (value == null) return false;
        return value.matches(".*\\d{13,19}.*");
    }

    // -------------------------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------------------------

    private static String stripSeparators(String s) {
        return s.replaceAll("[\\s\\-]", "");
    }
}
