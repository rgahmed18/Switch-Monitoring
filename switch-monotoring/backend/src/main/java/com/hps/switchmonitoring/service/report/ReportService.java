package com.hps.switchmonitoring.service.report;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.hps.switchmonitoring.repository.AutohoActivityAdmRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Service de génération des rapports journaliers.
 * - buildStats()   : calcul des KPI depuis la base Oracle
 * - generatePdf()  : rendu PDF avec OpenPDF (API iText 2)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final AutohoActivityAdmRepository repo;

    // ── Palette de couleurs ───────────────────────────────────────────────────
    private static final Color C_HEADER     = new Color(15,  52,  96);   // bleu marine
    private static final Color C_SUBHEADER  = new Color(30,  80, 140);
    private static final Color C_SUCCESS    = new Color(34, 197,  94);   // vert
    private static final Color C_WARNING    = new Color(245,158,  11);   // ambre
    private static final Color C_ERROR      = new Color(239, 68,  68);   // rouge
    private static final Color C_ROW_EVEN   = new Color(241,245, 249);   // gris clair
    private static final Color C_ROW_ODD    = Color.WHITE;
    private static final Color C_BORDER     = new Color(203,213, 225);

    // ── MTI labels (normalisés 0xxx) ──────────────────────────────────────────
    private static final Map<String, String> MTI_LABELS = Map.of(
        "0100", "Demande d'autorisation",
        "0110", "Réponse d'autorisation",
        "0200", "Transaction financière",
        "0210", "Réponse financière",
        "0220", "Avis financier",
        "0400", "Annulation",
        "0420", "Avis annulation",
        "0800", "Message réseau",
        "0810", "Réponse réseau"
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Calcul des statistiques
    // ─────────────────────────────────────────────────────────────────────────

    public DailyReportStats buildStats(LocalDate date) {
        long total    = repo.countByBusinessDate(date);
        long approved = repo.countApprovedByBusinessDate(date);
        long errors   = repo.countNetworkErrorsByDate(date);
        long declined = total - approved - errors;
        if (declined < 0) declined = 0;

        double successRate = total > 0
            ? BigDecimal.valueOf(approved * 100.0 / total)
                .setScale(1, RoundingMode.HALF_UP).doubleValue()
            : 0.0;

        BigDecimal totalVol = repo.sumAmountByBusinessDate(date);
        BigDecimal avgAmt   = repo.avgAmountByBusinessDate(date);
        if (totalVol == null) totalVol = BigDecimal.ZERO;
        if (avgAmt   == null) avgAmt   = BigDecimal.ZERO;

        // MTI distribution — normalize 1xxx → 0xxx
        Map<String, Long> mtiDist = new LinkedHashMap<>();
        for (Object[] row : repo.countByMessageTypeGroup(date)) {
            String raw   = row[0] == null ? "?" : row[0].toString().trim();
            String code  = normalizeMti(raw);
            long   count = ((Number) row[1]).longValue();
            mtiDist.merge(code, count, Long::sum);
        }

        // Hourly volume
        Map<String, Long> hourly = new LinkedHashMap<>();
        for (Object[] row : repo.countByHourGroup(date)) {
            String hour  = String.valueOf(((Number) row[0]).intValue());
            long   count = ((Number) row[1]).longValue();
            hourly.put(hour, count);
        }

        // Action code distribution
        Map<String, Long> acDist = new LinkedHashMap<>();
        for (Object[] row : repo.countByActionCodeGroup(date)) {
            String code  = row[0] == null ? "?" : row[0].toString().trim();
            long   count = ((Number) row[1]).longValue();
            acDist.put(code, count);
        }

        return DailyReportStats.builder()
            .date(date)
            .totalTransactions(total)
            .approvedCount(approved)
            .declinedCount(declined)
            .errorCount(errors)
            .successRate(successRate)
            .totalVolume(totalVol.setScale(2, RoundingMode.HALF_UP))
            .averageAmount(avgAmt.setScale(2, RoundingMode.HALF_UP))
            .mtiDistribution(mtiDist)
            .hourlyVolume(hourly)
            .actionCodeDistribution(acDist)
            .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Génération PDF
    // ─────────────────────────────────────────────────────────────────────────

    public byte[] generatePdf(DailyReportStats s) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4, 40, 40, 50, 50);
        try {
            PdfWriter writer = PdfWriter.getInstance(doc, out);
            writer.setPageEvent(new PdfPageEventHelper() {
                @Override
                public void onEndPage(PdfWriter w, Document d) {
                    addFooter(w, d);
                }
            });
            doc.open();

            addHeader(doc, s);
            addKpiTable(doc, s);
            addMtiTable(doc, s);
            addHourlyTable(doc, s);
            addActionCodeTable(doc, s);

        } catch (Exception e) {
            log.error("PDF generation failed for date {}: {}", s.getDate(), e.getMessage(), e);
            throw new RuntimeException("PDF generation error", e);
        } finally {
            doc.close();
        }
        return out.toByteArray();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Blocs PDF
    // ─────────────────────────────────────────────────────────────────────────

    private void addHeader(Document doc, DailyReportStats s) throws DocumentException {
        Font titleFont = new Font(Font.HELVETICA, 18, Font.BOLD, Color.WHITE);
        Font subFont   = new Font(Font.HELVETICA, 11, Font.NORMAL, new Color(180, 210, 240));

        PdfPTable header = new PdfPTable(1);
        header.setWidthPercentage(100);
        header.setSpacingAfter(18);

        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(C_HEADER);
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(18);

        Paragraph title = new Paragraph("RAPPORT JOURNALIER DE TRANSACTIONS", titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(title);

        String dateStr = s.getDate().format(DateTimeFormatter.ofPattern("dd MMMM yyyy", Locale.FRENCH));
        Paragraph sub = new Paragraph("Date : " + dateStr + "  |  HPS Switch Monitor", subFont);
        sub.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(sub);

        header.addCell(cell);
        doc.add(header);
    }

    private void addKpiTable(Document doc, DailyReportStats s) throws DocumentException {
        Font sectionFont = new Font(Font.HELVETICA, 12, Font.BOLD, Color.WHITE);
        addSectionTitle(doc, "INDICATEURS CLÉS", sectionFont);

        PdfPTable t = new PdfPTable(4);
        t.setWidthPercentage(100);
        t.setSpacingAfter(16);
        t.setWidths(new float[]{1, 1, 1, 1});

        addKpiCell(t, "TOTAL",           String.valueOf(s.getTotalTransactions()),    C_HEADER);
        addKpiCell(t, "APPROUVÉES",      String.valueOf(s.getApprovedCount()),         C_SUCCESS);
        addKpiCell(t, "REFUSÉES",        String.valueOf(s.getDeclinedCount()),         C_WARNING);

        Color rateColor = s.getSuccessRate() >= 95 ? C_SUCCESS : s.getSuccessRate() >= 85 ? C_WARNING : C_ERROR;
        addKpiCell(t, "TAUX DE SUCCÈS",  s.getSuccessRate() + "%",                    rateColor);

        doc.add(t);

        // Volume
        PdfPTable vol = new PdfPTable(2);
        vol.setWidthPercentage(100);
        vol.setSpacingAfter(16);
        addKpiCell(vol, "VOLUME TOTAL (MAD)",   formatAmount(s.getTotalVolume()),   C_SUBHEADER);
        addKpiCell(vol, "MONTANT MOYEN (MAD)",  formatAmount(s.getAverageAmount()), C_SUBHEADER);
        doc.add(vol);
    }

    private void addMtiTable(Document doc, DailyReportStats s) throws DocumentException {
        if (s.getMtiDistribution().isEmpty()) return;
        addSectionTitle(doc, "RÉPARTITION PAR TYPE DE MESSAGE (MTI)",
                new Font(Font.HELVETICA, 11, Font.BOLD, Color.WHITE));

        PdfPTable t = new PdfPTable(4);
        t.setWidthPercentage(100);
        t.setSpacingAfter(16);
        t.setWidths(new float[]{1.2f, 2.5f, 1f, 1f});

        addTableHeader(t, "CODE MTI", "LIBELLÉ", "TRANSACTIONS", "%");

        int i = 0;
        long total = s.getTotalTransactions();
        for (Map.Entry<String, Long> e : s.getMtiDistribution().entrySet()) {
            Color bg = (i++ % 2 == 0) ? C_ROW_EVEN : C_ROW_ODD;
            String label = MTI_LABELS.getOrDefault(e.getKey(), e.getKey());
            double pct = total > 0 ? e.getValue() * 100.0 / total : 0;
            addTableRow(t, bg,
                e.getKey(),
                label,
                String.valueOf(e.getValue()),
                String.format("%.1f%%", pct));
        }
        doc.add(t);
    }

    private void addHourlyTable(Document doc, DailyReportStats s) throws DocumentException {
        if (s.getHourlyVolume().isEmpty()) return;
        addSectionTitle(doc, "VOLUME PAR HEURE",
                new Font(Font.HELVETICA, 11, Font.BOLD, Color.WHITE));

        PdfPTable t = new PdfPTable(3);
        t.setWidthPercentage(100);
        t.setSpacingAfter(16);
        t.setWidths(new float[]{1f, 1.5f, 3f});

        addTableHeader(t, "HEURE", "TRANSACTIONS", "BAR");

        long maxVal = s.getHourlyVolume().values().stream().mapToLong(v -> v).max().orElse(1);
        int i = 0;
        for (int h = 0; h < 24; h++) {
            long count = s.getHourlyVolume().getOrDefault(String.valueOf(h), 0L);
            if (count == 0 && s.getHourlyVolume().size() > 12) continue; // skip empty hours if many rows
            Color bg = (i++ % 2 == 0) ? C_ROW_EVEN : C_ROW_ODD;
            String bar = buildBar(count, maxVal, 20);
            addTableRow(t, bg, String.format("%02dh", h), String.valueOf(count), bar);
        }
        doc.add(t);
    }

    private void addActionCodeTable(Document doc, DailyReportStats s) throws DocumentException {
        if (s.getActionCodeDistribution().isEmpty()) return;
        addSectionTitle(doc, "RÉPARTITION PAR CODE RÉPONSE (TOP 10)",
                new Font(Font.HELVETICA, 11, Font.BOLD, Color.WHITE));

        PdfPTable t = new PdfPTable(3);
        t.setWidthPercentage(100);
        t.setSpacingAfter(10);
        t.setWidths(new float[]{1f, 3f, 1f});
        addTableHeader(t, "CODE", "TRANSACTIONS", "%");

        long total = s.getTotalTransactions();
        int i = 0;
        int limit = 10;
        for (Map.Entry<String, Long> e : s.getActionCodeDistribution().entrySet()) {
            if (i++ >= limit) break;
            Color bg = (i % 2 == 0) ? C_ROW_EVEN : C_ROW_ODD;
            double pct = total > 0 ? e.getValue() * 100.0 / total : 0;
            addTableRow(t, bg, e.getKey(), String.valueOf(e.getValue()), String.format("%.1f%%", pct));
        }
        doc.add(t);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers PDF
    // ─────────────────────────────────────────────────────────────────────────

    private void addSectionTitle(Document doc, String title, Font font) throws DocumentException {
        PdfPTable t = new PdfPTable(1);
        t.setWidthPercentage(100);
        t.setSpacingBefore(8);
        t.setSpacingAfter(6);
        PdfPCell c = new PdfPCell(new Phrase(title, font));
        c.setBackgroundColor(C_SUBHEADER);
        c.setBorder(Rectangle.NO_BORDER);
        c.setPadding(8);
        t.addCell(c);
        doc.add(t);
    }

    private void addKpiCell(PdfPTable t, String label, String value, Color bg) {
        Font lf = new Font(Font.HELVETICA, 8, Font.BOLD, new Color(200, 220, 240));
        Font vf = new Font(Font.HELVETICA, 20, Font.BOLD, Color.WHITE);
        PdfPCell c = new PdfPCell();
        c.setBackgroundColor(bg);
        c.setBorderColor(C_BORDER);
        c.setBorderWidth(0.5f);
        c.setPadding(12);
        c.addElement(new Paragraph(label, lf));
        c.addElement(new Paragraph(value, vf));
        t.addCell(c);
    }

    private void addTableHeader(PdfPTable t, String... cols) {
        Font f = new Font(Font.HELVETICA, 9, Font.BOLD, Color.WHITE);
        for (String col : cols) {
            PdfPCell c = new PdfPCell(new Phrase(col, f));
            c.setBackgroundColor(C_HEADER);
            c.setBorder(Rectangle.NO_BORDER);
            c.setPadding(7);
            t.addCell(c);
        }
    }

    private void addTableRow(PdfPTable t, Color bg, String... vals) {
        Font f = new Font(Font.HELVETICA, 9, Font.NORMAL, new Color(30, 30, 30));
        for (String val : vals) {
            PdfPCell c = new PdfPCell(new Phrase(val, f));
            c.setBackgroundColor(bg);
            c.setBorderColor(C_BORDER);
            c.setBorderWidth(0.3f);
            c.setPadding(6);
            t.addCell(c);
        }
    }

    private void addFooter(PdfWriter w, Document d) {
        PdfContentByte cb = w.getDirectContent();
        Font f = new Font(Font.HELVETICA, 8, Font.ITALIC, new Color(150, 150, 150));
        Phrase footer = new Phrase("HPS Switch Monitor — Rapport confidentiel — Page " + w.getPageNumber(), f);
        ColumnText.showTextAligned(cb, Element.ALIGN_CENTER, footer,
            (d.right() - d.left()) / 2 + d.leftMargin(), d.bottom() - 10, 0);
    }

    private String buildBar(long count, long max, int width) {
        if (max == 0) return "";
        int filled = (int) Math.round((double) count / max * width);
        return "█".repeat(filled) + "░".repeat(width - filled) + " " + count;
    }

    private String formatAmount(BigDecimal v) {
        if (v == null) return "—";
        return String.format("%,.2f MAD", v);
    }

    /** Normalise MTI PowerCARD 1xxx → ISO 8583 0xxx */
    private String normalizeMti(String code) {
        if (code == null || code.length() != 4) return code;
        return code.startsWith("1") ? "0" + code.substring(1) : code;
    }
}
