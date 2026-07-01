package com.hps.switchmonitoring.service;

import com.hps.switchmonitoring.api.dto.SocketLogEvent;
import com.hps.switchmonitoring.domain.SocketLogEntity;
import com.hps.switchmonitoring.repository.SocketLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.*;
import java.net.Socket;
import java.net.SocketException;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Service pour gérer la communication socket avec les canaux (ATM, POS, ECOM)
 * Traçabilité complète des échanges réseau via SocketLogEntity
 * Intégration Kafka pour la propagation des logs socket vers d'autres services
 */
@Service
public class SocketCommunicationService {

    private static final Logger logger = LoggerFactory.getLogger(SocketCommunicationService.class);

    @Autowired
    private SocketLogRepository socketLogRepository;

    @Autowired
    private KafkaProducerService kafkaProducerService;

    // Configuration des canaux
    private static final String ATM_HOST = "atm.switch.local";
    private static final int ATM_PORT = 8081;
    private static final int SOCKET_CONNECT_TIMEOUT_MS = 5000;
    private static final int SOCKET_READ_TIMEOUT_MS = 30000;
    private static final int MAX_RETRIES = 3;

    private static final String POS_HOST = "pos.switch.local";
    private static final int POS_PORT = 8082;

    private static final String ECOM_HOST = "ecom.switch.local";
    private static final int ECOM_PORT = 8083;

    /**
     * Envoie un message ISO 8583 via socket et reçoit la réponse
     * @param transactionId ID de la transaction
     * @param channel Canal (ATM, POS, ECOM)
     * @param isoMessage Message ISO 8583
     * @return Réponse du serveur
     */
    public SocketCommunicationResult sendIsoMessage(Long transactionId, String channel, String isoMessage) {
        SocketCommunicationResult result = new SocketCommunicationResult();
        int retryCount = 0;

        while (retryCount < MAX_RETRIES) {
            try {
                result = attemptSocketConnection(transactionId, channel, isoMessage, retryCount);
                
                if (result.isSuccessful()) {
                    logger.info("[{}] Transaction {} - Socket communication successful on attempt {}", 
                        channel, transactionId, retryCount + 1);
                    return result;
                }

                retryCount++;
                if (retryCount < MAX_RETRIES) {
                    logger.warn("[{}] Transaction {} - Retrying socket connection (attempt {})", 
                        channel, transactionId, retryCount + 1);
                    Thread.sleep(1000 * retryCount); // Exponential backoff
                }

            } catch (InterruptedException e) {
                logger.error("[{}] InterruptedException during socket retry for transaction {}", 
                    channel, transactionId, e);
                Thread.currentThread().interrupt();
                return result.withError("INTERRUPTED", "Socket communication interrupted");
            }
        }

        result.setRetryCount(retryCount);
        logger.error("[{}] Transaction {} - Socket communication failed after {} retries", 
            channel, transactionId, MAX_RETRIES);
        return result;
    }

    /**
     * Tente une connexion socket unique
     */
    private SocketCommunicationResult attemptSocketConnection(Long transactionId, String channel, 
                                                             String isoMessage, int retryAttempt) {
        SocketCommunicationResult result = new SocketCommunicationResult();
        SocketLogEntity socketLog = new SocketLogEntity(transactionId, channel, "OUTBOUND");

        Socket socket = null;
        long connectStartTime = System.currentTimeMillis();

        try {
            // 1. Resolve host and port
            String[] hostPort = getChannelEndpoint(channel);
            String host = hostPort[0];
            int port = Integer.parseInt(hostPort[1]);

            socketLog.setSocketHost(host);
            socketLog.setSocketPort(port);
            socketLog.setRetryCount(retryAttempt);

            // 2. Create and configure socket
            socket = new Socket();
            socket.connect(new java.net.InetSocketAddress(host, port), SOCKET_CONNECT_TIMEOUT_MS);
            socket.setSoTimeout(SOCKET_READ_TIMEOUT_MS);

            long connectTime = System.currentTimeMillis() - connectStartTime;
            socketLog.setSocketConnectTimeMs(connectTime);

            logger.info("[{}] Socket connected to {}:{} in {} ms", 
                channel, host, port, connectTime);

            // 3. Send ISO message
            OutputStream out = socket.getOutputStream();
            byte[] messageBytes = isoMessage.getBytes(StandardCharsets.UTF_8);
            out.write(messageBytes);
            out.flush();

            socketLog.setMessageType("ISO8583");
            socketLog.setMessageLength(messageBytes.length);
            socketLog.setHexDump(bytesToHex(messageBytes));

            logger.debug("[{}] Sent {} bytes to socket", channel, messageBytes.length);

            // 4. Receive response
            long transferStartTime = System.currentTimeMillis();
            InputStream in = socket.getInputStream();
            ByteArrayOutputStream responseBuffer = new ByteArrayOutputStream();

            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = in.read(buffer)) != -1) {
                responseBuffer.write(buffer, 0, bytesRead);
            }

            long transferTime = System.currentTimeMillis() - transferStartTime;
            socketLog.setSocketTransferTimeMs(transferTime);

            String responseMessage = responseBuffer.toString(StandardCharsets.UTF_8);
            result.setResponseMessage(responseMessage);
            result.setSuccess(true);
            socketLog.setStatus("SUCCESS");

            logger.info("[{}] Received {} bytes from socket in {} ms", 
                channel, responseBuffer.size(), transferTime);

        } catch (SocketTimeoutException e) {
            socketLog.setStatus("TIMEOUT");
            socketLog.setErrorCode("SOCK_TIMEOUT");
            socketLog.setErrorMessage(e.getMessage());
            result.withError("TIMEOUT", "Socket timeout after " + SOCKET_READ_TIMEOUT_MS + "ms");
            logger.warn("[{}] Socket timeout for transaction {}", channel, transactionId, e);

        } catch (SocketException e) {
            socketLog.setStatus("ERROR");
            socketLog.setErrorCode("SOCK_ERROR");
            socketLog.setErrorMessage(e.getMessage());
            result.withError("SOCKET_ERROR", e.getMessage());
            logger.error("[{}] Socket error for transaction {}", channel, transactionId, e);

        } catch (IOException e) {
            socketLog.setStatus("ERROR");
            socketLog.setErrorCode("IO_ERROR");
            socketLog.setErrorMessage(e.getMessage());
            result.withError("IO_ERROR", e.getMessage());
            logger.error("[{}] I/O error for transaction {}", channel, transactionId, e);

        } catch (Exception e) {
            socketLog.setStatus("ERROR");
            socketLog.setErrorCode("UNKNOWN");
            socketLog.setErrorMessage(e.getMessage());
            result.withError("UNKNOWN_ERROR", e.getMessage());
            logger.error("[{}] Unexpected error for transaction {}", channel, transactionId, e);

        } finally {
            // Log the socket communication to database
            socketLog.setLogTimestamp(LocalDateTime.now());
            SocketLogEntity savedLog = socketLogRepository.save(socketLog);
            logger.debug("Socket log saved to database: {}", savedLog.getId());

            // Publish socket log event to Kafka for other services to consume
            try {
                SocketLogEvent logEvent = convertEntityToEvent(socketLog);
                kafkaProducerService.publishSocketLog(logEvent);
                logger.debug("Socket log event published to Kafka: {}", logEvent.getTransactionId());
            } catch (Exception e) {
                logger.error("Error publishing socket log to Kafka: {}", socketLog.getTransactionId(), e);
            }

            // Close socket
            if (socket != null && !socket.isClosed()) {
                try {
                    socket.close();
                } catch (IOException e) {
                    logger.error("Error closing socket", e);
                }
            }
        }

        return result;
    }

    /**
     * Récupère l'endpoint (host:port) pour un canal
     */
    private String[] getChannelEndpoint(String channel) {
        switch (channel.toUpperCase()) {
            case "ATM":
                return new String[]{ ATM_HOST, String.valueOf(ATM_PORT) };
            case "POS":
                return new String[]{ POS_HOST, String.valueOf(POS_PORT) };
            case "ECOM":
                return new String[]{ ECOM_HOST, String.valueOf(ECOM_PORT) };
            default:
                throw new IllegalArgumentException("Unknown channel: " + channel);
        }
    }

    /**
     * Convertit un array de bytes en hexadécimal
     */
    private String bytesToHex(byte[] bytes) {
        StringBuilder hexString = new StringBuilder();
        for (byte b : bytes) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex).append(' ');
        }
        return hexString.toString();
    }

    /**
     * Récupère l'historique des logs socket pour une transaction
     */
    public List<SocketLogEntity> getSocketLogs(Long transactionId) {
        return socketLogRepository.findByTransactionIdOrderByLogTimestampDesc(transactionId);
    }

    /**
     * Convertit une entité SocketLogEntity en événement Kafka SocketLogEvent
     */
    private SocketLogEvent convertEntityToEvent(SocketLogEntity entity) {
        SocketLogEvent event = new SocketLogEvent();
        event.setId(entity.getId());
    event.setTransactionId(String.valueOf(entity.getTransactionId()));
        event.setRequestHex(entity.getHexDump());
        event.setConnectTimeMs(entity.getSocketConnectTimeMs());
        event.setTransferTimeMs(entity.getSocketTransferTimeMs());
        event.setTotalTimeMs(entity.getSocketConnectTimeMs() != null && entity.getSocketTransferTimeMs() != null 
            ? entity.getSocketConnectTimeMs() + entity.getSocketTransferTimeMs() 
            : null);
        event.setCreatedAt(entity.getLogTimestamp());
        event.setEventTimestamp(LocalDateTime.now());
        return event;
    }

    // ========== SOCKET COMMUNICATION RESULT CLASS ==========

    public static class SocketCommunicationResult {
        private boolean success;
        private String responseMessage;
        private String errorCode;
        private String errorMessage;
        private int retryCount;

        public SocketCommunicationResult() {
            this.success = false;
            this.retryCount = 0;
        }

        public SocketCommunicationResult(boolean success) {
            this.success = success;
        }

        public boolean isSuccessful() {
            return success;
        }

        public void setSuccess(boolean success) {
            this.success = success;
        }

        public String getResponseMessage() {
            return responseMessage;
        }

        public void setResponseMessage(String responseMessage) {
            this.responseMessage = responseMessage;
        }

        public String getErrorCode() {
            return errorCode;
        }

        public String getErrorMessage() {
            return errorMessage;
        }

        public SocketCommunicationResult withError(String errorCode, String errorMessage) {
            this.errorCode = errorCode;
            this.errorMessage = errorMessage;
            this.success = false;
            return this;
        }

        public int getRetryCount() {
            return retryCount;
        }

        public void setRetryCount(int retryCount) {
            this.retryCount = retryCount;
        }

        @Override
        public String toString() {
            return "SocketCommunicationResult{" +
                    "success=" + success +
                    ", errorCode='" + errorCode + '\'' +
                    ", errorMessage='" + errorMessage + '\'' +
                    ", retryCount=" + retryCount +
                    '}';
        }
    }
}
