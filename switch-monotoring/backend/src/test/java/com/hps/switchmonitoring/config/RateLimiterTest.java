package com.hps.switchmonitoring.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifie les seuils anti brute-force du RateLimiter (5 tentatives login / 15 min,
 * 3 tentatives forgot-password / 1h), independamment de tout contexte Spring.
 */
class RateLimiterTest {

  private final RateLimiter rateLimiter = new RateLimiter();

  @Test
  void allowLogin_devrait_autoriser_les_5_premieres_tentatives() {
    String ip = "10.0.0.1";
    for (int i = 0; i < 5; i++) {
      assertThat(rateLimiter.allowLogin(ip)).isTrue();
    }
  }

  @Test
  void allowLogin_devrait_bloquer_la_6e_tentative() {
    String ip = "10.0.0.2";
    for (int i = 0; i < 5; i++) {
      rateLimiter.allowLogin(ip);
    }
    assertThat(rateLimiter.allowLogin(ip)).isFalse();
  }

  @Test
  void allowLogin_devrait_isoler_les_compteurs_par_ip() {
    String ipA = "10.0.0.3";
    String ipB = "10.0.0.4";
    for (int i = 0; i < 5; i++) {
      rateLimiter.allowLogin(ipA);
    }

    assertThat(rateLimiter.allowLogin(ipA)).isFalse();
    assertThat(rateLimiter.allowLogin(ipB)).isTrue();
  }

  @Test
  void resetLogin_devrait_reautoriser_immediatement_les_tentatives() {
    String ip = "10.0.0.5";
    for (int i = 0; i < 5; i++) {
      rateLimiter.allowLogin(ip);
    }
    assertThat(rateLimiter.allowLogin(ip)).isFalse();

    rateLimiter.resetLogin(ip);

    assertThat(rateLimiter.allowLogin(ip)).isTrue();
  }

  @Test
  void allowForgotPassword_devrait_autoriser_les_3_premieres_tentatives() {
    String ip = "10.0.0.6";
    for (int i = 0; i < 3; i++) {
      assertThat(rateLimiter.allowForgotPassword(ip)).isTrue();
    }
  }

  @Test
  void allowForgotPassword_devrait_bloquer_la_4e_tentative() {
    String ip = "10.0.0.7";
    for (int i = 0; i < 3; i++) {
      rateLimiter.allowForgotPassword(ip);
    }
    assertThat(rateLimiter.allowForgotPassword(ip)).isFalse();
  }

  @Test
  void login_et_forgotPassword_devraient_avoir_des_compteurs_independants() {
    String ip = "10.0.0.8";
    for (int i = 0; i < 5; i++) {
      rateLimiter.allowLogin(ip);
    }
    assertThat(rateLimiter.allowLogin(ip)).isFalse();

    // Le compteur forgot-password ne doit pas etre affecte par le blocage login
    assertThat(rateLimiter.allowForgotPassword(ip)).isTrue();
  }
}
