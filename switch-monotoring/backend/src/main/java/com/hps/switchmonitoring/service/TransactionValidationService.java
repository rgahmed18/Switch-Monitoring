package com.hps.switchmonitoring.service;

import com.hps.switchmonitoring.dto.request.AtmTransactionRequest;
import com.hps.switchmonitoring.dto.request.PosTransactionRequest;
import com.hps.switchmonitoring.dto.request.EcomTransactionRequest;
import com.hps.switchmonitoring.enums.ChannelType;
import com.hps.switchmonitoring.enums.ActorType;
import com.hps.switchmonitoring.enums.PaymentNetwork;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.regex.Pattern;

/**
 * Service de validation des transactions par canal
 * Applique les règles métier spécifiques à ATM, POS, ECOM
 */
@Service
public class TransactionValidationService {

    private static final Logger logger = LoggerFactory.getLogger(TransactionValidationService.class);

    // ========== VALIDATION ATM ==========

    /**
     * Valide une transaction ATM (Guichet Automatique)
     */
    public TransactionValidationResult validateAtmTransaction(AtmTransactionRequest request) {
        TransactionValidationResult result = new TransactionValidationResult();

        try {
            // 1. Validate ATM ID exists
            if (request.getAtmId() == null || request.getAtmId().trim().isEmpty()) {
                result.addError("ATM ID is required");
            }

            // 2. Validate Operation Type pour ATM
            String opType = request.getOperationType();
            if (!isValidAtmOperation(opType)) {
                result.addError("Invalid operation type for ATM: " + opType);
            }

            // 3. Validate Amount pour Withdrawal/Deposit
            if (("WITHDRAWAL".equals(opType) || "DEPOSIT".equals(opType)) && 
                (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0)) {
                result.addError("Amount must be positive for " + opType);
            }

            // 4. Validate Security Method pour ATM
            if (request.getSecurityMethod() == null) {
                result.addError("Security method is required for ATM");
            }

            // 5. Validate Bill Level (must be between 0-100)
            if (request.getBillLevel() != null && 
                (request.getBillLevel() < 0 || request.getBillLevel() > 100)) {
                result.addError("Bill level must be between 0-100");
            }

            // 6. Validate Currency
            if (request.getCurrency() == null || !request.getCurrency().matches("^[A-Z]{3}$")) {
                result.addError("Currency must be a valid 3-letter ISO code");
            }

            // 7. Validate Timeout expectations pour ATM
            if (request.getExpectedTimeoutMs() != null && request.getExpectedTimeoutMs() > 60000) {
                result.addWarning("Expected timeout is high: " + request.getExpectedTimeoutMs() + "ms");
            }

            logger.info("ATM Transaction validation result: {}", result.isValid() ? "PASSED" : "FAILED");

        } catch (Exception e) {
            result.addError("Unexpected error during ATM validation: " + e.getMessage());
            logger.error("Error validating ATM transaction", e);
        }

        return result;
    }

    // ========== VALIDATION POS ==========

    /**
     * Valide une transaction POS (Terminal de Paiement)
     */
    public TransactionValidationResult validatePosTransaction(PosTransactionRequest request) {
        TransactionValidationResult result = new TransactionValidationResult();

        try {
            // 1. Validate Terminal ID (TID)
            if (request.getTerminalId() == null || request.getTerminalId().trim().isEmpty()) {
                result.addError("Terminal ID (TID) is required");
            }

            // 2. Validate Merchant ID (MID)
            if (request.getMerchantId() == null || request.getMerchantId().trim().isEmpty()) {
                result.addError("Merchant ID (MID) is required");
            }

            // 3. Validate Operation Type pour POS
            String opType = request.getOperationType();
            if (!isValidPosOperation(opType)) {
                result.addError("Invalid operation type for POS: " + opType);
            }

            // 4. Validate MCC Code (4 digits)
            if (request.getMccCode() != null && !request.getMccCode().matches("^\\d{4}$")) {
                result.addError("MCC Code must be 4 digits");
            }

            // 5. Validate Amount
            if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
                result.addError("Amount must be positive");
            }

            // 6. Validate POS Entry Mode
            if (request.getPosEntryMode() == null || !isValidPosEntryMode(request.getPosEntryMode())) {
                result.addError("Invalid POS Entry Mode: " + request.getPosEntryMode());
            }

            // 7. Validate Security Method pour POS
            if (request.getSecurityMethod() == null) {
                result.addError("Security method is required for POS");
            }

            // 8. Validate Currency
            if (request.getCurrency() == null || !request.getCurrency().matches("^[A-Z]{3}$")) {
                result.addError("Currency must be a valid 3-letter ISO code");
            }

            logger.info("POS Transaction validation result: {}", result.isValid() ? "PASSED" : "FAILED");

        } catch (Exception e) {
            result.addError("Unexpected error during POS validation: " + e.getMessage());
            logger.error("Error validating POS transaction", e);
        }

        return result;
    }

    // ========== VALIDATION ECOM ==========

    /**
     * Valide une transaction ECOM (E-Commerce)
     * Risque de fraude très élevé - validation stricte
     */
    public TransactionValidationResult validateEcomTransaction(EcomTransactionRequest request) {
        TransactionValidationResult result = new TransactionValidationResult();

        try {
            // 1. ECOM = CNP (Card Not Present) -> CVV obligatoire
            if (request.getCvda() == null || !"Y".equals(request.getCvda())) {
                result.addError("CVV Data is REQUIRED for ECOM transactions (Card Not Present)");
            }

            // 2. Validate Operation Type pour ECOM
            String opType = request.getOperationType();
            if (!isValidEcomOperation(opType)) {
                result.addError("Invalid operation type for ECOM: " + opType);
            }

            // 3. Validate 3DS Authentication pour montants > 500
            if (request.getAmount() != null && 
                request.getAmount().compareTo(new BigDecimal("500")) > 0 &&
                !Boolean.TRUE.equals(request.getRequiresAuthentication())) {
                result.addWarning("High amount (" + request.getAmount() + ") without 3DS authentication");
            }

            // 4. Validate Cardholder Email
            if (request.getCardHolderEmail() == null || !isValidEmail(request.getCardHolderEmail())) {
                result.addError("Valid cardholder email is required");
            }

            // 5. Validate Amount
            if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
                result.addError("Amount must be positive");
            }

            // 6. Validate Currency
            if (request.getCurrency() == null || !request.getCurrency().matches("^[A-Z]{3}$")) {
                result.addError("Currency must be a valid 3-letter ISO code");
            }

            // 7. Fraud Score Check
            if (request.getFraudScore() != null) {
                if (request.getFraudScore() > 75) {
                    result.addError("Transaction BLOCKED: High fraud score (" + request.getFraudScore() + ")");
                } else if (request.getFraudScore() > 50) {
                    result.addWarning("High fraud score: " + request.getFraudScore());
                }
            }

            // 8. Validate Security Method pour ECOM
            if (request.getSecurityMethod() == null) {
                result.addError("Security method is required for ECOM");
            }

            // 9. Recurring Payment validation
            if (Boolean.TRUE.equals(request.getIsRecurring())) {
                if (request.getRecurringFrequencyDays() == null || request.getRecurringFrequencyDays() <= 0) {
                    result.addError("Recurring frequency days must be specified for recurring payments");
                }
            }

            logger.info("ECOM Transaction validation result: {}", result.isValid() ? "PASSED" : "FAILED");

        } catch (Exception e) {
            result.addError("Unexpected error during ECOM validation: " + e.getMessage());
            logger.error("Error validating ECOM transaction", e);
        }

        return result;
    }

    // ========== HELPER METHODS ==========

    private boolean isValidAtmOperation(String operation) {
        return operation != null && (
            "WITHDRAWAL".equals(operation) || 
            "BALANCE_INQUIRY".equals(operation) || 
            "PIN_CHANGE".equals(operation) || 
            "DEPOSIT".equals(operation) ||
            "TRANSFER".equals(operation)
        );
    }

    private boolean isValidPosOperation(String operation) {
        return operation != null && (
            "SALE".equals(operation) || 
            "VOID".equals(operation) || 
            "REFUND".equals(operation) || 
            "PRE_AUTH".equals(operation) ||
            "COMPLETION".equals(operation)
        );
    }

    private boolean isValidEcomOperation(String operation) {
        return operation != null && (
            "PURCHASE".equals(operation) || 
            "RECURRING".equals(operation) || 
            "3DS_AUTH".equals(operation) || 
            "FRAUD_CHECK".equals(operation)
        );
    }

    private boolean isValidPosEntryMode(String mode) {
        // ISO 8583 Field 22 - POS Entry Mode
        return mode != null && mode.matches("^\\d{3}$");
    }

    private boolean isValidEmail(String email) {
        String emailRegex = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,6}$";
        return Pattern.compile(emailRegex).matcher(email).matches();
    }

    // ========== VALIDATION RESULT CLASS ==========

    public static class TransactionValidationResult {
        private StringBuilder errors = new StringBuilder();
        private StringBuilder warnings = new StringBuilder();
        
        public void addError(String error) {
            if (errors.length() > 0) errors.append("; ");
            errors.append(error);
        }

        public void addWarning(String warning) {
            if (warnings.length() > 0) warnings.append("; ");
            warnings.append(warning);
        }

        public boolean isValid() {
            return errors.length() == 0;
        }

        public String getErrors() {
            return errors.toString();
        }

        public String getWarnings() {
            return warnings.toString();
        }

        public boolean hasWarnings() {
            return warnings.length() > 0;
        }

        @Override
        public String toString() {
            return "ValidationResult{" +
                    "valid=" + isValid() +
                    ", errors='" + getErrors() + '\'' +
                    ", warnings='" + getWarnings() + '\'' +
                    '}';
        }
    }
}
