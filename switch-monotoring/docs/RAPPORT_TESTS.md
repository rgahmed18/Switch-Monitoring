# Rapport de tests — Switch Monitoring

Ce document liste, fichier par fichier et test par test, l'ensemble de la couverture de tests du projet (backend Spring Boot / JUnit et frontend Angular / Jasmine-Karma), avec les commandes pour reproduire chaque exécution.

---

## Sommaire

1. [Backend — Contrôleurs REST](#1-backend--contrôleurs-rest)
2. [Backend — Sécurité & Configuration](#2-backend--sécurité--configuration)
3. [Backend — Services métier](#3-backend--services-métier)
4. [Backend — Décodage ISO 8583 / EMV / Devise / Temps / Géo](#4-backend--décodage-iso-8583--emv--devise--temps--géo)
5. [Backend — Tests d'intégration](#5-backend--tests-dintégration)
6. [Frontend — Pages principales](#6-frontend--pages-principales)
7. [Frontend — Composants Dashboard](#7-frontend--composants-dashboard)
8. [Frontend — Composants Transaction Analysis & Partagés](#8-frontend--composants-transaction-analysis--partagés)
9. [Frontend — Guards, Intercepteur, Pipes](#9-frontend--guards-intercepteur-pipes)
10. [Frontend — Services](#10-frontend--services)
11. [Commandes globales](#11-commandes-globales)

---

## 1. Backend — Contrôleurs REST

### AdminControllerTest.java
**Testé : `AdminController`**
```powershell
cd backend
mvn test -Dtest=AdminControllerTest
```
- `listUsers_devrait_retourner_403_sans_role_admin` : GET `/admin/users` sans header X-User-Role → 403.
- `listUsers_devrait_retourner_403_pour_un_role_user` : GET avec rôle USER → 403.
- `listUsers_devrait_retourner_200_pour_un_role_admin` : GET avec rôle ADMIN → 200 + liste utilisateurs.
- `deleteUser_devrait_retourner_403_sans_role_admin` : DELETE sans rôle admin → 403.
- `deleteUser_devrait_retourner_400_si_utilisateur_introuvable` : DELETE utilisateur inexistant → 400.
- `toggleStatus_devrait_retourner_403_sans_role_admin` : PATCH statut sans rôle admin → 403.
- `toggleStatus_devrait_retourner_200_pour_un_admin` : PATCH statut avec rôle admin → 200 + nouveau statut.
- `updateUser_devrait_retourner_400_si_champs_obligatoires_manquants` : PUT avec champs vides → 400.

### AlertControllerTest.java
**Testé : `AlertController`**
```powershell
mvn test -Dtest=AlertControllerTest
```
- `getLatestAlerts_devrait_retourner_200_et_la_liste` : GET `/alerts` → 200 + liste.
- `createAlert_devrait_rejeter_une_requete_invalide_400` : POST sans champs obligatoires → 400.
- `createAlert_devrait_retourner_lalerte_creee` : POST valide → 200 + alerte créée.

### AuthControllerTest.java
**Testé : `AuthController`**
```powershell
mvn test -Dtest=AuthControllerTest
```
- `login_devrait_retourner_200_avec_identifiants_valides` : login réussi → 200 + email/role.
- `login_devrait_retourner_401_avec_identifiants_invalides` : mauvais identifiants → 401.
- `login_devrait_retourner_429_si_rate_limit_depasse` : trop de tentatives → 429.
- `me_devrait_retourner_401_sans_header_X_User_Email` : `/auth/me` sans header → 401.
- `me_devrait_retourner_404_si_utilisateur_introuvable` : email inconnu → 404.
- `me_devrait_retourner_les_donnees_a_jour_pour_un_non_admin` : → 200 + données à jour (email/role/projects).
- `tokenInfo_devrait_retourner_404_si_token_inconnu` : token inconnu → 404.
- `tokenInfo_devrait_indiquer_invalide_si_compte_deja_actif` : compte déjà actif → valid=false.
- `tokenInfo_devrait_indiquer_valide_pour_un_token_frais` : token frais → 200 + valid=true.
- `activate_devrait_retourner_400_si_token_invalide` : activation avec token invalide → 400.
- `activate_devrait_retourner_200_avec_token_valide` : activation réussie → 200.
- `forgotPassword_devrait_toujours_retourner_200_meme_si_email_inconnu` : anti-énumération de comptes.
- `forgotPassword_devrait_retourner_429_si_rate_limit_depasse` : trop de demandes → 429.
- `resetPassword_devrait_retourner_400_si_token_expire` : lien expiré → 400.
- `resetPassword_devrait_retourner_200_avec_token_valide` : reset réussi → 200.

### AutohoActivityAdmControllerTest.java
**Testé : `AutohoActivityAdmController`**
```powershell
mvn test -Dtest=AutohoActivityAdmControllerTest
```
- `getByTransactionId_devrait_retourner_200_avec_le_dto` : recherche par transactionId → DTO correct.
- `getLatestTransactions_devrait_utiliser_la_limite_par_defaut` : `/latest` sans paramètre → limite 2000.
- `getLatestTransactions_devrait_filtrer_par_banque_si_fournie` : filtre `issuing_bank` appliqué.
- `createTransaction_devrait_retourner_201_avec_une_requete_valide` : création → 201.
- `createTransaction_devrait_retourner_400_si_champs_obligatoires_absents` : requête incomplète → 400.
- `countByBusinessDate_devrait_retourner_200_avec_le_compte` : comptage par date → valeur correcte.
- `sumAmountByBusinessDate_devrait_retourner_200_avec_la_somme` : somme des montants → valeur correcte.
- `health_devrait_retourner_200_sans_dependance` : `/health` sans dépendance externe → 200.
- `getTransactionDetail_devrait_retourner_200_avec_la_cle_composite` : recherche par clé composite (référence+STAN).

### ConfigControllerTest.java
**Testé : `ConfigController`**
```powershell
mvn test -Dtest=ConfigControllerTest
```
- `getZonesAndCountries_devrait_retourner_200_avec_les_zones` : liste des zones → 200.
- `getCountriesByZone_devrait_retourner_200_pour_une_zone_connue` : zone "Europe" → 200 + pays.
- `getCountriesByZone_devrait_retourner_400_pour_une_zone_inconnue` : zone inconnue → 400.
- `getBanksByCountry_devrait_retourner_400_pour_un_pays_inconnu` : pays inconnu → 400.
- `getAllBanks_devrait_retourner_200` : liste complète des banques → 200.
- `getBanksByZone_devrait_retourner_200_pour_une_zone_connue` : banques par zone → 200.
- `getBanksByZone_devrait_retourner_400_pour_une_zone_inconnue` : zone inconnue → 400.
- `getTransactionTypes_devrait_retourner_200` : types de transaction → 200.
- `getTransactionTypesByChannel_devrait_retourner_200_pour_ATM` : types par canal ATM → 200.
- `getTransactionTypesByChannel_devrait_etre_insensible_a_la_casse` : "atm" minuscule fonctionne aussi.
- `getTransactionTypesByChannel_devrait_retourner_400_pour_un_canal_inconnu` : canal inconnu → 400.
- `getResponseCodes_devrait_retourner_200` : codes réponse → 200.
- `searchResponseCodes_devrait_filtrer_par_motif` : recherche par mot-clé.
- `getSecurityMethodsByChannel_devrait_retourner_200_pour_ATM` : méthodes sécurité ATM → 200.
- `getSecurityMethodsByChannel_devrait_retourner_400_pour_canal_inconnu` : canal inconnu → 400.
- `getTransactionStatuses_devrait_retourner_200` : statuts de transaction → 200.
- `getCompleteConfiguration_devrait_retourner_200_avec_un_resume` : config complète + résumé chiffré.
- `configHealth_devrait_retourner_200_avec_status_OK` : health check config → 200.

### GeoAnalyticsControllerTest.java
**Testé : `GeoAnalyticsController`**
```powershell
mvn test -Dtest=GeoAnalyticsControllerTest
```
- `getInitialContext_devrait_utiliser_la_date_fournie` : date paramétrée transmise au service.
- `getInitialContext_devrait_utiliser_aujourdhui_par_defaut` : sans date → aujourd'hui.
- `getCurrenciesForCountries_devrait_retourner_200_avec_la_liste` : filtrage Pays→Devise.
- `getCountriesForCurrency_devrait_retourner_200_avec_la_liste` : filtrage Devise→Pays.
- `getMultiZoneVolume_devrait_retourner_400_si_parametres_obligatoires_absents` : paramètres manquants → 400.
- `getMultiZoneVolume_devrait_retourner_200_avec_les_parametres_complets` : requête complète → 200.

### MonetixAnalyticsControllerTest.java
**Testé : `MonetixAnalyticsController`**
```powershell
mvn test -Dtest=MonetixAnalyticsControllerTest
```
- `decodeActionCode_devrait_retourner_200_avec_le_decodage` : décodage action code "000" → approuvé.
- `decodeMti_devrait_retourner_200_avec_le_decodage` : décodage MTI "1100" → "Autorisation".
- `getChipAnalysis_devrait_propager_NoSuchElementException_si_transaction_introuvable` : transaction absente.
- `getChipAnalysis_devrait_retourner_200_si_transaction_trouvee` : diagnostic EMV → "CLEAN".
- `getTimeAnalysis_devrait_propager_NoSuchElementException_si_transaction_introuvable` : idem, analyse temporelle.
- `getTimezone_devrait_retourner_200_avec_la_timezone_resolue` : code pays "504" → "Africa/Casablanca".
- `getDashboard_devrait_retourner_200_avec_les_kpis` : KPIs analytiques agrégés.
- `getCurrencyAnalysis_devrait_propager_NoSuchElementException_si_transaction_introuvable` : idem, analyse devise.

### ReportControllerTest.java
**Testé : `ReportController`**
```powershell
mvn test -Dtest=ReportControllerTest
```
- `getDailyStats_devrait_retourner_200_avec_les_statistiques` : stats journalières → 200.
- `getDailyStats_devrait_retourner_400_si_date_absente` : sans date → 400.
- `downloadDailyPdf_devrait_retourner_200_avec_content_type_pdf` : téléchargement PDF → Content-Type correct.
- `downloadDailyPdf_devrait_definir_le_nom_de_fichier_avec_la_date` : nom de fichier avec date.

### SimulatorControllerTest.java
**Testé : `SimulatorController`**
```powershell
mvn test -Dtest=SimulatorControllerTest
```
- `reset_devrait_retourner_403_sans_role_admin` : reset sans rôle admin → 403.
- `reset_devrait_retourner_403_pour_un_role_user` : rôle USER → 403.
- `reset_devrait_reinitialiser_le_compteur_pour_un_admin` : reset avec rôle ADMIN → compteur à 0.
- `purgeAndRegenerate_devrait_retourner_403_sans_role_admin` : purge sans rôle admin → 403.
- `purgeAndRegenerate_devrait_purger_et_relancer_pour_un_admin` : purge + régénération avec ADMIN.
- `status_devrait_etre_accessible_sans_role_admin` : statut accessible à tous.
- `status_devrait_marquer_completed_a_2000` : 2000 générées → completed=true.

### SlaControllerTest.java
**Testé : `SlaController`**
```powershell
mvn test -Dtest=SlaControllerTest
```
- `getLatestSnapshots_devrait_retourner_200_avec_la_liste` : liste snapshots SLA → 200.
- `getLatestSnapshots_devrait_retourner_200_avec_une_liste_vide` : aucun snapshot → tableau vide.
- `createSnapshot_devrait_retourner_200_avec_une_requete_valide` : création → 200.
- `createSnapshot_devrait_retourner_400_si_slaDefinitionId_absent` : champ manquant → 400.
- `createSnapshot_devrait_retourner_400_si_breached_absent` : champ manquant → 400.

### ZoneHealthControllerTest.java
**Testé : `ZoneHealthController`**
```powershell
mvn test -Dtest=ZoneHealthControllerTest
```
- `getHeatmap_devrait_retourner_200_avec_la_date_fournie` : heatmap pour date donnée.
- `getHeatmap_devrait_utiliser_aujourdhui_si_aucune_date_fournie` : sans date → aujourd'hui.
- `getCountryKpi_devrait_retourner_le_kpi_du_pays` : KPI pays spécifique.
- `getAlertZones_devrait_retourner_uniquement_les_zones_en_alerte` : uniquement zones critiques/warning.
- `getAlertZones_devrait_retourner_une_liste_vide_si_aucune_alerte` : aucune alerte → liste vide.

**Commande groupée pour tous les contrôleurs :**
```powershell
mvn test -Dtest="*ControllerTest"
```

---

## 2. Backend — Sécurité & Configuration

### BlockedUserFilterTest.java
**Testé : `BlockedUserFilter`**
```powershell
mvn test -Dtest=BlockedUserFilterTest
```
- `devrait_laisser_passer_une_route_publique_sans_verifier_le_repository` : route publique non vérifiée.
- `devrait_laisser_passer_si_aucun_header_XUserEmail` : sans header → passe.
- `devrait_laisser_passer_un_utilisateur_actif_et_non_bloque` : utilisateur ACTIVE → passe.
- `devrait_bloquer_un_utilisateur_au_statut_BLOCKED_avec_403` : utilisateur BLOCKED → 403.
- `devrait_bloquer_un_utilisateur_inactif_avec_403` : utilisateur inactif → 403.
- `devrait_laisser_passer_si_email_inconnu_du_repository` : email inconnu → passe quand même.

### CorsConfigTest.java
**Testé : `CorsConfig`**
```powershell
mvn test -Dtest=CorsConfigTest
```
- `devrait_autoriser_uniquement_lorigine_frontend_configuree` : seule l'origine frontend est autorisée.
- `devrait_autoriser_les_methodes_HTTP_necessaires_au_frontend` : GET/POST/PUT/PATCH/DELETE/OPTIONS.
- `devrait_autoriser_les_headers_XUserRole_et_XUserEmail` : headers personnalisés autorisés.
- `devrait_exposer_le_header_ContentDisposition_pour_les_telechargements` : export de fichiers.
- `ne_devrait_configurer_aucune_route_en_dehors_de_apiSlash` : scope limité à `/api/**`.

### RateLimiterTest.java
**Testé : `RateLimiter`**
```powershell
mvn test -Dtest=RateLimiterTest
```
- `allowLogin_devrait_autoriser_les_5_premieres_tentatives` : 5 tentatives OK.
- `allowLogin_devrait_bloquer_la_6e_tentative` : 6e tentative bloquée.
- `allowLogin_devrait_isoler_les_compteurs_par_ip` : compteurs indépendants par IP.
- `resetLogin_devrait_reautoriser_immediatement_les_tentatives` : reset manuel.
- `allowForgotPassword_devrait_autoriser_les_3_premieres_tentatives` : 3 tentatives OK.
- `allowForgotPassword_devrait_bloquer_la_4e_tentative` : 4e tentative bloquée.
- `login_et_forgotPassword_devraient_avoir_des_compteurs_independants` : compteurs séparés.

### SecurityHeadersFilterTest.java
**Testé : `SecurityHeadersFilter`**
```powershell
mvn test -Dtest=SecurityHeadersFilterTest
```
- `devrait_ajouter_le_header_XContentTypeOptions` : `X-Content-Type-Options: nosniff`.
- `devrait_ajouter_le_header_XFrameOptions_DENY` : anti-clickjacking.
- `devrait_ajouter_le_header_ReferrerPolicy` : politique de référent stricte.
- `devrait_ajouter_le_header_PermissionsPolicy_refusant_camera_micro_geoloc` : permissions refusées.
- `devrait_ajouter_une_CSP_restreinte_a_self` : Content-Security-Policy restrictive.
- `devrait_toujours_laisser_passer_la_requete_dans_la_chaine` : chaîne de filtres respectée.

---

## 3. Backend — Services métier

### AutohoActivityAdmServiceTest.java
**Testé : `AutohoActivityAdmService`**
```powershell
mvn test -Dtest=AutohoActivityAdmServiceTest
```
- `getTransactionDetail_devrait_lever_une_exception_si_transaction_introuvable` : exception si absent.
- `getTransactionDetail_devrait_retourner_le_dto_correspondant` : PAN jamais exposé en clair (PCI-DSS).
- `getApprovalRate_devrait_retourner_zero_si_aucune_transaction` : cas vide.
- `getApprovalRate_devrait_calculer_le_pourcentage_correct` : calcul 80% sur 100 tx, 20 refus.
- `getApprovalRate_devrait_retourner_cent_si_aucun_refus` : 100% si aucun refus.
- `getTransactionDetail_devrait_deriver_visa_pour_le_seed_data_mod_0` : dérivation réseau Visa.
- `getTransactionDetail_devrait_deriver_mastercard_pour_le_seed_data_mod_3` : dérivation Mastercard.
- `getTransactionDetail_ne_devrait_pas_ecraser_un_networkCode_deja_present` : pas d'écrasement.
- `getLatestTransactions_devrait_plafonner_la_limite_a_2000` : plafond sécurité/performance.

### IsoSimulatorTaskTest.java
**Testé : `IsoSimulatorTask`**
```powershell
mvn test -Dtest=IsoSimulatorTaskTest
```
- `generateSimulatedTransaction_devrait_toujours_utiliser_une_devise_alpha_iso4217` : devises alpha (MAD, USD).
- `generateSimulatedTransaction_devrait_toujours_renseigner_posEntryMode` : jamais null.
- `generateSimulatedTransaction_devrait_s_arreter_a_MAX_TOTAL` : plafond 2000 transactions.
- `resetCounter_devrait_remettre_generated_a_zero` : reset du compteur.

### TransactionValidationServiceTest.java
**Testé : `TransactionValidationService`**
```powershell
mvn test -Dtest=TransactionValidationServiceTest
```
*ATM :*
- `validateAtm_devrait_accepter_une_transaction_complete_et_valide`
- `validateAtm_devrait_rejeter_un_atmId_absent`
- `validateAtm_devrait_rejeter_un_type_operation_invalide`
- `validateAtm_devrait_rejeter_un_montant_negatif_pour_withdrawal`
- `validateAtm_ne_devrait_pas_exiger_de_montant_pour_balance_inquiry`
- `validateAtm_devrait_rejeter_une_devise_invalide`
- `validateAtm_devrait_rejeter_un_bill_level_hors_bornes`
- `validateAtm_devrait_emettre_un_warning_sur_timeout_eleve`
- `validateAtm_devrait_rejeter_une_methode_securite_absente`

*POS :*
- `validatePos_devrait_accepter_une_transaction_complete_et_valide`
- `validatePos_devrait_rejeter_un_terminalId_absent`
- `validatePos_devrait_rejeter_un_merchantId_absent`
- `validatePos_devrait_rejeter_un_mcc_code_mal_forme`
- `validatePos_devrait_rejeter_un_montant_nul`
- `validatePos_devrait_rejeter_un_pos_entry_mode_invalide`
- `validatePos_devrait_rejeter_un_type_operation_invalide`

*ECOM :*
- `validateEcom_devrait_accepter_une_transaction_complete_et_valide`
- `validateEcom_devrait_exiger_le_cvv_card_not_present`
- `validateEcom_devrait_rejeter_un_email_invalide`
- `validateEcom_devrait_emettre_un_warning_sur_montant_eleve_sans_3ds`
- `validateEcom_devrait_bloquer_une_transaction_a_fraud_score_eleve`
- `validateEcom_devrait_emettre_un_warning_pour_fraud_score_moyen`
- `validateEcom_devrait_exiger_la_frequence_pour_paiement_recurrent`
- `validateEcom_devrait_accepter_un_paiement_recurrent_avec_frequence`
- `validateEcom_devrait_rejeter_une_methode_securite_absente`

### UserServiceTest.java
**Testé : `UserService`**
```powershell
mvn test -Dtest=UserServiceTest
```
- `authenticate_devrait_reussir_avec_identifiants_valides`
- `authenticate_devrait_rejeter_un_compte_non_active`
- `authenticate_devrait_rejeter_un_compte_bloque`
- `authenticate_devrait_rejeter_un_mauvais_mot_de_passe`
- `authenticate_devrait_rejeter_un_email_inconnu`
- `activateAccount_devrait_activer_avec_un_token_valide`
- `activateAccount_devrait_rejeter_un_mot_de_passe_faible`
- `activateAccount_devrait_rejeter_un_token_deja_utilise`
- `activateAccount_devrait_rejeter_un_token_expire`
- `inviteUser_devrait_rejeter_un_email_invalide`
- `inviteUser_devrait_rejeter_un_email_jetable`
- `inviteUser_devrait_rejeter_un_email_deja_utilise`
- `inviteUser_devrait_creer_un_compte_inactif_avec_token`
- `toggleStatus_devrait_basculer_active_vers_blocked`
- `toggleStatus_devrait_basculer_blocked_vers_active`
- `toggleStatus_devrait_echouer_si_utilisateur_introuvable`
- `deleteUser_devrait_echouer_si_utilisateur_introuvable`

### AlertServiceTest.java
**Testé : `AlertService`**
```powershell
mvn test -Dtest=AlertServiceTest
```
- `createAlert_devrait_sauvegarder_publier_kafka_et_notifier_sse` : flux DB → Kafka → SSE.
- `createAlert_devrait_propager_lexception_si_la_sauvegarde_echoue` : pas de Kafka/SSE si DB échoue.
- `getLatestAlerts_devrait_deleguer_au_repository` : délégation simple.

### SlaServiceTest.java
**Testé : `SlaService`**
```powershell
mvn test -Dtest=SlaServiceTest
```
- `getLatestSnapshots_devrait_retourner_les_50_derniers_par_periode`
- `createSnapshot_devrait_mapper_tous_les_champs_de_la_requete`
- `createSnapshot_devrait_horodater_le_calcul_a_maintenant`
- `createSnapshot_devrait_persister_un_snapshot_marque_en_breach`

### SmartAlertEngineTest.java
**Testé : `SmartAlertEngine`** (moteur de règles d'alerte automatique)
```powershell
mvn test -Dtest=SmartAlertEngineTest
```
- `evaluateRules_ne_devrait_declencher_aucune_alerte_si_moins_de_5_transactions`
- `evaluateRules_ne_devrait_rien_declencher_avec_des_donnees_neutres`
- `evaluateRules_devrait_declencher_HIGH_DECLINE_RATE_au_dela_de_30pct`
- `evaluateRules_ne_devrait_pas_declencher_HIGH_DECLINE_RATE_sous_30pct`
- `evaluateRules_devrait_declencher_HIGH_AVG_AMOUNT_au_dela_de_50000`
- `evaluateRules_devrait_declencher_FRAUD_ACTION_CODES_severite_critical`
- `evaluateRules_devrait_declencher_SLA_BREACH_critical_si_taux_superieur_5pct`
- `evaluateRules_devrait_declencher_SLA_BREACH_warning_si_taux_faible`
- `evaluateRules_devrait_declencher_SUSPICIOUS_ATC_avec_pans_masques` : PAN jamais en clair dans l'alerte.
- `evaluateRules_devrait_declencher_HIGH_TVR_ANOMALY_RATE_au_dela_de_15pct`
- `evaluateRules_ne_devrait_pas_evaluer_le_tvr_si_moins_de_5_transactions_chip`
- `evaluateRules_devrait_declencher_HIGH_CROSS_CURRENCY_au_dela_de_40pct`
- `evaluateRules_ne_devrait_jamais_lever_dexception_meme_si_le_repository_echoue` : résilience.
- `evaluateRules_devrait_pouvoir_declencher_plusieurs_regles_simultanement`

---

## 4. Backend — Décodage ISO 8583 / EMV / Devise / Temps / Géo

### CurrencyIntelligenceServiceTest.java
**Testé : `CurrencyIntelligenceService`**
```powershell
mvn test -Dtest=CurrencyIntelligenceServiceTest
```
- `analyze_devrait_detecter_SAME_CURRENCY_quand_toutes_les_couches_correspondent`
- `analyze_devrait_detecter_CROSS_CURRENCY_entre_transaction_et_billing`
- `analyze_devrait_detecter_SETTLEMENT_FX_entre_billing_et_iss`
- `analyze_devrait_detecter_MULTI_FX_COMPLEX_sur_3_devises_distinctes`
- `analyze_devrait_marquer_normal_une_variance_sous_1pct`
- `analyze_devrait_detecter_une_anomalie_de_taux_au_dela_de_1pct`
- `analyze_ne_devrait_pas_calculer_de_variance_sans_taux_applique`
- `analyze_devrait_calculer_lecart_ISS_ACQ_meme_devise`
- `analyze_devrait_signaler_des_devises_ISS_ACQ_differentes`
- `analyze_devrait_marquer_FULLY_SETTLED_si_iss_et_acq_regles`
- `analyze_devrait_detecter_un_breach_SLA_apres_j_plus_1_sans_settlement`
- `analyze_devrait_marquer_ISS_SETTLED_ACQ_PENDING`
- `analyze_devrait_sommer_tous_les_frais_disponibles`
- `analyze_devrait_gerer_des_frais_absents_comme_zero`
- `analyze_devrait_recommander_conformite_sans_anomalie`
- `analyze_devrait_recommander_verification_taux_sur_anomalie`
- `analyze_devrait_fournir_le_libelle_de_la_devise_transaction`
- `analyze_devrait_gerer_une_couche_sans_donnees`

### EmailValidationServiceTest.java
**Testé : `EmailValidationService`**
```powershell
mvn test -Dtest=EmailValidationServiceTest
```
- `validate_devrait_rejeter_un_email_null`
- `validate_devrait_rejeter_un_email_vide`
- `validate_devrait_rejeter_un_format_invalide`
- `validate_devrait_rejeter_un_domaine_jetable_connu`
- `validate_devrait_rejeter_les_domaines_de_test_connus`
- `isDisposable_devrait_detecter_un_domaine_jetable`
- `isDisposable_devrait_retourner_false_pour_un_domaine_normal`
- `isDisposable_devrait_gerer_un_email_null_ou_sans_arobase`
- `isDisposable_devrait_ignorer_la_casse_du_domaine`

### ChipAnalysisServiceTest.java
**Testé : `ChipAnalysisService`** (diagnostic EMV complet)
```powershell
mvn test -Dtest=ChipAnalysisServiceTest
```
- `analyze_devrait_detecter_la_presence_de_donnees_chip`
- `analyze_devrait_retourner_hasChipData_false_sans_cryptogramme`
- `analyze_devrait_decoder_laip_correctement`
- `analyze_devrait_gerer_un_aip_absent`
- `analyze_devrait_decoder_le_cvm_pin_enciphered_online`
- `analyze_devrait_marquer_echec_cvm_sur_resultat_failed`
- `analyze_devrait_gerer_un_cvm_trop_court`
- `analyze_devrait_detecter_un_atc_suspect_bas`
- `analyze_devrait_considerer_un_atc_normal_comme_non_suspect`
- `analyze_devrait_interpreter_arpc_approuve`
- `analyze_devrait_interpreter_arpc_refuse`
- `analyze_devrait_interpreter_cvv_incorrect_comme_risque_fraude`
- `analyze_devrait_calculer_un_risque_global_high_quand_tvr_critique`
- `analyze_devrait_calculer_un_risque_global_clean_sans_anomalie`
- `analyze_devrait_recommander_analyse_par_defaut_si_aucune_anomalie`
- `analyze_devrait_recommander_blocage_carte_sur_liste_exception`
- `analyze_devrait_recommander_verification_sur_atc_bas`
- `analyze_devrait_decoder_le_type_de_cryptogramme_ARQC`

### TvrParserTest.java
**Testé : `TvrParser`** (Terminal Verification Results)
```powershell
mvn test -Dtest=TvrParserTest
```
- `parse_devrait_retourner_clean_pour_un_tvr_tout_a_zero`
- `parse_devrait_detecter_CARD_ON_EXCEPTION_FILE_byte1_bit4`
- `parse_devrait_detecter_SDA_FAILED_byte1_bit6`
- `parse_devrait_detecter_PIN_TRY_LIMIT_EXCEEDED_byte3`
- `parse_devrait_calculer_un_niveau_medium_pour_un_score_intermediaire`
- `parse_devrait_calculer_un_niveau_low_pour_un_score_faible`
- `parse_devrait_plafonner_le_score_a_100`
- `parse_devrait_gerer_un_tvr_null`
- `parse_devrait_gerer_un_tvr_vide`
- `parse_devrait_gerer_un_tvr_trop_court`
- `parse_devrait_ignorer_la_casse_et_les_espaces`
- `parse_devrait_fournir_le_hex_nettoye_dans_rawHex`
- `parse_devrait_fournir_des_labels_francais_pour_les_flags_actifs`
- `parse_ne_devrait_pas_marquer_fraude_pour_un_score_faible_sans_flag_critique`

### GeoFilterServiceTest.java
**Testé : `GeoFilterService`**
```powershell
mvn test -Dtest=GeoFilterServiceTest
```
- `labelCountry_devrait_resoudre_le_maroc`
- `labelCountry_devrait_retourner_un_libelle_generique_pour_code_inconnu`
- `labelCountry_devrait_gerer_null`
- `labelCurrency_devrait_resoudre_le_dirham`
- `labelCurrency_devrait_gerer_un_code_inconnu`
- `alphaCode_devrait_resoudre_le_code_alpha_iso`
- `alphaCode_devrait_retourner_le_code_numerique_si_inconnu`
- `getInitialContext_devrait_retourner_pays_et_devises_avec_pivot_MAD`
- `getInitialContext_ne_devrait_pas_interroger_les_devises_si_aucun_pays_actif`
- `getCurrenciesForCountries_devrait_retourner_liste_vide_si_aucun_pays`
- `getCurrenciesForCountries_devrait_dedupliquer_par_devise_et_cumuler_les_comptages`
- `getCurrenciesForCountries_devrait_retourner_lalpha_et_le_libelle_devise`
- `getCountriesForCurrency_devrait_retourner_liste_vide_si_devise_absente`
- `getCountriesForCurrency_devrait_mapper_les_pays_avec_libelle`
- `getMultiZoneVolume_devrait_construire_les_zones_avec_libelles_et_pivot_MAD`
- `getMultiZoneVolume_devrait_gerer_un_volume_null_comme_zero`

### ZoneHealthServiceTest.java
**Testé : `ZoneHealthService`** (heatmap de santé géographique)
```powershell
mvn test -Dtest=ZoneHealthServiceTest
```
- `computeFullHeatmap_devrait_marquer_HEALTHY_si_taux_acceptation_95_ou_plus`
- `computeFullHeatmap_devrait_marquer_WARNING_entre_85_et_95`
- `computeFullHeatmap_devrait_marquer_CRITICAL_sous_85`
- `computeFullHeatmap_devrait_appliquer_un_malus_10_si_latence_superieure_5s`
- `computeFullHeatmap_devrait_appliquer_un_malus_5_si_latence_entre_3_et_5s`
- `computeFullHeatmap_devrait_appliquer_un_malus_3_si_reversal_rate_superieur_2pct`
- `computeFullHeatmap_le_score_ne_devrait_jamais_descendre_sous_zero`
- `computeFullHeatmap_devrait_agreger_le_taux_global_et_compter_par_statut`
- `computeFullHeatmap_devrait_gerer_une_liste_vide`
- `computeCountryKpi_devrait_retourner_le_kpi_du_pays_demande`
- `computeCountryKpi_devrait_retourner_un_kpi_vide_si_pays_absent`
- `getAlertZones_devrait_ne_retourner_que_warning_et_critical_triees_par_score`

### ActionCodeDecoderTest.java
**Testé : `ActionCodeDecoder`**
```powershell
mvn test -Dtest=ActionCodeDecoderTest
```
- `decode_devrait_reconnaitre_un_code_approuve`
- `decode_devrait_reconnaitre_un_code_de_suspicion_fraude`
- `decode_devrait_ignorer_les_espaces_autour_du_code`
- `decode_devrait_gerer_un_code_null`
- `decode_devrait_gerer_un_code_vide`
- `decode_devrait_marquer_un_code_non_reference_comme_a_investiguer`
- `isFraudSuspect_devrait_detecter_les_codes_de_la_liste_fraude`
- `isFraudSuspect_devrait_retourner_false_pour_un_code_normal`
- `isApproved_devrait_reconnaitre_les_codes_approuves`
- `isSystemError_devrait_reconnaitre_les_erreurs_systeme`
- `isIssuerUnavailable_devrait_reconnaitre_les_codes_emetteur_indisponible`
- `decode_devrait_retourner_une_action_suggeree_pour_carte_perdue`

### Iso8583DecoderTest.java
**Testé : `Iso8583Decoder`**
```powershell
mvn test -Dtest=Iso8583DecoderTest
```
- `decodeMti_devrait_decoder_une_demande_autorisation_1100`
- `decodeMti_devrait_decoder_une_reponse_financiere_0210`
- `decodeMti_devrait_detecter_un_reversal`
- `decodeMti_devrait_gerer_un_mti_null`
- `decodeMti_devrait_gerer_un_mti_vide`
- `decodeMti_devrait_gerer_un_mti_trop_court`
- `decodeMti_devrait_reconnaitre_un_mti_prive_HPS`
- `decodeMti_devrait_fournir_une_description_generique_pour_mti_non_catalogue`
- `decodeMti_devrait_ignorer_les_espaces`
- `decodeProcessingCode_devrait_decoder_un_achat_standard`
- `decodeProcessingCode_devrait_decoder_un_retrait_especes`
- `decodeProcessingCode_devrait_gerer_un_code_null`
- `decodeProcessingCode_devrait_fournir_un_type_inconnu_pour_code_non_catalogue`
- `decodeProcessingCode_devrait_construire_une_description_complete`
- `decodeFunctionCode_devrait_decoder_une_autorisation`
- `decodeFunctionCode_devrait_gerer_un_code_null`
- `decodeFunctionCode_devrait_fournir_une_description_generique_pour_code_inconnu`

### ReportServiceTest.java
**Testé : `ReportService`**
```powershell
mvn test -Dtest=ReportServiceTest
```
- `buildStats_devrait_calculer_le_taux_de_succes_correctement`
- `buildStats_devrait_gerer_labsence_de_transactions_sans_division_par_zero`
- `buildStats_ne_devrait_jamais_retourner_un_declinedCount_negatif`
- `buildStats_devrait_normaliser_les_mti_powercard_1xxx_vers_0xxx`
- `generatePdf_devrait_produire_un_document_pdf_non_vide`

### TransactionTimeServiceTest.java
**Testé : `TransactionTimeService`**
```powershell
mvn test -Dtest=TransactionTimeServiceTest
```
- `resolveTimezone_devrait_resoudre_le_maroc`
- `resolveTimezone_devrait_retourner_UTC_pour_pays_inconnu`
- `resolveTimezone_devrait_gerer_null`
- `analyze_devrait_calculer_la_latence_entre_transmission_et_response`
- `analyze_devrait_marquer_SLA_breach_au_dela_de_5_secondes`
- `analyze_devrait_marquer_LATENCE_CRITIQUE_au_dela_de_30_secondes`
- `analyze_devrait_gerer_une_latence_absente_sans_transmission_ou_response`
- `analyze_devrait_detecter_une_derive_critique_au_dela_de_24h`
- `analyze_devrait_rester_normal_sans_derive_significative`
- `analyze_devrait_utiliser_la_timezone_du_pays_acquereur`
- `analyze_devrait_utiliser_UTC_par_defaut_si_pays_inconnu`
- `convertToLocalTime_devrait_retourner_NA_si_datetime_null`
- `convertToLocalTime_devrait_convertir_vers_la_timezone_du_pays`

### SecurityUtilsTest.java
**Testé : `SecurityUtils`** (masquage PAN — conformité PCI-DSS)
```powershell
mvn test -Dtest=SecurityUtilsTest
```
- `maskCardNumber_devrait_masquer_un_pan_standard_16_chiffres`
- `maskCardNumber_devrait_ignorer_les_espaces_et_tirets`
- `maskCardNumber_devrait_lever_une_exception_si_pan_null`
- `maskCardNumber_devrait_lever_une_exception_si_pan_trop_court`
- `maskCardNumber_ne_devrait_jamais_exposer_plus_que_bin_et_suffixe`
- `maskCardNumberSafe_devrait_retourner_null_si_pan_null`
- `maskCardNumberSafe_devrait_retourner_etoiles_si_pan_trop_court`
- `maskCardNumberSafe_devrait_masquer_normalement_un_pan_valide`
- `looksLikeRawPan_devrait_detecter_une_sequence_de_13_a_19_chiffres`
- `looksLikeRawPan_ne_devrait_pas_detecter_un_pan_deja_masque`
- `looksLikeRawPan_devrait_retourner_false_pour_null_ou_court`

**Commande groupée pour tous les services :**
```powershell
mvn test -Dtest="*ServiceTest"
```

---

## 5. Backend — Tests d'intégration

### AuthFlowIntegrationTest.java
**Contexte : Testcontainers avec un vrai conteneur Docker Oracle (`gvenzl/oracle-free`), migrations Flyway réelles, MockMvc.**
```powershell
mvn test -Dtest=AuthFlowIntegrationTest
```
- `parcours_complet_invitation_activation_login` : scénario bout-en-bout complet (invitation admin → activation → login).
- `login_devrait_echouer_pour_un_compte_non_active` : compte jamais activé → 401.
- `activate_devrait_echouer_avec_un_mot_de_passe_faible` : mot de passe faible → 400.

*Nécessite Docker actif (`docker ps`).*

### AlertKafkaIntegrationTest.java
**Contexte : broker Kafka embarqué en mémoire (`@EmbeddedKafka`), vérification asynchrone via Awaitility.**
```powershell
mvn test -Dtest=AlertKafkaIntegrationTest
```
- `un_message_publie_sur_alert_events_devrait_etre_persiste_par_le_consumer` : pipeline complet Producer → Kafka → Consumer → persistance.

---

## 6. Frontend — Pages principales

### dashboard.component.spec.ts
**Testé : `DashboardComponent`**
```powershell
cd frontend
npx ng test --include='**/pages/dashboard/dashboard.component.spec.ts' --watch=false --browsers=ChromeHeadless
```
- Navigation vers une page (clic lien menu), invalidation du cache au démarrage.
- Chargement config/zones/pays/banques (+ repli mock si erreur backend).
- Chargement transactions et alertes (+ repli mock si erreur).
- **Filtres en cascade** : Zone → Pays → Banque → Type (bouton "Réinitialiser tous les filtres").
- Filtres Canal (POS/GAB/ECOM), Devise, Zone Local/International, Groupe code réponse (SUCCES/REFUS/FRAUDE), Groupe MTI, Type MTI précis, Type de transaction précis, Banque — chacun testé pour vérifier qu'il exclut bien les transactions non conformes.
- Affichage/masquage des widgets (boutons "Tout afficher"/"Tout masquer").
- Résolution d'une alerte (bouton "Résoudre").
- KPIs réseau (Visa/Mastercard), KPIs POS/ECOM à zéro sans transaction.
- **KPIs principaux (latence, succès, TPS, uptime)** : remise à zéro si filtre vide, calcul délégué au `TransactionStatsService`, calcul d'uptime sur les codes d'erreur système 91/96.
- Compteur d'alertes non résolues (uniquement OPEN, moteur live).

### transaction-analysis.component.spec.ts
**Testé : `TransactionAnalysisComponent`**
```powershell
npx ng test --include='**/pages/transaction-analysis/transaction-analysis.component.spec.ts' --watch=false --browsers=ChromeHeadless
```
- Chargement transactions au changement de projet (+ gestion d'erreur).
- Chargement dashboard analytics (chip/fraude) + compteur SLA breaches.
- **Filtres** : statut, canal (GAB/ATM équivalents, ECOM/ECM équivalents), **montant min/max (bouton slider — test de non-régression du bug corrigé)**, plage de dates, tranche horaire, recherche libre.
- Mise à jour des compteurs d'onglets (badge "Détails").
- Sélection/fermeture du détail d'une transaction (clic sur une ligne).
- Bouton "Exporter" (ouverture/fermeture/confirmation du modal).
- Bouton "Rafraîchir" (rechargement des données).

### alertes.component.spec.ts
**Testé : `AlertesComponent`**
```powershell
npx ng test --include='**/pages/alertes/alertes.component.spec.ts' --watch=false --browsers=ChromeHeadless
```
- Chargement transactions + alimentation du moteur d'alertes.
- Chargement des alertes DB (+ tolérance d'erreur silencieuse).
- Fusion alertes live/DB triées par date, compteurs par sévérité (critical/warning/info).
- Boutons "Résoudre"/"Rouvrir" une alerte (live et DB).
- Filtres de date (début/fin), bouton "Rafraîchir", bouton "Afficher/masquer historique".
- Tableau statistiques par code d'erreur (top 5, pourcentages, styles visuels par criticité).

### transactions.component.spec.ts
**Testé : `TransactionsComponent`**
```powershell
npx ng test --include='**/pages/transactions/transactions.component.spec.ts' --watch=false --browsers=ChromeHeadless
```
- Affichage immédiat depuis le store, repli backend si store vide, gestion d'erreur.
- Onglets "Toutes"/"Approuvées"/"Refusées" (avec reset de pagination).
- Recherche texte (insensible à la casse).
- Pagination (boutons page suivante/précédente, calcul du nombre de pages, bornes).
- Affichage statut/PAN masqué/montant/canal/réseau/mode d'entrée.
- Clic sur une ligne → ouverture/fermeture du modal de détail.

### atm.component.spec.ts / pos.component.spec.ts / ecom.component.spec.ts / gab.component.spec.ts
**Testés : `AtmComponent`, `PosComponent`, `EcomComponent`, `GabComponent`**
```powershell
npx ng test --include='**/pages/atm/atm.component.spec.ts' --watch=false --browsers=ChromeHeadless
npx ng test --include='**/pages/pos/pos.component.spec.ts' --watch=false --browsers=ChromeHeadless
npx ng test --include='**/pages/ecom/ecom.component.spec.ts' --watch=false --browsers=ChromeHeadless
npx ng test --include='**/pages/gab/gab.component.spec.ts' --watch=false --browsers=ChromeHeadless
```
- ATM : KPIs (total, succès/refus, volume cash-out), exclusion des reversals, tri des 50 dernières transactions approuvées, rechargement au changement de projet.
- POS : KPIs de base, tableau MCC (dérivé du nom marchand si absent), tableau marchands (volume + taux de refus).
- ECOM : succès/refus hors reversals, taux de fraude, taux de succès 3D Secure, regroupement par marchand (limité à 20 lignes).
- GAB : détection via MTI "04xx" ou canal GAB, regroupement par banque, top 5 banques par volume, garde anti-null sur `mtiCode` (régression).

### login.component.spec.ts
**Testé : `LoginComponent`**
```powershell
npx ng test --include='**/pages/login/login.component.spec.ts' --watch=false --browsers=ChromeHeadless
```
- Redirection si déjà authentifié / reste sur la page si non.
- **Bouton "Se connecter"** : validation champs vides, succès → redirection, échec → message d'erreur.
- Formulaire de changement de mot de passe obligatoire après connexion.
- **Bouton "Mot de passe oublié"** : email vide bloqué sans appel HTTP, message de succès systématique (anti-énumération).

### set-password.component.spec.ts
**Testé : `SetPasswordComponent`** (activation de compte / réinitialisation)
```powershell
npx ng test --include='**/pages/activate/set-password.component.spec.ts' --watch=false --browsers=ChromeHeadless
```
- Détection mode activation/réinitialisation via URL, token manquant/invalide/expiré.
- Indicateur de force du mot de passe (longueur/majuscule/chiffre/spécial, plafonné à 4).
- **Bouton "Valider"** : rejet mot de passe trop court ou non concordant, succès si backend confirme.
- Bouton "Aller à la connexion".

### project-management.component.spec.ts
**Testé : `ProjectManagementComponent`** (admin — gestion des projets/banques)
```powershell
npx ng test --include='**/pages/admin/project-management/project-management.component.spec.ts' --watch=false --browsers=ChromeHeadless
```
- Recherche par nom/code/pays, compteurs actifs/inactifs/par type.
- **Bouton "Créer un projet"** (formulaire vide) / **"Modifier"** (pré-rempli).
- **Bouton "Enregistrer"** : rejet formulaire incomplet ou code >6 caractères, création/mise à jour.
- **Bouton toggle statut** (Actif/Inactif).
- **Bouton "Supprimer"** avec confirmation (2 clics) et annulation.
- Assignation de projets à un utilisateur (cocher/décocher, persistance PUT).

### user-management.component.spec.ts
**Testé : `UserManagementComponent`** (admin — gestion des utilisateurs)
```powershell
npx ng test --include='**/pages/admin/user-management/user-management.component.spec.ts' --watch=false --browsers=ChromeHeadless
```
- Compteurs admin/user/actif/bloqué, recherche par nom/email.
- **Bouton "Créer un utilisateur"** / **"Modifier"** (pré-remplissage avec projets existants).
- Validation email au blur (format, domaine — bloque la sauvegarde si invalide ou en cours de validation).
- **Bouton "Enregistrer"** : création/mise à jour (PUT), avec repli local si le backend échoue totalement.
- Toast de confirmation email envoyé / dialogue lien d'activation manuel si SMTP absent.
- **Bouton toggle statut** (Actif/Bloqué) avec repli local.
- **Bouton "Supprimer"** avec confirmation.
- **Bouton "Réinitialiser mot de passe"** : toast si email envoyé, affichage du lien sinon, repli local (mot de passe temporaire).
- Cocher/décocher les projets assignés dans le formulaire.

**Commande groupée pour toutes les pages :**
```powershell
npx ng test --include='**/pages/**/*.spec.ts' --watch=false --browsers=ChromeHeadless
```

---

## 7. Frontend — Composants Dashboard

```powershell
npx ng test --include='**/components/dashboard/**/*.spec.ts' --watch=false --browsers=ChromeHeadless
```

| Fichier | Composant | Points clés testés |
|---|---|---|
| `approved-by-subtype.component.spec.ts` | ApprovedBySubtypeComponent | Reset si aucune transaction approuvée, filtre strict sur APPROVED, classification réseau via BIN |
| `decline-reasons-stats.component.spec.ts` | DeclineReasonsStatsComponent | Taux global de refus, résolution libellé/catégorie (CODE_META), top 7 + "Autres", tri par fréquence |
| `entry-mode-distribution.component.spec.ts` | EntryModeDistributionComponent | Regroupement par mode d'entrée, %contactless/chip/manuel, taux de fraude sur saisie manuelle, styles CSS par mode (bouton) |
| `kpi-card.component.spec.ts` | KpiCardComponent | Variante par défaut, styles par variante (success/warning/danger), inputs title/value/subtitle/trend |
| `latency-chart.component.spec.ts` | LatencyChartComponent | Reset si vide, latence moyenne par minute, exclusion valeurs hors [0,30000ms], ligne seuil SLA 2000ms |
| `mti-distribution.component.spec.ts` | MtiDistributionComponent | Normalisation MTI 1xxx→0xxx, % par MTI, top MTI, comptage auth (0100/0110), styles par type (bouton) |
| `refusal-by-subtype.component.spec.ts` | RefusalBySubtypeComponent | Reset si aucun refus, filtre strict DECLINED, classification réseau |
| `refusal-rate.component.spec.ts` | RefusalRateComponent | Taux de refus global (incluant TIMEOUT/ERROR/BLOCKED), ligne seuil 30%, pré-remplissage 30 buckets |
| `refusal-stacked.component.spec.ts` | RefusalStackedComponent | Regroupement par minute, limite 30 buckets, libellés français |
| `response-chart.component.spec.ts` | ResponseChartComponent | Reset si vide (pas de données figées), comptage par code réponse, tri décroissant |
| `response-codes.component.spec.ts` | ResponseCodesComponent | Code "00" toujours en premier, limite 15 codes, couleurs (vert succès, rouge erreur système) |
| `sla-tracking.component.spec.ts` | SlaTrackingComponent | Seuils par défaut, successRate cohérent avec TransactionStatsService, uptime excluant TIMEOUT/ERROR |
| `summary-widget.component.spec.ts` | SummaryWidgetComponent | Reset si vide, calcul approved/declined via le service, donut chart, top erreurs |
| `transaction-table.component.spec.ts` | TransactionTableComponent | Pagination (boutons suivant/précédent), **clic sur une ligne (émission txSelected)**, formatage date/PAN/montant/réseau, classes CSS badges/latence |
| `volume-card-chart.component.spec.ts` | VolumeCardChartComponent | Classification réseau (networkCode ou BIN), exclusion ATM/GAB |
| `volume-chart.component.spec.ts` | VolumeChartComponent | Regroupement 5 minutes, exclusion buckets futurs, limite 48 buckets (4h) |

---

## 8. Frontend — Composants Transaction Analysis & Partagés

```powershell
npx ng test --include='**/components/transaction-analysis/**/*.spec.ts' --watch=false --browsers=ChromeHeadless
npx ng test --include='**/components/shared/**/*.spec.ts' --watch=false --browsers=ChromeHeadless
```

### advanced-filters.component.spec.ts — `AdvancedFiltersComponent`
- Liste acquéreurs uniques (triée), extension auto du curseur >20M.
- Calculs approuvé/refusé/taux **sur les transactions filtrées, pas le total brut** (bug corrigé).
- **Boutons "Appliquer les filtres"** et **"Réinitialiser"** (émission d'événements).
- Curseurs min/max (contraintes réciproques), affichage du "Total" basé sur `filteredTransactions` (bug du template corrigé).

### analysis-comparison.component.spec.ts — `AnalysisComparisonComponent`
- Reset si filtre vide, pré-initialisation GAB/POS/ECOM même sans transaction.
- Normalisation canaux (ATM/WITHDRAWAL→GAB, ECOM→"E-commerce/Web"), classification EMV/contact.
- Métriques count/volume/approvalRate/avgLatency par groupe, formatage MAD/%, identification meilleur/pire groupe.

### transaction-detail-modal.component.spec.ts — `TransactionDetailModalComponent`
- Détection statut (via status/actionCode/rejectReason), masquage PAN (BIN6+4 derniers), détection réseau (Visa/Mastercard/CMI).
- Décodage TVR (bits SDA échouée), timeline (Transmission/Réponse/Rapprochement), formatage date/montant.

### transaction-insights.component.spec.ts — `TransactionInsightsComponent`
- Reset si filtre vide, canal dominant, top acquéreurs (limité à 5), tendance d'approbation (comparaison 24h vs 24-48h).

### navigation-bar.component.spec.ts — `NavigationBarComponent`
- Rendu des 8 liens de navigation, affichage du logo.

### project-selector.component.spec.ts — `ProjectSelectorComponent`
- ADMIN voit toutes les banques, USER voit ses projets assignés uniquement (**pas de faux-positif via userStore mock — bug corrigé**).
- Regroupement par zone géographique, recherche, **bouton "Tous les projets"**, **clic sur un projet** (sélection + fermeture modal), rafraîchissement `/auth/me` pour non-admin à l'ouverture.

---

## 9. Frontend — Guards, Intercepteur, Pipes

```powershell
npx ng test --include='**/guards/**/*.spec.ts' --watch=false --browsers=ChromeHeadless
npx ng test --include='**/interceptors/**/*.spec.ts' --watch=false --browsers=ChromeHeadless
npx ng test --include='**/pipes/**/*.spec.ts' --watch=false --browsers=ChromeHeadless
npx ng test --include='**/data/card-network.spec.ts' --watch=false --browsers=ChromeHeadless
```
- **admin.guard.spec.ts** : autorise ADMIN, redirige les autres vers `/`.
- **auth.guard.spec.ts** : autorise authentifié, redirige vers `/login` sinon.
- **auth.interceptor.spec.ts** : injecte headers X-User-Role/X-User-Email si connecté.
- **card-mask.pipe.spec.ts** : masquage PAN (BIN6+4 derniers), gestion null/vide/trop court.
- **translate.pipe.spec.ts** : délégation à TranslateService.
- **card-network.spec.ts** : détection Visa/Mastercard/CMI via productCode/networkCode/BIN, priorité des signaux, anti-faux-positif CMI.

---

## 10. Frontend — Services

```powershell
npx ng test --include='**/services/**/*.spec.ts' --watch=false --browsers=ChromeHeadless
npx ng test --include='**/state.service.spec.ts' --watch=false --browsers=ChromeHeadless
npx ng test --include='**/api.service.spec.ts' --watch=false --browsers=ChromeHeadless
```

| Fichier | Service | Points clés testés |
|---|---|---|
| `api.service.spec.ts` | ApiService | Headers propagés par l'intercepteur, cache TTL (pas de second appel HTTP) |
| `auth.service.spec.ts` | AuthService | Login/logout, normalisation `projects` CSV→tableau, gestion erreurs, `isAdmin()`, `refreshCurrentUser()` (/auth/me) |
| `bank-project-store.service.spec.ts` | BankProjectStoreService | CRUD banques (add/update/toggleStatus/remove), recherche par code |
| `config.service.spec.ts` | ConfigService | Chargement config + cache, repli erreur, couleurs codes réponse, résumé chiffré |
| `data-generation.service.spec.ts` | DataGenerationService | Génération mock (nombre exact, IDs uniques, tri chronologique, répartition canaux/EMV/3DS), injection backend |
| `email-validation.service.spec.ts` | EmailValidationService | Format, domaines jetables, dégradation gracieuse si backend indisponible |
| `project-filter.service.spec.ts` | ProjectFilterService | `setProject()`/`clearProject()`, résolution nom via BankProjectStoreService |
| `transaction-alert.service.spec.ts` | TransactionAlertService | **Taux de refus (excluant reversals), alertes CRITICAL >50%/WARNING 35-50%, déduplication d'alertes**, résolution/réouverture |
| `transaction-stats.service.spec.ts` | TransactionStatsService | **Les 5 KPIs centraux : approvalRate, avgLatency (filtre 0-30000ms), TPS (pic/minute), volume, top erreurs** |
| `transaction-store.service.spec.ts` | TransactionStoreService | `replaceAll`/`mergeBatch` (upsert par clé), archivage >3 mois, buffer live |
| `translate.service.spec.ts` | TranslateService | Traduction FR/EN, fallback français, signal réactif |
| `user-store.service.spec.ts` | UserStoreService | Chargement backend + normalisation rôle/statut, repli sur MOCK_USERS si erreur/403 |
| `state.service.spec.ts` | AppStateService | **`applyFilters()` — tous les filtres du Dashboard** (dates, heures, zone, pays, banque, canal, MTI, type, devise, code réponse), `getActiveFilterCount()` |

**Commande groupée pour tout le frontend :**
```powershell
npm test -- --watch=false --browsers=ChromeHeadless
```

---

## 11. Commandes globales

### Backend — suite complète + couverture
```powershell
cd backend
mvn clean test
mvn clean test jacoco:report
# Rapport HTML : target/site/jacoco/index.html
```

### Frontend — suite complète
```powershell
cd frontend
npm test -- --watch=false --browsers=ChromeHeadless
```

### Récapitulatif des volumes
- **Backend** : 33 fichiers de test — 11 contrôleurs REST, 4 filtres/config sécurité, 7 services métier, 11 services de décodage/analytique, 2 tests d'intégration (Testcontainers Oracle + Kafka embarqué).
- **Frontend** : 53 fichiers de test — 12 pages, 16 composants dashboard, 4 composants transaction-analysis, 2 composants partagés, 4 guards/intercepteur/pipes, 13 services + state.service + api.service.
