package com.hps.switchmonitoring.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * DTO pour l'événement Alert envoyé/reçu via Kafka
 * Utilisé pour la sérialisation JSON vers les topics Kafka
 */
public class AlertEvent implements Serializable {

  private static final long serialVersionUID = 1L;

  @JsonProperty("id")
  private Long id;

  @JsonProperty("alert_type")
  private String alertType;

  @JsonProperty("severity")
  private String severity;

  @JsonProperty("status")
  private String status;

  @JsonProperty("message")
  private String message;

  @JsonProperty("rule_id")
  private String ruleId;

  @JsonProperty("transaction_id")
  private Long transactionId;

  @JsonProperty("created_at")
  private LocalDateTime createdAt;

  @JsonProperty("updated_at")
  private LocalDateTime updatedAt;

  @JsonProperty("acknowledged_at")
  private LocalDateTime acknowledgedAt;

  @JsonProperty("resolved_at")
  private LocalDateTime resolvedAt;

  @JsonProperty("channel")
  private String channel;

  @JsonProperty("zone")
  private String zone;

  @JsonProperty("event_timestamp")
  private LocalDateTime eventTimestamp;

  // Constructors
  public AlertEvent() {
    this.eventTimestamp = LocalDateTime.now();
  }

  public AlertEvent(Long id, String alertType, String severity, String status, 
      String message, String ruleId, Long transactionId, LocalDateTime createdAt) {
    this.id = id;
    this.alertType = alertType;
    this.severity = severity;
    this.status = status;
    this.message = message;
    this.ruleId = ruleId;
    this.transactionId = transactionId;
    this.createdAt = createdAt;
    this.eventTimestamp = LocalDateTime.now();
  }

  // Getters and Setters
  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getAlertType() {
    return alertType;
  }

  public void setAlertType(String alertType) {
    this.alertType = alertType;
  }

  public String getSeverity() {
    return severity;
  }

  public void setSeverity(String severity) {
    this.severity = severity;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public String getMessage() {
    return message;
  }

  public void setMessage(String message) {
    this.message = message;
  }

  public String getRuleId() {
    return ruleId;
  }

  public void setRuleId(String ruleId) {
    this.ruleId = ruleId;
  }

  public Long getTransactionId() {
    return transactionId;
  }

  public void setTransactionId(Long transactionId) {
    this.transactionId = transactionId;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public LocalDateTime getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(LocalDateTime updatedAt) {
    this.updatedAt = updatedAt;
  }

  public LocalDateTime getAcknowledgedAt() {
    return acknowledgedAt;
  }

  public void setAcknowledgedAt(LocalDateTime acknowledgedAt) {
    this.acknowledgedAt = acknowledgedAt;
  }

  public LocalDateTime getResolvedAt() {
    return resolvedAt;
  }

  public void setResolvedAt(LocalDateTime resolvedAt) {
    this.resolvedAt = resolvedAt;
  }

  public String getChannel() {
    return channel;
  }

  public void setChannel(String channel) {
    this.channel = channel;
  }

  public String getZone() {
    return zone;
  }

  public void setZone(String zone) {
    this.zone = zone;
  }

  public LocalDateTime getEventTimestamp() {
    return eventTimestamp;
  }

  public void setEventTimestamp(LocalDateTime eventTimestamp) {
    this.eventTimestamp = eventTimestamp;
  }
}
