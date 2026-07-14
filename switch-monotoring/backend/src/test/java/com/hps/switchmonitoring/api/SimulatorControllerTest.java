package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.repository.AppUserRepository;
import com.hps.switchmonitoring.service.AutohoActivityAdmService;
import com.hps.switchmonitoring.service.IsoSimulatorTask;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Teste SimulatorController en isolation : controle d'acces admin sur
 * reset/purge et lecture publique du statut de generation.
 */
@WebMvcTest(SimulatorController.class)
class SimulatorControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockBean private IsoSimulatorTask simulator;
  @MockBean private AutohoActivityAdmService txService;
  @MockBean private AppUserRepository appUserRepository;

  @Test
  void reset_devrait_retourner_403_sans_role_admin() throws Exception {
    mockMvc.perform(post("/api/v1/simulator/reset"))
        .andExpect(status().isForbidden());

    verify(simulator, never()).resetCounter();
  }

  @Test
  void reset_devrait_retourner_403_pour_un_role_user() throws Exception {
    mockMvc.perform(post("/api/v1/simulator/reset").header("X-User-Role", "USER"))
        .andExpect(status().isForbidden());
  }

  @Test
  void reset_devrait_reinitialiser_le_compteur_pour_un_admin() throws Exception {
    mockMvc.perform(post("/api/v1/simulator/reset").header("X-User-Role", "ADMIN"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("reset"));

    verify(simulator).resetCounter();
  }

  @Test
  void purgeAndRegenerate_devrait_retourner_403_sans_role_admin() throws Exception {
    mockMvc.perform(post("/api/v1/simulator/purge-and-regenerate"))
        .andExpect(status().isForbidden());

    verify(txService, never()).purgeAll();
  }

  @Test
  void purgeAndRegenerate_devrait_purger_et_relancer_pour_un_admin() throws Exception {
    when(simulator.getGenerated()).thenReturn(1);

    mockMvc.perform(post("/api/v1/simulator/purge-and-regenerate").header("X-User-Role", "ADMIN"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("purged_and_started"))
        .andExpect(jsonPath("$.generated").value(1));

    verify(txService).purgeAll();
    verify(simulator).resetCounter();
    verify(simulator).generateSimulatedTransaction();
  }

  @Test
  void status_devrait_etre_accessible_sans_role_admin() throws Exception {
    when(simulator.getGenerated()).thenReturn(500);

    mockMvc.perform(get("/api/v1/simulator/status"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.generated").value(500))
        .andExpect(jsonPath("$.remaining").value(1500))
        .andExpect(jsonPath("$.completed").value(false));
  }

  @Test
  void status_devrait_marquer_completed_a_2000() throws Exception {
    when(simulator.getGenerated()).thenReturn(2000);

    mockMvc.perform(get("/api/v1/simulator/status"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.completed").value(true))
        .andExpect(jsonPath("$.remaining").value(0));
  }
}
