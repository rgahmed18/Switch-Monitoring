package com.hps.switchmonitoring.api.dto.geo;

/**
 * Devise active pour un contexte géographique donné.
 */
public record ActiveCurrencyDto(
    String isoCode,       // ISO 4217 numérique (ex: "504" = MAD)
    String isoAlpha,      // Alpha (ex: "MAD")
    String label,         // "Dirham Marocain"
    String countryCode,   // Pays acquéreur associé (null si multi-pays)
    long   transactionCount
) {}
