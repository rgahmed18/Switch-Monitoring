package com.hps.switchmonitoring.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hps.switchmonitoring.repository.AppUserRepository;
import com.hps.switchmonitoring.service.email.EmailSenderService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.oracle.OracleContainer;

import java.time.Duration;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Test d'integration bout-en-bout du flux d'authentification contre une vraie
 * base Oracle (Testcontainers) : invitation -> activation -> login -> reset.
 * Flyway applique les vraies migrations, aucun mock de repository/JPA.
 *
 * Necessite Docker demarre localement (Docker Desktop) pour lancer le conteneur.
 */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthFlowIntegrationTest {

  // Premier demarrage Oracle plus lent que le timeout par defaut de Testcontainers
  // sur une machine partageant deja Kafka/Zookeeper : on l'etend a 5 minutes.
  @Container
  static final OracleContainer ORACLE = new OracleContainer("gvenzl/oracle-free:23-slim-faststart")
      .withStartupTimeout(Duration.ofMinutes(5));

  @DynamicPropertySource
  static void oracleProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", ORACLE::getJdbcUrl);
    registry.add("spring.datasource.username", ORACLE::getUsername);
    registry.add("spring.datasource.password", ORACLE::getPassword);
  }

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private AppUserRepository userRepository;

  // Evite tout vrai envoi SMTP pendant le test ; le reste de la chaine
  // (controleur -> service -> JPA -> Oracle reel) n'est pas mocke.
  @MockBean private EmailSenderService emailSenderService;

  @AfterEach
  void cleanUp() {
    userRepository.deleteAll();
  }

  @Test
  void parcours_complet_invitation_activation_login() throws Exception {
    final String email = "integration.test@hps.ma";

    // 1. Invitation admin -> compte cree inactif avec token
    mockMvc.perform(post("/api/v1/admin/invite")
            .header("X-User-Role", "ADMIN")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "email", email,
                "firstName", "Integration",
                "lastName", "Test",
                "role", "USER"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true));

    String token = userRepository.findByEmail(email).orElseThrow().getActivationToken();

    // 2. Le lien d'activation doit etre reconnu comme valide
    mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
            .get("/api/v1/auth/token-info/" + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.valid").value(true));

    // 3. Activation avec un mot de passe conforme a la politique
    mockMvc.perform(post("/api/v1/auth/activate")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "token", token,
                "password", "Str0ng!Pass1"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true));

    // 4. Login avec le nouveau mot de passe doit reussir
    mockMvc.perform(post("/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "username", email,
                "password", "Str0ng!Pass1"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value(email));
  }

  @Test
  void login_devrait_echouer_pour_un_compte_non_active() throws Exception {
    final String email = "not-activated@hps.ma";

    mockMvc.perform(post("/api/v1/admin/invite")
            .header("X-User-Role", "ADMIN")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "email", email,
                "firstName", "Non",
                "lastName", "Active",
                "role", "USER"))))
        .andExpect(status().isOk());

    mockMvc.perform(post("/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "username", email,
                "password", "peu importe"))))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void activate_devrait_echouer_avec_un_mot_de_passe_faible() throws Exception {
    final String email = "weak.password@hps.ma";

    mockMvc.perform(post("/api/v1/admin/invite")
            .header("X-User-Role", "ADMIN")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "email", email,
                "firstName", "Weak",
                "lastName", "Password",
                "role", "USER"))))
        .andExpect(status().isOk());

    String token = userRepository.findByEmail(email).orElseThrow().getActivationToken();

    mockMvc.perform(post("/api/v1/auth/activate")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "token", token,
                "password", "faible"))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.success").value(false));
  }
}
