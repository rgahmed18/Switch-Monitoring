-- ============================================================================
-- V4_0_0: CREATE AUTHO_ACTIVITY_ADM_ARCHIVE TABLE
-- Table d'archivage des transactions de plus de 6 mois.
-- Structure identique à AUTHO_ACTIVITY_ADM.
-- Alimentée automatiquement par ArchiveScheduler (chaque nuit à 02h00).
-- ============================================================================

CREATE TABLE AUTHO_ACTIVITY_ADM_ARCHIVE
AS SELECT * FROM AUTHO_ACTIVITY_ADM WHERE 1=0;

-- La contrainte de clé primaire est identique
ALTER TABLE AUTHO_ACTIVITY_ADM_ARCHIVE
  ADD CONSTRAINT PK_AUTHO_ARCHIVE
  PRIMARY KEY (reference_number, internal_stan, external_stan, routing_code, capture_code);

-- Colonne technique : date d'archivage réelle
ALTER TABLE AUTHO_ACTIVITY_ADM_ARCHIVE
  ADD archive_date DATE DEFAULT SYSDATE;

-- Index sur la date métier pour faciliter les requêtes de consultation archive
CREATE INDEX IDX_ARCHIVE_BUSINESS_DATE
  ON AUTHO_ACTIVITY_ADM_ARCHIVE (business_date);

CREATE INDEX IDX_ARCHIVE_ACTION_CODE
  ON AUTHO_ACTIVITY_ADM_ARCHIVE (action_code);

-- Vue de recherche unifiée (production + archive)
CREATE OR REPLACE VIEW V_AUTHO_ALL_HISTORY AS
    SELECT *, NULL AS archive_date FROM AUTHO_ACTIVITY_ADM
    UNION ALL
    SELECT * FROM AUTHO_ACTIVITY_ADM_ARCHIVE;

COMMENT ON TABLE AUTHO_ACTIVITY_ADM_ARCHIVE IS
  'Archive des transactions de plus de 6 mois — alimentée par ArchiveScheduler Spring Boot';
