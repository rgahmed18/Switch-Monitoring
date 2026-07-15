-- ============================================================================
-- V3_0_1: CREATE INDEXES FOR AUTHO_ACTIVITY_ADM
-- Enterprise Standard Indexes from Manager
-- ============================================================================

ALTER SESSION SET CONTAINER = FREEPDB1;
ALTER SESSION SET CURRENT_SCHEMA = PFE_SW_MON;
SET SQLBLANKLINES ON

CREATE INDEX idx_autho_activity_adm_13 ON autho_activity_adm
  (
    reference_number                ASC,
    transaction_local_date          ASC,
    SUBSTR("MESSAGE_TYPE",1,2) ASC
  )
  PCTFREE     10
  INITRANS    2
  MAXTRANS    255
  TABLESPACE  powercard_index_fe_part01
  STORAGE   (
    INITIAL     131072
    NEXT        131072
    PCTINCREASE 0
    MINEXTENTS  1
    MAXEXTENTS  2147483645
  )
NOPARALLEL
LOGGING;

CREATE INDEX id_autho_activity_adm_01 ON autho_activity_adm
  (
    card_number                     ASC
  )
  PCTFREE     10
  INITRANS    2
  MAXTRANS    255
  TABLESPACE  powercard_index_fe_part01
  STORAGE   (
    INITIAL     131072
    NEXT        131072
    PCTINCREASE 0
    MINEXTENTS  1
    MAXEXTENTS  2147483645
  )
NOPARALLEL
LOGGING;

CREATE INDEX id_autho_activity_adm_02 ON autho_activity_adm
  (
    transmission_date_and_time      ASC
  )
  PCTFREE     10
  INITRANS    2
  MAXTRANS    255
  TABLESPACE  powercard_index_fe_part01
  STORAGE   (
    INITIAL     131072
    NEXT        131072
    PCTINCREASE 0
    MINEXTENTS  1
    MAXEXTENTS  2147483645
  )
NOPARALLEL
LOGGING;

CREATE INDEX id_autho_activity_adm_04 ON autho_activity_adm
  (
    transaction_local_date          ASC
  )
  PCTFREE     10
  INITRANS    2
  MAXTRANS    255
  TABLESPACE  powercard_index_fe_part01
  STORAGE   (
    INITIAL     131072
    NEXT        131072
    PCTINCREASE 0
    MINEXTENTS  1
    MAXEXTENTS  2147483645
  )
NOPARALLEL
LOGGING;

CREATE INDEX id_autho_activity_adm_05 ON autho_activity_adm
  (
    internal_transmission_time      ASC
  )
  PCTFREE     10
  INITRANS    2
  MAXTRANS    255
  TABLESPACE  powercard_index_fe_part02
  STORAGE   (
    INITIAL     131072
    NEXT        131072
    PCTINCREASE 0
    MINEXTENTS  1
    MAXEXTENTS  2147483645
  )
NOPARALLEL
LOGGING;

CREATE INDEX id_autho_activity_adm_06 ON autho_activity_adm
  (
    business_date                   ASC,
    card_acceptor_activity          ASC
  )
  PCTFREE     10
  INITRANS    2
  MAXTRANS    255
  TABLESPACE  powercard_index_fe_part01
  STORAGE   (
    INITIAL     131072
    NEXT        131072
    PCTINCREASE 0
    MINEXTENTS  1
    MAXEXTENTS  2147483645
  )
NOPARALLEL
LOGGING;

CREATE INDEX id_autho_activity_adm_07 ON autho_activity_adm
  (
    card_acceptor_id                ASC,
    transaction_local_date          ASC
  )
  PCTFREE     10
  INITRANS    2
  MAXTRANS    255
  TABLESPACE  powercard_index_fe_part02
  STORAGE   (
    INITIAL     131072
    NEXT        131072
    PCTINCREASE 0
    MINEXTENTS  1
    MAXEXTENTS  2147483645
  )
NOPARALLEL
LOGGING;

CREATE INDEX id_autho_activity_adm_08 ON autho_activity_adm
  (
    business_date                   ASC,
    card_acceptor_id                ASC,
    card_number                     ASC
  )
  PCTFREE     10
  INITRANS    2
  MAXTRANS    255
  TABLESPACE  powercard_index_fe_part01
  STORAGE   (
    INITIAL     131072
    NEXT        131072
    PCTINCREASE 0
    MINEXTENTS  1
    MAXEXTENTS  2147483645
  )
NOPARALLEL
LOGGING;

CREATE INDEX id_autho_activity_adm_09 ON autho_activity_adm
  (
    business_date                   ASC,
    card_number                     ASC
  )
  PCTFREE     10
  INITRANS    2
  MAXTRANS    255
  TABLESPACE  powercard_index_fe_part01
  STORAGE   (
    INITIAL     131072
    NEXT        131072
    PCTINCREASE 0
    MINEXTENTS  1
    MAXEXTENTS  2147483645
  )
NOPARALLEL
LOGGING;

CREATE INDEX id_autho_activity_adm_10 ON autho_activity_adm
  (
    cps_transaction_id              ASC
  )
  PCTFREE     10
  INITRANS    2
  MAXTRANS    255
  TABLESPACE  powercard_index_fe_part01
  STORAGE   (
    INITIAL     131072
    NEXT        131072
    PCTINCREASE 0
    MINEXTENTS  1
    MAXEXTENTS  2147483645
  )
NOPARALLEL
LOGGING;

CREATE INDEX id_autho_activity_adm_11 ON autho_activity_adm
  (
    authorization_id                ASC
  )
  PCTFREE     10
  INITRANS    2
  MAXTRANS    255
  TABLESPACE  powercard_index_fe_part01
  STORAGE   (
    INITIAL     131072
    NEXT        131072
    PCTINCREASE 0
    MINEXTENTS  1
    MAXEXTENTS  2147483645
  )
NOPARALLEL
LOGGING;

CREATE INDEX id_autho_activity_adm_12 ON autho_activity_adm
  (
    transaction_id                  ASC
  )
  PCTFREE     10
  INITRANS    2
  MAXTRANS    255
  TABLESPACE  powercard_index_fe_part01
  STORAGE   (
    INITIAL     131072
    NEXT        131072
    PCTINCREASE 0
    MINEXTENTS  1
    MAXEXTENTS  2147483645
  )
NOPARALLEL
LOGGING;

CREATE INDEX id_autho_activity_adm_fraud ON autho_activity_adm
  (
    date_create                     ASC
  )
  PCTFREE     10
  INITRANS    2
  MAXTRANS    255
  TABLESPACE  powercard_index_fe_part01
  STORAGE   (
    INITIAL     131072
    NEXT        131072
    PCTINCREASE 0
    MINEXTENTS  1
    MAXEXTENTS  2147483645
  )
NOPARALLEL
LOGGING;

COMMIT;
