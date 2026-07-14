package com.hps.switchmonitoring.service;

import com.hps.switchmonitoring.dto.request.AtmTransactionRequest;
import com.hps.switchmonitoring.dto.request.EcomTransactionRequest;
import com.hps.switchmonitoring.dto.request.PosTransactionRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifie les regles metier de validation par canal (ATM/POS/ECOM) :
 * champs obligatoires, formats, et regles specifiques comme le CVV
 * obligatoire en ECOM (Card Not Present) ou le blocage sur fraude.
 */
class TransactionValidationServiceTest {

  private final TransactionValidationService service = new TransactionValidationService();

  private AtmTransactionRequest validAtmRequest() {
    AtmTransactionRequest r = new AtmTransactionRequest();
    r.setAtmId("ATM001");
    r.setOperationType("WITHDRAWAL");
    r.setAmount(new BigDecimal("500"));
    r.setSecurityMethod("PIN_ONLINE");
    r.setCurrency("MAD");
    return r;
  }

  private PosTransactionRequest validPosRequest() {
    PosTransactionRequest r = new PosTransactionRequest();
    r.setTerminalId("TID001");
    r.setMerchantId("MID001");
    r.setOperationType("SALE");
    r.setMccCode("5411");
    r.setAmount(new BigDecimal("150"));
    r.setPosEntryMode("051");
    r.setSecurityMethod("NFC_CONTACTLESS");
    r.setCurrency("MAD");
    return r;
  }

  private EcomTransactionRequest validEcomRequest() {
    EcomTransactionRequest r = new EcomTransactionRequest();
    r.setCvda("Y");
    r.setOperationType("PURCHASE");
    r.setCardHolderEmail("client@example.com");
    r.setAmount(new BigDecimal("100"));
    r.setCurrency("MAD");
    r.setSecurityMethod("3DS");
    return r;
  }

  // ── ATM ───────────────────────────────────────────────────────────────────

  @Test
  void validateAtm_devrait_accepter_une_transaction_complete_et_valide() {
    var result = service.validateAtmTransaction(validAtmRequest());

    assertThat(result.isValid()).isTrue();
  }

  @Test
  void validateAtm_devrait_rejeter_un_atmId_absent() {
    AtmTransactionRequest r = validAtmRequest();
    r.setAtmId("");

    var result = service.validateAtmTransaction(r);

    assertThat(result.isValid()).isFalse();
    assertThat(result.getErrors()).contains("ATM ID is required");
  }

  @Test
  void validateAtm_devrait_rejeter_un_type_operation_invalide() {
    AtmTransactionRequest r = validAtmRequest();
    r.setOperationType("UNKNOWN_OP");

    var result = service.validateAtmTransaction(r);

    assertThat(result.isValid()).isFalse();
    assertThat(result.getErrors()).contains("Invalid operation type for ATM");
  }

  @Test
  void validateAtm_devrait_rejeter_un_montant_negatif_pour_withdrawal() {
    AtmTransactionRequest r = validAtmRequest();
    r.setOperationType("WITHDRAWAL");
    r.setAmount(new BigDecimal("-10"));

    var result = service.validateAtmTransaction(r);

    assertThat(result.isValid()).isFalse();
    assertThat(result.getErrors()).contains("Amount must be positive");
  }

  @Test
  void validateAtm_ne_devrait_pas_exiger_de_montant_pour_balance_inquiry() {
    AtmTransactionRequest r = validAtmRequest();
    r.setOperationType("BALANCE_INQUIRY");
    r.setAmount(null);

    var result = service.validateAtmTransaction(r);

    assertThat(result.isValid()).isTrue();
  }

  @Test
  void validateAtm_devrait_rejeter_une_devise_invalide() {
    AtmTransactionRequest r = validAtmRequest();
    r.setCurrency("mad");

    var result = service.validateAtmTransaction(r);

    assertThat(result.isValid()).isFalse();
    assertThat(result.getErrors()).contains("Currency must be a valid 3-letter ISO code");
  }

  @Test
  void validateAtm_devrait_rejeter_un_bill_level_hors_bornes() {
    AtmTransactionRequest r = validAtmRequest();
    r.setBillLevel(150);

    var result = service.validateAtmTransaction(r);

    assertThat(result.isValid()).isFalse();
    assertThat(result.getErrors()).contains("Bill level must be between 0-100");
  }

  @Test
  void validateAtm_devrait_emettre_un_warning_sur_timeout_eleve() {
    AtmTransactionRequest r = validAtmRequest();
    r.setExpectedTimeoutMs(70000);

    var result = service.validateAtmTransaction(r);

    assertThat(result.isValid()).isTrue();
    assertThat(result.hasWarnings()).isTrue();
  }

  @Test
  void validateAtm_devrait_rejeter_une_methode_securite_absente() {
    AtmTransactionRequest r = validAtmRequest();
    r.setSecurityMethod(null);

    var result = service.validateAtmTransaction(r);

    assertThat(result.isValid()).isFalse();
    assertThat(result.getErrors()).contains("Security method is required for ATM");
  }

  // ── POS ───────────────────────────────────────────────────────────────────

  @Test
  void validatePos_devrait_accepter_une_transaction_complete_et_valide() {
    var result = service.validatePosTransaction(validPosRequest());

    assertThat(result.isValid()).isTrue();
  }

  @Test
  void validatePos_devrait_rejeter_un_terminalId_absent() {
    PosTransactionRequest r = validPosRequest();
    r.setTerminalId(" ");

    var result = service.validatePosTransaction(r);

    assertThat(result.isValid()).isFalse();
    assertThat(result.getErrors()).contains("Terminal ID (TID) is required");
  }

  @Test
  void validatePos_devrait_rejeter_un_merchantId_absent() {
    PosTransactionRequest r = validPosRequest();
    r.setMerchantId(null);

    var result = service.validatePosTransaction(r);

    assertThat(result.isValid()).isFalse();
    assertThat(result.getErrors()).contains("Merchant ID (MID) is required");
  }

  @Test
  void validatePos_devrait_rejeter_un_mcc_code_mal_forme() {
    PosTransactionRequest r = validPosRequest();
    r.setMccCode("54A1");

    var result = service.validatePosTransaction(r);

    assertThat(result.isValid()).isFalse();
    assertThat(result.getErrors()).contains("MCC Code must be 4 digits");
  }

  @Test
  void validatePos_devrait_rejeter_un_montant_nul() {
    PosTransactionRequest r = validPosRequest();
    r.setAmount(BigDecimal.ZERO);

    var result = service.validatePosTransaction(r);

    assertThat(result.isValid()).isFalse();
    assertThat(result.getErrors()).contains("Amount must be positive");
  }

  @Test
  void validatePos_devrait_rejeter_un_pos_entry_mode_invalide() {
    PosTransactionRequest r = validPosRequest();
    r.setPosEntryMode("AB");

    var result = service.validatePosTransaction(r);

    assertThat(result.isValid()).isFalse();
    assertThat(result.getErrors()).contains("Invalid POS Entry Mode");
  }

  @Test
  void validatePos_devrait_rejeter_un_type_operation_invalide() {
    PosTransactionRequest r = validPosRequest();
    r.setOperationType("HACK");

    var result = service.validatePosTransaction(r);

    assertThat(result.isValid()).isFalse();
  }

  // ── ECOM ──────────────────────────────────────────────────────────────────

  @Test
  void validateEcom_devrait_accepter_une_transaction_complete_et_valide() {
    var result = service.validateEcomTransaction(validEcomRequest());

    assertThat(result.isValid()).isTrue();
  }

  @Test
  void validateEcom_devrait_exiger_le_cvv_card_not_present() {
    EcomTransactionRequest r = validEcomRequest();
    r.setCvda("N");

    var result = service.validateEcomTransaction(r);

    assertThat(result.isValid()).isFalse();
    assertThat(result.getErrors()).contains("CVV Data is REQUIRED");
  }

  @Test
  void validateEcom_devrait_rejeter_un_email_invalide() {
    EcomTransactionRequest r = validEcomRequest();
    r.setCardHolderEmail("pas-un-email");

    var result = service.validateEcomTransaction(r);

    assertThat(result.isValid()).isFalse();
    assertThat(result.getErrors()).contains("Valid cardholder email is required");
  }

  @Test
  void validateEcom_devrait_emettre_un_warning_sur_montant_eleve_sans_3ds() {
    EcomTransactionRequest r = validEcomRequest();
    r.setAmount(new BigDecimal("1000"));
    r.setRequiresAuthentication(false);

    var result = service.validateEcomTransaction(r);

    assertThat(result.isValid()).isTrue();
    assertThat(result.hasWarnings()).isTrue();
    assertThat(result.getWarnings()).contains("3DS authentication");
  }

  @Test
  void validateEcom_devrait_bloquer_une_transaction_a_fraud_score_eleve() {
    EcomTransactionRequest r = validEcomRequest();
    r.setFraudScore(90);

    var result = service.validateEcomTransaction(r);

    assertThat(result.isValid()).isFalse();
    assertThat(result.getErrors()).contains("BLOCKED");
  }

  @Test
  void validateEcom_devrait_emettre_un_warning_pour_fraud_score_moyen() {
    EcomTransactionRequest r = validEcomRequest();
    r.setFraudScore(60);

    var result = service.validateEcomTransaction(r);

    assertThat(result.isValid()).isTrue();
    assertThat(result.hasWarnings()).isTrue();
  }

  @Test
  void validateEcom_devrait_exiger_la_frequence_pour_paiement_recurrent() {
    EcomTransactionRequest r = validEcomRequest();
    r.setIsRecurring(true);
    r.setRecurringFrequencyDays(null);

    var result = service.validateEcomTransaction(r);

    assertThat(result.isValid()).isFalse();
    assertThat(result.getErrors()).contains("Recurring frequency days must be specified");
  }

  @Test
  void validateEcom_devrait_accepter_un_paiement_recurrent_avec_frequence() {
    EcomTransactionRequest r = validEcomRequest();
    r.setIsRecurring(true);
    r.setRecurringFrequencyDays(30);

    var result = service.validateEcomTransaction(r);

    assertThat(result.isValid()).isTrue();
  }

  @Test
  void validateEcom_devrait_rejeter_une_methode_securite_absente() {
    EcomTransactionRequest r = validEcomRequest();
    r.setSecurityMethod(null);

    var result = service.validateEcomTransaction(r);

    assertThat(result.isValid()).isFalse();
    assertThat(result.getErrors()).contains("Security method is required for ECOM");
  }
}
