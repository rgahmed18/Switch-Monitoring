package com.hps.switchmonitoring.service.geo;

import com.hps.switchmonitoring.api.dto.geo.CountryHealthKpiDto;
import com.hps.switchmonitoring.api.dto.geo.ZoneHealthSummaryDto;
import com.hps.switchmonitoring.repository.AutohoActivityAdmRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * Verifie le calcul de sante par zone geographique : seuils HEALTHY/WARNING/
 * CRITICAL, score de sante avec malus latence/reversal, et agregation globale.
 */
@ExtendWith(MockitoExtension.class)
class ZoneHealthServiceTest {

  @Mock private AutohoActivityAdmRepository repository;
  @Mock private GeoFilterService geoFilter;

  private ZoneHealthService service;

  @BeforeEach
  void setUp() {
    service = new ZoneHealthService(repository, geoFilter);
  }

  private Object[] row(String country, long total, long approved, long declined,
                        long reversals, String topReject, Double avgLatency, String volumeMad) {
    return new Object[]{country, total, approved, declined, reversals, topReject, avgLatency, volumeMad};
  }

  // ── Seuils de statut ─────────────────────────────────────────────────────

  @Test
  void computeFullHeatmap_devrait_marquer_HEALTHY_si_taux_acceptation_95_ou_plus() {
    LocalDate date = LocalDate.now();
    when(repository.findZoneHealthByDate(date))
        .thenReturn(List.<Object[]>of(row("504", 100L, 96L, 4L, 0L, null, 1.0, "1000.000")));
    when(repository.findTopRejectCodesForCountry(any(), anyString())).thenReturn(List.of());

    ZoneHealthSummaryDto result = service.computeFullHeatmap(date);

    assertThat(result.zones().get(0).healthStatus()).isEqualTo("HEALTHY");
    assertThat(result.zones().get(0).healthColor()).isEqualTo("#22c55e");
  }

  @Test
  void computeFullHeatmap_devrait_marquer_WARNING_entre_85_et_95() {
    LocalDate date = LocalDate.now();
    when(repository.findZoneHealthByDate(date))
        .thenReturn(List.<Object[]>of(row("504", 100L, 90L, 10L, 0L, "100", 1.0, "1000.000")));
    when(repository.findTopRejectCodesForCountry(any(), anyString())).thenReturn(List.of());

    ZoneHealthSummaryDto result = service.computeFullHeatmap(date);

    assertThat(result.zones().get(0).healthStatus()).isEqualTo("WARNING");
  }

  @Test
  void computeFullHeatmap_devrait_marquer_CRITICAL_sous_85() {
    LocalDate date = LocalDate.now();
    when(repository.findZoneHealthByDate(date))
        .thenReturn(List.<Object[]>of(row("504", 100L, 70L, 30L, 0L, "100", 1.0, "1000.000")));
    when(repository.findTopRejectCodesForCountry(any(), anyString())).thenReturn(List.of());

    ZoneHealthSummaryDto result = service.computeFullHeatmap(date);

    assertThat(result.zones().get(0).healthStatus()).isEqualTo("CRITICAL");
    assertThat(result.zones().get(0).healthColor()).isEqualTo("#ef4444");
    assertThat(result.zones().get(0).alertTriggered()).isTrue();
  }

  // ── Score de sante avec malus ────────────────────────────────────────────

  @Test
  void computeFullHeatmap_devrait_appliquer_un_malus_10_si_latence_superieure_5s() {
    LocalDate date = LocalDate.now();
    when(repository.findZoneHealthByDate(date))
        .thenReturn(List.<Object[]>of(row("504", 100L, 100L, 0L, 0L, null, 6.0, "1000.000")));
    when(repository.findTopRejectCodesForCountry(any(), anyString())).thenReturn(List.of());

    var kpi = service.computeFullHeatmap(date).zones().get(0);

    // acceptRate=100 - malus latence 10 = 90
    assertThat(kpi.healthScore()).isEqualTo(90);
  }

  @Test
  void computeFullHeatmap_devrait_appliquer_un_malus_5_si_latence_entre_3_et_5s() {
    LocalDate date = LocalDate.now();
    when(repository.findZoneHealthByDate(date))
        .thenReturn(List.<Object[]>of(row("504", 100L, 100L, 0L, 0L, null, 4.0, "1000.000")));
    when(repository.findTopRejectCodesForCountry(any(), anyString())).thenReturn(List.of());

    var kpi = service.computeFullHeatmap(date).zones().get(0);

    assertThat(kpi.healthScore()).isEqualTo(95);
  }

  @Test
  void computeFullHeatmap_devrait_appliquer_un_malus_3_si_reversal_rate_superieur_2pct() {
    LocalDate date = LocalDate.now();
    // reversals=3/100 = 3% > 2%
    when(repository.findZoneHealthByDate(date))
        .thenReturn(List.<Object[]>of(row("504", 100L, 100L, 0L, 3L, null, 1.0, "1000.000")));
    when(repository.findTopRejectCodesForCountry(any(), anyString())).thenReturn(List.of());

    var kpi = service.computeFullHeatmap(date).zones().get(0);

    assertThat(kpi.healthScore()).isEqualTo(97);
  }

  @Test
  void computeFullHeatmap_le_score_ne_devrait_jamais_descendre_sous_zero() {
    LocalDate date = LocalDate.now();
    when(repository.findZoneHealthByDate(date))
        .thenReturn(List.<Object[]>of(row("504", 100L, 0L, 100L, 5L, "100", 10.0, "0")));
    when(repository.findTopRejectCodesForCountry(any(), anyString())).thenReturn(List.of());

    var kpi = service.computeFullHeatmap(date).zones().get(0);

    assertThat(kpi.healthScore()).isGreaterThanOrEqualTo(0);
  }

  // ── Agregation globale ───────────────────────────────────────────────────

  @Test
  void computeFullHeatmap_devrait_agreger_le_taux_global_et_compter_par_statut() {
    LocalDate date = LocalDate.now();
    when(repository.findZoneHealthByDate(date))
        .thenReturn(List.of(
            row("504", 100L, 96L, 4L, 0L, null, 1.0, "1000.000"),
            row("012", 100L, 70L, 30L, 0L, "100", 1.0, "500.000")));
    when(repository.findTopRejectCodesForCountry(any(), anyString())).thenReturn(List.of());

    ZoneHealthSummaryDto result = service.computeFullHeatmap(date);

    assertThat(result.totalCountries()).isEqualTo(2);
    assertThat(result.healthyCount()).isEqualTo(1);
    assertThat(result.criticalCount()).isEqualTo(1);
    assertThat(result.globalTransactions()).isEqualTo(200L);
    assertThat(result.globalAcceptanceRate()).isEqualTo(83.0);
  }

  @Test
  void computeFullHeatmap_devrait_gerer_une_liste_vide() {
    LocalDate date = LocalDate.now();
    when(repository.findZoneHealthByDate(date)).thenReturn(List.of());

    ZoneHealthSummaryDto result = service.computeFullHeatmap(date);

    assertThat(result.totalCountries()).isZero();
    assertThat(result.globalAcceptanceRate()).isZero();
  }

  // ── computeCountryKpi ─────────────────────────────────────────────────────

  @Test
  void computeCountryKpi_devrait_retourner_le_kpi_du_pays_demande() {
    LocalDate date = LocalDate.now();
    when(repository.findZoneHealthByDate(date))
        .thenReturn(List.of(
            row("504", 100L, 96L, 4L, 0L, null, 1.0, "1000.000"),
            row("012", 50L, 40L, 10L, 0L, "100", 1.0, "200.000")));
    when(repository.findTopRejectCodesForCountry(any(), anyString())).thenReturn(List.of());

    CountryHealthKpiDto kpi = service.computeCountryKpi(date, "012");

    assertThat(kpi.countryCode()).isEqualTo("012");
    assertThat(kpi.totalTransactions()).isEqualTo(50L);
  }

  @Test
  void computeCountryKpi_devrait_retourner_un_kpi_vide_si_pays_absent() {
    LocalDate date = LocalDate.now();
    when(repository.findZoneHealthByDate(date)).thenReturn(List.of());

    CountryHealthKpiDto kpi = service.computeCountryKpi(date, "999");

    assertThat(kpi.totalTransactions()).isZero();
    assertThat(kpi.healthStatus()).isEqualTo("HEALTHY");
  }

  // ── getAlertZones ─────────────────────────────────────────────────────────

  @Test
  void getAlertZones_devrait_ne_retourner_que_warning_et_critical_triees_par_score() {
    LocalDate date = LocalDate.now();
    when(repository.findZoneHealthByDate(date))
        .thenReturn(List.of(
            row("504", 100L, 96L, 4L, 0L, null, 1.0, "1000.000"),   // HEALTHY, exclu
            row("012", 100L, 70L, 30L, 0L, "100", 1.0, "500.000"),  // CRITICAL, score 70
            row("788", 100L, 88L, 12L, 0L, "100", 1.0, "300.000"))); // WARNING, score 88
    when(repository.findTopRejectCodesForCountry(any(), anyString())).thenReturn(List.of());

    List<CountryHealthKpiDto> alerts = service.getAlertZones(date);

    assertThat(alerts).hasSize(2);
    assertThat(alerts.get(0).countryCode()).isEqualTo("012"); // pire score en premier
    assertThat(alerts.get(1).countryCode()).isEqualTo("788");
  }
}
