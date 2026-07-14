package com.hps.switchmonitoring.service.geo;

import com.hps.switchmonitoring.api.dto.geo.ActiveCountryDto;
import com.hps.switchmonitoring.api.dto.geo.ActiveCurrencyDto;
import com.hps.switchmonitoring.api.dto.geo.GeoFilterContextDto;
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
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Verifie le filtrage bidirectionnel Pays <-> Devise et les referentiels
 * embarques ISO 3166-1 / ISO 4217 de GeoFilterService.
 */
@ExtendWith(MockitoExtension.class)
class GeoFilterServiceTest {

  @Mock private AutohoActivityAdmRepository repository;

  private GeoFilterService service;

  @BeforeEach
  void setUp() {
    service = new GeoFilterService(repository);
  }

  // ── Referentiels statiques ───────────────────────────────────────────────

  @Test
  void labelCountry_devrait_resoudre_le_maroc() {
    assertThat(GeoFilterService.labelCountry("504")).isEqualTo("Maroc");
  }

  @Test
  void labelCountry_devrait_retourner_un_libelle_generique_pour_code_inconnu() {
    assertThat(GeoFilterService.labelCountry("999")).isEqualTo("Pays 999");
  }

  @Test
  void labelCountry_devrait_gerer_null() {
    assertThat(GeoFilterService.labelCountry(null)).isEqualTo("Inconnu");
  }

  @Test
  void labelCurrency_devrait_resoudre_le_dirham() {
    assertThat(GeoFilterService.labelCurrency("504")).isEqualTo("Dirham Marocain (MAD)");
  }

  @Test
  void labelCurrency_devrait_gerer_un_code_inconnu() {
    assertThat(GeoFilterService.labelCurrency("999")).isEqualTo("Devise 999");
  }

  @Test
  void alphaCode_devrait_resoudre_le_code_alpha_iso() {
    assertThat(GeoFilterService.alphaCode("840")).isEqualTo("USD");
  }

  @Test
  void alphaCode_devrait_retourner_le_code_numerique_si_inconnu() {
    assertThat(GeoFilterService.alphaCode("999")).isEqualTo("999");
  }

  // ── getInitialContext ────────────────────────────────────────────────────

  @Test
  void getInitialContext_devrait_retourner_pays_et_devises_avec_pivot_MAD() {
    LocalDate date = LocalDate.of(2026, 7, 14);
    when(repository.findActiveCountriesByDate(date))
        .thenReturn(List.<Object[]>of(new Object[]{"504", 100L}));
    when(repository.findCurrenciesByCountries(any(), anyList()))
        .thenReturn(List.<Object[]>of(new Object[]{"504", "504", 100L}));

    GeoFilterContextDto result = service.getInitialContext(date);

    assertThat(result.pivotCurrency()).isEqualTo("504");
    assertThat(result.availableCountries()).hasSize(1);
    assertThat(result.availableCountries().get(0).code()).isEqualTo("504");
    assertThat(result.availableCurrencies()).hasSize(1);
  }

  @Test
  void getInitialContext_ne_devrait_pas_interroger_les_devises_si_aucun_pays_actif() {
    LocalDate date = LocalDate.of(2026, 7, 14);
    when(repository.findActiveCountriesByDate(date)).thenReturn(List.of());

    GeoFilterContextDto result = service.getInitialContext(date);

    assertThat(result.availableCountries()).isEmpty();
    assertThat(result.availableCurrencies()).isEmpty();
    verify(repository, never()).findCurrenciesByCountries(any(), anyList());
  }

  // ── getCurrenciesForCountries ────────────────────────────────────────────

  @Test
  void getCurrenciesForCountries_devrait_retourner_liste_vide_si_aucun_pays() {
    List<ActiveCurrencyDto> result = service.getCurrenciesForCountries(LocalDate.now(), List.of());

    assertThat(result).isEmpty();
    verify(repository, never()).findCurrenciesByCountries(any(), anyList());
  }

  @Test
  void getCurrenciesForCountries_devrait_dedupliquer_par_devise_et_cumuler_les_comptages() {
    LocalDate date = LocalDate.now();
    when(repository.findCurrenciesByCountries(date, List.of("504", "012")))
        .thenReturn(List.of(
            new Object[]{"504", "504", 50L},
            new Object[]{"504", "012", 30L}));

    List<ActiveCurrencyDto> result = service.getCurrenciesForCountries(date, List.of("504", "012"));

    assertThat(result).hasSize(1);
    assertThat(result.get(0).transactionCount()).isEqualTo(80L);
  }

  @Test
  void getCurrenciesForCountries_devrait_retourner_lalpha_et_le_libelle_devise() {
    LocalDate date = LocalDate.now();
    when(repository.findCurrenciesByCountries(date, List.of("504")))
        .thenReturn(List.<Object[]>of(new Object[]{"840", "504", 10L}));

    List<ActiveCurrencyDto> result = service.getCurrenciesForCountries(date, List.of("504"));

    assertThat(result.get(0).isoAlpha()).isEqualTo("USD");
    assertThat(result.get(0).label()).isEqualTo("Dollar Américain (USD)");
  }

  // ── getCountriesForCurrency ──────────────────────────────────────────────

  @Test
  void getCountriesForCurrency_devrait_retourner_liste_vide_si_devise_absente() {
    assertThat(service.getCountriesForCurrency(LocalDate.now(), null)).isEmpty();
    assertThat(service.getCountriesForCurrency(LocalDate.now(), "  ")).isEmpty();
    verify(repository, never()).findCountriesByCurrency(any(), anyString());
  }

  @Test
  void getCountriesForCurrency_devrait_mapper_les_pays_avec_libelle() {
    LocalDate date = LocalDate.now();
    when(repository.findCountriesByCurrency(date, "504"))
        .thenReturn(List.<Object[]>of(new Object[]{"504", 200L}));

    List<ActiveCountryDto> result = service.getCountriesForCurrency(date, "504");

    assertThat(result).hasSize(1);
    assertThat(result.get(0).label()).isEqualTo("Maroc");
    assertThat(result.get(0).transactionCount()).isEqualTo(200L);
  }

  // ── getMultiZoneVolume ────────────────────────────────────────────────────

  @Test
  void getMultiZoneVolume_devrait_construire_les_zones_avec_libelles_et_pivot_MAD() {
    LocalDate from = LocalDate.of(2026, 7, 1);
    LocalDate to   = LocalDate.of(2026, 7, 14);
    when(repository.findMultiZoneVolume(from, to, List.of("504"), List.of("504")))
        .thenReturn(List.<Object[]>of(new Object[]{"504", "504", 42L, "12345.678"}));

    var result = service.getMultiZoneVolume(from, to, List.of("504"), List.of("504"));

    assertThat(result.pivotCurrency()).isEqualTo("MAD");
    assertThat(result.volumes()).hasSize(1);
    assertThat(result.volumes().get(0).countryLabel()).isEqualTo("Maroc");
    assertThat(result.volumes().get(0).transactionCount()).isEqualTo(42L);
  }

  @Test
  void getMultiZoneVolume_devrait_gerer_un_volume_null_comme_zero() {
    LocalDate from = LocalDate.of(2026, 7, 1);
    LocalDate to   = LocalDate.of(2026, 7, 14);
    when(repository.findMultiZoneVolume(from, to, List.of("504"), List.of("504")))
        .thenReturn(List.<Object[]>of(new Object[]{"504", "504", 0L, null}));

    var result = service.getMultiZoneVolume(from, to, List.of("504"), List.of("504"));

    assertThat(result.volumes().get(0).volumeMad()).isEqualByComparingTo("0");
  }
}
