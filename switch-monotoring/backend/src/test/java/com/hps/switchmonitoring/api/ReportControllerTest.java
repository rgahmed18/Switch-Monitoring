package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.repository.AppUserRepository;
import com.hps.switchmonitoring.service.report.DailyReportStats;
import com.hps.switchmonitoring.service.report.ReportService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Teste ReportController en isolation (ReportService mocke) : statistiques
 * JSON journalieres et telechargement PDF avec en-tetes corrects.
 */
@WebMvcTest(ReportController.class)
class ReportControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockBean private ReportService reportService;
  @MockBean private AppUserRepository appUserRepository;

  private DailyReportStats sampleStats(LocalDate date) {
    return DailyReportStats.builder()
        .date(date)
        .totalTransactions(100L)
        .approvedCount(90L)
        .declinedCount(10L)
        .successRate(90.0)
        .totalVolume(new BigDecimal("50000"))
        .mtiDistribution(Map.of("0200", 100L))
        .build();
  }

  @Test
  void getDailyStats_devrait_retourner_200_avec_les_statistiques() throws Exception {
    LocalDate date = LocalDate.of(2026, 7, 14);
    when(reportService.buildStats(date)).thenReturn(sampleStats(date));

    mockMvc.perform(get("/api/v1/reports/daily?date=2026-07-14"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalTransactions").value(100))
        .andExpect(jsonPath("$.successRate").value(90.0));
  }

  @Test
  void getDailyStats_devrait_retourner_400_si_date_absente() throws Exception {
    mockMvc.perform(get("/api/v1/reports/daily"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void downloadDailyPdf_devrait_retourner_200_avec_content_type_pdf() throws Exception {
    LocalDate date = LocalDate.of(2026, 7, 14);
    when(reportService.buildStats(date)).thenReturn(sampleStats(date));
    when(reportService.generatePdf(any())).thenReturn(new byte[]{1, 2, 3});

    mockMvc.perform(get("/api/v1/reports/daily/pdf?date=2026-07-14"))
        .andExpect(status().isOk())
        .andExpect(header().string("Content-Type", MediaType.APPLICATION_PDF_VALUE));
  }

  @Test
  void downloadDailyPdf_devrait_definir_le_nom_de_fichier_avec_la_date() throws Exception {
    LocalDate date = LocalDate.of(2026, 7, 14);
    when(reportService.buildStats(date)).thenReturn(sampleStats(date));
    when(reportService.generatePdf(any())).thenReturn(new byte[]{1});

    mockMvc.perform(get("/api/v1/reports/daily/pdf?date=2026-07-14"))
        .andExpect(header().string("Content-Disposition",
            "attachment; filename=\"rapport-transactions-2026-07-14.pdf\""));
  }
}
