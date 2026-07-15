package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.api.dto.CreateSlaSnapshotRequest;
import com.hps.switchmonitoring.domain.SlaSnapshotEntity;
import com.hps.switchmonitoring.service.SlaService;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/sla-snapshots")
@Tag(name = "SLA", description = "Instantanes (snapshots) des indicateurs de niveau de service, utilises pour l'historique et le suivi de tendance")
@SecurityRequirements // lecture/ecriture ouvertes a tout utilisateur authentifie cote frontend
public class SlaController {

  private final SlaService slaService;

  public SlaController(SlaService slaService) {
    this.slaService = slaService;
  }

  @Operation(
      summary = "Lister les derniers instantanes SLA",
      description = "Retourne les instantanes SLA les plus recents (taux d'approbation, latence moyenne, nombre de depassements) tels qu'enregistres periodiquement par le systeme.")
  @ApiResponse(responseCode = "200", description = "Liste des instantanes SLA les plus recents.",
      content = @Content(examples = @ExampleObject(value = """
          [{"id": 101, "capturedAt": "2026-07-15T11:00:00", "approvalRate": 94.5, "avgLatencyMs": 412, "breachCount": 3}]""")))
  @GetMapping
  public List<SlaSnapshotEntity> getLatestSnapshots() {
    return slaService.getLatestSnapshots();
  }

  @Operation(
      summary = "Creer un instantane SLA",
      description = "Enregistre un nouvel instantane des indicateurs SLA a l'instant courant. Utilise par la tache planifiee interne, mais expose egalement pour insertion manuelle lors de tests.")
  @io.swagger.v3.oas.annotations.parameters.RequestBody(content = @Content(examples = @ExampleObject(value = """
      {"approvalRate": 94.5, "avgLatencyMs": 412, "breachCount": 3}""")))
  @ApiResponse(responseCode = "200", description = "Instantane cree.",
      content = @Content(examples = @ExampleObject(value = """
          {"id": 102, "capturedAt": "2026-07-15T12:00:00", "approvalRate": 94.5, "avgLatencyMs": 412, "breachCount": 3}""")))
  @ApiResponse(responseCode = "400", description = "Requete invalide (champs obligatoires manquants).")
  @PostMapping
  public SlaSnapshotEntity createSnapshot(@Valid @RequestBody CreateSlaSnapshotRequest request) {
    return slaService.createSnapshot(request);
  }
}
