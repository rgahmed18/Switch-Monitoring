-- ============================================================================
-- V0_0_2 : Octroi des quotas sur les tablespaces powercard_*
--
-- PFE_SW_MON et les tablespaces powercard_* vivent dans le PDB applicatif
-- (FREEPDB1), pas dans CDB$ROOT ou une connexion sysdba atterrit par defaut.
-- ============================================================================

ALTER SESSION SET CONTAINER = FREEPDB1;
SET SQLBLANKLINES ON

BEGIN
    EXECUTE IMMEDIATE 'ALTER USER PFE_SW_MON QUOTA UNLIMITED ON powercard_data_fe_part01';
    EXECUTE IMMEDIATE 'ALTER USER PFE_SW_MON QUOTA UNLIMITED ON powercard_index_fe_part01';
    EXECUTE IMMEDIATE 'ALTER USER PFE_SW_MON QUOTA UNLIMITED ON powercard_index_fe_part02';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -1918 THEN RAISE; END IF; -- utilisateur pas encore cree, ignorer
END;
/
