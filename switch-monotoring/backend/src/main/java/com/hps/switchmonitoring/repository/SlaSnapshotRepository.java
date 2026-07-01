package com.hps.switchmonitoring.repository;

import com.hps.switchmonitoring.domain.SlaSnapshotEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SlaSnapshotRepository extends JpaRepository<SlaSnapshotEntity, Long> {
  List<SlaSnapshotEntity> findTop50ByOrderByPeriodEndDesc();
}
