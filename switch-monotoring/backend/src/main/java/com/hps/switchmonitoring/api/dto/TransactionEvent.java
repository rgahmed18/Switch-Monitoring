package com.hps.switchmonitoring.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO pour l'événement Transaction envoyé/reçu via Kafka
 * Utilisé pour la sérialisation JSON vers les topics Kafka
 */
public class TransactionEvent implements Serializable {

  private static final long serialVersionUID = 1L;

  @JsonProperty("id")
  private Long id;

  @JsonProperty("external_id")
  private String externalId;

  @JsonProperty("timestamp")
  private LocalDateTime timestamp;

  @JsonProperty("mti_code")
  private String mtiCode;

  @JsonProperty("stan")
  private String stan;

  @JsonProperty("rrn")
  private String rrn;

  @JsonProperty("amount")
  private BigDecimal amount;

  @JsonProperty("currency")
  private String currency;

  @JsonProperty("response_code")
  private String responseCode;

  @JsonProperty("terminal_id")
  private String terminalId;

  @JsonProperty("merchant_name")
  private String merchantName;

  @JsonProperty("acquirer_id")
  private String acquirerId;

  @JsonProperty("issuer_id")
  private String issuerId;

  @JsonProperty("latency_ms")
  private Long latencyMs;

  @JsonProperty("status")
  private String status;

  @JsonProperty("zone")
  private String zone;

  @JsonProperty("channel")
  private String channel;

  @JsonProperty("actor_type")
  private String actorType;

  @JsonProperty("payment_network")
  private String paymentNetwork;

  @JsonProperty("operation_type")
  private String operationType;

  @JsonProperty("security_method")
  private String securityMethod;

  @JsonProperty("card_number_masked")
  private String cardNumberMasked;

  @JsonProperty("is_same_bank")
  private Boolean isSameBank;

  @JsonProperty("mcc_code")
  private String mccCode;

  @JsonProperty("atm_id")
  private String atmId;

  @JsonProperty("bill_level")
  private Integer billLevel;

  @JsonProperty("pos_entry_mode")
  private String posEntryMode;

  @JsonProperty("event_timestamp")
  private LocalDateTime eventTimestamp;

  // Constructors
  public TransactionEvent() {
    this.eventTimestamp = LocalDateTime.now();
  }

  public TransactionEvent(Long id, String externalId, LocalDateTime timestamp, String mtiCode,
      String stan, String rrn, BigDecimal amount, String currency, String responseCode,
      String terminalId, String merchantName, String acquirerId, String issuerId,
      Long latencyMs, String status, String zone, String channel) {
    this.id = id;
    this.externalId = externalId;
    this.timestamp = timestamp;
    this.mtiCode = mtiCode;
    this.stan = stan;
    this.rrn = rrn;
    this.amount = amount;
    this.currency = currency;
    this.responseCode = responseCode;
    this.terminalId = terminalId;
    this.merchantName = merchantName;
    this.acquirerId = acquirerId;
    this.issuerId = issuerId;
    this.latencyMs = latencyMs;
    this.status = status;
    this.zone = zone;
    this.channel = channel;
    this.eventTimestamp = LocalDateTime.now();
  }

  // Getters and Setters
  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getExternalId() {
    return externalId;
  }

  public void setExternalId(String externalId) {
    this.externalId = externalId;
  }

  public LocalDateTime getTimestamp() {
    return timestamp;
  }

  public void setTimestamp(LocalDateTime timestamp) {
    this.timestamp = timestamp;
  }

  public String getMtiCode() {
    return mtiCode;
  }

  public void setMtiCode(String mtiCode) {
    this.mtiCode = mtiCode;
  }

  public String getStan() {
    return stan;
  }

  public void setStan(String stan) {
    this.stan = stan;
  }

  public String getRrn() {
    return rrn;
  }

  public void setRrn(String rrn) {
    this.rrn = rrn;
  }

  public BigDecimal getAmount() {
    return amount;
  }

  public void setAmount(BigDecimal amount) {
    this.amount = amount;
  }

  public String getCurrency() {
    return currency;
  }

  public void setCurrency(String currency) {
    this.currency = currency;
  }

  public String getResponseCode() {
    return responseCode;
  }

  public void setResponseCode(String responseCode) {
    this.responseCode = responseCode;
  }

  public String getTerminalId() {
    return terminalId;
  }

  public void setTerminalId(String terminalId) {
    this.terminalId = terminalId;
  }

  public String getMerchantName() {
    return merchantName;
  }

  public void setMerchantName(String merchantName) {
    this.merchantName = merchantName;
  }

  public String getAcquirerId() {
    return acquirerId;
  }

  public void setAcquirerId(String acquirerId) {
    this.acquirerId = acquirerId;
  }

  public String getIssuerId() {
    return issuerId;
  }

  public void setIssuerId(String issuerId) {
    this.issuerId = issuerId;
  }

  public Long getLatencyMs() {
    return latencyMs;
  }

  public void setLatencyMs(Long latencyMs) {
    this.latencyMs = latencyMs;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public String getZone() {
    return zone;
  }

  public void setZone(String zone) {
    this.zone = zone;
  }

  public String getChannel() {
    return channel;
  }

  public void setChannel(String channel) {
    this.channel = channel;
  }

  public String getActorType() {
    return actorType;
  }

  public void setActorType(String actorType) {
    this.actorType = actorType;
  }

  public String getPaymentNetwork() {
    return paymentNetwork;
  }

  public void setPaymentNetwork(String paymentNetwork) {
    this.paymentNetwork = paymentNetwork;
  }

  public String getOperationType() {
    return operationType;
  }

  public void setOperationType(String operationType) {
    this.operationType = operationType;
  }

  public String getSecurityMethod() {
    return securityMethod;
  }

  public void setSecurityMethod(String securityMethod) {
    this.securityMethod = securityMethod;
  }

  public String getCardNumberMasked() {
    return cardNumberMasked;
  }

  public void setCardNumberMasked(String cardNumberMasked) {
    this.cardNumberMasked = cardNumberMasked;
  }

  public Boolean getIsSameBank() {
    return isSameBank;
  }

  public void setIsSameBank(Boolean isSameBank) {
    this.isSameBank = isSameBank;
  }

  public String getMccCode() {
    return mccCode;
  }

  public void setMccCode(String mccCode) {
    this.mccCode = mccCode;
  }

  public String getAtmId() {
    return atmId;
  }

  public void setAtmId(String atmId) {
    this.atmId = atmId;
  }

  public Integer getBillLevel() {
    return billLevel;
  }

  public void setBillLevel(Integer billLevel) {
    this.billLevel = billLevel;
  }

  public String getPosEntryMode() {
    return posEntryMode;
  }

  public void setPosEntryMode(String posEntryMode) {
    this.posEntryMode = posEntryMode;
  }

  public LocalDateTime getEventTimestamp() {
    return eventTimestamp;
  }

  public void setEventTimestamp(LocalDateTime eventTimestamp) {
    this.eventTimestamp = eventTimestamp;
  }
}
