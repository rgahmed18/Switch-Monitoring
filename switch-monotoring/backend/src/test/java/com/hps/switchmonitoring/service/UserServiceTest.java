package com.hps.switchmonitoring.service;

import com.hps.switchmonitoring.domain.AppUserEntity;
import com.hps.switchmonitoring.repository.AppUserRepository;
import com.hps.switchmonitoring.service.email.EmailSenderService;
import com.hps.switchmonitoring.service.email.EmailValidationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

  @Mock private AppUserRepository userRepo;
  @Mock private EmailSenderService emailSender;
  @Mock private EmailValidationService emailValidator;

  private UserService userService;

  private static final BCryptPasswordEncoder ENCODER = new BCryptPasswordEncoder(12);
  private static final String STRONG_PASSWORD = "Str0ng!Pass";

  @BeforeEach
  void setUp() {
    userService = new UserService(userRepo, emailSender, emailValidator);
  }

  // ── authenticate() ──────────────────────────────────────────────────────

  @Test
  void authenticate_devrait_reussir_avec_identifiants_valides() {
    AppUserEntity user = new AppUserEntity();
    user.setEmail("qa@hps.ma");
    user.setActive(true);
    user.setStatus("ACTIVE");
    user.setPasswordHash(ENCODER.encode(STRONG_PASSWORD));

    when(userRepo.findByEmail("qa@hps.ma")).thenReturn(Optional.of(user));

    AppUserEntity result = userService.authenticate("qa@hps.ma", STRONG_PASSWORD);

    assertThat(result).isSameAs(user);
  }

  @Test
  void authenticate_devrait_rejeter_un_compte_non_active() {
    AppUserEntity user = new AppUserEntity();
    user.setEmail("qa@hps.ma");
    user.setActive(false);

    when(userRepo.findByEmail("qa@hps.ma")).thenReturn(Optional.of(user));

    assertThatThrownBy(() -> userService.authenticate("qa@hps.ma", STRONG_PASSWORD))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("non activé");
  }

  @Test
  void authenticate_devrait_rejeter_un_compte_bloque() {
    AppUserEntity user = new AppUserEntity();
    user.setEmail("qa@hps.ma");
    user.setActive(true);
    user.setStatus("BLOCKED");

    when(userRepo.findByEmail("qa@hps.ma")).thenReturn(Optional.of(user));

    assertThatThrownBy(() -> userService.authenticate("qa@hps.ma", STRONG_PASSWORD))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("bloqué");
  }

  @Test
  void authenticate_devrait_rejeter_un_mauvais_mot_de_passe() {
    AppUserEntity user = new AppUserEntity();
    user.setEmail("qa@hps.ma");
    user.setActive(true);
    user.setStatus("ACTIVE");
    user.setPasswordHash(ENCODER.encode(STRONG_PASSWORD));

    when(userRepo.findByEmail("qa@hps.ma")).thenReturn(Optional.of(user));

    assertThatThrownBy(() -> userService.authenticate("qa@hps.ma", "MauvaisMotDePasse1!"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("Identifiants incorrects");
  }

  @Test
  void authenticate_devrait_rejeter_un_email_inconnu() {
    when(userRepo.findByEmail("inconnu@hps.ma")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> userService.authenticate("inconnu@hps.ma", STRONG_PASSWORD))
        .isInstanceOf(IllegalArgumentException.class);
  }

  // ── activateAccount() ────────────────────────────────────────────────────

  @Test
  void activateAccount_devrait_activer_avec_un_token_valide() {
    AppUserEntity user = new AppUserEntity();
    user.setEmail("qa@hps.ma");
    user.setActive(false);
    user.setTokenExpiry(LocalDateTime.now().plusHours(1));

    when(userRepo.findByActivationToken("tok-123")).thenReturn(Optional.of(user));
    when(userRepo.save(any(AppUserEntity.class))).thenAnswer(inv -> inv.getArgument(0));

    AppUserEntity result = userService.activateAccount("tok-123", STRONG_PASSWORD);

    assertThat(result.isActive()).isTrue();
    assertThat(result.isMustChangePassword()).isFalse();
    assertThat(result.getActivationToken()).isNull();
    assertThat(result.getPasswordHash()).isNotBlank();
  }

  @Test
  void activateAccount_devrait_rejeter_un_mot_de_passe_faible() {
    assertThatThrownBy(() -> userService.activateAccount("tok-123", "faible"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("mot de passe");

    verify(userRepo, never()).findByActivationToken(anyString());
  }

  @Test
  void activateAccount_devrait_rejeter_un_token_deja_utilise() {
    AppUserEntity user = new AppUserEntity();
    user.setActive(true);

    when(userRepo.findByActivationToken("tok-123")).thenReturn(Optional.of(user));

    assertThatThrownBy(() -> userService.activateAccount("tok-123", STRONG_PASSWORD))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("déjà activé");
  }

  @Test
  void activateAccount_devrait_rejeter_un_token_expire() {
    AppUserEntity user = new AppUserEntity();
    user.setActive(false);
    user.setTokenExpiry(LocalDateTime.now().minusHours(1));

    when(userRepo.findByActivationToken("tok-123")).thenReturn(Optional.of(user));

    assertThatThrownBy(() -> userService.activateAccount("tok-123", STRONG_PASSWORD))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("expiré");
  }

  // ── inviteUser() ─────────────────────────────────────────────────────────

  @Test
  void inviteUser_devrait_rejeter_un_email_invalide() {
    when(emailValidator.validate("bad@x")).thenReturn(false);

    assertThatThrownBy(() ->
        userService.inviteUser("bad@x", "Ahmed", "R", "USER", ""))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("invalide");

    verify(userRepo, never()).save(any());
  }

  @Test
  void inviteUser_devrait_rejeter_un_email_jetable() {
    when(emailValidator.validate("qa@mailinator.com")).thenReturn(true);
    when(emailValidator.isDisposable("qa@mailinator.com")).thenReturn(true);

    assertThatThrownBy(() ->
        userService.inviteUser("qa@mailinator.com", "Ahmed", "R", "USER", ""))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("jetables");
  }

  @Test
  void inviteUser_devrait_rejeter_un_email_deja_utilise() {
    when(emailValidator.validate("qa@hps.ma")).thenReturn(true);
    when(emailValidator.isDisposable("qa@hps.ma")).thenReturn(false);
    when(userRepo.existsByEmail("qa@hps.ma")).thenReturn(true);

    assertThatThrownBy(() ->
        userService.inviteUser("qa@hps.ma", "Ahmed", "R", "USER", ""))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("existe déjà");
  }

  @Test
  void inviteUser_devrait_creer_un_compte_inactif_avec_token() {
    when(emailValidator.validate("qa@hps.ma")).thenReturn(true);
    when(emailValidator.isDisposable("qa@hps.ma")).thenReturn(false);
    when(userRepo.existsByEmail("qa@hps.ma")).thenReturn(false);
    when(userRepo.existsByUsername(anyString())).thenReturn(false);
    when(userRepo.save(any(AppUserEntity.class))).thenAnswer(inv -> inv.getArgument(0));
    when(emailSender.sendActivationEmail(anyString(), anyString(), anyString())).thenReturn(true);

    AppUserEntity result = userService.inviteUser("qa@hps.ma", "Ahmed", "R.", "USER", "AWB");

    assertThat(result.isActive()).isFalse();
    assertThat(result.isMustChangePassword()).isTrue();
    assertThat(result.getActivationToken()).isNotBlank();
    assertThat(result.getRole()).isEqualTo("USER");
    assertThat(result.isEmailSent()).isTrue();
  }

  // ── toggleStatus() ───────────────────────────────────────────────────────

  @Test
  void toggleStatus_devrait_basculer_active_vers_blocked() {
    AppUserEntity user = new AppUserEntity();
    user.setStatus("ACTIVE");
    when(userRepo.findById(1L)).thenReturn(Optional.of(user));
    when(userRepo.save(any(AppUserEntity.class))).thenAnswer(inv -> inv.getArgument(0));

    AppUserEntity result = userService.toggleStatus(1L);

    assertThat(result.getStatus()).isEqualTo("BLOCKED");
  }

  @Test
  void toggleStatus_devrait_basculer_blocked_vers_active() {
    AppUserEntity user = new AppUserEntity();
    user.setStatus("BLOCKED");
    when(userRepo.findById(1L)).thenReturn(Optional.of(user));
    when(userRepo.save(any(AppUserEntity.class))).thenAnswer(inv -> inv.getArgument(0));

    AppUserEntity result = userService.toggleStatus(1L);

    assertThat(result.getStatus()).isEqualTo("ACTIVE");
  }

  @Test
  void toggleStatus_devrait_echouer_si_utilisateur_introuvable() {
    when(userRepo.findById(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> userService.toggleStatus(99L))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("introuvable");
  }

  // ── deleteUser() ─────────────────────────────────────────────────────────

  @Test
  void deleteUser_devrait_echouer_si_utilisateur_introuvable() {
    when(userRepo.existsById(99L)).thenReturn(false);

    assertThatThrownBy(() -> userService.deleteUser(99L))
        .isInstanceOf(IllegalArgumentException.class);

    verify(userRepo, never()).deleteById(any());
  }
}
