package com.hps.switchmonitoring.service.iso;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifie le decodage des champs MTI, processing_code et function_code
 * selon ISO 8583-1:2003 et les specificites HPS PowerCARD.
 */
class Iso8583DecoderTest {

  // ── decodeMti ─────────────────────────────────────────────────────────────

  @Test
  void decodeMti_devrait_decoder_une_demande_autorisation_1100() {
    var result = Iso8583Decoder.decodeMti("1100");

    assertThat(result.version()).isEqualTo("ISO 8583-2:1993");
    assertThat(result.messageClass()).isEqualTo("Autorisation");
    assertThat(result.isRequest()).isTrue();
    assertThat(result.isResponse()).isFalse();
    assertThat(result.fullDescription()).contains("Auth Request");
  }

  @Test
  void decodeMti_devrait_decoder_une_reponse_financiere_0210() {
    var result = Iso8583Decoder.decodeMti("0210");

    assertThat(result.version()).isEqualTo("ISO 8583-1:1987");
    assertThat(result.messageClass()).isEqualTo("Financière");
    assertThat(result.isFinancial()).isTrue();
    assertThat(result.isResponse()).isTrue();
  }

  @Test
  void decodeMti_devrait_detecter_un_reversal() {
    var result = Iso8583Decoder.decodeMti("1420");

    assertThat(result.isReversal()).isTrue();
    assertThat(result.messageClass()).isEqualTo("Reversal / Chargeback");
  }

  @Test
  void decodeMti_devrait_gerer_un_mti_null() {
    var result = Iso8583Decoder.decodeMti(null);

    assertThat(result.fullDescription()).isEqualTo("MTI absent");
    assertThat(result.isRequest()).isFalse();
  }

  @Test
  void decodeMti_devrait_gerer_un_mti_vide() {
    var result = Iso8583Decoder.decodeMti("");

    assertThat(result.fullDescription()).isEqualTo("MTI absent");
  }

  @Test
  void decodeMti_devrait_gerer_un_mti_trop_court() {
    var result = Iso8583Decoder.decodeMti("11");

    assertThat(result.fullDescription()).isEqualTo("MTI incomplet");
  }

  @Test
  void decodeMti_devrait_reconnaitre_un_mti_prive_HPS() {
    var result = Iso8583Decoder.decodeMti("9100");

    assertThat(result.version()).isEqualTo("Privé (HPS PowerCARD)");
  }

  @Test
  void decodeMti_devrait_fournir_une_description_generique_pour_mti_non_catalogue() {
    var result = Iso8583Decoder.decodeMti("1600");

    assertThat(result.fullDescription()).contains("non catalogué");
  }

  @Test
  void decodeMti_devrait_ignorer_les_espaces() {
    var result = Iso8583Decoder.decodeMti("  1100  ");

    assertThat(result.isRequest()).isTrue();
  }

  // ── decodeProcessingCode ─────────────────────────────────────────────────

  @Test
  void decodeProcessingCode_devrait_decoder_un_achat_standard() {
    var result = Iso8583Decoder.decodeProcessingCode("00", "00", "00");

    assertThat(result.transactionType()).contains("Achat");
    assertThat(result.sourceAccountType()).contains("Par défaut");
  }

  @Test
  void decodeProcessingCode_devrait_decoder_un_retrait_especes() {
    var result = Iso8583Decoder.decodeProcessingCode("01", "10", "00");

    assertThat(result.transactionType()).contains("Retrait espèces");
    assertThat(result.sourceAccountType()).isEqualTo("Savings");
  }

  @Test
  void decodeProcessingCode_devrait_gerer_un_code_null() {
    var result = Iso8583Decoder.decodeProcessingCode(null, null, null);

    assertThat(result.transactionType()).isEqualTo("Inconnu");
    assertThat(result.fullDescription()).isEqualTo("Code absent");
  }

  @Test
  void decodeProcessingCode_devrait_fournir_un_type_inconnu_pour_code_non_catalogue() {
    var result = Iso8583Decoder.decodeProcessingCode("77", "00", "00");

    assertThat(result.transactionType()).contains("Type inconnu");
  }

  @Test
  void decodeProcessingCode_devrait_construire_une_description_complete() {
    var result = Iso8583Decoder.decodeProcessingCode("00", "20", "30");

    assertThat(result.fullDescription()).contains("Achat").contains("Courant").contains("Crédit");
  }

  // ── decodeFunctionCode ───────────────────────────────────────────────────

  @Test
  void decodeFunctionCode_devrait_decoder_une_autorisation() {
    var result = Iso8583Decoder.decodeFunctionCode("100");

    assertThat(result.description()).isEqualTo("Autorisation");
  }

  @Test
  void decodeFunctionCode_devrait_gerer_un_code_null() {
    var result = Iso8583Decoder.decodeFunctionCode(null);

    assertThat(result.description()).contains("absent");
  }

  @Test
  void decodeFunctionCode_devrait_fournir_une_description_generique_pour_code_inconnu() {
    var result = Iso8583Decoder.decodeFunctionCode("999");

    assertThat(result.description()).contains("999");
  }
}
