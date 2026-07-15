package com.hps.switchmonitoring.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hps.switchmonitoring.config.RateLimiter;
import com.hps.switchmonitoring.domain.AppUserEntity;
import com.hps.switchmonitoring.repository.AppUserRepository;
import com.hps.switchmonitoring.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Teste AuthController en isolation (UserService et RateLimiter mockes).
 * Couvre les codes HTTP et payloads attendus par le frontend pour chaque
 * scenario d'authentification, y compris le rate limiting anti brute-force.
 */
@WebMvcTest(AuthController.class)
class AuthControllerTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;

  @MockBean private UserService userService;
  @MockBean private RateLimiter rateLimiter;
  @MockBean private AppUserRepository appUserRepository;

  // ── POST /login ────────────────────────────────────────────────────────

  @Test
  void login_devrait_retourner_200_avec_identifiants_valides() throws Exception {
    AppUserEntity user = new AppUserEntity();
    user.setId(1L);
    user.setUsername("a.rguibi");
    user.setEmail("a.rguibi@hps.ma");
    user.setRole("USER");
    user.setStatus("ACTIVE");

    when(rateLimiter.allowLogin(anyString())).thenReturn(true);
    when(userService.authenticate("a.rguibi@hps.ma", "Str0ng!Pass")).thenReturn(user);

    mockMvc.perform(post("/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "username", "a.rguibi@hps.ma",
                "password", "Str0ng!Pass"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value("a.rguibi@hps.ma"))
        .andExpect(jsonPath("$.role").value("USER"));
  }

  @Test
  void login_devrait_retourner_401_avec_identifiants_invalides() throws Exception {
    when(rateLimiter.allowLogin(anyString())).thenReturn(true);
    when(userService.authenticate(anyString(), anyString()))
        .thenThrow(new IllegalArgumentException("Identifiants incorrects."));

    mockMvc.perform(post("/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "username", "inconnu@hps.ma",
                "password", "mauvais"))))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.error").value("Identifiants incorrects."));
  }

  @Test
  void login_devrait_retourner_429_si_rate_limit_depasse() throws Exception {
    when(rateLimiter.allowLogin(anyString())).thenReturn(false);

    mockMvc.perform(post("/api/v1/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "username", "a.rguibi@hps.ma",
                "password", "peu importe"))))
        .andExpect(status().isTooManyRequests())
        .andExpect(jsonPath("$.error").exists());
  }

  // ── GET /me ───────────────────────────────────────────────────────────────

  @Test
  void me_devrait_retourner_401_sans_header_X_User_Email() throws Exception {
    mockMvc.perform(get("/api/v1/auth/me"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void me_devrait_retourner_404_si_utilisateur_introuvable() throws Exception {
    when(userService.findByEmail("inconnu@hps.ma")).thenReturn(Optional.empty());

    mockMvc.perform(get("/api/v1/auth/me").header("X-User-Email", "inconnu@hps.ma"))
        .andExpect(status().isNotFound());
  }

  @Test
  void me_devrait_retourner_les_donnees_a_jour_pour_un_non_admin() throws Exception {
    AppUserEntity user = new AppUserEntity();
    user.setId(2L);
    user.setUsername("amine.icame");
    user.setEmail("amine.icame16@gmail.com");
    user.setRole("USER");
    user.setStatus("ACTIVE");
    user.setProjects("SGM");

    when(userService.findByEmail("amine.icame16@gmail.com")).thenReturn(Optional.of(user));

    mockMvc.perform(get("/api/v1/auth/me").header("X-User-Email", "amine.icame16@gmail.com"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value("amine.icame16@gmail.com"))
        .andExpect(jsonPath("$.role").value("USER"))
        .andExpect(jsonPath("$.projects").value("SGM"));
  }

  // ── GET /token-info/{token} ──────────────────────────────────────────────

  @Test
  void tokenInfo_devrait_retourner_404_si_token_inconnu() throws Exception {
    when(userService.findByToken("bad-token")).thenReturn(Optional.empty());

    mockMvc.perform(get("/api/v1/auth/token-info/bad-token"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.valid").value(false));
  }

  @Test
  void tokenInfo_devrait_indiquer_invalide_si_compte_deja_actif() throws Exception {
    AppUserEntity user = new AppUserEntity();
    user.setActive(true);
    when(userService.findByToken("tok-123")).thenReturn(Optional.of(user));

    mockMvc.perform(get("/api/v1/auth/token-info/tok-123"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.valid").value(false));
  }

  @Test
  void tokenInfo_devrait_indiquer_valide_pour_un_token_frais() throws Exception {
    AppUserEntity user = new AppUserEntity();
    user.setActive(false);
    user.setFirstName("Ahmed");
    user.setEmail("a.rguibi@hps.ma");
    user.setTokenExpiry(LocalDateTime.now().plusHours(1));
    when(userService.findByToken("tok-123")).thenReturn(Optional.of(user));

    mockMvc.perform(get("/api/v1/auth/token-info/tok-123"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.valid").value(true))
        .andExpect(jsonPath("$.email").value("a.rguibi@hps.ma"));
  }

  // ── POST /activate ───────────────────────────────────────────────────────

  @Test
  void activate_devrait_retourner_400_si_token_invalide() throws Exception {
    when(userService.activateAccount(anyString(), anyString()))
        .thenThrow(new IllegalArgumentException("Lien d'activation invalide ou déjà utilisé."));

    mockMvc.perform(post("/api/v1/auth/activate")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "token", "bad-token",
                "password", "Str0ng!Pass"))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.success").value(false));
  }

  @Test
  void activate_devrait_retourner_200_avec_token_valide() throws Exception {
    AppUserEntity user = new AppUserEntity();
    user.setEmail("a.rguibi@hps.ma");
    when(userService.activateAccount("tok-123", "Str0ng!Pass")).thenReturn(user);

    mockMvc.perform(post("/api/v1/auth/activate")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "token", "tok-123",
                "password", "Str0ng!Pass"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true));
  }

  // ── POST /forgot-password ────────────────────────────────────────────────

  @Test
  void forgotPassword_devrait_toujours_retourner_200_meme_si_email_inconnu() throws Exception {
    when(rateLimiter.allowForgotPassword(anyString())).thenReturn(true);

    mockMvc.perform(post("/api/v1/auth/forgot-password")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("email", "inconnu@hps.ma"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.message").exists());
  }

  @Test
  void forgotPassword_devrait_retourner_429_si_rate_limit_depasse() throws Exception {
    when(rateLimiter.allowForgotPassword(anyString())).thenReturn(false);

    mockMvc.perform(post("/api/v1/auth/forgot-password")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("email", "a.rguibi@hps.ma"))))
        .andExpect(status().isTooManyRequests());
  }

  // ── POST /reset-password ─────────────────────────────────────────────────

  @Test
  void resetPassword_devrait_retourner_400_si_token_expire() throws Exception {
    org.mockito.Mockito.doThrow(new IllegalStateException("Lien expiré (validité 1h). Faites une nouvelle demande."))
        .when(userService).applyPasswordReset(anyString(), anyString());

    mockMvc.perform(post("/api/v1/auth/reset-password")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "token", "expired-token",
                "password", "Str0ng!Pass"))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.success").value(false));
  }

  @Test
  void resetPassword_devrait_retourner_200_avec_token_valide() throws Exception {
    mockMvc.perform(post("/api/v1/auth/reset-password")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of(
                "token", "tok-123",
                "password", "Str0ng!Pass"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.success").value(true));
  }
}
