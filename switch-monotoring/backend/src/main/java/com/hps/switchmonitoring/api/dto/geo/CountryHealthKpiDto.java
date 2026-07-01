package com.hps.switchmonitoring.api.dto.geo;

import java.math.BigDecimal;
import java.util.List;

/**
 * KPI de santé complet pour un pays acquéreur.
 * Conforme aux standards PowerCARD (MTI 1100/1102 = demandes d'autorisation).
 */
public record CountryHealthKpiDto(
    String             countryCode,
    String             countryLabel,
    long               totalTransactions,
    long               approvedCount,
    long               declinedCount,
    long               reversalCount,
    double             acceptanceRate,        // % approbations / total (0-100)
    double             rejectionRate,         // % rejets / total (0-100)
    String             healthStatus,          // "HEALTHY" | "WARNING" | "CRITICAL"
    String             healthColor,           // "#22c55e" | "#f59e0b" | "#ef4444"
    int                healthScore,           // 0-100
    double             avgLatencySeconds,
    BigDecimal         totalVolumeMad,        // montant total converti en MAD
    String             topRejectCode,
    String             topRejectDescription,
    List<RejectReasonDto> rejectBreakdown,
    boolean            alertTriggered,        // true si taux rejet > seuil configuré
    String             alertMessage
) {}
