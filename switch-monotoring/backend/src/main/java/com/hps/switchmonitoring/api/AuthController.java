package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.config.RateLimiter;
import com.hps.switchmonitoring.domain.AppUserEntity;
import com.hps.switchmonitoring.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final UserService userService;
    private final RateLimiter rateLimiter;

    public AuthController(UserService userService, RateLimiter rateLimiter) {
        this.userService = userService;
        this.rateLimiter = rateLimiter;
    }

    // ── POST /api/v1/auth/login ───────────────────────────────────────────────

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {

        final String ip       = resolveClientIp(request);
        final String email    = body.getOrDefault("username", "").trim();
        final String password = body.getOrDefault("password", "");

        if (!rateLimiter.allowLogin(ip)) {
            log.warn("[AUTH] Rate limit dépassé pour IP={}", ip);
            return ResponseEntity.status(429)
                .body(Map.of("error", "Trop de tentatives. Réessayez dans 15 minutes."));
        }

        try {
            AppUserEntity user = userService.authenticate(email, password);
            rateLimiter.resetLogin(ip);
            return ResponseEntity.ok(toUserMap(user));
        } catch (Exception e) {
            log.warn("[AUTH] Échec de connexion pour '{}' depuis IP={}: {}", email, ip, e.getMessage());
            return ResponseEntity.status(401)
                .body(Map.of("error", e.getMessage()));
        }
    }

    // ── GET /api/v1/auth/token-info/{token} ───────────────────────────────────
    // Utilisé par la page /activate/:token pour valider le lien avant d'afficher le formulaire.

    @GetMapping("/token-info/{token}")
    public ResponseEntity<Map<String, Object>> tokenInfo(@PathVariable String token) {
        Optional<AppUserEntity> opt = userService.findByToken(token);

        if (opt.isEmpty()) {
            return ResponseEntity.status(404)
                .body(Map.of("valid", false, "reason", "Lien invalide ou déjà utilisé."));
        }

        AppUserEntity u = opt.get();

        if (u.isActive()) {
            return ResponseEntity.ok(
                Map.of("valid", false, "reason", "Compte déjà activé. Connectez-vous directement."));
        }
        if (u.getTokenExpiry() != null && LocalDateTime.now().isAfter(u.getTokenExpiry())) {
            return ResponseEntity.ok(
                Map.of("valid", false, "reason", "Lien expiré (validité 48h). Contactez votre administrateur."));
        }

        return ResponseEntity.ok(Map.of(
            "valid",     true,
            "firstName", u.getFirstName(),
            "email",     u.getEmail()
        ));
    }

    // ── POST /api/v1/auth/activate ────────────────────────────────────────────

    @PostMapping("/activate")
    public ResponseEntity<Map<String, Object>> activate(@RequestBody Map<String, String> body) {
        final String token    = body.getOrDefault("token", "");
        final String password = body.getOrDefault("password", "");

        try {
            AppUserEntity user = userService.activateAccount(token, password);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Compte activé avec succès. Vous pouvez maintenant vous connecter.",
                "email",   user.getEmail()
            ));
        } catch (Exception e) {
            log.warn("[AUTH] Échec d'activation pour token '{}': {}", token, e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    // ── POST /api/v1/auth/forgot-password ─────────────────────────────────────

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {

        final String ip    = resolveClientIp(request);
        final String email = body.getOrDefault("email", "").trim();

        if (!rateLimiter.allowForgotPassword(ip)) {
            log.warn("[AUTH] Rate limit forgot-password dépassé pour IP={}", ip);
            return ResponseEntity.status(429)
                .body(Map.of("error", "Trop de demandes. Réessayez dans 1 heure."));
        }

        try {
            userService.requestPasswordReset(email);
        } catch (Exception ignored) {
            // Réponse identique qu'un email existe ou non (anti-énumération)
        }
        return ResponseEntity.ok(Map.of(
            "message", "Si cette adresse est connue, un lien de réinitialisation a été envoyé."
        ));
    }

    // ── GET /api/v1/auth/reset-token-info/{token} ─────────────────────────────

    @GetMapping("/reset-token-info/{token}")
    public ResponseEntity<Map<String, Object>> resetTokenInfo(@PathVariable String token) {
        return userService.findByResetToken(token)
            .map(u -> {
                if (u.getResetTokenExpiry() != null &&
                    java.time.LocalDateTime.now().isAfter(u.getResetTokenExpiry())) {
                    return ResponseEntity.ok(Map.<String, Object>of(
                        "valid", false,
                        "reason", "Lien expiré. Faites une nouvelle demande de réinitialisation."));
                }
                return ResponseEntity.ok(Map.<String, Object>of(
                    "valid",     true,
                    "firstName", u.getFirstName(),
                    "email",     u.getEmail()));
            })
            .orElse(ResponseEntity.status(404)
                .body(Map.of("valid", false, "reason", "Lien invalide ou déjà utilisé.")));
    }

    // ── POST /api/v1/auth/reset-password ──────────────────────────────────────

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@RequestBody Map<String, String> body) {
        final String token    = body.getOrDefault("token",    "");
        final String password = body.getOrDefault("password", "");
        try {
            userService.applyPasswordReset(token, password);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Mot de passe réinitialisé. Vous pouvez vous connecter."
            ));
        } catch (Exception e) {
            log.warn("[AUTH] Échec reset-password: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private Map<String, Object> toUserMap(AppUserEntity u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",                 u.getId());
        m.put("username",           u.getUsername());
        m.put("firstName",          u.getFirstName());
        m.put("lastName",           u.getLastName());
        m.put("email",              u.getEmail());
        m.put("role",               u.getRole());
        m.put("status",             u.getStatus());
        m.put("mustChangePassword", u.isMustChangePassword());
        m.put("projects",           u.getProjects() == null ? "" : u.getProjects());
        m.put("createdAt",          u.getCreatedAt() != null
            ? u.getCreatedAt().toLocalDate().toString() : "");
        return m;
    }
}
