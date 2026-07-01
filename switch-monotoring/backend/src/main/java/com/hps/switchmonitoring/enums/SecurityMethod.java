package com.hps.switchmonitoring.enums;

/**
 * Méthodes de sécurité/authentification
 */
public enum SecurityMethod {
    PIN_ONLINE("01", "PIN en ligne", "Vérification PIN en temps réel"),
    PIN_OFFLINE("02", "PIN hors ligne", "Vérification PIN décentralisée"),
    NFC_CONTACTLESS("03", "Sans-contact NFC", "Paiement sans contact"),
    THREE_DS("04", "3D Secure", "Authentification 3D Secure (ECOM)"),
    CVV_ONLY("05", "CVV uniquement", "Vérification du CVV (CNP)"),
    SIGNATURE("06", "Signature", "Validation par signature"),
    BIOMETRIC("07", "Biométrique", "Authentification biométrique");

    private final String code;
    private final String name;
    private final String description;

    SecurityMethod(String code, String name, String description) {
        this.code = code;
        this.name = name;
        this.description = description;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }
}
