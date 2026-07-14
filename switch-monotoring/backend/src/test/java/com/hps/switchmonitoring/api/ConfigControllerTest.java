package com.hps.switchmonitoring.api;

import com.hps.switchmonitoring.repository.AppUserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Teste ConfigController, qui expose les referentiels statiques de
 * PaymentSystemConfiguration (zones, banques, types de transaction, codes
 * reponse, methodes de securite) sans dependance a mocker.
 */
@WebMvcTest(ConfigController.class)
class ConfigControllerTest {

  @Autowired private MockMvc mockMvc;

  @MockBean private AppUserRepository appUserRepository;

  @Test
  void getZonesAndCountries_devrait_retourner_200_avec_les_zones() throws Exception {
    mockMvc.perform(get("/api/v1/config/zones"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.Europe").isArray());
  }

  @Test
  void getCountriesByZone_devrait_retourner_200_pour_une_zone_connue() throws Exception {
    mockMvc.perform(get("/api/v1/config/zones/Europe"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.zone").value("Europe"))
        .andExpect(jsonPath("$.countries").isArray());
  }

  @Test
  void getCountriesByZone_devrait_retourner_400_pour_une_zone_inconnue() throws Exception {
    mockMvc.perform(get("/api/v1/config/zones/Atlantide"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").exists());
  }

  @Test
  void getBanksByCountry_devrait_retourner_400_pour_un_pays_inconnu() throws Exception {
    mockMvc.perform(get("/api/v1/config/banks/Narnia"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void getAllBanks_devrait_retourner_200() throws Exception {
    mockMvc.perform(get("/api/v1/config/banks-all"))
        .andExpect(status().isOk());
  }

  @Test
  void getBanksByZone_devrait_retourner_200_pour_une_zone_connue() throws Exception {
    mockMvc.perform(get("/api/v1/config/banks-zone/Europe"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.zone").value("Europe"));
  }

  @Test
  void getBanksByZone_devrait_retourner_400_pour_une_zone_inconnue() throws Exception {
    mockMvc.perform(get("/api/v1/config/banks-zone/Atlantide"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void getTransactionTypes_devrait_retourner_200() throws Exception {
    mockMvc.perform(get("/api/v1/config/transaction-types"))
        .andExpect(status().isOk());
  }

  @Test
  void getTransactionTypesByChannel_devrait_retourner_200_pour_ATM() throws Exception {
    mockMvc.perform(get("/api/v1/config/transaction-types-channel/ATM"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.channel").value("ATM"))
        .andExpect(jsonPath("$.transactionTypes").isArray());
  }

  @Test
  void getTransactionTypesByChannel_devrait_etre_insensible_a_la_casse() throws Exception {
    mockMvc.perform(get("/api/v1/config/transaction-types-channel/atm"))
        .andExpect(status().isOk());
  }

  @Test
  void getTransactionTypesByChannel_devrait_retourner_400_pour_un_canal_inconnu() throws Exception {
    mockMvc.perform(get("/api/v1/config/transaction-types-channel/FAX"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void getResponseCodes_devrait_retourner_200() throws Exception {
    mockMvc.perform(get("/api/v1/config/response-codes"))
        .andExpect(status().isOk());
  }

  @Test
  void searchResponseCodes_devrait_filtrer_par_motif() throws Exception {
    mockMvc.perform(get("/api/v1/config/response-codes-search?pattern=fraude"))
        .andExpect(status().isOk());
  }

  @Test
  void getSecurityMethodsByChannel_devrait_retourner_200_pour_ATM() throws Exception {
    mockMvc.perform(get("/api/v1/config/security-methods/ATM"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.securityMethods").isArray());
  }

  @Test
  void getSecurityMethodsByChannel_devrait_retourner_400_pour_canal_inconnu() throws Exception {
    mockMvc.perform(get("/api/v1/config/security-methods/FAX"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void getTransactionStatuses_devrait_retourner_200() throws Exception {
    mockMvc.perform(get("/api/v1/config/transaction-statuses"))
        .andExpect(status().isOk());
  }

  @Test
  void getCompleteConfiguration_devrait_retourner_200_avec_un_resume() throws Exception {
    mockMvc.perform(get("/api/v1/config/complete"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.summary.totalZones").exists())
        .andExpect(jsonPath("$.zones").exists())
        .andExpect(jsonPath("$.banks").exists());
  }

  @Test
  void configHealth_devrait_retourner_200_avec_status_OK() throws Exception {
    mockMvc.perform(get("/api/v1/config/health"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("OK"))
        .andExpect(jsonPath("$.zonesLoaded").value(true));
  }
}
