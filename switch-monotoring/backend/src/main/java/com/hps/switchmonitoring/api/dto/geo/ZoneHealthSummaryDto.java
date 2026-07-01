package com.hps.switchmonitoring.api.dto.geo;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Résumé santé de toutes les zones géographiques pour une date.
 * Utilisé pour alimenter la heatmap complète.
 */
public record ZoneHealthSummaryDto(
    LocalDate                date,
    int                      totalCountries,
    int                      healthyCount,       // score >= 95
    int                      warningCount,       // score 85-94
    int                      criticalCount,      // score < 85
    BigDecimal               globalVolumeMad,
    long                     globalTransactions,
    double                   globalAcceptanceRate,
    List<CountryHealthKpiDto> zones,
    String                   pivotCurrency       // "MAD"
) {}
