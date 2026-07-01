package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.service.report.DailyReportStats;
import com.hps.switchmonitoring.service.report.ReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * REST endpoints pour les rapports journaliers.
 *
 * GET /api/v1/reports/daily?date=YYYY-MM-DD     → JSON stats
 * GET /api/v1/reports/daily/pdf?date=YYYY-MM-DD → PDF téléchargeable
 */
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Slf4j
public class ReportController {

    private final ReportService reportService;

    /**
     * Statistiques JSON pour le tableau de bord Rapports (frontend).
     */
    @GetMapping("/daily")
    public ResponseEntity<DailyReportStats> getDailyStats(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        log.info("Rapport stats requested for date: {}", date);
        DailyReportStats stats = reportService.buildStats(date);
        return ResponseEntity.ok(stats);
    }

    /**
     * Génération et téléchargement du rapport PDF.
     */
    @GetMapping("/daily/pdf")
    public ResponseEntity<byte[]> downloadDailyPdf(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        log.info("PDF report requested for date: {}", date);

        DailyReportStats stats = reportService.buildStats(date);
        byte[] pdf = reportService.generatePdf(stats);

        String filename = "rapport-transactions-" + date.format(DateTimeFormatter.ISO_LOCAL_DATE) + ".pdf";

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store")
                .body(pdf);
    }
}
