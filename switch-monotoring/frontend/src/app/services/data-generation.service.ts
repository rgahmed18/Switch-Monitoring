import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MockTransaction {
  // ========== Identifiants & Routing ==========
  transactionId: string;
  referenceNumber?: string;
  internalStan?: string;
  externalStan?: string;
  routingCode?: string;
  captureCode?: string;
  authorizationId?: string;
  authorizationCode?: string;
  
  // ========== Message ISO 8583 ==========
  mti: string;
  functionCode?: string;
  processingCode?: string;
  actionCode?: string;
  reasonCode?: string;
  rejectCode?: string;
  
  // ========== Carte & Émetteur ==========
  pan?: string;
  cardNumber?: string;
  cardSequenceNumber?: number;
  cardType?: string;
  serviceCode?: string;
  endExpiryDate?: string;
  cardLevel?: string;
  productCode?: string;
  issuingBank?: string;
  vipLevel?: string;
  
  // ========== Acquéreur, Terminal & Commerçant ==========
  acquirerBank?: string;
  acquirerInstitutionCode?: string;
  acquiringCountryCode?: string;
  acquirerCountry?: string;
  cardAcceptorTermId?: string;
  cardAcceptorId?: string;
  cardAccNameAddress?: string;
  merchant?: string;
  cardAcceptorActivity?: string;
  mcc?: string;
  receivingInstitution?: string;
  forwardingInstitutionCode?: string;
  forwardingCountryCode?: string;
  forwardingBank?: string;
  
  // ========== POS / Mode d'Entrée ==========
  posEntryMode?: string;
  posConditionCode?: string;
  posData?: string;
  channel?: string;
  networkId?: string;
  isInterbank?: string;
  
  // ========== Montants & Devises ==========
  amount?: number;
  transactionAmount?: number;
  cashBackAmount?: number;
  billingAmount?: number;
  transactionCurrency?: string;
  billingCurrency?: string;
  conversionRate?: number;
  transactionFee?: number;
  issSettlementAmount?: number;
  acqSettlementAmount?: number;
  
  // ========== Dates ==========
  timestamp?: Date;
  transmissionDateAndTime?: string;
  transactionLocalDate?: string;
  responseDateAndTime?: string;
  captureDate?: string;
  businessDate?: string;
  processingTime?: number;
  internalTransmissionTime?: string;
  latencyCalculated?: number;
  
  // ========== Reversal & Matching ==========
  reversalFlag?: string;
  reversalStan?: string;
  reversalTransactionDate?: string;
  originalTransactionDateTime?: string;
  originalAuthorizationCode?: string;
  matchingStatus?: string;
  matchingDate?: string;
  
  // ========== CHIP / EMV ==========
  chipApplicationCryptogram?: string;
  chipAtc?: string;
  chipTvr?: string;
  chipIac?: string;
  chipAip?: string;
  chipCvmResults?: string;
  chipTerminalCountryCode?: string;
  chipAppliIdentifier?: string;
  chipUnpredictableNumber?: string;
  chipCardAuthenResult?: string;
  
  // ========== Sécurité & CPS ==========
  securityVerifLevel?: string;
  securityVerifResult?: string;
  externalCvvResultCode?: string;
  cpsTransactionId?: string;
  cpsValidationCode?: string;
  
  // ========== Flags & Audit ==========
  authoFlag?: string;
  transactionFlag?: string;
  origineCode?: string;
  userCreate?: string;
  dateCreate?: string;
  userModif?: string;
  dateModif?: string;
  
  // ========== Legacy ==========
  responseCode?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DataGenerationService {
  private apiUrl = 'http://localhost:8081/api';

  // ── Banques alignées sur la base Oracle (codes CHAR(6)) ──────────────────
  private readonly BANKS = [
    'AWB', 'BCP', 'BMCE', 'CIH', 'BPM', 'CDM', 'SGM', 'BOA', 'CAGM', 'BCM',
    'BIAT', 'STDB', 'BNP', 'HSBC', 'JPMCH', 'ICBC', 'MUFG', 'SNBSA', 'FAB', 'ZENTH',
  ];

  // ── Courbe de charge bancaire (poids par heure 0-23, somme = 100) ────────
  // Creux nuit, pic matin 08-10h, pic midi 13-14h, pic soir 17-18h
  private readonly HOUR_WEIGHTS = [
    1, 1, 0, 0, 1, 2, 3, 7, 9, 10, 8, 6,   // 00h - 11h
    5, 7, 7, 6, 6, 8, 7, 5, 3, 2, 1, 1,    // 12h - 23h
  ];

  // ── Codes réponse ISO 8583 / PowerCARD avec poids ────────────────────────
  private readonly ACTION_CODES: { code: string; weight: number; autho: string; reject: string }[] = [
    { code: '000', weight: 0.65, autho: 'Y', reject: '' },
    { code: '051', weight: 0.10, autho: 'N', reject: 'Provision insuffisante' },
    { code: '055', weight: 0.07, autho: 'N', reject: 'Code PIN incorrect' },
    { code: '054', weight: 0.05, autho: 'N', reject: 'Carte expiree' },
    { code: '005', weight: 0.05, autho: 'N', reject: 'Transaction non honoree' },
    { code: '091', weight: 0.04, autho: 'N', reject: 'Emetteur inaccessible' },
    { code: '014', weight: 0.03, autho: 'N', reject: 'Numero de carte invalide' },
    { code: '096', weight: 0.01, autho: 'N', reject: 'Mauvais fonctionnement systeme' },
  ];

  private readonly MCC_POS  = ['5411','5541','5812','5912','4111','7011','5651','5311','8049','5732'];
  private readonly MCC_ECOM = ['5999','7372','5045','5961','4816','7011','5734','7922','4722','5815'];

  private readonly MERCH_ATM = [
    'Retrait GAB AWB CASABLANCA','Retrait GAB BCP RABAT','Retrait GAB BMCE FES',
    'Retrait GAB CIH MARRAKECH','Retrait GAB BPM TANGER','Retrait GAB CDM AGADIR',
    'Retrait GAB SGM MEKNES','Retrait GAB BOA OUJDA','Retrait GAB CAGM KENITRA',
    'Retrait GAB BCM SALE','Retrait ATM BIAT TUNIS','Retrait ATM STDB JOHANNESBG',
    'Retrait ATM BNP PARIS OPERA','Retrait ATM HSBC LONDON','Retrait ATM JPMCH NEW YORK',
    'Retrait ATM ICBC BEIJING','Retrait ATM MUFG TOKYO','Retrait ATM SNBSA RIYADH',
    'Retrait ATM FAB ABU DHABI','Retrait ATM ZENTH LAGOS',
  ];
  private readonly MERCH_POS = [
    'MARJANE ANFA CASABLANCA','CARREFOUR MAARIF CAS','STATION TOTAL RABAT',
    'PHARMACIE ATLAS CASA','RESTAURANT RIAD FES','HOTEL KENZI TOWER CAS',
    'LABEL VIE AIN DIAB','CLINIQUE IBN SINA RABAT','ZARA MAROC CASABLANCA','FNAC MAROC ANFA PLACE',
  ];
  private readonly MERCH_ECOM = [
    'JUMIA MAROC ECOM','AMAZON.FR ECOM','BOOKING.COM ECOM','PAYPAL ECOM PAYMENT',
    'ALIEXPRESS ECOM','AIR ARABIA ECOM TICKET','NETFLIX ECOM STREAMING',
    'SPOTIFY ECOM PREMIUM','AVITO MAROC ECOM','MARJANE ONLINE ECOM',
  ];

  constructor(private http: HttpClient) {}

  // ──────────────────────────────────────────────────────────────────────────
  //  METHODE PRINCIPALE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Génère `count` transactions distribuées intelligemment dans le temps.
   * Chaque transaction reçoit un timestamp unique basé sur une courbe de
   * charge bancaire réaliste (pics matin/midi/soir, creux la nuit).
   *
   * @param count  Nombre de transactions à générer (s'arrête exactement à count)
   * @param days   Nombre de jours glissants à couvrir (défaut : 7)
   */
  generateMockTransactions(count: number = 2000, days: number = 7): MockTransaction[] {
    // Pré-calcul de la table de lookup heure → cumul (pour getHourFromWeight)
    const cumulWeights = this.buildCumulativeWeights();
    // Pré-calcul des timestamps distribués selon la courbe de charge
    const timestamps = this.buildDistributedTimestamps(count, days, cumulWeights);

    const transactions: MockTransaction[] = [];

    for (let i = 0; i < count; i++) {
      const ts = timestamps[i];
      const idx = i + 1; // index 1-based (aligné SQL)

      // ── Banques (20 banques, ~count/20 tx chacune) ──────────────────────
      const issuerCode   = this.BANKS[idx % 20];
      const acquirerCode = this.BANKS[(idx + 7) % 20];

      // ── Canal : ATM 30% | POS 50% | ECOM 20% ────────────────────────────
      const canalMod = idx % 10;
      let channel: string;
      let posCondCode: string;
      let entryMode: string;
      let mcc: string;
      let terminalId: string | undefined;
      let acceptorId: string;
      let merchant: string;
      let mtiCode: string;
      let funcCode: string;

      if (canalMod < 3) {
        channel     = 'GAB';
        posCondCode = '01';
        entryMode   = '01';
        mcc         = '6011';
        terminalId  = `GAB${String(idx % 99 + 1).padStart(5,'0')}${issuerCode.slice(0,3)}`;
        acceptorId  = `ATM${String(idx % 500 + 100).padStart(5,'0')}`;
        merchant    = this.MERCH_ATM[idx % 20];
        mtiCode     = '1200';
        funcCode    = '200';
      } else if (canalMod < 8) {
        channel     = 'POS';
        posCondCode = '00';
        entryMode   = ['05','07','05','02'][idx % 4];
        mcc         = this.MCC_POS[idx % 10];
        terminalId  = `POS${String(idx % 999 + 1).padStart(5,'0')}`;
        acceptorId  = `MRC${String(idx % 9999 + 1000).padStart(4,'0')}`;
        merchant    = this.MERCH_POS[idx % 10];
        mtiCode     = '1200';
        funcCode    = '200';
      } else {
        channel     = 'ECOM';
        posCondCode = '59';
        entryMode   = '81';
        mcc         = this.MCC_ECOM[idx % 10];
        terminalId  = undefined;
        acceptorId  = `ECM${String(idx % 999 + 1).padStart(4,'0')}`;
        merchant    = this.MERCH_ECOM[idx % 10];
        mtiCode     = '1100';
        funcCode    = '100';
      }

      // ── Réseau / PAN ─────────────────────────────────────────────────────
      let networkId: string;
      let networkCode: string;
      let productCode: string;
      let pan: string;

      if (canalMod < 3) {
        networkId   = 'CMI';
        networkCode = '03';
        productCode = 'CMI';
        pan         = `4${String(idx % 900000 + 100000).padStart(6,'0')}XXXXXX${String(idx % 9000 + 1000)}`;
      } else if (idx % 5 < 3) {
        networkId   = 'VISA';
        networkCode = '01';
        productCode = 'VIS';
        pan         = `4${String(idx % 900000 + 100000).padStart(6,'0')}XXXXXX${String(idx % 9000 + 1001)}`;
      } else {
        networkId   = 'MC';
        networkCode = '02';
        productCode = 'MSC';
        pan         = `5${String(idx % 900000 + 100000).padStart(6,'0')}XXXXXX${String(idx % 9000 + 1002)}`;
      }

      // ── Reversal 5% ──────────────────────────────────────────────────────
      const isReversal = (idx % 20 === 0);
      if (isReversal) { mtiCode = '1420'; funcCode = '400'; }

      // ── Code action (réponse) ─────────────────────────────────────────────
      const actionEntry = this.pickActionCode(idx);
      const actionCode  = actionEntry.code;
      const authoFlag   = actionEntry.autho;
      const rejectRsn   = actionEntry.reject;

      // ── Montants ─────────────────────────────────────────────────────────
      const amount = this.getAmountForChannel(channel, idx);
      const fee    = +(amount * 0.007).toFixed(3);

      // ── Devise / Pays ─────────────────────────────────────────────────────
      let currency: string;
      let countryCode: string;
      if (idx % 8 === 0) {
        const intl = [['EUR','250'],['GBP','826'],['USD','840'],['TND','788']][idx % 4];
        currency    = intl[0];
        countryCode = intl[1];
      } else {
        currency    = 'MAD';
        countryCode = '504';
      }

      // ── Latence réaliste ─────────────────────────────────────────────────
      let latencyMs: number;
      if (actionCode === '091' || actionCode === '096') {
        latencyMs = 8000 + (idx % 17000);
      } else if (actionCode === '000') {
        latencyMs = 80 + (idx % 520);
      } else {
        latencyMs = 200 + (idx % 1300);
      }

      // ── Dates ─────────────────────────────────────────────────────────────
      const txDate       = ts;
      const respDate     = new Date(txDate.getTime() + latencyMs);
      const bizDate      = new Date(txDate); bizDate.setHours(0,0,0,0);

      const fmtDate      = (d: Date) => d.toISOString().replace('T',' ').slice(0,19);
      const transmitStr  = fmtDate(txDate);
      const responseStr  = fmtDate(respDate);
      const bizDateStr   = bizDate.toISOString().split('T')[0];

      // ── Identifiants uniques ──────────────────────────────────────────────
      const offset    = 99000000 + idx;
      const refNum    = String(offset).padStart(12,'0');
      const intStan   = String((offset - 1) % 999999 + 1).padStart(6,'0');
      const extStan   = String(offset % 999998 + 2).padStart(6,'0');
      const routCode  = String((idx - 1) % 200 + 1).padStart(6,'0');
      const capCode   = String((idx - 1) % 100 + 1).padStart(6,'0');
      const authId    = String(offset).padStart(32,'0');
      const txId      = 'TXN' + String(offset).padStart(29,'0');
      const authCode  = actionCode === '000'
        ? String(offset % 999999 + 1).padStart(6,'0')
        : '';

      // ── Sécurité / EMV ────────────────────────────────────────────────────
      let secLevel: string | undefined;
      let secResult: string | undefined;
      let chipCrypto: string | undefined;
      let chipTvr: string | undefined;
      let chipAip: string | undefined;
      let chipAtc: string | undefined;

      if (channel === 'ECOM') {
        secLevel  = '3DS';
        secResult = authoFlag === 'Y' ? 'VERIFIED' : 'FAILED';
      } else if (entryMode === '05' || entryMode === '07') {
        secLevel  = 'EMV';
        secResult = authoFlag === 'Y' ? 'OK' : 'DECLINED';
        chipCrypto = String(idx + 10000000).padStart(16,'0');
        chipTvr    = String(idx + 1000000).padStart(10,'0');
        chipAip    = String(idx % 10000).padStart(4,'0');
        chipAtc    = String(idx % 9999 + 1).padStart(4,'0');
      }

      const transaction: MockTransaction = {
        transactionId:    txId,
        referenceNumber:  refNum,
        internalStan:     intStan,
        externalStan:     extStan,
        routingCode:      routCode,
        captureCode:      capCode,
        authorizationId:  authId,
        authorizationCode: authCode,

        mti:             mtiCode,
        functionCode:    funcCode,
        processingCode:  channel === 'GAB' ? '01' : '00',
        actionCode:      actionCode,
        reasonCode:      actionCode === '000' ? '0000' : 'R' + actionCode,
        rejectCode:      actionCode === '000' ? '' : actionCode,

        pan:             pan,
        cardNumber:      pan,
        cardSequenceNumber: (idx % 999) + 1,
        cardType:        ['DB','CC','CR','DC'][idx % 4],
        serviceCode:     ['201','281','291','900'][idx % 4],
        endExpiryDate:   this.generateExpiryDate(idx),
        cardLevel:       ['S','G','P'][idx % 3],
        productCode:     productCode,
        issuingBank:     issuerCode,
        vipLevel:        ['N','Y','P'][idx % 3],

        acquirerBank:             acquirerCode,
        acquirerInstitutionCode:  acquirerCode + String(idx % 1000).padStart(3,'0'),
        acquiringCountryCode:     countryCode,
        acquirerCountry:          countryCode,
        cardAcceptorTermId:       terminalId,
        cardAcceptorId:           acceptorId,
        cardAccNameAddress:       merchant,
        merchant:                 merchant,
        cardAcceptorActivity:     mcc,
        mcc:                      mcc,
        receivingInstitution:     'RCV' + acquirerCode,
        forwardingInstitutionCode:'FWD' + issuerCode.slice(0,3),
        forwardingCountryCode:    countryCode,
        forwardingBank:           issuerCode,

        posEntryMode:    entryMode === '01' ? '0100' : entryMode === '05' ? '0510' : '0500',
        posConditionCode: posCondCode,
        posData:         '0000000000010',
        channel:         channel,
        networkId:       networkId,
        isInterbank:     actionCode === '000' ? 'Y' : 'N',

        amount:               amount,
        transactionAmount:    amount,
        cashBackAmount:       0,
        billingAmount:        amount,
        transactionCurrency:  currency,
        billingCurrency:      currency,
        conversionRate:       1.0,
        transactionFee:       fee,
        issSettlementAmount:  amount,
        acqSettlementAmount:  amount,

        timestamp:               txDate,
        transmissionDateAndTime: transmitStr,
        transactionLocalDate:    transmitStr,
        responseDateAndTime:     responseStr,
        captureDate:             transmitStr,
        businessDate:            bizDateStr,
        processingTime:          latencyMs,
        internalTransmissionTime: transmitStr,
        latencyCalculated:       latencyMs,

        reversalFlag:  isReversal ? 'Y' : 'N',
        reversalStan:  isReversal ? intStan : '',
        matchingStatus: actionCode === '000' ? 'M' : 'U',
        matchingDate:   actionCode === '000' ? bizDateStr : '',

        chipApplicationCryptogram: chipCrypto,
        chipAtc:  chipAtc,
        chipTvr:  chipTvr,
        chipIac:  chipAip,
        chipAip:  chipAip,
        chipTerminalCountryCode: '0504',

        securityVerifLevel:  secLevel,
        securityVerifResult: secResult,
        externalCvvResultCode: actionCode === '000' ? '' : actionCode,

        authoFlag:      authoFlag,
        transactionFlag: ['P','A','R'][idx % 3],
        origineCode:    ['A','M','E'][idx % 3],
        userCreate:     'DATA_2000',
        dateCreate:     transmitStr,
        userModif:      'DATA_2000',
        dateModif:      transmitStr,

        responseCode: actionCode,
        message:      `DE22:${entryMode}|DE18:${mcc}|DE49:${countryCode}|DE61:1000`,
      };

      transactions.push(transaction);
    }

    // Tri chronologique final
    return transactions.sort((a, b) =>
      (a.timestamp as Date).getTime() - (b.timestamp as Date).getTime()
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  DISTRIBUTION TEMPORELLE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Construit la table cumulative des poids horaires (lookup O(1)).
   */
  private buildCumulativeWeights(): number[] {
    const cumul: number[] = [];
    let sum = 0;
    for (const w of this.HOUR_WEIGHTS) {
      sum += w;
      cumul.push(sum);
    }
    return cumul; // longueur 24, dernier élément = 100
  }

  /**
   * Pour un index i dans [0, 99], retourne l'heure 0-23 selon les poids.
   */
  private getHourFromCumul(pos: number, cumul: number[]): number {
    for (let h = 0; h < 24; h++) {
      if (pos < cumul[h]) return h;
    }
    return 23;
  }

  /**
   * Génère un tableau de `count` timestamps distribués sur `days` jours.
   * Chaque timestamp est unique (heure + minute + seconde distincts).
   *
   * Algorithme :
   *   - Pour chaque transaction i, le jour est  i % days  (30 derniers jours)
   *   - L'heure est dérivée de la courbe de charge via (i % 100)
   *   - La minute est dérivée de (i * 7 + jour * 3) % 60  → variée
   *   - La seconde est dérivée de (i * 13 + jour * 7) % 60 → unicité sub-minute
   */
  private buildDistributedTimestamps(count: number, days: number, cumul: number[]): Date[] {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return Array.from({ length: count }, (_, i) => {
      const idx  = i + 1;
      const day  = idx % days;                                   // 0 = aujourd'hui, 1 = hier...
      const hour = this.getHourFromCumul(idx % 100, cumul);
      const min  = (idx * 7  + day * 3)  % 60;
      const sec  = (idx * 13 + day * 7)  % 60;
      const ms   = (idx * 97)            % 1000;                 // variété sub-seconde

      const d = new Date(today.getTime() - day * 86_400_000);
      d.setHours(hour, min, sec, ms);
      return d;
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  HELPERS PRIVÉS
  // ──────────────────────────────────────────────────────────────────────────

  private pickActionCode(idx: number): { code: string; autho: string; reject: string } {
    const mod100 = idx % 100;
    let cumul = 0;
    for (const entry of this.ACTION_CODES) {
      cumul += entry.weight * 100;
      if (mod100 < cumul) return entry;
    }
    return this.ACTION_CODES[0];
  }

  private getAmountForChannel(channel: string, idx: number): number {
    if (idx % 50 === 0) return +(200 + (idx % 40000)).toFixed(3);   // haute valeur 2%
    if (channel === 'GAB')  return +(200  + (idx % 3800)).toFixed(3);
    if (channel === 'ECOM') return +(50   + (idx % 7950)).toFixed(3);
    return                         +(20   + (idx % 2980)).toFixed(3); // POS
  }

  private generateExpiryDate(idx: number): string {
    const year  = new Date().getFullYear() + 2 + (idx % 5);
    const month = (idx % 12) + 1;
    return `${year}-${String(month).padStart(2,'0')}-27 23:00:00`;
  }

  injectTransactionsToBackend(transactions: MockTransaction[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/transactions/batch-inject`, transactions);
  }

  // ──────────────────────────────────────────────────────────────────────────
  //  MÉTHODES UTILITAIRES (utilisées par le composant data-generator)
  // ──────────────────────────────────────────────────────────────────────────

  generateHeatmapData(): any {
    const data: any = {};
    const banks = this.BANKS.slice(0, 10);
    const latencies: Record<string, number> = {
      AWB: 280, BCP: 310, BMCE: 295, CIH: 320, BPM: 305,
      CDM: 350, SGM: 330, BOA: 345, CAGM: 360, BCM: 290,
    };
    for (const bank of banks) {
      data[bank] = {};
      for (let h = 0; h < 24; h++) {
        const base   = latencies[bank] ?? 350;
        const weight = this.HOUR_WEIGHTS[h];
        const factor = 1 + (weight / 100) * 1.5;    // plus lent aux heures de pointe
        data[bank][h] = Math.round(base * factor + (h * 7 % 80));
      }
    }
    return data;
  }

  generateLinkAvailabilityData(): any {
    return this.BANKS.slice(0, 10).map((bank, i) => ({
      code:             bank,
      name:             bank,
      uptime:           95 + (i % 5),
      avgResponseTime:  280 + (i * 20),
      lastTestStatus:   i % 12 === 0 ? 'FAILURE' : 'SUCCESS',
    }));
  }

  generateReversalData(): any {
    return Array.from({ length: 24 }, (_, h) => {
      const weight = this.HOUR_WEIGHTS[h];
      const txCount = Math.floor(50 + weight * 30);
      const revCount = Math.floor(txCount * 0.05);
      return {
        hour:             h,
        transactionCount: txCount,
        reversalCount:    revCount,
        reversalRate:     (revCount / txCount) * 100,
        reversedAmount:   revCount * (500 + h * 20),
      };
    });
  }

  generateBusinessLossData(): any {
    return {
      totalLoss:    1_200_000,
      code91Loss:     750_000,
      code96Loss:     450_000,
      failureCount:       860,
    };
  }

  generateEntryModeData(): any {
    return { contactless: 14200, chip: 9800, manual: 3000 };
  }

  generateTop5MCCData(): any {
    return this.MCC_POS.slice(0, 5).map((mcc, i) => ({
      code:             mcc,
      transactionCount: 6000 + i * 800,
      totalAmount:      (6000 + i * 800) * 500,
      successRate:      97 + (i % 3),
    }));
  }

  /**
   * Génère données taille payload vs latence
   */
  generatePayloadSizeData(): any {
    const ranges = [];
    const sizes = [200, 400, 600, 800, 1000];
    
    for (let i = 0; i < sizes.length; i++) {
      const txCount = Math.floor(10000 / (i + 1));
      const latency = 100 + sizes[i] * 0.5 + Math.random() * 200;
      ranges.push({
        size: sizes[i],
        transactionCount: txCount,
        avgLatency: Math.round(latency),
        maxLatency: Math.round(latency * 1.5),
        successRate: 99 - i * 1.2 - Math.random() * 2
      });
    }
    return ranges;
  }
}
