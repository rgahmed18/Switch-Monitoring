package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.api.dto.geo.CountryHealthKpiDto;
import com.hps.switchmonitoring.api.dto.geo.ZoneHealthSummaryDto;
import com.hps.switchmonitoring.service.geo.ZoneHealthService;
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
public class ZoneHealthController {

    private final ZoneHealthService zoneHealthService;

    public ZoneHealthController(ZoneHealthService zoneHealthService) {
        this.zoneHealthService = zoneHealthService;
    }

    /**
     * GET /api/v1/zone-health/heatmap?date=2026-04-23
     * Heatmap complète : toutes les zones pour une date.
     * Retourne ZoneHealthSummaryDto avec la liste des CountryHealthKpiDto.
     */
    @GetMapping("/heatmap")
    public ResponseEntity<ZoneHealthSummaryDto> getHeatmap(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate target = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(zoneHealthService.computeFullHeatmap(target));
    }

    /**
     * GET /api/v1/zone-health/country/504?date=2026-04-23
     * KPI détaillé d'un pays spécifique.
     */
    @GetMapping("/country/{code}")
    public ResponseEntity<CountryHealthKpiDto> getCountryKpi(
            @PathVariable String code,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate target = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(zoneHealthService.computeCountryKpi(target, code));
    }

    /**
     * GET /api/v1/zone-health/alerts?date=2026-04-23
     * Retourne uniquement les zones en état CRITICAL ou WARNING.
     * Utilisé par le SmartAlertEngine et le panneau d'alertes temps réel.
     */
    @GetMapping("/alerts")
    public ResponseEntity<List<CountryHealthKpiDto>> getAlertZones(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate target = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(zoneHealthService.getAlertZones(target));
    }
}
