package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.service.AutohoActivityAdmService;
import com.hps.switchmonitoring.service.IsoSimulatorTask;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/simulator")
public class SimulatorController {

    private static final Logger log = LoggerFactory.getLogger(SimulatorController.class);

    private final IsoSimulatorTask         simulator;
    private final AutohoActivityAdmService txService;

    public SimulatorController(IsoSimulatorTask simulator, AutohoActivityAdmService txService) {
        this.simulator = simulator;
        this.txService = txService;
    }

    @PostMapping("/reset")
    public ResponseEntity<Map<String, Object>> reset(
            @RequestHeader(value = "X-User-Role", required = false) String role) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(403).body(Map.of("error", "Accès réservé aux administrateurs."));
        }
        simulator.resetCounter();
        log.info("[SIMULATOR] Compteur réinitialisé");
        return ResponseEntity.ok(Map.of("status", "reset", "generated", 0, "maxTotal", 2000));
    }

    @PostMapping("/purge-and-regenerate")
    public ResponseEntity<Map<String, Object>> purgeAndRegenerate(
            @RequestHeader(value = "X-User-Role", required = false) String role) {
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
