package com.hps.switchmonitoring.service.currency;

import com.hps.switchmonitoring.domain.AutohoActivityAdmEntity;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Service d'intelligence multi-devise.
 *
 * Analyse les 3 couches de devises dans AUTHO_ACTIVITY_ADM :
 *   Couche 1 - Transaction  : transaction_amount / transaction_currency
 *   Couche 2 - Billing      : billing_amount / billing_currency / conversion_rate
 *   Couche 3A - Settlement ISS : iss_settlement_amount / iss_settlement_currency
 *   Couche 3B - Settlement ACQ : acq_settlement_amount / acq_settlement_currency
 *
 * Détecte les anomalies : taux suspects, écarts ISS/ACQ, settlement en retard.
 */
@Service
public class CurrencyIntelligenceService {

    private static final BigDecimal VARIANCE_THRESHOLD_PCT = new BigDecimal("1.00");
    private static final int SCALE = 6;
    private static final RoundingMode RM = RoundingMode.HALF_UP;

    // ─── Codes ISO 4217 numériques → label ───────────────────────────────────
    private static final Map<String, String> CURRENCY_LABELS = Map.ofEntries(
        Map.entry("504", "MAD - Dirham Marocain"),
        Map.entry("840", "USD - Dollar Américain"),
        Map.entry("978", "EUR - Euro"),
        Map.entry("826", "GBP - Livre Sterling"),
        Map.entry("756", "CHF - Franc Suisse"),
        Map.entry("036", "AUD - Dollar Australien"),
        Map.entry("124", "CAD - Dollar Canadien"),
        Map.entry("392", "JPY - Yen Japonais"),
        Map.entry("156", "CNY - Yuan Chinois"),
        Map.entry("634", "QAR - Riyal Qatari"),
        Map.entry("682", "SAR - Riyal Saoudien"),
        Map.entry("784", "AED - Dirham Émirati"),
        Map.entry("788", "TND - Dinar Tunisien"),
        Map.entry("012", "DZD - Dinar Algérien"),
        Map.entry("818", "EGP - Livre Égyptienne"),
        Map.entry("566", "NGN - Naira Nigérian"),
        Map.entry("710", "ZAR - Rand Sud-Africain"),
        Map.entry("986", "BRL - Real Brésilien"),
        Map.entry("356", "INR - Roupie Indienne"),
        Map.entry("702", "SGD - Dollar de Singapour"),
        Map.entry("203", "MAD (code alternatif)")
    );

    // ─── Records publics ─────────────────────────────────────────────────────

    public record CurrencyLayer(
        BigDecimal amount,
        String     currencyCode,
        String     currencyLabel,
        boolean    hasData
    ) {}

    public record RateVariance(
        BigDecimal appliedRate,
        BigDecimal computedRate,
        BigDecimal variancePct,
        boolean    isAnomaly,
        String     assessment
    ) {}

    public record SettlementGap(
        BigDecimal issAmount,
        String     issCurrency,
        BigDecimal acqAmount,
        String     acqCurrency,
        BigDecimal gap,
        boolean    sameCurrency,
        String     assessment
    ) {}

    public record SettlementStatus(
        boolean issSettled,
        boolean acqSettled,
        String  status,
        long    issDelayDays,
        long    acqDelayDays,
        boolean isSlaBreached
    ) {}

    public record CurrencyAnalysis(
        CurrencyLayer    transactionLayer,
        CurrencyLayer    billingLayer,
        CurrencyLayer    issSettlementLayer,
        CurrencyLayer    acqSettlementLayer,
        String           fxType,
        RateVariance     rateVariance,
        SettlementGap    settlementGap,
        SettlementStatus settlementStatus,
        BigDecimal       totalFees,
        List<String>     anomalies,
        List<String>     recommendations
    ) {}

    // ─── Point d'entrée ──────────────────────────────────────────────────────

    public CurrencyAnalysis analyze(AutohoActivityAdmEntity e) {

        CurrencyLayer tx  = layer(e.getTransactionAmount(),   e.getTransactionCurrency());
        CurrencyLayer bil = layer(e.getBillingAmount(),       e.getBillingCurrency());
        CurrencyLayer iss = layer(e.getIssSettlementAmount(), e.getIssSettlementCurrency());
        CurrencyLayer acq = layer(e.getAcqSettlementAmount(), e.getAcqSettlementCurrency());

        String fxType = determineFxType(tx, bil, iss, acq);

        RateVariance variance  = analyzeRate(tx, bil, e.getConversionRate());
        SettlementGap gap      = analyzeSettlementGap(iss, acq);
        SettlementStatus status = analyzeSettlementStatus(e);

        BigDecimal fees = computeTotalFees(
            e.getTransactionFee(), e.getIssSettlementFee(), e.getAcqSettlementFee());

        List<String> anomalies = detectAnomalies(variance, gap, status, fxType);
        List<String> recs      = buildRecommendations(anomalies, variance, gap, status);

        return new CurrencyAnalysis(tx, bil, iss, acq, fxType, variance,
            gap, status, fees, anomalies, recs);
    }

    // ─── Construction des couches ─────────────────────────────────────────────

    private CurrencyLayer layer(BigDecimal amount, String currency) {
        boolean has = amount != null && currency != null && !currency.isBlank();
        String label = has ? CURRENCY_LABELS.getOrDefault(currency.trim(),
            currency.trim() + " (code inconnu)") : "N/A";
        return new CurrencyLayer(
            has ? amount.setScale(3, RM) : BigDecimal.ZERO,
            has ? currency.trim() : "",
            label,
            has
        );
    }

    // ─── Type de flux de change ───────────────────────────────────────────────

    private String determineFxType(CurrencyLayer tx, CurrencyLayer bil,
                                   CurrencyLayer iss, CurrencyLayer acq) {
        boolean txBilDiff  = tx.hasData() && bil.hasData()
                          && !tx.currencyCode().equals(bil.currencyCode());
        boolean bilIssDiff = bil.hasData() && iss.hasData()
                          && !bil.currencyCode().equals(iss.currencyCode());
        boolean issAcqDiff = iss.hasData() && acq.hasData()
                          && !iss.currencyCode().equals(acq.currencyCode());

        if (txBilDiff && (bilIssDiff || issAcqDiff)) return "MULTI_FX_COMPLEX";
        if (txBilDiff)                                return "CROSS_CURRENCY";
        if (bilIssDiff || issAcqDiff)                 return "SETTLEMENT_FX";
        return "SAME_CURRENCY";
    }

    // ─── Analyse du taux de conversion ───────────────────────────────────────

    private RateVariance analyzeRate(CurrencyLayer tx, CurrencyLayer bil,
                                     BigDecimal appliedRate) {
        if (!tx.hasData() || !bil.hasData() || appliedRate == null
                || appliedRate.compareTo(BigDecimal.ZERO) == 0) {
            return new RateVariance(appliedRate, null, null, false, "Pas de conversion");
        }
        if (tx.currencyCode().equals(bil.currencyCode())) {
            return new RateVariance(appliedRate, BigDecimal.ONE, BigDecimal.ZERO,
                false, "Même devise - pas de conversion");
        }

        // Taux calculé à partir des montants réels
        BigDecimal computedRate = bil.amount()
            .divide(tx.amount(), SCALE, RM);

        // Variance en % = |billing - (tx * applied)| / billing * 100
        BigDecimal expected    = tx.amount().multiply(appliedRate).setScale(3, RM);
        BigDecimal diff        = bil.amount().subtract(expected).abs();
        BigDecimal variancePct = diff.divide(bil.amount(), SCALE, RM)
            .multiply(BigDecimal.valueOf(100)).setScale(4, RM);

        boolean anomaly = variancePct.compareTo(VARIANCE_THRESHOLD_PCT) > 0;
        String assessment = anomaly
            ? String.format("ANOMALIE : Écart de %.4f%% entre taux appliqué et montant facturé",
                variancePct.doubleValue())
            : String.format("NORMAL : Variance %.4f%% (< 1%%)", variancePct.doubleValue());

        return new RateVariance(appliedRate, computedRate, variancePct, anomaly, assessment);
    }

    // ─── Analyse de l'écart ISS / ACQ settlement ─────────────────────────────

    private SettlementGap analyzeSettlementGap(CurrencyLayer iss, CurrencyLayer acq) {
        if (!iss.hasData() || !acq.hasData()) {
            return new SettlementGap(
                iss.amount(), iss.currencyCode(),
                acq.amount(), acq.currencyCode(),
                null, false, "Données de settlement incomplètes");
        }

        boolean sameCurr = iss.currencyCode().equals(acq.currencyCode());
        BigDecimal gap   = sameCurr
            ? iss.amount().subtract(acq.amount()).abs()
            : null;

        String assessment;
        if (!sameCurr) {
            assessment = "Devises ISS/ACQ différentes (" + iss.currencyCode()
                + " / " + acq.currencyCode() + ") - Comparer en devise commune";
        } else if (gap != null && gap.compareTo(BigDecimal.ZERO) == 0) {
            assessment = "Aucun écart ISS/ACQ - Settlement équilibré";
        } else {
            assessment = String.format("Écart ISS/ACQ : %.3f %s (coût réseau / interchange)",
                gap != null ? gap.doubleValue() : 0, iss.currencyCode());
        }

        return new SettlementGap(iss.amount(), iss.currencyCode(),
            acq.amount(), acq.currencyCode(), gap, sameCurr, assessment);
    }

    // ─── Statut de settlement (délai SLA) ────────────────────────────────────

    private SettlementStatus analyzeSettlementStatus(AutohoActivityAdmEntity e) {
        boolean issSettled = e.getIssSettlementDate() != null;
        boolean acqSettled = e.getAcqSettlementDate() != null;

        long issDelay = 0;
        long acqDelay = 0;

        if (e.getBusinessDate() != null) {
            if (issSettled) {
                issDelay = e.getBusinessDate().until(e.getIssSettlementDate(),
                    java.time.temporal.ChronoUnit.DAYS);
            } else {
                issDelay = e.getBusinessDate().until(java.time.LocalDate.now(),
                    java.time.temporal.ChronoUnit.DAYS);
            }
            if (acqSettled) {
                acqDelay = e.getBusinessDate().until(e.getAcqSettlementDate(),
                    java.time.temporal.ChronoUnit.DAYS);
            } else {
                acqDelay = e.getBusinessDate().until(java.time.LocalDate.now(),
                    java.time.temporal.ChronoUnit.DAYS);
            }
        }

        // SLA settlement standard = J+1 (1 jour)
        boolean slaBreached = (!issSettled && issDelay > 1) || (!acqSettled && acqDelay > 1);

        String status;
        if (issSettled && acqSettled)         status = "FULLY_SETTLED";
        else if (issSettled)                  status = "ISS_SETTLED_ACQ_PENDING";
        else if (acqSettled)                  status = "ACQ_SETTLED_ISS_PENDING";
        else if (slaBreached)                 status = "SETTLEMENT_SLA_BREACH";
        else                                  status = "PENDING_SETTLEMENT";

        return new SettlementStatus(issSettled, acqSettled, status,
            issDelay, acqDelay, slaBreached);
    }

    // ─── Total des frais ──────────────────────────────────────────────────────

    private BigDecimal computeTotalFees(BigDecimal txFee, BigDecimal issFee, BigDecimal acqFee) {
        BigDecimal total = BigDecimal.ZERO;
        if (txFee  != null) total = total.add(txFee);
        if (issFee != null) total = total.add(issFee);
        if (acqFee != null) total = total.add(acqFee);
        return total.setScale(3, RM);
    }

    // ─── Détection d'anomalies ────────────────────────────────────────────────

    private List<String> detectAnomalies(RateVariance rate, SettlementGap gap,
                                          SettlementStatus status, String fxType) {
        List<String> a = new ArrayList<>();
        if (rate != null && rate.isAnomaly())
            a.add("TAUX_SUSPECT : Variance de " + rate.variancePct() + "% > seuil 1%");
        if (status.isSlaBreached())
            a.add("SLA_BREACH : Settlement en retard (ISS:" + status.issDelayDays()
                + "j / ACQ:" + status.acqDelayDays() + "j)");
        if (gap != null && !gap.sameCurrency() && gap.issAmount().compareTo(BigDecimal.ZERO) > 0)
            a.add("DEVISE_MIXTE : Currencies ISS/ACQ différentes - Réconciliation complexe");
        if ("MULTI_FX_COMPLEX".equals(fxType))
            a.add("FX_COMPLEXE : Transaction traverse 3 devises distinctes");
        return a;
    }

    // ─── Recommandations ─────────────────────────────────────────────────────

    private List<String> buildRecommendations(List<String> anomalies, RateVariance rate,
                                               SettlementGap gap, SettlementStatus status) {
        List<String> recs = new ArrayList<>();
        if (anomalies.isEmpty()) {
            recs.add("Aucune anomalie de change détectée - Transaction conforme");
            return recs;
        }
        if (rate != null && rate.isAnomaly())
            recs.add("Vérifier le taux de change appliqué vs. taux de marché à la date de transaction");
        if (status.isSlaBreached())
            recs.add("Déclencher le processus de réconciliation manuelle - SLA J+1 dépassé");
        if (gap != null && !gap.sameCurrency())
            recs.add("Aligner les devises ISS/ACQ ou utiliser un taux croisé pour la réconciliation");
        return recs;
    }
}
