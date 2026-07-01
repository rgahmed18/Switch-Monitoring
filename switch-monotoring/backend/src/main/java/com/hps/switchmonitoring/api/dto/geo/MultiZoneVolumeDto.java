package com.hps.switchmonitoring.api.dto.geo;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Données de volume multi-zone avec pivot MAD pour graphiques.
 */
public record MultiZoneVolumeDto(
    LocalDate   fromDate,
    LocalDate   toDate,
    String      pivotCurrency,   // "MAD"
    List<ZoneVolume> volumes
) {
    public record ZoneVolume(
        String     countryCode,
        String     countryLabel,
        String     currency,
        String     currencyLabel,
        long       transactionCount,
        BigDecimal volumeMad
    ) {}
}
