-- ============================================================================
-- V3_0_2: CREATE VIEWS FOR AUTHO_ACTIVITY_ADM DATA ANALYSIS
-- Vues analytiques pour le monitoring et les rapports
-- Aligné sur le schéma officiel AUTHO_ACTIVITY_ADM
-- ============================================================================

-- ============================================================================
-- VUE: VW_AUTHORIZATIONS
-- Transactions d'autorisation avec statut et codes d'action
-- ============================================================================
CREATE OR REPLACE VIEW VW_AUTHORIZATIONS AS
SELECT 
    reference_number,
    internal_stan,
    transaction_id,
    authorization_id,
    card_number,
    transaction_amount,
    transaction_currency,
    action_code,
    autho_flag,
    message_type,
    function_code,
    processing_code,
    network_code,
    network_id,
    response_date_and_time,
    transmission_date_and_time,
    business_date,
    card_acceptor_id,
    card_acceptor_term_id,
    card_acc_name_address,
    acquiring_country_code,
    card_acceptor_activity,
    reject_code,
    reject_reason
FROM AUTHO_ACTIVITY_ADM
WHERE autho_flag = 'Y'
ORDER BY response_date_and_time DESC;

-- ============================================================================
-- VUE: VW_DECLINED_TRANSACTIONS
-- Transactions refusées avec raisons de rejet
-- action_code != '00' signifie refusé dans ISO 8583
-- ============================================================================
CREATE OR REPLACE VIEW VW_DECLINED_TRANSACTIONS AS
SELECT 
    reference_number,
    internal_stan,
    transaction_id,
    card_number,
    transaction_amount,
    transaction_currency,
    action_code,
    reject_code,
    reject_reason,
    message_type,
    issuer_action_code,
    event_code,
    reason_code,
    network_id,
    response_date_and_time,
    business_date,
    card_acceptor_id,
    card_acc_name_address
FROM AUTHO_ACTIVITY_ADM
WHERE action_code IS NOT NULL AND action_code != '00'
   OR reject_code IS NOT NULL
ORDER BY response_date_and_time DESC;

-- ============================================================================
-- VUE: VW_POS_TRANSACTIONS
-- Transactions POS (point de vente)
-- ============================================================================
CREATE OR REPLACE VIEW VW_POS_TRANSACTIONS AS
SELECT 
    reference_number,
    internal_stan,
    transaction_id,
    card_number,
    card_acceptor_id,
    card_acceptor_term_id,
    card_acceptor_activity,
    card_acc_name_address,
    transaction_amount,
    transaction_currency,
    billing_amount,
    billing_currency,
    pos_entry_mode,
    pos_condition_code,
    pos_data,
    service_code,
    security_verif_level,
    action_code,
    message_type,
    network_id,
    response_date_and_time,
    transmission_date_and_time,
    business_date,
    transaction_local_date
FROM AUTHO_ACTIVITY_ADM
WHERE pos_condition_code IS NOT NULL
  AND pos_condition_code NOT IN ('59', '81')
ORDER BY response_date_and_time DESC;

-- ============================================================================
-- VUE: VW_ATM_TRANSACTIONS
-- Transactions ATM (retrait billets)
-- ============================================================================
CREATE OR REPLACE VIEW VW_ATM_TRANSACTIONS AS
SELECT 
    reference_number,
    internal_stan,
    transaction_id,
    card_number,
    card_acceptor_id,
    card_acceptor_term_id,
    transaction_amount,
    transaction_currency,
    processing_code,
    function_code,
    action_code,
    message_type,
    network_id,
    response_date_and_time,
    transmission_date_and_time,
    business_date,
    authorization_code,
    cr_available_balance,
    cash_back_amount,
    security_verif_level,
    transaction_local_date
FROM AUTHO_ACTIVITY_ADM
WHERE processing_code IN ('01', '02', '21')
   OR card_acceptor_activity = '6011'
ORDER BY response_date_and_time DESC;

-- ============================================================================
-- VUE: VW_ECOM_TRANSACTIONS
-- Transactions e-commerce (sans contact physique)
-- pos_condition_code '59' = E-commerce
-- ============================================================================
CREATE OR REPLACE VIEW VW_ECOM_TRANSACTIONS AS
SELECT 
    reference_number,
    internal_stan,
    transaction_id,
    card_number,
    card_acceptor_id,
    card_acc_name_address,
    transaction_amount,
    transaction_currency,
    service_code,
    security_verif_level,
    security_verif_result,
    address_verification_data,
    external_cvv_result_code,
    action_code,
    message_type,
    network_id,
    response_date_and_time,
    transmission_date_and_time,
    business_date,
    network_code,
    acquiring_country_code,
    transaction_local_date
FROM AUTHO_ACTIVITY_ADM
WHERE pos_condition_code = '59'
   OR pos_entry_mode IN ('01', '81', '90', '91')
ORDER BY response_date_and_time DESC;

-- ============================================================================
-- VUE: VW_REVERSALS
-- Transactions Reversal (annulations/retours)
-- ============================================================================
CREATE OR REPLACE VIEW VW_REVERSALS AS
SELECT 
    reference_number,
    internal_stan,
    transaction_id,
    original_transaction_date_time,
    reversal_transaction_date,
    reversal_stan,
    card_number,
    transaction_amount,
    transaction_currency,
    action_code,
    original_action_code,
    message_type,
    processing_code,
    network_id,
    response_date_and_time,
    business_date
FROM AUTHO_ACTIVITY_ADM
WHERE reversal_flag = 'Y'
   OR reversal_stan IS NOT NULL
   OR reversal_transaction_date IS NOT NULL
ORDER BY response_date_and_time DESC;

-- ============================================================================
-- VUE: VW_HIGH_VALUE_TRANSACTIONS
-- Transactions de montant élevé (risk monitoring)
-- ============================================================================
CREATE OR REPLACE VIEW VW_HIGH_VALUE_TRANSACTIONS AS
SELECT 
    reference_number,
    internal_stan,
    transaction_id,
    card_number,
    transaction_amount,
    transaction_currency,
    action_code,
    card_acceptor_id,
    card_acceptor_activity,
    card_acc_name_address,
    message_type,
    network_id,
    response_date_and_time,
    business_date,
    vip_level,
    card_level,
    card_type,
    acquiring_country_code
FROM AUTHO_ACTIVITY_ADM
WHERE transaction_amount > 5000
ORDER BY transaction_amount DESC, response_date_and_time DESC;

-- ============================================================================
-- VUE: VW_SETTLEMENT_DATA
-- Données de settlement/compensation
-- ============================================================================
CREATE OR REPLACE VIEW VW_SETTLEMENT_DATA AS
SELECT 
    reference_number,
    internal_stan,
    transaction_id,
    transaction_amount,
    transaction_currency,
    iss_settlement_amount,
    iss_settlement_currency,
    iss_settlement_date,
    iss_conv_rate_settlement,
    acq_settlement_amount,
    acq_settlement_currency,
    acq_settlement_date,
    acq_conv_rate_settlement,
    transaction_fee,
    iss_settlement_fee,
    acq_settlement_fee,
    conversion_rate,
    conversion_rate_date,
    card_number,
    business_date
FROM AUTHO_ACTIVITY_ADM
WHERE iss_settlement_amount IS NOT NULL
   OR acq_settlement_amount IS NOT NULL
ORDER BY iss_settlement_date DESC, acq_settlement_date DESC;

-- ============================================================================
-- VUE: VW_INTRA_BANK_TRANSACTIONS
-- Transactions intra-bancaires (même banque émettrice/acquéreuse)
-- ============================================================================
CREATE OR REPLACE VIEW VW_INTRA_BANK_TRANSACTIONS AS
SELECT 
    reference_number,
    internal_stan,
    transaction_id,
    card_number,
    issuing_bank,
    acquirer_bank,
    transaction_amount,
    transaction_currency,
    action_code,
    message_type,
    network_id,
    response_date_and_time,
    business_date,
    authorization_code
FROM AUTHO_ACTIVITY_ADM
WHERE issuing_bank = acquirer_bank
   OR source_account_entity_code = destination_account_entity_cod
ORDER BY response_date_and_time DESC;

-- ============================================================================
-- VUE: VW_INTERNATIONAL_TRANSACTIONS
-- Transactions internationales (conversion devises)
-- ============================================================================
CREATE OR REPLACE VIEW VW_INTERNATIONAL_TRANSACTIONS AS
SELECT 
    reference_number,
    internal_stan,
    transaction_id,
    card_number,
    transaction_amount,
    transaction_currency,
    billing_amount,
    billing_currency,
    conversion_rate,
    conversion_rate_date,
    forwarding_country_code,
    acquiring_country_code,
    action_code,
    network_id,
    response_date_and_time,
    business_date
FROM AUTHO_ACTIVITY_ADM
WHERE transaction_currency != billing_currency
   OR conversion_rate IS NOT NULL
ORDER BY response_date_and_time DESC;

-- ============================================================================
-- VUE: VW_CHIP_EMV_TRANSACTIONS
-- Transactions par puce (EMV/Chip)
-- ============================================================================
CREATE OR REPLACE VIEW VW_CHIP_EMV_TRANSACTIONS AS
SELECT 
    reference_number,
    internal_stan,
    transaction_id,
    card_number,
    chip_application_cryptogram,
    chip_tvr,
    chip_terminal_type,
    chip_transaction_currency_code,
    chip_transaction_amount,
    chip_atc,
    chip_cvm_results,
    chip_aip,
    transaction_amount,
    transaction_currency,
    action_code,
    network_id,
    response_date_and_time,
    business_date,
    external_cvv_result_code
FROM AUTHO_ACTIVITY_ADM
WHERE chip_application_cryptogram IS NOT NULL
   OR chip_tvr IS NOT NULL
ORDER BY response_date_and_time DESC;

-- ============================================================================
-- VUE: VW_DAILY_TRANSACTION_SUMMARY
-- Résumé journalier des transactions
-- ============================================================================
CREATE OR REPLACE VIEW VW_DAILY_TRANSACTION_SUMMARY AS
SELECT 
    business_date,
    action_code,
    message_type,
    network_id,
    COUNT(*) AS transaction_count,
    SUM(transaction_amount) AS total_amount,
    AVG(transaction_amount) AS avg_amount,
    MAX(transaction_amount) AS max_amount,
    MIN(transaction_amount) AS min_amount,
    COUNT(CASE WHEN action_code != '00' OR reject_code IS NOT NULL THEN 1 END) AS rejected_count,
    ROUND(100 * COUNT(CASE WHEN action_code = '00' THEN 1 END) / NULLIF(COUNT(*), 0), 2) AS approval_rate
FROM AUTHO_ACTIVITY_ADM
GROUP BY business_date, action_code, message_type, network_id
ORDER BY business_date DESC, transaction_count DESC;

-- ============================================================================
-- VUE: VW_ISO8583_MESSAGE_DISTRIBUTION
-- Distribution des messages ISO 8583 par MTI
-- ============================================================================
CREATE OR REPLACE VIEW VW_ISO8583_MESSAGE_DISTRIBUTION AS
SELECT 
    message_type,
    function_code,
    processing_code,
    network_id,
    COUNT(*) AS message_count,
    COUNT(CASE WHEN action_code = '00' THEN 1 END) AS approved_count,
    COUNT(CASE WHEN action_code != '00' OR reject_code IS NOT NULL THEN 1 END) AS declined_count,
    business_date
FROM AUTHO_ACTIVITY_ADM
GROUP BY message_type, function_code, processing_code, network_id, business_date
ORDER BY business_date DESC, message_count DESC;

-- ============================================================================
-- VUE: VW_NETWORK_PERFORMANCE
-- Performance par réseau (VISA, MC, CMI...)
-- ============================================================================
CREATE OR REPLACE VIEW VW_NETWORK_PERFORMANCE AS
SELECT 
    network_id,
    network_code,
    business_date,
    COUNT(*) AS transaction_count,
    SUM(transaction_amount) AS total_amount,
    ROUND(100 * COUNT(CASE WHEN action_code = '00' THEN 1 END) / NULLIF(COUNT(*), 0), 2) AS approval_rate,
    COUNT(CASE WHEN reversal_flag = 'Y' THEN 1 END) AS reversal_count
FROM AUTHO_ACTIVITY_ADM
GROUP BY network_id, network_code, business_date
ORDER BY business_date DESC, transaction_count DESC;

-- ============================================================================
-- COMMIT POUR CRÉATION DES VUES
-- ============================================================================
COMMIT;
