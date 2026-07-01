// ============================================================================
// 📊 CONFIGURATION & REFERENCE DATA MODELS
// ============================================================================

export interface PaymentSystemConfig {
  zones: { [zone: string]: string[] };
  banks: { [country: string]: string[] };
  transactionTypes: { [mti: string]: string };
  transactionTypesByChannel?: { [channel: string]: string[] };
  responseCodes: { [code: string]: string };
  securityMethods: { [channel: string]: string[] };
  transactionStatuses: { [status: string]: string };
  mtiTypes: { [mti: string]: string };
  summary?: {
    totalZones: number;
    totalCountries: number;
    totalBanks: number;
    totalResponseCodes: number;
  };
}

// ============================================================================
// 💳 AUTHO_ACTIVITY_ADM TRANSACTION MODEL
// Table de production HPS PowerCARD pour le monitoring des transactions
// Aligné EXACTEMENT sur le schéma Oracle officiel fourni par l'encadrant
// ============================================================================

export interface AutohoActivityAdm {
  // ========== Clés primaires composées ==========
  referenceNumber: string;
  internalStan: string;
  externalStan: string;
  routingCode: string;
  captureCode: string;

  // ========== Identification de la transaction ==========
  messageType?: string;        // CHAR(4) - MTI ISO 8583: 0100, 0200, 0400...
  functionCode?: string;       // CHAR(3)
  processingCode?: string;     // CHAR(2)
  sourceAccountCode?: string;  // CHAR(2)
  destinationAccountCode?: string; // CHAR(2)
  actionCode?: string;         // CHAR(3) - Code réponse: 00=Approuvé, 51=Provision insuffisante...
  originalActionCode?: string; // CHAR(3)
  issuerActionCode?: string;   // VARCHAR2(6)
  eventCode?: string;          // CHAR(3)
  reasonCode?: string;         // CHAR(4)
  rejectCode?: string;         // VARCHAR2(4)
  rejectReason?: string;       // VARCHAR2(40)
  authorizationId?: string;    // VARCHAR2(32)
  transactionId?: string;      // VARCHAR2(32)

  // ========== Réseau / Routage ==========
  networkCode?: string;        // CHAR(2)
  networkId?: string;          // VARCHAR2(4) - VISA, MC, CMI...
  networkData?: string;        // VARCHAR2(12)
  receivingInstitution?: string;       // VARCHAR2(11)
  acquiringCountryCode?: string;       // CHAR(3)
  acquirerInstitutionCode?: string;    // VARCHAR2(11)
  acquirerBank?: string;               // CHAR(6)
  issuingBank?: string;                // CHAR(6)
  forwardingCountryCode?: string;      // CHAR(3)
  forwardingInstitutionCode?: string;  // VARCHAR2(11)
  forwardingBank?: string;             // CHAR(6)

  // ========== Carte ==========
  cardNumber?: string;         // VARCHAR2(22) - Numéro de carte (masqué par le backend)
  cardNumberMasked?: string;   // Champ calculé: **** **** **** 1234
  cardSequenceNumber?: number; // NUMBER(3,0)
  serviceCode?: string;        // CHAR(3)
  cardType?: string;           // CHAR(2)
  cardLevel?: string;          // CHAR(1)
  productCode?: string;        // CHAR(3)
  vipLevel?: string;           // CHAR(1)
  startExpiryDate?: string;    // DATE
  endExpiryDate?: string;      // DATE

  // ========== Montants et devises ==========
  transactionAmount?: number;    // NUMBER(18,3)
  cashBackAmount?: number;       // NUMBER(18,3)
  transactionCurrency?: string;  // CHAR(3) - MAD, EUR, USD...
  replacementAmount?: number;    // NUMBER(18,3)
  billingAmount?: number;        // NUMBER(18,3)
  billingCurrency?: string;      // CHAR(3)
  conversionRate?: number;       // NUMBER(14,6)

  // ========== Settlement Émetteur ==========
  issSettlementAmount?: number;
  issSettlementCurrency?: string;
  issSettlementDate?: string;
  issConvRateSettlement?: number;
  issSettlementFee?: number;

  // ========== Settlement Acquéreur ==========
  acqSettlementAmount?: number;
  acqSettlementCurrency?: string;
  acqSettlementDate?: string;
  acqConvRateSettlement?: number;
  acqSettlementFee?: number;

  transactionFee?: number;

  // ========== Dates et heures ==========
  transactionLocalDate?: string;
  transmissionDateAndTime?: string;
  responseDateAndTime?: string;
  internalTransmissionTime?: string;  // DATE - Utilisé pour calculer la latence
  captureDate?: string;
  businessDate?: string;
  preAuthTimeLimit?: string;

  // ========== Accepteur / Terminal ==========
  cardAcceptorActivity?: string;    // CHAR(4) - MCC code
  cardAcceptorTermId?: string;      // VARCHAR2(15)
  cardAcceptorId?: string;          // VARCHAR2(15)
  cardAccNameAddress?: string;      // VARCHAR2(40) - Nom du commerçant
  tcc?: string;                     // CHAR(1)

  // ========== POS Spécifique ==========
  posEntryMode?: string;        // VARCHAR2(4) - 01=Manual, 05=Chip, 07=Contactless
  posConditionCode?: string;    // CHAR(2)
  posData?: string;             // CHAR(12)

  // ========== Comptes source / destination ==========
  sourceAccountEntityCode?: string;
  sourceAccountEntityId?: string;
  sourceAccountSequence?: number;
  sourceAccountType?: string;
  sourceAccountNumber?: string;
  sourceAccountEntityLevel?: number;
  destinationAccountEntityCod?: string;
  destinationAccountEntityId?: string;
  destinationAccountSequence?: number;
  destinationAccountType?: string;
  destinationAccountNumber?: string;
  destinationAccountEntityLev?: number;

  // ========== Sécurité / Vérification ==========
  securityVerifLevel?: string;
  securityVerifResult?: string;
  addressVerificationData?: string;
  authorizationCode?: string;
  originalAuthorizationCode?: string;
  authorizationSource?: string;
  authorizationLength?: number;

  // ========== Crédit / Limite ==========
  crCurrencyCode?: string;
  crCreditLimit?: number;
  crCashLimit?: number;
  crLoanLimit?: number;
  crVipLevel?: string;
  crCreditCurBal?: number;
  crCashCurBal?: number;
  crLoanCurBal?: number;
  crResponseCode?: string;
  crPendingAutCredit?: number;
  crPendingAutCash?: number;
  crPendingAutLoan?: number;
  crAvailableBalance?: number;
  crFirstDueDate?: string;
  crInstallmentAmount?: number;
  crTermCount?: number;

  // ========== Loyauté ==========
  loyaltyProgramCode?: string;
  loyaltyPointsGained?: number;
  loyaltyPointsRedemption?: number;

  // ========== Chip / EMV ==========
  chipApplicationCryptogram?: string;
  chipTvr?: string;
  chipTerminalType?: string;
  chipTransactionAmount?: string;
  externalCvvResultCode?: string;

  // ========== Flags / Statuts ==========
  authoFlag?: string;         // CHAR(1) - Y/N
  reversalFlag?: string;      // CHAR(1) - Y/N
  transactionFlag?: string;   // CHAR(1)
  matchingStatus?: string;    // CHAR(1) - M=Matched, U=Unmatched
  matchingDate?: string;
  matchingLevel?: string;

  // ========== Reversals ==========
  reversalStan?: string;
  reversalTransactionDate?: string;
  originalTransactionDateTime?: string;

  // ========== Métadonnées / Audit ==========
  dateCreate?: string;
  dateModif?: string;
  userCreate?: string;
  userModif?: string;
}

// ============================================================================
// Interface Transaction pour compatibilité avec les widgets du Dashboard
// Étend AutohoActivityAdm et ajoute des alias UI legacy
// ============================================================================
export interface Transaction extends Partial<AutohoActivityAdm> {
  // Legacy UI mappings - calculés à partir des champs DB
  id?: number;
  amount?: number;          // → transactionAmount
  currency?: string;        // → transactionCurrency
  merchantName?: string;    // → cardAccNameAddress
  status?: string;          // → dérivé de actionCode (00=approved)
  mtiCode?: string;         // → messageType
  channel?: string;         // → dérivé de posConditionCode/cardAcceptorActivity
  gabId?: string;  // ATM/GAB terminal identifier
  terminalId?: string;      // → cardAcceptorTermId
  bankName?: string;        // → acquirerBank
  latencyMs?: number;       // → calculé: responseDateAndTime - transmissionDateAndTime
  country?: string;         // → acquiringCountryCode
  zone?: string;
  responseCode?: string;    // → actionCode
  ipAddress?: string;
  is3dsSuccess?: boolean;
  fraudScore?: number;
  deviceFingerprint?: string;
  declineReason?: string;   // → rejectReason
  timestamp?: string | Date; // → transmissionDateAndTime
  externalId?: string;
  acquirerId?: string;      // → acquirerBank
  stan?: string;            // → internalStan
}

export interface AlertEvent {
  id?: number;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  details?: string;
  status?: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  createdAt?: string;
}

export interface SlaSnapshot {
  id?: number;
  slaDefinitionId: number;
  periodStart: string;
  periodEnd: string;
  successRate?: number;
  avgLatencyMs?: number;
  p95LatencyMs?: number;
  uptimeRate?: number;
  breached?: boolean;
}

// ============================================================================
// ADMIN MODULE  -  Users & Projects (Banks)
// ============================================================================

export type UserRole   = 'ADMIN' | 'USER';
export type UserStatus = 'ACTIVE' | 'BLOCKED';

export interface AppUser {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  projects: string[];
  createdAt: string;
  _password?: string;
  mustChangePassword?: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export type BankType   = 'ACQUIRER' | 'ISSUER' | 'BOTH';
export type BankStatus = 'ACTIVE' | 'INACTIVE';

export interface BankProject {
  id: number;
  name: string;
  code: string;
  country: string;
  type: BankType;
  status: BankStatus;
  createdAt: string;
}
