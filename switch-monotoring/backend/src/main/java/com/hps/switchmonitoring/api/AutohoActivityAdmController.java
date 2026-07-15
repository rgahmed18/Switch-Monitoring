package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.api.dto.AutohoActivityAdmDto;
import com.hps.switchmonitoring.api.dto.CreateAuthoActivityAdmRequest;
import com.hps.switchmonitoring.service.AutohoActivityAdmService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Transactions", description = "Recherche, creation et statistiques des transactions ISO 8583 (table AUTHO_ACTIVITY_ADM)")
@SecurityRequirements // lecture ouverte a tout utilisateur authentifie cote frontend ; pas de restriction de role
public class AutohoActivityAdmController {

  private static final String TX_EXAMPLE = """
      {
        "referenceNumber": "251960123456",
        "internalStan": "000123",
        "transactionId": "TXN20260715112233",
        "authorizationId": "AUTH99887766",
        "businessDate": "2026-07-15",
        "transactionLocalDate": "2026-07-15T11:22:33",
        "cardNumberMasked": "450876******1234",
        "acceptorId": "MERCH00012345",
        "acquirerBank": "AWB",
        "issuingBank": "BMCE",
        "networkCode": "VISA",
        "countryCode": "504",
        "transactionAmount": 1250.00,
        "billingAmount": 1250.00,
        "billingCurrency": "MAD",
        "responseCode": "00",
        "actionCode": "APPROVED",
        "posEntryMode": "05",
        "mti": "0200"
      }""";

  private final AutohoActivityAdmService service;

  public AutohoActivityAdmController(AutohoActivityAdmService service) {
    this.service = service;
  }

  // ========== END-POINTS SIMPLES PAR ID ==========

  @Operation(
      summary = "Detail complet d'une transaction (cle composite)",
      description = "Recherche une transaction par sa cle primaire composite `(referenceNumber, internalStan)`.")
  @ApiResponse(responseCode = "200", description = "Transaction trouvee.",
      content = @Content(examples = @ExampleObject(value = TX_EXAMPLE)))
  @ApiResponse(responseCode = "404", description = "Aucune transaction ne correspond a cette cle.")
  @GetMapping("/detail/{referenceNumber}/{internalStan}")
  public ResponseEntity<AutohoActivityAdmDto> getTransactionDetail(
      @Parameter(description = "Numero de reference de la transaction", example = "251960123456")
      @PathVariable String referenceNumber,
      @Parameter(description = "STAN interne (System Trace Audit Number)", example = "000123")
      @PathVariable String internalStan) {
    return ResponseEntity.ok(service.getTransactionDetail(referenceNumber, internalStan));
  }

  @Operation(summary = "Rechercher une transaction par son identifiant technique",
      description = "Recherche par `transactionId`, identifiant technique unique genere lors de l'insertion.")
  @ApiResponse(responseCode = "200", description = "Transaction trouvee.",
      content = @Content(examples = @ExampleObject(value = TX_EXAMPLE)))
  @ApiResponse(responseCode = "404", description = "Aucune transaction ne correspond a cet identifiant.")
  @GetMapping("/transaction/{transactionId}")
  public ResponseEntity<AutohoActivityAdmDto> getByTransactionId(
      @Parameter(description = "Identifiant technique de la transaction", example = "TXN20260715112233")
      @PathVariable String transactionId) {
    return ResponseEntity.ok(service.getByTransactionId(transactionId));
  }

  @Operation(summary = "Rechercher une transaction par son identifiant d'autorisation",
      description = "Recherche par `authorizationId`, identifiant renvoye par le systeme d'autorisation ISO 8583.")
  @ApiResponse(responseCode = "200", description = "Transaction trouvee.",
      content = @Content(examples = @ExampleObject(value = TX_EXAMPLE)))
  @ApiResponse(responseCode = "404", description = "Aucune transaction ne correspond a cet identifiant.")
  @GetMapping("/authorization/{authorizationId}")
  public ResponseEntity<AutohoActivityAdmDto> getByAuthorizationId(
      @Parameter(description = "Identifiant d'autorisation", example = "AUTH99887766")
      @PathVariable String authorizationId) {
    return ResponseEntity.ok(service.getByAuthorizationId(authorizationId));
  }

  @Operation(summary = "Rechercher une transaction CPS par son identifiant",
      description = "Recherche par `cpsTransactionId` (Card Payment System), utilise pour le rapprochement inter-systemes.")
  @ApiResponse(responseCode = "200", description = "Transaction trouvee.",
      content = @Content(examples = @ExampleObject(value = TX_EXAMPLE)))
  @ApiResponse(responseCode = "404", description = "Aucune transaction ne correspond a cet identifiant.")
  @GetMapping("/cps/{cpsTransactionId}")
  public ResponseEntity<AutohoActivityAdmDto> getByCpsTransactionId(
      @Parameter(description = "Identifiant de transaction CPS", example = "CPS445566")
      @PathVariable String cpsTransactionId) {
    return ResponseEntity.ok(service.getByCpsTransactionId(cpsTransactionId));
  }

  // ========== END-POINTS PAR CARTE ==========

  @Operation(summary = "Transactions d'une carte (paginees)",
      description = "Retourne l'historique des transactions effectuees avec une carte donnee, trie par defaut du plus recent au plus ancien.")
  @ApiResponse(responseCode = "200", description = "Page de transactions de la carte.")
  @GetMapping("/card/{cardNumber}")
  public ResponseEntity<Page<AutohoActivityAdmDto>> getCardTransactions(
      @Parameter(description = "Numero de carte (PAN complet ou masque selon la source d'appel)", example = "4508761234561234")
      @PathVariable String cardNumber,
      @Parameter(description = "Pagination Spring Data : page (0-index), size, sort", example = "page=0&size=20&sort=transactionLocalDate,desc")
      Pageable pageable) {
    return ResponseEntity.ok(service.getCardTransactions(cardNumber, pageable));
  }

  @Operation(summary = "Transactions d'une carte sur une plage de dates",
      description = "Retourne toutes les transactions d'une carte entre `startDate` et `endDate` (bornes incluses).")
  @ApiResponse(responseCode = "200", description = "Transactions de la carte sur la periode demandee.")
  @GetMapping("/card/{cardNumber}/range")
  public ResponseEntity<?> getCardTransactionsByDateRange(
      @Parameter(description = "Numero de carte", example = "4508761234561234")
      @PathVariable String cardNumber,
      @Parameter(description = "Date de debut (incluse)", example = "2026-07-01")
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
      @Parameter(description = "Date de fin (incluse)", example = "2026-07-15")
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
    return ResponseEntity.ok(service.getCardTransactionsByDateRange(cardNumber, startDate, endDate));
  }

  // ========== END-POINTS PAR ACCEPTEUR ==========

  @Operation(summary = "Transactions d'un accepteur (marchand/terminal), paginees",
      description = "Retourne l'historique des transactions traitees par un accepteur (`acceptorId` = identifiant marchand/terminal).")
  @ApiResponse(responseCode = "200", description = "Page de transactions de l'accepteur.")
  @GetMapping("/acceptor/{acceptorId}")
  public ResponseEntity<Page<AutohoActivityAdmDto>> getAcceptorTransactions(
      @Parameter(description = "Identifiant de l'accepteur (marchand/terminal)", example = "MERCH00012345")
      @PathVariable String acceptorId,
      Pageable pageable) {
    return ResponseEntity.ok(service.getAcceptorTransactions(acceptorId, pageable));
  }

  @Operation(summary = "Transactions d'un accepteur pour une date metier donnee")
  @ApiResponse(responseCode = "200", description = "Transactions de l'accepteur pour cette date.")
  @GetMapping("/acceptor/{acceptorId}/date/{businessDate}")
  public ResponseEntity<?> getAcceptorTransactionsByDate(
      @Parameter(description = "Identifiant de l'accepteur", example = "MERCH00012345")
      @PathVariable String acceptorId,
      @Parameter(description = "Date metier (business date)", example = "2026-07-15")
      @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate) {
    return ResponseEntity.ok(service.getAcceptorTransactionsByDate(acceptorId, businessDate));
  }

  // ========== END-POINTS PAR DATES ==========

  @Operation(
      summary = "Dernieres transactions (flux principal du dashboard)",
      description = """
          Retourne les `limit` dernieres transactions, triees du plus recent au plus ancien. \
          Endpoint principal utilise par le frontend pour alimenter le Dashboard et l'analyse de transactions. \
          Si `issuing_bank` est fourni, filtre uniquement les transactions ou cette banque intervient comme \
          emettrice OU acquereuse (permet a un utilisateur de ne voir que les transactions de son/ses projet(s)).""")
  @ApiResponse(responseCode = "200", description = "Liste des dernieres transactions (non paginee, liste brute).",
      content = @Content(examples = @ExampleObject(value = "[" + TX_EXAMPLE + "]")))
  @GetMapping("/latest")
  public ResponseEntity<?> getLatestTransactions(
      @Parameter(description = "Nombre maximum de transactions a retourner", example = "2000")
      @RequestParam(defaultValue = "2000") int limit,
      @Parameter(description = "Code banque (emettrice ou acquereuse) pour restreindre le resultat a un projet", example = "AWB")
      @RequestParam(name = "issuing_bank", required = false) String issuingBank) {
    if (issuingBank != null && !issuingBank.isBlank()) {
      return ResponseEntity.ok(service.getLatestTransactionsByBank(limit, issuingBank));
    }
    return ResponseEntity.ok(service.getLatestTransactions(limit));
  }

  @Operation(summary = "Transactions d'une date metier, paginees")
  @ApiResponse(responseCode = "200", description = "Page de transactions de la date demandee.")
  @GetMapping("/business-date/{businessDate}")
  public ResponseEntity<Page<AutohoActivityAdmDto>> getByBusinessDate(
      @Parameter(description = "Date metier (business date)", example = "2026-07-15")
      @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate,
      Pageable pageable) {
    return ResponseEntity.ok(service.getTransactionsByBusinessDate(businessDate, pageable));
  }

  @Operation(summary = "Transactions entre deux dates, paginees")
  @ApiResponse(responseCode = "200", description = "Page de transactions sur la periode demandee.")
  @GetMapping("/date-range")
  public ResponseEntity<Page<AutohoActivityAdmDto>> getByDateRange(
      @Parameter(description = "Date de debut (incluse)", example = "2026-07-01")
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
      @Parameter(description = "Date de fin (incluse)", example = "2026-07-15")
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
      Pageable pageable) {
    return ResponseEntity.ok(service.getTransactionsByDateRange(startDate, endDate, pageable));
  }

  // ========== END-POINTS PAR STATUS ==========

  @Operation(summary = "Transactions refusees, paginees",
      description = "Retourne les transactions dont le code d'action correspond a un refus (`actionCode != APPROVED`).")
  @ApiResponse(responseCode = "200", description = "Page de transactions refusees.")
  @GetMapping("/declined")
  public ResponseEntity<Page<AutohoActivityAdmDto>> getDeclinedTransactions(Pageable pageable) {
    return ResponseEntity.ok(service.getDeclinedTransactions(pageable));
  }

  @Operation(summary = "Transactions refusees entre deux dates")
  @ApiResponse(responseCode = "200", description = "Transactions refusees sur la periode demandee.")
  @GetMapping("/declined/date-range")
  public ResponseEntity<?> getDeclinedTransactionsByDateRange(
      @Parameter(description = "Date de debut (incluse)", example = "2026-07-01")
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
      @Parameter(description = "Date de fin (incluse)", example = "2026-07-15")
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
    return ResponseEntity.ok(service.getDeclinedTransactionsByDateRange(startDate, endDate));
  }

  @Operation(summary = "Transactions par code de rejet, paginees",
      description = "Retourne les transactions ayant un code de reponse ISO 8583 (DE 39) de rejet specifique (ex: `05` = refus generique, `51` = provision insuffisante).")
  @ApiResponse(responseCode = "200", description = "Page de transactions avec ce code de rejet.")
  @GetMapping("/reject-code/{rejectCode}")
  public ResponseEntity<Page<AutohoActivityAdmDto>> getByRejectCode(
      @Parameter(description = "Code reponse ISO 8583 (DE 39)", example = "51")
      @PathVariable String rejectCode,
      Pageable pageable) {
    return ResponseEntity.ok(service.getByRejectCode(rejectCode, pageable));
  }

  @Operation(summary = "Transactions reversees (annulations), paginees",
      description = "Retourne les transactions annulees via un message de reversal ISO 8583 (MTI 04xx).")
  @ApiResponse(responseCode = "200", description = "Page de transactions reversees.")
  @GetMapping("/reversals")
  public ResponseEntity<Page<AutohoActivityAdmDto>> getReversals(Pageable pageable) {
    return ResponseEntity.ok(service.getReversals(pageable));
  }

  // ========== END-POINTS PAR MONTANT ==========

  @Operation(summary = "Transactions de montant eleve, paginees",
      description = "Retourne les transactions dont le montant est superieur ou egal a `minAmount`. Utile pour la detection de transactions a fort enjeu.")
  @ApiResponse(responseCode = "200", description = "Page de transactions de montant eleve.")
  @GetMapping("/high-value")
  public ResponseEntity<Page<AutohoActivityAdmDto>> getHighValueTransactions(
      @Parameter(description = "Montant minimum (inclus)", example = "5000")
      @RequestParam(defaultValue = "5000") BigDecimal minAmount,
      Pageable pageable) {
    return ResponseEntity.ok(service.getHighValueTransactions(minAmount, pageable));
  }

  @Operation(summary = "Transactions dans une plage de montants, paginees",
      description = "Retourne les transactions dont le montant est compris entre `minAmount` et `maxAmount` (bornes incluses).")
  @ApiResponse(responseCode = "200", description = "Page de transactions dans la plage de montants.")
  @GetMapping("/amount-range")
  public ResponseEntity<Page<AutohoActivityAdmDto>> getByAmountRange(
      @Parameter(description = "Montant minimum (inclus)", example = "100")
      @RequestParam BigDecimal minAmount,
      @Parameter(description = "Montant maximum (inclus)", example = "5000")
      @RequestParam BigDecimal maxAmount,
      Pageable pageable) {
    return ResponseEntity.ok(service.getTransactionsByAmountRange(minAmount, maxAmount, pageable));
  }

  // ========== END-POINTS PAR RÉSEAU ==========

  @Operation(summary = "Transactions par banque acquereuse, paginees")
  @ApiResponse(responseCode = "200", description = "Page de transactions de la banque acquereuse.")
  @GetMapping("/acquirer/{acquirerBank}")
  public ResponseEntity<Page<AutohoActivityAdmDto>> getByAcquirerBank(
      @Parameter(description = "Code de la banque acquereuse", example = "AWB")
      @PathVariable String acquirerBank,
      Pageable pageable) {
    return ResponseEntity.ok(service.getByAcquirerBank(acquirerBank, pageable));
  }

  @Operation(summary = "Transactions par reseau de carte, paginees",
      description = "Retourne les transactions traitees par un reseau donne (ex: `VISA`, `MC`, `CMI`).")
  @ApiResponse(responseCode = "200", description = "Page de transactions du reseau demande.")
  @GetMapping("/network/{networkCode}")
  public ResponseEntity<Page<AutohoActivityAdmDto>> getByNetworkCode(
      @Parameter(description = "Code du reseau de carte", example = "VISA")
      @PathVariable String networkCode,
      Pageable pageable) {
    return ResponseEntity.ok(service.getByNetworkCode(networkCode, pageable));
  }

  @Operation(summary = "Transactions par pays, paginees",
      description = "Retourne les transactions dont le code pays (ISO 3166 numerique, DE 19) correspond a `countryCode`.")
  @ApiResponse(responseCode = "200", description = "Page de transactions du pays demande.")
  @GetMapping("/country/{countryCode}")
  public ResponseEntity<Page<AutohoActivityAdmDto>> getByCountryCode(
      @Parameter(description = "Code pays ISO 3166 numerique", example = "504")
      @PathVariable String countryCode,
      Pageable pageable) {
    return ResponseEntity.ok(service.getByCountryCode(countryCode, pageable));
  }

  // ========== CRÉATION ==========

  @Operation(
      summary = "Creer une nouvelle transaction",
      description = """
          Insere une nouvelle transaction ISO 8583 dans AUTHO_ACTIVITY_ADM. Utilise principalement par le \
          simulateur de trafic (`IsoSimulatorTask`) mais expose egalement pour l'injection manuelle de scenarios \
          de test lors des demonstrations.""")
  @io.swagger.v3.oas.annotations.parameters.RequestBody(content = @Content(examples = @ExampleObject(value = """
      {
        "referenceNumber": "251960123456",
        "internalStan": "000123",
        "transactionId": "TXN20260715112233",
        "businessDate": "2026-07-15",
        "transactionLocalDate": "2026-07-15T11:22:33",
        "cardNumberMasked": "450876******1234",
        "acceptorId": "MERCH00012345",
        "acquirerBank": "AWB",
        "issuingBank": "BMCE",
        "networkCode": "VISA",
        "countryCode": "504",
        "transactionAmount": 1250.00,
        "billingAmount": 1250.00,
        "billingCurrency": "MAD",
        "responseCode": "00",
        "actionCode": "APPROVED",
        "posEntryMode": "05",
        "mti": "0200"
      }""")))
  @ApiResponse(responseCode = "201", description = "Transaction creee.",
      content = @Content(examples = @ExampleObject(value = TX_EXAMPLE)))
  @ApiResponse(responseCode = "400", description = "Requete invalide (champs obligatoires manquants ou mal formes).")
  @PostMapping
  public ResponseEntity<AutohoActivityAdmDto> createTransaction(
      @Valid @RequestBody CreateAuthoActivityAdmRequest request) {
    AutohoActivityAdmDto created = service.createTransaction(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(created);
  }

  // ========== STATISTIQUES ==========

  @Operation(summary = "Nombre de transactions d'une date metier")
  @ApiResponse(responseCode = "200", description = "Nombre total de transactions.",
      content = @Content(examples = @ExampleObject(value = "1873")))
  @GetMapping("/stats/count")
  public ResponseEntity<Long> countByBusinessDate(
      @Parameter(description = "Date metier", example = "2026-07-15")
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate) {
    return ResponseEntity.ok(service.countByBusinessDate(businessDate));
  }

  @Operation(summary = "Nombre de transactions refusees d'une date metier")
  @ApiResponse(responseCode = "200", description = "Nombre de transactions refusees.",
      content = @Content(examples = @ExampleObject(value = "94")))
  @GetMapping("/stats/declined-count")
  public ResponseEntity<Long> countDeclinedByBusinessDate(
      @Parameter(description = "Date metier", example = "2026-07-15")
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate) {
    return ResponseEntity.ok(service.countDeclinedByBusinessDate(businessDate));
  }

  @Operation(summary = "Somme des montants d'une date metier")
  @ApiResponse(responseCode = "200", description = "Montant total, dans la devise de facturation.",
      content = @Content(examples = @ExampleObject(value = "2456789.50")))
  @GetMapping("/stats/sum-amount")
  public ResponseEntity<BigDecimal> sumAmountByBusinessDate(
      @Parameter(description = "Date metier", example = "2026-07-15")
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate) {
    return ResponseEntity.ok(service.sumAmountByBusinessDate(businessDate));
  }

  @Operation(summary = "Montant moyen d'une date metier")
  @ApiResponse(responseCode = "200", description = "Montant moyen par transaction.",
      content = @Content(examples = @ExampleObject(value = "1312.45")))
  @GetMapping("/stats/avg-amount")
  public ResponseEntity<BigDecimal> avgAmountByBusinessDate(
      @Parameter(description = "Date metier", example = "2026-07-15")
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate) {
    return ResponseEntity.ok(service.avgAmountByBusinessDate(businessDate));
  }

  @Operation(summary = "Taux d'approbation d'une date metier",
      description = "Retourne le pourcentage de transactions approuvees (0-100) pour la date demandee.")
  @ApiResponse(responseCode = "200", description = "Taux d'approbation en pourcentage.",
      content = @Content(examples = @ExampleObject(value = "94")))
  @GetMapping("/stats/approval-rate")
  public ResponseEntity<Long> getApprovalRate(
      @Parameter(description = "Date metier", example = "2026-07-15")
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDate) {
    return ResponseEntity.ok(service.getApprovalRate(businessDate));
  }

  // ========== HEALTH CHECK ==========

  @Operation(summary = "Verifier la disponibilite du service transactions",
      description = "Endpoint de liveness simple, sans authentification requise.")
  @ApiResponse(responseCode = "200", description = "Le service est disponible.",
      content = @Content(examples = @ExampleObject(value = "\"AutohoActivityAdm Service is running\"")))
  @GetMapping("/health")
  public ResponseEntity<String> health() {
    return ResponseEntity.ok("AutohoActivityAdm Service is running");
  }
}
