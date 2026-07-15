-- ============================================================================
-- Migration V3_0_3 : Vues d'Intelligence Analytique Monétique
-- Switch Monitoring - HPS PFE 2026
-- ----------------------------------------------------------------------------
-- Ces vues exploitent les 3 couches de complexité de AUTHO_ACTIVITY_ADM :
--   1. Complexité temporelle (gestion multinationale des fuseaux horaires)
--   2. Complexité financière (réconciliation multi-devise ISS/ACQ)
--   3. Intelligence EMV/Chip (analyse TVR, ATC, CVM pour la fraude)
-- ============================================================================

ALTER SESSION SET CONTAINER = FREEPDB1;
ALTER SESSION SET CURRENT_SCHEMA = PFE_SW_MON;
SET SQLBLANKLINES ON

-- ============================================================================
-- VUE 1 : Réconciliation Multi-Devise
-- Expose les 3 couches de devises avec calcul des écarts
-- ============================================================================
CREATE OR REPLACE VIEW VW_CURRENCY_RECONCILIATION AS
SELECT
    a.reference_number,
    a.internal_stan,
    a.external_stan,
    a.business_date,
    a.transaction_local_date,
    a.acquiring_country_code,
    a.issuing_bank,
    a.acquirer_bank,

    -- ── Couche 1 : Transaction ─────────────────────────────────────────────
    a.transaction_amount,
    a.transaction_currency,

    -- ── Couche 2 : Facturation (Billing / FX porteur) ─────────────────────
    a.billing_amount,
    a.billing_currency,
    a.conversion_rate,
    a.conversion_rate_date,

    -- ── Couche 3A : Settlement Émetteur ───────────────────────────────────
    a.iss_settlement_amount,
    a.iss_settlement_currency,
    a.iss_settlement_date,
    a.iss_conv_rate_settlement,
    a.iss_settlement_fee,

    -- ── Couche 3B : Settlement Acquéreur ──────────────────────────────────
    a.acq_settlement_amount,
    a.acq_settlement_currency,
    a.acq_settlement_date,
    a.acq_conv_rate_settlement,
    a.acq_settlement_fee,

    -- ── Frais totaux ──────────────────────────────────────────────────────
    NVL(a.transaction_fee, 0)
        + NVL(a.iss_settlement_fee, 0)
        + NVL(a.acq_settlement_fee, 0) AS total_fees,

    -- ── Indicateur de flux de change ──────────────────────────────────────
    CASE
        WHEN a.transaction_currency != a.billing_currency
         AND (a.billing_currency != a.iss_settlement_currency
           OR a.billing_currency != a.acq_settlement_currency)
        THEN 'MULTI_FX_COMPLEX'
        WHEN a.transaction_currency != a.billing_currency
        THEN 'CROSS_CURRENCY'
        WHEN a.billing_currency != NVL(a.iss_settlement_currency, a.billing_currency)
          OR a.billing_currency != NVL(a.acq_settlement_currency, a.billing_currency)
        THEN 'SETTLEMENT_FX'
        ELSE 'SAME_CURRENCY'
    END AS fx_type,

    -- ── Variance de taux appliqué (%) ─────────────────────────────────────
    -- Détecte si le montant facturé correspond au taux affiché
    CASE
        WHEN a.conversion_rate IS NOT NULL
         AND a.transaction_amount IS NOT NULL
         AND a.billing_amount IS NOT NULL
         AND a.billing_amount > 0
         AND a.transaction_currency != a.billing_currency
        THEN ROUND(
            ABS(a.billing_amount - (a.transaction_amount * a.conversion_rate))
            / a.billing_amount * 100, 4)
        ELSE 0
    END AS billing_rate_variance_pct,

    -- ── Flag anomalie taux (> 1% = suspect) ───────────────────────────────
    CASE
        WHEN a.conversion_rate IS NOT NULL
         AND a.transaction_amount IS NOT NULL
         AND a.billing_amount IS NOT NULL
         AND a.billing_amount > 0
         AND a.transaction_currency != a.billing_currency
         AND ABS(a.billing_amount - (a.transaction_amount * a.conversion_rate))
             / a.billing_amount > 0.01
        THEN 'RATE_ANOMALY'
        ELSE 'OK'
    END AS rate_status,

    -- ── Écart ISS vs ACQ settlement (même devise uniquement) ──────────────
    CASE
        WHEN a.iss_settlement_amount IS NOT NULL
         AND a.acq_settlement_amount IS NOT NULL
         AND a.iss_settlement_currency = a.acq_settlement_currency
        THEN ABS(a.iss_settlement_amount - a.acq_settlement_amount)
        ELSE NULL
    END AS iss_acq_gap,

    -- ── Statut de settlement ──────────────────────────────────────────────
    CASE
        WHEN a.iss_settlement_date IS NOT NULL
         AND a.acq_settlement_date IS NOT NULL
        THEN 'FULLY_SETTLED'
        WHEN a.iss_settlement_date IS NOT NULL
        THEN 'ISS_SETTLED_ACQ_PENDING'
        WHEN a.acq_settlement_date IS NOT NULL
        THEN 'ACQ_SETTLED_ISS_PENDING'
        ELSE 'PENDING'
    END AS settlement_status,

    -- ── Délai de settlement ISS (jours depuis business_date) ──────────────
    CASE
        WHEN a.iss_settlement_date IS NOT NULL AND a.business_date IS NOT NULL
        THEN a.iss_settlement_date - a.business_date
        WHEN a.business_date IS NOT NULL
        THEN TRUNC(SYSDATE) - a.business_date
        ELSE NULL
    END AS iss_settlement_delay_days,

    a.action_code,
    a.autho_flag,
    a.matching_status,
    a.date_create

FROM autho_activity_adm a
WHERE a.action_code = '000'
  AND a.transaction_amount > 0
/


-- ============================================================================
-- VUE 2 : Analyse Temporelle Multinationale
-- Latences et dérives timezone pour le monitoring SLA
-- ============================================================================
CREATE OR REPLACE VIEW VW_TEMPORAL_ANALYSIS AS
SELECT
    a.reference_number,
    a.internal_stan,
    a.business_date,
    a.acquiring_country_code,
    a.issuing_bank,
    a.acquirer_bank,
    a.action_code,

    -- ── Timestamps bruts ──────────────────────────────────────────────────
    a.transaction_local_date,
    a.transmission_date_and_time,
    a.response_date_and_time,
    a.internal_transmission_time,

    -- ── Latence de traitement en millisecondes ────────────────────────────
    CASE
        WHEN a.transmission_date_and_time IS NOT NULL
         AND a.response_date_and_time IS NOT NULL
        THEN ROUND(
            (a.response_date_and_time - a.transmission_date_and_time)
            * 24 * 60 * 60 * 1000, 0)
        ELSE NULL
    END AS processing_ms,

    -- ── Latence de traitement en secondes (arrondi) ───────────────────────
    CASE
        WHEN a.transmission_date_and_time IS NOT NULL
         AND a.response_date_and_time IS NOT NULL
        THEN ROUND(
            (a.response_date_and_time - a.transmission_date_and_time)
            * 24 * 60 * 60, 2)
        ELSE NULL
    END AS processing_seconds,

    -- ── Statut SLA (seuil standard monétique = 5 secondes) ────────────────
    CASE
        WHEN a.transmission_date_and_time IS NOT NULL
         AND a.response_date_and_time IS NOT NULL
         AND (a.response_date_and_time - a.transmission_date_and_time) * 86400 > 5
        THEN 'SLA_BREACHED'
        WHEN a.transmission_date_and_time IS NOT NULL
         AND a.response_date_and_time IS NOT NULL
        THEN 'SLA_OK'
        ELSE 'NO_DATA'
    END AS sla_status,

    -- ── Dérive heure locale vs transmission (minutes) ─────────────────────
    CASE
        WHEN a.transaction_local_date IS NOT NULL
         AND a.transmission_date_and_time IS NOT NULL
        THEN ABS(ROUND(
            (a.transmission_date_and_time - a.transaction_local_date)
            * 24 * 60, 0))
        ELSE NULL
    END AS drift_minutes,

    -- ── Classification de la dérive ───────────────────────────────────────
    CASE
        WHEN a.transaction_local_date IS NULL
          OR a.transmission_date_and_time IS NULL
        THEN 'NO_DATA'
        WHEN ABS((a.transmission_date_and_time - a.transaction_local_date)
             * 24 * 60) > 1440
        THEN 'DRIFT_CRITIQUE'
        WHEN ABS((a.transmission_date_and_time - a.transaction_local_date)
             * 24 * 60) > 180
        THEN 'DRIFT_ELEVE'
        WHEN ABS((a.transmission_date_and_time - a.transaction_local_date)
             * 24 * 60) > 60
        THEN 'DRIFT_MODERE'
        ELSE 'NORMAL'
    END AS drift_status,

    -- ── Latence réseau interne (transmission_date vs internal_transmission) ─
    CASE
        WHEN a.transmission_date_and_time IS NOT NULL
         AND a.internal_transmission_time IS NOT NULL
        THEN ROUND(
            (a.internal_transmission_time - a.transmission_date_and_time)
            * 24 * 60 * 60 * 1000, 0)
        ELSE NULL
    END AS network_latency_ms,

    a.card_acceptor_id,
    a.card_acc_name_address,
    a.transaction_amount,
    a.transaction_currency

FROM autho_activity_adm a
/


-- ============================================================================
-- VUE 3 : Intelligence EMV / Chip
-- Transactions avec données chip et indicateurs de risque TVR
-- ============================================================================
CREATE OR REPLACE VIEW VW_EMV_INTELLIGENCE AS
SELECT
    a.reference_number,
    a.internal_stan,
    a.business_date,
    a.transmission_date_and_time,
    a.acquiring_country_code,
    a.action_code,
    a.issuer_action_code,

    -- ── Données chip brutes ───────────────────────────────────────────────
    a.chip_application_cryptogram,
    a.chip_tvr,
    a.chip_aip,
    a.chip_cvm_results,
    a.chip_atc,
    a.chip_arpc_response_code,
    a.chip_issuer_script_result,
    a.chip_cryptogram_info_data,
    a.external_cvv_result_code,

    -- ── Type de cryptogramme (bits 7-6 du chip_cryptogram_info_data) ──────
    CASE SUBSTR(a.chip_cryptogram_info_data, 1, 1)
        WHEN '0' THEN 'AAC (Transaction refusée offline)'
        WHEN '4' THEN 'TC (Approuvée offline)'
        WHEN '8' THEN 'ARQC (Online requis)'
        ELSE 'Inconnu (' || a.chip_cryptogram_info_data || ')'
    END AS cryptogram_type,

    -- ── Flag TVR non clean (au moins 1 bit actif sur octet 1) ─────────────
    CASE
        WHEN a.chip_tvr IS NOT NULL
         AND SUBSTR(a.chip_tvr, 1, 2) != '00'
        THEN 'Y'
        ELSE 'N'
    END AS tvr_byte1_anomaly,

    -- ── Suspicion ATC bas (valeur hexadécimale 01-04) ─────────────────────
    CASE
        WHEN a.chip_atc IN ('0001','0002','0003','0004',
                             '001', '002', '003', '004',
                             '01',  '02',  '03',  '04')
        THEN 'Y'
        ELSE 'N'
    END AS atc_suspicious,

    -- ── CVV externe résultat ──────────────────────────────────────────────
    CASE a.external_cvv_result_code
        WHEN 'M' THEN 'CVV correct'
        WHEN 'N' THEN 'CVV INCORRECT - FRAUDE POSSIBLE'
        WHEN 'P' THEN 'Non traité'
        WHEN 'S' THEN 'CVV manquant'
        WHEN 'U' THEN 'Non certifié'
        ELSE 'Inconnu'
    END AS cvv_interpretation,

    -- ── Indicateur de risque global ───────────────────────────────────────
    CASE
        WHEN a.chip_atc IN ('0001','0002','0003','0004','001','002','003','004','01','02','03','04')
          OR a.external_cvv_result_code = 'N'
          OR (a.chip_tvr IS NOT NULL AND SUBSTR(a.chip_tvr, 1, 2) IN ('10','08','04','18','14','0C'))
        THEN 'HIGH'
        WHEN a.chip_tvr IS NOT NULL AND SUBSTR(a.chip_tvr, 1, 2) != '00'
        THEN 'MEDIUM'
        WHEN a.chip_application_cryptogram IS NOT NULL
        THEN 'LOW'
        ELSE 'UNKNOWN'
    END AS emv_risk_level,

    -- ── AID (Application Identifier) - identifie le réseau de la carte ───
    a.chip_appli_identifier,

    -- ── Informations complémentaires ──────────────────────────────────────
    a.card_number,
    a.card_type,
    a.transaction_amount,
    a.transaction_currency,
    a.pos_entry_mode,
    a.card_acceptor_id,
    a.card_acc_name_address

FROM autho_activity_adm a
WHERE a.chip_application_cryptogram IS NOT NULL
/


-- ============================================================================
-- VUE 4 : Dashboard KPIs Analytiques (par jour)
-- Agrégats quotidiens pour le tableau de bord MonetixAnalytics
-- ============================================================================
CREATE OR REPLACE VIEW VW_DAILY_ANALYTICS_KPI AS
SELECT
    a.business_date,
    COUNT(*) AS total_transactions,

    -- Volume et montants
    SUM(a.transaction_amount)  AS total_volume,
    AVG(a.transaction_amount)  AS avg_amount,
    MAX(a.transaction_amount)  AS max_amount,

    -- Approbations
    SUM(CASE WHEN a.action_code = '000' THEN 1 ELSE 0 END) AS approved_count,
    ROUND(SUM(CASE WHEN a.action_code = '000' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2)
        AS approval_rate_pct,

    -- Fraude
    SUM(CASE WHEN a.action_code IN ('102','129','181','182','183','188')
        THEN 1 ELSE 0 END) AS fraud_code_count,

    -- EMV / Chip
    SUM(CASE WHEN a.chip_application_cryptogram IS NOT NULL THEN 1 ELSE 0 END)
        AS chip_tx_count,
    ROUND(SUM(CASE WHEN a.chip_application_cryptogram IS NOT NULL THEN 1 ELSE 0 END)
        * 100.0 / COUNT(*), 2) AS chip_adoption_pct,

    -- Cross-devise
    SUM(CASE WHEN a.transaction_currency != a.billing_currency
             AND a.billing_currency IS NOT NULL
        THEN 1 ELSE 0 END) AS cross_currency_count,

    -- SLA (transactions avec latence > 5s)
    SUM(CASE
        WHEN a.transmission_date_and_time IS NOT NULL
         AND a.response_date_and_time IS NOT NULL
         AND (a.response_date_and_time - a.transmission_date_and_time) * 86400 > 5
        THEN 1 ELSE 0 END) AS sla_breach_count,

    -- Latence moyenne en ms
    ROUND(AVG(
        CASE WHEN a.transmission_date_and_time IS NOT NULL
              AND a.response_date_and_time IS NOT NULL
        THEN (a.response_date_and_time - a.transmission_date_and_time) * 86400000
        ELSE NULL END), 0) AS avg_latency_ms,

    -- Settlement en attente
    SUM(CASE WHEN a.action_code = '000'
             AND (a.iss_settlement_date IS NULL OR a.acq_settlement_date IS NULL)
        THEN 1 ELSE 0 END) AS pending_settlement_count,

    -- Reversals
    SUM(CASE WHEN a.reversal_flag = 'Y' OR a.reversal_stan IS NOT NULL
        THEN 1 ELSE 0 END) AS reversal_count,

    -- Canaux
    SUM(CASE WHEN a.pos_condition_code = '59' THEN 1 ELSE 0 END) AS ecom_count,
    SUM(CASE WHEN a.processing_code IN ('01','21') THEN 1 ELSE 0 END) AS atm_count

FROM autho_activity_adm a
GROUP BY a.business_date
ORDER BY a.business_date DESC
/


-- ============================================================================
-- VUE 5 : Surveillance Settlement ISS/ACQ en Retard
-- Transactions approuvées dont le settlement dépasse J+1
-- ============================================================================
CREATE OR REPLACE VIEW VW_SETTLEMENT_OVERDUE AS
SELECT
    a.reference_number,
    a.internal_stan,
    a.business_date,
    a.action_code,
    a.transaction_amount,
    a.transaction_currency,
    a.billing_amount,
    a.billing_currency,
    a.iss_settlement_amount,
    a.iss_settlement_currency,
    a.iss_settlement_date,
    a.acq_settlement_amount,
    a.acq_settlement_currency,
    a.acq_settlement_date,
    a.issuing_bank,
    a.acquirer_bank,
    a.acquiring_country_code,

    -- Délai ISS en jours
    CASE
        WHEN a.iss_settlement_date IS NOT NULL
        THEN a.iss_settlement_date - a.business_date
        ELSE TRUNC(SYSDATE) - a.business_date
    END AS iss_delay_days,

    -- Délai ACQ en jours
    CASE
        WHEN a.acq_settlement_date IS NOT NULL
        THEN a.acq_settlement_date - a.business_date
        ELSE TRUNC(SYSDATE) - a.business_date
    END AS acq_delay_days,

    -- Statut
    CASE
        WHEN a.iss_settlement_date IS NULL AND a.acq_settlement_date IS NULL
             AND TRUNC(SYSDATE) - a.business_date > 1
        THEN 'BOTH_OVERDUE'
        WHEN a.iss_settlement_date IS NULL
             AND TRUNC(SYSDATE) - a.business_date > 1
        THEN 'ISS_OVERDUE'
        WHEN a.acq_settlement_date IS NULL
             AND TRUNC(SYSDATE) - a.business_date > 1
        THEN 'ACQ_OVERDUE'
        ELSE 'ON_TIME_OR_SETTLED'
    END AS overdue_status

FROM autho_activity_adm a
WHERE a.action_code = '000'
  AND (a.iss_settlement_date IS NULL OR a.acq_settlement_date IS NULL)
  AND a.business_date < TRUNC(SYSDATE)
ORDER BY a.business_date ASC
/
