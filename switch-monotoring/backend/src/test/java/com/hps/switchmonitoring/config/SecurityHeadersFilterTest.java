package com.hps.switchmonitoring.config;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

/**
 * Verifie que SecurityHeadersFilter ajoute les en-tetes de durcissement HTTP
 * standard (anti-clickjacking, anti-MIME-sniffing, CSP) sur toutes les reponses.
 */
@ExtendWith(MockitoExtension.class)
class SecurityHeadersFilterTest {

  @Mock private FilterChain filterChain;

  private SecurityHeadersFilter filter;

  @BeforeEach
  void setUp() {
    filter = new SecurityHeadersFilter();
  }

  @Test
  void devrait_ajouter_le_header_XContentTypeOptions() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest();
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, filterChain);

    assertThat(response.getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
  }

  @Test
  void devrait_ajouter_le_header_XFrameOptions_DENY() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest();
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, filterChain);

    assertThat(response.getHeader("X-Frame-Options")).isEqualTo("DENY");
  }

  @Test
  void devrait_ajouter_le_header_ReferrerPolicy() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest();
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, filterChain);

    assertThat(response.getHeader("Referrer-Policy")).isEqualTo("strict-origin-when-cross-origin");
  }

  @Test
  void devrait_ajouter_le_header_PermissionsPolicy_refusant_camera_micro_geoloc() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest();
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, filterChain);

    assertThat(response.getHeader("Permissions-Policy"))
        .contains("camera=()", "microphone=()", "geolocation=()");
  }

  @Test
  void devrait_ajouter_une_CSP_restreinte_a_self() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest();
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, filterChain);

    String csp = response.getHeader("Content-Security-Policy");
    assertThat(csp).contains("default-src 'self'", "script-src 'self'");
  }

  @Test
  void devrait_toujours_laisser_passer_la_requete_dans_la_chaine() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest();
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, filterChain);

    verify(filterChain).doFilter(request, response);
  }
}
