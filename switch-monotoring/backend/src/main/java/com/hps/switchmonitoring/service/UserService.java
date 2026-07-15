package com.hps.switchmonitoring.service;

import com.hps.switchmonitoring.domain.AppUserEntity;
import com.hps.switchmonitoring.repository.AppUserRepository;
import com.hps.switchmonitoring.service.email.EmailSenderService;
import com.hps.switchmonitoring.service.email.EmailValidationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);
    private static final BCryptPasswordEncoder ENCODER = new BCryptPasswordEncoder(12);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private static final int ACTIVATION_TOKEN_EXPIRY_HOURS = 48;
    private static final int RESET_TOKEN_EXPIRY_HOURS      = 1;
    private static final int ADMIN_RESET_TOKEN_EXPIRY_HOURS = 1;
    private static final int MIN_PASSWORD_LENGTH = 8;

    // Au moins 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial
    private static final Pattern PASSWORD_PATTERN = Pattern.compile(
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z0-9]).{" + MIN_PASSWORD_LENGTH + ",}$"
    );

    private final AppUserRepository    userRepo;
    private final EmailSenderService   emailSender;
    private final EmailValidationService emailValidator;

    public UserService(AppUserRepository userRepo,
                       EmailSenderService emailSender,
                       EmailValidationService emailValidator) {
        this.userRepo       = userRepo;
        this.emailSender    = emailSender;
        this.emailValidator = emailValidator;
    }

    // ── Invitation (action admin) ─────────────────────────────────────────────

    @Transactional
    public AppUserEntity inviteUser(String email, String firstName, String lastName, String role, String projects) {
        final String normalizedEmail = email.trim().toLowerCase();

        if (!emailValidator.validate(normalizedEmail)) {
            throw new IllegalArgumentException(
                "Adresse email invalide ou domaine inexistant. Création bloquée.");
        }
        if (emailValidator.isDisposable(normalizedEmail)) {
            throw new IllegalArgumentException(
                "Les adresses email jetables/temporaires sont refusées.");
        }
        if (userRepo.existsByEmail(normalizedEmail)) {
            throw new IllegalStateException(
                "Un compte existe déjà avec cette adresse email.");
        }

        final String token    = generateSecureToken();
        final String username = buildUsername(normalizedEmail);

        AppUserEntity user = new AppUserEntity();
        user.setEmail(normalizedEmail);
        user.setFirstName(firstName.trim());
        user.setLastName(lastName.trim());
        user.setUsername(username);
        final String normalizedInviteRole = "ADMIN".equalsIgnoreCase(role) ? "ADMIN" : "USER";
        user.setRole(normalizedInviteRole);
        user.setStatus("ACTIVE");
        user.setActive(false);
        user.setMustChangePassword(true);
        user.setActivationToken(token);
        user.setTokenExpiry(LocalDateTime.now().plusHours(ACTIVATION_TOKEN_EXPIRY_HOURS));
        user.setProjects(projects != null ? projects.trim() : "");

        AppUserEntity saved = userRepo.save(user);
        log.info("[USER] Invitation créée — email={}, is_active=false", normalizedEmail);

        boolean emailSent = emailSender.sendActivationEmail(normalizedEmail, firstName.trim(), token);
        saved.setEmailSent(emailSent);
        return saved;
    }

    // ── Activation (l'utilisateur clique sur le lien) ─────────────────────────

    @Transactional
    public AppUserEntity activateAccount(String token, String newPassword) {
        validatePasswordStrength(newPassword);

        AppUserEntity user = userRepo.findByActivationToken(token)
            .orElseThrow(() ->
                new IllegalArgumentException("Lien d'activation invalide ou déjà utilisé."));

        if (user.isActive()) {
            throw new IllegalStateException("Ce compte est déjà activé. Connectez-vous directement.");
        }
        if (user.getTokenExpiry() != null &&
            LocalDateTime.now().isAfter(user.getTokenExpiry())) {
            throw new IllegalStateException(
                "Lien expiré (validité 48h). Contactez votre administrateur.");
        }

        user.setPasswordHash(ENCODER.encode(newPassword));
        user.setActive(true);
        user.setMustChangePassword(false);
        user.setActivationToken(null);   // invalide le token une fois utilisé
        user.setTokenExpiry(null);

        AppUserEntity activated = userRepo.save(user);
        log.info("[USER] Compte activé — email={}", user.getEmail());
        return activated;
    }

    // ── Authentification ──────────────────────────────────────────────────────

    public AppUserEntity authenticate(String email, String password) {
        AppUserEntity user = userRepo.findByEmail(email.trim().toLowerCase())
            .orElseThrow(() ->
                new IllegalArgumentException("Identifiants incorrects."));

        if (!user.isActive()) {
            throw new IllegalStateException(
                "Compte non activé. Vérifiez votre email d'invitation.");
        }
        if ("BLOCKED".equalsIgnoreCase(user.getStatus())) {
            throw new IllegalStateException(
                "Compte bloqué. Contactez votre administrateur.");
        }
        if (user.getPasswordHash() == null ||
            !ENCODER.matches(password, user.getPasswordHash())) {
            throw new IllegalArgumentException("Identifiants incorrects.");
        }

        log.info("[AUTH] Connexion réussie — email={}", email);
        return user;
    }

    // ── Mot de passe oublié ───────────────────────────────────────────────────

    @Transactional
    public void requestPasswordReset(String email) {
        final AppUserEntity user = userRepo.findByEmail(email.trim().toLowerCase())
            .orElse(null);
        // Ne jamais révéler si l'email existe ou non — retour silencieux
        if (user == null || !user.isActive()) return;

        final String token = generateSecureToken();
        user.setResetToken(token);
        user.setResetTokenExpiry(LocalDateTime.now().plusHours(RESET_TOKEN_EXPIRY_HOURS));
        userRepo.save(user);
        log.info("[USER] Token de réinitialisation généré pour : {}", email);
        emailSender.sendPasswordResetEmail(user.getEmail(), user.getFirstName(), token);
    }

    @Transactional
    public AppUserEntity applyPasswordReset(String token, String newPassword) {
        validatePasswordStrength(newPassword);
        AppUserEntity user = userRepo.findByResetToken(token)
            .orElseThrow(() ->
                new IllegalArgumentException("Lien invalide ou déjà utilisé."));

        if (user.getResetTokenExpiry() != null &&
            LocalDateTime.now().isAfter(user.getResetTokenExpiry())) {
            throw new IllegalStateException(
                "Lien expiré (validité 1h). Faites une nouvelle demande.");
        }

        user.setPasswordHash(ENCODER.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        user.setMustChangePassword(false);
        userRepo.save(user);
        log.info("[USER] Mot de passe réinitialisé pour : {}", user.getEmail());
        return user;
    }

    public Optional<AppUserEntity> findByResetToken(String token) {
        return userRepo.findByResetToken(token);
    }

    // ── Requêtes ──────────────────────────────────────────────────────────────

    public Optional<AppUserEntity> findByToken(String token) {
        return userRepo.findByActivationToken(token);
    }

    public List<AppUserEntity> findAll() {
        return userRepo.findAll();
    }

    public Optional<AppUserEntity> findByEmail(String email) {
        return userRepo.findByEmail(email.trim().toLowerCase());
    }

    // ── Actions admin sur les utilisateurs ────────────────────────────────────

    @Transactional
    public AppUserEntity updateUser(Long id, String firstName, String lastName, String role, String projects) {
        AppUserEntity user = userRepo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable."));
        user.setFirstName(firstName.trim());
        user.setLastName(lastName.trim());
        final String normalizedRole = "ADMIN".equalsIgnoreCase(role) ? "ADMIN" : "USER";
        user.setRole(normalizedRole);
        if (projects != null) user.setProjects(projects);
        AppUserEntity updated = userRepo.save(user);
        log.info("[USER] Mise a jour — id={}, nouveau role={}, projets={}", id, role, projects);
        return updated;
    }

    @Transactional
    public void deleteUser(Long id) {
        if (!userRepo.existsById(id)) {
            throw new IllegalArgumentException("Utilisateur introuvable.");
        }
        userRepo.deleteById(id);
        log.info("[USER] Suppression — id={}", id);
    }

    @Transactional
    public AppUserEntity toggleStatus(Long id) {
        AppUserEntity user = userRepo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable."));
        final String newStatus = "ACTIVE".equalsIgnoreCase(user.getStatus()) ? "BLOCKED" : "ACTIVE";
        user.setStatus(newStatus);
        AppUserEntity updated = userRepo.save(user);
        log.info("[USER] Statut modifie — id={}, nouveau statut={}", id, newStatus);
        return updated;
    }

    @Transactional
    public String adminResetPassword(Long id) {
        AppUserEntity user = userRepo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable."));
        final String token = generateSecureToken();
        user.setResetToken(token);
        user.setResetTokenExpiry(LocalDateTime.now().plusHours(ADMIN_RESET_TOKEN_EXPIRY_HOURS));
        user.setMustChangePassword(true);
        userRepo.save(user);
        log.info("[USER] Reset mot de passe par admin — id={}", id);
        boolean emailSent;
        try {
            emailSender.sendPasswordResetEmail(user.getEmail(), user.getFirstName(), token);
            emailSent = true;
        } catch (Exception e) {
            log.warn("[USER] Échec envoi email reset pour id={} : {}", id, e.getMessage());
            emailSent = false;
        }
        return emailSent ? null : token;
    }

    // ── Utilitaires ───────────────────────────────────────────────────────────

    private static String generateSecureToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static void validatePasswordStrength(String password) {
        if (password == null || !PASSWORD_PATTERN.matcher(password).matches()) {
            throw new IllegalArgumentException(
                "Le mot de passe doit contenir au moins " + MIN_PASSWORD_LENGTH +
                " caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.");
        }
    }

    private String buildUsername(String email) {
        String base = email.split("@")[0]
            .replaceAll("[^a-zA-Z0-9._-]", "")
            .toLowerCase();
        if (base.length() > 20) base = base.substring(0, 20);
        // Suffixe numérique pour éviter les collisions
        String candidate = base;
        int suffix = 1;
        while (userRepo.existsByUsername(candidate)) {
            candidate = base + suffix++;
        }
        return candidate;
    }
}
