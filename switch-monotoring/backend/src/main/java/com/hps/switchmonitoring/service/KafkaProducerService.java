package com.hps.switchmonitoring.service;

import com.hps.switchmonitoring.api.dto.AlertEvent;
import com.hps.switchmonitoring.api.dto.SocketLogEvent;
import com.hps.switchmonitoring.api.dto.TransactionEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Service;

/**
 * Service pour publier les événements vers les topics Kafka
 * Centralise la logique de production des événements
 */
@Service
public class KafkaProducerService {

  private static final Logger logger = LoggerFactory.getLogger(KafkaProducerService.class);

  // Topics Kafka
  private static final String CHANNEL_TRANSACTIONS_TOPIC = "channel-transactions";
  private static final String ALERT_EVENTS_TOPIC = "alert-events";
  private static final String SOCKET_LOGS_TOPIC = "socket-logs";
  private static final String PROCESSING_EVENTS_TOPIC = "processing-events";

  @Autowired
  private KafkaTemplate<String, TransactionEvent> transactionKafkaTemplate;

  @Autowired
  private KafkaTemplate<String, AlertEvent> alertKafkaTemplate;

  @Autowired
  private KafkaTemplate<String, SocketLogEvent> socketLogKafkaTemplate;

  /**
   * Publie un événement de transaction vers le topic Kafka
   * Utilise l'externalId comme clé pour guarantir l'ordre des messages par transaction
   *
   * @param event L'événement de transaction à publier
   */
  public void publishTransaction(TransactionEvent event) {
    try {
      String key = event.getExternalId() != null ? event.getExternalId() : event.getId().toString();
      
      Message<TransactionEvent> message = MessageBuilder
          .withPayload(event)
          .setHeader(KafkaHeaders.TOPIC, CHANNEL_TRANSACTIONS_TOPIC)
          .setHeader("kafka_receivedKey", key)
          .setHeader("channel", event.getChannel() != null ? event.getChannel() : "UNKNOWN")
          .setHeader("event_timestamp", System.currentTimeMillis())
          .build();

      transactionKafkaTemplate.send(message).whenComplete((sendResult, ex) -> {
        if (ex != null) {
          logger.error("Erreur lors de la publication de la transaction vers Kafka: {}", 
              event.getExternalId(), ex);
        } else {
          logger.info("Transaction publiée avec succès vers Kafka: {} (partition: {}, offset: {})",
              event.getExternalId(),
              sendResult.getRecordMetadata().partition(),
              sendResult.getRecordMetadata().offset());
        }
      });
    } catch (Exception e) {
      logger.error("Exception lors de la publication de la transaction: {}", event.getExternalId(), e);
    }
  }

  /**
   * Publie un événement d'alerte vers le topic Kafka
   * Utilise l'ID de l'alerte comme clé
   *
   * @param event L'événement d'alerte à publier
   */
  public void publishAlert(AlertEvent event) {
    try {
      String key = event.getId() != null ? event.getId().toString() : "ALERT_" + System.currentTimeMillis();
      
      Message<AlertEvent> message = MessageBuilder
          .withPayload(event)
          .setHeader(KafkaHeaders.TOPIC, ALERT_EVENTS_TOPIC)
          .setHeader("kafka_receivedKey", key)
          .setHeader("severity", event.getSeverity() != null ? event.getSeverity() : "INFO")
          .setHeader("type", event.getAlertType() != null ? event.getAlertType() : "UNKNOWN")
          .setHeader("event_timestamp", System.currentTimeMillis())
          .build();

      alertKafkaTemplate.send(message).whenComplete((sendResult, ex) -> {
        if (ex != null) {
          logger.error("Erreur lors de la publication de l'alerte vers Kafka: {}", 
              event.getId(), ex);
        } else {
          logger.info("Alerte publiée avec succès vers Kafka: {} (type: {}, sévérité: {})",
              event.getId(),
              event.getAlertType(),
              event.getSeverity());
        }
      });
    } catch (Exception e) {
      logger.error("Exception lors de la publication de l'alerte: {}", event.getId(), e);
    }
  }

  /**
   * Publie un log de communication socket vers le topic Kafka
   * Enregistre l'audit trail complet de la communication
   *
   * @param event Le log socket à publier
   */
  public void publishSocketLog(SocketLogEvent event) {
    try {
      String key = event.getTransactionId() != null ? event.getTransactionId() : "LOG_" + System.currentTimeMillis();
      
      Message<SocketLogEvent> message = MessageBuilder
          .withPayload(event)
          .setHeader(KafkaHeaders.TOPIC, SOCKET_LOGS_TOPIC)
          .setHeader("kafka_receivedKey", key)
          .setHeader("channel", event.getChannel() != null ? event.getChannel() : "UNKNOWN")
          .setHeader("host", event.getHost() != null ? event.getHost() : "UNKNOWN")
          .setHeader("event_timestamp", System.currentTimeMillis())
          .build();

      socketLogKafkaTemplate.send(message).whenComplete((sendResult, ex) -> {
        if (ex != null) {
          logger.error("Erreur lors de la publication du log socket vers Kafka: {}", 
              event.getTransactionId(), ex);
        } else {
          logger.debug("Log socket publié avec succès vers Kafka: {} (channel: {}, host: {})",
              event.getTransactionId(),
              event.getChannel(),
              event.getHost());
        }
      });
    } catch (Exception e) {
      logger.error("Exception lors de la publication du log socket: {}", event.getTransactionId(), e);
    }
  }

  /**
   * Publie un événement de transaction brut vers le topic de traitement
   * Pour les transformations et calculs d'analytics
   *
   * @param event L'événement de transaction
   */
  public void publishProcessingEvent(TransactionEvent event) {
    try {
      String key = event.getExternalId() != null ? event.getExternalId() : event.getId().toString();
      
      transactionKafkaTemplate.send(PROCESSING_EVENTS_TOPIC, key, event).whenComplete((sendResult, ex) -> {
        if (ex != null) {
          logger.error("Erreur lors de la publication du événement de traitement: {}", 
              event.getExternalId(), ex);
        } else {
          logger.debug("Événement de traitement publié avec succès: {}", event.getExternalId());
        }
      });
    } catch (Exception e) {
      logger.error("Exception lors de la publication de l'événement de traitement: {}", 
          event.getExternalId(), e);
    }
  }

  /**
   * Envoie un lot de transactions vers Kafka
   * Utile pour les opérations de bulk import ou replay
   *
   * @param events Liste des événements à publier
   */
  public void publishBatchTransactions(java.util.List<TransactionEvent> events) {
    try {
      logger.info("Publication de {} transactions par lot", events.size());
      for (TransactionEvent event : events) {
        publishTransaction(event);
      }
      logger.info("Lot de {} transactions publié avec succès", events.size());
    } catch (Exception e) {
      logger.error("Exception lors de la publication du lot de transactions", e);
    }
  }

  /**
   * Envoie un lot d'alertes vers Kafka
   *
   * @param events Liste des alertes à publier
   */
  public void publishBatchAlerts(java.util.List<AlertEvent> events) {
    try {
      logger.info("Publication de {} alertes par lot", events.size());
      for (AlertEvent event : events) {
        publishAlert(event);
      }
      logger.info("Lot de {} alertes publié avec succès", events.size());
    } catch (Exception e) {
      logger.error("Exception lors de la publication du lot d'alertes", e);
    }
  }
}
