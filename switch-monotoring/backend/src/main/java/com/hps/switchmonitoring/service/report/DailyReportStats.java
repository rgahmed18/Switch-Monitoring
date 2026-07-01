package com.hps.switchmonitoring.service.report;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

/**
 * DTO de statistiques journalières renvoyé par l'API REST et utilisé
 * pour la génération PDF.
 */
@Data
@Builder
public class DailyReportStats {

    private LocalDate date;

    // ── Volumes transactionnels ───────────────────────────────────────────
    private long          totalTransactions;
    private long          approvedCount;
    private long          declinedCount;
    private long          errorCount;

    // ── Taux de succès (%) ───────────────────────────────────────────────
    private double        successRate;

    // ── Montants ──────────────────────────────────────────────────────────
    private BigDecimal    totalVolume;
    private BigDecimal    averageAmount;

    // ── Répartitions ──────────────────────────────────────────────────────
    /** Clé = code MTI normalisé (ex: "0100"), valeur = nombre de transactions */
    private Map<String, Long> mtiDistribution;

    /** Clé = heure (0-23), valeur = nombre de transactions */
    private Map<String, Long> hourlyVolume;

    /** Clé = action_code, valeur = nombre d'occurrences */
    private Map<String, Long> actionCodeDistribution;
}
