package com.hps.switchmonitoring.api.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class CreateSlaSnapshotRequest {

  @NotNull
  private Long slaDefinitionId;
  @NotNull
  private LocalDateTime periodStart;
  @NotNull
  private LocalDateTime periodEnd;
  private BigDecimal successRate;
  private Long avgLatencyMs;
  private Long p95LatencyMs;
  private BigDecimal uptimeRate;
  @NotNull
  private Integer breached;

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
}
