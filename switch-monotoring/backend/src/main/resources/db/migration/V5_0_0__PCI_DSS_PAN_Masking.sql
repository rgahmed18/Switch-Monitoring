-- ============================================================================
-- V5_0_0 : PCI-DSS §3.3.1 — MASQUAGE DU PAN DANS TOUTES LES VUES ORACLE
--
-- Problème : les vues V3_0_2 exposent card_number en clair → violation PCI-DSS.
-- Solution : recréer toutes les vues avec FN_MASK_PAN(card_number).
--
-- Règle de masquage :  4000005327187750  →  400000XXXXXX7750
--   - 6 premiers chiffres conservés (BIN / IIN)
--   - 4 derniers chiffres conservés
--   - Tout le milieu remplacé par 'X'
-- ============================================================================


-- ============================================================================
-- SECTION 1 : FONCTION DE MASQUAGE RÉUTILISABLE
-- NOTE Flyway : nécessite oracle.sqlplus=true dans flyway.conf
--              OU exécuter manuellement dans SQL Developer avant le démarrage.
-- ============================================================================

CREATE OR REPLACE FUNCTION FN_MASK_PAN(p_pan IN VARCHAR2)
RETURN VARCHAR2
DETERMINISTIC
IS
    v_pan VARCHAR2(30);
    v_len NUMBER;
BEGIN
    IF p_pan IS NULL THEN
        RETURN NULL;
    END IF;

    -- Supprimer espaces et tirets
    v_pan := REPLACE(REPLACE(TRIM(p_pan), ' ', ''), '-', '');
    v_len := LENGTH(v_pan);

    -- PAN trop court pour être masqué correctement
    IF v_len < 11 THEN
        RETURN '****';
    END IF;

    -- BIN (6 chiffres) + 'X' × milieu + 4 derniers chiffres
    RETURN SUBSTR(v_pan, 1, 6)
        || RPAD('X', v_len - 10, 'X')
        || SUBSTR(v_pan, -4);
END FN_MASK_PAN;
/


-- ============================================================================
-- SECTION 2 : RECREATION DES VUES AVEC PAN MASQUÉ
-- Chaque "card_number" brut → FN_MASK_PAN(card_number) AS card_number
-- ============================================================================


-- VUE : VW_AUTHORIZATIONS
CREATE OR REPLACE VIEW VW_AUTHORIZATIONS AS
SELECT
    reference_number,
    internal_stan,
    transaction_id,
    authorization_id,
    FN_MASK_PAN(card_number)        AS card_number,
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


-- VUE : VW_DECLINED_TRANSACTIONS
CREATE OR REPLACE VIEW VW_DECLINED_TRANSACTIONS AS
SELECT
    reference_number,
    internal_stan,
    transaction_id,
    FN_MASK_PAN(card_number)        AS card_number,
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


-- VUE : VW_POS_TRANSACTIONS
CREATE OR REPLACE VIEW VW_POS_TRANSACTIONS AS
SELECT
    reference_number,
    internal_stan,
    transaction_id,
    FN_MASK_PAN(card_number)        AS card_number,
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


-- VUE : VW_ATM_TRANSACTIONS
CREATE OR REPLACE VIEW VW_ATM_TRANSACTIONS AS
SELECT
    reference_number,
    internal_stan,
    transaction_id,
    FN_MASK_PAN(card_number)        AS card_number,
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


-- VUE : VW_ECOM_TRANSACTIONS
CREATE OR REPLACE VIEW VW_ECOM_TRANSACTIONS AS
SELECT
    reference_number,
    internal_stan,
    transaction_id,
    FN_MASK_PAN(card_number)        AS card_number,
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


-- VUE : VW_REVERSALS
CREATE OR REPLACE VIEW VW_REVERSALS AS
SELECT
    reference_number,
    internal_stan,
    transaction_id,
    original_transaction_date_time,
    reversal_transaction_date,
    reversal_stan,
    FN_MASK_PAN(card_number)        AS card_number,
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


-- VUE : VW_HIGH_VALUE_TRANSACTIONS
CREATE OR REPLACE VIEW VW_HIGH_VALUE_TRANSACTIONS AS
SELECT
    reference_number,
    internal_stan,
    transaction_id,
    FN_MASK_PAN(card_number)        AS card_number,
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


-- VUE : VW_SETTLEMENT_DATA
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
    FN_MASK_PAN(card_number)        AS card_number,
    business_date
FROM AUTHO_ACTIVITY_ADM
WHERE iss_settlement_amount IS NOT NULL
   OR acq_settlement_amount IS NOT NULL
ORDER BY iss_settlement_date DESC, acq_settlement_date DESC;


-- VUE : VW_INTRA_BANK_TRANSACTIONS
CREATE OR REPLACE VIEW VW_INTRA_BANK_TRANSACTIONS AS
SELECT
    reference_number,
    internal_stan,
    transaction_id,
    FN_MASK_PAN(card_number)        AS card_number,
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


-- VUE : VW_INTERNATIONAL_TRANSACTIONS
CREATE OR REPLACE VIEW VW_INTERNATIONAL_TRANSACTIONS AS
SELECT
    reference_number,
    internal_stan,
    transaction_id,
    FN_MASK_PAN(card_number)        AS card_number,
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


-- VUE : VW_CHIP_EMV_TRANSACTIONS
CREATE OR REPLACE VIEW VW_CHIP_EMV_TRANSACTIONS AS
SELECT
    reference_number,
    internal_stan,
    transaction_id,
    FN_MASK_PAN(card_number)        AS card_number,
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
-- SECTION 3 : CONTRÔLE D'ACCÈS
--
-- Contexte PFE : l'utilisateur Oracle est PFE_SW_MON (propriétaire du schéma).
-- Un propriétaire de schéma Oracle voit toujours ses propres tables.
--
-- Solution recommandée : créer un 2ème user de lecture seule (PFE_SW_READ)
-- et ne lui donner accès qu'aux vues masquées.
--
-- Étapes à exécuter avec un compte DBA (ex : SYSTEM) :
-- ============================================================================

-- ÉTAPE 1 : Créer l'utilisateur de lecture seule (si pas encore fait)
-- CREATE USER PFE_SW_READ IDENTIFIED BY MotDePasseLecture2024;
-- GRANT CREATE SESSION TO PFE_SW_READ;

-- ÉTAPE 2 : Accès aux vues masquées uniquement (jamais à la table brute)
-- GRANT SELECT ON PFE_SW_MON.VW_AUTHORIZATIONS          TO PFE_SW_READ;
-- GRANT SELECT ON PFE_SW_MON.VW_DECLINED_TRANSACTIONS   TO PFE_SW_READ;
-- GRANT SELECT ON PFE_SW_MON.VW_POS_TRANSACTIONS        TO PFE_SW_READ;
-- GRANT SELECT ON PFE_SW_MON.VW_ATM_TRANSACTIONS        TO PFE_SW_READ;
-- GRANT SELECT ON PFE_SW_MON.VW_ECOM_TRANSACTIONS       TO PFE_SW_READ;
-- GRANT SELECT ON PFE_SW_MON.VW_REVERSALS               TO PFE_SW_READ;
-- GRANT SELECT ON PFE_SW_MON.VW_HIGH_VALUE_TRANSACTIONS TO PFE_SW_READ;
-- GRANT SELECT ON PFE_SW_MON.VW_SETTLEMENT_DATA         TO PFE_SW_READ;
-- GRANT SELECT ON PFE_SW_MON.VW_INTRA_BANK_TRANSACTIONS TO PFE_SW_READ;
-- GRANT SELECT ON PFE_SW_MON.VW_INTERNATIONAL_TRANSACTIONS TO PFE_SW_READ;
-- GRANT SELECT ON PFE_SW_MON.VW_CHIP_EMV_TRANSACTIONS   TO PFE_SW_READ;
-- GRANT EXECUTE ON PFE_SW_MON.FN_MASK_PAN               TO PFE_SW_READ;


-- ============================================================================
-- SECTION 4 : VÉRIFICATION
-- Exécuter manuellement pour confirmer le masquage.
-- ============================================================================

-- SELECT FN_MASK_PAN('4000005327187750') FROM DUAL;
-- Résultat attendu : 400000XXXXXX7750

-- SELECT FN_MASK_PAN('4111111111111111') FROM DUAL;
-- Résultat attendu : 411111XXXXXX1111

-- SELECT FN_MASK_PAN(NULL) FROM DUAL;
-- Résultat attendu : NULL

-- SELECT card_number FROM VW_AUTHORIZATIONS WHERE ROWNUM <= 5;
-- Doit afficher : 400000XXXXXX7750  (jamais le PAN brut)


COMMIT;
