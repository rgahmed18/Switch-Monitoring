package com.hps.switchmonitoring.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration OpenAPI 3 / Swagger UI.
 *
 * L'API n'utilise pas Spring Security ni JWT : l'identite et le role de
 * l'utilisateur sont portes par les headers HTTP X-User-Email/X-User-Role
 * (voir {@link BlockedUserFilter} et les controleurs admin), verifies
 * manuellement par chaque endpoint qui en a besoin. Le schema de securite
 * ci-dessous documente ce contrat pour Swagger UI ("Authorize") sans
 * introduire de veritable authentification au niveau du framework.
 */
@Configuration
public class OpenApiConfig {

  private static final String ROLE_HEADER_SCHEME = "X-User-Role";
  private static final String EMAIL_HEADER_SCHEME = "X-User-Email";

  @Bean
  public OpenAPI switchMonitoringOpenApi() {
    return new OpenAPI()
        .info(apiInfo())
        .servers(List.of(
            new Server().url("http://localhost:8080").description("Environnement local"),
            new Server().url("/").description("Serveur courant")))
        .components(new Components()
            .addSecuritySchemes(ROLE_HEADER_SCHEME, roleHeaderScheme())
            .addSecuritySchemes(EMAIL_HEADER_SCHEME, emailHeaderScheme()))
        .addSecurityItem(new SecurityRequirement()
            .addList(ROLE_HEADER_SCHEME)
            .addList(EMAIL_HEADER_SCHEME));
  }

  private Info apiInfo() {
    return new Info()
        .title("Switch Monitoring API")
        .description("""
            API de supervision temps reel des transactions monetiques (ISO 8583 / PowerCARD) : \
            suivi des transactions, alertes, SLA, analytique geographique et par reseau de carte, \
            administration des utilisateurs et des projets (banques).

            ### Authentification
            L'API n'utilise pas de jeton (JWT/OAuth2). Chaque requete doit porter deux en-tetes HTTP \
            identifiant l'utilisateur courant, positionnes automatiquement par le frontend apres connexion \
            (`POST /api/v1/auth/login`) :
            - `X-User-Email` : email de l'utilisateur authentifie.
            - `X-User-Role` : `ADMIN` ou `USER`. Les endpoints d'administration renvoient 403 si le role \
              transmis n'est pas `ADMIN`.

            ### Conventions
            - Toutes les dates/heures sont exprimees dans le fuseau `Africa/Casablanca`.
            - Les listes volumineuses sont paginees via les parametres standards Spring Data \
              (`page`, `size`, `sort`).
            - Les montants sont en unites de devise (pas de sous-unites/centimes).
            """)
        .version("v1")
        .contact(new Contact()
            .name("Equipe Switch Monitoring")
            .email("support@switch-monitoring.local"))
        .license(new License().name("Usage interne"));
  }

  private SecurityScheme roleHeaderScheme() {
    return new SecurityScheme()
        .type(SecurityScheme.Type.APIKEY)
        .in(SecurityScheme.In.HEADER)
        .name(ROLE_HEADER_SCHEME)
        .description("Role de l'utilisateur courant : ADMIN ou USER.");
  }

  private SecurityScheme emailHeaderScheme() {
    return new SecurityScheme()
        .type(SecurityScheme.Type.APIKEY)
        .in(SecurityScheme.In.HEADER)
        .name(EMAIL_HEADER_SCHEME)
        .description("Email de l'utilisateur courant, utilise pour l'audit et la resolution du compte.");
  }
}
