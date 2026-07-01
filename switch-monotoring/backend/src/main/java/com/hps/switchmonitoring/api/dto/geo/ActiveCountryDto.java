package com.hps.switchmonitoring.api.dto.geo;

/**
 * Pays acquéreur actif avec son libellé et son volume de transactions.
 */
public record ActiveCountryDto(
    String code,          // ISO 3166 numérique (ex: "504")
    String label,         // Libellé pays (ex: "Maroc")
    long   transactionCount
) {}
