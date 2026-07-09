package com.hps.switchmonitoring.service.report;

import com.hps.switchmonitoring.repository.AutohoActivityAdmRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

  @Mock private AutohoActivityAdmRepository repo;

  private ReportService reportService;

  private static final LocalDate DATE = LocalDate.of(2026, 7, 1);

  @BeforeEach
  void setUp() {
    reportService = new ReportService(repo);
  }

  @Test
  void buildStats_devrait_calculer_le_taux_de_succes_correctement() {
    when(repo.countByBusinessDate(DATE)).thenReturn(200L);
    when(repo.countApprovedByBusinessDate(DATE)).thenReturn(180L);
    when(repo.countNetworkErrorsByDate(DATE)).thenReturn(0L);
    when(repo.sumAmountByBusinessDate(DATE)).thenReturn(new BigDecimal("50000.00"));
    when(repo.avgAmountByBusinessDate(DATE)).thenReturn(new BigDecimal("250.00"));
    when(repo.countByMessageTypeGroup(DATE)).thenReturn(List.of());
    when(repo.countByHourGroup(DATE)).thenReturn(List.of());
    when(repo.countByActionCodeGroup(DATE)).thenReturn(List.of());

    DailyReportStats stats = reportService.buildStats(DATE);

    assertThat(stats.getTotalTransactions()).isEqualTo(200L);
    assertThat(stats.getApprovedCount()).isEqualTo(180L);
    assertThat(stats.getDeclinedCount()).isEqualTo(20L);
    assertThat(stats.getSuccessRate()).isEqualTo(90.0);
  }

  @Test
  void buildStats_devrait_gerer_labsence_de_transactions_sans_division_par_zero() {
    when(repo.countByBusinessDate(DATE)).thenReturn(0L);
    when(repo.countApprovedByBusinessDate(DATE)).thenReturn(0L);
    when(repo.countNetworkErrorsByDate(DATE)).thenReturn(0L);
    when(repo.sumAmountByBusinessDate(DATE)).thenReturn(null);
    when(repo.avgAmountByBusinessDate(DATE)).thenReturn(null);
    when(repo.countByMessageTypeGroup(DATE)).thenReturn(List.of());
    when(repo.countByHourGroup(DATE)).thenReturn(List.of());
    when(repo.countByActionCodeGroup(DATE)).thenReturn(List.of());

    DailyReportStats stats = reportService.buildStats(DATE);

    assertThat(stats.getSuccessRate()).isZero();
    assertThat(stats.getTotalVolume()).isEqualByComparingTo(BigDecimal.ZERO);
    assertThat(stats.getAverageAmount()).isEqualByComparingTo(BigDecimal.ZERO);
  }

  @Test
  void buildStats_ne_devrait_jamais_retourner_un_declinedCount_negatif() {
    // approved + errors > total (incohérence de données) -> declined ne doit pas être négatif
    when(repo.countByBusinessDate(DATE)).thenReturn(10L);
    when(repo.countApprovedByBusinessDate(DATE)).thenReturn(8L);
    when(repo.countNetworkErrorsByDate(DATE)).thenReturn(5L);
    when(repo.sumAmountByBusinessDate(DATE)).thenReturn(BigDecimal.ZERO);
    when(repo.avgAmountByBusinessDate(DATE)).thenReturn(BigDecimal.ZERO);
    when(repo.countByMessageTypeGroup(DATE)).thenReturn(List.of());
    when(repo.countByHourGroup(DATE)).thenReturn(List.of());
    when(repo.countByActionCodeGroup(DATE)).thenReturn(List.of());

    DailyReportStats stats = reportService.buildStats(DATE);

    assertThat(stats.getDeclinedCount()).isZero();
  }

  @Test
  void buildStats_devrait_normaliser_les_mti_powercard_1xxx_vers_0xxx() {
    when(repo.countByBusinessDate(DATE)).thenReturn(2L);
    when(repo.countApprovedByBusinessDate(DATE)).thenReturn(2L);
    when(repo.countNetworkErrorsByDate(DATE)).thenReturn(0L);
    when(repo.sumAmountByBusinessDate(DATE)).thenReturn(BigDecimal.ZERO);
    when(repo.avgAmountByBusinessDate(DATE)).thenReturn(BigDecimal.ZERO);
    when(repo.countByMessageTypeGroup(DATE)).thenReturn(
        List.of(new Object[]{"1100", 5L}, new Object[]{"0100", 3L}));
    when(repo.countByHourGroup(DATE)).thenReturn(List.of());
    when(repo.countByActionCodeGroup(DATE)).thenReturn(List.of());

    DailyReportStats stats = reportService.buildStats(DATE);

    // "1100" et "0100" doivent être fusionnés sous la même clé normalisée "0100"
    assertThat(stats.getMtiDistribution()).containsEntry("0100", 8L);
  }

  @Test
  void generatePdf_devrait_produire_un_document_pdf_non_vide() {
    DailyReportStats stats = DailyReportStats.builder()
        .date(DATE)
        .totalTransactions(10L)
        .approvedCount(8L)
        .declinedCount(2L)
        .errorCount(0L)
        .successRate(80.0)
        .totalVolume(new BigDecimal("1000.00"))
        .averageAmount(new BigDecimal("100.00"))
        .mtiDistribution(java.util.Map.of("0100", 10L))
        .hourlyVolume(java.util.Map.of("10", 10L))
        .actionCodeDistribution(java.util.Map.of("000", 8L))
        .build();

    byte[] pdf = reportService.generatePdf(stats);

    assertThat(pdf).isNotEmpty();
    // Signature de fichier PDF : "%PDF"
    assertThat(new String(pdf, 0, 4, java.nio.charset.StandardCharsets.US_ASCII)).isEqualTo("%PDF");
  }
}
