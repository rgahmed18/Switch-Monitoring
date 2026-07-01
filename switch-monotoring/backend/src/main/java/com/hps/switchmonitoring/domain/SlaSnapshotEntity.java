package com.hps.switchmonitoring.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "SLA_SNAPSHOT")
public class SlaSnapshotEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "SLA_DEFINITION_ID", nullable = false)
  private Long slaDefinitionId;

  @Column(name = "PERIOD_START", nullable = false)
  private LocalDateTime periodStart;

  @Column(name = "PERIOD_END", nullable = false)
  private LocalDateTime periodEnd;

  @Column(name = "SUCCESS_RATE")
  private BigDecimal successRate;

  @Column(name = "AVG_LATENCY_MS")
  private Long avgLatencyMs;

  @Column(name = "P95_LATENCY_MS")
  private Long p95LatencyMs;

  @Column(name = "UPTIME_RATE")
  private BigDecimal uptimeRate;

  @Column(name = "BREACHED", nullable = false)
  private Integer breached;

  @Column(name = "CALCULATED_AT", nullable = false)
  private LocalDateTime calculatedAt;

  public Long getId() {
    return id;
  }

  public Long getSlaDefinitionId() {
    return slaDefinitionId;
  }

  public void setSlaDefinitionId(Long slaDefinitionId) {
    this.slaDefinitionId = slaDefinitionId;
  }

  public LocalDateTime getPeriodStart() {
    return periodStart;
  }

  public void setPeriodStart(LocalDateTime periodStart) {
    this.periodStart = periodStart;
  }

  public LocalDateTime getPeriodEnd() {
    return periodEnd;
  }

  public void setPeriodEnd(LocalDateTime periodEnd) {
    this.periodEnd = periodEnd;
  }

  public BigDecimal getSuccessRate() {
    return successRate;
  }

  public void setSuccessRate(BigDecimal successRate) {
    this.successRate = successRate;
  }

  public Long getAvgLatencyMs() {
    return avgLatencyMs;
  }

  public void setAvgLatencyMs(Long avgLatencyMs) {
    this.avgLatencyMs = avgLatencyMs;
  }

  public Long getP95LatencyMs() {
    return p95LatencyMs;
  }

  public void setP95LatencyMs(Long p95LatencyMs) {
    this.p95LatencyMs = p95LatencyMs;
  }

  public BigDecimal getUptimeRate() {
    return uptimeRate;
  }

  public void setUptimeRate(BigDecimal uptimeRate) {
    this.uptimeRate = uptimeRate;
  }

  public Integer getBreached() {
    return breached;
  }

  public void setBreached(Integer breached) {
    this.breached = breached;
  }

  public LocalDateTime getCalculatedAt() {
    return calculatedAt;
  }

  public void setCalculatedAt(LocalDateTime calculatedAt) {
    this.calculatedAt = calculatedAt;
  }
}
