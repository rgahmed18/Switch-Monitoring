package com.hps.switchmonitoring.service;

import com.hps.switchmonitoring.api.dto.CreateAlertRequest;
import com.hps.switchmonitoring.domain.AutohoActivityAdmEntity;
import com.hps.switchmonitoring.repository.AutohoActivityAdmRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Moteur d'alertes intelligentes basé sur AUTHO_ACTIVITY_ADM.
 *
 * Règles actives (exécutées toutes les 30 secondes) :
 *   [R1] Taux de refus élevé (> 30%)
 *   [R2] Montant moyen anormalement élevé (> 50 000)
 *   [R3] Codes action fraude détectés (102, 129, 181, 182, 183)
 *   [R4] SLA de traitement dépassé (transactions > 5s)
 *   [R5] ATC suspects (risque clonage / replay attack)
 *   [R6] TVR non clean en masse (> 10% des transactions chip)
 *   [R7] Transactions cross-devise avec écarts FX importants
 */
@Component
public class SmartAlertEngine {

    private final AutohoActivityAdmRepository repository;
    private final AlertService alertService;

    private static final long COOLDOWN_MS = 60_000L;

    // Timestamps de la dernière alerte par règle (pour éviter le spam)
    private long lastDeclineAlertMs      = 0;
    private long lastAmountAlertMs       = 0;
    private long lastFraudCodeAlertMs    = 0;
    private long lastSlaAlertMs          = 0;
    private long lastAtcAlertMs          = 0;
    private long lastTvrAlertMs          = 0;
    private long lastCrossDeviseAlertMs  = 0;

    public SmartAlertEngine(AutohoActivityAdmRepository repository, AlertService alertService) {
        this.repository   = repository;
        this.alertService = alertService;
    }

    @Scheduled(fixedRate = 30_000)
    public void evaluateRules() {
        try {
            LocalDate today = LocalDate.now();
            long total = repository.countByBusinessDate(today);
            if (total < 5) return; // Pas assez de données

            evaluateDeclineRate(today, total);
            evaluateHighAvgAmount(today);
            evaluateFraudActionCodes(today);
            evaluateSlaBreaches(today, total);
            evaluateSuspiciousAtc(today);
            evaluateNonCleanTvr(today, total);
            evaluateCrossCurrencyVolume(today, total);

        } catch (Exception e) {
            // Le moteur ne doit jamais crasher - les alertes sont best-effort
        }
    }

    // ─── R1 : Taux de refus élevé ─────────────────────────────────────────────

    private void evaluateDeclineRate(LocalDate today, long total) {
        if (!canAlert(lastDeclineAlertMs)) return;
        long declined   = repository.countDeclinedByBusinessDate(today);
        double rate     = (double) declined / total;
        if (rate > 0.30) {
            trigger("HIGH_DECLINE_RATE", "warning",
                "Taux de Refus Anormal",
                String.format("Taux de rejet : %.1f%% (%d/%d transactions). "
                    + "Seuil critique : 30%%.", rate * 100, declined, total));
            lastDeclineAlertMs = System.currentTimeMillis();
        }
    }

    // ─── R2 : Montant moyen élevé ─────────────────────────────────────────────

    private void evaluateHighAvgAmount(LocalDate today) {
        if (!canAlert(lastAmountAlertMs)) return;
        BigDecimal avg = repository.avgAmountByBusinessDate(today);
        if (avg != null && avg.doubleValue() > 50_000) {
            trigger("HIGH_AVG_AMOUNT", "info",
                "Montant Moyen Élevé",
                String.format("Montant moyen aujourd'hui : %.2f (seuil : 50 000). "
                    + "Vérifier les transactions VIP ou erreurs de montant.", avg.doubleValue()));
            lastAmountAlertMs = System.currentTimeMillis();
        }
    }

    // ─── R3 : Codes action fraude détectés ───────────────────────────────────

    private void evaluateFraudActionCodes(LocalDate today) {
        if (!canAlert(lastFraudCodeAlertMs)) return;
        long fraudCount = repository.countFraudActionCodesByDate(today);
        if (fraudCount > 0) {
            trigger("FRAUD_ACTION_CODES", "critical",
                "Codes Fraude Détectés",
                String.format("%d transaction(s) avec codes fraude (102/129/181/182/183/188) "
                    + "détectée(s) aujourd'hui. Investigation immédiate requise.", fraudCount));
            lastFraudCodeAlertMs = System.currentTimeMillis();
        }
    }

    // ─── R4 : SLA de traitement dépassé ──────────────────────────────────────

    private void evaluateSlaBreaches(LocalDate today, long total) {
        if (!canAlert(lastSlaAlertMs)) return;
        long breaches = repository.countSlaBreachesByDate(today);
        if (breaches > 0) {
            double brPct = (double) breaches / total * 100;
            String severity = brPct > 5.0 ? "critical" : "warning";
            trigger("SLA_BREACH", severity,
                "Dépassement SLA Traitement",
                String.format("%d transaction(s) avec latence > 5s (%.1f%% du volume). "
                    + "Vérifier la connectivité avec les émetteurs.", breaches, brPct));
            lastSlaAlertMs = System.currentTimeMillis();
        }
    }

    // ─── R5 : ATC suspect (risque clonage / replay) ──────────────────────────

    private void evaluateSuspiciousAtc(LocalDate today) {
        if (!canAlert(lastAtcAlertMs)) return;
        List<AutohoActivityAdmEntity> suspicious = repository.findSuspiciousAtcByDate(today);
        if (!suspicious.isEmpty()) {
            // Extraire les derniers 4 chiffres des PAN affectés (masqués)
            String pans = suspicious.stream()
                .limit(3)
                .map(e -> maskPan(e.getCardNumber()))
                .reduce("", (a, b) -> a.isEmpty() ? b : a + ", " + b);
            trigger("SUSPICIOUS_ATC", "critical",
                "ATC Suspect - Risque Clonage",
                String.format("%d carte(s) avec ATC anormalement bas (1-4). "
                    + "Risque de replay attack ou carte clonée. Cartes concernées : %s",
                    suspicious.size(), pans));
            lastAtcAlertMs = System.currentTimeMillis();
        }
    }

    // ─── R6 : TVR non clean en masse ─────────────────────────────────────────

    private void evaluateNonCleanTvr(LocalDate today, long total) {
        if (!canAlert(lastTvrAlertMs)) return;
        long chipCount   = repository.countChipTransactionsByDate(today);
        if (chipCount < 5) return;
        long nonCleanTvr = repository.countNonCleanTvrByDate(today);
        double pct       = (double) nonCleanTvr / chipCount * 100;
        if (pct > 15.0) {
            trigger("HIGH_TVR_ANOMALY_RATE", "warning",
                "Taux TVR Non-Clean Élevé",
                String.format("%.1f%% des transactions chip (%d/%d) présentent des "
                    + "flags TVR actifs. Possible problème d'authentification offline "
                    + "ou terminaux défaillants.", pct, nonCleanTvr, chipCount));
            lastTvrAlertMs = System.currentTimeMillis();
        }
    }

    // ─── R7 : Volume cross-devise élevé ──────────────────────────────────────

    private void evaluateCrossCurrencyVolume(LocalDate today, long total) {
        if (!canAlert(lastCrossDeviseAlertMs)) return;
        long crossCount = repository.countCrossCurrencyByDate(today);
        if (crossCount == 0) return;
        double pct = (double) crossCount / total * 100;
        if (pct > 40.0) {
            trigger("HIGH_CROSS_CURRENCY", "info",
                "Volume Cross-Devise Élevé",
                String.format("%.1f%% des transactions (%d) impliquent une conversion de devise. "
                    + "Vérifier les taux de change appliqués.", pct, crossCount));
            lastCrossDeviseAlertMs = System.currentTimeMillis();
        }
    }

    // ─── Helpers privés ───────────────────────────────────────────────────────

    private boolean canAlert(long lastMs) {
        return System.currentTimeMillis() - lastMs > COOLDOWN_MS;
    }

    private void trigger(String type, String severity, String title, String details) {
        CreateAlertRequest req = new CreateAlertRequest();
        req.setType(type);
        req.setSeverity(severity);
        req.setTitle(title);
        req.setDetails(details);
        alertService.createAlert(req);
    }

    private String maskPan(String pan) {
        if (pan == null || pan.length() < 4) return "****";
        return "**** " + pan.substring(pan.length() - 4);
    }
}
