package com.hps.switchmonitoring.service.currency;

import com.hps.switchmonitoring.domain.AutohoActivityAdmEntity;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifie l'analyse multi-devise (transaction/billing/settlement ISS/ACQ) :
 * detection du type de flux FX, variance de taux de change, ecart de
 * settlement et respect du SLA J+1.
 */
class CurrencyIntelligenceServiceTest {

  private final CurrencyIntelligenceService service = new CurrencyIntelligenceService();

  private AutohoActivityAdmEntity sameCurrencyEntity() {
    AutohoActivityAdmEntity e = new AutohoActivityAdmEntity();
    e.setTransactionAmount(new BigDecimal("100"));
    e.setTransactionCurrency("504");
    e.setBillingAmount(new BigDecimal("100"));
    e.setBillingCurrency("504");
    e.setConversionRate(BigDecimal.ONE);
    e.setBusinessDate(LocalDate.now());
    return e;
  }

  // ── Type de flux FX ──────────────────────────────────────────────────────

  @Test
  void analyze_devrait_detecter_SAME_CURRENCY_quand_toutes_les_couches_correspondent() {
    var result = service.analyze(sameCurrencyEntity());

    assertThat(result.fxType()).isEqualTo("SAME_CURRENCY");
  }

  @Test
  void analyze_devrait_detecter_CROSS_CURRENCY_entre_transaction_et_billing() {
    AutohoActivityAdmEntity e = sameCurrencyEntity();
    e.setBillingCurrency("840"); // USD different de MAD (transaction)

    var result = service.analyze(e);

    assertThat(result.fxType()).isEqualTo("CROSS_CURRENCY");
  }

  @Test
  void analyze_devrait_detecter_SETTLEMENT_FX_entre_billing_et_iss() {
    AutohoActivityAdmEntity e = sameCurrencyEntity();
    e.setIssSettlementAmount(new BigDecimal("100"));
    e.setIssSettlementCurrency("840"); // different de billing (504)

    var result = service.analyze(e);

    assertThat(result.fxType()).isEqualTo("SETTLEMENT_FX");
  }

  @Test
  void analyze_devrait_detecter_MULTI_FX_COMPLEX_sur_3_devises_distinctes() {
    AutohoActivityAdmEntity e = sameCurrencyEntity();
    e.setBillingCurrency("840");             // tx(504) != billing(840)
    e.setIssSettlementAmount(new BigDecimal("100"));
    e.setIssSettlementCurrency("978");       // billing(840) != iss(978)

    var result = service.analyze(e);

    assertThat(result.fxType()).isEqualTo("MULTI_FX_COMPLEX");
  }

  // ── Variance de taux ─────────────────────────────────────────────────────

  @Test
  void analyze_devrait_marquer_normal_une_variance_sous_1pct() {
    var result = service.analyze(sameCurrencyEntity());

    assertThat(result.rateVariance().isAnomaly()).isFalse();
  }

  @Test
  void analyze_devrait_detecter_une_anomalie_de_taux_au_dela_de_1pct() {
    AutohoActivityAdmEntity e = sameCurrencyEntity();
    e.setTransactionAmount(new BigDecimal("100"));
    e.setTransactionCurrency("504");
    e.setBillingAmount(new BigDecimal("150")); // ecart massif vs taux applique 1:1
    e.setBillingCurrency("840");
    e.setConversionRate(BigDecimal.ONE);

    var result = service.analyze(e);

    assertThat(result.rateVariance().isAnomaly()).isTrue();
    assertThat(result.anomalies()).anyMatch(a -> a.contains("TAUX_SUSPECT"));
  }

  @Test
  void analyze_ne_devrait_pas_calculer_de_variance_sans_taux_applique() {
    AutohoActivityAdmEntity e = sameCurrencyEntity();
    e.setConversionRate(null);

    var result = service.analyze(e);

    assertThat(result.rateVariance().isAnomaly()).isFalse();
    assertThat(result.rateVariance().assessment()).contains("Pas de conversion");
  }

  // ── Ecart settlement ISS/ACQ ─────────────────────────────────────────────

  @Test
  void analyze_devrait_calculer_lecart_ISS_ACQ_meme_devise() {
    AutohoActivityAdmEntity e = sameCurrencyEntity();
    e.setIssSettlementAmount(new BigDecimal("100"));
    e.setIssSettlementCurrency("504");
    e.setAcqSettlementAmount(new BigDecimal("98"));
    e.setAcqSettlementCurrency("504");

    var result = service.analyze(e);

    assertThat(result.settlementGap().sameCurrency()).isTrue();
    assertThat(result.settlementGap().gap()).isEqualByComparingTo("2");
  }

  @Test
  void analyze_devrait_signaler_des_devises_ISS_ACQ_differentes() {
    AutohoActivityAdmEntity e = sameCurrencyEntity();
    e.setIssSettlementAmount(new BigDecimal("100"));
    e.setIssSettlementCurrency("504");
    e.setAcqSettlementAmount(new BigDecimal("100"));
    e.setAcqSettlementCurrency("840");

    var result = service.analyze(e);

    assertThat(result.settlementGap().sameCurrency()).isFalse();
    assertThat(result.anomalies()).anyMatch(a -> a.contains("DEVISE_MIXTE"));
  }

  // ── Statut de settlement / SLA ───────────────────────────────────────────

  @Test
  void analyze_devrait_marquer_FULLY_SETTLED_si_iss_et_acq_regles() {
    AutohoActivityAdmEntity e = sameCurrencyEntity();
    e.setIssSettlementDate(LocalDate.now());
    e.setAcqSettlementDate(LocalDate.now());

    var result = service.analyze(e);

    assertThat(result.settlementStatus().status()).isEqualTo("FULLY_SETTLED");
    assertThat(result.settlementStatus().isSlaBreached()).isFalse();
  }

  @Test
  void analyze_devrait_detecter_un_breach_SLA_apres_j_plus_1_sans_settlement() {
    AutohoActivityAdmEntity e = sameCurrencyEntity();
    e.setBusinessDate(LocalDate.now().minusDays(5));
    // ni iss ni acq settled

    var result = service.analyze(e);

    assertThat(result.settlementStatus().isSlaBreached()).isTrue();
    assertThat(result.anomalies()).anyMatch(a -> a.contains("SLA_BREACH"));
  }

  @Test
  void analyze_devrait_marquer_ISS_SETTLED_ACQ_PENDING() {
    AutohoActivityAdmEntity e = sameCurrencyEntity();
    e.setIssSettlementDate(LocalDate.now());
    e.setAcqSettlementDate(null);

    var result = service.analyze(e);

    assertThat(result.settlementStatus().status()).isEqualTo("ISS_SETTLED_ACQ_PENDING");
  }

  // ── Frais totaux ──────────────────────────────────────────────────────────

  @Test
  void analyze_devrait_sommer_tous_les_frais_disponibles() {
    AutohoActivityAdmEntity e = sameCurrencyEntity();
    e.setTransactionFee(new BigDecimal("1.5"));
    e.setIssSettlementFee(new BigDecimal("0.5"));
    e.setAcqSettlementFee(new BigDecimal("0.3"));

    var result = service.analyze(e);

    assertThat(result.totalFees()).isEqualByComparingTo("2.300");
  }

  @Test
  void analyze_devrait_gerer_des_frais_absents_comme_zero() {
    AutohoActivityAdmEntity e = sameCurrencyEntity();

    var result = service.analyze(e);

    assertThat(result.totalFees()).isEqualByComparingTo("0");
  }

  // ── Recommandations ──────────────────────────────────────────────────────

  @Test
  void analyze_devrait_recommander_conformite_sans_anomalie() {
    var result = service.analyze(sameCurrencyEntity());

    assertThat(result.recommendations())
        .contains("Aucune anomalie de change détectée - Transaction conforme");
  }

  @Test
  void analyze_devrait_recommander_verification_taux_sur_anomalie() {
    AutohoActivityAdmEntity e = sameCurrencyEntity();
    e.setBillingAmount(new BigDecimal("150"));
    e.setBillingCurrency("840");
    e.setConversionRate(BigDecimal.ONE);

    var result = service.analyze(e);

    assertThat(result.recommendations())
        .anyMatch(r -> r.contains("taux de change"));
  }

  // ── Libelles devise ───────────────────────────────────────────────────────

  @Test
  void analyze_devrait_fournir_le_libelle_de_la_devise_transaction() {
    var result = service.analyze(sameCurrencyEntity());

    assertThat(result.transactionLayer().currencyLabel()).isEqualTo("MAD - Dirham Marocain");
  }

  @Test
  void analyze_devrait_gerer_une_couche_sans_donnees() {
    AutohoActivityAdmEntity e = new AutohoActivityAdmEntity();

    var result = service.analyze(e);

    assertThat(result.transactionLayer().hasData()).isFalse();
    assertThat(result.transactionLayer().currencyLabel()).isEqualTo("N/A");
  }
}
