package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.config.RateLimiter;
import com.hps.switchmonitoring.domain.AppUserEntity;
import com.hps.switchmonitoring.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentification", description = "Connexion, activation de compte et reinitialisation de mot de passe (sans JWT)")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final UserService userService;
    private final RateLimiter rateLimiter;

    public AuthController(UserService userService, RateLimiter rateLimiter) {
        this.userService = userService;
        this.rateLimiter = rateLimiter;
    }

    // ── POST /api/v1/auth/login ───────────────────────────────────────────────

    @Operation(
        summary = "Se connecter",
        description = """
            Authentifie un utilisateur par email/mot de passe et retourne son profil complet. \
            C'est ce profil (notamment le champ `role`) que le frontend renvoie ensuite dans les \
            en-tetes `X-User-Email`/`X-User-Role` de chaque requete suivante.

            Protege par un rate-limiter par adresse IP (voir reponse 429).""")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
        required = true,
        content = @Content(
            mediaType = MediaType.APPLICATION_JSON_VALUE,
            examples = @ExampleObject(
                name = "Identifiants",
                value = """
                    {
                      "username": "admin@hps.local",
                      "password": "Admin@2025!"
                    }""")))
    @ApiResponse(
        responseCode = "200",
        description = "Connexion reussie.",
        content = @Content(examples = @ExampleObject(value = """
            {
              "id": 1,
              "username": "admin.initial",
              "firstName": "Admin",
              "lastName": "HPS",
              "email": "admin@hps.local",
              "role": "ADMIN",
              "status": "ACTIVE",
              "mustChangePassword": false,
              "projects": "AWB,BMCE,SGM",
              "createdAt": "2026-01-15"
            }""")))
    @ApiResponse(
        responseCode = "401",
        description = "Email ou mot de passe incorrect.",
        content = @Content(examples = @ExampleObject(value = "{\"error\": \"Identifiants incorrects.\"}")))
    @ApiResponse(
        responseCode = "429",
        description = "Trop de tentatives echouees depuis cette IP (anti brute-force).",
        content = @Content(examples = @ExampleObject(
            value = "{\"error\": \"Trop de tentatives. Réessayez dans 15 minutes.\"}")))
    @SecurityRequirements // endpoint public, aucun header requis avant connexion
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

    // ── GET /api/v1/auth/me ────────────────────────────────────────────────────
    // Permet a tout utilisateur authentifie (pas seulement ADMIN, contrairement a
    // GET /admin/users) de recharger ses propres donnees a jour, notamment ses
    // projets assignes : sans cet endpoint, un non-admin reste bloque sur les
    // projets figes dans sa session depuis le login, meme apres une reassignation.

    @Operation(
        summary = "Recharger mon propre profil",
        description = """
            Retourne les donnees a jour de l'utilisateur identifie par l'en-tete `X-User-Email`. \
            Contrairement a `GET /admin/users`, accessible a tout role (ADMIN ou USER) : \
            permet a un utilisateur non-admin de voir immediatement une reassignation de projets \
            faite par un administrateur, sans avoir a se reconnecter.""")
    @Parameter(name = "X-User-Email", description = "Email de l'utilisateur courant", required = true, in = io.swagger.v3.oas.annotations.enums.ParameterIn.HEADER)
    @ApiResponse(
        responseCode = "200",
        description = "Profil a jour renvoye.",
        content = @Content(examples = @ExampleObject(value = """
            {
              "id": 2,
              "username": "amine.icame16",
              "firstName": "amine",
              "lastName": "içame",
              "email": "amine.icame16@gmail.com",
              "role": "USER",
              "status": "ACTIVE",
              "mustChangePassword": false,
              "projects": "SGM",
              "createdAt": "2026-07-15"
            }""")))
    @ApiResponse(responseCode = "401", description = "En-tete X-User-Email absent ou vide.")
    @ApiResponse(responseCode = "404", description = "Aucun utilisateur ne correspond a cet email.")
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(
            @RequestHeader(value = "X-User-Email", required = false) String userEmail) {

        if (userEmail == null || userEmail.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("error", "Non authentifié."));
        }

        return userService.findByEmail(userEmail)
            .map(u -> ResponseEntity.ok(toUserMap(u)))
            .orElse(ResponseEntity.status(404).body(Map.of("error", "Utilisateur introuvable.")));
    }

    // ── GET /api/v1/auth/token-info/{token} ───────────────────────────────────
    // Utilisé par la page /activate/:token pour valider le lien avant d'afficher le formulaire.

    @Operation(
        summary = "Verifier un lien d'activation de compte",
        description = """
            Utilise par la page `/activate/:token` avant d'afficher le formulaire de creation \
            de mot de passe, pour verifier que le lien recu par email est encore valide \
            (compte pas deja active, lien pas expire au-dela de 48h).""")
    @ApiResponse(responseCode = "200", description = "Reponse retournee que le lien soit valide ou non (voir `valid`).",
        content = @Content(examples = {
            @ExampleObject(name = "Lien valide", value = """
                {"valid": true, "firstName": "Amine", "email": "amine.icame16@gmail.com"}"""),
            @ExampleObject(name = "Compte deja active", value = """
                {"valid": false, "reason": "Compte déjà activé. Connectez-vous directement."}""")
        }))
    @ApiResponse(responseCode = "404", description = "Token invalide ou deja consomme.")
    @SecurityRequirements // accessible sans etre connecte (page publique d'activation)
    @GetMapping("/token-info/{token}")
    public ResponseEntity<Map<String, Object>> tokenInfo(
            @Parameter(description = "Jeton d'activation recu par email", example = "8f14e45fceea167a5a36dedd4bea2543")
            @PathVariable String token) {
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

    @Operation(
        summary = "Activer un compte et definir le mot de passe initial",
        description = "Consomme le jeton d'activation recu par email et definit le mot de passe choisi par l'utilisateur.")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(content = @Content(examples = @ExampleObject(value = """
        {
          "token": "8f14e45fceea167a5a36dedd4bea2543",
          "password": "MonNouveauMdp@2026"
        }""")))
    @ApiResponse(responseCode = "200", description = "Compte active avec succes.",
        content = @Content(examples = @ExampleObject(value = """
            {"success": true, "message": "Compte activé avec succès. Vous pouvez maintenant vous connecter.", "email": "amine.icame16@gmail.com"}""")))
    @ApiResponse(responseCode = "400", description = "Token invalide/expire ou mot de passe ne respectant pas la politique.",
        content = @Content(examples = @ExampleObject(value = "{\"success\": false, \"error\": \"Lien d'activation invalide ou déjà utilisé.\"}")))
    @SecurityRequirements
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

    @Operation(
        summary = "Demander la reinitialisation du mot de passe",
        description = """
            Envoie un email contenant un lien de reinitialisation si l'adresse existe. \
            La reponse est identique que l'email existe ou non (protection anti-enumeration \
            de comptes). Protege par un rate-limiter par IP.""")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(content = @Content(examples = @ExampleObject(value = "{\"email\": \"amine.icame16@gmail.com\"}")))
    @ApiResponse(responseCode = "200", description = "Reponse generique, email envoye si le compte existe.",
        content = @Content(examples = @ExampleObject(
            value = "{\"message\": \"Si cette adresse est connue, un lien de réinitialisation a été envoyé.\"}")))
    @ApiResponse(responseCode = "429", description = "Trop de demandes depuis cette IP.")
    @SecurityRequirements
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

    @Operation(
        summary = "Verifier un lien de reinitialisation de mot de passe",
        description = "Utilise par la page `/reset-password/:token` avant d'afficher le formulaire de nouveau mot de passe.")
    @ApiResponse(responseCode = "200", description = "Reponse retournee que le lien soit valide ou non (voir `valid`).")
    @ApiResponse(responseCode = "404", description = "Token invalide ou deja consomme.")
    @SecurityRequirements
    @GetMapping("/reset-token-info/{token}")
    public ResponseEntity<Map<String, Object>> resetTokenInfo(
            @Parameter(description = "Jeton de reinitialisation recu par email") @PathVariable String token) {
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

    @Operation(
        summary = "Appliquer un nouveau mot de passe",
        description = "Consomme le jeton de reinitialisation et definit le nouveau mot de passe choisi.")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(content = @Content(examples = @ExampleObject(value = """
        {
          "token": "3f9a1c2b8e7d4560af12",
          "password": "NouveauMdp@2026"
        }""")))
    @ApiResponse(responseCode = "200", description = "Mot de passe reinitialise avec succes.",
        content = @Content(examples = @ExampleObject(
            value = "{\"success\": true, \"message\": \"Mot de passe réinitialisé. Vous pouvez vous connecter.\"}")))
    @ApiResponse(responseCode = "400", description = "Token invalide/expire.",
        content = @Content(examples = @ExampleObject(value = "{\"success\": false, \"error\": \"Lien invalide ou déjà utilisé.\"}")))
    @SecurityRequirements
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
