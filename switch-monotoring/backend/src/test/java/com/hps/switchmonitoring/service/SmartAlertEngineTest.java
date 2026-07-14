package com.hps.switchmonitoring.service;

import com.hps.switchmonitoring.api.dto.CreateAlertRequest;
import com.hps.switchmonitoring.domain.AutohoActivityAdmEntity;
import com.hps.switchmonitoring.repository.AutohoActivityAdmRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Verifie les 7 regles du moteur d'alertes intelligentes (taux de refus,
 * montant moyen, codes fraude, SLA, ATC suspect, TVR anormal, cross-devise).
 * Chaque regle est testee isolement en desactivant le seuil minimal (total >= 5)
 * des autres compteurs via des mocks neutres.
 */
@ExtendWith(MockitoExtension.class)
class SmartAlertEngineTest {

  @Mock private AutohoActivityAdmRepository repository;
  @Mock private AlertService alertService;

  private SmartAlertEngine engine;

  @BeforeEach
  void setUp() {
    engine = new SmartAlertEngine(repository, alertService);
    // Valeurs neutres par defaut : aucune regle ne doit se declencher sans setup explicite.
    // lenient() car chaque test ne consomme qu'un sous-ensemble de ces stubs.
    lenient().when(repository.countByBusinessDate(any())).thenReturn(10L);
    lenient().when(repository.countDeclinedByBusinessDate(any())).thenReturn(0L);
    lenient().when(repository.avgAmountByBusinessDate(any())).thenReturn(BigDecimal.ZERO);
    lenient().when(repository.countFraudActionCodesByDate(any())).thenReturn(0L);
    lenient().when(repository.countSlaBreachesByDate(any())).thenReturn(0L);
    lenient().when(repository.findSuspiciousAtcByDate(any())).thenReturn(List.of());
    lenient().when(repository.countChipTransactionsByDate(any())).thenReturn(0L);
    lenient().when(repository.countNonCleanTvrByDate(any())).thenReturn(0L);
    lenient().when(repository.countCrossCurrencyByDate(any())).thenReturn(0L);
  }

  @Test
  void evaluateRules_ne_devrait_declencher_aucune_alerte_si_moins_de_5_transactions() {
    when(repository.countByBusinessDate(any())).thenReturn(3L);

    engine.evaluateRules();

    verify(alertService, never()).createAlert(any());
  }

  @Test
  void evaluateRules_ne_devrait_rien_declencher_avec_des_donnees_neutres() {
    engine.evaluateRules();

    verify(alertService, never()).createAlert(any());
  }

  @Test
  void evaluateRules_devrait_declencher_HIGH_DECLINE_RATE_au_dela_de_30pct() {
    when(repository.countByBusinessDate(any())).thenReturn(100L);
    when(repository.countDeclinedByBusinessDate(any())).thenReturn(40L);

    engine.evaluateRules();

    ArgumentCaptor<CreateAlertRequest> captor = ArgumentCaptor.forClass(CreateAlertRequest.class);
    verify(alertService).createAlert(captor.capture());
    assertThat(captor.getValue().getType()).isEqualTo("HIGH_DECLINE_RATE");
    assertThat(captor.getValue().getSeverity()).isEqualTo("warning");
  }

  @Test
  void evaluateRules_ne_devrait_pas_declencher_HIGH_DECLINE_RATE_sous_30pct() {
    when(repository.countByBusinessDate(any())).thenReturn(100L);
    when(repository.countDeclinedByBusinessDate(any())).thenReturn(20L);

    engine.evaluateRules();

    verify(alertService, never()).createAlert(any());
  }

  @Test
  void evaluateRules_devrait_declencher_HIGH_AVG_AMOUNT_au_dela_de_50000() {
    when(repository.avgAmountByBusinessDate(any())).thenReturn(new BigDecimal("75000"));

    engine.evaluateRules();

    ArgumentCaptor<CreateAlertRequest> captor = ArgumentCaptor.forClass(CreateAlertRequest.class);
    verify(alertService).createAlert(captor.capture());
    assertThat(captor.getValue().getType()).isEqualTo("HIGH_AVG_AMOUNT");
    assertThat(captor.getValue().getSeverity()).isEqualTo("info");
  }

  @Test
  void evaluateRules_devrait_declencher_FRAUD_ACTION_CODES_severite_critical() {
    when(repository.countFraudActionCodesByDate(any())).thenReturn(2L);

    engine.evaluateRules();

    ArgumentCaptor<CreateAlertRequest> captor = ArgumentCaptor.forClass(CreateAlertRequest.class);
    verify(alertService).createAlert(captor.capture());
    assertThat(captor.getValue().getType()).isEqualTo("FRAUD_ACTION_CODES");
    assertThat(captor.getValue().getSeverity()).isEqualTo("critical");
  }

  @Test
  void evaluateRules_devrait_declencher_SLA_BREACH_critical_si_taux_superieur_5pct() {
    when(repository.countByBusinessDate(any())).thenReturn(100L);
    when(repository.countSlaBreachesByDate(any())).thenReturn(10L);

    engine.evaluateRules();

    ArgumentCaptor<CreateAlertRequest> captor = ArgumentCaptor.forClass(CreateAlertRequest.class);
    verify(alertService).createAlert(captor.capture());
    assertThat(captor.getValue().getType()).isEqualTo("SLA_BREACH");
    assertThat(captor.getValue().getSeverity()).isEqualTo("critical");
  }

  @Test
  void evaluateRules_devrait_declencher_SLA_BREACH_warning_si_taux_faible() {
    when(repository.countByBusinessDate(any())).thenReturn(100L);
    when(repository.countSlaBreachesByDate(any())).thenReturn(1L);

    engine.evaluateRules();

    ArgumentCaptor<CreateAlertRequest> captor = ArgumentCaptor.forClass(CreateAlertRequest.class);
    verify(alertService).createAlert(captor.capture());
    assertThat(captor.getValue().getSeverity()).isEqualTo("warning");
  }

  @Test
  void evaluateRules_devrait_declencher_SUSPICIOUS_ATC_avec_pans_masques() {
    AutohoActivityAdmEntity entity = new AutohoActivityAdmEntity();
    entity.setCardNumber("4000005327187750");
    when(repository.findSuspiciousAtcByDate(any())).thenReturn(List.of(entity));

    engine.evaluateRules();

    ArgumentCaptor<CreateAlertRequest> captor = ArgumentCaptor.forClass(CreateAlertRequest.class);
    verify(alertService).createAlert(captor.capture());
    assertThat(captor.getValue().getType()).isEqualTo("SUSPICIOUS_ATC");
    assertThat(captor.getValue().getDetails()).contains("7750").doesNotContain("4000005327187750");
  }

  @Test
  void evaluateRules_devrait_declencher_HIGH_TVR_ANOMALY_RATE_au_dela_de_15pct() {
    when(repository.countChipTransactionsByDate(any())).thenReturn(20L);
    when(repository.countNonCleanTvrByDate(any())).thenReturn(5L);

    engine.evaluateRules();

    ArgumentCaptor<CreateAlertRequest> captor = ArgumentCaptor.forClass(CreateAlertRequest.class);
    verify(alertService).createAlert(captor.capture());
    assertThat(captor.getValue().getType()).isEqualTo("HIGH_TVR_ANOMALY_RATE");
  }

  @Test
  void evaluateRules_ne_devrait_pas_evaluer_le_tvr_si_moins_de_5_transactions_chip() {
    when(repository.countChipTransactionsByDate(any())).thenReturn(3L);

    engine.evaluateRules();

    verify(alertService, never()).createAlert(any());
  }

  @Test
  void evaluateRules_devrait_declencher_HIGH_CROSS_CURRENCY_au_dela_de_40pct() {
    when(repository.countByBusinessDate(any())).thenReturn(100L);
    when(repository.countCrossCurrencyByDate(any())).thenReturn(50L);

    engine.evaluateRules();

    ArgumentCaptor<CreateAlertRequest> captor = ArgumentCaptor.forClass(CreateAlertRequest.class);
    verify(alertService).createAlert(captor.capture());
    assertThat(captor.getValue().getType()).isEqualTo("HIGH_CROSS_CURRENCY");
  }

  @Test
  void evaluateRules_ne_devrait_jamais_lever_dexception_meme_si_le_repository_echoue() {
    when(repository.countByBusinessDate(any())).thenThrow(new RuntimeException("DB down"));

    engine.evaluateRules();

    verify(alertService, never()).createAlert(any());
  }

  @Test
  void evaluateRules_devrait_pouvoir_declencher_plusieurs_regles_simultanement() {
    when(repository.countByBusinessDate(any())).thenReturn(100L);
    when(repository.countDeclinedByBusinessDate(any())).thenReturn(40L);
    when(repository.countFraudActionCodesByDate(any())).thenReturn(1L);

    engine.evaluateRules();

    verify(alertService, times(2)).createAlert(any());
  }
}
