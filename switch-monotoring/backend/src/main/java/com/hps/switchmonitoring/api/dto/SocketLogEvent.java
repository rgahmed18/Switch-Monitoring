package com.hps.switchmonitoring.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * DTO pour les logs socket envoyés à Kafka
 * Audit trail complet des communications socket
 */
public class SocketLogEvent implements Serializable {

  private static final long serialVersionUID = 1L;

  @JsonProperty("id")
  private Long id;

  @JsonProperty("transaction_id")
  private String transactionId;

  @JsonProperty("channel")
  private String channel;

  @JsonProperty("host")
  private String host;

  @JsonProperty("port")
  private Integer port;

  @JsonProperty("retry_count")
  private Integer retryCount;

  @JsonProperty("error_code")
  private String errorCode;

  @JsonProperty("error_message")
  private String errorMessage;

  @JsonProperty("request_hex")
  private String requestHex;

  @JsonProperty("response_hex")
  private String responseHex;

  @JsonProperty("connect_time_ms")
  private Long connectTimeMs;

  @JsonProperty("transfer_time_ms")
  private Long transferTimeMs;

  @JsonProperty("total_time_ms")
  private Long totalTimeMs;

  @JsonProperty("created_at")
  private LocalDateTime createdAt;

  @JsonProperty("event_timestamp")
  private LocalDateTime eventTimestamp;

  // Constructors
  public SocketLogEvent() {
    this.eventTimestamp = LocalDateTime.now();
  }

  public SocketLogEvent(String transactionId, String channel, String host, Integer port) {
    this.transactionId = transactionId;
    this.channel = channel;
    this.host = host;
    this.port = port;
    this.eventTimestamp = LocalDateTime.now();
  }

  // Getters and Setters
  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getTransactionId() {
    return transactionId;
  }

  public void setTransactionId(String transactionId) {
    this.transactionId = transactionId;
  }

  public String getChannel() {
    return channel;
  }

  public void setChannel(String channel) {
    this.channel = channel;
  }

  public String getHost() {
    return host;
  }

  public void setHost(String host) {
    this.host = host;
  }

  public Integer getPort() {
    return port;
  }

  public void setPort(Integer port) {
    this.port = port;
  }

  public Integer getRetryCount() {
    return retryCount;
  }

  public void setRetryCount(Integer retryCount) {
    this.retryCount = retryCount;
  }

  public String getErrorCode() {
    return errorCode;
  }

  public void setErrorCode(String errorCode) {
    this.errorCode = errorCode;
  }

  public String getErrorMessage() {
    return errorMessage;
  }

  public void setErrorMessage(String errorMessage) {
    this.errorMessage = errorMessage;
  }

  public String getRequestHex() {
    return requestHex;
  }

  public void setRequestHex(String requestHex) {
    this.requestHex = requestHex;
  }

  public String getResponseHex() {
    return responseHex;
  }

  public void setResponseHex(String responseHex) {
    this.responseHex = responseHex;
  }

  public Long getConnectTimeMs() {
    return connectTimeMs;
  }

  public void setConnectTimeMs(Long connectTimeMs) {
    this.connectTimeMs = connectTimeMs;
  }

  public Long getTransferTimeMs() {
    return transferTimeMs;
  }

  public void setTransferTimeMs(Long transferTimeMs) {
    this.transferTimeMs = transferTimeMs;
  }

  public Long getTotalTimeMs() {
    return totalTimeMs;
  }

  public void setTotalTimeMs(Long totalTimeMs) {
    this.totalTimeMs = totalTimeMs;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public LocalDateTime getEventTimestamp() {
    return eventTimestamp;
  }

  public void setEventTimestamp(LocalDateTime eventTimestamp) {
    this.eventTimestamp = eventTimestamp;
  }
}
