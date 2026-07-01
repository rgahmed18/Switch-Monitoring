package com.hps.switchmonitoring.service.iso;

/**
 * Décodeur ISO 8583 pour les champs message_type et processing_code
 * de la table AUTHO_ACTIVITY_ADM.
 *
 * Référence : ISO 8583-1:2003 et spécifications HPS PowerCARD.
 */
public final class Iso8583Decoder {

    public record MtiDecoded(
        String code,
        String version,
        String messageClass,
        String messageFunction,
        String messageOrigin,
        String fullDescription,
        boolean isRequest,
        boolean isResponse,
        boolean isReversal,
        boolean isFinancial
    ) {}

    public record ProcessingCodeDecoded(
        String code,
        String transactionType,
        String sourceAccountType,
        String destinationAccountType,
        String fullDescription
    ) {}

    public record FunctionCodeDecoded(
        String code,
        String description
    ) {}

    private Iso8583Decoder() {}

    // ─── MTI Decoder ─────────────────────────────────────────────────────────

    public static MtiDecoded decodeMti(String mti) {
        if (mti == null || mti.isBlank()) {
            return new MtiDecoded("", "Inconnu", "Inconnu", "Inconnu", "Inconnu",
                "MTI absent", false, false, false, false);
        }
        String m = mti.trim();
        if (m.length() < 4) {
            return new MtiDecoded(m, "Inconnu", "Inconnu", "Inconnu", "Inconnu",
                "MTI incomplet", false, false, false, false);
        }

        String version  = decodeVersion(m.charAt(0));
        String msgClass = decodeClass(m.charAt(1));
        String msgFunc  = decodeFunction(m.charAt(2));
        String msgOrig  = decodeOrigin(m.charAt(3));

        boolean isRequest  = m.charAt(2) == '0' || m.charAt(2) == '2';
        boolean isResponse = m.charAt(2) == '1' || m.charAt(2) == '3';
        boolean isReversal = m.charAt(1) == '4' || m.charAt(1) == '4';
        boolean isFinancial = m.charAt(1) == '2';

        String full = buildMtiDescription(m);
        return new MtiDecoded(m, version, msgClass, msgFunc, msgOrig,
            full, isRequest, isResponse, isReversal, isFinancial);
    }

    private static String decodeVersion(char c) {
        return switch (c) {
            case '0' -> "ISO 8583-1:1987";
            case '1' -> "ISO 8583-2:1993";
            case '2' -> "ISO 8583-3:2003";
            case '9' -> "Privé (HPS PowerCARD)";
            default  -> "Inconnu";
        };
    }

    private static String decodeClass(char c) {
        return switch (c) {
            case '1' -> "Autorisation";
            case '2' -> "Financière";
            case '3' -> "Gestion de fichiers";
            case '4' -> "Reversal / Chargeback";
            case '5' -> "Réconciliation";
            case '6' -> "Administrative";
            case '7' -> "Gestion des frais";
            case '8' -> "Gestion réseau";
            default  -> "Inconnu";
        };
    }

    private static String decodeFunction(char c) {
        return switch (c) {
            case '0' -> "Demande (Request)";
            case '1' -> "Réponse (Response)";
            case '2' -> "Conseil (Advice) - Request";
            case '3' -> "Conseil (Advice) - Response";
            case '4' -> "Notification - Request";
            case '5' -> "Notification - Response";
            case '8' -> "Déploiement positif - Request";
            case '9' -> "Déploiement positif - Response";
            default  -> "Inconnu";
        };
    }

    private static String decodeOrigin(char c) {
        return switch (c) {
            case '0' -> "Acquéreur";
            case '1' -> "Acquéreur - Répétition";
            case '2' -> "Émetteur";
            case '3' -> "Émetteur - Répétition";
            case '4' -> "Autre";
            case '5' -> "Autre - Répétition";
            default  -> "Inconnu";
        };
    }

    private static String buildMtiDescription(String m) {
        return switch (m) {
            // Autorisations
            case "1100" -> "Demande d'autorisation (Auth Request)";
            case "1110" -> "Réponse d'autorisation (Auth Response)";
            case "1120" -> "Conseil d'autorisation (Auth Advice)";
            case "1121" -> "Répétition conseil d'autorisation";
            case "1130" -> "Confirmation réponse d'autorisation";
            case "1140" -> "Notification d'autorisation";
            // Financiers
            case "1200" -> "Demande financière (Financial Request)";
            case "1210" -> "Réponse financière (Financial Response)";
            case "1220" -> "Conseil financier (Financial Advice)";
            case "1230" -> "Confirmation réponse financière";
            // Reversals / Annulations
            case "1400" -> "Demande de reversal (Reversal Request)";
            case "1410" -> "Réponse de reversal (Reversal Response)";
            case "1420" -> "Conseil de reversal (Reversal Advice)";
            case "1421" -> "Répétition conseil de reversal";
            case "1430" -> "Confirmation réponse reversal";
            // Réconciliation
            case "1500" -> "Demande de réconciliation";
            case "1510" -> "Réponse de réconciliation";
            case "1520" -> "Conseil de réconciliation";
            // Réseau
            case "1804" -> "Demande écho réseau (Network Echo)";
            case "1814" -> "Réponse écho réseau";
            // Cas HPS spécifiques
            case "0100" -> "Demande d'autorisation ISO 8583-1:1987";
            case "0110" -> "Réponse d'autorisation ISO 8583-1:1987";
            case "0200" -> "Demande financière ISO 8583-1:1987";
            case "0210" -> "Réponse financière ISO 8583-1:1987";
            case "0400" -> "Reversal ISO 8583-1:1987";
            case "0410" -> "Réponse reversal ISO 8583-1:1987";
            case "0420" -> "Conseil reversal ISO 8583-1:1987";
            default     -> "Message type " + m + " (non catalogué)";
        };
    }

    // ─── Processing Code Decoder ──────────────────────────────────────────────

    public static ProcessingCodeDecoded decodeProcessingCode(
            String procCode, String srcAccountCode, String dstAccountCode) {

        if (procCode == null || procCode.isBlank()) {
            return new ProcessingCodeDecoded("", "Inconnu", "N/A", "N/A", "Code absent");
        }

        String tx  = decodeTxType(procCode.trim());
        String src = decodeAccountType(srcAccountCode);
        String dst = decodeAccountType(dstAccountCode);
        String full = tx + " [" + src + " → " + dst + "]";

        return new ProcessingCodeDecoded(procCode.trim(), tx, src, dst, full);
    }

    private static String decodeTxType(String code) {
        return switch (code) {
            case "00" -> "Achat (Purchase)";
            case "01" -> "Retrait espèces (Cash Withdrawal)";
            case "02" -> "Ajustement débit";
            case "09" -> "Achat avec cashback";
            case "10" -> "Crédit de compte";
            case "11" -> "Paiement";
            case "17" -> "Dépôt espèces";
            case "19" -> "Consultation de solde";
            case "20" -> "Retrait (Credit - annulation)";
            case "21" -> "Retrait espèces en cours de voyage";
            case "22" -> "Paiement chèque";
            case "28" -> "Transfert de fonds";
            case "30" -> "Consultation solde (Balance Inquiry)";
            case "31" -> "Consultation mini-relevé";
            case "40" -> "Virement de compte à compte";
            case "50" -> "Paiement (Payment)";
            case "51" -> "Paiement récurrent";
            case "90" -> "Transaction mini-état de compte";
            case "91" -> "Transaction d'initialisation de PIN";
            case "92" -> "Transaction de changement de PIN";
            case "96" -> "Chargement prépayé";
            default   -> "Type inconnu (" + code + ")";
        };
    }

    private static String decodeAccountType(String code) {
        if (code == null || code.isBlank()) return "Par défaut";
        return switch (code.trim()) {
            case "00" -> "Par défaut (Default)";
            case "10" -> "Savings";
            case "20" -> "Courant (Checking)";
            case "30" -> "Crédit";
            case "40" -> "Universal";
            case "60" -> "Investissement";
            case "90" -> "Prépayé";
            default   -> "Type " + code.trim();
        };
    }

    // ─── Function Code Decoder ────────────────────────────────────────────────

    public static FunctionCodeDecoded decodeFunctionCode(String code) {
        if (code == null || code.isBlank()) {
            return new FunctionCodeDecoded("", "Code fonction absent");
        }
        String desc = switch (code.trim()) {
            case "100" -> "Autorisation";
            case "101" -> "Pre-Autorisation";
            case "102" -> "Completion pré-autorisation";
            case "180" -> "Reversal d'autorisation";
            case "181" -> "Reversal de pré-autorisation";
            case "182" -> "Reversal completion";
            case "200" -> "Transaction financière";
            case "201" -> "Transaction financière - Correction";
            case "380" -> "Reversal financier";
            case "400" -> "Réconciliation";
            case "500" -> "Administrative";
            case "821" -> "Mise à jour données carte";
            case "900" -> "Message de gestion réseau";
            default    -> "Code fonction " + code.trim();
        };
        return new FunctionCodeDecoded(code.trim(), desc);
    }
}
