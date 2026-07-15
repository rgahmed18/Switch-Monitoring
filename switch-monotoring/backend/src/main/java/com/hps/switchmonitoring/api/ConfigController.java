package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.config.PaymentSystemConfiguration;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Controller exposant les configurations de zones, pays, banques, et codes de transaction
 * Fournit toutes les données de référence nécessaires pour le filtrage front-end
 */
@RestController
@RequestMapping("/api/v1/config")
@Tag(name = "Configuration", description = "Donnees de reference statiques (zones, banques, codes ISO 8583) utilisees pour peupler les filtres du frontend")
@SecurityRequirements // donnees de reference publiques, sans restriction de role
public class ConfigController {

    // ============================================================================
    // ZONES & PAYS
    // ============================================================================

    @Operation(summary = "Lister toutes les zones geographiques et leurs pays",
        description = "Retourne la table de correspondance complete zone -> liste de pays, utilisee pour le filtre geographique du dashboard.")
    @ApiResponse(responseCode = "200", description = "Table zones/pays.",
        content = @Content(examples = @ExampleObject(value = """
            {"Afrique": ["Maroc", "Tunisie", "Senegal"], "Europe": ["France", "Espagne"]}""")))
    @GetMapping("/zones")
    public ResponseEntity<Map<String, List<String>>> getZonesAndCountries() {
        return ResponseEntity.ok(PaymentSystemConfiguration.ZONES_AND_COUNTRIES);
    }

    @Operation(summary = "Lister les pays d'une zone specifique")
    @ApiResponse(responseCode = "200", description = "Pays de la zone.",
        content = @Content(examples = @ExampleObject(value = """
            {"zone": "Afrique", "countries": ["Maroc", "Tunisie", "Senegal"]}""")))
    @ApiResponse(responseCode = "400", description = "Zone inconnue.",
        content = @Content(examples = @ExampleObject(value = "{\"error\": \"Zone not found: Atlantide\"}")))
    @GetMapping("/zones/{zone}")
    public ResponseEntity<?> getCountriesByZone(
            @Parameter(description = "Nom de la zone geographique", example = "Afrique") @PathVariable String zone) {
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

    @Operation(summary = "Lister les banques d'un pays specifique")
    @ApiResponse(responseCode = "200", description = "Banques du pays.",
        content = @Content(examples = @ExampleObject(value = """
            {"country": "Maroc", "banks": ["AWB", "BMCE", "CIH"], "count": 3}""")))
    @ApiResponse(responseCode = "400", description = "Pays inconnu.")
    @GetMapping("/banks/{country}")
    public ResponseEntity<?> getBanksByCountry(
            @Parameter(description = "Nom du pays", example = "Maroc") @PathVariable String country) {
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

    @Operation(summary = "Lister toutes les banques de tous les pays",
        description = "Retourne la table complete pays -> liste de banques.")
    @ApiResponse(responseCode = "200", description = "Table pays/banques.")
    @GetMapping("/banks-all")
    public ResponseEntity<Map<String, List<String>>> getAllBanks() {
        return ResponseEntity.ok(PaymentSystemConfiguration.BANKS_BY_COUNTRY);
    }

    @Operation(summary = "Lister les banques d'une zone geographique",
        description = "Agrege les banques de tous les pays appartenant a la zone donnee.")
    @ApiResponse(responseCode = "200", description = "Banques regroupees par pays pour la zone.",
        content = @Content(examples = @ExampleObject(value = """
            {"zone": "Afrique", "banks": {"Maroc": ["AWB", "BMCE"]}, "totalCountries": 3}""")))
    @ApiResponse(responseCode = "400", description = "Zone inconnue.")
    @GetMapping("/banks-zone/{zone}")
    public ResponseEntity<?> getBanksByZone(
            @Parameter(description = "Nom de la zone geographique", example = "Afrique") @PathVariable String zone) {
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

    @Operation(summary = "Lister les types de transaction (MTI) du systeme",
        description = "Retourne la table complete des MTI ISO 8583 (ex: `0100`, `0200`, `0400`) et leur description.")
    @ApiResponse(responseCode = "200", description = "Table des types de transaction.",
        content = @Content(examples = @ExampleObject(value = """
            {"0100": "Demande d'autorisation", "0200": "Demande financiere", "0400": "Demande d'annulation"}""")))
    @GetMapping("/transaction-types")
    public ResponseEntity<Map<String, String>> getTransactionTypes() {
        return ResponseEntity.ok(PaymentSystemConfiguration.MTI_TYPES);
    }

    @Operation(summary = "Lister les types de transaction disponibles pour un canal",
        description = "Ex: canal `POS`, `ATM`, `ECOM` — chaque canal n'autorise qu'un sous-ensemble de types de transaction.")
    @ApiResponse(responseCode = "200", description = "Types de transaction du canal.",
        content = @Content(examples = @ExampleObject(value = """
            {"channel": "ATM", "transactionTypes": ["Retrait", "Consultation solde"], "count": 2}""")))
    @ApiResponse(responseCode = "400", description = "Canal inconnu.")
    @GetMapping("/transaction-types-channel/{channel}")
    public ResponseEntity<?> getTransactionTypesByChannel(
            @Parameter(description = "Canal (POS, ATM, ECOM...)", example = "ATM") @PathVariable String channel) {
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

    @Operation(summary = "Lister tous les types de transaction, regroupes par canal")
    @ApiResponse(responseCode = "200", description = "Table canal -> types de transaction.")
    @GetMapping("/transaction-types-all")
    public ResponseEntity<Map<String, List<String>>> getAllTransactionTypes() {
        return ResponseEntity.ok(PaymentSystemConfiguration.TRANSACTION_TYPES_BY_CHANNEL);
    }

    // ============================================================================
    // CODES DE RÉPONSE ISO 8583
    // ============================================================================

    @Operation(summary = "Lister tous les codes de reponse ISO 8583 (DE 39)",
        description = "Retourne la table complete code -> description (ex: `00` = approuve, `51` = provision insuffisante).")
    @ApiResponse(responseCode = "200", description = "Table des codes de reponse.",
        content = @Content(examples = @ExampleObject(value = """
            {"00": "Approuvee", "05": "Refus generique", "51": "Provision insuffisante"}""")))
    @GetMapping("/response-codes")
    public ResponseEntity<Map<String, String>> getResponseCodes() {
        return ResponseEntity.ok(PaymentSystemConfiguration.ISO8583_RESPONSE_CODES);
    }

    @Operation(summary = "Obtenir la description d'un code de reponse ISO 8583 specifique")
    @ApiResponse(responseCode = "200", description = "Description du code.",
        content = @Content(examples = @ExampleObject(value = "{\"code\": \"51\", \"description\": \"Provision insuffisante\"}")))
    @ApiResponse(responseCode = "400", description = "Code inconnu.")
    @GetMapping("/response-code/{code}")
    public ResponseEntity<?> getResponseCode(
            @Parameter(description = "Code reponse ISO 8583 (DE 39)", example = "51") @PathVariable String code) {
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

    @Operation(
        summary = "Rechercher des codes de reponse par mot-cle",
        description = "Recherche insensible a la casse dans la description des codes (ex: `pattern=insuffisant` retrouve le code `51`).")
    @ApiResponse(responseCode = "200", description = "Codes correspondant au motif (peut etre vide).",
        content = @Content(examples = @ExampleObject(value = "{\"51\": \"Provision insuffisante\"}")))
    @GetMapping("/response-codes-search")
    public ResponseEntity<Map<String, String>> searchResponseCodes(
            @Parameter(description = "Motif recherche dans la description", example = "insuffisant") @RequestParam String pattern) {
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

    @Operation(summary = "Lister les methodes de securite disponibles pour un canal",
        description = "Ex: `PIN`, `3DS`, `puce EMV`, selon le canal (POS, ATM, ECOM).")
    @ApiResponse(responseCode = "200", description = "Methodes de securite du canal.",
        content = @Content(examples = @ExampleObject(value = """
            {"channel": "ECOM", "securityMethods": ["3DS", "CVV2"], "count": 2}""")))
    @ApiResponse(responseCode = "400", description = "Canal inconnu.")
    @GetMapping("/security-methods/{channel}")
    public ResponseEntity<?> getSecurityMethodsByChannel(
            @Parameter(description = "Canal (POS, ATM, ECOM...)", example = "ECOM") @PathVariable String channel) {
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

    @Operation(summary = "Lister toutes les methodes de securite, regroupees par canal")
    @ApiResponse(responseCode = "200", description = "Table canal -> methodes de securite.")
    @GetMapping("/security-methods-all")
    public ResponseEntity<Map<String, List<String>>> getAllSecurityMethods() {
        return ResponseEntity.ok(PaymentSystemConfiguration.SECURITY_METHODS_BY_CHANNEL);
    }

    // ============================================================================
    // STATUTS DE TRANSACTION
    // ============================================================================

    @Operation(summary = "Lister tous les statuts de transaction possibles",
        description = "Ex: `APPROVED`, `DECLINED`, `PENDING`, `REVERSED`, avec leur libelle d'affichage.")
    @ApiResponse(responseCode = "200", description = "Table des statuts de transaction.",
        content = @Content(examples = @ExampleObject(value = """
            {"APPROVED": "Approuvee", "DECLINED": "Refusee", "REVERSED": "Annulee"}""")))
    @GetMapping("/transaction-statuses")
    public ResponseEntity<Map<String, String>> getTransactionStatuses() {
        return ResponseEntity.ok(PaymentSystemConfiguration.TRANSACTION_STATUSES);
    }

    // ============================================================================
    // DASHBOARD DE CONFIGURATION
    // ============================================================================

    @Operation(
        summary = "Recuperer toute la configuration de reference en un seul appel",
        description = """
            Agrege zones, banques, types de transaction, codes de reponse, methodes de securite et statuts \
            en une seule reponse. Utilise par le frontend au demarrage pour initialiser tous les filtres \
            du dashboard sans multiplier les appels reseau.""")
    @ApiResponse(responseCode = "200", description = "Configuration complete, avec un resume chiffre (`summary`).",
        content = @Content(examples = @ExampleObject(value = """
            {
              "zones": {"Afrique": ["Maroc"]},
              "banks": {"Maroc": ["AWB", "BMCE"]},
              "transactionTypes": {"0200": "Demande financiere"},
              "responseCodes": {"00": "Approuvee"},
              "securityMethods": {"POS": ["PIN"]},
              "transactionStatuses": {"APPROVED": "Approuvee"},
              "mtiTypes": {"0200": "Demande financiere"},
              "summary": {"totalZones": 1, "totalCountries": 1, "totalBanks": 2, "totalResponseCodes": 1}
            }""")))
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

    @Operation(summary = "Verifier la disponibilite des donnees de configuration",
        description = "Endpoint de liveness indiquant si les tables de reference (zones, banques, codes) sont bien chargees en memoire.")
    @ApiResponse(responseCode = "200", description = "Etat de chargement de la configuration.",
        content = @Content(examples = @ExampleObject(value = """
            {"status": "OK", "timestamp": 1752612345678, "zonesLoaded": true, "banksLoaded": true, "codesLoaded": true}""")))
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
