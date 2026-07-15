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

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Service pour gérer les erreurs Kafka et envoyer les messages vers les DLQ (Dead Letter Queue)
 * Permet la traçabilité complète des messages en erreur et leur récupération
 */
@Service
public class KafkaErrorHandler {

  private static final Logger logger = LoggerFactory.getLogger(KafkaErrorHandler.class);

  // Dead Letter Queue Topics
  private static final String CHANNEL_TRANSACTIONS_DLQ = "channel-transactions-dlq";
  private static final String ALERT_EVENTS_DLQ = "alert-events-dlq";
  private static final String SOCKET_LOGS_DLQ = "socket-logs-dlq";
  private static final String PROCESSING_EVENTS_DLQ = "processing-events-dlq";

  @Autowired
  private KafkaTemplate<String, String> dlqKafkaTemplate;

  /**
   * Envoie un message de transaction vers son DLQ en cas d'erreur
   * Ajoute des headers de debug pour traçabilité
   *
   * @param event L'événement de transaction échoué
   * @param exception L'exception levée
   * @param partition La partition source
   * @param offset L'offset source
   */
  public void handleTransactionError(TransactionEvent event, Exception exception, 
                                     int partition, long offset) {
    try {
      String key = event.getExternalId() != null ? event.getExternalId() : "ERROR_" + System.currentTimeMillis();
      String errorPayload = buildErrorPayload(event.toString(), exception);

      Message<String> dlqMessage = MessageBuilder
          .withPayload(errorPayload)
          .setHeader(KafkaHeaders.TOPIC, CHANNEL_TRANSACTIONS_DLQ)
          .setHeader("original_topic", "channel-transactions")
          .setHeader("original_partition", partition)
          .setHeader("original_offset", offset)
          .setHeader("error_timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME))
          .setHeader("error_message", exception.getMessage())
          .setHeader("error_class", exception.getClass().getSimpleName())
          .setHeader("event_id", key)
          .setHeader("dlq_event_timestamp", System.currentTimeMillis())
          .build();

      dlqKafkaTemplate.send(dlqMessage).whenComplete((sendResult, ex) -> {
        if (ex != null) {
          logger.error("Erreur lors de l'envoi du message d'erreur transaction vers le DLQ: {}",
              key, ex);
        } else {
          logger.warn("Message de transaction en erreur envoyé au DLQ: {} (partition: {}, offset: {})",
              key, sendResult.getRecordMetadata().partition(), sendResult.getRecordMetadata().offset());
        }
      });
    } catch (Exception e) {
      logger.error("Exception critique lors du traitement DLQ transaction: {}",
          event.getExternalId(), e);
    }
  }

  /**
   * Envoie un message d'alerte vers son DLQ en cas d'erreur
   *
   * @param event L'événement d'alerte échoué
   * @param exception L'exception levée
   * @param partition La partition source
   * @param offset L'offset source
   */
  public void handleAlertError(AlertEvent event, Exception exception, 
                               int partition, long offset) {
    try {
      String key = event.getId() != null ? event.getId().toString() : "ERROR_ALERT_" + System.currentTimeMillis();
      String errorPayload = buildErrorPayload(event.toString(), exception);

      Message<String> dlqMessage = MessageBuilder
          .withPayload(errorPayload)
          .setHeader(KafkaHeaders.TOPIC, ALERT_EVENTS_DLQ)
          .setHeader("original_topic", "alert-events")
          .setHeader("original_partition", partition)
          .setHeader("original_offset", offset)
          .setHeader("error_timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME))
          .setHeader("error_message", exception.getMessage())
          .setHeader("error_class", exception.getClass().getSimpleName())
          .setHeader("event_id", key)
          .setHeader("dlq_event_timestamp", System.currentTimeMillis())
          .build();

      dlqKafkaTemplate.send(dlqMessage).whenComplete((sendResult, ex) -> {
        if (ex != null) {
          logger.error("Erreur lors de l'envoi du message d'erreur alerte vers le DLQ: {}",
              key, ex);
        } else {
          logger.warn("Message d'alerte en erreur envoyé au DLQ: {} (partition: {}, offset: {})",
              key, sendResult.getRecordMetadata().partition(), sendResult.getRecordMetadata().offset());
        }
      });
    } catch (Exception e) {
      logger.error("Exception critique lors du traitement DLQ alerte: {}",
          event.getId(), e);
    }
  }

  /**
   * Envoie un message de log socket vers son DLQ en cas d'erreur
   *
   * @param event L'événement socket échoué
   * @param exception L'exception levée
   * @param partition La partition source
   * @param offset L'offset source
   */
  public void handleSocketLogError(SocketLogEvent event, Exception exception, 
                                   int partition, long offset) {
    try {
      String key = event.getTransactionId() != null ? event.getTransactionId() : "ERROR_SOCKET_" + System.currentTimeMillis();
      String errorPayload = buildErrorPayload(event.toString(), exception);

      Message<String> dlqMessage = MessageBuilder
          .withPayload(errorPayload)
          .setHeader(KafkaHeaders.TOPIC, SOCKET_LOGS_DLQ)
          .setHeader("original_topic", "socket-logs")
          .setHeader("original_partition", partition)
          .setHeader("original_offset", offset)
          .setHeader("error_timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME))
          .setHeader("error_message", exception.getMessage())
          .setHeader("error_class", exception.getClass().getSimpleName())
          .setHeader("event_id", key)
          .setHeader("dlq_event_timestamp", System.currentTimeMillis())
          .build();

      dlqKafkaTemplate.send(dlqMessage).whenComplete((sendResult, ex) -> {
        if (ex != null) {
          logger.error("Erreur lors de l'envoi du message d'erreur socket vers le DLQ: {}",
              key, ex);
        } else {
          logger.warn("Message socket en erreur envoyé au DLQ: {} (partition: {}, offset: {})",
              key, sendResult.getRecordMetadata().partition(), sendResult.getRecordMetadata().offset());
        }
      });
    } catch (Exception e) {
      logger.error("Exception critique lors du traitement DLQ socket: {}",
          event.getTransactionId(), e);
    }
  }

  /**
   * Envoie un message de traitement vers son DLQ en cas d'erreur
   *
   * @param event L'événement de traitement échoué
   * @param exception L'exception levée
   * @param partition La partition source
   * @param offset L'offset source
   */
  public void handleProcessingEventError(TransactionEvent event, Exception exception, 
                                        int partition, long offset) {
    try {
      String key = event.getExternalId() != null ? event.getExternalId() : "ERROR_PROCESSING_" + System.currentTimeMillis();
      String errorPayload = buildErrorPayload(event.toString(), exception);

      Message<String> dlqMessage = MessageBuilder
          .withPayload(errorPayload)
          .setHeader(KafkaHeaders.TOPIC, PROCESSING_EVENTS_DLQ)
          .setHeader("original_topic", "processing-events")
          .setHeader("original_partition", partition)
          .setHeader("original_offset", offset)
          .setHeader("error_timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME))
          .setHeader("error_message", exception.getMessage())
          .setHeader("error_class", exception.getClass().getSimpleName())
          .setHeader("event_id", key)
          .setHeader("dlq_event_timestamp", System.currentTimeMillis())
          .build();

      dlqKafkaTemplate.send(dlqMessage).whenComplete((sendResult, ex) -> {
        if (ex != null) {
          logger.error("Erreur lors de l'envoi du message d'erreur traitement vers le DLQ: {}",
              key, ex);
        } else {
          logger.warn("Message de traitement en erreur envoyé au DLQ: {} (partition: {}, offset: {})",
              key, sendResult.getRecordMetadata().partition(), sendResult.getRecordMetadata().offset());
        }
      });
    } catch (Exception e) {
      logger.error("Exception critique lors du traitement DLQ événement: {}",
          event.getExternalId(), e);
    }
  }

  /**
   * Construit un payload d'erreur avec contexte complet
   *
   * @param originalEvent L'événement original
   * @param exception L'exception levée
   * @return Le payload formaté JSON pour le DLQ
   */
  private String buildErrorPayload(String originalEvent, Exception exception) {
    return "{"
        + "\"timestamp\": \"" + LocalDateTime.now() + "\", "
        + "\"original_event\": " + originalEvent.replace("\"", "\\\"") + ", "
        + "\"error_message\": \"" + exception.getMessage().replace("\"", "\\\"") + "\", "
        + "\"error_class\": \"" + exception.getClass().getName() + "\", "
        + "\"error_stacktrace\": \"" + buildStackTrace(exception).replace("\"", "\\\"") + "\""
        + "}";
  }

  /**
   * Crée un format lisible de la stack trace
   */
  private String buildStackTrace(Exception exception) {
    StringBuilder sb = new StringBuilder();
    for (StackTraceElement element : exception.getStackTrace()) {
      if (sb.length() > 0) {
        sb.append("; ");
      }
      sb.append(element.getClassName()).append(".").append(element.getMethodName())
          .append(" (line ").append(element.getLineNumber()).append(")");
      if (sb.length() > 500) break; // Limiter la taille
    }
    return sb.toString();
  }
}
