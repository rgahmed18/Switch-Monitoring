package com.hps.switchmonitoring.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * Logs de communication socket entre les canaux et le Switch
 * Traçabilité complète des échanges réseau
 */
@Entity
@Table(name = "SOCKET_LOGS")
public class SocketLogEntity implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "TRANSACTION_ID", nullable = false)
    private Long transactionId;

    @Column(name = "LOG_TIMESTAMP", nullable = false)
    private LocalDateTime logTimestamp;

    @Column(name = "CHANNEL", nullable = false, length = 20)
    private String channel; // ATM, POS, ECOM

    @Column(name = "DIRECTION", nullable = false, length = 10)
    private String direction; // INBOUND ou OUTBOUND

    @Column(name = "MESSAGE_TYPE", length = 50)
    private String messageType; // ISO8583, TCP/IP, etc.

    @Column(name = "SOCKET_HOST", length = 100)
    private String socketHost;

    @Column(name = "SOCKET_PORT")
    private Integer socketPort;

    @Column(name = "MESSAGE_LENGTH")
    private Integer messageLength;

    @Column(name = "RESPONSE_TIME_MS")
    private Long responseTimeMs;

    @Column(name = "SOCKET_CONNECT_TIME_MS")
    private Long socketConnectTimeMs;

    @Column(name = "SOCKET_TRANSFER_TIME_MS")
    private Long socketTransferTimeMs;

    @Column(name = "STATUS", nullable = false, length = 20)
    private String status; // SUCCESS, TIMEOUT, ERROR, REFUSED

    @Column(name = "ERROR_CODE", length = 10)
    private String errorCode;

    @Column(name = "ERROR_MESSAGE", length = 4000)
    private String errorMessage;

    @Column(name = "HEX_DUMP", columnDefinition = "CLOB")
    private String hexDump; // Dump hexadécimal du message

    @Column(name = "RETRY_COUNT")
    private Integer retryCount;

    @Column(name = "CREATED_AT", nullable = false)
    private LocalDateTime createdAt;

    // Constructors
    public SocketLogEntity() {
    }

    public SocketLogEntity(Long transactionId, String channel, String direction) {
        this.transactionId = transactionId;
        this.channel = channel;
        this.direction = direction;
        this.logTimestamp = LocalDateTime.now();
        this.createdAt = LocalDateTime.now();
    }

    // Getters & Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(Long transactionId) {
        this.transactionId = transactionId;
    }

    public LocalDateTime getLogTimestamp() {
        return logTimestamp;
    }

    public void setLogTimestamp(LocalDateTime logTimestamp) {
        this.logTimestamp = logTimestamp;
    }

    public String getChannel() {
        return channel;
    }

    public void setChannel(String channel) {
        this.channel = channel;
    }

    public String getDirection() {
        return direction;
    }

    public void setDirection(String direction) {
        this.direction = direction;
    }

    public String getMessageType() {
        return messageType;
    }

    public void setMessageType(String messageType) {
        this.messageType = messageType;
    }

    public String getSocketHost() {
        return socketHost;
    }

    public void setSocketHost(String socketHost) {
        this.socketHost = socketHost;
    }

    public Integer getSocketPort() {
        return socketPort;
    }

    public void setSocketPort(Integer socketPort) {
        this.socketPort = socketPort;
    }

    public Integer getMessageLength() {
        return messageLength;
    }

    public void setMessageLength(Integer messageLength) {
        this.messageLength = messageLength;
    }

    public Long getResponseTimeMs() {
        return responseTimeMs;
    }

    public void setResponseTimeMs(Long responseTimeMs) {
        this.responseTimeMs = responseTimeMs;
    }

    public Long getSocketConnectTimeMs() {
        return socketConnectTimeMs;
    }

    public void setSocketConnectTimeMs(Long socketConnectTimeMs) {
        this.socketConnectTimeMs = socketConnectTimeMs;
    }

    public Long getSocketTransferTimeMs() {
        return socketTransferTimeMs;
    }

    public void setSocketTransferTimeMs(Long socketTransferTimeMs) {
        this.socketTransferTimeMs = socketTransferTimeMs;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
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

    public String getHexDump() {
        return hexDump;
    }

    public void setHexDump(String hexDump) {
        this.hexDump = hexDump;
    }

    public Integer getRetryCount() {
        return retryCount;
    }

    public void setRetryCount(Integer retryCount) {
        this.retryCount = retryCount;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
