package com.hps.switchmonitoring.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/health")
@Tag(name = "Health", description = "Verification de la disponibilite du service")
public class HealthController {

  @Operation(
      summary = "Verifier la disponibilite du backend",
      description = """
          Endpoint de liveness/readiness basique, sans authentification requise. \
          Utilise par les sondes de supervision (Docker healthcheck, load balancer) \
          pour verifier que l'application Spring Boot repond.""")
  @ApiResponse(
      responseCode = "200",
      description = "Le service est demarre et repond aux requetes.",
      content = @Content(
          mediaType = "application/json",
          schema = @Schema(implementation = Map.class),
          examples = @ExampleObject(
              name = "Service disponible",
              value = """
                  {
                    "status": "UP",
                    "service": "switch-monitoring-backend"
                  }""")))
  @SecurityRequirements // aucun header requis pour ce endpoint public
  @GetMapping
  public Map<String, String> health() {
    return Map.of("status", "UP", "service", "switch-monitoring-backend");
  }
}
