package com.hps.switchmonitoring.dto.request;

import java.math.BigDecimal;

/**
 * DTO pour les transactions POS (Terminal de Paiement)
 */
public class PosTransactionRequest {

    private String externalId;
    private String terminalId; // Identifiant du Terminal - TID
    private String merchantId; // MID (Merchant ID)
    private String merchantName;
    private String mccCode; // Merchant Category Code
    private String channel; // Toujours "POS"
    private String operationType; // SALE, VOID, REFUND, PRE_AUTH
    private String cardNumberMasked;
    private String issuerBankId;
    private String acquirerBankId;
    private BigDecimal amount;
    private String currency;
    private String securityMethod; // PIN_ONLINE, NFC_CONTACTLESS, SIGNATURE
    private Boolean isSameBank;
    private String posEntryMode; // ISO 8583 Field 22 (01-05, 07, 10, etc)
    private Integer ticketNumber;
    private String invoiceNumber;
    private String batchNumber;

    // Constructors
    public PosTransactionRequest() {
    }

    public PosTransactionRequest(String externalId, String terminalId, String merchantId) {
        this.externalId = externalId;
        this.terminalId = terminalId;
        this.merchantId = merchantId;
        this.channel = "POS";
    }

    // Getters & Setters
    public String getExternalId() {
        return externalId;
    }

    public void setExternalId(String externalId) {
        this.externalId = externalId;
    }

    public String getTerminalId() {
        return terminalId;
    }

    public void setTerminalId(String terminalId) {
        this.terminalId = terminalId;
    }

    public String getMerchantId() {
        return merchantId;
    }

    public void setMerchantId(String merchantId) {
        this.merchantId = merchantId;
    }

    public String getMerchantName() {
        return merchantName;
    }

    public void setMerchantName(String merchantName) {
        this.merchantName = merchantName;
    }

    public String getMccCode() {
        return mccCode;
    }

    public void setMccCode(String mccCode) {
        this.mccCode = mccCode;
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

    public String getPosEntryMode() {
        return posEntryMode;
    }

    public void setPosEntryMode(String posEntryMode) {
        this.posEntryMode = posEntryMode;
    }

    public Integer getTicketNumber() {
        return ticketNumber;
    }

    public void setTicketNumber(Integer ticketNumber) {
        this.ticketNumber = ticketNumber;
    }

    public String getInvoiceNumber() {
        return invoiceNumber;
    }

    public void setInvoiceNumber(String invoiceNumber) {
        this.invoiceNumber = invoiceNumber;
    }

    public String getBatchNumber() {
        return batchNumber;
    }

    public void setBatchNumber(String batchNumber) {
        this.batchNumber = batchNumber;
    }
}
