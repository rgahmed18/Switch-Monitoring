package com.hps.switchmonitoring.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Verifie le masquage PAN conforme PCI-DSS v4.0 §3.3.1 : seuls le BIN (6 premiers
 * chiffres) et les 4 derniers chiffres peuvent apparaitre en clair.
 */
class SecurityUtilsTest {

  @Test
  void maskCardNumber_devrait_masquer_un_pan_standard_16_chiffres() {
    assertThat(SecurityUtils.maskCardNumber("4000005327187750"))
        .isEqualTo("400000XXXXXX7750");
  }

  @Test
  void maskCardNumber_devrait_ignorer_les_espaces_et_tirets() {
    assertThat(SecurityUtils.maskCardNumber("4111 1111 1111 1111"))
        .isEqualTo("411111XXXXXX1111");
    assertThat(SecurityUtils.maskCardNumber("4111-1111-1111-1111"))
        .isEqualTo("411111XXXXXX1111");
  }

  @Test
  void maskCardNumber_devrait_lever_une_exception_si_pan_null() {
    assertThatThrownBy(() -> SecurityUtils.maskCardNumber(null))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void maskCardNumber_devrait_lever_une_exception_si_pan_trop_court() {
    assertThatThrownBy(() -> SecurityUtils.maskCardNumber("123456"))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("trop court");
  }

  @Test
  void maskCardNumber_ne_devrait_jamais_exposer_plus_que_bin_et_suffixe() {
    String masked = SecurityUtils.maskCardNumber("4000005327187750");
    String middleDigits = masked.substring(6, masked.length() - 4);

    assertThat(middleDigits.chars()).allMatch(c -> c == 'X');
  }

  @Test
  void maskCardNumberSafe_devrait_retourner_null_si_pan_null() {
    assertThat(SecurityUtils.maskCardNumberSafe(null)).isNull();
  }

  @Test
  void maskCardNumberSafe_devrait_retourner_etoiles_si_pan_trop_court() {
    assertThat(SecurityUtils.maskCardNumberSafe("123")).isEqualTo("****");
  }

  @Test
  void maskCardNumberSafe_devrait_masquer_normalement_un_pan_valide() {
    assertThat(SecurityUtils.maskCardNumberSafe("4000005327187750"))
        .isEqualTo("400000XXXXXX7750");
  }

  @Test
  void looksLikeRawPan_devrait_detecter_une_sequence_de_13_a_19_chiffres() {
    assertThat(SecurityUtils.looksLikeRawPan("Carte: 4000005327187750")).isTrue();
    assertThat(SecurityUtils.looksLikeRawPan("4111111111111")).isTrue();
  }

  @Test
  void looksLikeRawPan_ne_devrait_pas_detecter_un_pan_deja_masque() {
    assertThat(SecurityUtils.looksLikeRawPan("400000XXXXXX7750")).isFalse();
  }

  @Test
  void looksLikeRawPan_devrait_retourner_false_pour_null_ou_court() {
    assertThat(SecurityUtils.looksLikeRawPan(null)).isFalse();
    assertThat(SecurityUtils.looksLikeRawPan("12345")).isFalse();
  }
}
