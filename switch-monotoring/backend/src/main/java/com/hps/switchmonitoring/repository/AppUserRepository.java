package com.hps.switchmonitoring.repository;

import com.hps.switchmonitoring.domain.AppUserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AppUserRepository extends JpaRepository<AppUserEntity, Long> {

    Optional<AppUserEntity> findByEmail(String email);

    Optional<AppUserEntity> findByActivationToken(String token);

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    Optional<AppUserEntity> findByResetToken(String token);
}
