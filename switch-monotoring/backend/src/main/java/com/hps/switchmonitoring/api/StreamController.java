package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.service.StreamService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1/stream")
@Tag(name = "Flux Temps Reel (SSE)", description = "Flux Server-Sent Events pour la mise a jour temps reel du dashboard, sans polling")
@SecurityRequirements // lecture ouverte a tout utilisateur authentifie cote frontend
public class StreamController {

  private final StreamService streamService;

  public StreamController(StreamService streamService) {
    this.streamService = streamService;
  }

  @Operation(
      summary = "S'abonner au flux temps reel des nouvelles transactions",
      description = """
          Ouvre une connexion Server-Sent Events (`text/event-stream`) qui reste active tant que le client \
          ne la ferme pas. Chaque nouvelle transaction inseree en base est poussee au client sous forme \
          d'evenement `message` contenant le DTO de la transaction serialise en JSON. Utilise par le \
          Dashboard pour afficher les transactions en direct sans interroger l'API en boucle (polling). \
          Note : cet endpoint ne peut pas etre teste via le bouton "Try it out" de Swagger UI (flux infini) — \
          utilisez `curl -N` ou EventSource cote navigateur.""")
  @ApiResponse(responseCode = "200", description = "Flux SSE ouvert. Chaque evenement transporte une transaction au format JSON.",
      content = @Content(mediaType = MediaType.TEXT_EVENT_STREAM_VALUE,
          examples = @ExampleObject(value = """
              data: {"transactionId": "TXN20260715112233", "referenceNumber": "251960123456", "transactionAmount": 1250.00, "responseCode": "00"}
              """)))
  @GetMapping(path = "/transactions", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter streamTransactions() {
    return streamService.subscribeTransactions();
  }

  @Operation(
      summary = "S'abonner au flux temps reel des alertes",
      description = """
          Ouvre une connexion Server-Sent Events (`text/event-stream`) qui pousse chaque nouvelle alerte \
          (SLA depasse, zone en etat CRITICAL, anomalie detectee) des qu'elle est generee cote serveur. \
          Utilise par le panneau d'alertes du frontend pour une notification instantanee. \
          Note : cet endpoint ne peut pas etre teste via le bouton "Try it out" de Swagger UI (flux infini) — \
          utilisez `curl -N` ou EventSource cote navigateur.""")
  @ApiResponse(responseCode = "200", description = "Flux SSE ouvert. Chaque evenement transporte une alerte au format JSON.",
      content = @Content(mediaType = MediaType.TEXT_EVENT_STREAM_VALUE,
          examples = @ExampleObject(value = """
              data: {"id": 42, "severity": "CRITICAL", "message": "Zone USA: taux d'approbation sous le seuil (61%)", "createdAt": "2026-07-15T11:22:33"}
              """)))
  @GetMapping(path = "/alerts", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter streamAlerts() {
    return streamService.subscribeAlerts();
  }
}
