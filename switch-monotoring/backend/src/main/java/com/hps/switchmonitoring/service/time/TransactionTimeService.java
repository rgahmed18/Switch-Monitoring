package com.hps.switchmonitoring.service.time;

import com.hps.switchmonitoring.domain.AutohoActivityAdmEntity;
import org.springframework.stereotype.Service;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Map;

/**
 * Service de gestion temporelle multinationale.
 *
 * Résout la complexité de la réconciliation entre :
 *  - transaction_local_date : heure locale où la transaction a eu lieu
 *  - transmission_date_and_time : heure système centrale (HPS switch)
 *  - response_date_and_time : heure de réponse de l'émetteur
 *  - internal_transmission_time : horodatage interne du switch
 *
 * Fournit des conversions de timezone basées sur acquiring_country_code
 * (ISO 3166 numérique, format utilisé dans HPS PowerCARD).
 */
@Service
public class TransactionTimeService {

    private static final DateTimeFormatter FMT_DISPLAY =
        DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
    private static final DateTimeFormatter FMT_ISO =
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    /**
     * Mapping ISO 3166 numérique → ZoneId.
     * Couvre les pays HPS (Afrique, MENA, Europe, Amériques, Asie-Pacifique).
     */
    private static final Map<String, ZoneId> COUNTRY_ZONE_MAP = Map.ofEntries(
        // ── Maghreb / Afrique du Nord ─────────────────────────────────────
        Map.entry("504", ZoneId.of("Africa/Casablanca")),     // Maroc
        Map.entry("012", ZoneId.of("Africa/Algiers")),        // Algérie
        Map.entry("788", ZoneId.of("Africa/Tunis")),          // Tunisie
        Map.entry("434", ZoneId.of("Africa/Tripoli")),        // Libye
        Map.entry("818", ZoneId.of("Africa/Cairo")),          // Égypte
        Map.entry("736", ZoneId.of("Africa/Khartoum")),       // Soudan
        // ── MENA ──────────────────────────────────────────────────────────
        Map.entry("682", ZoneId.of("Asia/Riyadh")),           // Arabie Saoudite
        Map.entry("784", ZoneId.of("Asia/Dubai")),            // EAU
        Map.entry("400", ZoneId.of("Asia/Amman")),            // Jordanie
        Map.entry("422", ZoneId.of("Asia/Beirut")),           // Liban
        Map.entry("275", ZoneId.of("Asia/Gaza")),             // Palestine
        Map.entry("368", ZoneId.of("Asia/Baghdad")),          // Irak
        Map.entry("512", ZoneId.of("Asia/Muscat")),           // Oman
        Map.entry("414", ZoneId.of("Asia/Kuwait")),           // Koweït
        Map.entry("634", ZoneId.of("Asia/Qatar")),            // Qatar
        Map.entry("048", ZoneId.of("Asia/Bahrain")),          // Bahreïn
        Map.entry("887", ZoneId.of("Asia/Aden")),             // Yémen
        Map.entry("364", ZoneId.of("Asia/Tehran")),           // Iran
        // ── Afrique Sub-Saharienne ────────────────────────────────────────
        Map.entry("686", ZoneId.of("Africa/Dakar")),          // Sénégal
        Map.entry("384", ZoneId.of("Africa/Abidjan")),        // Côte d'Ivoire
        Map.entry("566", ZoneId.of("Africa/Lagos")),          // Nigeria
        Map.entry("288", ZoneId.of("Africa/Accra")),          // Ghana
        Map.entry("404", ZoneId.of("Africa/Nairobi")),        // Kenya
        Map.entry("716", ZoneId.of("Africa/Harare")),         // Zimbabwe
        Map.entry("710", ZoneId.of("Africa/Johannesburg")),   // Afrique du Sud
        Map.entry("450", ZoneId.of("Indian/Antananarivo")),   // Madagascar
        Map.entry("174", ZoneId.of("Indian/Comoro")),         // Comores
        Map.entry("462", ZoneId.of("Indian/Maldives")),       // Maldives
        // ── Europe ────────────────────────────────────────────────────────
        Map.entry("250", ZoneId.of("Europe/Paris")),          // France
        Map.entry("826", ZoneId.of("Europe/London")),         // Royaume-Uni
        Map.entry("724", ZoneId.of("Europe/Madrid")),         // Espagne
        Map.entry("276", ZoneId.of("Europe/Berlin")),         // Allemagne
        Map.entry("380", ZoneId.of("Europe/Rome")),           // Italie
        Map.entry("620", ZoneId.of("Europe/Lisbon")),         // Portugal
        Map.entry("056", ZoneId.of("Europe/Brussels")),       // Belgique
        Map.entry("528", ZoneId.of("Europe/Amsterdam")),      // Pays-Bas
        Map.entry("756", ZoneId.of("Europe/Zurich")),         // Suisse
        Map.entry("040", ZoneId.of("Europe/Vienna")),         // Autriche
        Map.entry("300", ZoneId.of("Europe/Athens")),         // Grèce
        Map.entry("792", ZoneId.of("Europe/Istanbul")),       // Turquie
        Map.entry("643", ZoneId.of("Europe/Moscow")),         // Russie
        // ── Amériques ─────────────────────────────────────────────────────
        Map.entry("840", ZoneId.of("America/New_York")),      // USA (EST)
        Map.entry("124", ZoneId.of("America/Toronto")),       // Canada
        Map.entry("484", ZoneId.of("America/Mexico_City")),   // Mexique
        Map.entry("076", ZoneId.of("America/Sao_Paulo")),     // Brésil
        Map.entry("032", ZoneId.of("America/Argentina/Buenos_Aires")), // Argentine
        Map.entry("170", ZoneId.of("America/Bogota")),        // Colombie
        // ── Asie-Pacifique ────────────────────────────────────────────────
        Map.entry("156", ZoneId.of("Asia/Shanghai")),         // Chine
        Map.entry("392", ZoneId.of("Asia/Tokyo")),            // Japon
        Map.entry("410", ZoneId.of("Asia/Seoul")),            // Corée du Sud
        Map.entry("702", ZoneId.of("Asia/Singapore")),        // Singapour
        Map.entry("764", ZoneId.of("Asia/Bangkok")),          // Thaïlande
        Map.entry("458", ZoneId.of("Asia/Kuala_Lumpur")),     // Malaisie
        Map.entry("360", ZoneId.of("Asia/Jakarta")),          // Indonésie
        Map.entry("356", ZoneId.of("Asia/Kolkata")),          // Inde
        Map.entry("036", ZoneId.of("Australia/Sydney"))       // Australie
    );

    // ─── Record résultat ─────────────────────────────────────────────────────

    public record TimeAnalysis(
        String          acquiringCountry,
        String          localTimezone,
        String          transmissionUtcFormatted,
        String          transactionLocalFormatted,
        String          responseTimeFormatted,
        String          transmissionLocalFormatted,
        long            processingTimeMs,
        String          processingTimeLabel,
        long            driftMinutes,
        String          driftAssessment,
        String          timingAnomaly,
        boolean         isSlaBreached,
        String          slaStatus
    ) {}

    // ─── Point d'entrée ──────────────────────────────────────────────────────

    public TimeAnalysis analyze(AutohoActivityAdmEntity entity) {
        String countryCode = sanitize(entity.getAcquiringCountryCode());
        ZoneId localZone   = COUNTRY_ZONE_MAP.getOrDefault(countryCode, ZoneId.of("UTC"));

        LocalDateTime transmission = entity.getTransmissionDateAndTime();
        LocalDateTime response     = entity.getResponseDateAndTime();
        LocalDate     localDate    = entity.getTransactionLocalDate();

        // ─ Calcul latence de traitement (transmission → response)
        long processingMs = 0;
        if (transmission != null && response != null) {
            processingMs = ChronoUnit.MILLIS.between(transmission, response);
            if (processingMs < 0) processingMs = Math.abs(processingMs);
        }
        String processingLabel = formatDuration(processingMs);

        // ─ Dérive : écart entre heure locale et heure transmission centrale
        long driftMin = 0;
        if (localDate != null && transmission != null) {
            LocalDateTime localAsDateTime = localDate.atStartOfDay();
            driftMin = Math.abs(ChronoUnit.MINUTES.between(localAsDateTime, transmission));
        }

        // ─ Anomalie de timing (seuils métier)
        String anomaly = "NORMAL";
        if (driftMin > 1440) {
            anomaly = "DRIFT_CRITIQUE";         // > 24h : replay attack possible
        } else if (driftMin > 180) {
            anomaly = "DRIFT_ELEVE";            // > 3h : décalage timezone suspect
        } else if (processingMs > 30_000) {
            anomaly = "LATENCE_CRITIQUE";       // > 30s : SLA critique dépassé
        } else if (processingMs > 5_000) {
            anomaly = "LATENCE_ELEVEE";         // > 5s : SLA dégradé
        }

        String driftAssessment = assessDrift(driftMin);

        // ─ SLA : seuil standard monétique = 5000ms (P95)
        boolean slaBreached = processingMs > 5_000;
        String  slaStatus   = slaBreached
            ? "SLA_BREACHED (" + processingLabel + " > 5s)"
            : "SLA_OK (" + processingLabel + ")";

        // ─ Formatage avec timezone locale
        String txmFmt    = formatUtc(transmission);
        String txmLocal  = formatInZone(transmission, localZone);
        String respFmt   = formatUtc(response);
        String localFmt  = localDate != null ? localDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "N/A";

        return new TimeAnalysis(
            countryCode,
            localZone.getId(),
            txmFmt,
            localFmt,
            respFmt,
            txmLocal,
            Math.max(processingMs, 0),
            processingLabel,
            driftMin,
            driftAssessment,
            anomaly,
            slaBreached,
            slaStatus
        );
    }

    /**
     * Résout la timezone d'un pays pour l'affichage frontend.
     */
    public String resolveTimezone(String countryCode) {
        return COUNTRY_ZONE_MAP
            .getOrDefault(sanitize(countryCode), ZoneId.of("UTC"))
            .getId();
    }

    /**
     * Convertit une datetime UTC vers l'heure locale d'un pays.
     */
    public String convertToLocalTime(LocalDateTime utcTime, String countryCode) {
        if (utcTime == null) return "N/A";
        ZoneId zone = COUNTRY_ZONE_MAP.getOrDefault(sanitize(countryCode), ZoneId.of("UTC"));
        return utcTime.atZone(ZoneId.of("UTC")).withZoneSameInstant(zone)
            .format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss z"));
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private String formatUtc(LocalDateTime dt) {
        return dt != null ? dt.format(FMT_DISPLAY) + " UTC" : "N/A";
    }

    private String formatInZone(LocalDateTime dt, ZoneId zone) {
        if (dt == null) return "N/A";
        return dt.atZone(ZoneId.of("UTC"))
            .withZoneSameInstant(zone)
            .format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss z"));
    }

    private String formatDuration(long ms) {
        if (ms <= 0)         return "N/A";
        if (ms < 1_000)      return ms + " ms";
        if (ms < 60_000)     return String.format("%.2f s", ms / 1000.0);
        if (ms < 3_600_000)  return String.format("%.1f min", ms / 60_000.0);
        return String.format("%.1f h", ms / 3_600_000.0);
    }

    private String assessDrift(long minutes) {
        if (minutes > 1440) return "CRITIQUE : Dérive > 24h - Risque de replay attack";
        if (minutes > 180)  return "SUSPECT : Dérive > 3h - Vérifier la timezone";
        if (minutes > 60)   return "ATTENTION : Dérive > 1h - Possible décalage timezone";
        if (minutes > 30)   return "NORMAL : Légère dérive (<30 min) tolérée";
        return "NORMAL";
    }

    private String sanitize(String code) {
        return code != null ? code.trim() : "";
    }
}
