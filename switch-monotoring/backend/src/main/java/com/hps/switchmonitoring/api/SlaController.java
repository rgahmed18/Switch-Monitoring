package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.api.dto.CreateSlaSnapshotRequest;
import com.hps.switchmonitoring.domain.SlaSnapshotEntity;
import com.hps.switchmonitoring.service.SlaService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/sla-snapshots")
public class SlaController {

  private final SlaService slaService;

  public SlaController(SlaService slaService) {
    this.slaService = slaService;
  }

  @GetMapping
  public List<SlaSnapshotEntity> getLatestSnapshots() {
    return slaService.getLatestSnapshots();
  }

  @PostMapping
  public SlaSnapshotEntity createSnapshot(@Valid @RequestBody CreateSlaSnapshotRequest request) {
    return slaService.createSnapshot(request);
  }
}
