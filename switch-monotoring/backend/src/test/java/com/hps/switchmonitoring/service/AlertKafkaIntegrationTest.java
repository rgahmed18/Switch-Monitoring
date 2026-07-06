package com.hps.switchmonitoring.service;

import com.hps.switchmonitoring.api.dto.AlertEvent;
import com.hps.switchmonitoring.config.KafkaConfig;
import com.hps.switchmonitoring.domain.AlertEventEntity;
import com.hps.switchmonitoring.repository.AlertEventRepository;
import com.hps.switchmonitoring.repository.AutohoActivityAdmRepository;
import com.hps.switchmonitoring.repository.SocketLogRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.TestPropertySource;

import java.time.Duration;
import java.time.LocalDateTime;

import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Test d'integration du pipeline Kafka reel : Producer -> broker embarque -> Consumer -> persistance.
 * Le contexte Spring charge uniquement les composants Kafka + StreamService (SSE en memoire),
 * pour eviter de dependre d'un vrai Oracle/SMTP au demarrage du contexte applicatif complet.
 */
@SpringBootTest(
    classes = {
        KafkaConfig.class,
        KafkaProducerService.class,
        KafkaConsumerService.class,
        KafkaErrorHandler.class,
        StreamService.class,
        AlertService.class
    },
    properties = {
        "spring.kafka.bootstrap-servers=${spring.embedded.kafka.brokers}",
        "kafka.partitions=1"
    }
)
@EmbeddedKafka(
    partitions = 1,
    topics = { "alert-events", "alert-events-dlq", "channel-transactions", "channel-transactions-dlq",
               "socket-logs", "socket-logs-dlq", "processing-events", "processing-events-dlq" }
)
@TestPropertySource(properties = "spring.kafka.consumer.auto-offset-reset=earliest")
@DirtiesContext
class AlertKafkaIntegrationTest {

  @Autowired private KafkaTemplate<String, AlertEvent> alertKafkaTemplate;

  @MockBean private AlertEventRepository alertEventRepository;
  @MockBean private AutohoActivityAdmRepository autohoActivityAdmRepository;
  @MockBean private SocketLogRepository socketLogRepository;

  @Test
  void un_message_publie_sur_alert_events_devrait_etre_persiste_par_le_consumer() {
    AlertEvent event = new AlertEvent();
    event.setId(999L);
    event.setAlertType("SLA_BREACH");
    event.setSeverity("HIGH");
    event.setStatus("OPEN");
    event.setMessage("SLA depasse de 3s");
    event.setCreatedAt(LocalDateTime.now());

    AlertEventEntity persisted = new AlertEventEntity();
    persisted.setType("SLA_BREACH");
    persisted.setSeverity("HIGH");
    when(alertEventRepository.save(any(AlertEventEntity.class))).thenReturn(persisted);

    alertKafkaTemplate.send("alert-events", "999", event);

    // Le consumer Kafka est asynchrone : on attend la persistance avec un timeout explicite
    await().atMost(Duration.ofSeconds(10)).untilAsserted(() ->
        org.mockito.Mockito.verify(alertEventRepository).save(
            org.mockito.ArgumentMatchers.argThat(e -> "SLA_BREACH".equals(e.getType())))
    );
  }
}
