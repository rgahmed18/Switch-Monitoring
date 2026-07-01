package com.hps.switchmonitoring.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Représente un utilisateur de la plateforme HPS Switch Monitor.
 * Cycle de vie : invitation (is_active=false) → activation (is_active=true).
 */
@Entity
@Table(name = "APP_USER",
       uniqueConstraints = {
           @UniqueConstraint(name = "UQ_APP_USER_EMAIL",    columnNames = "EMAIL"),
           @UniqueConstraint(name = "UQ_APP_USER_USERNAME", columnNames = "USERNAME"),
           @UniqueConstraint(name = "UQ_APP_USER_TOKEN",    columnNames = "ACTIVATION_TOKEN"),
       })
public class AppUserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "app_user_seq")
    @SequenceGenerator(name = "app_user_seq", sequenceName = "APP_USER_SEQ", allocationSize = 1)
    @Column(name = "ID")
    private Long id;

    @Column(name = "USERNAME", nullable = false, length = 120)
    private String username;

    @Column(name = "FIRST_NAME", nullable = false, length = 100)
    private String firstName;

    @Column(name = "LAST_NAME", nullable = false, length = 100)
    private String lastName;

    @Column(name = "EMAIL", nullable = false, length = 255)
    private String email;

    @Column(name = "PASSWORD_HASH", length = 80)
    private String passwordHash;

    @Column(name = "ROLE", nullable = false, length = 20)
    private String role;

    @Column(name = "STATUS", nullable = false, length = 20)
    private String status;

    /** false jusqu'à ce que l'utilisateur ait défini son mot de passe via le lien d'invitation. */
    @Column(name = "IS_ACTIVE", nullable = false)
    private boolean active;

    /** UUID v4 envoyé dans le lien d'activation. Effacé après activation. */
    @Column(name = "ACTIVATION_TOKEN", length = 100)
    private String activationToken;

    @Column(name = "TOKEN_EXPIRY")
    private LocalDateTime tokenExpiry;

    /** Forcé à true pour les mots de passe temporaires générés par un admin. */
    @Column(name = "MUST_CHANGE_PASSWORD", nullable = false)
    private boolean mustChangePassword;

    /** Token UUID envoyé par email pour la réinitialisation du mot de passe oublié. */
    @Column(name = "RESET_TOKEN", length = 100)
    private String resetToken;

    @Column(name = "RESET_TOKEN_EXPIRY")
    private LocalDateTime resetTokenExpiry;

    /** Projets (codes banque) auxquels l'utilisateur a accès, stockés en CSV. */
    @Column(name = "PROJECTS", length = 500)
    private String projects;

    @Column(name = "CREATED_AT", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "UPDATED_AT")
    private LocalDateTime updatedAt;

    /** Non persisté — indique si l'email d'invitation a été envoyé avec succès. */
    @Transient
    private boolean emailSent = false;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null)  status  = "ACTIVE";
        if (projects == null) projects = "";
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ── Getters / Setters ────────────────────────────────────────────────────

    public Long getId()                       { return id; }
    public void setId(Long id)                { this.id = id; }

    public String getUsername()               { return username; }
    public void setUsername(String v)         { this.username = v; }

    public String getFirstName()              { return firstName; }
    public void setFirstName(String v)        { this.firstName = v; }

    public String getLastName()               { return lastName; }
    public void setLastName(String v)         { this.lastName = v; }

    public String getEmail()                  { return email; }
    public void setEmail(String v)            { this.email = v; }

    public String getPasswordHash()           { return passwordHash; }
    public void setPasswordHash(String v)     { this.passwordHash = v; }

    public String getRole()                   { return role; }
    public void setRole(String v)             { this.role = v; }

    public String getStatus()                 { return status; }
    public void setStatus(String v)           { this.status = v; }

    public boolean isActive()                 { return active; }
    public void setActive(boolean v)          { this.active = v; }

    public String getActivationToken()        { return activationToken; }
    public void setActivationToken(String v)  { this.activationToken = v; }

    public LocalDateTime getTokenExpiry()     { return tokenExpiry; }
    public void setTokenExpiry(LocalDateTime v){ this.tokenExpiry = v; }

    public boolean isMustChangePassword()     { return mustChangePassword; }
    public void setMustChangePassword(boolean v){ this.mustChangePassword = v; }

    public String getProjects()               { return projects; }
    public void setProjects(String v)         { this.projects = v; }

    public String getResetToken()             { return resetToken; }
    public void setResetToken(String v)       { this.resetToken = v; }

    public LocalDateTime getResetTokenExpiry()          { return resetTokenExpiry; }
    public void setResetTokenExpiry(LocalDateTime v)    { this.resetTokenExpiry = v; }

    public LocalDateTime getCreatedAt()       { return createdAt; }
    public LocalDateTime getUpdatedAt()       { return updatedAt; }

    public boolean isEmailSent()              { return emailSent; }
    public void setEmailSent(boolean v)       { this.emailSent = v; }
}
