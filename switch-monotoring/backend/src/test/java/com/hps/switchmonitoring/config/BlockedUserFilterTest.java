package com.hps.switchmonitoring.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hps.switchmonitoring.domain.AppUserEntity;
import com.hps.switchmonitoring.repository.AppUserRepository;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Verifie que BlockedUserFilter coupe l'acces aux utilisateurs bloques/desactives
 * via le header X-User-Email, tout en laissant passer les routes publiques
 * (login, activate, reset) sans verification.
 */
@ExtendWith(MockitoExtension.class)
class BlockedUserFilterTest {

  @Mock private AppUserRepository userRepository;
  @Mock private FilterChain filterChain;

  private BlockedUserFilter filter;

  @BeforeEach
  void setUp() {
    filter = new BlockedUserFilter(userRepository, new ObjectMapper());
  }

  @Test
  void devrait_laisser_passer_une_route_publique_sans_verifier_le_repository() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, filterChain);

    verify(filterChain).doFilter(request, response);
    verify(userRepository, never()).findByEmail(org.mockito.ArgumentMatchers.anyString());
  }

  @Test
  void devrait_laisser_passer_si_aucun_header_XUserEmail() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/alerts");
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, filterChain);

    verify(filterChain).doFilter(request, response);
  }

  @Test
  void devrait_laisser_passer_un_utilisateur_actif_et_non_bloque() throws Exception {
    AppUserEntity user = new AppUserEntity();
    user.setActive(true);
    user.setStatus("ACTIVE");
    when(userRepository.findByEmail("a.rguibi@hps.ma")).thenReturn(Optional.of(user));

    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/alerts");
    request.addHeader("X-User-Email", "a.rguibi@hps.ma");
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, filterChain);

    verify(filterChain).doFilter(request, response);
  }

  @Test
  void devrait_bloquer_un_utilisateur_au_statut_BLOCKED_avec_403() throws Exception {
    AppUserEntity user = new AppUserEntity();
    user.setActive(true);
    user.setStatus("BLOCKED");
    when(userRepository.findByEmail("blocked@hps.ma")).thenReturn(Optional.of(user));

    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/alerts");
    request.addHeader("X-User-Email", "blocked@hps.ma");
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, filterChain);

    assertThat(response.getStatus()).isEqualTo(403);
    assertThat(response.getContentAsString()).contains("bloqué");
    verify(filterChain, never()).doFilter(request, response);
  }

  @Test
  void devrait_bloquer_un_utilisateur_inactif_avec_403() throws Exception {
    AppUserEntity user = new AppUserEntity();
    user.setActive(false);
    user.setStatus("ACTIVE");
    when(userRepository.findByEmail("inactive@hps.ma")).thenReturn(Optional.of(user));

    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/alerts");
    request.addHeader("X-User-Email", "inactive@hps.ma");
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, filterChain);

    assertThat(response.getStatus()).isEqualTo(403);
    verify(filterChain, never()).doFilter(request, response);
  }

  @Test
  void devrait_laisser_passer_si_email_inconnu_du_repository() throws Exception {
    when(userRepository.findByEmail("ghost@hps.ma")).thenReturn(Optional.empty());

    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/alerts");
    request.addHeader("X-User-Email", "ghost@hps.ma");
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, filterChain);

    verify(filterChain).doFilter(request, response);
  }
}
