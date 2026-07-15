package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.service.report.DailyReportStats;
import com.hps.switchmonitoring.service.report.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Rapports", description = "Generation de rapports journaliers (statistiques JSON et export PDF)")
@SecurityRequirements // lecture ouverte a tout utilisateur authentifie cote frontend
public class ReportController {

    private final ReportService reportService;

    @Operation(
        summary = "Statistiques journalieres (JSON)",
        description = "Calcule les statistiques agregees d'une journee (volume, taux d'approbation, montants, repartition par reseau/canal) pour alimenter le tableau de bord Rapports du frontend.")
    @ApiResponse(responseCode = "200", description = "Statistiques journalieres.",
        content = @Content(examples = @ExampleObject(value = """
            {
              "businessDate": "2026-07-15", "totalTransactions": 1873, "approvedCount": 1760,
              "declinedCount": 113, "approvalRate": 94.0, "totalVolume": 2456789.50, "avgLatencyMs": 412
            }""")))
    @GetMapping("/daily")
    public ResponseEntity<DailyReportStats> getDailyStats(
            @Parameter(description = "Date metier du rapport", example = "2026-07-15")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        log.info("Rapport stats requested for date: {}", date);
        DailyReportStats stats = reportService.buildStats(date);
        return ResponseEntity.ok(stats);
    }

    @Operation(
        summary = "Telecharger le rapport journalier au format PDF",
        description = "Genere un document PDF mettant en forme les memes statistiques que `/daily`, pret a etre telecharge et archive/partage (ex: reporting a la direction).")
    @ApiResponse(responseCode = "200", description = "Fichier PDF genere (`Content-Disposition: attachment`).",
        content = @Content(mediaType = MediaType.APPLICATION_PDF_VALUE))
    @GetMapping("/daily/pdf")
    public ResponseEntity<byte[]> downloadDailyPdf(
            @Parameter(description = "Date metier du rapport", example = "2026-07-15")
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
