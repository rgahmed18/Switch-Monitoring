package com.hps.switchmonitoring.enums;

/**
 * Types de canaux de transaction dans le Switch Monitoring
 * - ATM: Guichet Automatique Bancaire
 * - POS: Terminal de Paiement (Point of Sale)
 * - ECOM: Paiement E-Commerce
 */
public enum ChannelType {
    ATM("01", "ATM - Guichet Automatique", "01xxxx"),
    POS("00", "POS - Terminal de Vente", "00xxxx"),
    ECOM("06", "ECOM - E-Commerce", "06xxxx");

    private final String code;
    private final String description;
    private final String posEntryModePattern;

    ChannelType(String code, String description, String posEntryModePattern) {
        this.code = code;
        this.description = description;
        this.posEntryModePattern = posEntryModePattern;
    }

    public String getCode() {
        return code;
    }

    public String getDescription() {
        return description;
    }

    public String getPosEntryModePattern() {
        return posEntryModePattern;
    }

    /**
     * Détecte le type de canal basé sur le code MTI ou POS Entry Mode
     */
    public static ChannelType detectFromMti(String mtiCode) {
        if (mtiCode == null) return POS;
        if (mtiCode.startsWith("01")) return ATM;
        if (mtiCode.startsWith("06")) return ECOM;
        return POS;
    }
}
