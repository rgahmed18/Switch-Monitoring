package com.hps.switchmonitoring.dto.request;

import java.math.BigDecimal;

/**
 * DTO pour les transactions ATM (Guichet Automatique)
 */
public class AtmTransactionRequest {

    private String externalId;
    private String atmId; // Identifiant du GAB
    private String channel; // Toujours "ATM"
    private String operationType; // WITHDRAWAL, BALANCE_INQUIRY, PIN_CHANGE, DEPOSIT
    private String cardNumberMasked;
    private String issuerBankId;
    private String acquirerBankId;
    private BigDecimal amount;
    private String currency;
    private String securityMethod; // PIN_ONLINE, PIN_OFFLINE, BIOMETRIC
    private Boolean isSameBank;
    private Integer billLevel; // Niveau de billets
    private String mtiCode;
    private Integer expectedTimeoutMs; // Timeout attendu pour la transaction

    // Constructors
    public AtmTransactionRequest() {
    }

    public AtmTransactionRequest(String externalId, String atmId, String operationType) {
        this.externalId = externalId;
        this.atmId = atmId;
        this.operationType = operationType;
        this.channel = "ATM";
    }

    // Getters & Setters
    public String getExternalId() {
        return externalId;
    }

    public void setExternalId(String externalId) {
        this.externalId = externalId;
    }

    public String getAtmId() {
        return atmId;
    }

    public void setAtmId(String atmId) {
        this.atmId = atmId;
    }

    public String getChannel() {
        return channel;
    }

    public void setChannel(String channel) {
        this.channel = channel;
    }

    public String getOperationType() {
        return operationType;
    }

    public void setOperationType(String operationType) {
        this.operationType = operationType;
    }

    public String getCardNumberMasked() {
        return cardNumberMasked;
    }

    public void setCardNumberMasked(String cardNumberMasked) {
        this.cardNumberMasked = cardNumberMasked;
    }

    public String getIssuerBankId() {
        return issuerBankId;
    }

    public void setIssuerBankId(String issuerBankId) {
        this.issuerBankId = issuerBankId;
    }

    public String getAcquirerBankId() {
        return acquirerBankId;
    }

    public void setAcquirerBankId(String acquirerBankId) {
        this.acquirerBankId = acquirerBankId;
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

    public String getSecurityMethod() {
        return securityMethod;
    }

    public void setSecurityMethod(String securityMethod) {
        this.securityMethod = securityMethod;
    }

    public Boolean getIsSameBank() {
        return isSameBank;
    }

    public void setIsSameBank(Boolean isSameBank) {
        this.isSameBank = isSameBank;
    }

    public Integer getBillLevel() {
        return billLevel;
    }

    public void setBillLevel(Integer billLevel) {
        this.billLevel = billLevel;
    }

    public String getMtiCode() {
        return mtiCode;
    }

    public void setMtiCode(String mtiCode) {
        this.mtiCode = mtiCode;
    }

    public Integer getExpectedTimeoutMs() {
        return expectedTimeoutMs;
    }

    public void setExpectedTimeoutMs(Integer expectedTimeoutMs) {
        this.expectedTimeoutMs = expectedTimeoutMs;
    }
}
