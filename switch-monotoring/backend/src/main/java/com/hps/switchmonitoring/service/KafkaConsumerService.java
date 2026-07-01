package com.hps.switchmonitoring.service;

import com.hps.switchmonitoring.api.dto.AlertEvent;
import com.hps.switchmonitoring.api.dto.SocketLogEvent;
import com.hps.switchmonitoring.api.dto.TransactionEvent;
import com.hps.switchmonitoring.domain.AlertEventEntity;
import com.hps.switchmonitoring.domain.AutohoActivityAdmEntity;
import com.hps.switchmonitoring.domain.SocketLogEntity;
import com.hps.switchmonitoring.repository.AlertEventRepository;
import com.hps.switchmonitoring.repository.AutohoActivityAdmRepository;
import com.hps.switchmonitoring.repository.SocketLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Service pour consommer les événements provenant des topics Kafka
 * Sauvegarde les événements dans AUTHO_ACTIVITY_ADM et notifie les clients
 */
@Service
public class KafkaConsumerService {

  private static final Logger logger = LoggerFactory.getLogger(KafkaConsumerService.class);

  @Autowired
  private AutohoActivityAdmRepository authoRepository;

  @Autowired
  private AlertEventRepository alertEventRepository;

  @Autowired
  private SocketLogRepository socketLogRepository;

  @Autowired
  private StreamService streamService;

  @Autowired
  private AlertService alertService;

  @Autowired
  private KafkaErrorHandler kafkaErrorHandler;

  // ==================== TRANSACTION LISTENERS ====================

  /**
   * Consomme les événements de transactions du topic channel-transactions
   * Sauvegarde dans AUTHO_ACTIVITY_ADM et notifie les clients via SSE
   */
  @KafkaListener(
      topics = "channel-transactions",
      containerFactory = "transactionKafkaListenerContainerFactory",
      groupId = "transaction-consumer-group"
  )
  public void consumeTransaction(
      @Payload TransactionEvent event,
      @Header(name = "channel", required = false) String channel,
      @Header(name = KafkaHeaders.RECEIVED_PARTITION, required = false) int partition,
      @Header(name = KafkaHeaders.OFFSET, required = false) long offset) {

    try {
      logger.info("Consommation d'une transaction depuis Kafka: {} (partition: {}, offset: {})",
          event.getExternalId(), partition, offset);

      // Convertir l'événement Kafka en entité AUTHO_ACTIVITY_ADM
      AutohoActivityAdmEntity transaction = convertEventToEntity(event);

      // Sauvegarder en base de données
      AutohoActivityAdmEntity saved = authoRepository.save(transaction);
      logger.debug("Transaction sauvegardée dans AUTHO_ACTIVITY_ADM: {}", saved.getReferenceNumber());

      // Publier l'événement vers les clients SSE (Frontend)
      streamService.publishTransaction(saved);

      logger.info("Transaction traitée avec succès: {}", event.getExternalId());

    } catch (Exception e) {
      logger.error("❌ Erreur lors de la consommation de la transaction: {}", event.getExternalId(), e);
      kafkaErrorHandler.handleTransactionError(event, e, partition, offset);
    }
  }

  /**
   * Consomme les événements de transactions du topic processing-events
   * Utilisé pour les calculs d'analytics, SLA, et transformations
   */
  @KafkaListener(
      topics = "processing-events",
      containerFactory = "transactionKafkaListenerContainerFactory",
      groupId = "processing-consumer-group"
  )
  public void consumeProcessingEvent(
      @Payload TransactionEvent event,
      @Header(name = KafkaHeaders.RECEIVED_PARTITION, required = false) int partition) {

    try {
      logger.debug("Traitement d'un événement d'analytics: {} (partition: {})",
          event.getExternalId(), partition);

      // Traitements supplémentaires: SLA, statistiques, alertes, analytics
      logger.debug("Événement de traitement terminé: {}", event.getExternalId());

    } catch (Exception e) {
      logger.error("❌ Erreur lors du traitement de l'événement: {}", event.getExternalId(), e);
      kafkaErrorHandler.handleProcessingEventError(event, e, partition, 0);
    }
  }

  // ==================== ALERT LISTENERS ====================

  /**
   * Consomme les événements d'alertes du topic alert-events
   */
  @KafkaListener(
      topics = "alert-events",
      containerFactory = "alertKafkaListenerContainerFactory",
      groupId = "alert-consumer-group"
  )
  public void consumeAlert(
      @Payload AlertEvent event,
      @Header(name = "severity", required = false) String severity,
      @Header(name = KafkaHeaders.RECEIVED_PARTITION, required = false) int partition,
      @Header(name = KafkaHeaders.OFFSET, required = false) long offset) {

    try {
      logger.info("Consommation d'une alerte depuis Kafka: {} (severity: {}, partition: {}, offset: {})",
          event.getId(), severity, partition, offset);

      AlertEventEntity alert = convertAlertEventToEntity(event);
      AlertEventEntity savedAlert = alertEventRepository.save(alert);
      logger.debug("Alerte sauvegardée en base de données: {}", savedAlert.getId());

      streamService.publishAlert(savedAlert);

      logger.info("Alerte traitée avec succès: {} (type: {}, sévérité: {})",
          event.getId(), event.getAlertType(), severity);

    } catch (Exception e) {
      logger.error("❌ Erreur lors de la consommation de l'alerte: {}", event.getId(), e);
      kafkaErrorHandler.handleAlertError(event, e, partition, offset);
    }
  }

  // ==================== SOCKET LOG LISTENERS ====================

  /**
   * Consomme les logs de communication socket du topic socket-logs
   */
  @KafkaListener(
      topics = "socket-logs",
      containerFactory = "socketLogKafkaListenerContainerFactory",
      groupId = "socketlog-consumer-group"
  )
  public void consumeSocketLog(
      @Payload SocketLogEvent event,
      @Header(name = KafkaHeaders.RECEIVED_PARTITION, required = false) int partition,
      @Header(name = KafkaHeaders.OFFSET, required = false) long offset) {

    try {
      logger.debug("Consommation d'un log socket depuis Kafka: {} (partition: {}, offset: {})",
          event.getTransactionId(), partition, offset);

      SocketLogEntity socketLog = convertSocketLogEventToEntity(event);
      SocketLogEntity savedLog = socketLogRepository.save(socketLog);
      logger.debug("Log socket sauvegardé en base de données: {}", savedLog.getId());

    } catch (Exception e) {
      logger.error("❌ Erreur lors de la consommation du log socket: {}", event.getTransactionId(), e);
      kafkaErrorHandler.handleSocketLogError(event, e, partition, offset);
    }
  }

  // ==================== CONVERTERS ====================

  /**
   * Convertit un événement Kafka TransactionEvent en entité AUTHO_ACTIVITY_ADM
   * Mapping des champs legacy vers le schéma officiel
   */
  private AutohoActivityAdmEntity convertEventToEntity(TransactionEvent event) {
    AutohoActivityAdmEntity entity = new AutohoActivityAdmEntity();

    // Clés primaires
    entity.setReferenceNumber(event.getExternalId() != null ? 
        padOrTruncate(event.getExternalId(), 12) : generateReferenceNumber());
    entity.setInternalStan(event.getStan() != null ? 
        padOrTruncate(event.getStan(), 6) : generateStan());
    entity.setExternalStan(generateStan());
    entity.setRoutingCode("000001");
    entity.setCaptureCode("000001");

    // Identification
    entity.setMessageType(event.getMtiCode() != null ? event.getMtiCode() : "0100");
    entity.setFunctionCode("100");
    entity.setProcessingCode("00");
    entity.setActionCode(event.getResponseCode() != null ? event.getResponseCode() : "00");

    // Carte
    entity.setCardNumber(event.getCardNumberMasked());

    // Montants
    entity.setTransactionAmount(event.getAmount());
    entity.setTransactionCurrency(event.getCurrency() != null ? event.getCurrency() : "MAD");

    // Dates
    entity.setTransactionLocalDate(LocalDate.now());
    entity.setTransmissionDateAndTime(event.getTimestamp() != null ? event.getTimestamp() : LocalDateTime.now());
    entity.setResponseDateAndTime(LocalDateTime.now());
    entity.setBusinessDate(LocalDate.now());

    // Terminal / Accepteur
    entity.setCardAcceptorTermId(event.getTerminalId());
    entity.setCardAccNameAddress(event.getMerchantName());
    entity.setCardAcceptorActivity(event.getMccCode());

    // POS
    entity.setPosEntryMode(event.getPosEntryMode());

    // Réseau
    entity.setAcquirerBank(event.getAcquirerId());
    entity.setIssuingBank(event.getIssuerId());

    // Flags
    entity.setAuthoFlag("00".equals(entity.getActionCode()) ? "Y" : "N");
    entity.setTransactionFlag("Y");
    entity.setMatchingStatus("M");

    // Audit
    entity.setUserCreate("KAFKA_CONSUMER");
    entity.setDateCreate(LocalDate.now());

    return entity;
  }

  /**
   * Convertit un événement Kafka AlertEvent en entité JPA AlertEventEntity
   */
  private AlertEventEntity convertAlertEventToEntity(AlertEvent event) {
    AlertEventEntity entity = new AlertEventEntity();
    entity.setType(event.getAlertType());
    entity.setSeverity(event.getSeverity());
    entity.setStatus(event.getStatus() != null ? event.getStatus() : "OPEN");
    entity.setDetails(event.getMessage());
    entity.setRuleId(event.getRuleId() != null ? Long.parseLong(event.getRuleId()) : null);
    entity.setTransactionId(event.getTransactionId());
    entity.setTitle(event.getAlertType());
    entity.setCreatedAt(event.getCreatedAt() != null ? event.getCreatedAt() : LocalDateTime.now());
    return entity;
  }

  /**
   * Convertit un événement Kafka SocketLogEvent en entité JPA SocketLogEntity
   */
  private SocketLogEntity convertSocketLogEventToEntity(SocketLogEvent event) {
    SocketLogEntity entity = new SocketLogEntity();
    entity.setTransactionId(Long.parseLong(event.getTransactionId()));
    entity.setChannel(event.getChannel());
    entity.setSocketHost(event.getHost());
    entity.setSocketPort(event.getPort());
    entity.setRetryCount(event.getRetryCount());
    entity.setErrorCode(event.getErrorCode());
    entity.setErrorMessage(event.getErrorMessage());
    entity.setHexDump(event.getRequestHex());
    entity.setSocketConnectTimeMs(event.getConnectTimeMs());
    entity.setSocketTransferTimeMs(event.getTransferTimeMs());
    entity.setLogTimestamp(event.getCreatedAt() != null ? event.getCreatedAt() : LocalDateTime.now());
    entity.setCreatedAt(event.getCreatedAt() != null ? event.getCreatedAt() : LocalDateTime.now());
    entity.setStatus("SUCCESS");
    entity.setDirection("OUTBOUND");
    return entity;
  }

  // ==================== UTILITY METHODS ====================

  private String padOrTruncate(String value, int length) {
    if (value == null) return String.format("%" + length + "s", "").replace(' ', '0');
    if (value.length() > length) return value.substring(0, length);
    return String.format("%-" + length + "s", value);
  }

  private String generateReferenceNumber() {
    return "REF" + String.format("%09d", System.currentTimeMillis() % 1000000000L);
  }

  private String generateStan() {
    return String.format("%06d", (int)(Math.random() * 999999));
  }
}
