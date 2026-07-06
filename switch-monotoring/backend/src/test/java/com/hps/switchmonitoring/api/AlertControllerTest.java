package com.hps.switchmonitoring.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hps.switchmonitoring.api.dto.CreateAlertRequest;
import com.hps.switchmonitoring.domain.AlertEventEntity;
import com.hps.switchmonitoring.repository.AppUserRepository;
import com.hps.switchmonitoring.service.AlertService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AlertController.class)
class AlertControllerTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;

  @MockBean private AlertService alertService;

  // BlockedUserFilter est un @Component scanne par @WebMvcTest sur toutes les routes ;
  // il faut mocker sa dependance AppUserRepository meme si ce test ne l'exerce pas.
  @MockBean private AppUserRepository appUserRepository;

  @Test
  void getLatestAlerts_devrait_retourner_200_et_la_liste() throws Exception {
    AlertEventEntity alert = new AlertEventEntity();
    alert.setType("FRAUD_SUSPECT");
    alert.setSeverity("HIGH");

    when(alertService.getLatestAlerts()).thenReturn(List.of(alert));

    mockMvc.perform(get("/api/v1/alerts"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].type").value("FRAUD_SUSPECT"))
        .andExpect(jsonPath("$[0].severity").value("HIGH"));
  }

  @Test
  void createAlert_devrait_rejeter_une_requete_invalide_400() throws Exception {
    // CreateAlertRequest exige type/severity/title non vides (@NotBlank) -> 400 attendu
    CreateAlertRequest invalid = new CreateAlertRequest();

    mockMvc.perform(post("/api/v1/alerts")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(invalid)))
        .andExpect(status().isBadRequest());
  }

  @Test
  void createAlert_devrait_retourner_lalerte_creee() throws Exception {
    CreateAlertRequest request = new CreateAlertRequest();
    request.setTitle("Alerte test");
    request.setType("SLA_BREACH");
    request.setSeverity("MEDIUM");

    AlertEventEntity created = new AlertEventEntity();
    created.setTitle("Alerte test");
    created.setType("SLA_BREACH");
    created.setSeverity("MEDIUM");

    when(alertService.createAlert(any())).thenReturn(created);

    mockMvc.perform(post("/api/v1/alerts")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.title").value("Alerte test"));
  }
}
