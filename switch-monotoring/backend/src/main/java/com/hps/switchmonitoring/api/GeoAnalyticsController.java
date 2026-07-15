package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.api.dto.geo.ActiveCountryDto;
import com.hps.switchmonitoring.api.dto.geo.ActiveCurrencyDto;
import com.hps.switchmonitoring.api.dto.geo.GeoFilterContextDto;
import com.hps.switchmonitoring.api.dto.geo.MultiZoneVolumeDto;
import com.hps.switchmonitoring.service.geo.GeoFilterService;
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
@Tag(name = "Analytique Geographique", description = "Filtrage bidirectionnel Pays <-> Devise et agregation de volume multi-zone")
@SecurityRequirements // lecture ouverte a tout utilisateur authentifie cote frontend
public class GeoAnalyticsController {

    private final GeoFilterService geoFilterService;

    public GeoAnalyticsController(GeoFilterService geoFilterService) {
        this.geoFilterService = geoFilterService;
    }

    @Operation(
        summary = "Contexte geographique initial (pays et devises actifs)",
        description = """
            Retourne la liste de tous les pays et devises ayant eu au moins une transaction a la date \
            donnee (jour courant par defaut). Appele au chargement de la page Analyse Geographique pour \
            initialiser les deux listes deroulantes de filtre avant toute selection utilisateur.""")
    @ApiResponse(responseCode = "200", description = "Contexte geographique (pays actifs + devises actives).",
        content = @Content(examples = @ExampleObject(value = """
            {
              "activeCountries": [{"code": "504", "name": "Maroc", "transactionCount": 1204}],
              "activeCurrencies": [{"code": "MAD", "name": "Dirham marocain", "transactionCount": 1780}]
            }""")))
    @GetMapping("/context")
    public ResponseEntity<GeoFilterContextDto> getInitialContext(
            @Parameter(description = "Date metier (par defaut : aujourd'hui)", example = "2026-07-15")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate target = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(geoFilterService.getInitialContext(target));
    }

    @Operation(
        summary = "Filtrage Pays -> Devise",
        description = "Retourne les devises effectivement utilisees par les transactions des pays selectionnes, pour permettre a l'utilisateur de restreindre ensuite par devise.")
    @ApiResponse(responseCode = "200", description = "Devises actives pour les pays donnes.",
        content = @Content(examples = @ExampleObject(value = """
            [{"code": "MAD", "name": "Dirham marocain", "transactionCount": 980}]""")))
    @GetMapping("/currencies")
    public ResponseEntity<List<ActiveCurrencyDto>> getCurrenciesForCountries(
            @Parameter(description = "Date metier (par defaut : aujourd'hui)", example = "2026-07-15")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @Parameter(description = "Codes pays ISO 3166 numeriques a filtrer", example = "504,840,978")
            @RequestParam List<String> countries) {
        LocalDate target = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(geoFilterService.getCurrenciesForCountries(target, countries));
    }

    @Operation(
        summary = "Filtrage Devise -> Pays",
        description = "Retourne les pays dans lesquels la devise selectionnee est effectivement utilisee, pour permettre le filtrage inverse (devise vers pays).")
    @ApiResponse(responseCode = "200", description = "Pays actifs pour la devise donnee.",
        content = @Content(examples = @ExampleObject(value = """
            [{"code": "504", "name": "Maroc", "transactionCount": 1204}]""")))
    @GetMapping("/countries")
    public ResponseEntity<List<ActiveCountryDto>> getCountriesForCurrency(
            @Parameter(description = "Date metier (par defaut : aujourd'hui)", example = "2026-07-15")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @Parameter(description = "Code devise ISO 4217 numerique", example = "504")
            @RequestParam String currency) {
        LocalDate target = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(geoFilterService.getCountriesForCurrency(target, currency));
    }

    @Operation(
        summary = "Volume multi-zone converti en MAD",
        description = """
            Agrege le volume de transactions sur une periode, pour un ensemble de pays et de devises, en \
            convertissant chaque montant en Dirham marocain (MAD) pour permettre une comparaison directe \
            entre zones geographiques heterogenes. Alimente les graphiques comparatifs de la page Analyse \
            Geographique.""")
    @ApiResponse(responseCode = "200", description = "Volume agrege et converti en MAD, par zone.",
        content = @Content(examples = @ExampleObject(value = """
            {
              "fromDate": "2026-07-01", "toDate": "2026-07-15",
              "totalVolumeMad": 4582310.75,
              "byCountry": {"504": 3200000.00, "840": 1382310.75}
            }""")))
    @GetMapping("/volume")
    public ResponseEntity<MultiZoneVolumeDto> getMultiZoneVolume(
            @Parameter(description = "Date de debut (incluse)", example = "2026-07-01")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @Parameter(description = "Date de fin (incluse)", example = "2026-07-15")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @Parameter(description = "Codes pays ISO 3166 numeriques a inclure", example = "504,840")
            @RequestParam List<String> countries,
            @Parameter(description = "Codes devise ISO 4217 numeriques a inclure", example = "504,840")
            @RequestParam List<String> currencies) {
        return ResponseEntity.ok(
            geoFilterService.getMultiZoneVolume(fromDate, toDate, countries, currencies)
        );
    }
}
