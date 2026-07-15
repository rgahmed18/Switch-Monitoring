package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.service.AutohoActivityAdmService;
import com.hps.switchmonitoring.service.IsoSimulatorTask;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/simulator")
@Tag(name = "Simulateur", description = "Pilotage du simulateur de trafic ISO 8583 (generation automatique de transactions de demonstration)")
@ApiResponse(responseCode = "403", description = "Acces refuse : l'en-tete X-User-Role n'est pas ADMIN (endpoints de pilotage uniquement).",
    content = @Content(examples = @ExampleObject(value = "{\"error\": \"Accès réservé aux administrateurs.\"}")))
public class SimulatorController {

    private static final Logger log = LoggerFactory.getLogger(SimulatorController.class);

    private final IsoSimulatorTask         simulator;
    private final AutohoActivityAdmService txService;

    public SimulatorController(IsoSimulatorTask simulator, AutohoActivityAdmService txService) {
        this.simulator = simulator;
        this.txService = txService;
    }

    @Operation(
        summary = "Reinitialiser le compteur du simulateur",
        description = """
            Remet a zero le compteur interne de transactions generees, sans toucher aux transactions deja \
            en base. Le simulateur reprendra la generation jusqu'a atteindre a nouveau `maxTotal` (2000). \
            Reserve aux administrateurs.""")
    @ApiResponse(responseCode = "200", description = "Compteur reinitialise.",
        content = @Content(examples = @ExampleObject(value = "{\"status\": \"reset\", \"generated\": 0, \"maxTotal\": 2000}")))
    @PostMapping("/reset")
    public ResponseEntity<Map<String, Object>> reset(
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Role", required = false) String role) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(403).body(Map.of("error", "Accès réservé aux administrateurs."));
        }
        simulator.resetCounter();
        log.info("[SIMULATOR] Compteur réinitialisé");
        return ResponseEntity.ok(Map.of("status", "reset", "generated", 0, "maxTotal", 2000));
    }

    @Operation(
        summary = "Purger toutes les transactions et relancer la generation",
        description = """
            Operation destructive : supprime TOUTES les transactions existantes (AUTHO_ACTIVITY_ADM), \
            reinitialise le compteur du simulateur puis declenche immediatement la generation d'une nouvelle \
            transaction (le reste suit au rythme automatique de ~50 tx/min). Reserve aux administrateurs. \
            A utiliser uniquement pour repartir sur un jeu de donnees propre (demonstration, tests).""")
    @ApiResponse(responseCode = "200", description = "Base purgee, generation relancee.",
        content = @Content(examples = @ExampleObject(value = """
            {"status": "purged_and_started", "generated": 1, "maxTotal": 2000, "message": "Base purgée. Génération en cours (50 tx/min)."}""")))
    @PostMapping("/purge-and-regenerate")
    public ResponseEntity<Map<String, Object>> purgeAndRegenerate(
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Role", required = false) String role) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(403).body(Map.of("error", "Accès réservé aux administrateurs."));
        }
        log.warn("[SIMULATOR] Purge complète déclenchée");
        txService.purgeAll();
        simulator.resetCounter();
        simulator.generateSimulatedTransaction();
        int generated = simulator.getGenerated();
        return ResponseEntity.ok(Map.of(
            "status",    "purged_and_started",
            "generated", generated,
            "maxTotal",  2000,
            "message",   "Base purgée. Génération en cours (50 tx/min)."
        ));
    }

    @Operation(
        summary = "Consulter l'etat du simulateur",
        description = "Endpoint public (sans restriction de role) indiquant combien de transactions ont ete generees, combien il en reste avant d'atteindre `maxTotal`, et si la generation est terminee.")
    @ApiResponse(responseCode = "200", description = "Etat courant du simulateur.",
        content = @Content(examples = @ExampleObject(value = """
            {"generated": 1873, "maxTotal": 2000, "remaining": 127, "completed": false}""")))
    @io.swagger.v3.oas.annotations.security.SecurityRequirements
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        int count = simulator.getGenerated();
        return ResponseEntity.ok(Map.of(
            "generated", count,
            "maxTotal",  2000,
            "remaining", Math.max(0, 2000 - count),
            "completed", count >= 2000
        ));
    }
}
