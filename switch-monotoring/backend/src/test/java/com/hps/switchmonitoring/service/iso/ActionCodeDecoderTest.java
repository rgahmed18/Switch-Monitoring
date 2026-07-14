package com.hps.switchmonitoring.service.iso;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifie la matrice de decodage des action codes ISO 8583 / HPS PowerCARD :
 * description metier, categorie, detection fraude et cas limites (code
 * absent, non reference).
 */
class ActionCodeDecoderTest {

  @Test
  void decode_devrait_reconnaitre_un_code_approuve() {
    var result = ActionCodeDecoder.decode("000");

    assertThat(result.isApproved()).isTrue();
    assertThat(result.category()).isEqualTo(ActionCodeDecoder.ActionCategory.APPROVED);
    assertThat(result.isFraudRelated()).isFalse();
  }

  @Test
  void decode_devrait_reconnaitre_un_code_de_suspicion_fraude() {
    var result = ActionCodeDecoder.decode("102");

    assertThat(result.isApproved()).isFalse();
    assertThat(result.isFraudRelated()).isTrue();
    assertThat(result.category()).isEqualTo(ActionCodeDecoder.ActionCategory.FRAUD_SUSPECTED);
    assertThat(result.requiresInvestigation()).isTrue();
  }

  @Test
  void decode_devrait_ignorer_les_espaces_autour_du_code() {
    var result = ActionCodeDecoder.decode("  000  ");

    assertThat(result.isApproved()).isTrue();
  }

  @Test
  void decode_devrait_gerer_un_code_null() {
    var result = ActionCodeDecoder.decode(null);

    assertThat(result.category()).isEqualTo(ActionCodeDecoder.ActionCategory.UNKNOWN);
    assertThat(result.isApproved()).isFalse();
    assertThat(result.descriptionFr()).contains("absent");
  }

  @Test
  void decode_devrait_gerer_un_code_vide() {
    var result = ActionCodeDecoder.decode("   ");

    assertThat(result.category()).isEqualTo(ActionCodeDecoder.ActionCategory.UNKNOWN);
  }

  @Test
  void decode_devrait_marquer_un_code_non_reference_comme_a_investiguer() {
    var result = ActionCodeDecoder.decode("999");

    assertThat(result.category()).isEqualTo(ActionCodeDecoder.ActionCategory.UNKNOWN);
    assertThat(result.requiresInvestigation()).isTrue();
    assertThat(result.descriptionFr()).contains("999");
  }

  @Test
  void isFraudSuspect_devrait_detecter_les_codes_de_la_liste_fraude() {
    assertThat(ActionCodeDecoder.isFraudSuspect("102")).isTrue();
    assertThat(ActionCodeDecoder.isFraudSuspect("181")).isTrue();
    assertThat(ActionCodeDecoder.isFraudSuspect("182")).isTrue();
    assertThat(ActionCodeDecoder.isFraudSuspect("183")).isTrue();
  }

  @Test
  void isFraudSuspect_devrait_retourner_false_pour_un_code_normal() {
    assertThat(ActionCodeDecoder.isFraudSuspect("000")).isFalse();
    assertThat(ActionCodeDecoder.isFraudSuspect(null)).isFalse();
  }

  @Test
  void isApproved_devrait_reconnaitre_les_codes_approuves() {
    assertThat(ActionCodeDecoder.isApproved("000")).isTrue();
    assertThat(ActionCodeDecoder.isApproved("002")).isTrue();
    assertThat(ActionCodeDecoder.isApproved("100")).isFalse();
    assertThat(ActionCodeDecoder.isApproved(null)).isFalse();
    assertThat(ActionCodeDecoder.isApproved("999")).isFalse();
  }

  @Test
  void isSystemError_devrait_reconnaitre_les_erreurs_systeme() {
    assertThat(ActionCodeDecoder.isSystemError("909")).isTrue();
    assertThat(ActionCodeDecoder.isSystemError("000")).isFalse();
    assertThat(ActionCodeDecoder.isSystemError(null)).isFalse();
  }

  @Test
  void isIssuerUnavailable_devrait_reconnaitre_les_codes_emetteur_indisponible() {
    assertThat(ActionCodeDecoder.isIssuerUnavailable("910")).isTrue();
    assertThat(ActionCodeDecoder.isIssuerUnavailable("911")).isTrue();
    assertThat(ActionCodeDecoder.isIssuerUnavailable("912")).isTrue();
    assertThat(ActionCodeDecoder.isIssuerUnavailable("000")).isFalse();
  }

  @Test
  void decode_devrait_retourner_une_action_suggeree_pour_carte_perdue() {
    var result = ActionCodeDecoder.decode("181");

    assertThat(result.suggestedAction()).containsIgnoringCase("retenir");
  }
}
