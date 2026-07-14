package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.api.dto.geo.ActiveCountryDto;
import com.hps.switchmonitoring.api.dto.geo.ActiveCurrencyDto;
import com.hps.switchmonitoring.api.dto.geo.GeoFilterContextDto;
import com.hps.switchmonitoring.api.dto.geo.MultiZoneVolumeDto;
import com.hps.switchmonitoring.repository.AppUserRepository;
import com.hps.switchmonitoring.service.geo.GeoFilterService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Teste GeoAnalyticsController en isolation (GeoFilterService mocke) :
 * contexte initial, filtrage bidirectionnel pays/devise, volume multi-zone.
 */
@WebMvcTest(GeoAnalyticsController.class)
class GeoAnalyticsControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockBean private GeoFilterService geoFilterService;
  @MockBean private AppUserRepository appUserRepository;

  @Test
  void getInitialContext_devrait_utiliser_la_date_fournie() throws Exception {
    LocalDate date = LocalDate.of(2026, 7, 14);
    when(geoFilterService.getInitialContext(date))
        .thenReturn(new GeoFilterContextDto(List.of(), List.of(), "504", "Dirham Marocain (MAD)"));

    mockMvc.perform(get("/api/v1/geo/context?date=2026-07-14"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pivotCurrency").value("504"));

    verify(geoFilterService).getInitialContext(date);
  }

  @Test
  void getInitialContext_devrait_utiliser_aujourdhui_par_defaut() throws Exception {
    when(geoFilterService.getInitialContext(any()))
        .thenReturn(new GeoFilterContextDto(List.of(), List.of(), "504", "Dirham Marocain (MAD)"));

    mockMvc.perform(get("/api/v1/geo/context"))
        .andExpect(status().isOk());

    verify(geoFilterService).getInitialContext(eq(LocalDate.now()));
  }

  @Test
  void getCurrenciesForCountries_devrait_retourner_200_avec_la_liste() throws Exception {
    when(geoFilterService.getCurrenciesForCountries(any(), anyList()))
        .thenReturn(List.of(new ActiveCurrencyDto("504", "MAD", "Dirham Marocain (MAD)", null, 10L)));

    mockMvc.perform(get("/api/v1/geo/currencies?countries=504,012"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].isoAlpha").value("MAD"));
  }

  @Test
  void getCountriesForCurrency_devrait_retourner_200_avec_la_liste() throws Exception {
    when(geoFilterService.getCountriesForCurrency(any(), eq("504")))
        .thenReturn(List.of(new ActiveCountryDto("504", "Maroc", 10L)));

    mockMvc.perform(get("/api/v1/geo/countries?currency=504"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].label").value("Maroc"));
  }

  @Test
  void getMultiZoneVolume_devrait_retourner_400_si_parametres_obligatoires_absents() throws Exception {
    mockMvc.perform(get("/api/v1/geo/volume?fromDate=2026-07-01"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void getMultiZoneVolume_devrait_retourner_200_avec_les_parametres_complets() throws Exception {
    when(geoFilterService.getMultiZoneVolume(any(), any(), anyList(), anyList()))
        .thenReturn(new MultiZoneVolumeDto(
            LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 14), "MAD", List.of()));

    mockMvc.perform(get("/api/v1/geo/volume?fromDate=2026-07-01&toDate=2026-07-14"
            + "&countries=504&currencies=504"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.pivotCurrency").value("MAD"));
  }
}
