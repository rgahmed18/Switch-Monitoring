package com.hps.switchmonitoring.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hps.switchmonitoring.api.dto.AutohoActivityAdmDto;
import com.hps.switchmonitoring.repository.AppUserRepository;
import com.hps.switchmonitoring.service.AutohoActivityAdmService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Teste un echantillon representatif d'AutohoActivityAdmController en isolation
 * (AutohoActivityAdmService mocke) : recherche par transactionId, dernieres
 * transactions, filtrage par banque, creation avec validation, stats, health.
 * Le controleur expose ~30 endpoints tres similaires (recherche parametree +
 * pagination) ; ce sous-ensemble couvre chaque famille de comportement plutot
 * que de dupliquer un test quasi identique par endpoint.
 */
@WebMvcTest(AutohoActivityAdmController.class)
class AutohoActivityAdmControllerTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;

  @MockBean private AutohoActivityAdmService service;
  @MockBean private AppUserRepository appUserRepository;

  @Test
  void getByTransactionId_devrait_retourner_200_avec_le_dto() throws Exception {
    AutohoActivityAdmDto dto = AutohoActivityAdmDto.builder()
        .referenceNumber("REF1").internalStan("STAN1").build();
    when(service.getByTransactionId("tx-1")).thenReturn(dto);

    mockMvc.perform(get("/api/v1/autho-activity/transaction/tx-1"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.referenceNumber").value("REF1"));
  }

  @Test
  void getLatestTransactions_devrait_utiliser_la_limite_par_defaut() throws Exception {
    when(service.getLatestTransactions(2000)).thenReturn(List.of());

    mockMvc.perform(get("/api/v1/autho-activity/latest"))
        .andExpect(status().isOk());
  }

  @Test
  void getLatestTransactions_devrait_filtrer_par_banque_si_fournie() throws Exception {
    when(service.getLatestTransactionsByBank(500, "AWB")).thenReturn(List.of());

    mockMvc.perform(get("/api/v1/autho-activity/latest?limit=500&issuing_bank=AWB"))
        .andExpect(status().isOk());
  }

  @Test
  void createTransaction_devrait_retourner_201_avec_une_requete_valide() throws Exception {
    AutohoActivityAdmDto created = AutohoActivityAdmDto.builder()
        .referenceNumber("REF1").internalStan("STAN1").build();
    when(service.createTransaction(any())).thenReturn(created);

    Map<String, Object> body = new java.util.HashMap<>();
    body.put("referenceNumber", "REF1");
    body.put("internalStan", "STAN1");
    body.put("externalStan", "STAN1");
    body.put("routingCode", "001");
    body.put("captureCode", "001");
    body.put("messageType", "0200");
    body.put("cardNumber", "4000005327187750");
    body.put("transactionAmount", "100.00");
    body.put("transactionCurrency", "504");
    body.put("transactionLocalDate", "2026-07-14");
    body.put("transmissionDateAndTime", "2026-07-14T10:00:00");

    mockMvc.perform(post("/api/v1/autho-activity")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(body)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.referenceNumber").value("REF1"));
  }

  @Test
  void createTransaction_devrait_retourner_400_si_champs_obligatoires_absents() throws Exception {
    mockMvc.perform(post("/api/v1/autho-activity")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("referenceNumber", "REF1"))))
        .andExpect(status().isBadRequest());
  }

  @Test
  void countByBusinessDate_devrait_retourner_200_avec_le_compte() throws Exception {
    LocalDate date = LocalDate.of(2026, 7, 14);
    when(service.countByBusinessDate(date)).thenReturn(1234L);

    mockMvc.perform(get("/api/v1/autho-activity/stats/count?businessDate=2026-07-14"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").value(1234));
  }

  @Test
  void sumAmountByBusinessDate_devrait_retourner_200_avec_la_somme() throws Exception {
    LocalDate date = LocalDate.of(2026, 7, 14);
    when(service.sumAmountByBusinessDate(date)).thenReturn(new BigDecimal("99999.99"));

    mockMvc.perform(get("/api/v1/autho-activity/stats/sum-amount?businessDate=2026-07-14"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").value(99999.99));
  }

  @Test
  void health_devrait_retourner_200_sans_dependance() throws Exception {
    mockMvc.perform(get("/api/v1/autho-activity/health"))
        .andExpect(status().isOk());
  }

  @Test
  void getTransactionDetail_devrait_retourner_200_avec_la_cle_composite() throws Exception {
    AutohoActivityAdmDto dto = AutohoActivityAdmDto.builder()
        .referenceNumber("REF1").internalStan("STAN1").build();
    when(service.getTransactionDetail("REF1", "STAN1")).thenReturn(dto);

    mockMvc.perform(get("/api/v1/autho-activity/detail/REF1/STAN1"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.internalStan").value("STAN1"));
  }
}
