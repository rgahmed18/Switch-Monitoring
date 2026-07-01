package com.hps.switchmonitoring.service.iso;

import java.util.Map;
import java.util.Set;

/**
 * Décodeur de la matrice action_code / issuer_action_code.
 *
 * Les codes action dans AUTHO_ACTIVITY_ADM correspondent aux Response Codes
 * ISO 8583 / HPS PowerCARD. Ce décodeur fournit :
 *   - La description métier du code
 *   - La catégorie de refus (pour les tableaux de bord)
 *   - Le niveau de risque associé
 *   - Si une intervention manuelle est requise
 */
public final class ActionCodeDecoder {

    public enum ActionCategory {
        APPROVED,
        PARTIAL_APPROVAL,
        DO_NOT_HONOR,
        FRAUD_SUSPECTED,
        CARD_PROBLEM,
        LIMIT_EXCEEDED,
        SYSTEM_ERROR,
        ISSUER_UNAVAILABLE,
        FORMAT_ERROR,
        RECONCILIATION,
        SECURITY,
        UNKNOWN
    }

    public record ActionDecoded(
        String         code,
        String         descriptionFr,
        ActionCategory category,
        boolean        isApproved,
        boolean        requiresInvestigation,
        boolean        isFraudRelated,
        String         suggestedAction
    ) {}

    // Codes qui nécessitent une investigation immédiate
    private static final Set<String> FRAUD_CODES = Set.of(
        "102", "105", "129", "181", "182", "183", "188"
    );

    private static final Map<String, ActionDecoded> MATRIX = buildMatrix();

    private ActionCodeDecoder() {}

    public static ActionDecoded decode(String code) {
        if (code == null || code.isBlank()) {
            return new ActionDecoded("", "Code action absent", ActionCategory.UNKNOWN,
                false, false, false, "Vérifier le flux de la transaction");
        }
        String trimmed = code.trim();
        return MATRIX.getOrDefault(trimmed,
            new ActionDecoded(trimmed, "Code non référencé : " + trimmed,
                ActionCategory.UNKNOWN, false, true, false,
                "Analyser le flux ISO 8583 manuellement"));
    }

    public static boolean isFraudSuspect(String code) {
        return code != null && FRAUD_CODES.contains(code.trim());
    }

    public static boolean isApproved(String code) {
        if (code == null) return false;
        ActionDecoded d = MATRIX.get(code.trim());
        return d != null && d.isApproved();
    }

    public static boolean isSystemError(String code) {
        if (code == null) return false;
        ActionDecoded d = MATRIX.get(code.trim());
        return d != null && d.category() == ActionCategory.SYSTEM_ERROR;
    }

    public static boolean isIssuerUnavailable(String code) {
        if (code == null) return false;
        ActionDecoded d = MATRIX.get(code.trim());
        return d != null && d.category() == ActionCategory.ISSUER_UNAVAILABLE;
    }

    // ─── Construction de la matrice ───────────────────────────────────────────

    private static Map<String, ActionDecoded> buildMatrix() {
        return Map.ofEntries(
            // ── APPROUVÉS ─────────────────────────────────────────────────────
            entry("000", "Approuvé",
                ActionCategory.APPROVED, true, false, false,
                "Aucune action requise"),
            entry("001", "Approuvé avec identification",
                ActionCategory.APPROVED, true, false, false,
                "Demander une pièce d'identité au porteur"),
            entry("002", "Approuvé pour montant partiel",
                ActionCategory.PARTIAL_APPROVAL, true, false, false,
                "Informer le porteur du montant approuvé"),
            entry("003", "Approuvé (VIP)",
                ActionCategory.APPROVED, true, false, false,
                "Aucune action requise"),
            entry("008", "Approuvé avec limites",
                ActionCategory.APPROVED, true, false, false,
                "Vérifier les limites appliquées"),
            entry("400", "Accepté (reversal/annulation)",
                ActionCategory.APPROVED, true, false, false,
                "Annulation confirmée"),

            // ── REFUS ÉMETTEUR ────────────────────────────────────────────────
            entry("100", "Ne pas honorer (Do Not Honor)",
                ActionCategory.DO_NOT_HONOR, false, false, false,
                "Contacter l'émetteur de la carte"),
            entry("101", "Carte expirée",
                ActionCategory.CARD_PROBLEM, false, false, false,
                "Proposer un renouvellement de carte"),
            entry("102", "Suspicion de fraude",
                ActionCategory.FRAUD_SUSPECTED, false, true, true,
                "Alerter le département fraude immédiatement"),
            entry("104", "Carte avec restrictions",
                ActionCategory.CARD_PROBLEM, false, false, false,
                "Vérifier les restrictions produit"),
            entry("105", "Appeler le département sécurité",
                ActionCategory.FRAUD_SUSPECTED, false, true, true,
                "Appeler le numéro sécurité de l'émetteur"),
            entry("106", "Nombre de tentatives PIN dépassé",
                ActionCategory.SECURITY, false, true, true,
                "Carte potentiellement bloquée - contacter l'émetteur"),
            entry("107", "Référer à l'émetteur",
                ActionCategory.DO_NOT_HONOR, false, false, false,
                "Contacter l'émetteur"),
            entry("110", "Montant invalide",
                ActionCategory.FORMAT_ERROR, false, false, false,
                "Vérifier le montant de la transaction"),
            entry("111", "Numéro de carte invalide (PAN)",
                ActionCategory.CARD_PROBLEM, false, false, false,
                "Vérifier le PAN de la carte"),
            entry("115", "Fonction non supportée",
                ActionCategory.DO_NOT_HONOR, false, false, false,
                "Vérifier le type de transaction vs. capacité de la carte"),
            entry("116", "Provision insuffisante",
                ActionCategory.DO_NOT_HONOR, false, false, false,
                "Informer le porteur"),
            entry("117", "PIN incorrect",
                ActionCategory.SECURITY, false, true, false,
                "Vérifier les tentatives PIN restantes"),
            entry("118", "Aucun enregistrement carte",
                ActionCategory.CARD_PROBLEM, false, false, false,
                "Vérifier le numéro de carte"),
            entry("119", "Transaction non autorisée pour ce porteur",
                ActionCategory.DO_NOT_HONOR, false, false, false,
                "Vérifier les paramètres produit"),
            entry("120", "Transaction non autorisée au terminal",
                ActionCategory.DO_NOT_HONOR, false, false, false,
                "Vérifier la configuration du terminal"),
            entry("121", "Plafond de retrait dépassé",
                ActionCategory.LIMIT_EXCEEDED, false, false, false,
                "Informer le porteur de ses limites"),
            entry("122", "Violation de sécurité",
                ActionCategory.SECURITY, false, true, true,
                "Analyser le contexte sécurité de la transaction"),
            entry("123", "Fréquence de retrait dépassée",
                ActionCategory.LIMIT_EXCEEDED, false, true, false,
                "Vérifier le pattern de transactions"),
            entry("125", "Carte inactive",
                ActionCategory.CARD_PROBLEM, false, false, false,
                "Contacter l'émetteur pour activation"),
            entry("126", "Bloc PIN invalide",
                ActionCategory.SECURITY, false, true, true,
                "Vérifier l'intégrité du PIN block HSM"),
            entry("129", "Suspicion de carte contrefaite",
                ActionCategory.FRAUD_SUSPECTED, false, true, true,
                "Saisir la carte et alerter le département fraude"),
            entry("181", "Carte déclarée perdue",
                ActionCategory.FRAUD_SUSPECTED, false, true, true,
                "Retenir la carte, alerter le porteur et l'émetteur"),
            entry("182", "Carte déclarée volée",
                ActionCategory.FRAUD_SUSPECTED, false, true, true,
                "Retenir la carte, contacter les autorités"),
            entry("183", "Carte frauduleuse (blacklist)",
                ActionCategory.FRAUD_SUSPECTED, false, true, true,
                "Retenir la carte, alerte sécurité immédiate"),
            entry("188", "Échec vérification CVV",
                ActionCategory.SECURITY, false, true, true,
                "Transaction CNP suspecte - Vérifier avec l'émetteur"),
            entry("189", "Erreur système émetteur",
                ActionCategory.SYSTEM_ERROR, false, true, false,
                "Réessayer ou basculer vers autre émetteur"),

            // ── ERREURS SYSTÈME ───────────────────────────────────────────────
            entry("902", "Transaction invalide",
                ActionCategory.FORMAT_ERROR, false, false, false,
                "Vérifier le format de la transaction ISO 8583"),
            entry("904", "Erreur de format",
                ActionCategory.FORMAT_ERROR, false, false, false,
                "Analyser le bitmap et les champs ISO 8583"),
            entry("905", "Acquéreur non supporté par le switch",
                ActionCategory.SYSTEM_ERROR, false, true, false,
                "Vérifier la configuration de routage"),
            entry("906", "Coupure en cours (Cutover)",
                ActionCategory.SYSTEM_ERROR, false, false, false,
                "Attendre la fin de la coupure comptable"),
            entry("907", "Émetteur ou switch hors service",
                ActionCategory.ISSUER_UNAVAILABLE, false, true, false,
                "Vérifier la connectivité réseau et l'état du switch"),
            entry("909", "Dysfonctionnement système (System Malfunction)",
                ActionCategory.SYSTEM_ERROR, false, true, false,
                "Vérifier les logs système et redémarrer si nécessaire"),
            entry("910", "Émetteur déconnecté",
                ActionCategory.ISSUER_UNAVAILABLE, false, true, false,
                "Alerter l'équipe ops - connexion émetteur perdue"),
            entry("911", "Timeout émetteur",
                ActionCategory.ISSUER_UNAVAILABLE, false, true, false,
                "Vérifier la latence réseau vers l'émetteur"),
            entry("912", "Émetteur non disponible",
                ActionCategory.ISSUER_UNAVAILABLE, false, true, false,
                "Basculer sur mode stand-in si disponible"),
            entry("913", "Transmission en doublon (Duplicate)",
                ActionCategory.RECONCILIATION, false, true, false,
                "Vérifier l'STAN et éviter la double imputation"),
            entry("914", "Transaction originale introuvable",
                ActionCategory.RECONCILIATION, false, true, false,
                "Rechercher par référence et STAN"),
            entry("915", "Erreur de réconciliation (Checkpoint)",
                ActionCategory.RECONCILIATION, false, true, false,
                "Lancer une réconciliation manuelle"),
            entry("950", "Violation d'arrangement commercial",
                ActionCategory.DO_NOT_HONOR, false, true, false,
                "Vérifier les contrats inter-banques")
        );
    }

    private static Map.Entry<String, ActionDecoded> entry(String code, String desc,
            ActionCategory cat, boolean approved, boolean investigate,
            boolean fraud, String action) {
        return Map.entry(code, new ActionDecoded(code, desc, cat, approved,
            investigate, fraud, action));
    }
}
