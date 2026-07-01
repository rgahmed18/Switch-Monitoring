package com.hps.switchmonitoring.service;

import com.hps.switchmonitoring.domain.AlertEventEntity;
import com.hps.switchmonitoring.domain.AutohoActivityAdmEntity;
import java.io.IOException;
import java.util.Iterator;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Service SSE (Server-Sent Events) pour le streaming temps réel
 * Publie les transactions AUTHO_ACTIVITY_ADM et les alertes
 */
@Service
public class StreamService {

  private static final long EMITTER_TIMEOUT_MS = 0L;
  private final List<SseEmitter> transactionEmitters = new CopyOnWriteArrayList<>();
  private final List<SseEmitter> alertEmitters = new CopyOnWriteArrayList<>();

  public SseEmitter subscribeTransactions() {
    SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MS);
    transactionEmitters.add(emitter);
    configureLifecycle(emitter, transactionEmitters);
    sendConnectedEvent(emitter, "transactions-stream-connected");
    return emitter;
  }

  public SseEmitter subscribeAlerts() {
    SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MS);
    alertEmitters.add(emitter);
    configureLifecycle(emitter, alertEmitters);
    sendConnectedEvent(emitter, "alerts-stream-connected");
    return emitter;
  }

  public void publishTransaction(AutohoActivityAdmEntity transaction) {
    broadcastEvent(transactionEmitters, "transaction-created", transaction);
  }

  public void publishAlert(AlertEventEntity alert) {
    broadcastEvent(alertEmitters, "alert-created", alert);
  }

  private void configureLifecycle(SseEmitter emitter, List<SseEmitter> emitterList) {
    emitter.onCompletion(() -> emitterList.remove(emitter));
    emitter.onTimeout(() -> emitterList.remove(emitter));
    emitter.onError(error -> emitterList.remove(emitter));
  }

  private void sendConnectedEvent(SseEmitter emitter, String message) {
    try {
      emitter.send(SseEmitter.event().name("connected").data(message));
    } catch (IOException ex) {
      emitter.completeWithError(ex);
    }
  }

  private void broadcastEvent(List<SseEmitter> emitters, String eventName, Object payload) {
    Iterator<SseEmitter> iterator = emitters.iterator();
    while (iterator.hasNext()) {
      SseEmitter emitter = iterator.next();
      try {
        emitter.send(SseEmitter.event().name(eventName).data(payload));
      } catch (IOException ex) {
        emitter.completeWithError(ex);
        emitters.remove(emitter);
      }
    }
  }
}
