package com.hps.switchmonitoring.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hps.switchmonitoring.domain.AppUserEntity;
import com.hps.switchmonitoring.repository.AppUserRepository;
import com.hps.switchmonitoring.service.UserService;
import com.hps.switchmonitoring.service.email.EmailValidationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifie le controle d'acces admin (header X-User-Role) sur la gestion des
 * utilisateurs — ces endpoints sont le seul rempart cote serveur puisque le
 * projet n'utilise pas encore Spring Security.
 */
@WebMvcTest(AdminController.class)
class AdminControllerTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;

  @MockBean private EmailValidationService emailValidationService;
  @MockBean private UserService userService;
  @MockBean private AppUserRepository appUserRepository;

  @Test
  void listUsers_devrait_retourner_403_sans_role_admin() throws Exception {
    mockMvc.perform(get("/api/v1/admin/users"))
        .andExpect(status().isForbidden());
  }

  @Test
  void listUsers_devrait_retourner_403_pour_un_role_user() throws Exception {
    mockMvc.perform(get("/api/v1/admin/users").header("X-User-Role", "USER"))
        .andExpect(status().isForbidden());
  }

  @Test
  void listUsers_devrait_retourner_200_pour_un_role_admin() throws Exception {
    AppUserEntity u = new AppUserEntity();
    u.setUsername("a.benbrahim");
    u.setEmail("a.benbrahim@hps.ma");
    u.setRole("ADMIN");
    u.setStatus("ACTIVE");

    when(userService.findAll()).thenReturn(List.of(u));

    mockMvc.perform(get("/api/v1/admin/users").header("X-User-Role", "ADMIN"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].email").value("a.benbrahim@hps.ma"));
  }

  @Test
  void deleteUser_devrait_retourner_403_sans_role_admin() throws Exception {
    mockMvc.perform(delete("/api/v1/admin/users/1").header("X-User-Role", "USER"))
        .andExpect(status().isForbidden());
  }

  @Test
  void deleteUser_devrait_retourner_400_si_utilisateur_introuvable() throws Exception {
    org.mockito.Mockito.doThrow(new IllegalArgumentException("Utilisateur introuvable."))
        .when(userService).deleteUser(anyLong());

    mockMvc.perform(delete("/api/v1/admin/users/99").header("X-User-Role", "ADMIN"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.success").value(false));
  }

  @Test
  void toggleStatus_devrait_retourner_403_sans_role_admin() throws Exception {
    mockMvc.perform(patch("/api/v1/admin/users/1/status"))
        .andExpect(status().isForbidden());
  }

  @Test
  void toggleStatus_devrait_retourner_200_pour_un_admin() throws Exception {
    AppUserEntity u = new AppUserEntity();
    u.setId(1L);
    u.setStatus("BLOCKED");
    when(userService.toggleStatus(1L)).thenReturn(u);

    mockMvc.perform(patch("/api/v1/admin/users/1/status").header("X-User-Role", "ADMIN"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("BLOCKED"));
  }

  @Test
  void updateUser_devrait_retourner_400_si_champs_obligatoires_manquants() throws Exception {
    mockMvc.perform(put("/api/v1/admin/users/1")
            .header("X-User-Role", "ADMIN")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(Map.of("firstName", "", "lastName", ""))))
        .andExpect(status().isBadRequest());
  }
}
