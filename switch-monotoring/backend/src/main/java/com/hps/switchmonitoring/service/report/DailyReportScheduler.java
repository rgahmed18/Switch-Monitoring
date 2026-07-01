package com.hps.switchmonitoring.service.report;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Génère automatiquement le rapport journalier chaque soir à 23h55.
 * Le rapport est calculé en mémoire et loggué ; le PDF est disponible
 * à la demande via ReportController.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DailyReportScheduler {

    private final ReportService reportService;

    /**
     * Exécuté chaque soir à 23h55 (heure serveur).
     * Calcule et valide les statistiques de la journée.
     * Le PDF est généré à la demande ; ici on pré-calcule et on logue
     * le résumé pour audit/alertes.
     */
    @Scheduled(cron = "0 55 23 * * *")
    public void generateDailyReport() {
        LocalDate today = LocalDate.now();
        log.info("[SCHEDULER] Début génération rapport journalier pour {}", today);

        try {
            DailyReportStats stats = reportService.buildStats(today);

            log.info("[RAPPORT {}] Total={} | Approuvées={} | Refusées={} | Erreurs={} | Taux succès={}%",
                today,
                stats.getTotalTransactions(),
                stats.getApprovedCount(),
                stats.getDeclinedCount(),
                stats.getErrorCount(),
                stats.getSuccessRate());

            // Alerte si taux de succès < 85%
            if (stats.getSuccessRate() < 85.0 && stats.getTotalTransactions() > 10) {
                log.warn("[ALERTE] Taux de succès anormalement bas : {}% pour {}",
                    stats.getSuccessRate(), today);
            }

            log.info("[SCHEDULER] Rapport journalier calculé avec succès pour {}", today);

        } catch (Exception e) {
            log.error("[SCHEDULER] Erreur lors de la génération du rapport pour {} : {}",
                today, e.getMessage(), e);
        }
    }
}
