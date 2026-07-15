package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.domain.AppUserEntity;
import com.hps.switchmonitoring.service.UserService;
import com.hps.switchmonitoring.service.email.EmailValidationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Administration", description = "Gestion des utilisateurs (reserve au role ADMIN, verifie via l'en-tete X-User-Role)")
@ApiResponse(responseCode = "403", description = "Acces refuse : l'en-tete X-User-Role n'est pas ADMIN.",
    content = @Content(examples = @ExampleObject(value = "{\"error\": \"Accès réservé aux administrateurs.\"}")))
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
    @Operation(
        summary = "Valider une adresse email (format + verification DNS du domaine)",
        description = """
            Verifie qu'un domaine email peut effectivement recevoir des messages (lookup DNS MX). \
            Utilise avant de creer/inviter un utilisateur pour eviter de saisir un domaine inexistant.""")
    @ApiResponse(responseCode = "200", description = "Resultat de la validation (booleen `valid`).",
        content = @Content(examples = {
            @ExampleObject(name = "Domaine valide", value = """
                {"valid": true, "email": "amine.icame16@gmail.com", "reason": "Domaine verifie par DNS — email valide."}"""),
            @ExampleObject(name = "Domaine invalide", value = """
                {"valid": false, "email": "test@domaine-inexistant-xyz.com", "reason": "Domaine invalide ou inexistant. Creation bloquee."}""")
        }))
    @GetMapping("/validate-email")
    public ResponseEntity<Map<String, Object>> validateEmail(
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @Parameter(description = "Adresse email a valider", example = "amine.icame16@gmail.com", required = true)
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

    @Operation(
        summary = "Inviter un nouvel utilisateur",
        description = """
            Cree un compte inactif et envoie un email contenant un lien d'activation \
            (valide 48h). Si le SMTP n'est pas configure, le lien est retourne directement \
            dans la reponse (`activationLink`) pour etre partage manuellement.

            Si l'email existe deja, la reponse reste generique (succes) pour eviter \
            l'enumeration des comptes existants — verifiez `emailSent`/`activationLink` \
            pour savoir si une invitation a reellement ete envoyee.""")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(content = @Content(examples = @ExampleObject(value = """
        {
          "email": "nouveau.utilisateur@hps.ma",
          "firstName": "Karim",
          "lastName": "Tazi",
          "role": "USER",
          "projects": "AWB,BMCE"
        }""")))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Invitation creee (email envoye ou lien a partager).",
            content = @Content(examples = {
                @ExampleObject(name = "Email envoye", value = """
                    {"success": true, "userId": 12, "email": "nouveau.utilisateur@hps.ma", "isActive": false, "emailSent": true, "message": "Invitation envoyée par email à nouveau.utilisateur@hps.ma."}"""),
                @ExampleObject(name = "SMTP non configure", value = """
                    {"success": true, "userId": 12, "email": "nouveau.utilisateur@hps.ma", "isActive": false, "emailSent": false, "message": "SMTP non configuré. Partagez le lien ci-dessous.", "activationLink": "http://localhost:4200/activate/8f14e45fceea167a5a36dedd4bea2543"}""")
            })),
        @ApiResponse(responseCode = "400", description = "Champs obligatoires manquants ou email invalide.",
            content = @Content(examples = @ExampleObject(value = "{\"success\": false, \"error\": \"email, firstName et lastName sont obligatoires.\"}")))
    })
    @PostMapping("/invite")
    public ResponseEntity<Map<String, Object>> inviteUser(
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Role", required = false) String userRole,
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

    @Operation(
        summary = "Lister tous les utilisateurs",
        description = "Retourne la liste complete des comptes (actifs, bloques, en attente d'activation).")
    @ApiResponse(responseCode = "200", description = "Liste des utilisateurs.",
        content = @Content(examples = @ExampleObject(value = """
            [
              {
                "id": 1, "username": "admin.initial", "firstName": "Admin", "lastName": "HPS",
                "email": "admin@hps.local", "role": "ADMIN", "status": "ACTIVE", "isActive": true,
                "mustChangePassword": false, "projects": "", "createdAt": "2026-01-15"
              },
              {
                "id": 2, "username": "amine.icame16", "firstName": "amine", "lastName": "içame",
                "email": "amine.icame16@gmail.com", "role": "USER", "status": "ACTIVE", "isActive": true,
                "mustChangePassword": false, "projects": "SGM", "createdAt": "2026-07-15"
              }
            ]""")))
    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> listUsers(
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Role", required = false) String userRole) {
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

    @Operation(
        summary = "Modifier un utilisateur",
        description = "Met a jour le prenom, nom, role et/ou les projets assignes d'un utilisateur existant. "
            + "Le champ `projects` est optionnel : omis, il n'est pas modifie.")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(content = @Content(examples = @ExampleObject(value = """
        {
          "firstName": "Amine",
          "lastName": "Icame",
          "role": "USER",
          "projects": "SGM,AWB"
        }""")))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Utilisateur mis a jour.",
            content = @Content(examples = @ExampleObject(value = """
                {"success": true, "id": 2, "firstName": "Amine", "lastName": "Icame", "role": "USER"}"""))),
        @ApiResponse(responseCode = "400", description = "Champs obligatoires manquants ou id inconnu.")
    })
    @PutMapping("/users/{id}")
    public ResponseEntity<Map<String, Object>> updateUser(
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @Parameter(description = "Identifiant de l'utilisateur", example = "2") @PathVariable Long id,
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

    @Operation(summary = "Supprimer un utilisateur", description = "Suppression definitive du compte.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Utilisateur supprime.",
            content = @Content(examples = @ExampleObject(value = "{\"success\": true, \"message\": \"Utilisateur supprime.\"}"))),
        @ApiResponse(responseCode = "400", description = "Identifiant inconnu.")
    })
    @DeleteMapping("/users/{id}")
    public ResponseEntity<Map<String, Object>> deleteUser(
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @Parameter(description = "Identifiant de l'utilisateur", example = "8") @PathVariable Long id) {
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

    @Operation(
        summary = "Basculer le statut ACTIVE/BLOCKED d'un utilisateur",
        description = "Bloque un compte actif ou reactive un compte bloque (bascule, pas de valeur explicite a fournir).")
    @ApiResponse(responseCode = "200", description = "Nouveau statut applique.",
        content = @Content(examples = @ExampleObject(value = "{\"success\": true, \"id\": 8, \"status\": \"BLOCKED\"}")))
    @PatchMapping("/users/{id}/status")
    public ResponseEntity<Map<String, Object>> toggleStatus(
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @Parameter(description = "Identifiant de l'utilisateur", example = "8") @PathVariable Long id) {
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

    @Operation(
        summary = "Forcer la reinitialisation du mot de passe d'un utilisateur",
        description = """
            Genere un jeton de reinitialisation et envoie un email a l'utilisateur. \
            Si le SMTP n'est pas configure, le lien est retourne directement dans la reponse.""")
    @ApiResponse(responseCode = "200", description = "Reinitialisation initiee.",
        content = @Content(examples = {
            @ExampleObject(name = "Email envoye", value = "{\"success\": true, \"emailSent\": true, \"message\": \"Email de reinitialisation envoye.\"}"),
            @ExampleObject(name = "SMTP non configure", value = """
                {"success": true, "emailSent": false, "resetLink": "http://localhost:4200/reset-password/3f9a1c2b8e7d4560af12", "message": "SMTP non configure. Partagez le lien de reinitialisation."}""")
        }))
    @PostMapping("/users/{id}/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(
            @Parameter(hidden = true) @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @Parameter(description = "Identifiant de l'utilisateur", example = "8") @PathVariable Long id) {
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
