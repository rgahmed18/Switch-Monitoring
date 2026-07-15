package com.hps.switchmonitoring.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entité JPA pour la table AUTHO_ACTIVITY_ADM
 * Table de production HPS pour le monitoring des transactions de paiement
 * 
 * CLÉS PRIMAIRES COMPOSÉES:
 * - reference_number (CHAR 12)
 * - internal_stan (CHAR 6)
 * - external_stan (CHAR 6)
 * - routing_code (CHAR 6)
 * - capture_code (CHAR 6)
 */
@Entity
@Table(name = "AUTHO_ACTIVITY_ADM")
@Data
@NoArgsConstructor
@AllArgsConstructor
@IdClass(AutohoActivityAdmPk.class)
public class AutohoActivityAdmEntity {

  // ========== CLÉS PRIMAIRES COMPOSÉES ==========
  @Id
  @Column(name = "reference_number", length = 12, columnDefinition = "CHAR(12 CHAR)")
  private String referenceNumber;

  @Id
  @Column(name = "internal_stan", length = 6, columnDefinition = "CHAR(6 CHAR)")
  private String internalStan;

  @Id
  @Column(name = "external_stan", length = 6, columnDefinition = "CHAR(6 CHAR)")
  private String externalStan;

  @Id
  @Column(name = "routing_code", length = 6, columnDefinition = "CHAR(6 CHAR)")
  private String routingCode;

  @Id
  @Column(name = "capture_code", length = 6, columnDefinition = "CHAR(6 CHAR)")
  private String captureCode;

  // ========== IDENTIFICATION DE LA TRANSACTION ==========
  @Column(name = "message_type", length = 4, columnDefinition = "CHAR(4 CHAR)")
  private String messageType;

  @Column(name = "function_code", length = 3, columnDefinition = "CHAR(3 CHAR)")
  private String functionCode;

  @Column(name = "processing_code", length = 2, columnDefinition = "CHAR(2 CHAR)")
  private String processingCode;

  @Column(name = "source_account_code", length = 2, columnDefinition = "CHAR(2 CHAR)")
  private String sourceAccountCode;

  @Column(name = "destination_account_code", length = 2, columnDefinition = "CHAR(2 CHAR)")
  private String destinationAccountCode;

  @Column(name = "action_code", length = 3, columnDefinition = "CHAR(3 CHAR)")
  private String actionCode;

  @Column(name = "original_action_code", length = 3, columnDefinition = "CHAR(3 CHAR)")
  private String originalActionCode;

  @Column(name = "issuer_action_code", length = 6)
  private String issuerActionCode;

  @Column(name = "event_code", length = 3, columnDefinition = "CHAR(3 CHAR)")
  private String eventCode;

  @Column(name = "reason_code", length = 4, columnDefinition = "CHAR(4 CHAR)")
  private String reasonCode;

  @Column(name = "reject_code", length = 4)
  private String rejectCode;

  @Column(name = "reject_reason", length = 40)
  private String rejectReason;

  @Column(name = "authorization_id", length = 32)
  private String authorizationId;

  @Column(name = "transaction_id", length = 32)
  private String transactionId;

  // ========== RÉSEAU / ROUTAGE ==========
  @Column(name = "network_code", length = 2, columnDefinition = "CHAR(2 CHAR)")
  private String networkCode;

  @Column(name = "network_id", length = 4)
  private String networkId;

  @Column(name = "network_data", length = 12)
  private String networkData;

  @Column(name = "forwarding_country_code", length = 3, columnDefinition = "CHAR(3 CHAR)")
  private String forwardingCountryCode;

  @Column(name = "forwarding_institution_code", length = 11)
  private String forwardingInstitutionCode;

  @Column(name = "forwarding_bank", length = 6, columnDefinition = "CHAR(6 CHAR)")
  private String forwardingBank;

  @Column(name = "receiving_institution", length = 11)
  private String receivingInstitution;

  @Column(name = "acquiring_country_code", length = 3, columnDefinition = "CHAR(3 CHAR)")
  private String acquiringCountryCode;

  @Column(name = "acquirer_institution_code", length = 11)
  private String acquirerInstitutionCode;

  @Column(name = "acquirer_bank", length = 6, columnDefinition = "CHAR(6 CHAR)")
  private String acquirerBank;

  // ========== CARTE ==========
  @Column(name = "card_number", length = 22)
  private String cardNumber;

  @Column(name = "card_sequence_number")
  private Integer cardSequenceNumber;

  @Column(name = "service_code", length = 3, columnDefinition = "CHAR(3 CHAR)")
  private String serviceCode;

  @Column(name = "card_type", length = 2, columnDefinition = "CHAR(2 CHAR)")
  private String cardType;

  @Column(name = "card_level", length = 1, columnDefinition = "CHAR(1 CHAR)")
  private String cardLevel;

  @Column(name = "product_code", length = 3, columnDefinition = "CHAR(3 CHAR)")
  private String productCode;

  @Column(name = "vip_level", length = 1, columnDefinition = "CHAR(1 CHAR)")
  private String vipLevel;

  @Column(name = "start_expiry_date")
  private LocalDate startExpiryDate;

  @Column(name = "end_expiry_date")
  private LocalDate endExpiryDate;

  // ========== DATES / TEMPS ==========
  @Column(name = "transaction_local_date")
  private LocalDate transactionLocalDate;

  @Column(name = "transmission_date_and_time")
  private LocalDateTime transmissionDateAndTime;

  @Column(name = "response_date_and_time")
  private LocalDateTime responseDateAndTime;

  @Column(name = "internal_transmission_time")
  private LocalDateTime internalTransmissionTime;

  @Column(name = "capture_date")
  private LocalDate captureDate;

  @Column(name = "business_date")
  private LocalDate businessDate;

  @Column(name = "pre_auth_time_limit")
  private LocalDate preAuthTimeLimit;

  @Column(name = "conversion_rate_date")
  private LocalDate conversionRateDate;

  @Column(name = "date_create")
  private LocalDate dateCreate;

  @Column(name = "date_modif")
  private LocalDate dateModif;

  // ========== MONTANTS ET DEVISES ==========
  @Column(name = "transaction_amount", precision = 18, scale = 3)
  private BigDecimal transactionAmount;

  @Column(name = "cash_back_amount", precision = 18, scale = 3)
  private BigDecimal cashBackAmount;

  @Column(name = "transaction_currency", length = 3, columnDefinition = "CHAR(3 CHAR)")
  private String transactionCurrency;

  @Column(name = "replacement_amount", precision = 18, scale = 3)
  private BigDecimal replacementAmount;

  @Column(name = "billing_amount", precision = 18, scale = 3)
  private BigDecimal billingAmount;

  @Column(name = "billing_currency", length = 3, columnDefinition = "CHAR(3 CHAR)")
  private String billingCurrency;

  @Column(name = "conversion_rate", precision = 14, scale = 6)
  private BigDecimal conversionRate;

  // ========== SETTLEMENT ÉMETTEUR (ISSUER) ==========
  @Column(name = "iss_settlement_amount", precision = 18, scale = 3)
  private BigDecimal issSettlementAmount;

  @Column(name = "iss_settlement_currency", length = 3, columnDefinition = "CHAR(3 CHAR)")
  private String issSettlementCurrency;

  @Column(name = "iss_settlement_date")
  private LocalDate issSettlementDate;

  @Column(name = "iss_conv_rate_settlement", precision = 14, scale = 6)
  private BigDecimal issConvRateSettlement;

  @Column(name = "iss_conv_rate_settlement_date")
  private LocalDate issConvRateSettlementDate;

  @Column(name = "iss_settlement_fee", precision = 18, scale = 3)
  private BigDecimal issSettlementFee;

  // ========== SETTLEMENT ACQUÉREUR (ACQUIRER) ==========
  @Column(name = "acq_settlement_amount", precision = 18, scale = 3)
  private BigDecimal acqSettlementAmount;

  @Column(name = "acq_settlement_currency", length = 3, columnDefinition = "CHAR(3 CHAR)")
  private String acqSettlementCurrency;

  @Column(name = "acq_settlement_date")
  private LocalDate acqSettlementDate;

  @Column(name = "acq_conv_rate_settlement", precision = 14, scale = 6)
  private BigDecimal acqConvRateSettlement;

  @Column(name = "acq_conv_rate_settlement_date")
  private LocalDate acqConvRateSettlementDate;

  @Column(name = "acq_settlement_fee", precision = 18, scale = 3)
  private BigDecimal acqSettlementFee;

  @Column(name = "transaction_fee", precision = 18, scale = 3)
  private BigDecimal transactionFee;

  // ========== ACCEPTEUR / TERMINAL (POS) ==========
  @Column(name = "card_acceptor_activity", length = 4, columnDefinition = "CHAR(4 CHAR)")
  private String cardAcceptorActivity;

  @Column(name = "card_acceptor_term_id", length = 15)
  private String cardAcceptorTermId;

  @Column(name = "card_acceptor_id", length = 15)
  private String cardAcceptorId;

  @Column(name = "card_acc_name_address", length = 40)
  private String cardAccNameAddress;

  @Column(name = "pos_entry_mode", length = 4)
  private String posEntryMode;

  @Column(name = "pos_condition_code", length = 2, columnDefinition = "CHAR(2 CHAR)")
  private String posConditionCode;

  @Column(name = "pos_data", length = 12, columnDefinition = "CHAR(12 CHAR)")
  private String posData;

  @Column(name = "tcc", length = 1, columnDefinition = "CHAR(1 CHAR)")
  private String tcc;

  // ========== COMPTES SOURCE / DESTINATION ==========
  @Column(name = "source_account_entity_code", length = 2, columnDefinition = "CHAR(2 CHAR)")
  private String sourceAccountEntityCode;

  @Column(name = "source_account_entity_id", length = 24)
  private String sourceAccountEntityId;

  @Column(name = "source_account_sequence")
  private Integer sourceAccountSequence;

  @Column(name = "source_account_type", length = 2, columnDefinition = "CHAR(2 CHAR)")
  private String sourceAccountType;

  @Column(name = "source_account_number", length = 24)
  private String sourceAccountNumber;

  @Column(name = "source_account_entity_level")
  private Integer sourceAccountEntityLevel;

  @Column(name = "destination_account_entity_cod", length = 2, columnDefinition = "CHAR(2 CHAR)")
  private String destinationAccountEntityCod;

  @Column(name = "destination_account_entity_id", length = 24)
  private String destinationAccountEntityId;

  @Column(name = "destination_account_sequence")
  private Integer destinationAccountSequence;

  @Column(name = "destination_account_type", length = 2, columnDefinition = "CHAR(2 CHAR)")
  private String destinationAccountType;

  @Column(name = "destination_account_number", length = 24)
  private String destinationAccountNumber;

  @Column(name = "destination_account_entity_lev")
  private Integer destinationAccountEntityLev;

  @Column(name = "issuing_bank", length = 6, columnDefinition = "CHAR(6 CHAR)")
  private String issuingBank;

  // ========== CRÉDIT / LIMITE ==========
  @Column(name = "cr_currency_code", length = 3, columnDefinition = "CHAR(3 CHAR)")
  private String crCurrencyCode;

  @Column(name = "cr_credit_limit", precision = 18, scale = 3)
  private BigDecimal crCreditLimit;

  @Column(name = "cr_cash_limit", precision = 18, scale = 3)
  private BigDecimal crCashLimit;

  @Column(name = "cr_loan_limit", precision = 18, scale = 3)
  private BigDecimal crLoanLimit;

  @Column(name = "cr_vip_level", length = 1, columnDefinition = "CHAR(1 CHAR)")
  private String crVipLevel;

  @Column(name = "cr_credit_cur_bal", precision = 18, scale = 3)
  private BigDecimal crCreditCurBal;

  @Column(name = "cr_cash_cur_bal", precision = 18, scale = 3)
  private BigDecimal crCashCurBal;

  @Column(name = "cr_loan_cur_bal", precision = 18, scale = 3)
  private BigDecimal crLoanCurBal;

  @Column(name = "cr_response_code", length = 3, columnDefinition = "CHAR(3 CHAR)")
  private String crResponseCode;

  @Column(name = "cr_pending_aut_credit", precision = 18, scale = 3)
  private BigDecimal crPendingAutCredit;

  @Column(name = "cr_pending_aut_cash", precision = 18, scale = 3)
  private BigDecimal crPendingAutCash;

  @Column(name = "cr_pending_aut_loan", precision = 18, scale = 3)
  private BigDecimal crPendingAutLoan;

  @Column(name = "cr_available_balance", precision = 18, scale = 3)
  private BigDecimal crAvailableBalance;

  @Column(name = "cr_first_due_date")
  private LocalDate crFirstDueDate;

  @Column(name = "cr_installment_amount", precision = 18, scale = 3)
  private BigDecimal crInstallmentAmount;

  @Column(name = "cr_term_count")
  private Integer crTermCount;

  // ========== LOYAUTÉ ==========
  @Column(name = "loyalty_program_code", length = 6)
  private String loyaltyProgramCode;

  @Column(name = "list_product_code_1", length = 15)
  private String listProductCode1;

  @Column(name = "list_product_code_2", length = 15)
  private String listProductCode2;

  @Column(name = "list_product_code_3", length = 15)
  private String listProductCode3;

  @Column(name = "list_product_code_4", length = 15)
  private String listProductCode4;

  @Column(name = "list_product_code_5", length = 15)
  private String listProductCode5;

  @Column(name = "loyalty_points_gained")
  private Integer loyaltyPointsGained;

  @Column(name = "loyalty_points_redemption")
  private Integer loyaltyPointsRedemption;

  // ========== CONFIGURATION PRODUITS ==========
  @Column(name = "services_setup_code", length = 4, columnDefinition = "CHAR(4 CHAR)")
  private String servicesSetupCode;

  @Column(name = "product_currency_code", length = 3, columnDefinition = "CHAR(3 CHAR)")
  private String productCurrencyCode;

  @Column(name = "period_code", length = 4, columnDefinition = "CHAR(4 CHAR)")
  private String periodCode;

  @Column(name = "period_type", length = 1, columnDefinition = "CHAR(1 CHAR)")
  private String periodType;

  @Column(name = "period_value")
  private Integer periodValue;

  // ========== CHIP / EMV ==========
  @Column(name = "chip_application_cryptogram", length = 16)
  private String chipApplicationCryptogram;

  @Column(name = "chip_tvr", length = 10)
  private String chipTvr;

  @Column(name = "chip_transaction_currency_code", length = 4)
  private String chipTransactionCurrencyCode;

  @Column(name = "chip_transaction_date", length = 6)
  private String chipTransactionDate;

  @Column(name = "chip_transaction_type", length = 2)
  private String chipTransactionType;

  @Column(name = "chip_transaction_amount", length = 12)
  private String chipTransactionAmount;

  @Column(name = "chip_atc", length = 4)
  private String chipAtc;

  @Column(name = "chip_unpredictable_number", length = 8)
  private String chipUnpredictableNumber;

  @Column(name = "chip_category_code", length = 2)
  private String chipCategoryCode;

  @Column(name = "chip_terminal_country_code", length = 4)
  private String chipTerminalCountryCode;

  @Column(name = "chip_aip", length = 4)
  private String chipAip;

  @Column(name = "chip_cvm_results", length = 6)
  private String chipCvmResults;

  @Column(name = "chip_terminal_capability", length = 6)
  private String chipTerminalCapability;

  @Column(name = "chip_terminal_type", length = 4)
  private String chipTerminalType;

  @Column(name = "chip_appli_identifier", length = 32)
  private String chipAppliIdentifier;

  @Column(name = "chip_appli_version_number", length = 4)
  private String chipAppliVersionNumber;

  @Column(name = "chip_ifd_serial_number", length = 8)
  private String chipIfdSerialNumber;

  @Column(name = "chip_trx_seq_counter", length = 8)
  private String chipTrxSeqCounter;

  @Column(name = "chip_issuer_application_data", length = 64)
  private String chipIssuerApplicationData;

  @Column(name = "chip_other_amount", length = 12)
  private String chipOtherAmount;

  @Column(name = "chip_card_authen_result", length = 4)
  private String chipCardAuthenResult;

  @Column(name = "chip_condition_code", length = 4)
  private String chipConditionCode;

  @Column(name = "chip_ccps_transaction_ind", length = 4)
  private String chipCcpsTransactionInd;

  @Column(name = "chip_card_authen_reliabil_ind", length = 4)
  private String chipCardAuthenReliabilInd;

  @Column(name = "chip_derivation_key_index", length = 4)
  private String chipDerivationKeyIndex;

  @Column(name = "chip_issuer_authent_data", length = 32)
  private String chipIssuerAuthentData;

  @Column(name = "chip_arpc_response_code", length = 20)
  private String chipArpcResponseCode;

  @Column(name = "chip_issuer_script_result", length = 40)
  private String chipIssuerScriptResult;

  @Column(name = "chip_cryptogram_info_data", length = 2)
  private String chipCryptogramInfoData;

  @Column(name = "external_cvv_result_code", length = 4)
  private String externalCvvResultCode;

  // ========== SÉCURITÉ / VÉRIFICATION ==========
  @Column(name = "security_verif_level", length = 32)
  private String securityVerifLevel;

  @Column(name = "security_verif_result", length = 32)
  private String securityVerifResult;

  @Column(name = "address_verification_data", length = 40)
  private String addressVerificationData;

  @Column(name = "cps_aci", length = 1, columnDefinition = "CHAR(1 CHAR)")
  private String cpsAci;

  @Column(name = "cps_transaction_id", length = 15, columnDefinition = "CHAR(15 CHAR)")
  private String cpsTransactionId;

  @Column(name = "cps_validation_code", length = 4, columnDefinition = "CHAR(4 CHAR)")
  private String cpsValidationCode;

  @Column(name = "authorization_code", length = 6, columnDefinition = "CHAR(6 CHAR)")
  private String authorizationCode;

  @Column(name = "original_authorization_code", length = 10)
  private String originalAuthorizationCode;

  @Column(name = "authorization_source", length = 2, columnDefinition = "CHAR(2 CHAR)")
  private String authorizationSource;

  @Column(name = "authorization_length")
  private Integer authorizationLength;

  // ========== FLAGS / STATUTS ==========
  @Column(name = "autho_flag", length = 1, columnDefinition = "CHAR(1 CHAR)")
  private String authoFlag;

  @Column(name = "reversal_flag", length = 1, columnDefinition = "CHAR(1 CHAR)")
  private String reversalFlag;

  @Column(name = "transaction_flag", length = 1, columnDefinition = "CHAR(1 CHAR)")
  private String transactionFlag;

  @Column(name = "matching_status", length = 1, columnDefinition = "CHAR(1 CHAR)")
  private String matchingStatus;

  @Column(name = "matching_date")
  private LocalDate matchingDate;

  @Column(name = "matching_level", length = 1, columnDefinition = "CHAR(1 CHAR)")
  private String matchingLevel;

  @Column(name = "matching_date_purge")
  private LocalDate matchingDatePurge;

  // ========== REVERSALS ==========
  @Column(name = "reversal_stan", length = 6, columnDefinition = "CHAR(6 CHAR)")
  private String reversalStan;

  @Column(name = "reversal_transaction_date")
  private LocalDate reversalTransactionDate;

  @Column(name = "original_transaction_date_time")
  private LocalDateTime originalTransactionDateTime;

  // ========== NIVEAUX / CONTEXTE ==========
  @Column(name = "balance_level", length = 1, columnDefinition = "CHAR(1 CHAR)")
  private String balanceLevel;

  @Column(name = "shadow_account_level", length = 1, columnDefinition = "CHAR(1 CHAR)")
  private String shadowAccountLevel;

  @Column(name = "host_level", length = 1, columnDefinition = "CHAR(1 CHAR)")
  private String hostLevel;

  @Column(name = "client_level", length = 1, columnDefinition = "CHAR(1 CHAR)")
  private String clientLevel;

  @Column(name = "exception_level", length = 1, columnDefinition = "CHAR(1 CHAR)")
  private String exceptionLevel;

  @Column(name = "action_translation_level", length = 1, columnDefinition = "CHAR(1 CHAR)")
  private String actionTranslationLevel;

  @Column(name = "card_limit_exception_level", length = 1, columnDefinition = "CHAR(1 CHAR)")
  private String cardLimitExceptionLevel;

  @Column(name = "vip_action_translation_level", length = 1, columnDefinition = "CHAR(1 CHAR)")
  private String vipActionTranslationLevel;

  @Column(name = "autho_period_level", length = 1, columnDefinition = "CHAR(1 CHAR)")
  private String authoPeriodLevel;

  // ========== DONNÉES ADDITIONNELLES ==========
  @Column(name = "additional_amount", length = 120)
  private String additionalAmount;

  @Column(name = "db_cur_balance", precision = 18, scale = 3)
  private BigDecimal dbCurBalance;

  @Column(name = "limit_amount_before_trn", precision = 18, scale = 3)
  private BigDecimal limitAmountBeforeTrn;

  @Column(name = "limit_index", length = 4, columnDefinition = "CHAR(4 CHAR)")
  private String limitIndex;

  @Column(name = "limit_id")
  private Integer limitId;

  @Column(name = "private_data_1", length = 44)
  private String privateData1;

  @Column(name = "acquirer_resource_code", length = 2, columnDefinition = "CHAR(2 CHAR)")
  private String acquirerResourceCode;

  @Column(name = "issuer_resource_code", length = 2, columnDefinition = "CHAR(2 CHAR)")
  private String issuerResourceCode;

  @Column(name = "private_tlv_data", length = 1024)
  private String privateTlvData;

  @Column(name = "original_table_indicator", length = 3)
  private String originalTableIndicator;

  @Column(name = "current_table_indicator", length = 3)
  private String currentTableIndicator;

  // ========== MÉTADONNÉES / AUDIT ==========
  @Column(name = "screen_session_id")
  private Integer screenSessionId;

  @Column(name = "screen_user_name", length = 15)
  private String screenUserName;

  @Column(name = "user_create", length = 15)
  private String userCreate;

  @Column(name = "user_modif", length = 15)
  private String userModif;

  @Column(name = "uf_action_date")
  private LocalDate ufActionDate;

  @Column(name = "uf_file_update_code", length = 1, columnDefinition = "CHAR(1 CHAR)")
  private String ufFileUpdateCode;

  @Column(name = "uf_filename", length = 20)
  private String ufFilename;

  @Column(name = "uf_purge_date", length = 4, columnDefinition = "CHAR(4 CHAR)")
  private String ufPurgeDate;

  @Column(name = "uf_action_code", length = 2, columnDefinition = "CHAR(2 CHAR)")
  private String ufActionCode;

  @Column(name = "uf_file_record", length = 256)
  private String ufFileRecord;

  @Column(name = "time_stamp_plus_message", length = 14)
  private String timeStampPlusMessage;

  @Column(name = "origine_code", length = 1, columnDefinition = "CHAR(1 CHAR)")
  private String origineCode;
}
