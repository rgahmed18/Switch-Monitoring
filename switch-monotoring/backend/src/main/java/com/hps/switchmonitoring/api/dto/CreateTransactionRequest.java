package com.hps.switchmonitoring.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class CreateTransactionRequest {

  @NotBlank
  private String externalId;
  @NotNull
  private LocalDateTime timestamp;
  @NotBlank
  private String mtiCode;
  private String stan;
  private String rrn;
  @NotNull
  @DecimalMin("0.0")
  private BigDecimal amount;
  @NotBlank
  private String currency;
  @NotBlank
  private String responseCode;
  private String terminalId;
  private String merchantName;
  private String acquirerId;
  private String issuerId;
  private Long latencyMs;
  @NotBlank
  private String status;

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
}
