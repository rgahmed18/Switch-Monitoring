package com.hps.switchmonitoring.service.geo;

import com.hps.switchmonitoring.api.dto.geo.ActiveCountryDto;
import com.hps.switchmonitoring.api.dto.geo.ActiveCurrencyDto;
import com.hps.switchmonitoring.api.dto.geo.GeoFilterContextDto;
import com.hps.switchmonitoring.api.dto.geo.MultiZoneVolumeDto;
import com.hps.switchmonitoring.repository.AutohoActivityAdmRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service de filtrage bidirectionnel Pays ↔ Devise.
 *
 * Référentiels embarqués (pas de table de référence externe requise) :
 *   - ISO 3166-1 numérique → libellé pays (80+ entrées zone MENA + monde)
 *   - ISO 4217 numérique → alpha + libellé devise (60+ entrées)
 *
 * Devise pivot : MAD (504) — toutes conversions ramenées en Dirham Marocain.
 */
@Service
public class GeoFilterService {

    private static final String PIVOT_CURRENCY_CODE  = "504";
    private static final String PIVOT_CURRENCY_LABEL = "Dirham Marocain (MAD)";

    private final AutohoActivityAdmRepository repository;

    // ── Référentiel pays ISO 3166-1 numérique ────────────────────────────────
    private static final Map<String, String> COUNTRY_LABELS = new LinkedHashMap<>();
    static {
        // Afrique du Nord / MENA (marché cœur HPS)
        COUNTRY_LABELS.put("504", "Maroc");
        COUNTRY_LABELS.put("012", "Algérie");
        COUNTRY_LABELS.put("788", "Tunisie");
        COUNTRY_LABELS.put("818", "Égypte");
        COUNTRY_LABELS.put("434", "Libye");
        COUNTRY_LABELS.put("682", "Arabie Saoudite");
        COUNTRY_LABELS.put("784", "Émirats Arabes Unis");
        COUNTRY_LABELS.put("634", "Qatar");
        COUNTRY_LABELS.put("414", "Koweït");
        COUNTRY_LABELS.put("048", "Bahreïn");
        COUNTRY_LABELS.put("512", "Oman");
        COUNTRY_LABELS.put("400", "Jordanie");
        COUNTRY_LABELS.put("422", "Liban");
        COUNTRY_LABELS.put("586", "Pakistan");
        COUNTRY_LABELS.put("566", "Nigeria");
        COUNTRY_LABELS.put("288", "Ghana");
        COUNTRY_LABELS.put("276", "Allemagne");
        COUNTRY_LABELS.put("250", "France");
        COUNTRY_LABELS.put("724", "Espagne");
        COUNTRY_LABELS.put("380", "Italie");
        COUNTRY_LABELS.put("826", "Royaume-Uni");
        COUNTRY_LABELS.put("528", "Pays-Bas");
        COUNTRY_LABELS.put("756", "Suisse");
        COUNTRY_LABELS.put("056", "Belgique");
        COUNTRY_LABELS.put("040", "Autriche");
        COUNTRY_LABELS.put("620", "Portugal");
        COUNTRY_LABELS.put("840", "États-Unis");
        COUNTRY_LABELS.put("124", "Canada");
        COUNTRY_LABELS.put("076", "Brésil");
        COUNTRY_LABELS.put("484", "Mexique");
        COUNTRY_LABELS.put("156", "Chine");
        COUNTRY_LABELS.put("356", "Inde");
        COUNTRY_LABELS.put("392", "Japon");
        COUNTRY_LABELS.put("410", "Corée du Sud");
        COUNTRY_LABELS.put("702", "Singapour");
        COUNTRY_LABELS.put("036", "Australie");
        COUNTRY_LABELS.put("710", "Afrique du Sud");
        COUNTRY_LABELS.put("566", "Nigeria");
        COUNTRY_LABELS.put("231", "Éthiopie");
        COUNTRY_LABELS.put("404", "Kenya");
        COUNTRY_LABELS.put("646", "Rwanda");
        COUNTRY_LABELS.put("716", "Zimbabwe");
        COUNTRY_LABELS.put("694", "Sierra Leone");
        COUNTRY_LABELS.put("024", "Angola");
        COUNTRY_LABELS.put("180", "RD Congo");
        COUNTRY_LABELS.put("218", "Équateur");
        COUNTRY_LABELS.put("152", "Chili");
        COUNTRY_LABELS.put("032", "Argentine");
        COUNTRY_LABELS.put("170", "Colombie");
        COUNTRY_LABELS.put("604", "Pérou");
    }

    // ── Référentiel devises ISO 4217 numérique → [alpha, libellé] ────────────
    private static final Map<String, String[]> CURRENCY_META = new LinkedHashMap<>();
    static {
        CURRENCY_META.put("504", new String[]{"MAD", "Dirham Marocain"});
        CURRENCY_META.put("840", new String[]{"USD", "Dollar Américain"});
        CURRENCY_META.put("978", new String[]{"EUR", "Euro"});
        CURRENCY_META.put("826", new String[]{"GBP", "Livre Sterling"});
        CURRENCY_META.put("756", new String[]{"CHF", "Franc Suisse"});
        CURRENCY_META.put("392", new String[]{"JPY", "Yen Japonais"});
        CURRENCY_META.put("156", new String[]{"CNY", "Yuan Renminbi"});
        CURRENCY_META.put("356", new String[]{"INR", "Roupie Indienne"});
        CURRENCY_META.put("682", new String[]{"SAR", "Riyal Saoudien"});
        CURRENCY_META.put("784", new String[]{"AED", "Dirham Émirien"});
        CURRENCY_META.put("414", new String[]{"KWD", "Dinar Koweïtien"});
        CURRENCY_META.put("634", new String[]{"QAR", "Riyal Qatari"});
        CURRENCY_META.put("048", new String[]{"BHD", "Dinar Bahreïni"});
        CURRENCY_META.put("512", new String[]{"OMR", "Rial Omanais"});
        CURRENCY_META.put("400", new String[]{"JOD", "Dinar Jordanien"});
        CURRENCY_META.put("012", new String[]{"DZD", "Dinar Algérien"});
        CURRENCY_META.put("788", new String[]{"TND", "Dinar Tunisien"});
        CURRENCY_META.put("818", new String[]{"EGP", "Livre Égyptienne"});
        CURRENCY_META.put("566", new String[]{"NGN", "Naira Nigérian"});
        CURRENCY_META.put("710", new String[]{"ZAR", "Rand Sud-Africain"});
        CURRENCY_META.put("404", new String[]{"KES", "Shilling Kényan"});
        CURRENCY_META.put("076", new String[]{"BRL", "Real Brésilien"});
        CURRENCY_META.put("124", new String[]{"CAD", "Dollar Canadien"});
        CURRENCY_META.put("484", new String[]{"MXN", "Peso Mexicain"});
        CURRENCY_META.put("036", new String[]{"AUD", "Dollar Australien"});
        CURRENCY_META.put("702", new String[]{"SGD", "Dollar de Singapour"});
        CURRENCY_META.put("410", new String[]{"KRW", "Won Sud-Coréen"});
    }

    public GeoFilterService(AutohoActivityAdmRepository repository) {
        this.repository = repository;
    }

    // ── API publique ──────────────────────────────────────────────────────────

    /**
     * Contexte initial : retourne tous les pays ET toutes les devises actives
     * pour une date, sans aucun filtre préalable.
     */
    public GeoFilterContextDto getInitialContext(LocalDate date) {
        List<Object[]> countryRows   = repository.findActiveCountriesByDate(date);
        List<ActiveCountryDto>  countries  = mapCountryRows(countryRows);
        List<String>            allCodes   = countries.stream()
                                                      .map(ActiveCountryDto::code)
                                                      .collect(Collectors.toList());
        List<ActiveCurrencyDto> currencies = allCodes.isEmpty()
            ? List.of()
            : mapCurrencyRows(repository.findCurrenciesByCountries(date, allCodes), null);
        return new GeoFilterContextDto(countries, currencies,
                                       PIVOT_CURRENCY_CODE, PIVOT_CURRENCY_LABEL);
    }

    /**
     * Filtrage Pays → Devise : après sélection d'un ou plusieurs pays,
     * retourne uniquement les devises utilisées dans ces pays.
     */
    public List<ActiveCurrencyDto> getCurrenciesForCountries(LocalDate date,
                                                              List<String> countryCodes) {
        if (countryCodes == null || countryCodes.isEmpty()) return List.of();
        List<Object[]> rows = repository.findCurrenciesByCountries(date, countryCodes);
        return mapCurrencyRows(rows, null);
    }

    /**
     * Filtrage Devise → Pays : après sélection d'une devise,
     * retourne uniquement les pays qui l'utilisent.
     */
    public List<ActiveCountryDto> getCountriesForCurrency(LocalDate date, String currency) {
        if (currency == null || currency.isBlank()) return List.of();
        List<Object[]> rows = repository.findCountriesByCurrency(date, currency);
        return mapCountryRows(rows);
    }

    /**
     * Volume multi-zone avec montants convertis en MAD (pivot).
     * Utilisé pour les graphiques comparatifs inter-pays.
     */
    public MultiZoneVolumeDto getMultiZoneVolume(LocalDate fromDate, LocalDate toDate,
                                                  List<String> countries,
                                                  List<String> currencies) {
        List<Object[]> rows = repository.findMultiZoneVolume(fromDate, toDate,
                                                              countries, currencies);
        List<MultiZoneVolumeDto.ZoneVolume> volumes = new ArrayList<>();
        for (Object[] row : rows) {
            String     country  = nullStr(row[0]);
            String     currency = nullStr(row[1]);
            long       count    = row[2] != null ? ((Number) row[2]).longValue() : 0L;
            BigDecimal volMad   = row[3] != null ? new BigDecimal(row[3].toString()) : BigDecimal.ZERO;
            volumes.add(new MultiZoneVolumeDto.ZoneVolume(
                country, labelCountry(country),
                currency, labelCurrency(currency),
                count, volMad
            ));
        }
        return new MultiZoneVolumeDto(fromDate, toDate, "MAD", volumes);
    }

    // ── Helpers de mapping ────────────────────────────────────────────────────

    private List<ActiveCountryDto> mapCountryRows(List<Object[]> rows) {
        List<ActiveCountryDto> result = new ArrayList<>();
        for (Object[] row : rows) {
            String code  = nullStr(row[0]);
            long   count = row[1] != null ? ((Number) row[1]).longValue() : 0L;
            if (code != null) {
                result.add(new ActiveCountryDto(code, labelCountry(code), count));
            }
        }
        return result;
    }

    private List<ActiveCurrencyDto> mapCurrencyRows(List<Object[]> rows, String forcedCountry) {
        // Déduplique par devise (plusieurs pays peuvent partager la même devise)
        Map<String, ActiveCurrencyDto> byCode = new LinkedHashMap<>();
        for (Object[] row : rows) {
            String currency = nullStr(row[0]);
            String country  = forcedCountry != null ? forcedCountry : nullStr(row[1]);
            long   count    = row[2] != null ? ((Number) row[2]).longValue() : 0L;
            if (currency == null) continue;
            byCode.merge(currency,
                new ActiveCurrencyDto(currency, alphaCode(currency),
                                      labelCurrency(currency), country, count),
                (a, b) -> new ActiveCurrencyDto(a.isoCode(), a.isoAlpha(),
                                                a.label(), null,
                                                a.transactionCount() + b.transactionCount()));
        }
        return new ArrayList<>(byCode.values());
    }

    // ── Référentiels ─────────────────────────────────────────────────────────

    public static String labelCountry(String code) {
        if (code == null) return "Inconnu";
        return COUNTRY_LABELS.getOrDefault(code.trim(), "Pays " + code);
    }

    public static String labelCurrency(String isoNum) {
        if (isoNum == null) return "N/A";
        String[] meta = CURRENCY_META.get(isoNum.trim());
        return meta != null ? meta[1] + " (" + meta[0] + ")" : "Devise " + isoNum;
    }

    public static String alphaCode(String isoNum) {
        if (isoNum == null) return "???";
        String[] meta = CURRENCY_META.get(isoNum.trim());
        return meta != null ? meta[0] : isoNum;
    }

    private static String nullStr(Object o) {
        return o != null ? o.toString().trim() : null;
    }
}
