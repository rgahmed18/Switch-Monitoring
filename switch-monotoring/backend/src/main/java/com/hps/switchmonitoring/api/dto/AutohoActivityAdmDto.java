package com.hps.switchmonitoring.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO Response pour la transaction AUTHO_ACTIVITY_ADM
 * Contient les champs principaux utilisés par le frontend
 * Aligné sur le schéma officiel Oracle fourni par l'encadrant
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutohoActivityAdmDto {

  // ========== Identifiant primaire composé ==========
  private String referenceNumber;
  private String internalStan;
  private String externalStan;
  private String routingCode;
  private String captureCode;

  // ========== Identification ==========
  private String messageType;
  private String functionCode;
  private String processingCode;
  private String actionCode;
  private String originalActionCode;
  private String issuerActionCode;
  private String eventCode;
  private String reasonCode;
  private String rejectCode;
  private String rejectReason;
  private String authorizationId;
  private String transactionId;

  // ========== Réseau / Routage ==========
  private String networkCode;
  private String networkId;
  private String networkData;
  private String receivingInstitution;
  private String acquiringCountryCode;
  private String acquirerInstitutionCode;
  private String acquirerBank;
  private String issuingBank;
  private String forwardingCountryCode;
  private String forwardingInstitutionCode;
  private String forwardingBank;

  // ========== Carte (masquée) ==========
  private String cardNumber;
  private String cardNumberMasked; // Champ calculé: **** **** **** 1234
  private String cardType;
  private Integer cardSequenceNumber;
  private String serviceCode;
  private String productCode;
  private String vipLevel;
  private LocalDate startExpiryDate;
  private LocalDate endExpiryDate;

  // ========== Montants ==========
  private BigDecimal transactionAmount;
  private String transactionCurrency;
  private BigDecimal cashBackAmount;
  private BigDecimal replacementAmount;
  private BigDecimal billingAmount;
  private String billingCurrency;
  private BigDecimal conversionRate;

  // ========== Settlement Émetteur ==========
  private BigDecimal issSettlementAmount;
  private String issSettlementCurrency;
  private LocalDate issSettlementDate;
  private BigDecimal issConvRateSettlement;
  private BigDecimal issSettlementFee;

  // ========== Settlement Acquéreur ==========
  private BigDecimal acqSettlementAmount;
  private String acqSettlementCurrency;
  private LocalDate acqSettlementDate;
  private BigDecimal acqConvRateSettlement;
  private BigDecimal acqSettlementFee;

  private BigDecimal transactionFee;

  // ========== Dates ==========
  private LocalDate transactionLocalDate;
  private LocalDateTime transmissionDateAndTime;
  private LocalDateTime responseDateAndTime;
  private LocalDateTime internalTransmissionTime;
  private LocalDate captureDate;
  private LocalDate businessDate;

  // ========== Accepteur / Terminal ==========
  private String cardAcceptorActivity;
  private String cardAcceptorTermId;
  private String cardAcceptorId;
  private String cardAccNameAddress;
  private String tcc;

  // ========== POS ==========
  private String posEntryMode;
  private String posConditionCode;
  private String posData;

  // ========== Sécurité ==========
  private String securityVerifLevel;
  private String securityVerifResult;
  private String addressVerificationData;
  private String authorizationCode;
  private String originalAuthorizationCode;

  // ========== Flags / Statuts ==========
  private String authoFlag;
  private String reversalFlag;
  private String transactionFlag;
  private String matchingStatus;

  // ========== Crédit / Limite ==========
  private BigDecimal crAvailableBalance;
  private BigDecimal crCreditLimit;
  private BigDecimal crCashLimit;
  private BigDecimal crCreditCurBal;
  private BigDecimal crCashCurBal;
  private String crResponseCode;

  // ========== Loyauté ==========
  private String loyaltyProgramCode;
  private Integer loyaltyPointsGained;
  private Integer loyaltyPointsRedemption;

  // ========== Chip / EMV ==========
  private String chipApplicationCryptogram;
  private String chipTvr;
  private String chipTerminalType;
  private String externalCvvResultCode;

  // ========== Reversals ==========
  private String reversalStan;
  private LocalDate reversalTransactionDate;

  // ========== Métadonnées ==========
  private LocalDate dateCreate;
  private LocalDate dateModif;
  private String userCreate;
  private String userModif;
}
