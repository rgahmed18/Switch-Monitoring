import { Injectable, signal } from '@angular/core';
import { PaymentSystemConfig, Transaction } from './models';

// ── MTI group buckets (ISO 8583 / PowerCARD 4-char MTI codes) ────────────────
const MTI_GROUPS: Record<string, string[]> = {
  AUTORISATION: ['0100','0110','0120','0121','1100','1110','1120','1121'],
  ACHAT:        ['0200','0210','0220','0221','1200','1210','1220','1221'],
  REVERSAL:     ['0400','0410','0420','0421','1400','1410','1420','1421'],
  RESEAU:       ['0800','0810','0820','0821'],
};

// ── Mapping bidirectionnel : nom complet ↔ code banque (table AUTHO_ACTIVITY_ADM) ─
// Couvre les 20 banques du script inject_data.sql
const BANK_NAME_TO_CODE: Record<string, string> = {
  // Maroc (noms complets + variantes dashboard bankCodeToName)
  'ATTIJARIWAFA BANK':                      'AWB',
  'BANQUE MAROCAINE DU COMMERCE EXTÉRIEUR': 'BMCE',
  'BMCE BANK':                              'BMCE',
  'BANQUE POPULAIRE DU MAROC':              'BPM',
  'BANQUE POPULAIRE':                       'BPM',
  'BANQUE CENTRALE POPULAIRE':              'BCP',
  'BANK OF AFRICA':                         'BOA',
  'CIH BANK':                               'CIH',
  'CRÉDIT AGRICOLE MAROC':                  'CAGM',
  'CREDIT AGRICOLE MAROC':                  'CAGM',
  'CRÉDIT DU MAROC':                        'CDM',
  'CREDIT DU MAROC':                        'CDM',
  'SOCIÉTÉ GÉNÉRALE MAROC':                 'SGM',
  'SOCIETE GENERALE MAROC':                 'SGM',
  'BANQUE CENTRALE':                        'BCM',
  // Variantes noms mixtes (dashboard bankCodeToName → même code Oracle)
  'Attijariwafa Bank':                      'AWB',
  'Banque Centrale Populaire':              'BCP',
  'BMCE Bank':                              'BMCE',
  'CIH Bank':                               'CIH',
  'Banque Populaire du Maroc':              'BPM',
  'Crédit du Maroc':                        'CDM',
  'Société Générale Maroc':                 'SGM',
  'Bank of Africa':                         'BOA',
  'Crédit Agricole Maroc':                  'CAGM',
  'Banque Centrale':                        'BCM',
  // International
  'BANQUE INTERNATIONALE ARABE DE TUNISIE': 'BIAT',
  'Banque Internationale Arabe de Tunisie': 'BIAT',
  'STANDARD BANK':                          'STDB',
  'Standard Bank':                          'STDB',
  'BNP PARIBAS':                            'BNP',
  'BNP Paribas':                            'BNP',
  'HSBC':                                   'HSBC',
  'JPMORGAN CHASE':                         'JPMCH',
  'JPMorgan Chase':                         'JPMCH',
  'ICBC':                                   'ICBC',
  'BANK OF TOKYO-MITSUBISHI UFJ':           'MUFG',
  'Bank of Tokyo-Mitsubishi UFJ':           'MUFG',
  'SAUDI NATIONAL BANK':                    'SNBSA',
  'Saudi National Bank':                    'SNBSA',
  'FIRST ABU DHABI BANK':                   'FAB',
  'First Abu Dhabi Bank':                   'FAB',
  'ZENITH BANK':                            'ZENTH',
  'Zenith Bank':                            'ZENTH',
};

// Inverse : code court → nom complet (pour matching dropdown → données Oracle)
const BANK_CODE_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(BANK_NAME_TO_CODE).map(([name, code]) => [code, name])
);

// ── Mapping zone UI → codes pays ISO 3166 numérique (acquiringCountryCode Oracle) ─
// ApiService mappe : acquiringCountryCode='504' → zone='Local', sinon 'International'
// Ici on mappe les noms de zones du dropdown vers les codes pays connus dans Oracle
const ZONE_TO_COUNTRY_CODES: Record<string, string[]> = {
  'Local':         ['504'],
  'International': [], // tout sauf 504 — géré spécialement dans le filtre
  'Afrique':       ['504','012','566','710','818','384','788','686'],
  'Europe':        ['250','826','724','276','300','056','528','380','620'],
  'Amériques':     ['840','124','484','076'],
  'Asie':          ['156','392','702','344'],
  'Moyen-Orient':  ['682','784','792'],
};

// ── Mapping nom pays lisible (dropdown UI) → code ISO 3166 numérique (Oracle) ─
// Couvre les pays présents dans inject_data.sql :
//   504=Maroc, 250=France, 826=Royaume-Uni, 840=Etats-Unis, 788=Tunisie
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'Maroc':          '504',
  'France':         '250',
  'Royaume-Uni':    '826',
  'Etats-Unis':     '840',
  'États-Unis':     '840',
  'Tunisie':        '788',
  'Algérie':        '012',
  'Nigeria':        '566',
  'Afrique du Sud': '710',
  'Égypte':         '818',
  "Côte d'Ivoire":  '384',
  'Sénégal':        '686',
  'Espagne':        '724',
  'Allemagne':      '276',
  'Grèce':          '300',
  'Belgique':       '056',
  'Pays-Bas':       '528',
  'Italie':         '380',
  'Portugal':       '620',
  'Canada':         '124',
  'Mexique':        '484',
  'Brésil':         '076',
  'Chine':          '156',
  'Japon':          '392',
  'Singapour':      '702',
  'Hong Kong':      '344',
  'Arabie Saoudite':'682',
  'Emirats Arabes Unis': '784',
  'Turquie':        '792',
};

// ── Normalize string : upper-case + strip diacritics ─────────────────────────
function normalizeStr(s: string): string {
  return s.trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// ── Response code classification sets ────────────────────────────────────────
const SUCCESS_CODES   = new Set(['00','000']);
const FRAUD_CODES     = new Set(['102','105','106','129','134','141','143','181','182','183','188']);
const TIMEOUT_CODES   = new Set(['906','907','908','909','910','911','912','98']);
const PROVISION_CODES = new Set(['051','51','061','61','65','065']);

// ============================================================================
// FILTER STATE INTERFACE
// ============================================================================

export interface FilterState {
  // Original filters
  transactionType: string;
  region: string;
  country: string;
  bankName: string;
  dateRange: string;

  // Date range explicit (YYYY-MM-DD)
  dateStart?: string;
  dateEnd?: string;
  // Time range (HH:mm) — filtre les transactions dans l'intervalle horaire
  timeStart?: string;
  timeEnd?: string;

  // Geographic filters
  zone?: string;
  selectedCountry?: string;
  selectedBank?: string;
  bank?: string;

  // Transaction type filters
  type?: string;
  mtiType?: string;
  mtiGroup?: string; // 'AUTORISATION' | 'ACHAT' | 'REVERSAL' | 'RESEAU' | ''
  operationType?: string;

  // Channel & Actor filters
  channel?: 'ATM' | 'POS' | 'ECOM' | '';
  actorType?: 'ISSUER' | 'ACQUIRER' | '';
  securityMethod?: string;

  // Payment network filters
  paymentNetwork?: 'VISA' | 'MASTERCARD' | 'SWIFT' | 'LOCAL' | '';
  currency?: string;

  // Status filters
  responseCode?: string;
  codeReponseGroupe?: string; // 'SUCCES' | 'FRAUDE' | 'TIMEOUT' | 'PROVISION' | 'REFUS' | ''
  transactionStatus?: string;

  // Advanced filters
  fraudScoreMin?: number;
  fraudScoreMax?: number;
  latencyMin?: number;
  latencyMax?: number;
  socketRetryCount?: number;
}

// ============================================================================
// REFERENCE DATA FOR DROPDOWNS & CHARTS
// ============================================================================

export interface ReferenceData {
  zones: string[];
  countries: { [zone: string]: string[] };
  banks: { [country: string]: string[] };
  transactionTypes: { [mti: string]: string };
  responseCodes: { [code: string]: string };
  securityMethods: { [channel: string]: string[] };
  transactionStatuses: { [status: string]: string };
  channels: string[];
  actors: string[];
  paymentNetworks: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  // ============================================================================
  // GLOBAL APPLICATION STATE
  // ============================================================================

  // Live data status
  public isLive = signal<boolean>(true);

  // Language toggle (FR/EN)
  public lang = signal<'fr' | 'en'>('en');

  // ============================================================================
  // USER FILTERS
  // ============================================================================

  // Global transaction filters
  public filters = signal<FilterState>({
    transactionType: 'Toutes',
    region: 'Toutes',
    country: 'Toutes',
    bankName: 'Toutes',
    dateRange: '',
    dateStart: '',
    dateEnd: '',
    timeStart: '',
    timeEnd: '',
    zone: '',
    selectedCountry: '',
    selectedBank: '',
    channel: '',
    actorType: '',
    securityMethod: '',
    mtiType: '',
    mtiGroup: '',
    operationType: '',
    paymentNetwork: '',
    responseCode: '',
    codeReponseGroupe: '',
    transactionStatus: '',
    fraudScoreMin: 0,
    fraudScoreMax: 100,
    latencyMin: 0,
    latencyMax: 30000,
    socketRetryCount: 0
  });

  // ============================================================================
  // SYSTEM CONFIGURATION (ISO 8583, CODES, ETC)
  // ============================================================================

  // Complete payment system configuration from backend
  public systemConfig = signal<PaymentSystemConfig | null>(null);

  // Reference data for dropdowns
  public referenceData = signal<ReferenceData>({
    zones: [],
    countries: {},
    banks: {},
    transactionTypes: {},
    responseCodes: {},
    securityMethods: {},
    transactionStatuses: {},
    channels: ['ATM', 'POS', 'ECOM'],
    actors: ['ISSUER', 'ACQUIRER'],
    paymentNetworks: ['VISA', 'MASTERCARD', 'SWIFT', 'LOCAL']
  });

  // ============================================================================
  // LOADING & UI STATE
  // ============================================================================

  public isLoadingConfig = signal<boolean>(false);
  public configLoadError = signal<string | null>(null);
  public configLastUpdated = signal<Date | null>(null);

  // ============================================================================
  // METHODS
  // ============================================================================

  constructor() {
    // Initialize with current timestamp
    this.configLastUpdated.set(new Date());
  }

  /**
   * Toggle live data mode (real-time vs historical)
   */
  toggleLive(): void {
    this.isLive.update(v => !v);
  }

  /**
   * Toggle language (FR <=> EN)
   */
  toggleLanguage(): void {
    this.lang.update(v => v === 'fr' ? 'en' : 'fr');
  }

  /**
   * Update filters (partial update)
   */
  setFilters(newFilters: Partial<FilterState>): void {
    this.filters.update(curr => ({ ...curr, ...newFilters }));
  }

  /**
   * Reset all filters to default
   */
  resetFilters(): void {
    this.filters.set({
      transactionType: 'Toutes',
      region: 'Toutes',
      country: 'Toutes',
      bankName: 'Toutes',
      dateRange: '',
      dateStart: '',
      dateEnd: '',
      timeStart: '',
      timeEnd: '',
      zone: '',
      selectedCountry: '',
      selectedBank: '',
      channel: '',
      actorType: '',
      securityMethod: '',
      mtiType: '',
      mtiGroup: '',
      operationType: '',
      paymentNetwork: '',
      responseCode: '',
      codeReponseGroupe: '',
      transactionStatus: '',
      fraudScoreMin: 0,
      fraudScoreMax: 100,
      latencyMin: 0,
      latencyMax: 30000,
      socketRetryCount: 0
    });
  }

  /**
   * Apply current filter state to a transaction array (client-side filtering).
   *
   * Valeurs réelles Oracle (inject_data.sql) :
   *   acquirerBank / issuingBank  : codes 6 chars  'AWB','BCP','BMCE','CIH'...
   *   acquiringCountryCode        : ISO numérique   '504'(Maroc),'250','826','840','788'
   *   transactionCurrency         : ISO alpha        'MAD','EUR','GBP','USD','TND'
   *   messageType (MTI)           : PowerCARD 1xxx   '1200','1100','1420'
   *   actionCode                  : PowerCARD 3 ch   '000','051','055','054','005','091','014','096'
   *   authoFlag                   : 'Y' / 'N'
   *   posConditionCode            : '01','00','59','90'
   *   cardAcceptorTermId          : commence par 'GAB' (ATM) ou 'POS' ou null (ECM)
   *   cardAcceptorId              : commence par 'ATM' (ATM) ou 'MRC' (POS) ou 'ECM' (ECOM)
   *
   * Après mapping ApiService :
   *   tx.zone     = 'Local' (504) | 'International' (autres)
   *   tx.country  = acquiringCountryCode brut  ('504','250'...)
   *   tx.channel  = 'GAB' (ATM) | 'POS' | 'ECOM'
   *   tx.currency = transactionCurrency ('MAD','EUR'...)
   *   tx.mtiCode  = normalisé 0xxx   ('0200','0100','0420')
   *   tx.responseCode = ISO 2 chars  ('00','51','55'...)
   *   tx.acquirerBank / tx.issuingBank = codes trimés ('AWB','BCP'...)
   */
  applyFilters(transactions: Transaction[]): Transaction[] {
    const f = this.filters();
    let result = transactions;

    // ── DATE ──────────────────────────────────────────────────────────────────
    if (f.dateStart || f.dateEnd) {
      const getTxTime = (tx: any): number => {
        const raw = tx.transmissionDateAndTime || tx.timestamp
                 || tx.transactionLocalDate   || tx.dateCreate || '';
        if (!raw) return 0;
        const t = new Date(raw).getTime();
        return isNaN(t) ? 0 : t;
      };
      if (f.dateStart) {
        const start = new Date(f.dateStart).getTime();
        result = result.filter(tx => getTxTime(tx) >= start);
      }
      if (f.dateEnd) {
        const end = new Date(f.dateEnd + 'T23:59:59').getTime();
        result = result.filter(tx => getTxTime(tx) <= end);
      }
    }

    // ── HEURE ─────────────────────────────────────────────────────────────────
    // Filtre sur la tranche horaire (HH:mm) indépendamment de la date
    // Permet ex: voir toutes les tx entre 08:00 et 10:00 sur la période sélectionnée
    if (f.timeStart || f.timeEnd) {
      const toMinutes = (hhmm: string): number => {
        const [h, m] = hhmm.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
      };
      const getTxMinutes = (tx: any): number => {
        const raw = (tx as any).transmissionDateAndTime || (tx as any).timestamp || '';
        if (!raw) return -1;
        const d = new Date(raw);
        if (isNaN(d.getTime())) return -1;
        return d.getHours() * 60 + d.getMinutes();
      };
      if (f.timeStart) {
        const startMin = toMinutes(f.timeStart);
        result = result.filter(tx => {
          const txMin = getTxMinutes(tx);
          return txMin >= 0 && txMin >= startMin;
        });
      }
      if (f.timeEnd) {
        const endMin = toMinutes(f.timeEnd);
        result = result.filter(tx => {
          const txMin = getTxMinutes(tx);
          return txMin >= 0 && txMin <= endMin;
        });
      }
    }

    // ── ZONE ──────────────────────────────────────────────────────────────────
    // tx.zone = 'Local' (acquiringCountryCode='504') ou 'International' (autres)
    // Le dropdown propose aussi : 'Afrique', 'Europe', etc. → mappés via ZONE_TO_COUNTRY_CODES
    if (f.zone) {
      const zKey    = f.zone.trim();
      const txCodes = ZONE_TO_COUNTRY_CODES[zKey]; // codes pays ISO numérique pour cette zone
      result = result.filter(tx => {
        const txZone    = ((tx as any).zone    || '').trim();
        const txCountry = ((tx as any).country || (tx as any).acquiringCountryCode || '').trim();

        // Correspondance directe sur tx.zone ('Local' ou 'International')
        if (txZone.toLowerCase() === zKey.toLowerCase()) return true;

        // 'Local' = code Maroc 504 uniquement (couvre tx.zone non renseigné)
        if (zKey === 'Local') return txCountry === '504';

        // 'International' = tout sauf le code Maroc 504
        if (zKey === 'International') return txCountry !== '' && txCountry !== '504';

        // Zones géographiques (Afrique, Europe, etc.) :
        // vérifier si le code pays ISO de la tx est dans la liste de la zone
        if (txCodes && txCodes.length > 0) return txCodes.includes(txCountry);

        return false;
      });
    }

    // ── PAYS ──────────────────────────────────────────────────────────────────
    // tx.country = acquiringCountryCode brut ('504','250','826'...)
    // Le dropdown affiche des noms lisibles ('Maroc','France'...) venant de config.zones
    // → mapper nom pays → code ISO numérique (avec normalisation accent + casse)
    if (f.selectedCountry) {
      const sc = f.selectedCountry.trim();
      // Chercher le code ISO via mapping exact, puis via normalisation
      let code = COUNTRY_NAME_TO_CODE[sc];
      if (!code) {
        const normSc = normalizeStr(sc);
        const foundKey = Object.keys(COUNTRY_NAME_TO_CODE).find(k => normalizeStr(k) === normSc);
        code = foundKey ? COUNTRY_NAME_TO_CODE[foundKey] : sc;
      }
      result = result.filter(tx => {
        const txCountry = ((tx as any).country || (tx as any).acquiringCountryCode || '').trim();
        return txCountry === code || txCountry === sc;
      });
    }

    // ── BANQUE ────────────────────────────────────────────────────────────────
    // tx.acquirerBank / tx.issuingBank = codes Oracle 6 chars  ('AWB','BCP','BMCE'...)
    // tx.bankName = idem (alias calculé par ApiService)
    // Le dropdown affiche noms complets ('Attijariwafa Bank') venant de config.banks
    // → résoudre le code court via BANK_NAME_TO_CODE (normalisation accent + casse)
    if (f.selectedBank) {
      const sel = normalizeStr(f.selectedBank);

      // Chercher le code Oracle correspondant (case+accent insensitive sur les clés)
      const foundKey = Object.keys(BANK_NAME_TO_CODE).find(k => normalizeStr(k) === sel);
      // Si on a trouvé une clé → code court Oracle ; sinon la valeur brute (peut déjà être un code)
      const selCode  = foundKey ? BANK_NAME_TO_CODE[foundKey].toUpperCase() : sel;

      result = result.filter(tx => {
        const acq  = normalizeStr((tx as any).acquirerBank || '');
        const iss  = normalizeStr((tx as any).issuingBank  || '');
        const bank = normalizeStr((tx as any).bankName     || '');
        // Match code court Oracle (ex: AWB) OU nom normalisé direct
        return acq === selCode || iss === selCode || bank === selCode
            || acq === sel    || iss === sel    || bank === sel;
      });
    }

    // ── CANAL ─────────────────────────────────────────────────────────────────
    // tx.channel après ApiService mapping :
    //   Oracle ATM (termId=GAB...) → 'GAB'
    //   Oracle POS                 → 'POS'
    //   Oracle ECM (condCode=59)   → 'ECOM'
    // Dropdown value='ATM' → doit matcher 'GAB' et 'ATM'
    // Dropdown value='ECOM' → doit matcher 'ECOM' et 'ECM'
    if (f.channel) {
      const ch = f.channel.toUpperCase();
      result = result.filter(tx => {
        const txCh = ((tx as any).channel || '').toUpperCase();
        if (ch === 'ATM')  return txCh === 'ATM' || txCh === 'GAB';
        if (ch === 'ECOM') return txCh === 'ECOM' || txCh === 'ECM';
        return txCh === ch;
      });
    }

    // ── TYPE MTI ──────────────────────────────────────────────────────────────
    // tx.mtiCode après ApiService = normalisé 0xxx ('0200','0100','0420')
    // tx.messageType (brut Oracle) = PowerCARD 1xxx ('1200','1100','1420')
    // MTI_GROUPS contient les codes 0xxx — on normalise avant comparaison
    if (f.mtiGroup && MTI_GROUPS[f.mtiGroup]) {
      const allowed = new Set(MTI_GROUPS[f.mtiGroup]);
      result = result.filter(tx => {
        const raw  = ((tx as any).mtiCode || (tx as any).messageType || '').trim();
        const norm = raw.startsWith('1') ? raw.replace(/^1/, '0') : raw; // 1200→0200
        return allowed.has(raw) || allowed.has(norm);
      });
    }

    // ── DEVISE ────────────────────────────────────────────────────────────────
    // tx.currency = transactionCurrency mappé par ApiService ('MAD','EUR','GBP','USD','TND')
    if (f.currency) {
      result = result.filter(tx => {
        const cur = ((tx as any).currency || (tx as any).transactionCurrency || '').trim();
        return cur === f.currency;
      });
    }

    // ── CODE RÉPONSE ──────────────────────────────────────────────────────────
    // tx.actionCode  = brut Oracle PowerCARD 3 chars ('000','051','055','054','005','091','014','096')
    // tx.responseCode = normalisé ISO 2 chars par ApiService ('00','51','55','54','05','91','14','96')
    // On compare sur les deux pour couvrir toutes les sources
    if (f.codeReponseGroupe) {
      result = result.filter(tx => {
        const rawAc = ((tx as any).actionCode   || '').trim();
        const isoRc = ((tx as any).responseCode || '').trim();
        const has   = (s: Set<string>) => s.has(rawAc) || s.has(isoRc);
        switch (f.codeReponseGroupe) {
          case 'SUCCES':    return has(SUCCESS_CODES);
          case 'FRAUDE':    return has(FRAUD_CODES);
          case 'TIMEOUT':   return has(TIMEOUT_CODES);
          case 'PROVISION': return has(PROVISION_CODES);
          case 'REFUS':
            return (rawAc !== '' || isoRc !== '')
                && !has(SUCCESS_CODES) && !has(FRAUD_CODES)
                && !has(TIMEOUT_CODES) && !has(PROVISION_CODES);
          default: return true;
        }
      });
    }

    return result;
  }

  /**
   * Update system configuration from backend
   */
  setSystemConfig(config: PaymentSystemConfig): void {
    this.systemConfig.set(config);
    this.configLastUpdated.set(new Date());
    this.configLoadError.set(null);
    
    // Update reference data from config
    if (config.zones) {
      const zones = Object.keys(config.zones);
      const refData = this.referenceData();
      this.referenceData.set({
        ...refData,
        zones,
        countries: config.zones,
        banks: config.banks || {},
        transactionTypes: config.transactionTypes || {},
        responseCodes: config.responseCodes || {},
        securityMethods: config.securityMethods || {},
        transactionStatuses: config.transactionStatuses || {}
      });
    }
  }

  /**
   * Set loading state for configuration
   */
  setConfigLoading(loading: boolean): void {
    this.isLoadingConfig.set(loading);
  }

  /**
   * Set configuration load error
   */
  setConfigError(error: string | null): void {
    this.configLoadError.set(error);
  }

  /**
   * Get current filters as querystring
   */
  getFiltersAsQueryString(): string {
    const f = this.filters();
    const params = new URLSearchParams();
    
    Object.entries(f).forEach(([key, value]) => {
      if (value && value !== 'Toutes' && value !== '') {
        params.append(key, String(value));
      }
    });
    
    return params.toString();
  }

  /**
   * Check if any filter is active
   */
  hasActiveFilters(): boolean {
    const f = this.filters();
    return Object.values(f).some(v => v && v !== 'Toutes' && v !== '' && v !== 0);
  }

  /**
   * Get count of active filters (uniquement les filtres textuels/date réellement actifs)
   */
  getActiveFilterCount(): number {
    const f = this.filters();
    let count = 0;
    if (f.dateStart)          count++;
    if (f.dateEnd)            count++;
    if (f.timeStart)          count++;
    if (f.timeEnd)            count++;
    if (f.zone)               count++;
    if (f.selectedCountry)    count++;
    if (f.selectedBank)       count++;
    if (f.channel)            count++;
    if (f.mtiGroup)           count++;
    if (f.currency)           count++;
    if (f.codeReponseGroupe)  count++;
    if (f.paymentNetwork)     count++;
    return count;
  }
}
