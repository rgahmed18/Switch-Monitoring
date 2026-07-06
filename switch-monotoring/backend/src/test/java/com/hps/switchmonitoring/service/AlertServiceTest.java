package com.hps.switchmonitoring.service;

import com.hps.switchmonitoring.api.dto.CreateAlertRequest;
import com.hps.switchmonitoring.domain.AlertEventEntity;
import com.hps.switchmonitoring.repository.AlertEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AlertServiceTest {

  @Mock private AlertEventRepository alertEventRepository;
  @Mock private StreamService streamService;
  @Mock private KafkaProducerService kafkaProducerService;

  private AlertService alertService;

  @BeforeEach
  void setUp() {
    alertService = new AlertService(alertEventRepository, streamService, kafkaProducerService);
  }

  @Test
  void createAlert_devrait_sauvegarder_publier_kafka_et_notifier_sse() {
    CreateAlertRequest request = new CreateAlertRequest();
    request.setRuleId(42L);
    request.setTransactionId(1001L);
    request.setType("FRAUD_SUSPECT");
    request.setSeverity("CRITICAL");
    request.setTitle("Montant anormal detecte");
    request.setDetails("Montant 50000 MAD hors plage habituelle");

    AlertEventEntity saved = new AlertEventEntity();
    saved.setType("FRAUD_SUSPECT");
    saved.setSeverity("CRITICAL");
    saved.setStatus("OPEN");
    saved.setTitle("Montant anormal detecte");

    when(alertEventRepository.save(any(AlertEventEntity.class))).thenReturn(saved);

    AlertEventEntity result = alertService.createAlert(request);

    assertThat(result).isSameAs(saved);

    ArgumentCaptor<AlertEventEntity> entityCaptor = ArgumentCaptor.forClass(AlertEventEntity.class);
    verify(alertEventRepository).save(entityCaptor.capture());
    AlertEventEntity toPersist = entityCaptor.getValue();
    assertThat(toPersist.getStatus()).isEqualTo("OPEN");
    assertThat(toPersist.getTitle()).isEqualTo("Montant anormal detecte");
    assertThat(toPersist.getRuleId()).isEqualTo(42L);
    assertThat(toPersist.getTransactionId()).isEqualTo(1001L);
    assertThat(toPersist.getCreatedAt()).isNotNull();

    // Non-regression sur l'orchestration : DB -> Kafka -> SSE, dans cet ordre fonctionnel
    verify(kafkaProducerService, times(1)).publishAlert(any());
    verify(streamService, times(1)).publishAlert(saved);
  }

  @Test
  void createAlert_devrait_propager_lexception_si_la_sauvegarde_echoue() {
    CreateAlertRequest request = new CreateAlertRequest();
    request.setType("FRAUD_SUSPECT");
    request.setSeverity("CRITICAL");
    request.setTitle("Test");

    when(alertEventRepository.save(any())).thenThrow(new RuntimeException("DB down"));

    assertThrows(RuntimeException.class, () -> alertService.createAlert(request));

    // Si la persistance echoue, aucune propagation ne doit avoir lieu
    verifyNoInteractions(kafkaProducerService);
    verifyNoInteractions(streamService);
  }

  @Test
  void getLatestAlerts_devrait_deleguer_au_repository() {
    AlertEventEntity a = new AlertEventEntity();
    when(alertEventRepository.findTop100ByOrderByCreatedAtDesc()).thenReturn(java.util.List.of(a));

    var result = alertService.getLatestAlerts();

    assertThat(result).containsExactly(a);
  }
}
