package com.hps.switchmonitoring.service.email;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifie les branches de EmailValidationService qui ne dependent pas d'un
 * lookup DNS reseau : validation de format et detection de domaines jetables.
 * Le lookup DNS reel (checkDomainExists) n'est pas mockable ici (JNDI/InetAddress
 * statiques) et releve d'un test d'integration.
 */
class EmailValidationServiceTest {

  private final EmailValidationService service = new EmailValidationService();

  @Test
  void validate_devrait_rejeter_un_email_null() {
    assertThat(service.validate(null)).isFalse();
  }

  @Test
  void validate_devrait_rejeter_un_email_vide() {
    assertThat(service.validate("   ")).isFalse();
  }

  @Test
  void validate_devrait_rejeter_un_format_invalide() {
    assertThat(service.validate("pas-un-email")).isFalse();
    assertThat(service.validate("manque-arobase.com")).isFalse();
    assertThat(service.validate("@sans-local.com")).isFalse();
  }

  @Test
  void validate_devrait_rejeter_un_domaine_jetable_connu() {
    assertThat(service.validate("qa@mailinator.com")).isFalse();
    assertThat(service.validate("qa@yopmail.com")).isFalse();
    assertThat(service.validate("qa@10minutemail.com")).isFalse();
  }

  @Test
  void validate_devrait_rejeter_les_domaines_de_test_connus() {
    assertThat(service.validate("qa@example.com")).isFalse();
    assertThat(service.validate("qa@test.com")).isFalse();
  }

  @Test
  void isDisposable_devrait_detecter_un_domaine_jetable() {
    assertThat(service.isDisposable("qa@mailinator.com")).isTrue();
    assertThat(service.isDisposable("qa@guerrillamail.com")).isTrue();
  }

  @Test
  void isDisposable_devrait_retourner_false_pour_un_domaine_normal() {
    assertThat(service.isDisposable("qa@hps.ma")).isFalse();
  }

  @Test
  void isDisposable_devrait_gerer_un_email_null_ou_sans_arobase() {
    assertThat(service.isDisposable(null)).isFalse();
    assertThat(service.isDisposable("pas-un-email")).isFalse();
  }

  @Test
  void isDisposable_devrait_ignorer_la_casse_du_domaine() {
    assertThat(service.isDisposable("QA@MAILINATOR.COM")).isTrue();
  }
}
