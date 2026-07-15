package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.config.PaymentSystemConfiguration;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Controller exposant les configurations de zones, pays, banques, et codes de transaction
 * Fournit toutes les données de référence nécessaires pour le filtrage front-end
 */
@RestController
@RequestMapping("/api/v1/config")
public class ConfigController {

    // ============================================================================
    // ZONES & PAYS
    // ============================================================================

    /**
     * Récupère toutes les zones géographiques avec leurs pays respectifs
     * GET /api/v1/config/zones
     */
    @GetMapping("/zones")
    public ResponseEntity<Map<String, List<String>>> getZonesAndCountries() {
        return ResponseEntity.ok(PaymentSystemConfiguration.ZONES_AND_COUNTRIES);
    }

    /**
     * Récupère les pays d'une zone spécifique
     * GET /api/v1/config/zones/{zone}
     */
    @GetMapping("/zones/{zone}")
    public ResponseEntity<?> getCountriesByZone(@PathVariable String zone) {
        if (PaymentSystemConfiguration.ZONES_AND_COUNTRIES.containsKey(zone)) {
            return ResponseEntity.ok(Map.of(
                "zone", zone,
                "countries", PaymentSystemConfiguration.ZONES_AND_COUNTRIES.get(zone)
            ));
        }
        return ResponseEntity.badRequest()
            .body(Map.of("error", "Zone not found: " + zone));
    }

    // ============================================================================
    // BANQUES
    // ============================================================================

    /**
     * Récupère les banques d'un pays spécifique
     * GET /api/v1/config/banks/{country}
     */
    @GetMapping("/banks/{country}")
    public ResponseEntity<?> getBanksByCountry(@PathVariable String country) {
        if (PaymentSystemConfiguration.BANKS_BY_COUNTRY.containsKey(country)) {
            return ResponseEntity.ok(Map.of(
                "country", country,
                "banks", PaymentSystemConfiguration.BANKS_BY_COUNTRY.get(country),
                "count", PaymentSystemConfiguration.BANKS_BY_COUNTRY.get(country).size()
            ));
        }
        return ResponseEntity.badRequest()
            .body(Map.of("error", "Country not found: " + country));
    }

    /**
     * Récupère TOUTES les banques de TOUS les pays
     * GET /api/v1/config/banks/all
     */
    @GetMapping("/banks-all")
    public ResponseEntity<Map<String, List<String>>> getAllBanks() {
        return ResponseEntity.ok(PaymentSystemConfiguration.BANKS_BY_COUNTRY);
    }

    /**
     * Récupère les banques d'une zone spécifique
     * GET /api/v1/config/banks/zone/{zone}
     */
    @GetMapping("/banks-zone/{zone}")
    public ResponseEntity<?> getBanksByZone(@PathVariable String zone) {
        List<String> countries = PaymentSystemConfiguration.ZONES_AND_COUNTRIES.get(zone);
        if (countries == null) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Zone not found: " + zone));
        }

        Map<String, List<String>> banksByZone = new LinkedHashMap<>();
        for (String country : countries) {
            List<String> banks = PaymentSystemConfiguration.BANKS_BY_COUNTRY.get(country);
            if (banks != null) {
                banksByZone.put(country, banks);
            }
        }

        return ResponseEntity.ok(Map.of(
            "zone", zone,
            "banks", banksByZone,
            "totalCountries", countries.size()
        ));
    }

    // ============================================================================
    // TYPES & CODES DE TRANSACTION
    // ============================================================================

    /**
     * Récupère les types de transactions du système
     * GET /api/v1/config/transaction-types
     */
    @GetMapping("/transaction-types")
    public ResponseEntity<Map<String, String>> getTransactionTypes() {
        return ResponseEntity.ok(PaymentSystemConfiguration.MTI_TYPES);
    }

    /**
     * Récupère les types de transactions pour un canal spécifique
     * GET /api/v1/config/transaction-types/{channel}
     */
    @GetMapping("/transaction-types-channel/{channel}")
    public ResponseEntity<?> getTransactionTypesByChannel(@PathVariable String channel) {
        List<String> types = PaymentSystemConfiguration.TRANSACTION_TYPES_BY_CHANNEL.get(channel.toUpperCase());
        if (types != null) {
            return ResponseEntity.ok(Map.of(
                "channel", channel,
                "transactionTypes", types,
                "count", types.size()
            ));
        }
        return ResponseEntity.badRequest()
            .body(Map.of("error", "Channel not found: " + channel));
    }

    /**
     * Récupère TOUS les types de transactions par canal
     * GET /api/v1/config/transaction-types-all
     */
    @GetMapping("/transaction-types-all")
    public ResponseEntity<Map<String, List<String>>> getAllTransactionTypes() {
        return ResponseEntity.ok(PaymentSystemConfiguration.TRANSACTION_TYPES_BY_CHANNEL);
    }

    // ============================================================================
    // CODES DE RÉPONSE ISO 8583
    // ============================================================================

    /**
     * Récupère TOUS les codes de réponse ISO 8583
     * GET /api/v1/config/response-codes
     */
    @GetMapping("/response-codes")
    public ResponseEntity<Map<String, String>> getResponseCodes() {
        return ResponseEntity.ok(PaymentSystemConfiguration.ISO8583_RESPONSE_CODES);
    }

    /**
     * Récupère un code de réponse ISO 8583 spécifique
     * GET /api/v1/config/response-codes/{code}
     */
    @GetMapping("/response-code/{code}")
    public ResponseEntity<?> getResponseCode(@PathVariable String code) {
        String description = PaymentSystemConfiguration.ISO8583_RESPONSE_CODES.get(code);
        if (description != null) {
            return ResponseEntity.ok(Map.of(
                "code", code,
                "description", description
            ));
        }
        return ResponseEntity.badRequest()
            .body(Map.of("error", "Response code not found: " + code));
    }

    /**
     * Recherche les codes par motif (success, error, timeout, etc.)
     * GET /api/v1/config/response-codes-search?pattern=success
     */
    @GetMapping("/response-codes-search")
    public ResponseEntity<Map<String, String>> searchResponseCodes(@RequestParam String pattern) {
        Map<String, String> results = new LinkedHashMap<>();
        String lowerPattern = pattern.toLowerCase();

        PaymentSystemConfiguration.ISO8583_RESPONSE_CODES.forEach((code, description) -> {
            if (description.toLowerCase().contains(lowerPattern)) {
                results.put(code, description);
            }
        });

        return ResponseEntity.ok(results);
    }

    // ============================================================================
    // MÉTHODES DE SÉCURITÉ
    // ============================================================================

    /**
     * Récupère les méthodes de sécurité pour un canal spécifique
     * GET /api/v1/config/security-methods/{channel}
     */
    @GetMapping("/security-methods/{channel}")
    public ResponseEntity<?> getSecurityMethodsByChannel(@PathVariable String channel) {
        List<String> methods = PaymentSystemConfiguration.SECURITY_METHODS_BY_CHANNEL.get(channel.toUpperCase());
        if (methods != null) {
            return ResponseEntity.ok(Map.of(
                "channel", channel,
                "securityMethods", methods,
                "count", methods.size()
            ));
        }
        return ResponseEntity.badRequest()
            .body(Map.of("error", "Channel not found: " + channel));
    }

    /**
     * Récupère TOUTES les méthodes de sécurité par canal
     * GET /api/v1/config/security-methods-all
     */
    @GetMapping("/security-methods-all")
    public ResponseEntity<Map<String, List<String>>> getAllSecurityMethods() {
        return ResponseEntity.ok(PaymentSystemConfiguration.SECURITY_METHODS_BY_CHANNEL);
    }

    // ============================================================================
    // STATUTS DE TRANSACTION
    // ============================================================================

    /**
     * Récupère tous les statuts de transaction possibles
     * GET /api/v1/config/transaction-statuses
     */
    @GetMapping("/transaction-statuses")
    public ResponseEntity<Map<String, String>> getTransactionStatuses() {
        return ResponseEntity.ok(PaymentSystemConfiguration.TRANSACTION_STATUSES);
    }

    // ============================================================================
    // DASHBOARD DE CONFIGURATION
    // ============================================================================

    /**
     * Récupère TOUTE la configuration du système en un seul appel
     * GET /api/v1/config/complete (pour initialisation du dashboard)
     */
    @GetMapping("/complete")
    public ResponseEntity<?> getCompleteConfiguration() {
        return ResponseEntity.ok(Map.of(
            "zones", PaymentSystemConfiguration.ZONES_AND_COUNTRIES,
            "banks", PaymentSystemConfiguration.BANKS_BY_COUNTRY,
            "transactionTypes", PaymentSystemConfiguration.TRANSACTION_TYPES,
            "transactionTypesByChannel", PaymentSystemConfiguration.TRANSACTION_TYPES_BY_CHANNEL,
            "responseCodes", PaymentSystemConfiguration.ISO8583_RESPONSE_CODES,
            "securityMethods", PaymentSystemConfiguration.SECURITY_METHODS_BY_CHANNEL,
            "transactionStatuses", PaymentSystemConfiguration.TRANSACTION_STATUSES,
            "mtiTypes", PaymentSystemConfiguration.MTI_TYPES,
            "summary", Map.of(
                "totalZones", PaymentSystemConfiguration.ZONES_AND_COUNTRIES.size(),
                "totalCountries", PaymentSystemConfiguration.BANKS_BY_COUNTRY.size(),
                "totalBanks", PaymentSystemConfiguration.BANKS_BY_COUNTRY.values()
                    .stream().mapToInt(List::size).sum(),
                "totalResponseCodes", PaymentSystemConfiguration.ISO8583_RESPONSE_CODES.size()
            )
        ));
    }

    /**
     * Health check de la configuration
     * GET /api/v1/config/health
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> configHealth() {
        return ResponseEntity.ok(Map.of(
            "status", "OK",
            "timestamp", System.currentTimeMillis(),
            "zonesLoaded", !PaymentSystemConfiguration.ZONES_AND_COUNTRIES.isEmpty(),
            "banksLoaded", !PaymentSystemConfiguration.BANKS_BY_COUNTRY.isEmpty(),
            "codesLoaded", !PaymentSystemConfiguration.ISO8583_RESPONSE_CODES.isEmpty()
        ));
    }
}
