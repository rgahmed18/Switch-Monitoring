package com.hps.switchmonitoring.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifie que CorsConfig autorise uniquement l'origine frontend configuree
 * (app.frontend.url) sur les routes /api/**, avec les methodes et en-tetes
 * strictement necessaires au frontend Angular.
 *
 * CorsRegistry n'expose sa configuration resolue que via une methode protected ;
 * on y accede par reflexion, seule option offerte par l'API publique de Spring.
 */
@SuppressWarnings("unchecked")
class CorsConfigTest {

  private Map<String, CorsConfiguration> configurations;

  @BeforeEach
  void setUp() {
    CorsConfig corsConfig = new CorsConfig();
    ReflectionTestUtils.setField(corsConfig, "frontendUrl", "http://localhost:4200");

    CorsRegistry registry = new CorsRegistry();
    corsConfig.addCorsMappings(registry);

    configurations = (Map<String, CorsConfiguration>)
        ReflectionTestUtils.invokeMethod(registry, "getCorsConfigurations");
  }

  @Test
  void devrait_autoriser_uniquement_lorigine_frontend_configuree() {
    CorsConfiguration config = configurations.get("/api/**");
    assertThat(config).isNotNull();
    assertThat(config.getAllowedOrigins()).containsExactly("http://localhost:4200");
  }

  @Test
  void devrait_autoriser_les_methodes_HTTP_necessaires_au_frontend() {
    CorsConfiguration config = configurations.get("/api/**");
    assertThat(config.getAllowedMethods())
        .containsExactlyInAnyOrder("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");
  }

  @Test
  void devrait_autoriser_les_headers_XUserRole_et_XUserEmail() {
    CorsConfiguration config = configurations.get("/api/**");
    assertThat(config.getAllowedHeaders()).contains("X-User-Role", "X-User-Email");
  }

  @Test
  void devrait_exposer_le_header_ContentDisposition_pour_les_telechargements() {
    CorsConfiguration config = configurations.get("/api/**");
    assertThat(config.getExposedHeaders()).contains("Content-Disposition");
  }

  @Test
  void ne_devrait_configurer_aucune_route_en_dehors_de_apiSlash() {
    assertThat(configurations).containsOnlyKeys("/api/**");
  }
}
