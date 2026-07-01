package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.domain.AppUserEntity;
import com.hps.switchmonitoring.service.UserService;
import com.hps.switchmonitoring.service.email.EmailValidationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.beans.factory.annotation.Value;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

    private static final Logger log = LoggerFactory.getLogger(AdminController.class);

    @Value("${app.frontend.url}")
    private String frontendUrl;

    private final EmailValidationService emailValidationService;
    private final UserService            userService;

    public AdminController(EmailValidationService emailValidationService,
                           UserService userService) {
        this.emailValidationService = emailValidationService;
        this.userService            = userService;
    }

    private ResponseEntity<Map<String, Object>> forbiddenIfNotAdmin(String role) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(403)
                .body(Map.of("error", "Accès réservé aux administrateurs."));
        }
        return null;
    }

    /**
     * Validates an email address by checking its format and performing a DNS lookup
     * on the domain to verify it can receive emails.
     *
     * @param email the email address to validate
     * @return JSON: { "valid": boolean, "email": string, "reason": string }
     */
    @GetMapping("/validate-email")
    public ResponseEntity<Map<String, Object>> validateEmail(
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestParam String email) {
        ResponseEntity<Map<String, Object>> forbidden = forbiddenIfNotAdmin(userRole);
        if (forbidden != null) return forbidden;

        final String domain = email.contains("@")
            ? email.substring(email.lastIndexOf('@') + 1)
            : "invalid";

        log.info("[ADMIN] Email validation requested for domain: {}", domain);

        boolean valid = emailValidationService.validate(email);

        if (!valid) {
            log.warn("[ADMIN] Email validation FAILED for domain: {}", domain);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("valid",  valid);
        response.put("email",  email.trim().toLowerCase());
        response.put("reason", valid
            ? "Domaine verifie par DNS — email valide."
            : "Domaine invalide ou inexistant. Creation bloquee.");

        return ResponseEntity.ok(response);
    }

    // ── POST /api/v1/admin/invite ─────────────────────────────────────────────
    // Crée un compte inactif et envoie le lien d'activation par email.

    @PostMapping("/invite")
    public ResponseEntity<Map<String, Object>> inviteUser(
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestBody Map<String, String> body) {
        ResponseEntity<Map<String, Object>> forbidden = forbiddenIfNotAdmin(userRole);
        if (forbidden != null) return forbidden;
        final String email     = body.getOrDefault("email",     "").trim();
        final String firstName = body.getOrDefault("firstName", "").trim();
        final String lastName  = body.getOrDefault("lastName",  "").trim();
        final String role      = body.getOrDefault("role",      "USER").trim();
        final String projects  = body.getOrDefault("projects",  "").trim();

        if (email.isBlank() || firstName.isBlank() || lastName.isBlank()) {
            return ResponseEntity.badRequest()
                .body(Map.of("success", false, "error", "email, firstName et lastName sont obligatoires."));
        }

        log.info("[ADMIN] Invitation utilisateur: email={}, role={}, projets={}", email, role, projects);

        try {
            AppUserEntity user = userService.inviteUser(email, firstName, lastName, role, projects);
            Map<String, Object> resp = new HashMap<>();
            resp.put("success",   true);
            resp.put("userId",    user.getId());
            resp.put("email",     user.getEmail());
            resp.put("isActive",  user.isActive());
            resp.put("emailSent", user.isEmailSent());

            if (user.isEmailSent()) {
                resp.put("message", "Invitation envoyée par email à " + email + ".");
                log.info("[ADMIN] Email d'invitation envoyé à {}", email);
            } else {
                final String activationLink = frontendUrl + "/activate/" + user.getActivationToken();
                resp.put("message",        "SMTP non configuré. Partagez le lien ci-dessous.");
                resp.put("activationLink", activationLink);
                log.warn("[ADMIN] Email non envoyé pour {}. Lien : {}", email, activationLink);
            }
            return ResponseEntity.ok(resp);
        } catch (IllegalStateException e) {
            // Email déjà utilisé — on log côté serveur mais on renvoie un message neutre
            // pour éviter l'énumération des comptes existants
            log.warn("[ADMIN] Invitation refusée (compte existant) pour '{}'", email);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "emailSent", true,
                "message", "Si l'adresse est valide, l'invitation a été envoyée."
            ));
        } catch (IllegalArgumentException e) {
            log.warn("[ADMIN] Invitation refusée (validation) pour '{}': {}", email, e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("success", false, "error", "Adresse email invalide. Vérifiez le format et réessayez."));
        }
    }

    // ── GET /api/v1/admin/users ───────────────────────────────────────────────

    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> listUsers(
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        if (!"ADMIN".equalsIgnoreCase(userRole)) {
            return ResponseEntity.status(403).body(List.of());
        }
        List<Map<String, Object>> users = userService.findAll().stream()
            .map(u -> {
                Map<String, Object> m = new HashMap<>();
                m.put("id",                u.getId());
                m.put("username",          u.getUsername());
                m.put("firstName",         u.getFirstName());
                m.put("lastName",          u.getLastName());
                m.put("email",             u.getEmail());
                m.put("role",              u.getRole());
                m.put("status",            u.getStatus());
                m.put("isActive",          u.isActive());
                m.put("mustChangePassword", u.isMustChangePassword());
                m.put("projects",          u.getProjects() != null ? u.getProjects() : "");
                m.put("createdAt",         u.getCreatedAt() != null
                    ? u.getCreatedAt().toLocalDate().toString() : "");
                return m;
            })
            .toList();
        return ResponseEntity.ok(users);
    }

    // ── PUT /api/v1/admin/users/{id} ──────────────────────────────────────────

    @PutMapping("/users/{id}")
    public ResponseEntity<Map<String, Object>> updateUser(
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        ResponseEntity<Map<String, Object>> forbidden = forbiddenIfNotAdmin(userRole);
        if (forbidden != null) return forbidden;
        final String firstName = body.getOrDefault("firstName", "").trim();
        final String lastName  = body.getOrDefault("lastName",  "").trim();
        final String role      = body.getOrDefault("role",      "USER").trim();
        final String projects  = body.get("projects"); // null = ne pas modifier

        if (firstName.isBlank() || lastName.isBlank()) {
            return ResponseEntity.badRequest()
                .body(Map.of("success", false, "error", "firstName et lastName sont obligatoires."));
        }
        try {
            AppUserEntity user = userService.updateUser(id, firstName, lastName, role, projects);
            log.info("[ADMIN] Utilisateur mis a jour: id={}, role={}, projets={}", id, role, projects);
            return ResponseEntity.ok(Map.of(
                "success",   true,
                "id",        user.getId(),
                "firstName", user.getFirstName(),
                "lastName",  user.getLastName(),
                "role",      user.getRole()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    // ── DELETE /api/v1/admin/users/{id} ───────────────────────────────────────

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Map<String, Object>> deleteUser(
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @PathVariable Long id) {
        ResponseEntity<Map<String, Object>> forbidden = forbiddenIfNotAdmin(userRole);
        if (forbidden != null) return forbidden;
        try {
            userService.deleteUser(id);
            log.info("[ADMIN] Utilisateur supprime: id={}", id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Utilisateur supprime."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    // ── PATCH /api/v1/admin/users/{id}/status ─────────────────────────────────

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<Map<String, Object>> toggleStatus(
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @PathVariable Long id) {
        ResponseEntity<Map<String, Object>> forbidden = forbiddenIfNotAdmin(userRole);
        if (forbidden != null) return forbidden;
        try {
            AppUserEntity user = userService.toggleStatus(id);
            log.info("[ADMIN] Statut bascule: id={}, nouveau statut={}", id, user.getStatus());
            return ResponseEntity.ok(Map.of(
                "success", true,
                "id",      user.getId(),
                "status",  user.getStatus()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    // ── POST /api/v1/admin/users/{id}/reset-password ──────────────────────────

    @PostMapping("/users/{id}/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @PathVariable Long id) {
        ResponseEntity<Map<String, Object>> forbidden = forbiddenIfNotAdmin(userRole);
        if (forbidden != null) return forbidden;
        try {
            String token = userService.adminResetPassword(id);
            Map<String, Object> resp = new HashMap<>();
            resp.put("success", true);
            if (token != null) {
                final String resetLink = frontendUrl + "/reset-password/" + token;
                resp.put("emailSent",  false);
                resp.put("resetLink",  resetLink);
                resp.put("message",    "SMTP non configure. Partagez le lien de reinitialisation.");
                log.warn("[ADMIN] Email non envoye. Lien reset: {}", resetLink);
            } else {
                resp.put("emailSent", true);
                resp.put("message",   "Email de reinitialisation envoye.");
            }
            return ResponseEntity.ok(resp);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(Map.of("success", false, "error", e.getMessage()));
        }
    }
}
