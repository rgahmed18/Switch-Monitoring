package com.hps.switchmonitoring.enums;

/**
 * Types d'acteurs dans une transaction
 * - ISSUER: Banque émettrice (propriétaire de la carte)
 * - ACQUIRER: Banque réceptrice (commerçant/point de vente)
 */
public enum ActorType {
    ISSUER("01", "Banque Émettrice", "Initie la transaction"),
    ACQUIRER("02", "Banque Acquéreur", "Accepte la transaction");

    private final String code;
    private final String role;
    private final String description;

    ActorType(String code, String role, String description) {
        this.code = code;
        this.role = role;
        this.description = description;
    }

    public String getCode() {
        return code;
    }

    public String getRole() {
        return role;
    }

    public String getDescription() {
        return description;
    }
}
