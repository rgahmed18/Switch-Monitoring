package com.hps.switchmonitoring.service;

import com.hps.switchmonitoring.api.dto.AutohoActivityAdmDto;
import com.hps.switchmonitoring.domain.AutohoActivityAdmEntity;
import com.hps.switchmonitoring.repository.AutohoActivityAdmRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AutohoActivityAdmServiceTest {

  @Mock private AutohoActivityAdmRepository repository;

  private AutohoActivityAdmService service;

  @BeforeEach
  void setUp() {
    service = new AutohoActivityAdmService(repository);
  }

  // ── getTransactionDetail() ───────────────────────────────────────────────

  @Test
  void getTransactionDetail_devrait_lever_une_exception_si_transaction_introuvable() {
    when(repository.findByReferenceNumberAndInternalStan("REF1", "STAN1"))
        .thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.getTransactionDetail("REF1", "STAN1"))
        .isInstanceOf(NoSuchElementException.class)
        .hasMessageContaining("REF1");
  }

  @Test
  void getTransactionDetail_devrait_retourner_le_dto_correspondant() {
    AutohoActivityAdmEntity entity = new AutohoActivityAdmEntity();
    entity.setReferenceNumber("REF1");
    entity.setInternalStan("STAN1");
    entity.setTransactionAmount(new BigDecimal("150.00"));
    entity.setCardNumber("4111111111111111");

    when(repository.findByReferenceNumberAndInternalStan("REF1", "STAN1"))
        .thenReturn(Optional.of(entity));

    AutohoActivityAdmDto dto = service.getTransactionDetail("REF1", "STAN1");

    assertThat(dto.getReferenceNumber()).isEqualTo("REF1");
    assertThat(dto.getTransactionAmount()).isEqualByComparingTo("150.00");
    // PCI-DSS : le PAN brut ne doit jamais être exposé dans le DTO
    assertThat(dto.getCardNumber()).isNull();
    assertThat(dto.getCardNumberMasked()).isNotBlank();
  }

  // ── getApprovalRate() ────────────────────────────────────────────────────

  @Test
  void getApprovalRate_devrait_retourner_zero_si_aucune_transaction() {
    LocalDate date = LocalDate.of(2026, 7, 1);
    when(repository.countByBusinessDate(date)).thenReturn(0L);

    long rate = service.getApprovalRate(date);

    assertThat(rate).isZero();
  }

  @Test
  void getApprovalRate_devrait_calculer_le_pourcentage_correct() {
    LocalDate date = LocalDate.of(2026, 7, 1);
    when(repository.countByBusinessDate(date)).thenReturn(100L);
    when(repository.countDeclinedByBusinessDate(date)).thenReturn(20L);

    long rate = service.getApprovalRate(date);

    // 80 approuvées sur 100 = 80%
    assertThat(rate).isEqualTo(80L);
  }

  @Test
  void getApprovalRate_devrait_retourner_cent_si_aucun_refus() {
    LocalDate date = LocalDate.of(2026, 7, 1);
    when(repository.countByBusinessDate(date)).thenReturn(50L);
    when(repository.countDeclinedByBusinessDate(date)).thenReturn(0L);

    long rate = service.getApprovalRate(date);

    assertThat(rate).isEqualTo(100L);
  }

  // ── entityToDto() : dérivation réseau depuis reference_number (seed data) ──

  @Test
  void getTransactionDetail_devrait_deriver_visa_pour_le_seed_data_mod_0() {
    AutohoActivityAdmEntity entity = new AutohoActivityAdmEntity();
    entity.setReferenceNumber("99000001"); // 99000001 - 99000000 = 1, mod 10 = 1 -> Visa
    entity.setInternalStan("STAN1");
    entity.setNetworkCode(null); // absent en DB -> dérivation activée

    when(repository.findByReferenceNumberAndInternalStan("99000001", "STAN1"))
        .thenReturn(Optional.of(entity));

    AutohoActivityAdmDto dto = service.getTransactionDetail("99000001", "STAN1");

    assertThat(dto.getNetworkCode()).isEqualTo("01");
    assertThat(dto.getNetworkId()).isEqualTo("VISA");
  }

  @Test
  void getTransactionDetail_devrait_deriver_mastercard_pour_le_seed_data_mod_3() {
    AutohoActivityAdmEntity entity = new AutohoActivityAdmEntity();
    entity.setReferenceNumber("99000004"); // 99000004 - 99000000 = 4, mod 10 = 4 -> MC
    entity.setInternalStan("STAN1");
    entity.setNetworkCode(null);

    when(repository.findByReferenceNumberAndInternalStan("99000004", "STAN1"))
        .thenReturn(Optional.of(entity));

    AutohoActivityAdmDto dto = service.getTransactionDetail("99000004", "STAN1");

    assertThat(dto.getNetworkCode()).isEqualTo("02");
    assertThat(dto.getNetworkId()).isEqualTo("MC  ");
  }

  @Test
  void getTransactionDetail_ne_devrait_pas_ecraser_un_networkCode_deja_present() {
    AutohoActivityAdmEntity entity = new AutohoActivityAdmEntity();
    entity.setReferenceNumber("99000001");
    entity.setInternalStan("STAN1");
    entity.setNetworkCode("03"); // déjà renseigné en DB -> ne pas dériver

    when(repository.findByReferenceNumberAndInternalStan("99000001", "STAN1"))
        .thenReturn(Optional.of(entity));

    AutohoActivityAdmDto dto = service.getTransactionDetail("99000001", "STAN1");

    assertThat(dto.getNetworkCode()).isEqualTo("03");
  }

  // ── getLatestTransactions() : plafond de sécurité ────────────────────────

  @Test
  void getLatestTransactions_devrait_plafonner_la_limite_a_2000() {
    when(repository.findLatestSlice(org.mockito.ArgumentMatchers.any()))
        .thenReturn(List.of());

    service.getLatestTransactions(999_999);

    org.mockito.ArgumentCaptor<org.springframework.data.domain.Pageable> captor =
        org.mockito.ArgumentCaptor.forClass(org.springframework.data.domain.Pageable.class);
    org.mockito.Mockito.verify(repository).findLatestSlice(captor.capture());
    assertThat(captor.getValue().getPageSize()).isEqualTo(2000);
  }
}
