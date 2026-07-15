package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.api.dto.CreateAlertRequest;
import com.hps.switchmonitoring.domain.AlertEventEntity;
import com.hps.switchmonitoring.service.AlertService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/alerts")
@Tag(name = "Alertes", description = "Evenements d'alerte (SLA, zone en detresse, anomalie) persistes et consultables en historique")
@SecurityRequirements // lecture/ecriture ouvertes a tout utilisateur authentifie cote frontend
public class AlertController {

  private final AlertService alertService;

  public AlertController(AlertService alertService) {
    this.alertService = alertService;
  }

  @Operation(
      summary = "Lister les dernieres alertes",
      description = "Retourne l'historique recent des alertes generees (SLA depasse, zone geographique en detresse, anomalie de taux de change, etc.), toutes severites confondues.")
  @ApiResponse(responseCode = "200", description = "Liste des dernieres alertes.",
      content = @Content(examples = @ExampleObject(value = """
          [{"id": 42, "severity": "CRITICAL", "message": "Zone USA: taux d'approbation sous le seuil (61%)", "createdAt": "2026-07-15T11:22:33"}]""")))
  @GetMapping
  public List<AlertEventEntity> getLatestAlerts() {
    return alertService.getLatestAlerts();
  }

  @Operation(
      summary = "Creer une alerte",
      description = "Enregistre une nouvelle alerte. Utilise principalement par les services internes de detection (moteur SLA, heatmap de sante), mais expose egalement pour insertion manuelle lors de demonstrations/tests.")
  @io.swagger.v3.oas.annotations.parameters.RequestBody(content = @Content(examples = @ExampleObject(value = """
      {"severity": "WARNING", "message": "Latence moyenne en hausse sur la zone Europe (+35%)"}""")))
  @ApiResponse(responseCode = "200", description = "Alerte creee.",
      content = @Content(examples = @ExampleObject(value = """
          {"id": 43, "severity": "WARNING", "message": "Latence moyenne en hausse sur la zone Europe (+35%)", "createdAt": "2026-07-15T12:05:00"}""")))
  @ApiResponse(responseCode = "400", description = "Requete invalide (champs obligatoires manquants).")
  @PostMapping
  public AlertEventEntity createAlert(@Valid @RequestBody CreateAlertRequest request) {
    return alertService.createAlert(request);
  }
}
