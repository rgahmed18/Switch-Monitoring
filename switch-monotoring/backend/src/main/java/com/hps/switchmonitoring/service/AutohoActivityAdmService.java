package com.hps.switchmonitoring.service;

import com.hps.switchmonitoring.api.dto.AutohoActivityAdmDto;
import com.hps.switchmonitoring.api.dto.CreateAuthoActivityAdmRequest;
import com.hps.switchmonitoring.domain.AutohoActivityAdmEntity;
import com.hps.switchmonitoring.domain.AutohoActivityAdmPk;
import com.hps.switchmonitoring.repository.AutohoActivityAdmRepository;
import com.hps.switchmonitoring.util.SecurityUtils;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service pour la gestion des transactions AUTHO_ACTIVITY_ADM
 * Logique métier, validation, et conversion des données
 */
@Service
@Transactional(readOnly = true)
public class AutohoActivityAdmService {

  private static final Logger logger = LoggerFactory.getLogger(AutohoActivityAdmService.class);

  private final AutohoActivityAdmRepository repository;

  public AutohoActivityAdmService(AutohoActivityAdmRepository repository) {
    this.repository = repository;
  }

  // ========== ADMIN / SIMULATION ==========

  /** Supprime TOUTES les transactions de la table (purge complète pour re-simulation). */
  @Transactional
  public void purgeAll() {
    logger.warn("PURGE COMPLÈTE de la table AUTHO_ACTIVITY_ADM");
    repository.deleteAll();
  }

  // ========== REQUÊTES SIMPLES ==========

  public AutohoActivityAdmDto getTransactionDetail(String referenceNumber, String internalStan) {
    return repository.findByReferenceNumberAndInternalStan(referenceNumber, internalStan)
        .map(this::entityToDto)
        .orElseThrow(() -> new NoSuchElementException(
            "Transaction non trouvée: ref=" + referenceNumber + ", stan=" + internalStan));
  }

  public AutohoActivityAdmDto getByTransactionId(String transactionId) {
    return repository.findByTransactionId(transactionId)
        .map(this::entityToDto)
        .orElseThrow(() -> new NoSuchElementException("Transaction non trouvée: " + transactionId));
  }

  public AutohoActivityAdmDto getByAuthorizationId(String authorizationId) {
    return repository.findByAuthorizationId(authorizationId)
        .map(this::entityToDto)
        .orElseThrow(() -> new NoSuchElementException("Autorisation non trouvée: " + authorizationId));
  }

  public AutohoActivityAdmDto getByCpsTransactionId(String cpsTransactionId) {
    return repository.findByCpsTransactionId(cpsTransactionId)
        .map(this::entityToDto)
        .orElseThrow(() -> new NoSuchElementException("Transaction CPS non trouvée: " + cpsTransactionId));
  }

  // ========== REQUÊTES PAR CARTE ==========

  public Page<AutohoActivityAdmDto> getCardTransactions(String cardNumber, Pageable pageable) {
    logger.info("Recherche des transactions pour la carte: {}", SecurityUtils.maskCardNumberSafe(cardNumber));
    return repository.findByCardNumber(cardNumber, pageable)
        .map(this::entityToDto);
  }

  public List<AutohoActivityAdmDto> getCardTransactionsByDateRange(
      String cardNumber, LocalDate startDate, LocalDate endDate) {
    logger.info("Recherche des transactions pour la carte {} entre {} et {}",
        SecurityUtils.maskCardNumberSafe(cardNumber), startDate, endDate);
    return repository.findCardTransactionsByDateRange(cardNumber, startDate, endDate)
        .stream()
        .map(this::entityToDto)
        .collect(Collectors.toList());
  }

  // ========== REQUÊTES PAR ACCEPTEUR ==========

  public Page<AutohoActivityAdmDto> getAcceptorTransactions(String acceptorId, Pageable pageable) {
    logger.info("Recherche des transactions pour l'accepteur: {}", acceptorId);
    return repository.findByCardAcceptorId(acceptorId, pageable)
        .map(this::entityToDto);
  }

  public List<AutohoActivityAdmDto> getAcceptorTransactionsByDate(
      String acceptorId, LocalDate businessDate) {
    return repository.findByCardAcceptorIdAndBusinessDate(acceptorId, businessDate)
        .stream()
        .map(this::entityToDto)
        .collect(Collectors.toList());
  }

  // ========== REQUÊTES PAR DATES ==========

  public List<AutohoActivityAdmDto> getLatestTransactions(int limit) {
    limit = Math.min(limit, 2000);
    logger.info("Récupération des {} dernières transactions (toutes banques)", limit);
    // PageRequest on findLatestSlice adds LIMIT/OFFSET without firing COUNT(*)
    Pageable pageable = PageRequest.of(0, limit);
    return repository.findLatestSlice(pageable)
        .stream()
        .map(this::entityToDto)
        .collect(Collectors.toList());
  }

  public List<AutohoActivityAdmDto> getLatestTransactionsByBank(int limit, String bankCode) {
    limit = Math.min(limit, 2000);
    logger.info("Récupération des {} dernières transactions pour la banque: {}", limit, bankCode);
    Pageable pageable = PageRequest.of(0, limit);
    return repository.findLatestByBankSlice(bankCode.toUpperCase().trim(), pageable)
        .stream()
        .map(this::entityToDto)
        .collect(Collectors.toList());
  }

  public Page<AutohoActivityAdmDto> getTransactionsByBusinessDate(
      LocalDate businessDate, Pageable pageable) {
    logger.info("Recherche des transactions pour la date métier: {}", businessDate);
    return repository.findByBusinessDate(businessDate, pageable)
        .map(this::entityToDto);
  }

  public Page<AutohoActivityAdmDto> getTransactionsByDateRange(
      LocalDate startDate, LocalDate endDate, Pageable pageable) {
    logger.info("Recherche des transactions entre {} et {}", startDate, endDate);
    return repository.findByDateRange(startDate, endDate, pageable)
        .map(this::entityToDto);
  }

  // ========== REQUÊTES PAR STATUS ==========

  public Page<AutohoActivityAdmDto> getDeclinedTransactions(Pageable pageable) {
    logger.info("Recherche des transactions refusées");
    return repository.findDeclinedTransactions(pageable)
        .map(this::entityToDto);
  }

  public List<AutohoActivityAdmDto> getDeclinedTransactionsByDateRange(
      LocalDate startDate, LocalDate endDate) {
    logger.info("Recherche des transactions refusées entre {} et {}", startDate, endDate);
    return repository.findDeclinedTransactionsByDateRange(startDate, endDate)
        .stream()
        .map(this::entityToDto)
        .collect(Collectors.toList());
  }

  public Page<AutohoActivityAdmDto> getByRejectCode(String rejectCode, Pageable pageable) {
    logger.info("Recherche des transactions avec code de rejet: {}", rejectCode);
    return repository.findByRejectCode(rejectCode, pageable)
        .map(this::entityToDto);
  }

  public Page<AutohoActivityAdmDto> getReversals(Pageable pageable) {
    logger.info("Recherche des transactions reversées");
    return repository.findReversals(pageable)
        .map(this::entityToDto);
  }

  // ========== REQUÊTES PAR MONTANT ==========

  public Page<AutohoActivityAdmDto> getHighValueTransactions(
      BigDecimal minAmount, Pageable pageable) {
    logger.info("Recherche des transactions >= {}", minAmount);
    return repository.findHighValueTransactions(minAmount, pageable)
        .map(this::entityToDto);
  }

  public Page<AutohoActivityAdmDto> getTransactionsByAmountRange(
      BigDecimal minAmount, BigDecimal maxAmount, Pageable pageable) {
    logger.info("Recherche des transactions entre {} et {}", minAmount, maxAmount);
    return repository.findByAmountRange(minAmount, maxAmount, pageable)
        .map(this::entityToDto);
  }

  // ========== REQUÊTES PAR RÉSEAU ==========

  public Page<AutohoActivityAdmDto> getByAcquirerBank(String acquirerBank, Pageable pageable) {
    logger.info("Recherche des transactions par acquirer: {}", acquirerBank);
    return repository.findByAcquirerBank(acquirerBank, pageable)
        .map(this::entityToDto);
  }

  public Page<AutohoActivityAdmDto> getByNetworkCode(String networkCode, Pageable pageable) {
    logger.info("Recherche des transactions par réseau: {}", networkCode);
    return repository.findByNetworkCode(networkCode, pageable)
        .map(this::entityToDto);
  }

  public Page<AutohoActivityAdmDto> getByCountryCode(String countryCode, Pageable pageable) {
    logger.info("Recherche des transactions par pays: {}", countryCode);
    return repository.findByCountryCode(countryCode, pageable)
        .map(this::entityToDto);
  }

  // ========== CRÉER TRANSACTION ==========

  @Transactional
  public AutohoActivityAdmDto createTransaction(CreateAuthoActivityAdmRequest request) {
    logger.info("Création d'une nouvelle transaction: ref={}, amount={}",
        request.getReferenceNumber(), request.getTransactionAmount());

    // Mapper la requête vers l'entité
    AutohoActivityAdmEntity entity = new AutohoActivityAdmEntity();
    entity.setReferenceNumber(request.getReferenceNumber());
    entity.setInternalStan(request.getInternalStan());
    entity.setExternalStan(request.getExternalStan());
    entity.setRoutingCode(request.getRoutingCode());
    entity.setCaptureCode(request.getCaptureCode());
    entity.setMessageType(request.getMessageType());
    entity.setFunctionCode(request.getFunctionCode());
    entity.setProcessingCode(request.getProcessingCode());
    entity.setActionCode(request.getActionCode());
    entity.setCardNumber(request.getCardNumber());
    entity.setCardType(request.getCardType());
    entity.setEndExpiryDate(request.getEndExpiryDate());
    entity.setTransactionAmount(request.getTransactionAmount());
    entity.setTransactionCurrency(request.getTransactionCurrency());
    entity.setBillingAmount(request.getBillingAmount());
    entity.setBillingCurrency(request.getBillingCurrency());
    entity.setConversionRate(request.getConversionRate());
    entity.setIssSettlementAmount(request.getIssSettlementAmount());
    entity.setIssSettlementCurrency(request.getIssSettlementCurrency());
    entity.setAcqSettlementAmount(request.getAcqSettlementAmount());
    entity.setAcqSettlementCurrency(request.getAcqSettlementCurrency());
    entity.setTransactionFee(request.getTransactionFee());
    entity.setTransactionLocalDate(request.getTransactionLocalDate());
    entity.setTransmissionDateAndTime(request.getTransmissionDateAndTime());
    entity.setResponseDateAndTime(request.getResponseDateAndTime());
    entity.setBusinessDate(request.getBusinessDate());
    entity.setCardAcceptorActivity(request.getCardAcceptorActivity());
    entity.setCardAcceptorId(request.getCardAcceptorId());
    entity.setCardAcceptorTermId(request.getCardAcceptorTermId());
    entity.setCardAccNameAddress(request.getCardAccNameAddress());
    entity.setPosConditionCode(request.getPosConditionCode());
    entity.setNetworkCode(request.getNetworkCode());
    entity.setNetworkId(request.getNetworkId());
    entity.setProductCode(request.getProductCode());
    entity.setAcquiringCountryCode(request.getAcquiringCountryCode());
    entity.setAcquirerBank(request.getAcquirerBank());
    entity.setIssuingBank(request.getIssuingBank());
    entity.setSecurityVerifLevel(request.getSecurityVerifLevel());
    entity.setAuthorizationCode(request.getAuthorizationCode());
    entity.setCrAvailableBalance(request.getCrAvailableBalance());
    entity.setCrCreditLimit(request.getCrCreditLimit());
    entity.setDateCreate(LocalDate.now());
    entity.setUserCreate(request.getUserCreate() != null ? request.getUserCreate() : "SYSTEM");

    // Sauvegarder en base de données
    AutohoActivityAdmEntity saved = repository.save(entity);
    logger.info("Transaction créée et sauvegardée en DB: {}", saved.getReferenceNumber());

    // Convertir en DTO
    AutohoActivityAdmDto dto = entityToDto(saved);

    // Note: Kafka et SSE publishing sont optionnels et peuvent être activés si nécessaire
    // Les services KafkaProducerService et StreamService nécessitent une configuration supplémentaire
    
    return dto;
  }

  // ========== STATISTIQUES ==========

  public long countByBusinessDate(LocalDate businessDate) {
    return repository.countByBusinessDate(businessDate);
  }

  public long countDeclinedByBusinessDate(LocalDate businessDate) {
    return repository.countDeclinedByBusinessDate(businessDate);
  }

  public BigDecimal sumAmountByBusinessDate(LocalDate businessDate) {
    return repository.sumAmountByBusinessDate(businessDate);
  }

  public BigDecimal avgAmountByBusinessDate(LocalDate businessDate) {
    return repository.avgAmountByBusinessDate(businessDate);
  }

  public long getApprovalRate(LocalDate businessDate) {
    long total = countByBusinessDate(businessDate);
    if (total == 0) return 0;
    long declined = countDeclinedByBusinessDate(businessDate);
    return ((total - declined) * 100) / total;
  }

  // ========== CONVERSION ENTITÉ -> DTO ==========

  private static final long SEED_REF_BASE = 99_000_000L;
  private static final long SEED_REF_MAX  = 99_002_500L;

  /**
   * Dérive les champs réseau depuis reference_number quand le DB ne les a pas.
   *
   * - Seed data (ref in [99000001,99002500]): reproduit la logique MOD exacte du seed SQL,
   *   retourne aussi un cardNumberMasked corrigé.
   * - Live simulator data (networkCode null, ref hors plage seed): distribue
   *   Visa/MC/CMI via MOD(ref,10) sur le cardNumber réel de l'entité.
   *
   * Retourne null si aucune correction n'est nécessaire (networkCode déjà présent).
   * Format retour: [networkCode, networkId, productCode, cardNumberMasked]
   */
  private static String[] deriveNetwork(String rawRef, String existingNetCode, String rawCardNumber) {
    // Only correct when networkCode is absent in the DB
    if (existingNetCode != null && !existingNetCode.trim().isEmpty()) return null;
    if (rawRef == null) return null;
    try {
      long ref = Long.parseLong(rawRef.trim());

      // --- Seed data: 50% Visa / 50% MC, original CMI cases reassigned ---
      if (ref > SEED_REF_BASE && ref <= SEED_REF_MAX) {
        int mod = (int) ((ref - SEED_REF_BASE) % 10);
        switch (mod) {
          // Originally Visa (5,6,7) + reassigned CMI (0,1) = 5 Visa slots
          case 0: return new String[]{"01", "VISA", "VIS", "455600XXXXXX6006"};
          case 1: return new String[]{"01", "VISA", "VIS", "462000XXXXXX7007"};
          case 5: return new String[]{"01", "VISA", "VIS", "476400XXXXXX8008"};
          case 6: return new String[]{"01", "VISA", "VIS", "411111XXXXXX1001"};
          case 7: return new String[]{"01", "VISA", "VIS", "400000XXXXXX2002"};
          // Originally MC (3,4,8,9) + reassigned CMI (2) = 5 MC slots
          case 2: return new String[]{"02", "MC  ", "MSC", "522000XXXXXX3003"};
          case 3: return new String[]{"02", "MC  ", "MSC", "531000XXXXXX4004"};
          case 4: return new String[]{"02", "MC  ", "MSC", "535678XXXXXX5005"};
          case 8: return new String[]{"02", "MC  ", "MSC", "555555XXXXXX9009"};
          case 9: return new String[]{"02", "MC  ", "MSC", "559000XXXXXX0010"};
          default: return null;
        }
      }

      // --- Live simulator data: 50% Visa / 50% MC from ref % 10 ---
      String masked = SecurityUtils.maskCardNumberSafe(rawCardNumber);
      int mod = (int) (ref % 10);
      if (mod <= 4) return new String[]{"01", "VISA", "VIS", masked};
      else          return new String[]{"02", "MC  ", "MSC", masked};

    } catch (NumberFormatException ex) {
      return null;
    }
  }

  /**
   * Mapping direct entité → DTO sans ModelMapper.
   * ModelMapper utilisait la réflexion à chaque appel (~0.5 ms × 2000 = ~1 s par requête)
   * et souffrait d'ambiguïté entre networkCode/networkId (setAmbiguityIgnored → champs null).
   * Ce builder est ~100× plus rapide et sans ambiguïté de nommage.
   */
  private AutohoActivityAdmDto entityToDto(AutohoActivityAdmEntity e) {
    // Corrects missing/corrupt network data without requiring a DB fix
    String[] net     = deriveNetwork(e.getReferenceNumber(), e.getNetworkCode(), e.getCardNumber());
    String netCode   = net != null ? net[0] : e.getNetworkCode();
    String netId     = net != null ? net[1] : e.getNetworkId();
    String prodCode  = net != null ? net[2] : e.getProductCode();
    String maskedPan = net != null ? net[3] : SecurityUtils.maskCardNumberSafe(e.getCardNumber());

    return AutohoActivityAdmDto.builder()
        // Clés primaires
        .referenceNumber(e.getReferenceNumber())
        .internalStan(e.getInternalStan())
        .externalStan(e.getExternalStan())
        .routingCode(e.getRoutingCode())
        .captureCode(e.getCaptureCode())
        // Identification
        .messageType(e.getMessageType())
        .functionCode(e.getFunctionCode())
        .processingCode(e.getProcessingCode())
        .actionCode(e.getActionCode())
        .originalActionCode(e.getOriginalActionCode())
        .issuerActionCode(e.getIssuerActionCode())
        .eventCode(e.getEventCode())
        .reasonCode(e.getReasonCode())
        .rejectCode(e.getRejectCode())
        .rejectReason(e.getRejectReason())
        .authorizationId(e.getAuthorizationId())
        .transactionId(e.getTransactionId())
        // Réseau / Routage — valeurs corrigées pour seed data
        .networkCode(netCode)
        .networkId(netId)
        .networkData(e.getNetworkData())
        .receivingInstitution(e.getReceivingInstitution())
        .acquiringCountryCode(e.getAcquiringCountryCode())
        .acquirerInstitutionCode(e.getAcquirerInstitutionCode())
        .acquirerBank(e.getAcquirerBank())
        .issuingBank(e.getIssuingBank())
        .forwardingCountryCode(e.getForwardingCountryCode())
        .forwardingInstitutionCode(e.getForwardingInstitutionCode())
        .forwardingBank(e.getForwardingBank())
        // Carte — PCI-DSS §3.3.1 : PAN brut supprimé, seul le masqué est exposé
        .cardNumber(null)
        .cardNumberMasked(maskedPan)
        .cardType(e.getCardType())
        .cardSequenceNumber(e.getCardSequenceNumber())
        .serviceCode(e.getServiceCode())
        .productCode(prodCode)
        .vipLevel(e.getVipLevel())
        .startExpiryDate(e.getStartExpiryDate())
        .endExpiryDate(e.getEndExpiryDate())
        // Montants
        .transactionAmount(e.getTransactionAmount())
        .transactionCurrency(e.getTransactionCurrency())
        .cashBackAmount(e.getCashBackAmount())
        .replacementAmount(e.getReplacementAmount())
        .billingAmount(e.getBillingAmount())
        .billingCurrency(e.getBillingCurrency())
        .conversionRate(e.getConversionRate())
        // Settlement émetteur
        .issSettlementAmount(e.getIssSettlementAmount())
        .issSettlementCurrency(e.getIssSettlementCurrency())
        .issSettlementDate(e.getIssSettlementDate())
        .issConvRateSettlement(e.getIssConvRateSettlement())
        .issSettlementFee(e.getIssSettlementFee())
        // Settlement acquéreur
        .acqSettlementAmount(e.getAcqSettlementAmount())
        .acqSettlementCurrency(e.getAcqSettlementCurrency())
        .acqSettlementDate(e.getAcqSettlementDate())
        .acqConvRateSettlement(e.getAcqConvRateSettlement())
        .acqSettlementFee(e.getAcqSettlementFee())
        .transactionFee(e.getTransactionFee())
        // Dates
        .transactionLocalDate(e.getTransactionLocalDate())
        .transmissionDateAndTime(e.getTransmissionDateAndTime())
        .responseDateAndTime(e.getResponseDateAndTime())
        .internalTransmissionTime(e.getInternalTransmissionTime())
        .captureDate(e.getCaptureDate())
        .businessDate(e.getBusinessDate())
        // Accepteur / Terminal
        .cardAcceptorActivity(e.getCardAcceptorActivity())
        .cardAcceptorTermId(e.getCardAcceptorTermId())
        .cardAcceptorId(e.getCardAcceptorId())
        .cardAccNameAddress(e.getCardAccNameAddress())
        .tcc(e.getTcc())
        // POS
        .posEntryMode(e.getPosEntryMode())
        .posConditionCode(e.getPosConditionCode())
        .posData(e.getPosData())
        // Sécurité
        .securityVerifLevel(e.getSecurityVerifLevel())
        .securityVerifResult(e.getSecurityVerifResult())
        .addressVerificationData(e.getAddressVerificationData())
        .authorizationCode(e.getAuthorizationCode())
        .originalAuthorizationCode(e.getOriginalAuthorizationCode())
        // Flags
        .authoFlag(e.getAuthoFlag())
        .reversalFlag(e.getReversalFlag())
        .transactionFlag(e.getTransactionFlag())
        .matchingStatus(e.getMatchingStatus())
        // Crédit / Limite
        .crAvailableBalance(e.getCrAvailableBalance())
        .crCreditLimit(e.getCrCreditLimit())
        .crCashLimit(e.getCrCashLimit())
        .crCreditCurBal(e.getCrCreditCurBal())
        .crCashCurBal(e.getCrCashCurBal())
        .crResponseCode(e.getCrResponseCode())
        // Loyauté
        .loyaltyProgramCode(e.getLoyaltyProgramCode())
        .loyaltyPointsGained(e.getLoyaltyPointsGained())
        .loyaltyPointsRedemption(e.getLoyaltyPointsRedemption())
        // Chip / EMV
        .chipApplicationCryptogram(e.getChipApplicationCryptogram())
        .chipTvr(e.getChipTvr())
        .chipTerminalType(e.getChipTerminalType())
        .externalCvvResultCode(e.getExternalCvvResultCode())
        // Reversals
        .reversalStan(e.getReversalStan())
        .reversalTransactionDate(e.getReversalTransactionDate())
        // Métadonnées
        .dateCreate(e.getDateCreate())
        .dateModif(e.getDateModif())
        .build();
  }

  // ========== NETTOYAGE / RETENTION ==========

  @Transactional
  public int deleteOlderThanDate(LocalDate cutoffDate) {
    logger.warn("Suppression des transactions antérieures à {}", cutoffDate);
    return repository.deleteOlderThanDate(cutoffDate);
  }
}
