package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.domain.AutohoActivityAdmEntity;
import com.hps.switchmonitoring.repository.AppUserRepository;
import com.hps.switchmonitoring.repository.AutohoActivityAdmRepository;
import com.hps.switchmonitoring.service.currency.CurrencyIntelligenceService;
import com.hps.switchmonitoring.service.emv.ChipAnalysisService;
import com.hps.switchmonitoring.service.time.TransactionTimeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Teste MonetixAnalyticsController en isolation (repository et services
 * d'analyse mockes) : decodage ISO8583 stateless et propagation de
 * NoSuchElementException quand une transaction est introuvable (aucun
 * @ControllerAdvice ne la mappe en 404 dans ce projet ; MockMvc la relance
 * telle quelle plutot que de la traduire en reponse 500 comme le ferait
 * un vrai conteneur Servlet).
 */
@WebMvcTest(MonetixAnalyticsController.class)
class MonetixAnalyticsControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockBean private AutohoActivityAdmRepository repository;
  @MockBean private ChipAnalysisService chipService;
  @MockBean private TransactionTimeService timeService;
  @MockBean private CurrencyIntelligenceService currencyService;
  @MockBean private AppUserRepository appUserRepository;

  @Test
  void decodeActionCode_devrait_retourner_200_avec_le_decodage() throws Exception {
    mockMvc.perform(get("/api/v1/analytics/iso/action-code/000"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.isApproved").value(true));
  }

  @Test
  void decodeMti_devrait_retourner_200_avec_le_decodage() throws Exception {
    mockMvc.perform(get("/api/v1/analytics/iso/mti/1100"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.messageClass").value("Autorisation"));
  }

  @Test
  void getChipAnalysis_devrait_propager_NoSuchElementException_si_transaction_introuvable() {
    when(repository.findByTransactionId("inconnu")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> mockMvc.perform(get("/api/v1/analytics/chip/inconnu")))
        .hasRootCauseInstanceOf(NoSuchElementException.class);
  }

  @Test
  void getChipAnalysis_devrait_retourner_200_si_transaction_trouvee() throws Exception {
    AutohoActivityAdmEntity entity = new AutohoActivityAdmEntity();
    when(repository.findByTransactionId("tx-1")).thenReturn(Optional.of(entity));
    when(chipService.analyze(entity)).thenReturn(new ChipAnalysisService.ChipDiagnostic(
        false, null, null, null, null, null, null, null, "CLEAN", java.util.List.of()));

    mockMvc.perform(get("/api/v1/analytics/chip/tx-1"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.overallRisk").value("CLEAN"));
  }

  @Test
  void getTimeAnalysis_devrait_propager_NoSuchElementException_si_transaction_introuvable() {
    when(repository.findByTransactionId("inconnu")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> mockMvc.perform(get("/api/v1/analytics/time/inconnu")))
        .hasRootCauseInstanceOf(NoSuchElementException.class);
  }

  @Test
  void getTimezone_devrait_retourner_200_avec_la_timezone_resolue() throws Exception {
    when(timeService.resolveTimezone("504")).thenReturn("Africa/Casablanca");

    mockMvc.perform(get("/api/v1/analytics/time/timezone/504"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.timezone").value("Africa/Casablanca"));
  }

  @Test
  void getDashboard_devrait_retourner_200_avec_les_kpis() throws Exception {
    LocalDate date = LocalDate.of(2026, 7, 14);
    when(repository.countByBusinessDate(date)).thenReturn(100L);
    when(repository.countChipTransactionsByDate(date)).thenReturn(30L);
    when(repository.countFraudActionCodesByDate(date)).thenReturn(2L);
    when(repository.countSlaBreachesByDate(date)).thenReturn(1L);
    when(repository.countPendingSettlementByDate(date)).thenReturn(5L);
    when(repository.countCrossCurrencyByDate(date)).thenReturn(10L);
    when(repository.countByActionCodeGroup(date)).thenReturn(java.util.List.of());

    mockMvc.perform(get("/api/v1/analytics/dashboard?businessDate=2026-07-14"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalTransactions").value(100))
        .andExpect(jsonPath("$.chipEmvPct").value(30.0));
  }

  @Test
  void getCurrencyAnalysis_devrait_propager_NoSuchElementException_si_transaction_introuvable() {
    when(repository.findByTransactionId("inconnu")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> mockMvc.perform(get("/api/v1/analytics/currency/inconnu")))
        .hasRootCauseInstanceOf(NoSuchElementException.class);
  }
}
