package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.api.dto.geo.CountryHealthKpiDto;
import com.hps.switchmonitoring.api.dto.geo.ZoneHealthSummaryDto;
import com.hps.switchmonitoring.repository.AppUserRepository;
import com.hps.switchmonitoring.service.geo.ZoneHealthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Teste ZoneHealthController en isolation (ZoneHealthService mocke) :
 * heatmap complete, KPI par pays, et filtrage des zones en alerte.
 */
@WebMvcTest(ZoneHealthController.class)
class ZoneHealthControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockBean private ZoneHealthService zoneHealthService;
  @MockBean private AppUserRepository appUserRepository;

  private ZoneHealthSummaryDto emptySummary(LocalDate date) {
    return new ZoneHealthSummaryDto(date, 0, 0, 0, 0, BigDecimal.ZERO, 0L, 0.0, List.of(), "MAD");
  }

  @Test
  void getHeatmap_devrait_retourner_200_avec_la_date_fournie() throws Exception {
    LocalDate date = LocalDate.of(2026, 7, 14);
    when(zoneHealthService.computeFullHeatmap(date)).thenReturn(emptySummary(date));

    mockMvc.perform(get("/api/v1/zone-health/heatmap?date=2026-07-14"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pivotCurrency").value("MAD"));

    verify(zoneHealthService).computeFullHeatmap(date);
  }

  @Test
  void getHeatmap_devrait_utiliser_aujourdhui_si_aucune_date_fournie() throws Exception {
    when(zoneHealthService.computeFullHeatmap(any())).thenReturn(emptySummary(LocalDate.now()));

    mockMvc.perform(get("/api/v1/zone-health/heatmap"))
        .andExpect(status().isOk());

    verify(zoneHealthService).computeFullHeatmap(eq(LocalDate.now()));
  }

  @Test
  void getCountryKpi_devrait_retourner_le_kpi_du_pays() throws Exception {
    LocalDate date = LocalDate.of(2026, 7, 14);
    CountryHealthKpiDto kpi = new CountryHealthKpiDto(
        "504", "Maroc", 100L, 96L, 4L, 0L, 96.0, 4.0,
        "HEALTHY", "#22c55e", 96, 1.0, BigDecimal.TEN,
        null, "Aucun rejet", List.of(), false, null);
    when(zoneHealthService.computeCountryKpi(date, "504")).thenReturn(kpi);

    mockMvc.perform(get("/api/v1/zone-health/country/504?date=2026-07-14"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.countryCode").value("504"))
        .andExpect(jsonPath("$.healthStatus").value("HEALTHY"));
  }

  @Test
  void getAlertZones_devrait_retourner_uniquement_les_zones_en_alerte() throws Exception {
    LocalDate date = LocalDate.of(2026, 7, 14);
    CountryHealthKpiDto critical = new CountryHealthKpiDto(
        "012", "Algérie", 100L, 60L, 40L, 0L, 60.0, 40.0,
        "CRITICAL", "#ef4444", 60, 1.0, BigDecimal.ZERO,
        "100", "Refus générique", List.of(), true, "[CRITIQUE] Algérie");
    when(zoneHealthService.getAlertZones(date)).thenReturn(List.of(critical));

    mockMvc.perform(get("/api/v1/zone-health/alerts?date=2026-07-14"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].countryCode").value("012"))
        .andExpect(jsonPath("$[0].alertTriggered").value(true));
  }

  @Test
  void getAlertZones_devrait_retourner_une_liste_vide_si_aucune_alerte() throws Exception {
    when(zoneHealthService.getAlertZones(any())).thenReturn(List.of());

    mockMvc.perform(get("/api/v1/zone-health/alerts"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isEmpty());
  }
}
