package com.hps.switchmonitoring.repository;

import com.hps.switchmonitoring.domain.AlertEventEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlertEventRepository extends JpaRepository<AlertEventEntity, Long> {
  List<AlertEventEntity> findTop100ByOrderByCreatedAtDesc();
}
