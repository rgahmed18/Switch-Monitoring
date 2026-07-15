-- ============================================================================
-- V0_0_1 : Creation des tablespaces attendus par le schema AUTHO_ACTIVITY_ADM
--
-- Le schema officiel (V3_0_0/V3_0_1) reference des tablespaces nommes comme
-- en production HPS (powercard_data_fe_part01, powercard_index_fe_part01/02).
-- Sur une instance Oracle fraiche (Docker, poste local vierge), ces
-- tablespaces n'existent pas encore : ce script les cree avec un datafile
-- autoextensible avant que V3_0_0 ne s'execute.
-- ============================================================================

ALTER SESSION SET CONTAINER = FREEPDB1;
SET SQLBLANKLINES ON

BEGIN
    EXECUTE IMMEDIATE '
        CREATE TABLESPACE powercard_data_fe_part01
        DATAFILE ''powercard_data_fe_part01.dbf'' SIZE 100M
        AUTOEXTEND ON NEXT 50M MAXSIZE UNLIMITED';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -959 THEN RAISE; END IF; -- deja existant, ok
END;
/

BEGIN
    EXECUTE IMMEDIATE '
        CREATE TABLESPACE powercard_index_fe_part01
        DATAFILE ''powercard_index_fe_part01.dbf'' SIZE 100M
        AUTOEXTEND ON NEXT 50M MAXSIZE UNLIMITED';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -959 THEN RAISE; END IF;
END;
/

BEGIN
    EXECUTE IMMEDIATE '
        CREATE TABLESPACE powercard_index_fe_part02
        DATAFILE ''powercard_index_fe_part02.dbf'' SIZE 100M
        AUTOEXTEND ON NEXT 50M MAXSIZE UNLIMITED';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -959 THEN RAISE; END IF;
END;
/

