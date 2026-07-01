package com.hps.switchmonitoring.api.dto.geo;

/**
 * Motif de rejet avec catégorie métier (technique vs business).
 */
public record RejectReasonDto(
    String actionCode,
    String rejectCode,
    String descriptionFr,
    String category,      // "TECHNIQUE" | "BUSINESS" | "FRAUDE" | "EXPIRATION"
    long   count,
    double percentage
) {}
