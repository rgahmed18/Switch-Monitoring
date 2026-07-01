package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.api.dto.AutohoActivityAdmDto;
import com.hps.switchmonitoring.api.dto.CreateAuthoActivityAdmRequest;
import com.hps.switchmonitoring.service.AutohoActivityAdmService;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * API REST pour les transactions AUTHO_ACTIVITY_ADM
 * Endpoints pour rechercher, créer et analyser les transactions
 */
@RestController
@RequestMapping("/api/v1/autho-activity")
public class AutohoActivityAdmController {

  private final AutohoActivityAdmService service;

  public AutohoActivityAdmController(AutohoActivityAdmService service) {
    this.service = service;
  }

  // ========== END-POINTS SIMPLES PAR ID ==========

  /**
   * GET /api/v1/autho-activity/detail/{referenceNumber}/{internalStan}
   * Récupérer le détail complet d'une transaction par clé primaire composite
   */
  @GetMapping("/detail/{referenceNumber}/{internalStan}")
  public ResponseEntity<AutohoActivityAdmDto> getTransactionDetail(
      @PathVariable String referenceNumber,
      @PathVariable String internalStan) {
    return ResponseEntity.ok(service.getTransactionDetail(referenceNumber, internalStan));
  }

  /**
   * GET /api/v1/autho-activity/transaction/{transactionId}
   * Rechercher une transaction par son ID
   */
  @GetMapping("/transaction/{transactionId}")
  public ResponseEntity<AutohoActivityAdmDto> getByTransactionId(
      @PathVariable String transactionId) {
    return ResponseEntity.ok(service.getByTransactionId(transactionId));
  }

  /**
   * GET /api/v1/autho-activity/authorization/{authorizationId}
   * Rechercher une autorisation par son ID
   */
  @GetMapping("/authorization/{authorizationId}")
  public ResponseEntity<AutohoActivityAdmDto> getByAuthorizationId(
      @PathVariable String authorizationId) {
    return ResponseEntity.ok(service.getByAuthorizationId(authorizationId));
  }

  /**
   * GET /api/v1/autho-activity/cps/{cpsTransactionId}
   * Rechercher une transaction CPS par son ID
   */
  @GetMapping("/cps/{cpsTransactionId}")
  public ResponseEntity<AutohoActivityAdmDto> getByCpsTransactionId(
      @PathVariable String cpsTransactionId) {
    return ResponseEntity.ok(service.getByCpsTransactionId(cpsTransactionId));
  }

  // ========== END-POINTS PAR CARTE ==========

  /**
   * GET /api/v1/autho-activity/card/{cardNumber}
   * Rechercher les transactions d'une carte
   */
  @GetMapping("/card/{cardNumber}")
  public ResponseEntity<Page<AutohoActivityAdmDto>> getCardTransactions(
      @PathVariable String cardNumber,
      Pageable pageable) {
    return ResponseEntity.ok(service.getCardTransactions(cardNumber, pageable));
  }

  /**
   * GET /api/v1/autho-activity/card/{cardNumber}/range
   * Rechercher les transactions d'une carte pour une plage de dates
   */
  @GetMapping("/card/{cardNumber}/range")
  public ResponseEntity<?> getCardTransactionsByDateRange(
      @PathVariable String cardNumber,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
    return ResponseEntity.ok(service.getCardTransactionsByDateRange(cardNumber, startDate, endDate));
  }

  // ========== END-POINTS PAR ACCEPTEUR ==========

  /**
   * GET /api/v1/autho-activity/acceptor/{acceptorId}
   * Rechercher les transactions d'un accepteur (merchant/terminal)
   */
  @GetMapping("/acceptor/{acceptorId}")
  public ResponseEntity<Page<AutohoActivityAdmDto>> getAcceptorTransactions(
      @PathVariable String acceptorId,
      Pageable pageable) {
    return ResponseEntity.ok(service.getAcceptorTransactions(acceptorId, pageable));
  }

  /**
   * GET /api/v1/autho-activity/acceptor/{acceptorId}/date/{businessDate}
   * Rechercher les transactions d'un accepteur pour une date
   */
  @GetMapping("/acceptor/{acceptorId}/date/{businessDate}")
  public ResponseEntity<?> getAcceptorTransactionsByDate(
      @PathVariable String acceptorId,
      @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate) {
    return ResponseEntity.ok(service.getAcceptorTransactionsByDate(acceptorId, businessDate));
  }

  // ========== END-POINTS PAR DATES ==========

  /**
   * GET /api/v1/autho-activity/latest
   * Récupérer les N dernières transactions.
   * Si issuing_bank est fourni, filtre par banque émettrice ou acquéreuse.
   * Utilisé par le frontend pour la vue utilisateur (projet sélectionné).
   */
  @GetMapping("/latest")
  public ResponseEntity<?> getLatestTransactions(
      @RequestParam(defaultValue = "2000") int limit,
      @RequestParam(name = "issuing_bank", required = false) String issuingBank) {
    if (issuingBank != null && !issuingBank.isBlank()) {
      return ResponseEntity.ok(service.getLatestTransactionsByBank(limit, issuingBank));
    }
    return ResponseEntity.ok(service.getLatestTransactions(limit));
  }

  /**
   * GET /api/v1/autho-activity/business-date/{businessDate}
   * Récupérer les transactions d'une date métier
   */
  @GetMapping("/business-date/{businessDate}")
  public ResponseEntity<Page<AutohoActivityAdmDto>> getByBusinessDate(
      @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate,
      Pageable pageable) {
    return ResponseEntity.ok(service.getTransactionsByBusinessDate(businessDate, pageable));
  }

  /**
   * GET /api/v1/autho-activity/date-range
   * Récupérer les transactions entre deux dates
   */
  @GetMapping("/date-range")
  public ResponseEntity<Page<AutohoActivityAdmDto>> getByDateRange(
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
      Pageable pageable) {
    return ResponseEntity.ok(service.getTransactionsByDateRange(startDate, endDate, pageable));
  }

  // ========== END-POINTS PAR STATUS ==========

  /**
   * GET /api/v1/autho-activity/declined
   * Récupérer les transactions refusées
   */
  @GetMapping("/declined")
  public ResponseEntity<Page<AutohoActivityAdmDto>> getDeclinedTransactions(Pageable pageable) {
    return ResponseEntity.ok(service.getDeclinedTransactions(pageable));
  }

  /**
   * GET /api/v1/autho-activity/declined/date-range
   * Récupérer les transactions refusées entre deux dates
   */
  @GetMapping("/declined/date-range")
  public ResponseEntity<?> getDeclinedTransactionsByDateRange(
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
    return ResponseEntity.ok(service.getDeclinedTransactionsByDateRange(startDate, endDate));
  }

  /**
   * GET /api/v1/autho-activity/reject-code/{rejectCode}
   * Récupérer les transactions avec un code de rejet spécifique
   */
  @GetMapping("/reject-code/{rejectCode}")
  public ResponseEntity<Page<AutohoActivityAdmDto>> getByRejectCode(
      @PathVariable String rejectCode,
      Pageable pageable) {
    return ResponseEntity.ok(service.getByRejectCode(rejectCode, pageable));
  }

  /**
   * GET /api/v1/autho-activity/reversals
   * Récupérer les transactions reversées (annulations)
   */
  @GetMapping("/reversals")
  public ResponseEntity<Page<AutohoActivityAdmDto>> getReversals(Pageable pageable) {
    return ResponseEntity.ok(service.getReversals(pageable));
  }

  // ========== END-POINTS PAR MONTANT ==========

  /**
   * GET /api/v1/autho-activity/high-value
   * Récupérer les transactions de montant élevé
   */
  @GetMapping("/high-value")
  public ResponseEntity<Page<AutohoActivityAdmDto>> getHighValueTransactions(
      @RequestParam(defaultValue = "5000") BigDecimal minAmount,
      Pageable pageable) {
    return ResponseEntity.ok(service.getHighValueTransactions(minAmount, pageable));
  }

  /**
   * GET /api/v1/autho-activity/amount-range
   * Récupérer les transactions dans une plage de montants
   */
  @GetMapping("/amount-range")
  public ResponseEntity<Page<AutohoActivityAdmDto>> getByAmountRange(
      @RequestParam BigDecimal minAmount,
      @RequestParam BigDecimal maxAmount,
      Pageable pageable) {
    return ResponseEntity.ok(service.getTransactionsByAmountRange(minAmount, maxAmount, pageable));
  }

  // ========== END-POINTS PAR RÉSEAU ==========

  /**
   * GET /api/v1/autho-activity/acquirer/{acquirerBank}
   * Récupérer les transactions par acquirer/banque
   */
  @GetMapping("/acquirer/{acquirerBank}")
  public ResponseEntity<Page<AutohoActivityAdmDto>> getByAcquirerBank(
      @PathVariable String acquirerBank,
      Pageable pageable) {
    return ResponseEntity.ok(service.getByAcquirerBank(acquirerBank, pageable));
  }

  /**
   * GET /api/v1/autho-activity/network/{networkCode}
   * Récupérer les transactions par réseau (VISA, MC, etc)
   */
  @GetMapping("/network/{networkCode}")
  public ResponseEntity<Page<AutohoActivityAdmDto>> getByNetworkCode(
      @PathVariable String networkCode,
      Pageable pageable) {
    return ResponseEntity.ok(service.getByNetworkCode(networkCode, pageable));
  }

  /**
   * GET /api/v1/autho-activity/country/{countryCode}
   * Récupérer les transactions par pays
   */
  @GetMapping("/country/{countryCode}")
  public ResponseEntity<Page<AutohoActivityAdmDto>> getByCountryCode(
      @PathVariable String countryCode,
      Pageable pageable) {
    return ResponseEntity.ok(service.getByCountryCode(countryCode, pageable));
  }

  // ========== CRÉATION ==========

  /**
   * POST /api/v1/autho-activity
   * Créer une nouvelle transaction
   */
  @PostMapping
  public ResponseEntity<AutohoActivityAdmDto> createTransaction(
      @Valid @RequestBody CreateAuthoActivityAdmRequest request) {
    AutohoActivityAdmDto created = service.createTransaction(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(created);
  }

  // ========== STATISTIQUES ==========

  /**
   * GET /api/v1/autho-activity/stats/count
   * Compter les transactions d'une date
   */
  @GetMapping("/stats/count")
  public ResponseEntity<Long> countByBusinessDate(
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate) {
    return ResponseEntity.ok(service.countByBusinessDate(businessDate));
  }

  /**
   * GET /api/v1/autho-activity/stats/declined-count
   * Compter les transactions refusées d'une date
   */
  @GetMapping("/stats/declined-count")
  public ResponseEntity<Long> countDeclinedByBusinessDate(
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate) {
    return ResponseEntity.ok(service.countDeclinedByBusinessDate(businessDate));
  }

  /**
   * GET /api/v1/autho-activity/stats/sum-amount
   * Somme des montants pour une date
   */
  @GetMapping("/stats/sum-amount")
  public ResponseEntity<BigDecimal> sumAmountByBusinessDate(
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate) {
    return ResponseEntity.ok(service.sumAmountByBusinessDate(businessDate));
  }

  /**
   * GET /api/v1/autho-activity/stats/avg-amount
   * Moyenne des montants pour une date
   */
  @GetMapping("/stats/avg-amount")
  public ResponseEntity<BigDecimal> avgAmountByBusinessDate(
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate) {
    return ResponseEntity.ok(service.avgAmountByBusinessDate(businessDate));
  }

  /**
   * GET /api/v1/autho-activity/stats/approval-rate
   * Taux d'approbation pour une date
   */
  @GetMapping("/stats/approval-rate")
  public ResponseEntity<Long> getApprovalRate(
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate) {
    return ResponseEntity.ok(service.getApprovalRate(businessDate));
  }

  // ========== HEALTH CHECK ==========

  /**
   * GET /api/v1/autho-activity/health
   * Vérifier la disponibilité du service
   */
  @GetMapping("/health")
  public ResponseEntity<String> health() {
    return ResponseEntity.ok("AutohoActivityAdm Service is running");
  }
}
