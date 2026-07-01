package com.hps.switchmonitoring.service.archive;

import com.hps.switchmonitoring.repository.AutohoActivityAdmRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Archivage automatique des transactions de plus de 6 mois.
 *
 * Stratégie :
 *   1. INSERT INTO AUTHO_ACTIVITY_ADM_ARCHIVE SELECT * FROM AUTHO_ACTIVITY_ADM
 *      WHERE business_date < NOW - 6 months  (les lignes non déjà présentes)
 *   2. DELETE FROM AUTHO_ACTIVITY_ADM WHERE business_date < NOW - 6 months
 *
 * Exécution : chaque nuit à 02h00 (heure serveur).
 * La table archive doit exister (migration V4_0_0).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ArchiveScheduler {

    private final AutohoActivityAdmRepository repo;

    @PersistenceContext
    private EntityManager em;

    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void archiveOldTransactions() {
        LocalDate cutoff = LocalDate.now().minusMonths(6);
        log.info("[ARCHIVE] Début archivage — cutoff = {}", cutoff);

        try {
            // Vérifier combien de lignes sont éligibles
            long eligible = repo.countForArchive(cutoff);
            if (eligible == 0) {
                log.info("[ARCHIVE] Aucune transaction à archiver pour cutoff={}", cutoff);
                return;
            }

            log.info("[ARCHIVE] {} transactions éligibles à l'archivage", eligible);

            // 1. Insertion dans la table archive (ignore les doublons via MERGE)
            int inserted = em.createNativeQuery("""
                INSERT INTO AUTHO_ACTIVITY_ADM_ARCHIVE
                SELECT * FROM AUTHO_ACTIVITY_ADM src
                WHERE src.business_date < :cutoff
                  AND NOT EXISTS (
                    SELECT 1 FROM AUTHO_ACTIVITY_ADM_ARCHIVE arc
                    WHERE arc.reference_number = src.reference_number
                      AND arc.internal_stan    = src.internal_stan
                      AND arc.external_stan    = src.external_stan
                      AND arc.routing_code     = src.routing_code
                      AND arc.capture_code     = src.capture_code
                  )
                """)
                .setParameter("cutoff", cutoff)
                .executeUpdate();

            log.info("[ARCHIVE] {} lignes insérées dans AUTHO_ACTIVITY_ADM_ARCHIVE", inserted);

            // 2. Suppression de la table principale
            int deleted = em.createNativeQuery("""
                DELETE FROM AUTHO_ACTIVITY_ADM
                WHERE business_date < :cutoff
                """)
                .setParameter("cutoff", cutoff)
                .executeUpdate();

            log.info("[ARCHIVE] {} lignes supprimées de AUTHO_ACTIVITY_ADM", deleted);
            log.info("[ARCHIVE] Archivage terminé. Inséré={} / Supprimé={}", inserted, deleted);

        } catch (Exception e) {
            log.error("[ARCHIVE] Erreur lors de l'archivage (cutoff={}): {}", cutoff, e.getMessage(), e);
            throw e; // rollback de la transaction
        }
    }

    /**
     * Décompte sans suppression — utilisable pour monitoring ou tests.
     */
    public long countEligibleForArchive() {
        return repo.countForArchive(LocalDate.now().minusMonths(6));
    }
}
