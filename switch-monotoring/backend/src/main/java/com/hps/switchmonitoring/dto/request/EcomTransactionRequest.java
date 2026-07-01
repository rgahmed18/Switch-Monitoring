package com.hps.switchmonitoring.dto.request;

import java.math.BigDecimal;

/**
 * DTO pour les transactions ECOM (E-Commerce)
 * CNP = Card Not Present : le risque de fraude est plus élevé
 */
public class EcomTransactionRequest {

    private String externalId;
    private String channel; // Toujours "ECOM"
    private String operationType; // PURCHASE, RECURRING, 3DS_AUTH, FRAUD_CHECK
    private String cardNumberMasked;
    private String cardHolderEmail;
    private String cardHolderPhone;
    private String issuerBankId;
    private String acquirerBankId;
    private String paymentGatewayId; // Passerelle de paiement
    private String website; // URL du site e-commerce
    private String merchantName;
    private BigDecimal amount;
    private String currency;
    private String securityMethod; // CVV_ONLY, 3DS, BIOMETRIC
    private Boolean isSameBank;
    
    // Champs ECOM spécifiques
    private String cvda; // CVV Data Available (Y/N)
    private String avs; // Address Verification System
    private Boolean requiresAuthentication; // Si 3DS est requis
    private Integer fraudScore; // Score de fraude (0-100)
    private String productCategory; // Type de produit acheté
    private Integer productQuantity;
    private String orderNumber;
    private String shippingAddress;
    private String billingAddress;
    private String deviceFingerprint; // Pour détection fraude
    private Boolean isRecurring; // Paiement récurrent ?
    private Integer recurringFrequencyDays;

    // Constructors
    public EcomTransactionRequest() {
    }

    public EcomTransactionRequest(String externalId, String cardNumberMasked, String operationType) {
        this.externalId = externalId;
        this.cardNumberMasked = cardNumberMasked;
        this.operationType = operationType;
        this.channel = "ECOM";
    }

    // Getters & Setters
    public String getExternalId() {
        return externalId;
    }

    public void setExternalId(String externalId) {
        this.externalId = externalId;
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

    public String getCardHolderEmail() {
        return cardHolderEmail;
    }

    public void setCardHolderEmail(String cardHolderEmail) {
        this.cardHolderEmail = cardHolderEmail;
    }

    public String getCardHolderPhone() {
        return cardHolderPhone;
    }

    public void setCardHolderPhone(String cardHolderPhone) {
        this.cardHolderPhone = cardHolderPhone;
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

    public String getPaymentGatewayId() {
        return paymentGatewayId;
    }

    public void setPaymentGatewayId(String paymentGatewayId) {
        this.paymentGatewayId = paymentGatewayId;
    }

    public String getWebsite() {
        return website;
    }

    public void setWebsite(String website) {
        this.website = website;
    }

    public String getMerchantName() {
        return merchantName;
    }

    public void setMerchantName(String merchantName) {
        this.merchantName = merchantName;
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

    public String getCvda() {
        return cvda;
    }

    public void setCvda(String cvda) {
        this.cvda = cvda;
    }

    public String getAvs() {
        return avs;
    }

    public void setAvs(String avs) {
        this.avs = avs;
    }

    public Boolean getRequiresAuthentication() {
        return requiresAuthentication;
    }

    public void setRequiresAuthentication(Boolean requiresAuthentication) {
        this.requiresAuthentication = requiresAuthentication;
    }

    public Integer getFraudScore() {
        return fraudScore;
    }

    public void setFraudScore(Integer fraudScore) {
        this.fraudScore = fraudScore;
    }

    public String getProductCategory() {
        return productCategory;
    }

    public void setProductCategory(String productCategory) {
        this.productCategory = productCategory;
    }

    public Integer getProductQuantity() {
        return productQuantity;
    }

    public void setProductQuantity(Integer productQuantity) {
        this.productQuantity = productQuantity;
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public void setOrderNumber(String orderNumber) {
        this.orderNumber = orderNumber;
    }

    public String getShippingAddress() {
        return shippingAddress;
    }

    public void setShippingAddress(String shippingAddress) {
        this.shippingAddress = shippingAddress;
    }

    public String getBillingAddress() {
        return billingAddress;
    }

    public void setBillingAddress(String billingAddress) {
        this.billingAddress = billingAddress;
    }

    public String getDeviceFingerprint() {
        return deviceFingerprint;
    }

    public void setDeviceFingerprint(String deviceFingerprint) {
        this.deviceFingerprint = deviceFingerprint;
    }

    public Boolean getIsRecurring() {
        return isRecurring;
    }

    public void setIsRecurring(Boolean isRecurring) {
        this.isRecurring = isRecurring;
    }

    public Integer getRecurringFrequencyDays() {
        return recurringFrequencyDays;
    }

    public void setRecurringFrequencyDays(Integer recurringFrequencyDays) {
        this.recurringFrequencyDays = recurringFrequencyDays;
    }
}
