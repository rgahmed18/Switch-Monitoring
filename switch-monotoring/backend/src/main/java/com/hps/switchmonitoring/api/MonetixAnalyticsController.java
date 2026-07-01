package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.domain.AutohoActivityAdmEntity;
import com.hps.switchmonitoring.repository.AutohoActivityAdmRepository;
import com.hps.switchmonitoring.service.currency.CurrencyIntelligenceService;
import com.hps.switchmonitoring.service.emv.ChipAnalysisService;
import com.hps.switchmonitoring.service.iso.ActionCodeDecoder;
import com.hps.switchmonitoring.service.iso.Iso8583Decoder;
import com.hps.switchmonitoring.service.time.TransactionTimeService;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import java.util.NoSuchElementException;

/**
 * Contrôleur d'intelligence analytique monétique.
 *
 * Expose les analyses avancées sur AUTHO_ACTIVITY_ADM :
 *   - Diagnostic EMV/Chip complet (TVR, AIP, CVM, ATC, ARPC)
 *   - Analyse temporelle multinationale (timezone, latence, drift)
 *   - Réconciliation multi-devise (FX, settlement ISS/ACQ, écarts)
 *   - Décodage ISO 8583 (MTI, action code, processing code)
 *   - Dashboard de synthèse analytique
 */
@RestController
@RequestMapping("/api/v1/analytics")
public class MonetixAnalyticsController {

    private final AutohoActivityAdmRepository  repository;
    private final ChipAnalysisService          chipService;
    private final TransactionTimeService       timeService;
    private final CurrencyIntelligenceService  currencyService;

    public MonetixAnalyticsController(
            AutohoActivityAdmRepository repository,
            ChipAnalysisService chipService,
            TransactionTimeService timeService,
            CurrencyIntelligenceService currencyService) {
        this.repository      = repository;
        this.chipService     = chipService;
        this.timeService     = timeService;
        this.currencyService = currencyService;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ANALYSE EMV / CHIP
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * GET /api/v1/analytics/chip/{transactionId}
     * Diagnostic EMV complet : TVR, AIP, CVM, ATC, ARPC, CVV
     */
    @GetMapping("/chip/{transactionId}")
    public ResponseEntity<ChipAnalysisService.ChipDiagnostic> getChipAnalysis(
            @PathVariable String transactionId) {
        AutohoActivityAdmEntity entity = findByTransactionId(transactionId);
        return ResponseEntity.ok(chipService.analyze(entity));
    }

    /**
     * GET /api/v1/analytics/chip/batch/high-risk?page=0&size=20
     * Transactions chip à risque élevé (TVR non clean)
     */
    @GetMapping("/chip/batch/high-risk")
    public ResponseEntity<List<Map<String, Object>>> getHighRiskChipTransactions(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        List<AutohoActivityAdmEntity> entities =
            repository.findChipTransactions(PageRequest.of(page, size)).getContent();

        List<Map<String, Object>> result = entities.stream()
            .map(e -> {
                ChipAnalysisService.ChipDiagnostic diag = chipService.analyze(e);
                if ("CLEAN".equals(diag.overallRisk())) return null;
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("transactionId",  e.getTransactionId());
                m.put("referenceNumber", e.getReferenceNumber());
                m.put("businessDate",   e.getBusinessDate());
                m.put("cardNumberMasked", maskPan(e.getCardNumber()));
                m.put("transactionAmount", e.getTransactionAmount());
                m.put("transactionCurrency", e.getTransactionCurrency());
                m.put("overallRisk",    diag.overallRisk());
                m.put("tvrRiskScore",   diag.tvr().riskScore());
                m.put("tvrRiskLevel",   diag.tvr().riskLevel());
                m.put("activeFlags",    diag.tvr().activeFlags());
                m.put("criticalFlags",  diag.tvr().criticalFlags());
                m.put("recommendations", diag.recommendations());
                return m;
            })
            .filter(Objects::nonNull)
            .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ANALYSE TEMPORELLE
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * GET /api/v1/analytics/time/{transactionId}
     * Analyse temporelle : timezone, latence, drift local vs. central
     */
    @GetMapping("/time/{transactionId}")
    public ResponseEntity<TransactionTimeService.TimeAnalysis> getTimeAnalysis(
            @PathVariable String transactionId) {
        AutohoActivityAdmEntity entity = findByTransactionId(transactionId);
        return ResponseEntity.ok(timeService.analyze(entity));
    }

    /**
     * GET /api/v1/analytics/time/timezone/{countryCode}
     * Résoudre la timezone pour un code pays ISO 3166 numérique
     */
    @GetMapping("/time/timezone/{countryCode}")
    public ResponseEntity<Map<String, String>> getTimezone(@PathVariable String countryCode) {
        return ResponseEntity.ok(Map.of(
            "countryCode", countryCode,
            "timezone",    timeService.resolveTimezone(countryCode)
        ));
    }

    /**
     * GET /api/v1/analytics/time/sla-breaches?businessDate=2026-04-22
     * Transactions avec SLA de traitement dépassé (> 5s)
     */
    @GetMapping("/time/sla-breaches")
    public ResponseEntity<List<Map<String, Object>>> getSlaBreaches(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate,
            @RequestParam(defaultValue = "50") int size) {

        List<AutohoActivityAdmEntity> entities =
            repository.findByBusinessDate(businessDate, PageRequest.of(0, size)).getContent();

        List<Map<String, Object>> breaches = entities.stream()
            .map(e -> {
                TransactionTimeService.TimeAnalysis ta = timeService.analyze(e);
                if (!ta.isSlaBreached()) return null;
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("transactionId",    e.getTransactionId());
                m.put("referenceNumber",  e.getReferenceNumber());
                m.put("processingTimeMs", ta.processingTimeMs());
                m.put("processingLabel",  ta.processingTimeLabel());
                m.put("timingAnomaly",    ta.timingAnomaly());
                m.put("slaStatus",        ta.slaStatus());
                m.put("localTimezone",    ta.localTimezone());
                m.put("transmissionUtc",  ta.transmissionUtcFormatted());
                m.put("responseTime",     ta.responseTimeFormatted());
                return m;
            })
            .filter(Objects::nonNull)
            .collect(Collectors.toList());

        return ResponseEntity.ok(breaches);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ANALYSE MULTI-DEVISE
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * GET /api/v1/analytics/currency/{transactionId}
     * Analyse complète des 3 couches de devises
     */
    @GetMapping("/currency/{transactionId}")
    public ResponseEntity<CurrencyIntelligenceService.CurrencyAnalysis> getCurrencyAnalysis(
            @PathVariable String transactionId) {
        AutohoActivityAdmEntity entity = findByTransactionId(transactionId);
        return ResponseEntity.ok(currencyService.analyze(entity));
    }

    /**
     * GET /api/v1/analytics/currency/settlement-pending?businessDate=2026-04-22
     * Transactions approuvées avec settlement en attente
     */
    @GetMapping("/currency/settlement-pending")
    public ResponseEntity<List<Map<String, Object>>> getPendingSettlements(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate) {

        List<AutohoActivityAdmEntity> entities =
            repository.findUnsettledApprovedByBusinessDate(businessDate);

        List<Map<String, Object>> result = entities.stream().map(e -> {
            CurrencyIntelligenceService.CurrencyAnalysis ca = currencyService.analyze(e);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("transactionId",      e.getTransactionId());
            m.put("referenceNumber",    e.getReferenceNumber());
            m.put("businessDate",       e.getBusinessDate());
            m.put("transactionAmount",  e.getTransactionAmount());
            m.put("transactionCurrency", e.getTransactionCurrency());
            m.put("billingAmount",      e.getBillingAmount());
            m.put("billingCurrency",    e.getBillingCurrency());
            m.put("fxType",             ca.fxType());
            m.put("settlementStatus",   ca.settlementStatus().status());
            m.put("issDelayDays",       ca.settlementStatus().issDelayDays());
            m.put("acqDelayDays",       ca.settlementStatus().acqDelayDays());
            m.put("slaBreached",        ca.settlementStatus().isSlaBreached());
            m.put("anomalies",          ca.anomalies());
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/v1/analytics/currency/fx-anomalies?days=7
     * Transactions avec variance de taux de change > 1%
     */
    @GetMapping("/currency/fx-anomalies")
    public ResponseEntity<List<Map<String, Object>>> getFxAnomalies(
            @RequestParam(defaultValue = "7") int days) {

        LocalDate from = LocalDate.now().minusDays(days);
        List<AutohoActivityAdmEntity> entities =
            repository.findCrossCurrencyApproved(from, PageRequest.of(0, 100)).getContent();

        List<Map<String, Object>> anomalies = entities.stream()
            .map(e -> {
                CurrencyIntelligenceService.CurrencyAnalysis ca = currencyService.analyze(e);
                if (ca.rateVariance() == null || !ca.rateVariance().isAnomaly()) return null;
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("transactionId",    e.getTransactionId());
                m.put("referenceNumber",  e.getReferenceNumber());
                m.put("businessDate",     e.getBusinessDate());
                m.put("txAmount",         e.getTransactionAmount());
                m.put("txCurrency",       e.getTransactionCurrency());
                m.put("billingAmount",    e.getBillingAmount());
                m.put("billingCurrency",  e.getBillingCurrency());
                m.put("appliedRate",      ca.rateVariance().appliedRate());
                m.put("computedRate",     ca.rateVariance().computedRate());
                m.put("variancePct",      ca.rateVariance().variancePct());
                m.put("assessment",       ca.rateVariance().assessment());
                return m;
            })
            .filter(Objects::nonNull)
            .collect(Collectors.toList());

        return ResponseEntity.ok(anomalies);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DÉCODAGE ISO 8583
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * GET /api/v1/analytics/iso/action-code/{code}
     * Décoder un action_code ISO 8583
     */
    @GetMapping("/iso/action-code/{code}")
    public ResponseEntity<ActionCodeDecoder.ActionDecoded> decodeActionCode(
            @PathVariable String code) {
        return ResponseEntity.ok(ActionCodeDecoder.decode(code));
    }

    /**
     * GET /api/v1/analytics/iso/mti/{mti}
     * Décoder un MTI (message_type)
     */
    @GetMapping("/iso/mti/{mti}")
    public ResponseEntity<Iso8583Decoder.MtiDecoded> decodeMti(@PathVariable String mti) {
        return ResponseEntity.ok(Iso8583Decoder.decodeMti(mti));
    }

    /**
     * GET /api/v1/analytics/iso/transaction/{transactionId}
     * Décodage ISO 8583 complet d'une transaction
     */
    @GetMapping("/iso/transaction/{transactionId}")
    public ResponseEntity<Map<String, Object>> decodeTransaction(
            @PathVariable String transactionId) {
        AutohoActivityAdmEntity e = findByTransactionId(transactionId);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("transactionId",   e.getTransactionId());
        result.put("referenceNumber", e.getReferenceNumber());
        result.put("mti",   Iso8583Decoder.decodeMti(e.getMessageType()));
        result.put("actionCode",      ActionCodeDecoder.decode(e.getActionCode()));
        result.put("issuerActionCode", ActionCodeDecoder.decode(e.getIssuerActionCode()));
        result.put("processingCode",  Iso8583Decoder.decodeProcessingCode(
            e.getProcessingCode(), e.getSourceAccountCode(), e.getDestinationAccountCode()));
        result.put("functionCode",    Iso8583Decoder.decodeFunctionCode(e.getFunctionCode()));
        result.put("isFraudSuspect",  ActionCodeDecoder.isFraudSuspect(e.getActionCode()));
        result.put("isSystemError",   ActionCodeDecoder.isSystemError(e.getActionCode()));
        return ResponseEntity.ok(result);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DASHBOARD SYNTHÈSE ANALYTIQUE
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * GET /api/v1/analytics/dashboard?businessDate=2026-04-22
     * KPIs analytiques pour la page MonetixAnalytics
     */
    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate) {

        LocalDate date = businessDate != null ? businessDate : LocalDate.now();

        long total        = repository.countByBusinessDate(date);
        long chipCount    = repository.countChipTransactionsByDate(date);
        long fraudCodes   = repository.countFraudActionCodesByDate(date);
        long slaBreaches  = repository.countSlaBreachesByDate(date);
        long pendingSettl = repository.countPendingSettlementByDate(date);
        long crossCurr    = repository.countCrossCurrencyByDate(date);

        Map<String, Object> dashboard = new LinkedHashMap<>();
        dashboard.put("businessDate",          date);
        dashboard.put("totalTransactions",     total);
        dashboard.put("chipEmvTransactions",   chipCount);
        dashboard.put("chipEmvPct",            total > 0 ? round(chipCount * 100.0 / total, 1) : 0);
        dashboard.put("fraudCodeTransactions", fraudCodes);
        dashboard.put("slaBreaches",           slaBreaches);
        dashboard.put("pendingSettlement",     pendingSettl);
        dashboard.put("crossCurrencyTx",       crossCurr);
        dashboard.put("crossCurrencyPct",      total > 0 ? round(crossCurr * 100.0 / total, 1) : 0);

        // Répartition action codes frauduleux
        dashboard.put("actionCodeDistribution",
            repository.countByActionCodeGroup(date));

        return ResponseEntity.ok(dashboard);
    }

    /**
     * GET /api/v1/analytics/transaction/{transactionId}/full
     * Analyse complète d'une transaction (EMV + Time + Currency + ISO)
     */
    @GetMapping("/transaction/{transactionId}/full")
    public ResponseEntity<Map<String, Object>> getFullAnalysis(
            @PathVariable String transactionId) {

        AutohoActivityAdmEntity e = findByTransactionId(transactionId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("transactionId",   e.getTransactionId());
        result.put("referenceNumber", e.getReferenceNumber());
        result.put("internalStan",    e.getInternalStan());
        result.put("businessDate",    e.getBusinessDate());
        result.put("cardNumberMasked", maskPan(e.getCardNumber()));

        result.put("iso8583", Map.of(
            "mti",            Iso8583Decoder.decodeMti(e.getMessageType()),
            "actionCode",     ActionCodeDecoder.decode(e.getActionCode()),
            "issuerAction",   ActionCodeDecoder.decode(e.getIssuerActionCode()),
            "processingCode", Iso8583Decoder.decodeProcessingCode(
                e.getProcessingCode(), e.getSourceAccountCode(), e.getDestinationAccountCode()),
            "functionCode",   Iso8583Decoder.decodeFunctionCode(e.getFunctionCode())
        ));

        result.put("chipDiagnostic",  chipService.analyze(e));
        result.put("timeAnalysis",    timeService.analyze(e));
        result.put("currencyAnalysis", currencyService.analyze(e));

        return ResponseEntity.ok(result);
    }

    // ─── Helpers privés ───────────────────────────────────────────────────────

    private AutohoActivityAdmEntity findByTransactionId(String id) {
        return repository.findByTransactionId(id)
            .orElseThrow(() -> new NoSuchElementException("Transaction introuvable : " + id));
    }

    private String maskPan(String pan) {
        if (pan == null || pan.length() < 4) return "****";
        return "**** **** **** " + pan.substring(pan.length() - 4);
    }

    private double round(double val, int decimals) {
        double factor = Math.pow(10, decimals);
        return Math.round(val * factor) / factor;
    }
}
