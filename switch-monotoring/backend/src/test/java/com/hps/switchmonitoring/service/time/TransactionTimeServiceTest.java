package com.hps.switchmonitoring.service.time;

import com.hps.switchmonitoring.domain.AutohoActivityAdmEntity;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifie l'analyse temporelle multinationale : resolution de timezone par
 * pays, calcul de latence de traitement, detection de derive et SLA (P95=5s).
 */
class TransactionTimeServiceTest {

  private final TransactionTimeService service = new TransactionTimeService();

  private AutohoActivityAdmEntity entity(String country, LocalDateTime transmission,
                                          LocalDateTime response, LocalDate localDate) {
    AutohoActivityAdmEntity e = new AutohoActivityAdmEntity();
    e.setAcquiringCountryCode(country);
    e.setTransmissionDateAndTime(transmission);
    e.setResponseDateAndTime(response);
    e.setTransactionLocalDate(localDate);
    return e;
  }

  // ── resolveTimezone ───────────────────────────────────────────────────────

  @Test
  void resolveTimezone_devrait_resoudre_le_maroc() {
    assertThat(service.resolveTimezone("504")).isEqualTo("Africa/Casablanca");
  }

  @Test
  void resolveTimezone_devrait_retourner_UTC_pour_pays_inconnu() {
    assertThat(service.resolveTimezone("999")).isEqualTo("UTC");
  }

  @Test
  void resolveTimezone_devrait_gerer_null() {
    assertThat(service.resolveTimezone(null)).isEqualTo("UTC");
  }

  // ── analyze : latence de traitement ──────────────────────────────────────

  @Test
  void analyze_devrait_calculer_la_latence_entre_transmission_et_response() {
    LocalDateTime t = LocalDateTime.of(2026, 7, 14, 10, 0, 0);
    LocalDateTime r = t.plusSeconds(2);
    AutohoActivityAdmEntity e = entity("504", t, r, LocalDate.of(2026, 7, 14));

    var result = service.analyze(e);

    assertThat(result.processingTimeMs()).isEqualTo(2000);
    assertThat(result.isSlaBreached()).isFalse();
  }

  @Test
  void analyze_devrait_marquer_SLA_breach_au_dela_de_5_secondes() {
    LocalDateTime t = LocalDateTime.of(2026, 7, 14, 10, 0, 0);
    LocalDateTime r = t.plusSeconds(6);
    AutohoActivityAdmEntity e = entity("504", t, r, LocalDate.of(2026, 7, 14));

    var result = service.analyze(e);

    assertThat(result.isSlaBreached()).isTrue();
    assertThat(result.slaStatus()).contains("SLA_BREACHED");
  }

  @Test
  void analyze_devrait_marquer_LATENCE_CRITIQUE_au_dela_de_30_secondes() {
    // localDate a minuit pour ne pas introduire de derive (drift) qui masquerait la latence
    LocalDateTime t = LocalDateTime.of(2026, 7, 14, 0, 0, 0);
    LocalDateTime r = t.plusSeconds(35);
    AutohoActivityAdmEntity e = entity("504", t, r, LocalDate.of(2026, 7, 14));

    var result = service.analyze(e);

    assertThat(result.timingAnomaly()).isEqualTo("LATENCE_CRITIQUE");
  }

  @Test
  void analyze_devrait_gerer_une_latence_absente_sans_transmission_ou_response() {
    AutohoActivityAdmEntity e = entity("504", null, null, LocalDate.of(2026, 7, 14));

    var result = service.analyze(e);

    assertThat(result.processingTimeMs()).isZero();
    assertThat(result.processingTimeLabel()).isEqualTo("N/A");
  }

  // ── analyze : derive (drift) ─────────────────────────────────────────────

  @Test
  void analyze_devrait_detecter_une_derive_critique_au_dela_de_24h() {
    LocalDateTime t = LocalDateTime.of(2026, 7, 14, 10, 0, 0);
    LocalDate localDate = LocalDate.of(2026, 7, 10); // 4 jours avant
    AutohoActivityAdmEntity e = entity("504", t, t, localDate);

    var result = service.analyze(e);

    assertThat(result.timingAnomaly()).isEqualTo("DRIFT_CRITIQUE");
    assertThat(result.driftAssessment()).contains("CRITIQUE");
  }

  @Test
  void analyze_devrait_rester_normal_sans_derive_significative() {
    LocalDateTime t = LocalDateTime.of(2026, 7, 14, 0, 10, 0);
    LocalDate localDate = LocalDate.of(2026, 7, 14);
    AutohoActivityAdmEntity e = entity("504", t, t, localDate);

    var result = service.analyze(e);

    assertThat(result.timingAnomaly()).isEqualTo("NORMAL");
  }

  // ── analyze : resolution pays / timezone ─────────────────────────────────

  @Test
  void analyze_devrait_utiliser_la_timezone_du_pays_acquereur() {
    AutohoActivityAdmEntity e = entity("840", LocalDateTime.now(), null, null);

    var result = service.analyze(e);

    assertThat(result.localTimezone()).isEqualTo("America/New_York");
  }

  @Test
  void analyze_devrait_utiliser_UTC_par_defaut_si_pays_inconnu() {
    AutohoActivityAdmEntity e = entity("999", LocalDateTime.now(), null, null);

    var result = service.analyze(e);

    assertThat(result.localTimezone()).isEqualTo("UTC");
  }

  // ── convertToLocalTime ───────────────────────────────────────────────────

  @Test
  void convertToLocalTime_devrait_retourner_NA_si_datetime_null() {
    assertThat(service.convertToLocalTime(null, "504")).isEqualTo("N/A");
  }

  @Test
  void convertToLocalTime_devrait_convertir_vers_la_timezone_du_pays() {
    LocalDateTime utc = LocalDateTime.of(2026, 7, 14, 12, 0, 0);

    String result = service.convertToLocalTime(utc, "504");

    assertThat(result).isNotEqualTo("N/A");
    assertThat(result).contains("14/07/2026");
  }
}
