package com.hps.switchmonitoring.service;

import com.hps.switchmonitoring.api.dto.AutohoActivityAdmDto;
import com.hps.switchmonitoring.api.dto.CreateAuthoActivityAdmRequest;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Verifie les invariants des transactions generees par le simulateur live :
 * devise en code alpha ISO 4217 (pas numerique) et posEntryMode toujours
 * renseigne, quel que soit le canal — deux bugs reels trouves lors de
 * l'audit du dashboard (devise numerique brute affichee telle quelle,
 * graphique "Mode d'Entree" toujours vide en donnees live).
 */
class IsoSimulatorTaskTest {

  private static final Set<String> VALID_ALPHA_CURRENCIES =
      Set.of("MAD", "USD", "EUR", "GBP", "SAR", "AED", "DZD", "TND");

  private static final Set<String> VALID_ENTRY_MODES =
      Set.of("01", "02", "05", "07", "81");

  @Test
  void generateSimulatedTransaction_devrait_toujours_utiliser_une_devise_alpha_iso4217() {
    AutohoActivityAdmService serviceMock = mock(AutohoActivityAdmService.class);
    when(serviceMock.createTransaction(any())).thenReturn(mock(AutohoActivityAdmDto.class));

    IsoSimulatorTask task = new IsoSimulatorTask(serviceMock);
    task.generateSimulatedTransaction();

    ArgumentCaptor<CreateAuthoActivityAdmRequest> captor =
        ArgumentCaptor.forClass(CreateAuthoActivityAdmRequest.class);
    verify(serviceMock, times(50)).createTransaction(captor.capture());

    List<CreateAuthoActivityAdmRequest> requests = captor.getAllValues();
    for (CreateAuthoActivityAdmRequest req : requests) {
      assertThat(req.getTransactionCurrency())
          .as("transactionCurrency doit etre un code alpha ISO 4217, pas un code numerique")
          .isIn(VALID_ALPHA_CURRENCIES.toArray());
      assertThat(req.getBillingCurrency()).isEqualTo("MAD");
    }
  }

  @Test
  void generateSimulatedTransaction_devrait_toujours_renseigner_posEntryMode() {
    AutohoActivityAdmService serviceMock = mock(AutohoActivityAdmService.class);
    when(serviceMock.createTransaction(any())).thenReturn(mock(AutohoActivityAdmDto.class));

    IsoSimulatorTask task = new IsoSimulatorTask(serviceMock);
    task.generateSimulatedTransaction();

    ArgumentCaptor<CreateAuthoActivityAdmRequest> captor =
        ArgumentCaptor.forClass(CreateAuthoActivityAdmRequest.class);
    verify(serviceMock, times(50)).createTransaction(captor.capture());

    for (CreateAuthoActivityAdmRequest req : captor.getAllValues()) {
      assertThat(req.getPosEntryMode())
          .as("posEntryMode ne doit jamais etre null (sinon le widget 'Mode d'Entree' du dashboard reste vide)")
          .isNotNull()
          .isIn(VALID_ENTRY_MODES.toArray());
    }
  }

  @Test
  void generateSimulatedTransaction_devrait_s_arreter_a_MAX_TOTAL() {
    AutohoActivityAdmService serviceMock = mock(AutohoActivityAdmService.class);
    when(serviceMock.createTransaction(any())).thenReturn(mock(AutohoActivityAdmDto.class));

    IsoSimulatorTask task = new IsoSimulatorTask(serviceMock);
    for (int i = 0; i < 50; i++) {
      task.generateSimulatedTransaction();
    }

    assertThat(task.getGenerated()).isEqualTo(2000);

    task.generateSimulatedTransaction();
    verify(serviceMock, times(2000)).createTransaction(any());
  }

  @Test
  void resetCounter_devrait_remettre_generated_a_zero() {
    AutohoActivityAdmService serviceMock = mock(AutohoActivityAdmService.class);
    when(serviceMock.createTransaction(any())).thenReturn(mock(AutohoActivityAdmDto.class));

    IsoSimulatorTask task = new IsoSimulatorTask(serviceMock);
    task.generateSimulatedTransaction();
    assertThat(task.getGenerated()).isEqualTo(50);

    task.resetCounter();

    assertThat(task.getGenerated()).isEqualTo(0);
  }
}
