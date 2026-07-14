package com.hps.switchmonitoring.service;

import com.hps.switchmonitoring.api.dto.CreateSlaSnapshotRequest;
import com.hps.switchmonitoring.domain.SlaSnapshotEntity;
import com.hps.switchmonitoring.repository.SlaSnapshotRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Verifie SlaService : lecture des derniers instantanes SLA et creation
 * d'un nouvel instantane avec horodatage de calcul.
 */
@ExtendWith(MockitoExtension.class)
class SlaServiceTest {

  @Mock private SlaSnapshotRepository slaSnapshotRepository;

  private SlaService service;

  @BeforeEach
  void setUp() {
    service = new SlaService(slaSnapshotRepository);
  }

  @Test
  void getLatestSnapshots_devrait_retourner_les_50_derniers_par_periode() {
    SlaSnapshotEntity snapshot = new SlaSnapshotEntity();
    when(slaSnapshotRepository.findTop50ByOrderByPeriodEndDesc()).thenReturn(List.of(snapshot));

    List<SlaSnapshotEntity> result = service.getLatestSnapshots();

    assertThat(result).containsExactly(snapshot);
  }

  @Test
  void createSnapshot_devrait_mapper_tous_les_champs_de_la_requete() {
    CreateSlaSnapshotRequest request = new CreateSlaSnapshotRequest();
    request.setSlaDefinitionId(1L);
    request.setPeriodStart(LocalDateTime.of(2026, 7, 1, 0, 0));
    request.setPeriodEnd(LocalDateTime.of(2026, 7, 14, 0, 0));
    request.setSuccessRate(new BigDecimal("99.5"));
    request.setAvgLatencyMs(120L);
    request.setP95LatencyMs(450L);
    request.setUptimeRate(new BigDecimal("99.9"));
    request.setBreached(0);

    when(slaSnapshotRepository.save(any(SlaSnapshotEntity.class)))
        .thenAnswer(inv -> inv.getArgument(0));

    SlaSnapshotEntity result = service.createSnapshot(request);

    assertThat(result.getSlaDefinitionId()).isEqualTo(1L);
    assertThat(result.getSuccessRate()).isEqualByComparingTo("99.5");
    assertThat(result.getAvgLatencyMs()).isEqualTo(120L);
    assertThat(result.getP95LatencyMs()).isEqualTo(450L);
    assertThat(result.getUptimeRate()).isEqualByComparingTo("99.9");
    assertThat(result.getBreached()).isEqualTo(0);
  }

  @Test
  void createSnapshot_devrait_horodater_le_calcul_a_maintenant() {
    CreateSlaSnapshotRequest request = new CreateSlaSnapshotRequest();
    request.setSlaDefinitionId(1L);
    request.setPeriodStart(LocalDateTime.now().minusDays(1));
    request.setPeriodEnd(LocalDateTime.now());
    request.setBreached(1);

    ArgumentCaptor<SlaSnapshotEntity> captor = ArgumentCaptor.forClass(SlaSnapshotEntity.class);
    when(slaSnapshotRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

    LocalDateTime before = LocalDateTime.now();
    service.createSnapshot(request);
    LocalDateTime after = LocalDateTime.now();

    LocalDateTime calculatedAt = captor.getValue().getCalculatedAt();
    assertThat(calculatedAt).isBetween(before.minusSeconds(1), after.plusSeconds(1));
  }

  @Test
  void createSnapshot_devrait_persister_un_snapshot_marque_en_breach() {
    CreateSlaSnapshotRequest request = new CreateSlaSnapshotRequest();
    request.setSlaDefinitionId(2L);
    request.setPeriodStart(LocalDateTime.now().minusHours(1));
    request.setPeriodEnd(LocalDateTime.now());
    request.setBreached(1);

    when(slaSnapshotRepository.save(any(SlaSnapshotEntity.class)))
        .thenAnswer(inv -> inv.getArgument(0));

    SlaSnapshotEntity result = service.createSnapshot(request);

    assertThat(result.getBreached()).isEqualTo(1);
    verify(slaSnapshotRepository).save(any(SlaSnapshotEntity.class));
  }
}
