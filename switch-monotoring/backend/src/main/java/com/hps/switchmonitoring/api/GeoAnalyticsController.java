package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.api.dto.geo.ActiveCountryDto;
import com.hps.switchmonitoring.api.dto.geo.ActiveCurrencyDto;
import com.hps.switchmonitoring.api.dto.geo.GeoFilterContextDto;
import com.hps.switchmonitoring.api.dto.geo.MultiZoneVolumeDto;
import com.hps.switchmonitoring.service.geo.GeoFilterService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * API REST pour le filtrage bidirectionnel Pays ↔ Devise.
 * Base path : /api/v1/geo
 */
@RestController
@RequestMapping("/api/v1/geo")
public class GeoAnalyticsController {

    private final GeoFilterService geoFilterService;

    public GeoAnalyticsController(GeoFilterService geoFilterService) {
        this.geoFilterService = geoFilterService;
    }

    /**
     * GET /api/v1/geo/context?date=2026-04-23
     * Contexte initial : tous les pays et devises actifs pour une date.
     * Appelé au chargement de la page geo-analytics.
     */
    @GetMapping("/context")
    public ResponseEntity<GeoFilterContextDto> getInitialContext(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate target = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(geoFilterService.getInitialContext(target));
    }

    /**
     * GET /api/v1/geo/currencies?date=2026-04-23&countries=504,840,978
     * Filtrage Pays → Devise : retourne les devises utilisées dans les pays sélectionnés.
     */
    @GetMapping("/currencies")
    public ResponseEntity<List<ActiveCurrencyDto>> getCurrenciesForCountries(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam List<String> countries) {
        LocalDate target = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(geoFilterService.getCurrenciesForCountries(target, countries));
    }

    /**
     * GET /api/v1/geo/countries?date=2026-04-23&currency=840
     * Filtrage Devise → Pays : retourne les pays utilisant la devise sélectionnée.
     */
    @GetMapping("/countries")
    public ResponseEntity<List<ActiveCountryDto>> getCountriesForCurrency(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam String currency) {
        LocalDate target = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(geoFilterService.getCountriesForCurrency(target, currency));
    }

    /**
     * GET /api/v1/geo/volume?fromDate=&toDate=&countries=504,840&currencies=504,840
     * Volume multi-zone converti en MAD pour graphiques comparatifs.
     */
    @GetMapping("/volume")
    public ResponseEntity<MultiZoneVolumeDto> getMultiZoneVolume(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam List<String> countries,
            @RequestParam List<String> currencies) {
        return ResponseEntity.ok(
            geoFilterService.getMultiZoneVolume(fromDate, toDate, countries, currencies)
        );
    }
}
