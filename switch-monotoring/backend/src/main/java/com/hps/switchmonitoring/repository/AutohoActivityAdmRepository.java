package com.hps.switchmonitoring.repository;

import com.hps.switchmonitoring.domain.AutohoActivityAdmEntity;
import com.hps.switchmonitoring.domain.AutohoActivityAdmPk;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Repository pour la table AUTHO_ACTIVITY_ADM
 * Requêtes optimisées pour le monitoring des transactions
 */
@Repository
public interface AutohoActivityAdmRepository 
    extends JpaRepository<AutohoActivityAdmEntity, AutohoActivityAdmPk> {

  // ========== REQUÊTES PAR IDENTIFIANT ==========

  /**
   * Rechercher par référence primaire + STAN interne (clé composite partielle)
   */
  Optional<AutohoActivityAdmEntity> findByReferenceNumberAndInternalStan(
      String referenceNumber, String internalStan);

  /**
   * Rechercher par transaction_id
   */
  Optional<AutohoActivityAdmEntity> findByTransactionId(String transactionId);

  /**
   * Rechercher par authorization_id
   */
  Optional<AutohoActivityAdmEntity> findByAuthorizationId(String authorizationId);

  /**
   * Rechercher par cps_transaction_id
   */
  Optional<AutohoActivityAdmEntity> findByCpsTransactionId(String cpsTransactionId);

  // ========== REQUÊTES PAR CARTE ==========

  /**
   * Rechercher toutes les transactions d'une carte (paginated)
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE a.cardNumber = :cardNumber
      ORDER BY a.businessDate DESC, a.responseDateAndTime DESC
      """)
  Page<AutohoActivityAdmEntity> findByCardNumber(
      @Param("cardNumber") String cardNumber,
      Pageable pageable
  );

  /**
   * Rechercher les transactions d'une carte dans une plage de dates
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE a.cardNumber = :cardNumber
        AND a.businessDate BETWEEN :startDate AND :endDate
      ORDER BY a.businessDate DESC
      """)
  List<AutohoActivityAdmEntity> findCardTransactionsByDateRange(
      @Param("cardNumber") String cardNumber,
      @Param("startDate") LocalDate startDate,
      @Param("endDate") LocalDate endDate
  );

  // ========== REQUÊTES PAR ACCEPTEUR (MERCHANT/TERMINAL) ==========

  /**
   * Rechercher toutes les transactions d'un accepteur
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE a.cardAcceptorId = :acceptorId
      ORDER BY a.businessDate DESC, a.responseDateAndTime DESC
      """)
  Page<AutohoActivityAdmEntity> findByCardAcceptorId(
      @Param("acceptorId") String acceptorId,
      Pageable pageable
  );

  /**
   * Rechercher les transactions d'un accepteur pour une date donnée
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE a.cardAcceptorId = :acceptorId
        AND a.businessDate = :businessDate
      ORDER BY a.responseDateAndTime DESC
      """)
  List<AutohoActivityAdmEntity> findByCardAcceptorIdAndBusinessDate(
      @Param("acceptorId") String acceptorId,
      @Param("businessDate") LocalDate businessDate
  );

  // ========== REQUÊTES PAR DATES ==========

  /**
   * N dernières transactions toutes banques — retourne List (pas Page) pour éviter le COUNT(*).
   * Le Pageable fourni ajoute LIMIT/OFFSET sans déclencher de requête de comptage.
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      ORDER BY a.transmissionDateAndTime DESC NULLS LAST
      """)
  List<AutohoActivityAdmEntity> findLatestSlice(Pageable pageable);

  /**
   * N dernières transactions filtrées par code banque — sans COUNT(*).
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE TRIM(a.acquirerBank) = :bankCode
         OR TRIM(a.issuingBank)  = :bankCode
      ORDER BY a.transmissionDateAndTime DESC NULLS LAST
      """)
  List<AutohoActivityAdmEntity> findLatestByBankSlice(
      @Param("bankCode") String bankCode,
      Pageable pageable);

  /** @deprecated Remplacé par findLatestSlice(Pageable) */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      ORDER BY a.businessDate DESC, a.responseDateAndTime DESC
      LIMIT :limit
      """)
  List<AutohoActivityAdmEntity> findTop100Latest(@Param("limit") int limit);

  /**
   * Récupérer les N dernières transactions filtrées par code banque.
   * Gère les colonnes CHAR(6) Oracle (espaces de padding) via TRIM.
   * Utilisé quand le frontend envoie issuing_bank=AWB (vue utilisateur).
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE TRIM(a.acquirerBank) = :bankCode
         OR TRIM(a.issuingBank)  = :bankCode
      ORDER BY a.transmissionDateAndTime DESC
      """)
  Page<AutohoActivityAdmEntity> findByBankCode(
      @Param("bankCode") String bankCode,
      Pageable pageable
  );

  /**
   * Rechercher les transactions d'une date métier
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE a.businessDate = :businessDate
      ORDER BY a.responseDateAndTime DESC
      """)
  Page<AutohoActivityAdmEntity> findByBusinessDate(
      @Param("businessDate") LocalDate businessDate,
      Pageable pageable
  );

  /**
   * Rechercher les transactions entre deux dates
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE a.businessDate BETWEEN :startDate AND :endDate
      ORDER BY a.businessDate DESC, a.responseDateAndTime DESC
      """)
  Page<AutohoActivityAdmEntity> findByDateRange(
      @Param("startDate") LocalDate startDate,
      @Param("endDate") LocalDate endDate,
      Pageable pageable
  );

  // ========== REQUÊTES PAR STATUS / ACTION ==========

  /**
   * Rechercher les transactions refusées (rejected)
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE a.rejectCode IS NOT NULL
         OR a.actionCode IN ('900', '901', '902')
      ORDER BY a.businessDate DESC, a.responseDateAndTime DESC
      """)
  Page<AutohoActivityAdmEntity> findDeclinedTransactions(Pageable pageable);

  /**
   * Rechercher les transactions refusées pour une période
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE (a.rejectCode IS NOT NULL OR a.actionCode IN ('900', '901', '902'))
        AND a.businessDate BETWEEN :startDate AND :endDate
      ORDER BY a.businessDate DESC
      """)
  List<AutohoActivityAdmEntity> findDeclinedTransactionsByDateRange(
      @Param("startDate") LocalDate startDate,
      @Param("endDate") LocalDate endDate
  );

  /**
   * Rechercher par code de rejet
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE a.rejectCode = :rejectCode
      ORDER BY a.businessDate DESC, a.responseDateAndTime DESC
      """)
  Page<AutohoActivityAdmEntity> findByRejectCode(
      @Param("rejectCode") String rejectCode,
      Pageable pageable
  );

  /**
   * Rechercher les reversals (annulations)
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE a.reversalFlag = 'Y'
         OR a.reversalStan IS NOT NULL
      ORDER BY a.businessDate DESC, a.responseDateAndTime DESC
      """)
  Page<AutohoActivityAdmEntity> findReversals(Pageable pageable);

  // ========== REQUÊTES PAR MONTANT ==========

  /**
   * Rechercher les transactions de montant élevé
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE a.transactionAmount >= :minAmount
      ORDER BY a.transactionAmount DESC, a.businessDate DESC
      """)
  Page<AutohoActivityAdmEntity> findHighValueTransactions(
      @Param("minAmount") java.math.BigDecimal minAmount,
      Pageable pageable
  );

  /**
   * Rechercher les transactions dans une plage de montants
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE a.transactionAmount BETWEEN :minAmount AND :maxAmount
      ORDER BY a.transactionAmount DESC, a.businessDate DESC
      """)
  Page<AutohoActivityAdmEntity> findByAmountRange(
      @Param("minAmount") java.math.BigDecimal minAmount,
      @Param("maxAmount") java.math.BigDecimal maxAmount,
      Pageable pageable
  );

  // ========== REQUÊTES PAR RÉSEAU / ACQUÉREUR ==========

  /**
   * Rechercher par acquirer_bank
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE a.acquirerBank = :acquirerBank
      ORDER BY a.businessDate DESC, a.responseDateAndTime DESC
      """)
  Page<AutohoActivityAdmEntity> findByAcquirerBank(
      @Param("acquirerBank") String acquirerBank,
      Pageable pageable
  );

  /**
   * Rechercher par network_code
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE a.networkCode = :networkCode
      ORDER BY a.businessDate DESC, a.responseDateAndTime DESC
      """)
  Page<AutohoActivityAdmEntity> findByNetworkCode(
      @Param("networkCode") String networkCode,
      Pageable pageable
  );

  /**
   * Rechercher par acquiring_country_code
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE a.acquiringCountryCode = :countryCode
      ORDER BY a.businessDate DESC, a.responseDateAndTime DESC
      """)
  Page<AutohoActivityAdmEntity> findByCountryCode(
      @Param("countryCode") String countryCode,
      Pageable pageable
  );

  // ========== REQUÊTES STATISTIQUES ==========

  /**
   * Compter les transactions d'une date
   */
  @Query("""
      SELECT COUNT(a) FROM AutohoActivityAdmEntity a
      WHERE a.businessDate = :businessDate
      """)
  long countByBusinessDate(@Param("businessDate") LocalDate businessDate);

  /**
   * Compter les transactions refusées d'une date
   */
  @Query("""
      SELECT COUNT(a) FROM AutohoActivityAdmEntity a
      WHERE a.businessDate = :businessDate
        AND (a.rejectCode IS NOT NULL OR a.actionCode IN ('900', '901', '902'))
      """)
  long countDeclinedByBusinessDate(@Param("businessDate") LocalDate businessDate);

  /**
   * Somme des montants pour une date
   */
  @Query("""
      SELECT COALESCE(SUM(a.transactionAmount), 0) FROM AutohoActivityAdmEntity a
      WHERE a.businessDate = :businessDate
      """)
  java.math.BigDecimal sumAmountByBusinessDate(@Param("businessDate") LocalDate businessDate);

  /**
   * Moyenne des montants pour une date
   */
  @Query("""
      SELECT COALESCE(AVG(a.transactionAmount), 0) FROM AutohoActivityAdmEntity a
      WHERE a.businessDate = :businessDate
      """)
  java.math.BigDecimal avgAmountByBusinessDate(@Param("businessDate") LocalDate businessDate);

  // ========== REQUÊTES PAR MESSAGE TYPE / ISO 8583 ==========

  /**
   * Rechercher par message_type (MTI - Message Type Indicator)
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE a.messageType = :messageType
      ORDER BY a.businessDate DESC, a.responseDateAndTime DESC
      """)
  Page<AutohoActivityAdmEntity> findByMessageType(
      @Param("messageType") String messageType,
      Pageable pageable
  );

  /**
   * Rechercher par processing_code
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE a.processingCode = :processingCode
      ORDER BY a.businessDate DESC
      """)
  Page<AutohoActivityAdmEntity> findByProcessingCode(
      @Param("processingCode") String processingCode,
      Pageable pageable
  );

  // ========== REQUÊTES POUR SÉCURITÉ / FRAUDE ==========

  /**
   * Rechercher les transactions avec cryptogramme chip
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE a.chipApplicationCryptogram IS NOT NULL
      ORDER BY a.businessDate DESC, a.responseDateAndTime DESC
      """)
  Page<AutohoActivityAdmEntity> findChipTransactions(Pageable pageable);

  /**
   * Rechercher les transactions sans verification
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE a.securityVerifLevel IS NULL
         OR a.securityVerifLevel = ''
      ORDER BY a.businessDate DESC
      """)
  Page<AutohoActivityAdmEntity> findUnverifiedTransactions(Pageable pageable);

  // ========== REQUÊTES DE SETTLEMENT ==========

  /**
   * Rechercher les transactions non yet settled
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE a.issSettlementAmount IS NULL
         OR a.issSettlementDate IS NULL
      ORDER BY a.businessDate DESC
      """)
  Page<AutohoActivityAdmEntity> findUnsettledTransactions(Pageable pageable);

  /**
   * Rechercher les transactions settled pour une période
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE a.issSettlementDate BETWEEN :startDate AND :endDate
      ORDER BY a.issSettlementDate DESC
      """)
  List<AutohoActivityAdmEntity> findSettledTransactionsByDateRange(
      @Param("startDate") LocalDate startDate,
      @Param("endDate") LocalDate endDate
  );

  // ========== REQUÊTES DE LOYAUTÉ ==========

  /**
   * Rechercher les transactions avec points de loyauté
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE a.loyaltyPointsGained IS NOT NULL
         AND a.loyaltyPointsGained > 0
      ORDER BY a.businessDate DESC
      """)
  Page<AutohoActivityAdmEntity> findLoyaltyTransactions(Pageable pageable);

  // ========== SUPPRESSION / NETTOYAGE ==========

  /**
   * Supprimer les transactions antérieures à une date (data retention)
   */
  @Modifying
  @Query("""
      DELETE FROM AutohoActivityAdmEntity a
      WHERE a.businessDate < :cutoffDate
      """)
  int deleteOlderThanDate(@Param("cutoffDate") LocalDate cutoffDate);

  // ========== REQUÊTES ANALYTIQUES MONÉTIQUE (MonetixAnalyticsController) ==========

  /**
   * Compter les transactions chip/EMV pour une date
   */
  @Query("""
      SELECT COUNT(a) FROM AutohoActivityAdmEntity a
      WHERE a.businessDate = :date
        AND a.chipApplicationCryptogram IS NOT NULL
      """)
  long countChipTransactionsByDate(@Param("date") LocalDate date);

  /**
   * Compter les codes action liés à la fraude pour une date
   * Codes : 102 (fraude suspectée), 129 (contrefaçon), 181 (perdue), 182 (volée), 183 (frauduleuse)
   */
  @Query("""
      SELECT COUNT(a) FROM AutohoActivityAdmEntity a
      WHERE a.businessDate = :date
        AND a.actionCode IN ('102', '105', '129', '181', '182', '183', '188')
      """)
  long countFraudActionCodesByDate(@Param("date") LocalDate date);

  /**
   * Compter les transactions avec SLA de traitement dépassé (> 5 secondes).
   * Oracle : soustraction de DATE donne des jours fractionnaires, * 86400 = secondes.
   */
  @Query(value = """
      SELECT COUNT(*) FROM AUTHO_ACTIVITY_ADM
      WHERE BUSINESS_DATE = :date
        AND TRANSMISSION_DATE_AND_TIME IS NOT NULL
        AND RESPONSE_DATE_AND_TIME IS NOT NULL
        AND (RESPONSE_DATE_AND_TIME - TRANSMISSION_DATE_AND_TIME) * 86400 > 5
      """, nativeQuery = true)
  long countSlaBreachesByDate(@Param("date") LocalDate date);

  /**
   * Compter les transactions approuvées en attente de settlement pour une date
   */
  @Query("""
      SELECT COUNT(a) FROM AutohoActivityAdmEntity a
      WHERE a.businessDate = :date
        AND a.actionCode = '000'
        AND (a.issSettlementDate IS NULL OR a.acqSettlementDate IS NULL)
      """)
  long countPendingSettlementByDate(@Param("date") LocalDate date);

  /**
   * Compter les transactions cross-devise (transaction_currency != billing_currency)
   */
  @Query("""
      SELECT COUNT(a) FROM AutohoActivityAdmEntity a
      WHERE a.businessDate = :date
        AND a.transactionCurrency IS NOT NULL
        AND a.billingCurrency IS NOT NULL
        AND a.transactionCurrency != a.billingCurrency
      """)
  long countCrossCurrencyByDate(@Param("date") LocalDate date);

  /**
   * Transactions approuvées non settlées pour une date business
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE a.businessDate = :date
        AND a.actionCode = '000'
        AND (a.issSettlementDate IS NULL OR a.acqSettlementDate IS NULL)
      ORDER BY a.transactionAmount DESC
      """)
  List<AutohoActivityAdmEntity> findUnsettledApprovedByBusinessDate(@Param("date") LocalDate date);

  /**
   * Transactions approuvées cross-devise (pour analyse anomalies FX)
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE a.businessDate >= :fromDate
        AND a.actionCode = '000'
        AND a.transactionCurrency IS NOT NULL
        AND a.billingCurrency IS NOT NULL
        AND a.transactionCurrency != a.billingCurrency
        AND a.conversionRate IS NOT NULL
      ORDER BY a.businessDate DESC, a.transactionAmount DESC
      """)
  Page<AutohoActivityAdmEntity> findCrossCurrencyApproved(
      @Param("fromDate") LocalDate fromDate,
      Pageable pageable
  );

  /**
   * Répartition par catégorie d'action code pour une date (pour dashboard)
   * Retourne une liste de paires [actionCode, count]
   */
  @Query("""
      SELECT a.actionCode, COUNT(a) FROM AutohoActivityAdmEntity a
      WHERE a.businessDate = :date
        AND a.actionCode IS NOT NULL
      GROUP BY a.actionCode
      ORDER BY COUNT(a) DESC
      """)
  List<Object[]> countByActionCodeGroup(@Param("date") LocalDate date);

  // ========== REQUÊTES RAPPORT JOURNALIER ==========

  /**
   * Répartition par message_type pour une date (distribution MTI)
   * Résultat : [message_type, count]
   */
  @Query(value = """
      SELECT message_type, COUNT(*) AS cnt
      FROM AUTHO_ACTIVITY_ADM
      WHERE business_date = :date
        AND message_type IS NOT NULL
      GROUP BY message_type
      ORDER BY cnt DESC
      """, nativeQuery = true)
  List<Object[]> countByMessageTypeGroup(@Param("date") LocalDate date);

  /**
   * Volume horaire pour une date (nombre de transactions par heure)
   * Résultat : [hour (0-23), count]
   */
  @Query(value = """
      SELECT EXTRACT(HOUR FROM transmission_date_and_time) AS tx_hour,
             COUNT(*) AS cnt
      FROM AUTHO_ACTIVITY_ADM
      WHERE business_date = :date
        AND transmission_date_and_time IS NOT NULL
      GROUP BY EXTRACT(HOUR FROM transmission_date_and_time)
      ORDER BY tx_hour
      """, nativeQuery = true)
  List<Object[]> countByHourGroup(@Param("date") LocalDate date);

  /**
   * Compter les transactions en erreur réseau (codes 906/911/909/908)
   */
  @Query("""
      SELECT COUNT(a) FROM AutohoActivityAdmEntity a
      WHERE a.businessDate = :date
        AND a.actionCode IN ('906', '911', '909', '908', '910', '912')
      """)
  long countNetworkErrorsByDate(@Param("date") LocalDate date);

  // ========== REQUÊTES ARCHIVAGE ==========

  /**
   * Récupérer les transactions à archiver (plus anciennes que cutoffDate)
   * Utilisation : INSERT/SELECT batch vers table archive
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE a.businessDate < :cutoffDate
      ORDER BY a.businessDate ASC
      """)
  List<AutohoActivityAdmEntity> findForArchive(@Param("cutoffDate") LocalDate cutoffDate);

  /**
   * Compter les transactions éligibles à l'archivage
   */
  @Query("""
      SELECT COUNT(a) FROM AutohoActivityAdmEntity a
      WHERE a.businessDate < :cutoffDate
      """)
  long countForArchive(@Param("cutoffDate") LocalDate cutoffDate);

  /**
   * Transactions avec ATC suspect (valeur hex 0001-0004 = risque replay/clonage)
   * chip_atc est stocké en hexa string (ex: "0003" = 3 en décimal)
   */
  @Query("""
      SELECT a FROM AutohoActivityAdmEntity a
      WHERE a.businessDate = :date
        AND a.chipAtc IS NOT NULL
        AND a.chipAtc IN ('0001', '0002', '0003', '0004',
                          '001', '002', '003', '004',
                          '01', '02', '03', '04')
      ORDER BY a.transmissionDateAndTime DESC
      """)
  List<AutohoActivityAdmEntity> findSuspiciousAtcByDate(@Param("date") LocalDate date);

  /**
   * Transactions avec TVR commençant par un octet non nul (potentiellement risqué).
   * Utilisé par SmartAlertEngine pour détecter les anomalies TVR en masse.
   */
  @Query("""
      SELECT COUNT(a) FROM AutohoActivityAdmEntity a
      WHERE a.businessDate = :date
        AND a.chipTvr IS NOT NULL
        AND a.chipTvr != '0000000000'
        AND a.chipTvr != '00000000'
      """)
  long countNonCleanTvrByDate(@Param("date") LocalDate date);

  /**
   * Taux d'approbation pour une date (pour statistiques)
   */
  @Query("""
      SELECT COUNT(a) FROM AutohoActivityAdmEntity a
      WHERE a.businessDate = :businessDate
        AND a.actionCode = '000'
      """)
  long countApprovedByBusinessDate(@Param("businessDate") LocalDate businessDate);

  // ========== GEO-ANALYTICS : FILTRAGE BIDIRECTIONNEL PAYS ↔ DEVISE ==========

  /**
   * Retourne la liste distincte des pays acquéreurs actifs pour une date.
   * Résultat : [acquiring_country_code, transaction_count]
   * Utilisé pour peupler le filtre Pays en page geo-analytics.
   */
  @Query(value = """
      SELECT acquiring_country_code, COUNT(*) AS tx_count
      FROM AUTHO_ACTIVITY_ADM
      WHERE business_date = :date
        AND acquiring_country_code IS NOT NULL
        AND message_type IN ('1100','1102','1110','1200','1210')
      GROUP BY acquiring_country_code
      ORDER BY tx_count DESC
      """, nativeQuery = true)
  List<Object[]> findActiveCountriesByDate(@Param("date") LocalDate date);

  /**
   * Retourne les devises utilisées pour un ensemble de pays acquéreurs.
   * Résultat : [transaction_currency, country_code, count]
   * Filtrage Pays → Devise.
   */
  @Query(value = """
      SELECT transaction_currency, acquiring_country_code, COUNT(*) AS tx_count
      FROM AUTHO_ACTIVITY_ADM
      WHERE business_date = :date
        AND acquiring_country_code IN (:countries)
        AND transaction_currency IS NOT NULL
      GROUP BY transaction_currency, acquiring_country_code
      ORDER BY tx_count DESC
      """, nativeQuery = true)
  List<Object[]> findCurrenciesByCountries(
      @Param("date") LocalDate date,
      @Param("countries") List<String> countries);

  /**
   * Retourne les pays acquéreurs utilisant une devise donnée.
   * Filtrage Devise → Pays.
   */
  @Query(value = """
      SELECT acquiring_country_code, COUNT(*) AS tx_count
      FROM AUTHO_ACTIVITY_ADM
      WHERE business_date = :date
        AND transaction_currency = :currency
        AND acquiring_country_code IS NOT NULL
      GROUP BY acquiring_country_code
      ORDER BY tx_count DESC
      """, nativeQuery = true)
  List<Object[]> findCountriesByCurrency(
      @Param("date") LocalDate date,
      @Param("currency") String currency);

  // ========== ZONE HEALTH : CALCUL SANTÉ PAR PAYS ==========

  /**
   * Agrégats de santé par pays acquéreur pour une date.
   * Colonnes : country_code, total, approved, declined, reversal_count,
   *            top_reject_code, avg_latency_sec
   * MTI filtrés : 1100/1102 = demandes d'autorisation (standard PowerCARD)
   * Conversion montant en MAD : billing_amount * conversion_rate (si billing_currency != '504')
   */
  @Query(value = """
      SELECT
        a.acquiring_country_code                                              AS country_code,
        COUNT(*)                                                              AS total_tx,
        SUM(CASE WHEN a.action_code = '000' THEN 1 ELSE 0 END)              AS approved_count,
        SUM(CASE WHEN a.action_code != '000'
                  AND a.action_code IS NOT NULL THEN 1 ELSE 0 END)          AS declined_count,
        SUM(CASE WHEN a.message_type IN ('1420','1421') THEN 1 ELSE 0 END)  AS reversal_count,
        (SELECT action_code FROM (
           SELECT r.action_code
           FROM AUTHO_ACTIVITY_ADM r
           WHERE r.business_date = a.business_date
             AND r.acquiring_country_code = a.acquiring_country_code
             AND r.action_code != '000'
             AND r.action_code IS NOT NULL
           GROUP BY r.action_code
           ORDER BY COUNT(*) DESC)
         WHERE ROWNUM = 1)                                                  AS top_reject_code,
        ROUND(AVG(
          CASE WHEN a.response_date_and_time IS NOT NULL
                AND a.transmission_date_and_time IS NOT NULL
          THEN (a.response_date_and_time - a.transmission_date_and_time) * 86400
          ELSE NULL END), 3)                                                AS avg_latency_sec,
        SUM(CASE
              WHEN a.billing_currency = '504' THEN a.billing_amount
              WHEN a.billing_amount IS NOT NULL AND a.conversion_rate IS NOT NULL
                   AND a.conversion_rate > 0
              THEN a.billing_amount * a.conversion_rate
              ELSE a.transaction_amount
            END)                                                            AS total_amount_mad
      FROM AUTHO_ACTIVITY_ADM a
      WHERE a.business_date = :date
        AND a.acquiring_country_code IS NOT NULL
        AND a.message_type IN ('1100','1102','1110','1200','1210')
      GROUP BY a.acquiring_country_code
      ORDER BY total_tx DESC
      """, nativeQuery = true)
  List<Object[]> findZoneHealthByDate(@Param("date") LocalDate date);

  /**
   * Distribution des top codes de rejet pour un pays et une date.
   * Résultat : [action_code, reject_code, count]
   */
  @Query(value = """
      SELECT action_code, reject_code, COUNT(*) AS cnt
      FROM AUTHO_ACTIVITY_ADM
      WHERE business_date = :date
        AND acquiring_country_code = :country
        AND action_code != '000'
        AND action_code IS NOT NULL
      GROUP BY action_code, reject_code
      ORDER BY cnt DESC
      FETCH FIRST 10 ROWS ONLY
      """, nativeQuery = true)
  List<Object[]> findTopRejectCodesForCountry(
      @Param("date") LocalDate date,
      @Param("country") String country);

  /**
   * Agrégats multi-zone avec conversion pivot MAD pour graphiques.
   * Résultat : [country_code, currency, volume_mad, tx_count]
   * Utilisé pour la heatmap de volume comparatif.
   */
  @Query(value = """
      SELECT
        acquiring_country_code AS country_code,
        transaction_currency   AS currency,
        COUNT(*)               AS tx_count,
        SUM(CASE
              WHEN billing_currency = '504' THEN billing_amount
              WHEN billing_amount IS NOT NULL AND conversion_rate IS NOT NULL
                   AND conversion_rate > 0
              THEN billing_amount * conversion_rate
              ELSE transaction_amount
            END)               AS volume_mad
      FROM AUTHO_ACTIVITY_ADM
      WHERE business_date BETWEEN :fromDate AND :toDate
        AND acquiring_country_code IN (:countries)
        AND transaction_currency IN (:currencies)
        AND message_type IN ('1100','1102','1110','1200','1210')
      GROUP BY acquiring_country_code, transaction_currency
      ORDER BY volume_mad DESC
      """, nativeQuery = true)
  List<Object[]> findMultiZoneVolume(
      @Param("fromDate") LocalDate fromDate,
      @Param("toDate") LocalDate toDate,
      @Param("countries") List<String> countries,
      @Param("currencies") List<String> currencies);
}
