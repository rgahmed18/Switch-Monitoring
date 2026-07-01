package com.hps.switchmonitoring.service;

import com.hps.switchmonitoring.api.dto.AlertEvent;
import com.hps.switchmonitoring.api.dto.CreateAlertRequest;
import com.hps.switchmonitoring.domain.AlertEventEntity;
import com.hps.switchmonitoring.repository.AlertEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service de gestion des alertes
 * Intégration Kafka pour la distribution des événements d'alertes
 */
@Service
public class AlertService {

  private static final Logger logger = LoggerFactory.getLogger(AlertService.class);

  private final AlertEventRepository alertEventRepository;
  private final StreamService streamService;
  private final KafkaProducerService kafkaProducerService;

  public AlertService(AlertEventRepository alertEventRepository, 
                     StreamService streamService,
                     KafkaProducerService kafkaProducerService) {
    this.alertEventRepository = alertEventRepository;
    this.streamService = streamService;
    this.kafkaProducerService = kafkaProducerService;
  }

  public List<AlertEventEntity> getLatestAlerts() {
    return alertEventRepository.findTop100ByOrderByCreatedAtDesc();
  }

  /**
   * Crée une nouvelle alerte et propage l'événement via Kafka et SSE
   * 1. Sauvegarde en base de données
   * 2. Publie vers Kafka (alert-events topic)
   * 3. Notifie les clients connectés via SSE
   *
   * @param request La requête de création d'alerte
   * @return L'alerte créée et persistée
   */
  public AlertEventEntity createAlert(CreateAlertRequest request) {
    try {
      // Créer l'entité
      AlertEventEntity entity = new AlertEventEntity();
      entity.setRuleId(request.getRuleId());
      entity.setTransactionId(request.getTransactionId());
      entity.setType(request.getType());
      entity.setSeverity(request.getSeverity());
      entity.setTitle(request.getTitle());
      entity.setDetails(request.getDetails());
      entity.setStatus("OPEN");
      entity.setCreatedAt(LocalDateTime.now());

      // Sauvegarder en base de données
      AlertEventEntity saved = alertEventRepository.save(entity);
      logger.info("Alerte créée et sauvegardée en DB: {} (type: {}, sévérité: {})", 
          saved.getId(), saved.getType(), saved.getSeverity());

      // Créer l'événement Kafka
      AlertEvent event = convertEntityToEvent(saved);

      // Publier vers Kafka pour les autres services
      kafkaProducerService.publishAlert(event);
      logger.debug("Événement alerte publié vers Kafka: {} (type: {})", saved.getId(), saved.getType());

      // Publier vers SSE pour les clients connectés (Real-time UI update)
      streamService.publishAlert(saved);
      logger.debug("Événement alerte publié vers SSE: {}", saved.getId());

      return saved;
    } catch (Exception e) {
      logger.error("Erreur lors de la création de l'alerte: {}", request.getTitle(), e);
      throw new RuntimeException("Erreur lors de la création de l'alerte", e);
    }
  }

  /**
   * Convertit une entité AlertEventEntity en événement Kafka
   */
  private AlertEvent convertEntityToEvent(AlertEventEntity entity) {
    AlertEvent event = new AlertEvent();
    event.setId(entity.getId());
    event.setAlertType(entity.getType());
    event.setSeverity(entity.getSeverity());
    event.setStatus(entity.getStatus());
    event.setMessage(entity.getDetails());
    event.setRuleId(entity.getRuleId() != null ? String.valueOf(entity.getRuleId()) : null);
    event.setTransactionId(entity.getTransactionId());
    event.setCreatedAt(entity.getCreatedAt());
    event.setUpdatedAt(entity.getAckAt() != null ? entity.getAckAt() : entity.getCreatedAt());
    event.setAcknowledgedAt(entity.getAckAt());
    event.setResolvedAt(entity.getResolvedAt());
    event.setEventTimestamp(LocalDateTime.now());
    return event;
  }
}
