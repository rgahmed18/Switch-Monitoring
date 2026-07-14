package com.hps.switchmonitoring.service.emv;

import com.hps.switchmonitoring.domain.AutohoActivityAdmEntity;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifie l'orchestration ChipAnalysisService : decodage AIP/CVM/ATC/ARPC/CVV
 * et agregation du risque global EMV a partir d'une entite AUTHO_ACTIVITY_ADM.
 */
class ChipAnalysisServiceTest {

  private final ChipAnalysisService service = new ChipAnalysisService();

  private AutohoActivityAdmEntity entityWithChip() {
    AutohoActivityAdmEntity e = new AutohoActivityAdmEntity();
    e.setChipApplicationCryptogram("A1B2C3D4E5F60708");
    e.setChipTvr("0000000000");
    e.setChipAip("5200");
    e.setChipCvmResults("020002"); // ENCIPHERED_PIN_ONLINE(0x02), cond=0x00, result=0x02(SUCCESSFUL)
    e.setChipAtc("0050");
    e.setChipArpcResponseCode("00XXXX");
    e.setExternalCvvResultCode("M");
    e.setChipCryptogramInfoData("80");
    return e;
  }

  @Test
  void analyze_devrait_detecter_la_presence_de_donnees_chip() {
    var result = service.analyze(entityWithChip());

    assertThat(result.hasChipData()).isTrue();
  }

  @Test
  void analyze_devrait_retourner_hasChipData_false_sans_cryptogramme() {
    AutohoActivityAdmEntity e = new AutohoActivityAdmEntity();

    var result = service.analyze(e);

    assertThat(result.hasChipData()).isFalse();
  }

  @Test
  void analyze_devrait_decoder_laip_correctement() {
    // 0x52 = 0101 0010 → SDA(0x40) + CVM(0x10) + On-device(0x02)
    AutohoActivityAdmEntity e = entityWithChip();
    e.setChipAip("5200");

    var result = service.analyze(e);

    assertThat(result.aip().sdaSupported()).isTrue();
    assertThat(result.aip().cvmSupported()).isTrue();
    assertThat(result.aip().onDeviceCvm()).isTrue();
    assertThat(result.aip().ddaSupported()).isFalse();
  }

  @Test
  void analyze_devrait_gerer_un_aip_absent() {
    AutohoActivityAdmEntity e = entityWithChip();
    e.setChipAip(null);

    var result = service.analyze(e);

    assertThat(result.aip().sdaSupported()).isFalse();
  }

  @Test
  void analyze_devrait_decoder_le_cvm_pin_enciphered_online() {
    AutohoActivityAdmEntity e = entityWithChip();
    e.setChipCvmResults("020002"); // code=0x02, cond=0x00, result=0x02 (SUCCESSFUL)

    var result = service.analyze(e);

    assertThat(result.cvm().methodCode()).isEqualTo("ENCIPHERED_PIN_ONLINE");
    assertThat(result.cvm().success()).isTrue();
    assertThat(result.cvm().result()).isEqualTo("SUCCESSFUL");
  }

  @Test
  void analyze_devrait_marquer_echec_cvm_sur_resultat_failed() {
    AutohoActivityAdmEntity e = entityWithChip();
    e.setChipCvmResults("020001"); // result=0x01 (FAILED)

    var result = service.analyze(e);

    assertThat(result.cvm().success()).isFalse();
    assertThat(result.cvm().result()).isEqualTo("FAILED");
  }

  @Test
  void analyze_devrait_gerer_un_cvm_trop_court() {
    AutohoActivityAdmEntity e = entityWithChip();
    e.setChipCvmResults("AB");

    var result = service.analyze(e);

    assertThat(result.cvm().methodCode()).isEqualTo("UNKNOWN");
  }

  @Test
  void analyze_devrait_detecter_un_atc_suspect_bas() {
    AutohoActivityAdmEntity e = entityWithChip();
    e.setChipAtc("0002"); // ATC=2, entre 1 et 4 -> suspect

    var result = service.analyze(e);

    assertThat(result.atc().value()).isEqualTo(2);
    assertThat(result.atc().suspiciousLow()).isTrue();
  }

  @Test
  void analyze_devrait_considerer_un_atc_normal_comme_non_suspect() {
    AutohoActivityAdmEntity e = entityWithChip();
    e.setChipAtc("0050"); // ATC=80

    var result = service.analyze(e);

    assertThat(result.atc().suspiciousLow()).isFalse();
  }

  @Test
  void analyze_devrait_interpreter_arpc_approuve() {
    AutohoActivityAdmEntity e = entityWithChip();
    e.setChipArpcResponseCode("00XXXX");

    var result = service.analyze(e);

    assertThat(result.arpc().interpretation()).contains("Approuvé");
  }

  @Test
  void analyze_devrait_interpreter_arpc_refuse() {
    AutohoActivityAdmEntity e = entityWithChip();
    e.setChipArpcResponseCode("01XXXX");

    var result = service.analyze(e);

    assertThat(result.arpc().interpretation()).contains("Refusé");
  }

  @Test
  void analyze_devrait_interpreter_cvv_incorrect_comme_risque_fraude() {
    AutohoActivityAdmEntity e = entityWithChip();
    e.setExternalCvvResultCode("N");

    var result = service.analyze(e);

    assertThat(result.externalCvvResult()).containsIgnoringCase("fraude");
  }

  @Test
  void analyze_devrait_calculer_un_risque_global_high_quand_tvr_critique() {
    AutohoActivityAdmEntity e = entityWithChip();
    e.setChipTvr("1000000000"); // CARD_ON_EXCEPTION_FILE -> score 100

    var result = service.analyze(e);

    assertThat(result.overallRisk()).isEqualTo("HIGH");
  }

  @Test
  void analyze_devrait_calculer_un_risque_global_clean_sans_anomalie() {
    var result = service.analyze(entityWithChip());

    assertThat(result.overallRisk()).isEqualTo("CLEAN");
  }

  @Test
  void analyze_devrait_recommander_analyse_par_defaut_si_aucune_anomalie() {
    var result = service.analyze(entityWithChip());

    assertThat(result.recommendations()).contains("Aucune anomalie EMV détectée - Transaction conforme");
  }

  @Test
  void analyze_devrait_recommander_blocage_carte_sur_liste_exception() {
    AutohoActivityAdmEntity e = entityWithChip();
    e.setChipTvr("1000000000");

    var result = service.analyze(e);

    assertThat(result.recommendations())
        .anyMatch(r -> r.contains("CRITIQUE") && r.contains("exception"));
  }

  @Test
  void analyze_devrait_recommander_verification_sur_atc_bas() {
    AutohoActivityAdmEntity e = entityWithChip();
    e.setChipAtc("0001");

    var result = service.analyze(e);

    assertThat(result.recommendations()).anyMatch(r -> r.contains("ATC=1"));
  }

  @Test
  void analyze_devrait_decoder_le_type_de_cryptogramme_ARQC() {
    // (val >> 6) & 0x03 = 0x02 -> ARQC. val=0x80 -> 1000 0000 -> shift 6 = 10 -> 0x02
    AutohoActivityAdmEntity e = entityWithChip();
    e.setChipCryptogramInfoData("80");

    var result = service.analyze(e);

    assertThat(result.cryptogramType()).contains("ARQC");
  }
}
