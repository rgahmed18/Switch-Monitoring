-- ============================================================================
--  SWITCH MONITORING ? INJECTION DATA (2 000 transactions)
--  Table cible : AUTHO_ACTIVITY_ADM
--  User Oracle  : PFE_SW_MON / XEPDB1
--
--  USAGE (SQL*Plus depuis PowerShell) :
--    sqlplus PFE_SW_MON/PFE_SW_MON_PWD@//localhost:1521/XEPDB1 "@F:\les versions codes\V5\switch-monotoring\backend\src\main\resources\db\seed\inject_data.sql"
--
--  CE QUE FAIT CE SCRIPT :
--    1. Purge toutes les donnees existantes dans AUTHO_ACTIVITY_ADM
--    2. Injecte 2 000 transactions realistes sur 30 jours glissants
--    3. Affiche le rapport de distribution final
--
--  DISTRIBUTION :
--    20 banques x 100 tx  (10 marocaines + 10 internationales)
--    Canal  : ATM 30% | POS 50% | E-Commerce 20%
--    Reseau : CMI 30% (ATM) | Visa ~42% | Mastercard ~28%
--    Statut : Approuve 65% | Refuse 30% | Reversal 5%
-- ============================================================================

ALTER SESSION SET CONTAINER = FREEPDB1;
ALTER SESSION SET CURRENT_SCHEMA = PFE_SW_MON;

SET SERVEROUTPUT ON SIZE UNLIMITED
SET FEEDBACK    OFF
SET VERIFY      OFF
SET ECHO        OFF
SET TIMING      ON
SET DEFINE      OFF
SET SQLBLANKLINES ON

PROMPT ============================================================
PROMPT   ETAPE 1/3 : Purge de la table AUTHO_ACTIVITY_ADM
PROMPT ============================================================

DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM AUTHO_ACTIVITY_ADM;
  DBMS_OUTPUT.PUT_LINE('  Lignes existantes : ' || v_count || ' -> suppression...');
  DELETE FROM AUTHO_ACTIVITY_ADM;
  COMMIT;
  DBMS_OUTPUT.PUT_LINE('  Purge OK. Table vide.');
END;
/

PROMPT
PROMPT ============================================================
PROMPT   ETAPE 2/3 : Injection de 2 000 transactions
PROMPT ============================================================

DECLARE

  C_TOTAL       CONSTANT PLS_INTEGER := 2000;
  C_COMMIT_SIZE CONSTANT PLS_INTEGER := 500;
  C_OFFSET      CONSTANT PLS_INTEGER := 99000000;

  v_i           PLS_INTEGER;
  v_ref_num     CHAR(12);
  v_int_stan    CHAR(6);
  v_ext_stan    CHAR(6);
  v_rout_code   CHAR(6);
  v_cap_code    CHAR(6);
  v_channel     VARCHAR2(4);
  v_pos_cond    CHAR(2);
  v_entry_mode  VARCHAR2(4);
  v_proc_code   CHAR(2);
  v_mcc         CHAR(4);
  v_term_id     VARCHAR2(15);
  v_acc_id      VARCHAR2(15);
  v_merchant    VARCHAR2(40);
  v_mti         CHAR(4);
  v_func_code   CHAR(3);
  v_action      CHAR(3);
  v_orig_action CHAR(3);
  v_autho_flag  CHAR(1);
  v_rev_flag    CHAR(1);
  v_reject_code VARCHAR2(4);
  v_reject_rsn  VARCHAR2(40);
  v_amount      NUMBER(18,3);
  v_currency    CHAR(3);
  v_country     CHAR(3);
  v_settle_amt  NUMBER(18,3);
  v_settle_date DATE;
  v_issuer      VARCHAR2(6);
  v_acquirer    VARCHAR2(6);
  v_network     VARCHAR2(4);
  v_net_code    CHAR(2);
  v_prod_code   VARCHAR2(3);
  v_card_num    VARCHAR2(22);
  v_hour        PLS_INTEGER;
  v_minute      PLS_INTEGER;
  v_second      PLS_INTEGER;
  v_biz_date    DATE;
  v_tx_date     DATE;
  v_resp_date   DATE;
  v_latency_ms  NUMBER(10);
  v_sec_level   VARCHAR2(32);
  v_sec_result  VARCHAR2(32);
  v_chip_crypt  VARCHAR2(16);
  v_chip_tvr    VARCHAR2(10);
  v_chip_aip    VARCHAR2(4);
  v_chip_atc    VARCHAR2(4);
  v_auth_code   CHAR(6);
  v_auth_id     VARCHAR2(32);
  v_tx_id       VARCHAR2(32);
  v_rev_stan    CHAR(6);
  v_rev_date    DATE;

  -- Compteurs rapport
  v_count_atm   PLS_INTEGER := 0;
  v_count_pos   PLS_INTEGER := 0;
  v_count_ecom  PLS_INTEGER := 0;
  v_count_ok    PLS_INTEGER := 0;
  v_count_ko    PLS_INTEGER := 0;
  v_count_rev   PLS_INTEGER := 0;

  TYPE t_bank  IS TABLE OF VARCHAR2(6)  INDEX BY PLS_INTEGER;
  TYPE t_pan   IS TABLE OF VARCHAR2(22) INDEX BY PLS_INTEGER;
  TYPE t_merch IS TABLE OF VARCHAR2(40) INDEX BY PLS_INTEGER;
  TYPE t_mcc   IS TABLE OF CHAR(4)      INDEX BY PLS_INTEGER;

  -- 20 banques : 10 marocaines (0-9) + 10 internationales (10-19)
  -- Codes alignes avec bank-project-store.service.ts Angular
  v_banks      t_bank;
  v_pans       t_pan;
  v_pans_visa  t_pan;
  v_pans_mc    t_pan;
  v_merch_atm  t_merch;
  v_merch_pos  t_merch;
  v_merch_ecm  t_merch;
  v_mcc_pos    t_mcc;
  v_mcc_ecm    t_mcc;

  FUNCTION get_hour(p_pos IN PLS_INTEGER) RETURN PLS_INTEGER IS
    TYPE t_w IS TABLE OF PLS_INTEGER INDEX BY PLS_INTEGER;
    v_w  t_w;
    v_c  PLS_INTEGER := 0;
  BEGIN
    v_w(0):=1;  v_w(1):=1;  v_w(2):=0;  v_w(3):=0;  v_w(4):=1;
    v_w(5):=2;  v_w(6):=3;  v_w(7):=7;  v_w(8):=9;  v_w(9):=10;
    v_w(10):=8; v_w(11):=6; v_w(12):=5; v_w(13):=7; v_w(14):=7;
    v_w(15):=6; v_w(16):=6; v_w(17):=8; v_w(18):=7; v_w(19):=5;
    v_w(20):=3; v_w(21):=2; v_w(22):=1; v_w(23):=1;
    FOR h IN 0..23 LOOP
      v_c := v_c + v_w(h);
      IF p_pos < v_c THEN RETURN h; END IF;
    END LOOP;
    RETURN 23;
  END;

BEGIN

  -- ?? 20 banques (codes exacts du store Angular + base Oracle) ?????????????
  -- Maroc
  v_banks(0)  := 'AWB';    -- Attijariwafa Bank
  v_banks(1)  := 'BCP';    -- Banque Centrale Populaire
  v_banks(2)  := 'BMCE';   -- BMCE Bank
  v_banks(3)  := 'CIH';    -- CIH Bank
  v_banks(4)  := 'BPM';    -- Banque Populaire du Maroc
  v_banks(5)  := 'CDM';    -- Credit du Maroc
  v_banks(6)  := 'SGM';    -- Societe Generale Maroc
  v_banks(7)  := 'BOA';    -- Bank of Africa
  v_banks(8)  := 'CAGM';   -- Credit Agricole Maroc
  v_banks(9)  := 'BCM';    -- Banque Centrale du Maroc
  -- International
  v_banks(10) := 'BIAT';   -- Banque Internationale Arabe de Tunisie
  v_banks(11) := 'STDB';   -- Standard Bank
  v_banks(12) := 'BNP';    -- BNP Paribas
  v_banks(13) := 'HSBC';   -- HSBC
  v_banks(14) := 'JPMCH';  -- JPMorgan Chase
  v_banks(15) := 'ICBC';   -- ICBC
  v_banks(16) := 'MUFG';   -- MUFG Tokyo
  v_banks(17) := 'SNBSA';  -- Saudi National Bank
  v_banks(18) := 'FAB';    -- First Abu Dhabi Bank
  v_banks(19) := 'ZENTH';  -- Zenith Bank

  -- ?? PANs ATM/GAB (reseau CMI) ????????????????????????????????????????????
  v_pans(0) := '400000XXXXXX7750'; v_pans(1) := '411111XXXXXX1111';
  v_pans(2) := '510000XXXXXX0022'; v_pans(3) := '455600XXXXXX3456';
  v_pans(4) := '484400XXXXXX8840'; v_pans(5) := '520000XXXXXX5599';
  v_pans(6) := '412345XXXXXX6789'; v_pans(7) := '540000XXXXXX0011';
  v_pans(8) := '435678XXXXXX9000'; v_pans(9) := '490000XXXXXX1234';

  -- ?? PANs Visa BIN 4xxx ???????????????????????????????????????????????????
  v_pans_visa(0):='400000XXXXXX1001'; v_pans_visa(1):='411111XXXXXX2002';
  v_pans_visa(2):='423456XXXXXX3003'; v_pans_visa(3):='435678XXXXXX4004';
  v_pans_visa(4):='447890XXXXXX5005'; v_pans_visa(5):='455600XXXXXX6006';
  v_pans_visa(6):='462000XXXXXX7007'; v_pans_visa(7):='476400XXXXXX8008';
  v_pans_visa(8):='484400XXXXXX9009'; v_pans_visa(9):='490000XXXXXX0010';

  -- ?? PANs Mastercard BIN 5xxx ?????????????????????????????????????????????
  v_pans_mc(0):='510000XXXXXX1001'; v_pans_mc(1):='520000XXXXXX2002';
  v_pans_mc(2):='526100XXXXXX3003'; v_pans_mc(3):='531000XXXXXX4004';
  v_pans_mc(4):='535678XXXXXX5005'; v_pans_mc(5):='540000XXXXXX6006';
  v_pans_mc(6):='543210XXXXXX7007'; v_pans_mc(7):='551234XXXXXX8008';
  v_pans_mc(8):='555555XXXXXX9009'; v_pans_mc(9):='559000XXXXXX0010';

  -- ?? Marchands ATM (1 par banque) ?????????????????????????????????????????
  v_merch_atm(0) :='Retrait GAB AWB CASABLANCA';
  v_merch_atm(1) :='Retrait GAB BCP RABAT';
  v_merch_atm(2) :='Retrait GAB BMCE FES';
  v_merch_atm(3) :='Retrait GAB CIH MARRAKECH';
  v_merch_atm(4) :='Retrait GAB BPM TANGER';
  v_merch_atm(5) :='Retrait GAB CDM AGADIR';
  v_merch_atm(6) :='Retrait GAB SGM MEKNES';
  v_merch_atm(7) :='Retrait GAB BOA OUJDA';
  v_merch_atm(8) :='Retrait GAB CAGM KENITRA';
  v_merch_atm(9) :='Retrait GAB BCM SALE';
  v_merch_atm(10):='Retrait ATM BIAT TUNIS';
  v_merch_atm(11):='Retrait ATM STDB JOHANNESBURG';
  v_merch_atm(12):='Retrait ATM BNP PARIS OPERA';
  v_merch_atm(13):='Retrait ATM HSBC LONDON';
  v_merch_atm(14):='Retrait ATM JPMCH NEW YORK';
  v_merch_atm(15):='Retrait ATM ICBC BEIJING';
  v_merch_atm(16):='Retrait ATM MUFG TOKYO';
  v_merch_atm(17):='Retrait ATM SNBSA RIYADH';
  v_merch_atm(18):='Retrait ATM FAB ABU DHABI';
  v_merch_atm(19):='Retrait ATM ZENTH LAGOS';

  -- ?? Marchands POS ????????????????????????????????????????????????????????
  v_merch_pos(0):='MARJANE ANFA CASABLANCA';
  v_merch_pos(1):='CARREFOUR MAARIF CASABLANCA';
  v_merch_pos(2):='STATION TOTAL RABAT';
  v_merch_pos(3):='PHARMACIE ATLAS CASABLANCA';
  v_merch_pos(4):='RESTAURANT RIAD FES';
  v_merch_pos(5):='HOTEL KENZI TOWER CASABLANCA';
  v_merch_pos(6):='LABEL VIE AIN DIAB';
  v_merch_pos(7):='CLINIQUE IBN SINA RABAT';
  v_merch_pos(8):='ZARA MAROC CASABLANCA';
  v_merch_pos(9):='FNAC MAROC ANFA PLACE';

  -- ?? Marchands E-Commerce ?????????????????????????????????????????????????
  v_merch_ecm(0):='JUMIA MAROC ECOM';
  v_merch_ecm(1):='AMAZON.FR ECOM';
  v_merch_ecm(2):='BOOKING.COM ECOM';
  v_merch_ecm(3):='PAYPAL ECOM PAYMENT';
  v_merch_ecm(4):='ALIEXPRESS ECOM';
  v_merch_ecm(5):='AIR ARABIA ECOM TICKET';
  v_merch_ecm(6):='NETFLIX ECOM STREAMING';
  v_merch_ecm(7):='SPOTIFY ECOM PREMIUM';
  v_merch_ecm(8):='AVITO MAROC ECOM';
  v_merch_ecm(9):='MARJANE ONLINE ECOM';

  -- ?? MCC POS ??????????????????????????????????????????????????????????????
  v_mcc_pos(0):='5411'; v_mcc_pos(1):='5541'; v_mcc_pos(2):='5812';
  v_mcc_pos(3):='5912'; v_mcc_pos(4):='4111'; v_mcc_pos(5):='7011';
  v_mcc_pos(6):='5651'; v_mcc_pos(7):='5311'; v_mcc_pos(8):='8049';
  v_mcc_pos(9):='5732';

  -- ?? MCC E-Commerce ???????????????????????????????????????????????????????
  v_mcc_ecm(0):='5999'; v_mcc_ecm(1):='7372'; v_mcc_ecm(2):='5045';
  v_mcc_ecm(3):='5961'; v_mcc_ecm(4):='4816'; v_mcc_ecm(5):='7011';
  v_mcc_ecm(6):='5734'; v_mcc_ecm(7):='7922'; v_mcc_ecm(8):='4722';
  v_mcc_ecm(9):='5815';

  -- =========================================================================
  --  BOUCLE PRINCIPALE
  -- =========================================================================
  FOR v_i IN 1..C_TOTAL LOOP

    -- Cles primaires uniques
    v_ref_num  := LPAD(TO_CHAR(C_OFFSET + v_i), 12, '0');
    v_int_stan := LPAD(TO_CHAR(MOD(C_OFFSET + v_i - 1, 999999) + 1), 6, '0');
    v_ext_stan := LPAD(TO_CHAR(MOD(C_OFFSET + v_i,     999998) + 2), 6, '0');
    v_rout_code:= LPAD(TO_CHAR(MOD(v_i - 1, 200) + 1), 6, '0');
    v_cap_code := LPAD(TO_CHAR(MOD(v_i - 1, 100) + 1), 6, '0');
    v_auth_id  := LPAD(TO_CHAR(C_OFFSET + v_i), 32, '0');
    v_tx_id    := 'TXN' || LPAD(TO_CHAR(C_OFFSET + v_i), 29, '0');

    -- Banque emetteur et acquereur (20 banques x 100 tx = 2000 total)
    -- issuer et acquirer differents pour simuler les transactions inter-bancaires
    v_issuer   := v_banks(MOD(v_i,     20));
    v_acquirer := v_banks(MOD(v_i + 7, 20));

    -- Reseau + PAN
    IF MOD(v_i, 10) < 3 THEN
      v_network  := 'CMI '; v_net_code := '03'; v_prod_code := 'CMI';
      v_card_num := v_pans(MOD(v_i, 10));
    ELSIF MOD(v_i, 5) < 3 THEN
      v_network  := 'VISA'; v_net_code := '01'; v_prod_code := 'VIS';
      v_card_num := v_pans_visa(MOD(v_i, 10));
    ELSE
      v_network  := 'MC  '; v_net_code := '02'; v_prod_code := 'MSC';
      v_card_num := v_pans_mc(MOD(v_i, 10));
    END IF;

    -- Canal + mode d'entree
    IF MOD(v_i, 10) < 3 THEN
      -- ATM/GAB 30% ? saisie PIN clavier (01)
      v_channel   := 'ATM';  v_pos_cond := '01'; v_entry_mode := '01';
      v_proc_code := '01';   v_mcc := '6011';
      v_term_id   := 'GAB' || LPAD(TO_CHAR(MOD(v_i, 99)+1), 5, '0') || SUBSTR(v_issuer, 1, 3);
      v_acc_id    := 'ATM' || LPAD(TO_CHAR(MOD(v_i, 500)+100), 5, '0');
      v_merchant  := v_merch_atm(MOD(v_i, 20));
      v_count_atm := v_count_atm + 1;
    ELSIF MOD(v_i, 10) < 8 THEN
      -- POS 50% ? 4 modes d'entree realistes
      v_channel   := 'POS'; v_pos_cond := '00'; v_proc_code := '00';
      IF    MOD(v_i, 9)  = 0 THEN v_entry_mode := '01'; -- Manuel 11%
      ELSIF MOD(v_i, 11) = 0 THEN v_entry_mode := '02'; v_pos_cond := '90'; -- Bande 9%
      ELSIF MOD(v_i, 10) IN (5,6) THEN v_entry_mode := '07'; -- NFC 20%
      ELSE                              v_entry_mode := '05'; -- EMV 60%
      END IF;
      v_mcc      := v_mcc_pos(MOD(v_i, 10));
      v_term_id  := 'POS' || LPAD(TO_CHAR(MOD(v_i, 999)+1), 5, '0');
      v_acc_id   := 'MRC' || LPAD(TO_CHAR(MOD(v_i, 9999)+1000), 4, '0');
      v_merchant := v_merch_pos(MOD(v_i, 10));
      v_count_pos := v_count_pos + 1;
    ELSE
      -- E-Commerce 20% ? saisie web (81)
      v_channel    := 'ECM'; v_pos_cond := '59'; v_entry_mode := '81';
      v_proc_code  := '00';  v_mcc := v_mcc_ecm(MOD(v_i, 10));
      v_term_id    := NULL;
      v_acc_id     := 'ECM' || LPAD(TO_CHAR(MOD(v_i, 999)+1), 4, '0');
      v_merchant   := v_merch_ecm(MOD(v_i, 10));
      v_count_ecom := v_count_ecom + 1;
    END IF;

    -- MTI + Reversal (5%)
    IF MOD(v_i, 20) = 0 THEN
      v_mti := '1420'; v_func_code := '400'; v_rev_flag := 'Y';
      v_rev_stan := LPAD(TO_CHAR(MOD(C_OFFSET+v_i-20,999999)+1),6,'0');
      v_rev_date := TRUNC(SYSDATE) - MOD(v_i, 29);
      v_orig_action := '000'; v_count_rev := v_count_rev + 1;
    ELSIF v_channel = 'ECM' THEN
      v_mti := '1100'; v_func_code := '100';
      v_rev_flag := 'N'; v_rev_stan := NULL; v_rev_date := NULL; v_orig_action := NULL;
    ELSE
      v_mti := '1200'; v_func_code := '200';
      v_rev_flag := 'N'; v_rev_stan := NULL; v_rev_date := NULL; v_orig_action := NULL;
    END IF;

    -- Code action / statut
    DECLARE v_mod100 PLS_INTEGER := MOD(v_i, 100); BEGIN
      IF    MOD(v_i, 20) = 0 OR v_mod100 < 65 THEN
        v_action:='000'; v_autho_flag:='Y'; v_reject_code:=NULL; v_reject_rsn:=NULL;
        v_count_ok := v_count_ok + 1;
      ELSIF v_mod100 < 75 THEN
        v_action:='051'; v_autho_flag:='N'; v_reject_code:='51'; v_reject_rsn:='Provision insuffisante';
        v_count_ko := v_count_ko + 1;
      ELSIF v_mod100 < 82 THEN
        v_action:='055'; v_autho_flag:='N'; v_reject_code:='55'; v_reject_rsn:='Code PIN incorrect';
        v_count_ko := v_count_ko + 1;
      ELSIF v_mod100 < 87 THEN
        v_action:='054'; v_autho_flag:='N'; v_reject_code:='54'; v_reject_rsn:='Carte expiree';
        v_count_ko := v_count_ko + 1;
      ELSIF v_mod100 < 92 THEN
        v_action:='005'; v_autho_flag:='N'; v_reject_code:='05'; v_reject_rsn:='Transaction non honoree';
        v_count_ko := v_count_ko + 1;
      ELSIF v_mod100 < 96 THEN
        v_action:='091'; v_autho_flag:='N'; v_reject_code:='91'; v_reject_rsn:='Emetteur inaccessible';
        v_count_ko := v_count_ko + 1;
      ELSIF v_mod100 < 99 THEN
        v_action:='014'; v_autho_flag:='N'; v_reject_code:='14'; v_reject_rsn:='Numero de carte invalide';
        v_count_ko := v_count_ko + 1;
      ELSE
        v_action:='096'; v_autho_flag:='N'; v_reject_code:='96'; v_reject_rsn:='Mauvais fonctionnement systeme';
        v_count_ko := v_count_ko + 1;
      END IF;
    END;

    -- Montants
    IF    MOD(v_i, 50) = 0   THEN v_amount := ROUND(DBMS_RANDOM.VALUE(5001, 45000), 3);
    ELSIF v_channel = 'ATM'  THEN v_amount := ROUND(DBMS_RANDOM.VALUE(200,  4000),  3);
    ELSIF v_channel = 'ECM'  THEN v_amount := ROUND(DBMS_RANDOM.VALUE(50,   8000),  3);
    ELSE                           v_amount := ROUND(DBMS_RANDOM.VALUE(20,   3000),  3);
    END IF;

    -- Devise / pays
    IF MOD(v_i, 8) = 0 THEN
      v_country  := CASE MOD(v_i,4) WHEN 0 THEN '250' WHEN 1 THEN '826' WHEN 2 THEN '840' ELSE '788' END;
      v_currency := CASE v_country WHEN '250' THEN 'EUR' WHEN '826' THEN 'GBP' WHEN '840' THEN 'USD' ELSE 'TND' END;
    ELSE
      v_country := '504'; v_currency := 'MAD';
    END IF;

    -- Timestamp (courbe charge bancaire marocaine sur 30 jours)
    v_biz_date := TRUNC(SYSDATE) - MOD(v_i, 30);
    v_hour     := get_hour(MOD(v_i, 100));
    v_minute   := MOD(v_i + MOD(v_i, 30) * 7, 60);
    v_second   := MOD(v_i * 13 + MOD(v_i, 30) * 7, 60);
    v_tx_date  := v_biz_date + (v_hour/24) + (v_minute/1440) + (v_second/86400);

    -- Latence
    IF    v_action IN ('091','096') THEN v_latency_ms := 8000 + MOD(v_i, 17000);
    ELSIF v_action = '000'          THEN v_latency_ms := 80   + MOD(v_i, 520);
    ELSE                                  v_latency_ms := 200  + MOD(v_i, 1300);
    END IF;
    v_resp_date := v_tx_date + (v_latency_ms / 86400000);

    -- Reglement
    IF v_action = '000' THEN
      v_settle_amt := v_amount; v_settle_date := v_biz_date + 1;
    ELSE
      v_settle_amt := NULL;     v_settle_date := NULL;
    END IF;

    -- Code autorisation
    v_auth_code := CASE WHEN v_action='000' THEN LPAD(TO_CHAR(MOD(C_OFFSET+v_i,999999)+1),6,'0') ELSE NULL END;

    -- Securite EMV / 3DS
    IF v_channel = 'ECM' THEN
      v_sec_level := '3DS';
      v_sec_result := CASE WHEN v_autho_flag='Y' THEN 'VERIFIED' ELSE 'FAILED' END;
      v_chip_crypt:=NULL; v_chip_tvr:=NULL; v_chip_aip:=NULL; v_chip_atc:=NULL;
    ELSIF v_entry_mode IN ('05','07') THEN
      v_sec_level := 'EMV';
      v_sec_result := CASE WHEN v_autho_flag='Y' THEN 'OK' ELSE 'DECLINED' END;
      v_chip_crypt := LPAD(TO_CHAR(v_i+10000000),16,'0');
      v_chip_tvr   := LPAD(TO_CHAR(v_i+1000000), 10,'0');
      v_chip_aip   := LPAD(TO_CHAR(MOD(v_i,10000)),4,'0');
      v_chip_atc   := LPAD(TO_CHAR(MOD(v_i,9999)+1),4,'0');
    ELSE
      v_sec_level:=NULL; v_sec_result:=NULL;
      v_chip_crypt:=NULL; v_chip_tvr:=NULL; v_chip_aip:=NULL; v_chip_atc:=NULL;
    END IF;

    -- INSERT
    INSERT INTO AUTHO_ACTIVITY_ADM (
      reference_number, internal_stan, external_stan, routing_code, capture_code,
      message_type, function_code, processing_code, action_code, original_action_code,
      autho_flag, reversal_flag, transaction_flag,
      reversal_stan, reversal_transaction_date,
      issuing_bank, acquirer_bank, forwarding_bank,
      card_number,
      transaction_amount, transaction_currency,
      billing_amount, billing_currency, conversion_rate,
      iss_settlement_amount, iss_settlement_currency, iss_settlement_date,
      acq_settlement_amount, acq_settlement_currency, acq_settlement_date,
      acquiring_country_code,
      transmission_date_and_time, response_date_and_time,
      transaction_local_date, business_date, date_create,
      card_acceptor_term_id, card_acceptor_id, card_acc_name_address, card_acceptor_activity,
      pos_condition_code, pos_entry_mode,
      reject_code, reject_reason,
      authorization_code, authorization_id, transaction_id,
      network_code, network_id, product_code,
      security_verif_level, security_verif_result,
      chip_application_cryptogram, chip_tvr, chip_aip, chip_atc,
      user_create
    ) VALUES (
      v_ref_num, v_int_stan, v_ext_stan, v_rout_code, v_cap_code,
      v_mti, v_func_code, v_proc_code, v_action, v_orig_action,
      v_autho_flag, v_rev_flag, 'Y',
      v_rev_stan, v_rev_date,
      v_issuer, v_acquirer, v_acquirer,
      v_card_num,
      v_amount, v_currency,
      v_amount, v_currency, 1.000000,
      v_settle_amt, v_currency, v_settle_date,
      v_settle_amt, v_currency, v_settle_date,
      v_country,
      v_tx_date, v_resp_date,
      v_tx_date, v_biz_date, SYSDATE,
      v_term_id, v_acc_id, v_merchant, v_mcc,
      v_pos_cond, v_entry_mode,
      v_reject_code, v_reject_rsn,
      v_auth_code, v_auth_id, v_tx_id,
      v_net_code, v_network, v_prod_code,
      v_sec_level, v_sec_result,
      v_chip_crypt, v_chip_tvr, v_chip_aip, v_chip_atc,
      'DATA_2000'
    );

    IF MOD(v_i, C_COMMIT_SIZE) = 0 THEN
      COMMIT;
      DBMS_OUTPUT.PUT_LINE('  [' || LPAD(TO_CHAR(v_i),5) || '/2000]  '
        || ROUND(v_i/C_TOTAL*100) || '% - ' || TO_CHAR(SYSDATE,'HH24:MI:SS'));
    END IF;

  END LOOP;
  COMMIT;

  DBMS_OUTPUT.PUT_LINE('');
  DBMS_OUTPUT.PUT_LINE('============================================================');
  DBMS_OUTPUT.PUT_LINE('  RAPPORT INJECTION DATA_2000');
  DBMS_OUTPUT.PUT_LINE('------------------------------------------------------------');
  DBMS_OUTPUT.PUT_LINE('  Total insere   : 2 000');
  DBMS_OUTPUT.PUT_LINE('  Canal ATM/GAB  : ' || v_count_atm  || '  (30%)');
  DBMS_OUTPUT.PUT_LINE('  Canal POS      : ' || v_count_pos  || '  (50%)');
  DBMS_OUTPUT.PUT_LINE('  Canal E-COM    : ' || v_count_ecom || '  (20%)');
  DBMS_OUTPUT.PUT_LINE('  Approuvees     : ' || v_count_ok   || '  (65%)');
  DBMS_OUTPUT.PUT_LINE('  Refusees       : ' || v_count_ko   || '  (30%)');
  DBMS_OUTPUT.PUT_LINE('  Reversals      : ' || v_count_rev  || '  (5%)');
  DBMS_OUTPUT.PUT_LINE('------------------------------------------------------------');
  DBMS_OUTPUT.PUT_LINE('  20 banques x 100 tx : AWB BCP BMCE CIH BPM CDM SGM');
  DBMS_OUTPUT.PUT_LINE('    BOA CAGM BCM BIAT STDB BNP HSBC JPMCH');
  DBMS_OUTPUT.PUT_LINE('    ICBC MUFG SNBSA FAB ZENTH');
  DBMS_OUTPUT.PUT_LINE('============================================================');

EXCEPTION
  WHEN DUP_VAL_ON_INDEX THEN
    ROLLBACK;
    DBMS_OUTPUT.PUT_LINE('[ERREUR] Cle primaire dupliquee - table non vide.');
    DBMS_OUTPUT.PUT_LINE('  -> Relancer le script (la purge est refaite automatiquement).');
    RAISE;
  WHEN OTHERS THEN
    ROLLBACK;
    DBMS_OUTPUT.PUT_LINE('[ERREUR] ' || SQLERRM);
    RAISE;
END;
/

PROMPT
PROMPT ============================================================
PROMPT   ETAPE 3/3 : Verification distribution par banque
PROMPT ============================================================

PROMPT ACQUEREURS :
SELECT TRIM(acquirer_bank) BANQUE, COUNT(*) NB_TX FROM AUTHO_ACTIVITY_ADM WHERE user_create='DATA_2000' GROUP BY TRIM(acquirer_bank) ORDER BY NB_TX DESC;

PROMPT EMETTEURS :
SELECT TRIM(issuing_bank) BANQUE, COUNT(*) NB_TX FROM AUTHO_ACTIVITY_ADM WHERE user_create='DATA_2000' GROUP BY TRIM(issuing_bank) ORDER BY NB_TX DESC;

PROMPT TOTAL EN BASE :
SELECT COUNT(*) TOTAL FROM AUTHO_ACTIVITY_ADM;

PROMPT
PROMPT ============================================================
PROMPT   OK - Redemarrer Spring Boot puis Ctrl+Shift+R navigateur
PROMPT ============================================================

EXIT;