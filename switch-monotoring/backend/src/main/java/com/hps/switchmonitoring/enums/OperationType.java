package com.hps.switchmonitoring.enums;

/**
 * Types d'opérations par canal
 */
public enum OperationType {
    // ATM Operations
    ATM_WITHDRAWAL("01", "Retrait", ChannelType.ATM),
    ATM_BALANCE_INQUIRY("02", "Consultation Solde", ChannelType.ATM),
    ATM_PIN_CHANGE("03", "Changement PIN", ChannelType.ATM),
    ATM_DEPOSIT("04", "Dépôt", ChannelType.ATM),
    ATM_TRANSFER("05", "Virement", ChannelType.ATM),

    // POS Operations
    POS_SALE("11", "Vente", ChannelType.POS),
    POS_VOID("12", "Annulation", ChannelType.POS),
    POS_REFUND("13", "Remboursement", ChannelType.POS),
    POS_PRE_AUTH("14", "Pré-autorisation", ChannelType.POS),
    POS_COMPLETION("15", "Finalisation", ChannelType.POS),

    // ECOM Operations
    ECOM_PURCHASE("21", "Achat en ligne", ChannelType.ECOM),
    ECOM_RECURRING("22", "Paiement Récurrent", ChannelType.ECOM),
    ECOM_3DS_AUTH("23", "3D Secure Authentification", ChannelType.ECOM),
    ECOM_FRAUD_CHECK("24", "Vérification Fraude", ChannelType.ECOM);

    private final String code;
    private final String description;
    private final ChannelType channel;

    OperationType(String code, String description, ChannelType channel) {
        this.code = code;
        this.description = description;
        this.channel = channel;
    }

    public String getCode() {
        return code;
    }

    public String getDescription() {
        return description;
    }

    public ChannelType getChannel() {
        return channel;
    }
}
