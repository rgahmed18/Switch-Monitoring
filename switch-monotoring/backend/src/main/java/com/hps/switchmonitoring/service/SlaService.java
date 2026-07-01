package com.hps.switchmonitoring.service;

import com.hps.switchmonitoring.api.dto.CreateSlaSnapshotRequest;
import com.hps.switchmonitoring.domain.SlaSnapshotEntity;
import com.hps.switchmonitoring.repository.SlaSnapshotRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class SlaService {

  private final SlaSnapshotRepository slaSnapshotRepository;

  public SlaService(SlaSnapshotRepository slaSnapshotRepository) {
    this.slaSnapshotRepository = slaSnapshotRepository;
  }

  public List<SlaSnapshotEntity> getLatestSnapshots() {
    return slaSnapshotRepository.findTop50ByOrderByPeriodEndDesc();
  }

  public SlaSnapshotEntity createSnapshot(CreateSlaSnapshotRequest request) {
    SlaSnapshotEntity entity = new SlaSnapshotEntity();
    entity.setSlaDefinitionId(request.getSlaDefinitionId());
    entity.setPeriodStart(request.getPeriodStart());
    entity.setPeriodEnd(request.getPeriodEnd());
    entity.setSuccessRate(request.getSuccessRate());
    entity.setAvgLatencyMs(request.getAvgLatencyMs());
    entity.setP95LatencyMs(request.getP95LatencyMs());
    entity.setUptimeRate(request.getUptimeRate());
    entity.setBreached(request.getBreached());
    entity.setCalculatedAt(LocalDateTime.now());
    return slaSnapshotRepository.save(entity);
  }
}
