package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.domain.AutohoActivityAdmEntity;
import com.hps.switchmonitoring.repository.AutohoActivityAdmRepository;
import com.hps.switchmonitoring.service.currency.CurrencyIntelligenceService;
import com.hps.switchmonitoring.service.emv.ChipAnalysisService;
import com.hps.switchmonitoring.service.iso.ActionCodeDecoder;
import com.hps.switchmonitoring.service.iso.Iso8583Decoder;
import com.hps.switchmonitoring.service.time.TransactionTimeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Analytique Monetique", description = "Diagnostic EMV, analyse temporelle, reconciliation multi-devise et decodage ISO 8583 avances")
@SecurityRequirements // lecture ouverte a tout utilisateur authentifie cote frontend
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

    @Operation(
        summary = "Diagnostic EMV complet d'une transaction",
        description = """
            Decode et analyse les donnees EMV (puce) d'une transaction : TVR (Terminal Verification Results), \
            AIP (Application Interchange Profile), methode CVM (Cardholder Verification Method), compteur ATC \
            (Application Transaction Counter), cryptogramme ARPC et resultat CVV. Retourne un niveau de risque \
            global (`overallRisk`) et des recommandations.""")
    @ApiResponse(responseCode = "200", description = "Diagnostic EMV de la transaction.")
    @ApiResponse(responseCode = "404", description = "Transaction introuvable pour cet identifiant.")
    @GetMapping("/chip/{transactionId}")
    public ResponseEntity<ChipAnalysisService.ChipDiagnostic> getChipAnalysis(
            @Parameter(description = "Identifiant technique de la transaction", example = "TXN20260715112233")
            @PathVariable String transactionId) {
        AutohoActivityAdmEntity entity = findByTransactionId(transactionId);
        return ResponseEntity.ok(chipService.analyze(entity));
    }

    @Operation(
        summary = "Lister les transactions puce a risque eleve (lot pagine)",
        description = """
            Parcourt les transactions EMV (paginees) et ne retourne que celles dont le diagnostic TVR \
            n'est pas `CLEAN` (au moins un indicateur de risque actif). Utile pour une revue de securite \
            ciblee sans avoir a diagnostiquer transaction par transaction.""")
    @ApiResponse(responseCode = "200", description = "Transactions a risque (peut etre vide si aucune anomalie sur la page demandee).",
        content = @Content(examples = @ExampleObject(value = """
            [{
              "transactionId": "TXN20260715112233", "referenceNumber": "251960123456",
              "businessDate": "2026-07-15", "cardNumberMasked": "**** **** **** 1234",
              "transactionAmount": 1250.00, "transactionCurrency": "MAD",
              "overallRisk": "HIGH", "tvrRiskScore": 78, "tvrRiskLevel": "ELEVE",
              "activeFlags": ["OFFLINE_PIN_FAILED"], "criticalFlags": ["CARD_NOT_SUPPORTED"],
              "recommendations": ["Verifier le terminal", "Contacter le porteur"]
            }]""")))
    @GetMapping("/chip/batch/high-risk")
    public ResponseEntity<List<Map<String, Object>>> getHighRiskChipTransactions(
            @Parameter(description = "Numero de page (0-index)", example = "0")
            @RequestParam(defaultValue = "0")  int page,
            @Parameter(description = "Taille de la page", example = "20")
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

    @Operation(
        summary = "Analyse temporelle d'une transaction",
        description = """
            Calcule le temps de traitement (transmission -> reponse), detecte un eventuel decalage \
            (drift) entre l'heure locale du terminal et l'heure centrale du switch, et resout le fuseau \
            horaire local a partir du code pays. Indique si le SLA de traitement (5 secondes) est respecte.""")
    @ApiResponse(responseCode = "200", description = "Analyse temporelle de la transaction.")
    @ApiResponse(responseCode = "404", description = "Transaction introuvable pour cet identifiant.")
    @GetMapping("/time/{transactionId}")
    public ResponseEntity<TransactionTimeService.TimeAnalysis> getTimeAnalysis(
            @Parameter(description = "Identifiant technique de la transaction", example = "TXN20260715112233")
            @PathVariable String transactionId) {
        AutohoActivityAdmEntity entity = findByTransactionId(transactionId);
        return ResponseEntity.ok(timeService.analyze(entity));
    }

    @Operation(summary = "Resoudre le fuseau horaire d'un code pays",
        description = "Convertit un code pays ISO 3166 numerique (DE 19) en identifiant de fuseau horaire IANA (ex: `504` -> `Africa/Casablanca`).")
    @ApiResponse(responseCode = "200", description = "Fuseau horaire resolu.",
        content = @Content(examples = @ExampleObject(value = "{\"countryCode\": \"504\", \"timezone\": \"Africa/Casablanca\"}")))
    @GetMapping("/time/timezone/{countryCode}")
    public ResponseEntity<Map<String, String>> getTimezone(
            @Parameter(description = "Code pays ISO 3166 numerique", example = "504") @PathVariable String countryCode) {
        return ResponseEntity.ok(Map.of(
            "countryCode", countryCode,
            "timezone",    timeService.resolveTimezone(countryCode)
        ));
    }

    @Operation(
        summary = "Lister les transactions ayant depasse le SLA de traitement",
        description = "Retourne, pour une date metier donnee, les transactions dont le temps de traitement depasse le seuil SLA (5 secondes).")
    @ApiResponse(responseCode = "200", description = "Transactions en depassement SLA (peut etre vide).",
        content = @Content(examples = @ExampleObject(value = """
            [{
              "transactionId": "TXN20260715112233", "referenceNumber": "251960123456",
              "processingTimeMs": 7350, "processingLabel": "Lent", "timingAnomaly": "DRIFT_DETECTED",
              "slaStatus": "BREACHED", "localTimezone": "Africa/Casablanca",
              "transmissionUtc": "2026-07-15T10:22:33Z", "responseTime": "2026-07-15T10:22:40Z"
            }]""")))
    @GetMapping("/time/sla-breaches")
    public ResponseEntity<List<Map<String, Object>>> getSlaBreaches(
            @Parameter(description = "Date metier", example = "2026-07-15")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate,
            @Parameter(description = "Nombre maximum de transactions a analyser", example = "50")
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

    @Operation(
        summary = "Analyse multi-devise complete d'une transaction",
        description = """
            Analyse les 3 couches de devises d'une transaction ISO 8583 (devise de transaction, devise de \
            facturation issuer, devise de facturation acquirer), calcule le type de change (FX) applique, \
            l'ecart entre taux applique et taux du marche, et le statut de reglement (settlement) cote \
            emetteur/acquereur.""")
    @ApiResponse(responseCode = "200", description = "Analyse multi-devise de la transaction.")
    @ApiResponse(responseCode = "404", description = "Transaction introuvable pour cet identifiant.")
    @GetMapping("/currency/{transactionId}")
    public ResponseEntity<CurrencyIntelligenceService.CurrencyAnalysis> getCurrencyAnalysis(
            @Parameter(description = "Identifiant technique de la transaction", example = "TXN20260715112233")
            @PathVariable String transactionId) {
        AutohoActivityAdmEntity entity = findByTransactionId(transactionId);
        return ResponseEntity.ok(currencyService.analyze(entity));
    }

    @Operation(
        summary = "Lister les transactions approuvees en attente de reglement (settlement)",
        description = "Retourne, pour une date metier donnee, les transactions approuvees dont le reglement (settlement) issuer et/ou acquirer n'est pas encore finalise.")
    @ApiResponse(responseCode = "200", description = "Transactions en attente de reglement.",
        content = @Content(examples = @ExampleObject(value = """
            [{
              "transactionId": "TXN20260715112233", "referenceNumber": "251960123456",
              "businessDate": "2026-07-15", "transactionAmount": 1250.00, "transactionCurrency": "MAD",
              "billingAmount": 1250.00, "billingCurrency": "MAD", "fxType": "NO_CONVERSION",
              "settlementStatus": "PENDING", "issDelayDays": 2, "acqDelayDays": 1,
              "slaBreached": false, "anomalies": []
            }]""")))
    @GetMapping("/currency/settlement-pending")
    public ResponseEntity<List<Map<String, Object>>> getPendingSettlements(
            @Parameter(description = "Date metier", example = "2026-07-15")
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

    @Operation(
        summary = "Lister les anomalies de taux de change (FX)",
        description = "Retourne, sur les `days` derniers jours, les transactions multi-devises dont l'ecart entre le taux applique et le taux de marche calcule depasse le seuil d'anomalie (> 1%).")
    @ApiResponse(responseCode = "200", description = "Transactions avec anomalie de taux de change (peut etre vide).",
        content = @Content(examples = @ExampleObject(value = """
            [{
              "transactionId": "TXN20260715112233", "referenceNumber": "251960123456",
              "businessDate": "2026-07-15", "txAmount": 100.00, "txCurrency": "EUR",
              "billingAmount": 1082.50, "billingCurrency": "MAD",
              "appliedRate": 10.825, "computedRate": 10.60, "variancePct": 2.1,
              "assessment": "Ecart superieur au seuil tolere"
            }]""")))
    @GetMapping("/currency/fx-anomalies")
    public ResponseEntity<List<Map<String, Object>>> getFxAnomalies(
            @Parameter(description = "Fenetre d'analyse en nombre de jours precedant aujourd'hui", example = "7")
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

    @Operation(summary = "Decoder un action code ISO 8583",
        description = "Traduit un action code brut (issu du switch PowerCARD) en libelle metier, et indique s'il s'agit d'un code suspect de fraude ou d'erreur systeme.")
    @ApiResponse(responseCode = "200", description = "Action code decode.")
    @GetMapping("/iso/action-code/{code}")
    public ResponseEntity<ActionCodeDecoder.ActionDecoded> decodeActionCode(
            @Parameter(description = "Action code brut", example = "00") @PathVariable String code) {
        return ResponseEntity.ok(ActionCodeDecoder.decode(code));
    }

    @Operation(summary = "Decoder un MTI (Message Type Indicator) ISO 8583",
        description = "Traduit un MTI a 4 chiffres (ex: `0200`) en classe de message (demande/reponse), origine et fonction (autorisation, financiere, reversal, notification...).")
    @ApiResponse(responseCode = "200", description = "MTI decode.")
    @GetMapping("/iso/mti/{mti}")
    public ResponseEntity<Iso8583Decoder.MtiDecoded> decodeMti(
            @Parameter(description = "MTI ISO 8583 a 4 chiffres", example = "0200") @PathVariable String mti) {
        return ResponseEntity.ok(Iso8583Decoder.decodeMti(mti));
    }

    @Operation(
        summary = "Decodage ISO 8583 complet d'une transaction",
        description = """
            Decode l'ensemble des champs ISO 8583 d'une transaction existante : MTI, action code, action code \
            emetteur, processing code (DE 3, avec comptes source/destination) et function code. Signale \
            egalement si la transaction est suspecte de fraude ou correspond a une erreur systeme.""")
    @ApiResponse(responseCode = "200", description = "Decodage ISO 8583 complet.",
        content = @Content(examples = @ExampleObject(value = """
            {
              "transactionId": "TXN20260715112233", "referenceNumber": "251960123456",
              "mti": {"code": "0200", "class": "Demande financiere", "origin": "Acquereur"},
              "actionCode": {"code": "00", "label": "Approuvee"},
              "issuerActionCode": {"code": "00", "label": "Approuvee"},
              "processingCode": {"transactionType": "Achat", "sourceAccount": "Courant", "destinationAccount": "N/A"},
              "functionCode": "100 - Demande d'autorisation",
              "isFraudSuspect": false, "isSystemError": false
            }""")))
    @ApiResponse(responseCode = "404", description = "Transaction introuvable pour cet identifiant.")
    @GetMapping("/iso/transaction/{transactionId}")
    public ResponseEntity<Map<String, Object>> decodeTransaction(
            @Parameter(description = "Identifiant technique de la transaction", example = "TXN20260715112233")
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

    @Operation(
        summary = "KPIs analytiques de synthese (page Analytique Monetique)",
        description = """
            Agrege, pour une date metier donnee (ou le jour courant si omise), les indicateurs cles de la page \
            d'analytique avancee : volume total, part de transactions puce EMV, transactions suspectes de \
            fraude, depassements de SLA, reglements en attente et transactions multi-devises.""")
    @ApiResponse(responseCode = "200", description = "Tableau de bord analytique.",
        content = @Content(examples = @ExampleObject(value = """
            {
              "businessDate": "2026-07-15", "totalTransactions": 1873, "chipEmvTransactions": 1420,
              "chipEmvPct": 75.8, "fraudCodeTransactions": 3, "slaBreaches": 12,
              "pendingSettlement": 47, "crossCurrencyTx": 210, "crossCurrencyPct": 11.2,
              "actionCodeDistribution": {"00": 1760, "05": 94, "51": 19}
            }""")))
    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard(
            @Parameter(description = "Date metier (par defaut : aujourd'hui)", example = "2026-07-15")
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

    @Operation(
        summary = "Analyse 360 degres d'une transaction (EMV + Temporel + Devise + ISO)",
        description = """
            Endpoint agregateur combinant en une seule reponse le decodage ISO 8583, le diagnostic EMV/puce, \
            l'analyse temporelle et l'analyse multi-devise d'une transaction. Utilise par la vue "Detail \
            transaction" du frontend pour eviter 4 appels reseau separes.""")
    @ApiResponse(responseCode = "200", description = "Analyse complete de la transaction.")
    @ApiResponse(responseCode = "404", description = "Transaction introuvable pour cet identifiant.")
    @GetMapping("/transaction/{transactionId}/full")
    public ResponseEntity<Map<String, Object>> getFullAnalysis(
            @Parameter(description = "Identifiant technique de la transaction", example = "TXN20260715112233")
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
