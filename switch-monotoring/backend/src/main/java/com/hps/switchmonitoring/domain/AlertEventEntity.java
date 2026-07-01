package com.hps.switchmonitoring.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "ALERT_EVENT")
public class AlertEventEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "RULE_ID")
  private Long ruleId;

  @Column(name = "TX_ID")
  private Long transactionId;

  @Column(name = "TYPE", nullable = false, length = 50)
  private String type;

  @Column(name = "SEVERITY", nullable = false, length = 20)
  private String severity;

  @Column(name = "TITLE", nullable = false, length = 180)
  private String title;

  @Column(name = "DETAILS", length = 1000)
  private String details;

  @Column(name = "STATUS", nullable = false, length = 20)
  private String status;

  @Column(name = "CREATED_AT", nullable = false)
  private LocalDateTime createdAt;

  @Column(name = "ACK_BY")
  private Long ackBy;

  @Column(name = "ACK_AT")
  private LocalDateTime ackAt;

  @Column(name = "RESOLVED_BY")
  private Long resolvedBy;

  @Column(name = "RESOLVED_AT")
  private LocalDateTime resolvedAt;

  public Long getId() {
    return id;
  }

  public Long getRuleId() {
    return ruleId;
  }

  public void setRuleId(Long ruleId) {
    this.ruleId = ruleId;
  }

  public Long getTransactionId() {
    return transactionId;
  }

  public void setTransactionId(Long transactionId) {
    this.transactionId = transactionId;
  }

  public String getType() {
    return type;
  }

  public void setType(String type) {
    this.type = type;
  }

  public String getSeverity() {
    return severity;
  }

  public void setSeverity(String severity) {
    this.severity = severity;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getDetails() {
    return details;
  }

  public void setDetails(String details) {
    this.details = details;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public Long getAckBy() {
    return ackBy;
  }

  public void setAckBy(Long ackBy) {
    this.ackBy = ackBy;
  }

  public LocalDateTime getAckAt() {
    return ackAt;
  }

  public void setAckAt(LocalDateTime ackAt) {
    this.ackAt = ackAt;
  }

  public Long getResolvedBy() {
    return resolvedBy;
  }

  public void setResolvedBy(Long resolvedBy) {
    this.resolvedBy = resolvedBy;
  }

  public LocalDateTime getResolvedAt() {
    return resolvedAt;
  }

  public void setResolvedAt(LocalDateTime resolvedAt) {
    this.resolvedAt = resolvedAt;
  }
}
