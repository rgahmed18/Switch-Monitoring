-- ============================================================================
-- V0_0_0 : Initialisation du premier compte administrateur
--
-- A exécuter UNE SEULE FOIS sur une base vide, avant le premier démarrage.
-- Connexion : sqlplus PFE_SW_MON/PFE_SW_MON_PWD@//localhost:1521/XEPDB1
--
-- Mot de passe par défaut : Admin@2025!
-- L'admin DOIT le changer à sa première connexion (MUST_CHANGE_PASSWORD = 1).
-- ============================================================================

-- Séquence pour l'ID (créée si elle n'existe pas déjà)
BEGIN
    EXECUTE IMMEDIATE 'CREATE SEQUENCE APP_USER_SEQ START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -955 THEN RAISE; END IF; -- -955 = object already exists
END;
/

-- Table APP_USER (créée si elle n'existe pas déjà)
BEGIN
    EXECUTE IMMEDIATE '
        CREATE TABLE APP_USER (
            ID                  NUMBER        NOT NULL,
            USERNAME            VARCHAR2(120) NOT NULL,
            FIRST_NAME          VARCHAR2(100) NOT NULL,
            LAST_NAME           VARCHAR2(100) NOT NULL,
            EMAIL               VARCHAR2(255) NOT NULL,
            PASSWORD_HASH       VARCHAR2(80),
            ROLE                VARCHAR2(20)  NOT NULL,
            STATUS              VARCHAR2(20)  NOT NULL,
            IS_ACTIVE           NUMBER(1)     NOT NULL,
            ACTIVATION_TOKEN    VARCHAR2(100),
            TOKEN_EXPIRY        TIMESTAMP,
            MUST_CHANGE_PASSWORD NUMBER(1)   NOT NULL,
            RESET_TOKEN         VARCHAR2(100),
            RESET_TOKEN_EXPIRY  TIMESTAMP,
            PROJECTS            VARCHAR2(500),
            CREATED_AT          TIMESTAMP     NOT NULL,
            UPDATED_AT          TIMESTAMP,
            CONSTRAINT PK_APP_USER PRIMARY KEY (ID),
            CONSTRAINT UQ_APP_USER_EMAIL    UNIQUE (EMAIL),
            CONSTRAINT UQ_APP_USER_USERNAME UNIQUE (USERNAME),
            CONSTRAINT UQ_APP_USER_TOKEN    UNIQUE (ACTIVATION_TOKEN)
        )';
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE != -955 THEN RAISE; END IF;
END;
/

-- Insertion du compte admin initial
-- Mot de passe : Admin@2025!
-- Hash BCrypt généré avec force 12 (valeur fixe pour reproductibilité)
MERGE INTO APP_USER u
USING (SELECT 'admin@hps.local' AS email FROM dual) src
ON (u.EMAIL = src.email)
WHEN NOT MATCHED THEN INSERT (
    ID,
    USERNAME,
    FIRST_NAME,
    LAST_NAME,
    EMAIL,
    PASSWORD_HASH,
    ROLE,
    STATUS,
    IS_ACTIVE,
    ACTIVATION_TOKEN,
    TOKEN_EXPIRY,
    MUST_CHANGE_PASSWORD,
    RESET_TOKEN,
    RESET_TOKEN_EXPIRY,
    PROJECTS,
    CREATED_AT
) VALUES (
    APP_USER_SEQ.NEXTVAL,
    'admin.initial',
    'Admin',
    'HPS',
    'admin@hps.local',
    -- BCrypt hash de "Admin@2025!" (force 12, vérifié via Spring BCryptPasswordEncoder)
    '$2a$12$Rdc9PJYkfoo1onqRTTINXuEYwWMeTlCBAEj0SrLOwewViYsUAb9Wu',
    'ADMIN',
    'ACTIVE',
    1,
    NULL,
    NULL,
    1,
    NULL,
    NULL,
    '',
    SYSTIMESTAMP
);

COMMIT;

PROMPT ============================================================
PROMPT Compte admin créé avec succès.
PROMPT   Email    : admin@hps.local
PROMPT   Password : Admin@2025!
PROMPT   Role     : ADMIN
PROMPT IMPORTANT  : Changer le mot de passe a la premiere connexion.
PROMPT ============================================================
