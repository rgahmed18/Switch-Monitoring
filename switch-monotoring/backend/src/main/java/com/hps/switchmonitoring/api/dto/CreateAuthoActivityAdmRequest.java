package com.hps.switchmonitoring.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO Request pour créer/insérer une transaction AUTHO_ACTIVITY_ADM
 * Contient les champs obligatoires et les champs courants
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateAuthoActivityAdmRequest {

  // Clés primaires composées (obligatoires)
  @NotBlank(message = "reference_number est obligatoire")
  private String referenceNumber;

  @NotBlank(message = "internal_stan est obligatoire")
  private String internalStan;

  @NotBlank(message = "external_stan est obligatoire")
  private String externalStan;

  @NotBlank(message = "routing_code est obligatoire")
  private String routingCode;

  @NotBlank(message = "capture_code est obligatoire")
  private String captureCode;

  // Identification
  @NotBlank(message = "message_type est obligatoire")
  private String messageType;

  private String functionCode;
  private String processingCode;
  private String actionCode;

  // Carte
  @NotBlank(message = "card_number est obligatoire")
  private String cardNumber;

  private String cardType;
  private LocalDate endExpiryDate;

  // Montants (obligatoires)
  @NotNull(message = "transaction_amount est obligatoire")
  private BigDecimal transactionAmount;

  @NotBlank(message = "transaction_currency est obligatoire")
  private String transactionCurrency;

  private BigDecimal billingAmount;
  private String billingCurrency;
  private BigDecimal conversionRate;

  // Settlement
  private BigDecimal issSettlementAmount;
  private String issSettlementCurrency;
  private BigDecimal acqSettlementAmount;
  private String acqSettlementCurrency;
  private BigDecimal transactionFee;

  // Dates
  @NotNull(message = "transaction_local_date est obligatoire")
  private LocalDate transactionLocalDate;

  @NotNull(message = "transmission_date_and_time est obligatoire")
  private LocalDateTime transmissionDateAndTime;

  private LocalDateTime responseDateAndTime;
  private LocalDate businessDate;

  // Accepteur/Terminal
  private String cardAcceptorActivity;
  private String cardAcceptorId;
  private String cardAcceptorTermId;
  private String cardAccNameAddress;
  private String posConditionCode;
  private String posEntryMode;

  // Réseau
  private String networkCode;
  private String networkId;
  private String productCode;
  private String acquiringCountryCode;
  private String acquirerBank;
  private String issuingBank;

  // Sécurité
  private String securityVerifLevel;
  private String authorizationCode;

  // Crédit/Limite
  private BigDecimal crAvailableBalance;
  private BigDecimal crCreditLimit;

  // Métadonnées
  private String userCreate;
}
