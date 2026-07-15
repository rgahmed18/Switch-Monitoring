package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.api.dto.geo.CountryHealthKpiDto;
import com.hps.switchmonitoring.api.dto.geo.ZoneHealthSummaryDto;
import com.hps.switchmonitoring.service.geo.ZoneHealthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * API REST pour la heatmap de santé géographique.
 * Base path : /api/v1/zone-health
 */
@RestController
@RequestMapping("/api/v1/zone-health")
@Tag(name = "Sante des Zones", description = "Heatmap de sante geographique (taux d'approbation, latence) par pays, utilisee pour la detection proactive d'incidents")
@SecurityRequirements // lecture ouverte a tout utilisateur authentifie cote frontend
public class ZoneHealthController {

    private final ZoneHealthService zoneHealthService;

    public ZoneHealthController(ZoneHealthService zoneHealthService) {
        this.zoneHealthService = zoneHealthService;
    }

    @Operation(
        summary = "Heatmap complete de sante par zone",
        description = "Calcule, pour chaque pays actif a la date donnee (jour courant par defaut), un indicateur de sante synthetique (taux d'approbation, latence moyenne, volume) et un statut (`OK`/`WARNING`/`CRITICAL`).")
    @ApiResponse(responseCode = "200", description = "Resume de sante de toutes les zones.",
        content = @Content(examples = @ExampleObject(value = """
            {
              "businessDate": "2026-07-15",
              "countries": [
                {"code": "504", "name": "Maroc", "status": "OK", "approvalRate": 96.2, "avgLatencyMs": 340, "volume": 1204},
                {"code": "840", "name": "USA", "status": "CRITICAL", "approvalRate": 61.0, "avgLatencyMs": 1890, "volume": 87}
              ]
            }""")))
    @GetMapping("/heatmap")
    public ResponseEntity<ZoneHealthSummaryDto> getHeatmap(
            @Parameter(description = "Date metier (par defaut : aujourd'hui)", example = "2026-07-15")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate target = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(zoneHealthService.computeFullHeatmap(target));
    }

    @Operation(summary = "KPI de sante detaille d'un pays specifique")
    @ApiResponse(responseCode = "200", description = "KPI de sante du pays demande.",
        content = @Content(examples = @ExampleObject(value = """
            {"code": "504", "name": "Maroc", "status": "OK", "approvalRate": 96.2, "avgLatencyMs": 340, "volume": 1204}""")))
    @GetMapping("/country/{code}")
    public ResponseEntity<CountryHealthKpiDto> getCountryKpi(
            @Parameter(description = "Code pays ISO 3166 numerique", example = "504") @PathVariable String code,
            @Parameter(description = "Date metier (par defaut : aujourd'hui)", example = "2026-07-15")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate target = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(zoneHealthService.computeCountryKpi(target, code));
    }

    @Operation(
        summary = "Lister uniquement les zones en alerte (WARNING/CRITICAL)",
        description = "Filtre la heatmap complete pour ne retourner que les pays dont le statut de sante est degrade. Consomme par le moteur d'alertes intelligentes et le panneau d'alertes temps reel du frontend.")
    @ApiResponse(responseCode = "200", description = "Zones en etat WARNING ou CRITICAL (peut etre vide si tout est sain).",
        content = @Content(examples = @ExampleObject(value = """
            [{"code": "840", "name": "USA", "status": "CRITICAL", "approvalRate": 61.0, "avgLatencyMs": 1890, "volume": 87}]""")))
    @GetMapping("/alerts")
    public ResponseEntity<List<CountryHealthKpiDto>> getAlertZones(
            @Parameter(description = "Date metier (par defaut : aujourd'hui)", example = "2026-07-15")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate target = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(zoneHealthService.getAlertZones(target));
    }
}
