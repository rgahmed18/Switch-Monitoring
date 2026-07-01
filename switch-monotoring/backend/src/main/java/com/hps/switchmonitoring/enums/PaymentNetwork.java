package com.hps.switchmonitoring.enums;

/**
 * Réseaux de paiement supportés
 * - VISA: VISA International
 * - MASTERCARD: Mastercard Worldwide
 * - SWIFT: Protocole SWIFT (utilisé par POWERCARD)
 * - LOCAL: Transactions intra-bancaires
 */
public enum PaymentNetwork {
    VISA("04", "VISA International", "Carte VISA"),
    MASTERCARD("05", "Mastercard Worldwide", "Carte Mastercard"),
    SWIFT("92", "SWIFT / POWERCARD", "Transfert SWIFT"),
    LOCAL("00", "Transaction Locale", "Même banque");

    private final String code;
    private final String name;
    private final String description;

    PaymentNetwork(String code, String name, String description) {
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

    /**
     * Détecte le réseau de paiement depuis le numéro de carte
     */
    public static PaymentNetwork detectFromCard(String cardNumber) {
        if (cardNumber == null || cardNumber.isEmpty()) return LOCAL;
        
        String firstDigit = cardNumber.substring(0, 1);
        
        if (firstDigit.equals("4")) return VISA;
        if (firstDigit.equals("5")) return MASTERCARD;
        
        return LOCAL;
    }
}
