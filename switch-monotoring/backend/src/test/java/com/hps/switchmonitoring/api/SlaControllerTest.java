package com.hps.switchmonitoring.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hps.switchmonitoring.domain.SlaSnapshotEntity;
import com.hps.switchmonitoring.repository.AppUserRepository;
import com.hps.switchmonitoring.service.SlaService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Teste SlaController en isolation (SlaService mocke) : lecture des derniers
 * instantanes SLA et creation, avec validation Bean Validation sur les champs
 * obligatoires (@NotNull).
 */
@WebMvcTest(SlaController.class)
class SlaControllerTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;

  @MockBean private SlaService slaService;
  @MockBean private AppUserRepository appUserRepository;

  @Test
  void getLatestSnapshots_devrait_retourner_200_avec_la_liste() throws Exception {
    SlaSnapshotEntity snapshot = new SlaSnapshotEntity();
    snapshot.setSuccessRate(new BigDecimal("99.9"));
    when(slaService.getLatestSnapshots()).thenReturn(List.of(snapshot));

    mockMvc.perform(get("/api/v1/sla-snapshots"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].successRate").value(99.9));
  }

  @Test
  void getLatestSnapshots_devrait_retourner_200_avec_une_liste_vide() throws Exception {
    when(slaService.getLatestSnapshots()).thenReturn(List.of());

    mockMvc.perform(get("/api/v1/sla-snapshots"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isArray())
        .andExpect(jsonPath("$").isEmpty());
  }

  @Test
  void createSnapshot_devrait_retourner_200_avec_une_requete_valide() throws Exception {
    SlaSnapshotEntity saved = new SlaSnapshotEntity();
    saved.setSlaDefinitionId(1L);
    when(slaService.createSnapshot(any())).thenReturn(saved);

    mockMvc.perform(post("/api/v1/sla-snapshots")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "slaDefinitionId", 1,
                "periodStart", LocalDateTime.now().minusHours(1).toString(),
                "periodEnd", LocalDateTime.now().toString(),
                "breached", 0))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.slaDefinitionId").value(1));
  }

  @Test
  void createSnapshot_devrait_retourner_400_si_slaDefinitionId_absent() throws Exception {
    mockMvc.perform(post("/api/v1/sla-snapshots")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "periodStart", LocalDateTime.now().minusHours(1).toString(),
                "periodEnd", LocalDateTime.now().toString(),
                "breached", 0))))
        .andExpect(status().isBadRequest());
  }

  @Test
  void createSnapshot_devrait_retourner_400_si_breached_absent() throws Exception {
    mockMvc.perform(post("/api/v1/sla-snapshots")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "slaDefinitionId", 1,
                "periodStart", LocalDateTime.now().minusHours(1).toString(),
                "periodEnd", LocalDateTime.now().toString()))))
        .andExpect(status().isBadRequest());
  }
}
