package com.hps.switchmonitoring.repository;

import com.hps.switchmonitoring.domain.SocketLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository pour accéder aux logs de socket
 */
@Repository
public interface SocketLogRepository extends JpaRepository<SocketLogEntity, Long> {

    /**
     * Récupère tous les logs pour une transaction spécifique
     */
    List<SocketLogEntity> findByTransactionIdOrderByLogTimestampDesc(Long transactionId);

    /**
     * Récupère les logs par canal sur une période
     */
    @Query("SELECT s FROM SocketLogEntity s WHERE s.channel = :channel AND s.logTimestamp BETWEEN :startTime AND :endTime ORDER BY s.logTimestamp DESC")
    List<SocketLogEntity> findByChannelAndTimeRange(@Param("channel") String channel, 
                                                     @Param("startTime") LocalDateTime startTime, 
                                                     @Param("endTime") LocalDateTime endTime);

    /**
     * Récupère les logs en erreur par canal
     */
    @Query("SELECT s FROM SocketLogEntity s WHERE s.channel = :channel AND s.status IN ('ERROR', 'TIMEOUT') ORDER BY s.logTimestamp DESC")
    List<SocketLogEntity> findErrorsByChannel(@Param("channel") String channel);

    /**
     * Compte les timeouts par canal
     */
    @Query("SELECT COUNT(s) FROM SocketLogEntity s WHERE s.channel = :channel AND s.status = 'TIMEOUT'")
    long countTimeoutsByChannel(@Param("channel") String channel);

    /**
     * Récupère les retry count élevés (possibles boucles infinies)
     */
    @Query("SELECT s FROM SocketLogEntity s WHERE s.retryCount > :maxRetries ORDER BY s.retryCount DESC")
    List<SocketLogEntity> findHighRetryCount(@Param("maxRetries") Integer maxRetries);
}
