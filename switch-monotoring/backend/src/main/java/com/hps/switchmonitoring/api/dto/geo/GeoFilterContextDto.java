package com.hps.switchmonitoring.api.dto.geo;

import java.util.List;

/**
 * Contexte de filtre bidirectionnel retourné au frontend.
 * Un seul appel retourne pays ET devises cohérents entre eux.
 */
public record GeoFilterContextDto(
    List<ActiveCountryDto>  availableCountries,
    List<ActiveCurrencyDto> availableCurrencies,
    String                  pivotCurrency,        // toujours "504" (MAD)
    String                  pivotCurrencyLabel    // "Dirham Marocain (MAD)"
) {}
