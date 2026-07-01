package com.hps.switchmonitoring.service.geo;

import com.hps.switchmonitoring.api.dto.geo.CountryHealthKpiDto;
import com.hps.switchmonitoring.api.dto.geo.RejectReasonDto;
import com.hps.switchmonitoring.api.dto.geo.ZoneHealthSummaryDto;
import com.hps.switchmonitoring.repository.AutohoActivityAdmRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Service de monitoring de santé par zone géographique.
 *
 * ─ Logique PowerCARD ────────────────────────────────────────────────────────
 * Seuls les MTI 1100/1102 (demandes d'autorisation) et 1200/1210 (presentment)
 * sont comptabilisés dans le ratio d'acceptation.
 * Les 1110 sont des réponses (déjà comptées côté demande),
 * les 1420/1421 sont des reversals (comptés séparément).
 *
 * ─ Seuils d'alerte ──────────────────────────────────────────────────────────
 *   HEALTHY  : taux acceptation >= 95 %  → vert   #22c55e
 *   WARNING  : taux acceptation >= 85 %  → orange #f59e0b
 *   CRITICAL : taux acceptation <  85 %  → rouge  #ef4444
 *
 * ─ Score santé (0-100) ──────────────────────────────────────────────────────
 *   Base = acceptance_rate
 *   Malus latence   : -5 pts si avg_latency > 3s, -10 pts si > 5s
 *   Malus reversals : -3 pts si reversal_rate > 2 %
 */
@Service
public class ZoneHealthService {

    // Seuils acceptance rate
    private static final double THRESHOLD_HEALTHY  = 95.0;
    private static final double THRESHOLD_WARNING  = 85.0;

    // Couleurs status
    private static final String COLOR_HEALTHY  = "#22c55e";
    private static final String COLOR_WARNING  = "#f59e0b";
    private static final String COLOR_CRITICAL = "#ef4444";

    private final AutohoActivityAdmRepository repository;
    private final GeoFilterService            geoFilter;

    public ZoneHealthService(AutohoActivityAdmRepository repository,
                             GeoFilterService geoFilter) {
        this.repository = repository;
        this.geoFilter  = geoFilter;
    }

    // ── API publique ──────────────────────────────────────────────────────────

    /**
     * Calcule la santé de toutes les zones pour une date.
     * Retourne le ZoneHealthSummaryDto complet pour la heatmap.
     */
    public ZoneHealthSummaryDto computeFullHeatmap(LocalDate date) {
        List<Object[]> rows    = repository.findZoneHealthByDate(date);
        List<CountryHealthKpiDto> zones = new ArrayList<>();

        long   globalTotal    = 0;
        long   globalApproved = 0;
        BigDecimal globalVol  = BigDecimal.ZERO;
        int    healthyCount   = 0;
        int    warningCount   = 0;
        int    criticalCount  = 0;

        for (Object[] row : rows) {
            CountryHealthKpiDto kpi = buildKpi(row, date);
            zones.add(kpi);
            globalTotal    += kpi.totalTransactions();
            globalApproved += kpi.approvedCount();
            if (kpi.totalVolumeMad() != null) globalVol = globalVol.add(kpi.totalVolumeMad());
            switch (kpi.healthStatus()) {
                case "HEALTHY"  -> healthyCount++;
                case "WARNING"  -> warningCount++;
                case "CRITICAL" -> criticalCount++;
            }
        }

        double globalRate = globalTotal > 0
            ? round2((double) globalApproved / globalTotal * 100)
            : 0.0;

        return new ZoneHealthSummaryDto(
            date,
            zones.size(),
            healthyCount,
            warningCount,
            criticalCount,
            globalVol.setScale(3, RoundingMode.HALF_UP),
            globalTotal,
            globalRate,
            zones,
            "MAD"
        );
    }

    /**
     * Calcule le KPI de santé d'un seul pays.
     */
    public CountryHealthKpiDto computeCountryKpi(LocalDate date, String countryCode) {
        List<Object[]> rows = repository.findZoneHealthByDate(date);
        return rows.stream()
            .filter(r -> countryCode.equalsIgnoreCase(nullStr(r[0])))
            .findFirst()
            .map(row -> buildKpi(row, date))
            .orElse(emptyKpi(countryCode));
    }

    /**
     * Retourne uniquement les zones en état CRITICAL ou WARNING (alertes).
     */
    public List<CountryHealthKpiDto> getAlertZones(LocalDate date) {
        ZoneHealthSummaryDto summary = computeFullHeatmap(date);
        return summary.zones().stream()
            .filter(z -> "CRITICAL".equals(z.healthStatus()) || "WARNING".equals(z.healthStatus()))
            .sorted((a, b) -> Integer.compare(a.healthScore(), b.healthScore()))
            .toList();
    }

    // ── Construction d'un KPI depuis une ligne de résultat Oracle ────────────

    private CountryHealthKpiDto buildKpi(Object[] row, LocalDate date) {
        String     countryCode   = nullStr(row[0]);
        long       total         = row[1] != null ? ((Number) row[1]).longValue() : 0L;
        long       approved      = row[2] != null ? ((Number) row[2]).longValue() : 0L;
        long       declined      = row[3] != null ? ((Number) row[3]).longValue() : 0L;
        long       reversals     = row[4] != null ? ((Number) row[4]).longValue() : 0L;
        String     topRejectCode = nullStr(row[5]);
        double     avgLatency    = row[6] != null ? ((Number) row[6]).doubleValue() : 0.0;
        BigDecimal volumeMad     = row[7] != null
                                   ? new BigDecimal(row[7].toString()).setScale(3, RoundingMode.HALF_UP)
                                   : BigDecimal.ZERO;

        double acceptRate  = total > 0 ? round2((double) approved / total * 100) : 0.0;
        double rejectRate  = round2(100.0 - acceptRate);
        double reversalPct = total > 0 ? round2((double) reversals / total * 100) : 0.0;

        // Score santé PowerCARD
        int score = (int) Math.round(acceptRate);
        if (avgLatency > 5.0) score = Math.max(0, score - 10);
        else if (avgLatency > 3.0) score = Math.max(0, score - 5);
        if (reversalPct > 2.0) score = Math.max(0, score - 3);

        String status = healthStatus(acceptRate);
        String color  = healthColor(status);

        // Description top rejet
        String topRejectDesc = topRejectCode != null
            ? rejectDescription(topRejectCode)
            : "Aucun rejet";

        // Détail des rejets
        List<RejectReasonDto> rejectBreakdown = buildRejectBreakdown(date, countryCode, declined);

        // Alerte
        boolean alertTriggered = "CRITICAL".equals(status) || "WARNING".equals(status);
        String alertMessage = alertTriggered
            ? buildAlertMessage(status, countryCode, rejectRate, topRejectCode)
            : null;

        return new CountryHealthKpiDto(
            countryCode,
            GeoFilterService.labelCountry(countryCode),
            total,
            approved,
            declined,
            reversals,
            acceptRate,
            rejectRate,
            status,
            color,
            score,
            round3(avgLatency),
            volumeMad,
            topRejectCode,
            topRejectDesc,
            rejectBreakdown,
            alertTriggered,
            alertMessage
        );
    }

    private List<RejectReasonDto> buildRejectBreakdown(LocalDate date, String country,
                                                        long totalDeclined) {
        if (country == null) return List.of();
        List<Object[]> rows = repository.findTopRejectCodesForCountry(date, country);
        List<RejectReasonDto> result = new ArrayList<>();
        for (Object[] r : rows) {
            String actionCode  = nullStr(r[0]);
            String rejectCode  = nullStr(r[1]);
            long   count       = r[2] != null ? ((Number) r[2]).longValue() : 0L;
            double pct         = totalDeclined > 0 ? round2((double) count / totalDeclined * 100) : 0.0;
            result.add(new RejectReasonDto(
                actionCode,
                rejectCode,
                rejectDescription(actionCode),
                rejectCategory(actionCode),
                count,
                pct
            ));
        }
        return result;
    }

    // ── Logique de score ──────────────────────────────────────────────────────

    private String healthStatus(double acceptanceRate) {
        if (acceptanceRate >= THRESHOLD_HEALTHY) return "HEALTHY";
        if (acceptanceRate >= THRESHOLD_WARNING) return "WARNING";
        return "CRITICAL";
    }

    private String healthColor(String status) {
        return switch (status) {
            case "HEALTHY"  -> COLOR_HEALTHY;
            case "WARNING"  -> COLOR_WARNING;
            default         -> COLOR_CRITICAL;
        };
    }

    private String buildAlertMessage(String status, String countryCode,
                                      double rejectRate, String topCode) {
        String country = GeoFilterService.labelCountry(countryCode);
        String level   = "CRITICAL".equals(status) ? "CRITIQUE" : "AVERTISSEMENT";
        String top     = topCode != null ? " Code dominant : " + topCode
                         + " (" + rejectDescription(topCode) + ")." : "";
        return String.format("[%s] %s — Taux de rejet : %.1f%%.%s",
                             level, country, rejectRate, top);
    }

    // ── Tables de référence ISO 8583 (codes action) ───────────────────────────

    private static final Map<String, String> REJECT_DESCRIPTIONS = Map.ofEntries(
        Map.entry("000", "Approuvé"),
        Map.entry("100", "Refus générique"),
        Map.entry("101", "Carte expirée"),
        Map.entry("102", "Suspicion de fraude"),
        Map.entry("105", "Nombre d'essais PIN dépassé"),
        Map.entry("106", "Tentatives de fraude"),
        Map.entry("110", "Montant invalide"),
        Map.entry("111", "PAN invalide"),
        Map.entry("114", "Compte inexistant"),
        Map.entry("115", "Fonction non autorisée"),
        Map.entry("116", "Fonds insuffisants"),
        Map.entry("117", "PIN incorrect"),
        Map.entry("118", "Carte non activée"),
        Map.entry("119", "Titulaire non autorisé"),
        Map.entry("120", "Transaction non autorisée pour terminal"),
        Map.entry("121", "Plafond quotidien dépassé"),
        Map.entry("122", "Plafond retraits dépassé"),
        Map.entry("123", "Plafond fréquence dépassé"),
        Map.entry("125", "Carte invalide"),
        Map.entry("129", "Suspicion de fraude (réseau)"),
        Map.entry("130", "Format de message incorrect"),
        Map.entry("131", "Identifiant acquéreur invalide"),
        Map.entry("133", "Carte expirée (vérif date)"),
        Map.entry("134", "Suspicion de fraude — carte clonée"),
        Map.entry("141", "Carte perdue"),
        Map.entry("143", "Carte volée"),
        Map.entry("150", "Refus émetteur"),
        Map.entry("181", "Fraude — code TVR"),
        Map.entry("182", "Fraude — ATC anormal"),
        Map.entry("183", "Fraude — cryptogramme invalide"),
        Map.entry("188", "Fraude — données EMV suspectes"),
        Map.entry("200", "Erreur — contacter émetteur"),
        Map.entry("300", "Erreur interne réseau"),
        Map.entry("400", "Reversal accepté"),
        Map.entry("500", "Réconciliation impossible"),
        Map.entry("902", "Transaction invalide"),
        Map.entry("903", "Re-soumission demandée"),
        Map.entry("904", "Données de format erroné"),
        Map.entry("906", "Switch indisponible"),
        Map.entry("907", "Émetteur inaccessible"),
        Map.entry("909", "Erreur système"),
        Map.entry("910", "Émetteur inaccessible (réseau)"),
        Map.entry("911", "Timeout émetteur"),
        Map.entry("912", "Émetteur hors ligne"),
        Map.entry("940", "Erreur technique interne"),
        Map.entry("950", "Violation des règles de la politique")
    );
    private static final Map<String, String> REJECT_CATEGORIES = Map.ofEntries(
            Map.entry("102", "FRAUDE"), Map.entry("105", "FRAUDE"), Map.entry("106", "FRAUDE"),
            Map.entry("129", "FRAUDE"), Map.entry("134", "FRAUDE"), Map.entry("141", "FRAUDE"),
            Map.entry("143", "FRAUDE"), Map.entry("181", "FRAUDE"), Map.entry("182", "FRAUDE"),
            Map.entry("183", "FRAUDE"), Map.entry("188", "FRAUDE"),
            Map.entry("101", "EXPIRATION"), Map.entry("133", "EXPIRATION"),
            Map.entry("116", "BUSINESS"), Map.entry("117", "BUSINESS"), Map.entry("119", "BUSINESS"),
            Map.entry("121", "BUSINESS"), Map.entry("122", "BUSINESS"), Map.entry("123", "BUSINESS")
    );

    private String rejectDescription(String code) {
        if (code == null) return "Code inconnu";
        return REJECT_DESCRIPTIONS.getOrDefault(code, "Code " + code);
    }

    private String rejectCategory(String code) {
        if (code == null) return "TECHNIQUE";
        return REJECT_CATEGORIES.getOrDefault(code, "TECHNIQUE");
    }

    // ── Utilitaires ───────────────────────────────────────────────────────────

    private CountryHealthKpiDto emptyKpi(String countryCode) {
        return new CountryHealthKpiDto(
            countryCode, GeoFilterService.labelCountry(countryCode),
            0L, 0L, 0L, 0L,
            0.0, 0.0, "HEALTHY", COLOR_HEALTHY, 100,
            0.0, BigDecimal.ZERO,
            null, "Aucune donnée", List.of(),
            false, null
        );
    }

    private static String nullStr(Object o) {
        return o != null ? o.toString().trim() : null;
    }

    private static double round2(double v) {
        return BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    private static double round3(double v) {
        return BigDecimal.valueOf(v).setScale(3, RoundingMode.HALF_UP).doubleValue();
    }
}
