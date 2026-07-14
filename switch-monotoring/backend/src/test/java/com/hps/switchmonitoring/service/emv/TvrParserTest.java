package com.hps.switchmonitoring.service.emv;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifie le parsing du TVR (Terminal Verification Results, EMV Book 3 Annex C1) :
 * extraction des flags par bit, score de risque et niveau agrege.
 */
class TvrParserTest {

  @Test
  void parse_devrait_retourner_clean_pour_un_tvr_tout_a_zero() {
    var result = TvrParser.parse("0000000000");

    assertThat(result.activeFlags()).isEmpty();
    assertThat(result.riskScore()).isZero();
    assertThat(result.riskLevel()).isEqualTo("CLEAN");
    assertThat(result.isFraudSuspect()).isFalse();
  }

  @Test
  void parse_devrait_detecter_CARD_ON_EXCEPTION_FILE_byte1_bit4() {
    // Byte 1 = 0x10 = 0001 0000 → CARD_ON_EXCEPTION_FILE
    var result = TvrParser.parse("1000000000");

    assertThat(result.activeFlags()).contains("CARD_ON_EXCEPTION_FILE");
    assertThat(result.riskScore()).isEqualTo(100);
    assertThat(result.riskLevel()).isEqualTo("HIGH");
    assertThat(result.isFraudSuspect()).isTrue();
    assertThat(result.criticalFlags()).contains("CARD_ON_EXCEPTION_FILE");
  }

  @Test
  void parse_devrait_detecter_SDA_FAILED_byte1_bit6() {
    // Byte 1 = 0x40 → SDA_FAILED
    var result = TvrParser.parse("4000000000");

    assertThat(result.activeFlags()).contains("SDA_FAILED");
    assertThat(result.riskScore()).isEqualTo(80);
    assertThat(result.riskLevel()).isEqualTo("HIGH");
  }

  @Test
  void parse_devrait_detecter_PIN_TRY_LIMIT_EXCEEDED_byte3() {
    // Byte 3 = 0x20 → PIN_TRY_LIMIT_EXCEEDED
    var result = TvrParser.parse("0000200000");

    assertThat(result.activeFlags()).contains("PIN_TRY_LIMIT_EXCEEDED");
    assertThat(result.criticalFlags()).contains("PIN_TRY_LIMIT_EXCEEDED");
    assertThat(result.isFraudSuspect()).isTrue();
  }

  @Test
  void parse_devrait_calculer_un_niveau_medium_pour_un_score_intermediaire() {
    // EXPIRED_APP (45) → MEDIUM (40-69)
    var result = TvrParser.parse("0040000000");

    assertThat(result.riskScore()).isEqualTo(45);
    assertThat(result.riskLevel()).isEqualTo("MEDIUM");
  }

  @Test
  void parse_devrait_calculer_un_niveau_low_pour_un_score_faible() {
    // NEW_CARD (5) → LOW (1-39)
    var result = TvrParser.parse("0008000000");

    assertThat(result.riskScore()).isEqualTo(5);
    assertThat(result.riskLevel()).isEqualTo("LOW");
  }

  @Test
  void parse_devrait_plafonner_le_score_a_100() {
    // Tous les bits actives sur les 5 bytes → somme > 100, plafonnee
    var result = TvrParser.parse("FFFFFFFFFF");

    assertThat(result.riskScore()).isEqualTo(100);
  }

  @Test
  void parse_devrait_gerer_un_tvr_null() {
    var result = TvrParser.parse(null);

    assertThat(result.riskLevel()).isEqualTo("UNKNOWN");
    assertThat(result.activeFlags()).isEmpty();
  }

  @Test
  void parse_devrait_gerer_un_tvr_vide() {
    var result = TvrParser.parse("");

    assertThat(result.riskLevel()).isEqualTo("UNKNOWN");
  }

  @Test
  void parse_devrait_gerer_un_tvr_trop_court() {
    var result = TvrParser.parse("AB");

    assertThat(result.riskLevel()).isEqualTo("UNKNOWN");
  }

  @Test
  void parse_devrait_ignorer_la_casse_et_les_espaces() {
    var result = TvrParser.parse(" 80 00 00 00 00 ");

    assertThat(result.activeFlags()).contains("OFFLINE_AUTH_NOT_PERFORMED");
  }

  @Test
  void parse_devrait_fournir_le_hex_nettoye_dans_rawHex() {
    var result = TvrParser.parse("80 00 00 00 00");

    assertThat(result.rawHex()).isEqualTo("8000000000");
  }

  @Test
  void parse_devrait_fournir_des_labels_francais_pour_les_flags_actifs() {
    var result = TvrParser.parse("1000000000");

    assertThat(result.activeFlagsLabels())
        .contains("Carte présente dans la liste d'exception");
  }

  @Test
  void parse_ne_devrait_pas_marquer_fraude_pour_un_score_faible_sans_flag_critique() {
    // NEW_CARD (5) seul : score bas, pas de flag critique
    var result = TvrParser.parse("0008000000");

    assertThat(result.isFraudSuspect()).isFalse();
  }
}
