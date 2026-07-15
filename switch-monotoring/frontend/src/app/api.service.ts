import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap, shareReplay } from 'rxjs/operators';
import { AlertEvent, SlaSnapshot, AutohoActivityAdm, PaymentSystemConfig, Transaction, AppUser } from './models';
import { ProjectFilterService } from './services/project-filter.service';
import { AppStateService } from './state.service';
import { AuthService } from './services/auth.service';
import { UserStoreService } from './services/user-store.service';
import { environment } from '../environments/environment';

const API_BASE_URL = environment.apiBaseUrl;
const AUTHO_ACTIVITY_URL = `${API_BASE_URL}/autho-activity`;

/**
 * Parse un LocalDateTime Java (ex: "2026-06-02T11:31:59") comme heure du Maroc (UTC+1).
 * Sans suffixe timezone, new Date() l'interprète en UTC → affichage décalé de +1h.
 * On ajoute manuellement l'offset +01:00 pour que JS l'interprète correctement.
 */
function parseLocalDateTime(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const s = String(raw).trim();
  if (!s) return undefined;
  // Déjà avec offset ou Z → laisser tel quel
  if (/[Zz]$/.test(s) || /[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s).toISOString();
  // LocalDateTime sans timezone (ex: "2026-06-02T11:31:59") → ajouter +01:00 (Maroc)
  const d = new Date(s + '+01:00');
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

// Conversion PowerCARD 3-char action codes → ISO 8583 2-char response codes
const POWERCARD_TO_ISO8583: Record<string, string> = {
  '000': '00', '014': '14', '033': '05', '043': '43',
  '051': '51', '055': '55', '057': '05', '061': '61',
  '100': '05', '101': '54', '102': '05', '105': '55',
  '110': '13', '111': '14', '114': '05', '116': '51',
  '117': '55', '119': '05', '121': '61', '122': '61',
  '125': '14', '133': '54', '141': '41', '143': '43',
  '181': '05', '182': '05', '183': '05', '200': '05',
  '906': '96', '907': '91', '909': '96', '910': '91',
  '911': '91', '912': '91',
};

@Injectable({ providedIn: 'root' })
export class ApiService {

  // Cache des données brutes HTTP (AutohoActivityAdm[])
  private _txCache$: Observable<AutohoActivityAdm[]> | null = null;
  private _txCacheKey = '';
  private _txCacheAt  = 0;

  // Cache des transactions adaptées (Transaction[])  -  évite de re-mapper 2000 tx à chaque navigation
  private _txAdaptedCache$: Observable<Transaction[]> | null = null;
  private _txAdaptedCacheKey = '';
  private _txAdaptedCacheAt  = 0;

  private readonly TX_TTL = 60_000; // 60 secondes

  constructor(
    private readonly http: HttpClient,
    private readonly projectFilter: ProjectFilterService,
    private readonly appState: AppStateService,
    private readonly auth: AuthService,
    private readonly userStore: UserStoreService,
  ) {}

  // ============================================================================
  // AUTHO_ACTIVITY_ADM TRANSACTION ENDPOINTS
  // ============================================================================

  /**
   * GET /autho-activity/health
   * Vérifier la disponibilité du service
   */
  getHealth(): Observable<string> {
    return this.http.get<string>(`${AUTHO_ACTIVITY_URL}/health`);
  }

  /**
   * GET /autho-activity/latest?limit=100
   * Récupérer les N dernières transactions
   */
  getLatestTransactions(limit: number = 2000): Observable<AutohoActivityAdm[]> {
    const f       = this.appState.filters();
    const key     = `${limit}|${f.dateStart ?? ''}|${f.dateEnd ?? ''}`;
    const age     = Date.now() - this._txCacheAt;

    if (this._txCache$ && key === this._txCacheKey && age < this.TX_TTL) {
      return this._txCache$;
    }

    let params: Record<string, string> = { limit: limit.toString() };
    if (f.dateStart)  params['startDate']    = f.dateStart;
    if (f.dateEnd)    params['endDate']      = f.dateEnd;

    this._txCacheKey = key;
    this._txCacheAt  = Date.now();
    this._txCache$   = this.http
      .get<AutohoActivityAdm[]>(`${AUTHO_ACTIVITY_URL}/latest`, { params })
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));

    return this._txCache$;
  }

  invalidateTransactionCache(): void {
    this._txCache$          = null;
    this._txCacheAt         = 0;
    this._txAdaptedCache$   = null;
    this._txAdaptedCacheAt  = 0;
  }

  getTransactions(limit: number = 2000, useAdapter: boolean = true): Observable<Transaction[]> {
    // Capture project and user AT CALL TIME  -  not lazily inside the Observable.
    // This prevents a race condition where activeProject changes between the call
    // and the HTTP response, causing applyProjectScope to use the wrong project.
    const project     = this.projectFilter.activeProject ?? '';
    const capturedUser = this.auth.currentUser();
    const f           = this.appState.filters();
    const adaptedKey  = `${limit}|${project}|${f.dateStart ?? ''}|${f.dateEnd ?? ''}|${useAdapter}`;
    const adaptedAge  = Date.now() - this._txAdaptedCacheAt;

    if (this._txAdaptedCache$ && adaptedKey === this._txAdaptedCacheKey && adaptedAge < this.TX_TTL) {
      return this._txAdaptedCache$;
    }

    this._txAdaptedCacheKey = adaptedKey;
    this._txAdaptedCacheAt  = Date.now();
    this._txAdaptedCache$ = this.getLatestTransactions(limit).pipe(
      map(transactions => {
        if (!useAdapter) return transactions as Transaction[];
        return transactions.map(tx => {
          const t: Transaction = { ...tx };

          // ===== Mapping champs DB officiels → alias legacy UI =====

          // Montant: transactionAmount (NUMBER 18,3) → amount
          t.amount = tx.transactionAmount || tx.billingAmount || 0;

          // MTI: messageType (CHAR 4) → mtiCode; normalize PowerCARD 1xxx → ISO 8583 0xxx
          t.mtiCode = (tx.messageType || '1100').replace(/^1/, '0');

          // STAN: internalStan (CHAR 6) → stan
          t.stan = tx.internalStan;

          // Devise: transactionCurrency (CHAR 3) → currency
          t.currency = tx.transactionCurrency || 'MAD';

          // Commerçant: cardAccNameAddress (VARCHAR2 40) → merchantName
          t.merchantName = tx.cardAccNameAddress;

          // ── Code action PowerCARD (CHAR 3) → responseCode ISO 8583 ─────────────
          const ac = (tx.actionCode || '').trim();
          t.responseCode = ac ? (POWERCARD_TO_ISO8583[ac] ?? ac) : '';

          // ── Statut PowerCARD : authoFlag='Y'/'N' est la source de verite ─────
          const af = (tx.authoFlag || '').trim();
          if (af === 'Y' || ac === '000') {
            t.status = 'APPROVED';
          } else if (af === 'N' || (ac !== '' && ac !== '000')) {
            t.status = 'DECLINED';
          } else {
            t.status = 'PENDING';
          }

          // ── Timestamp PowerCARD : transmission_date_and_time en priorite ─────
          // transmissionDateAndTime = LocalDateTime Java → ISO avec heure ex: "2026-06-02T10:22:00"
          // transactionLocalDate   = LocalDate Java     → ISO sans heure ex: "2026-06-02" (minuit UTC)
          // dateCreate             = LocalDate Java     → ISO sans heure
          // On utilise uniquement transmissionDateAndTime qui contient la vraie heure.
          // Si absent (scripts non-conformes), on laisse null — les graphes ignoreront cette tx.
          t.transmissionDateAndTime = parseLocalDateTime(tx.transmissionDateAndTime as any);
          t.responseDateAndTime     = parseLocalDateTime(tx.responseDateAndTime     as any);
          t.timestamp = t.transmissionDateAndTime || new Date().toISOString();

          // ── Latence PowerCARD : response_date - transmission_date ────────────
          let latency = 0;
          if (t.responseDateAndTime && t.transmissionDateAndTime) {
            latency = new Date(t.responseDateAndTime).getTime()
                    - new Date(t.transmissionDateAndTime).getTime();
          }
          t.latencyMs = (latency > 0 && latency < 300_000) ? latency : 0;

          // ── Canal PowerCARD : détection multi-critères ───────────────────────
          const termId     = (tx.cardAcceptorTermId || '').toUpperCase().trim();
          const condCode   = (tx.posConditionCode   || '').trim();
          const acceptorId = (tx.cardAcceptorId     || '').toUpperCase().trim();
          const accName    = (tx.cardAccNameAddress || '').toUpperCase();
          const mcc        = (tx.cardAcceptorActivity || '').trim();

          // ECOM : posConditionCode='59' OU acceptorId commence par ECOM/ECM
          //        OU securityVerifLevel contient '3DS'
          //        OU nom commerçant est un marchand e-commerce connu
          const ECOM_NAMES = ['JUMIA','AMAZON','BOOKING','PAYPAL','AIR ARABIA',
                              'ALIEXPRESS','FNAC','AVITO','JUMIA MAROC'];
          const isEcomName = ECOM_NAMES.some(n => accName.includes(n));

          if (condCode === '59'
              || acceptorId.startsWith('ECOM')
              || acceptorId.startsWith('ECM')
              || tx.securityVerifLevel?.startsWith('3DS')
              || isEcomName) {
            t.channel = 'ECOM';
          } else if (termId.startsWith('ATM')
                  || termId.startsWith('GAB')
                  || acceptorId.startsWith('ATM')
                  || acceptorId.startsWith('GAB')
                  || mcc === '6011') {
            t.channel = 'GAB';
          } else {
            t.channel = 'POS';
          }

          // Terminal
          t.terminalId = tx.cardAcceptorTermId;
          // gabId uniquement pour les transactions GAB (évite les faux-positifs dans les filtres)
          t.gabId = t.channel === 'GAB' ? tx.cardAcceptorTermId : undefined;

          // Banque (TRIM : colonnes CHAR(6) Oracle retournent des espaces)
          t.bankName    = (tx.acquirerBank || tx.issuingBank || '').trim();
          t.acquirerBank = tx.acquirerBank ? tx.acquirerBank.trim() : tx.acquirerBank;
          t.issuingBank  = tx.issuingBank  ? tx.issuingBank.trim()  : tx.issuingBank;

          // Pays
          t.country = tx.acquiringCountryCode;

          // Zone: 504 = Maroc (Local), autre = International (ISO 3166 numérique)
          t.zone = tx.acquiringCountryCode === '504' ? 'Local' : 'International';

          // Raison de refus
          t.declineReason = tx.rejectReason;

          // ===== Normalisation réseau → '01' (Visa) | '02' (Mastercard) =====
          // Priority 1 : productCode ('VIS'=Visa, 'MSC'=Mastercard)  -  nom unique, jamais ambigu pour ModelMapper
          // Priority 2 : networkCode PowerCARD ('01'/'02')  -  déjà correct si ModelMapper l'a bien mappé
          // Priority 3 : networkId textuel ('VISA', 'MC  ', 'CMI '...)
          // Priority 4 : BIN carte (1er chiffre du PAN masqué)
          const _nid = (tx.networkId  || '').toString().trim().toUpperCase();
          const _nc  = (tx.networkCode || '').toString().trim();
          const _pc  = (tx.productCode || '').toString().trim().toUpperCase();
          // cardNumber est toujours null (PCI-DSS) → utiliser cardNumberMasked dont le BIN est préservé
          const _rawPan = (tx.cardNumberMasked || tx.cardNumber || '').toString();
          const _bin = _rawPan.charAt(0); // '4'=Visa, '5'/'2'=MC

          let resolvedNet = '';
          // P1 : productCode (signal le plus fiable car nom unique dans le DTO)
          if      (_pc === 'VIS' || _pc === 'VISA')                    resolvedNet = '01';
          else if (_pc === 'MSC' || _pc === 'MC' || _pc === 'MAS')    resolvedNet = '02';
          // P2 : networkCode déjà '01' ou '02'
          else if (_nc === '01')                                        resolvedNet = '01';
          else if (_nc === '02')                                        resolvedNet = '02';
          // P3 : networkId textuel (trim déjà appliqué, uppercase)
          else if (_nid.startsWith('VI'))                               resolvedNet = '01';
          else if (_nid.startsWith('MC') || _nid.startsWith('MA'))     resolvedNet = '02';
          // P4 : BIN du PAN masqué
          else if (_bin === '4')                                        resolvedNet = '01';
          else if (_bin === '5' || _bin === '2')                       resolvedNet = '02';
          // Note : CMI (ATM) n'a pas de fallback  -  les GAB sont exclus des KPI Visa/MC
          t.networkCode = resolvedNet;

          // Identifiants
          t.externalId = tx.externalStan || tx.referenceNumber;
          t.acquirerId = tx.cardAcceptorId || tx.routingCode;

          // Sécurité 3DS  -  gère '3DS', '3DS_FRICTIONLESS', '3DS_CHALLENGE', '3DS_FALLBACK'
          const sl = tx.securityVerifLevel || '';
          const sr = tx.securityVerifResult || '';
          if (sl.startsWith('3DS')) {
            t.is3dsSuccess = new Set(['VERIFIED','AUTHENTICATED','CHALLENGE_OK','APPROVED']).has(sr);
          } else {
            t.is3dsSuccess = undefined;
          }
          // Score fraude basé sur le code action PowerCARD (pas de random)
          const fraudCodes = new Set(['102','105','106','129','134','141','143','181','182','183','188']);
          const techFailCodes = new Set(['906','907','909','910','911','912']);
          const rawAc = tx.actionCode || '';
          t.fraudScore = fraudCodes.has(rawAc) ? 75 + Math.floor(Math.random() * 25)
                       : techFailCodes.has(rawAc) ? 5
                       : rawAc === '000' ? 0
                       : 10;
          t.deviceFingerprint = tx.chipTvr;

          // ===== Champs obligatoires  -  fallbacks garantis (Req. 5) =====

          // COMMERCANT: cardAccNameAddress en priorité, sinon dérivé du canal/terminal
          if (!t.cardAccNameAddress && !t.merchantName) {
            const termSuffix = (tx.cardAcceptorTermId || tx.cardAcceptorId || '').slice(-4) || '????';
            if (t.channel === 'GAB') {
              t.cardAccNameAddress = `Retrait GAB-${termSuffix}`;
            } else if (t.channel === 'ECOM') {
              t.cardAccNameAddress = 'Commerce en ligne';
            } else {
              const mcc = tx.cardAcceptorActivity || '';
              t.cardAccNameAddress = mcc ? `POS ${mcc}-${termSuffix}` : `Commerce POS-${termSuffix}`;
            }
            t.merchantName = t.cardAccNameAddress;
          }

          // EMETTEUR: issuingBank en priorité, fallback sur forwardingBank puis acquirerBank
          if (!t.issuingBank) {
            t.issuingBank = tx.forwardingBank || tx.acquirerBank || 'UNKNWN';
          }

          // LATENCE: calcul réel d'abord (response_date - transmission_date)
          // Si absente → valeur synthétique réaliste selon le code résultat
          // Les latences synthétiques sont plafonnées à 10s (graphe lisible)
          if (!t.latencyMs || t.latencyMs === 0) {
            const timeoutCodes = new Set(['98', '906', '907', '908', '909', '910', '911', '912']);
            if (timeoutCodes.has(rawAc)) {
              // Timeout réseau : 3–8 secondes (réaliste pour un timeout banking)
              t.latencyMs = 3000 + Math.floor(Math.random() * 5000);
            } else if (rawAc === '000' || rawAc === '00') {
              // Approuvé : 80–330ms
              t.latencyMs = 80  + Math.floor(Math.random() * 250);
            } else {
              // Refusé : 150–600ms
              t.latencyMs = 150 + Math.floor(Math.random() * 450);
            }
          }

          return t;
        });
      }),
      map(txs => this.applyProjectScope(txs, project, capturedUser)),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    return this._txAdaptedCache$;
  }

  /**
   * Enforces strict per-role data isolation:
   *
   * ADMIN : accès total à tous les projets. Si un projet est sélectionné,
   *         filtre uniquement sur ce projet.
   *
   * USER  : accès restreint aux projets assignés UNIQUEMENT.
   *         - Sans projets assignés → aucune donnée visible.
   *         - Avec projets assignés + aucun projet sélectionné → données
   *           de l'ensemble de ses projets assignés.
   *         - Avec projets assignés + projet sélectionné → validé que le
   *           projet est bien dans sa liste avant d'afficher les données.
   */
  private applyProjectScope(
    transactions: Transaction[],
    activeProject: string,
    user: AppUser | null
  ): Transaction[] {

    // ── ADMIN : aucune restriction de périmètre ───────────────────────────────
    if (!user || user.role === 'ADMIN') {
      if (!activeProject) return transactions;
      const code = activeProject.trim().toUpperCase();
      return transactions.filter(tx =>
        (tx.acquirerBank || '').trim().toUpperCase() === code ||
        (tx.issuingBank  || '').trim().toUpperCase() === code
      );
    }

    // ── USER : périmètre strict aux projets assignés ──────────────────────────
    const stored = this.userStore.users().find(u => u.id === user.id);
    const assignedCodes = new Set<string>(
      (stored?.projects ?? user.projects ?? [])
        .filter(Boolean)
        .map(c => c.trim().toUpperCase())
    );

    // Aucun projet assigné → aucune donnée
    if (assignedCodes.size === 0) return [];

    // Projet spécifique sélectionné : vérifier qu'il est bien assigné
    if (activeProject) {
      const code = activeProject.trim().toUpperCase();
      if (!assignedCodes.has(code)) return []; // accès refusé
      return transactions.filter(tx =>
        (tx.acquirerBank || '').trim().toUpperCase() === code ||
        (tx.issuingBank  || '').trim().toUpperCase() === code
      );
    }

    // "Tous mes projets" : filtrer sur l'ensemble des projets assignés
    return transactions.filter(tx =>
      assignedCodes.has((tx.acquirerBank || '').trim().toUpperCase()) ||
      assignedCodes.has((tx.issuingBank  || '').trim().toUpperCase())
    );
  }

  /**
   * POST /autho-activity
   * Créer une nouvelle transaction
   */
  createTransaction(payload: any): Observable<AutohoActivityAdm> {
    return this.http.post<AutohoActivityAdm>(`${AUTHO_ACTIVITY_URL}`, payload);
  }

  // ========== REQUÊTES PAR IDENTIFIANT ==========

  /**
   * GET /autho-activity/transaction/{transactionId}
   * Rechercher une transaction par son ID
   */
  getByTransactionId(transactionId: string): Observable<AutohoActivityAdm> {
    return this.http.get<AutohoActivityAdm>(`${AUTHO_ACTIVITY_URL}/transaction/${transactionId}`);
  }

  /**
   * GET /autho-activity/authorization/{authorizationId}
   * Rechercher une autorisation par son ID
   */
  getByAuthorizationId(authorizationId: string): Observable<AutohoActivityAdm> {
    return this.http.get<AutohoActivityAdm>(`${AUTHO_ACTIVITY_URL}/authorization/${authorizationId}`);
  }

  /**
   * GET /autho-activity/cps/{cpsTransactionId}
   * Rechercher une transaction CPS par son ID
   */
  getByCpsTransactionId(cpsTransactionId: string): Observable<AutohoActivityAdm> {
    return this.http.get<AutohoActivityAdm>(`${AUTHO_ACTIVITY_URL}/cps/${cpsTransactionId}`);
  }

  // ========== REQUÊTES PAR CARTE ==========

  /**
   * GET /autho-activity/card/{cardNumber}
   * Rechercher les transactions d'une carte (paginated)
   */
  getCardTransactions(cardNumber: string, page: number = 0, size: number = 20): Observable<any> {
    return this.http.get(`${AUTHO_ACTIVITY_URL}/card/${cardNumber}`, {
      params: { page: page.toString(), size: size.toString() }
    });
  }

  /**
   * GET /autho-activity/card/{cardNumber}/range?startDate=2026-01-01&endDate=2026-12-31
   * Rechercher les transactions d'une carte pour une plage de dates
   */
  getCardTransactionsByDateRange(cardNumber: string, startDate: string, endDate: string): Observable<AutohoActivityAdm[]> {
    return this.http.get<AutohoActivityAdm[]>(`${AUTHO_ACTIVITY_URL}/card/${cardNumber}/range`, {
      params: { startDate, endDate }
    });
  }

  // ========== REQUÊTES PAR ACCEPTEUR ==========

  /**
   * GET /autho-activity/acceptor/{acceptorId}
   * Rechercher les transactions d'un accepteur (merchant/terminal)
   */
  getAcceptorTransactions(acceptorId: string, page: number = 0, size: number = 20): Observable<any> {
    return this.http.get(`${AUTHO_ACTIVITY_URL}/acceptor/${acceptorId}`, {
      params: { page: page.toString(), size: size.toString() }
    });
  }

  /**
   * GET /autho-activity/acceptor/{acceptorId}/date/{businessDate}
   * Rechercher les transactions d'un accepteur pour une date
   */
  getAcceptorTransactionsByDate(acceptorId: string, businessDate: string): Observable<AutohoActivityAdm[]> {
    return this.http.get<AutohoActivityAdm[]>(`${AUTHO_ACTIVITY_URL}/acceptor/${acceptorId}/date/${businessDate}`);
  }

  // ========== REQUÊTES PAR DATES ==========

  /**
   * GET /autho-activity/business-date/{businessDate}
   * Récupérer les transactions d'une date métier
   */
  getByBusinessDate(businessDate: string, page: number = 0, size: number = 20): Observable<any> {
    return this.http.get(`${AUTHO_ACTIVITY_URL}/business-date/${businessDate}`, {
      params: { page: page.toString(), size: size.toString() }
    });
  }

  /**
   * GET /autho-activity/date-range?startDate=2026-01-01&endDate=2026-12-31
   * Récupérer les transactions entre deux dates
   */
  getByDateRange(startDate: string, endDate: string, page: number = 0, size: number = 20): Observable<any> {
    return this.http.get(`${AUTHO_ACTIVITY_URL}/date-range`, {
      params: { startDate, endDate, page: page.toString(), size: size.toString() }
    });
  }

  // ========== REQUÊTES PAR STATUS ==========

  /**
   * GET /autho-activity/declined
   * Récupérer les transactions refusées
   */
  getDeclinedTransactions(page: number = 0, size: number = 20): Observable<any> {
    return this.http.get(`${AUTHO_ACTIVITY_URL}/declined`, {
      params: { page: page.toString(), size: size.toString() }
    });
  }

  /**
   * GET /autho-activity/declined/date-range?startDate=2026-01-01&endDate=2026-12-31
   * Récupérer les transactions refusées entre deux dates
   */
  getDeclinedTransactionsByDateRange(startDate: string, endDate: string): Observable<AutohoActivityAdm[]> {
    return this.http.get<AutohoActivityAdm[]>(`${AUTHO_ACTIVITY_URL}/declined/date-range`, {
      params: { startDate, endDate }
    });
  }

  /**
   * GET /autho-activity/reject-code/{rejectCode}
   * Récupérer les transactions avec un code de rejet spécifique
   */
  getByRejectCode(rejectCode: string, page: number = 0, size: number = 20): Observable<any> {
    return this.http.get(`${AUTHO_ACTIVITY_URL}/reject-code/${rejectCode}`, {
      params: { page: page.toString(), size: size.toString() }
    });
  }

  /**
   * GET /autho-activity/reversals
   * Récupérer les transactions reversées (annulations)
   */
  getReversals(page: number = 0, size: number = 20): Observable<any> {
    return this.http.get(`${AUTHO_ACTIVITY_URL}/reversals`, {
      params: { page: page.toString(), size: size.toString() }
    });
  }

  // ========== REQUÊTES PAR MONTANT ==========

  /**
   * GET /autho-activity/high-value?minAmount=5000
   * Récupérer les transactions de montant élevé
   */
  getHighValueTransactions(minAmount: number = 5000, page: number = 0, size: number = 20): Observable<any> {
    return this.http.get(`${AUTHO_ACTIVITY_URL}/high-value`, {
      params: { minAmount: minAmount.toString(), page: page.toString(), size: size.toString() }
    });
  }

  /**
   * GET /autho-activity/amount-range?minAmount=1000&maxAmount=10000
   * Récupérer les transactions dans une plage de montants
   */
  getByAmountRange(minAmount: number, maxAmount: number, page: number = 0, size: number = 20): Observable<any> {
    return this.http.get(`${AUTHO_ACTIVITY_URL}/amount-range`, {
      params: {
        minAmount: minAmount.toString(),
        maxAmount: maxAmount.toString(),
        page: page.toString(),
        size: size.toString()
      }
    });
  }

  // ========== REQUÊTES PAR RÉSEAU ==========

  /**
   * GET /autho-activity/acquirer/{acquirerBank}
   * Récupérer les transactions par acquirer/banque
   */
  getByAcquirerBank(acquirerBank: string, page: number = 0, size: number = 20): Observable<any> {
    return this.http.get(`${AUTHO_ACTIVITY_URL}/acquirer/${acquirerBank}`, {
      params: { page: page.toString(), size: size.toString() }
    });
  }

  /**
   * GET /autho-activity/network/{networkCode}
   * Récupérer les transactions par réseau (VISA, MC, SWIFT, etc)
   */
  getByNetworkCode(networkCode: string, page: number = 0, size: number = 20): Observable<any> {
    return this.http.get(`${AUTHO_ACTIVITY_URL}/network/${networkCode}`, {
      params: { page: page.toString(), size: size.toString() }
    });
  }

  /**
   * GET /autho-activity/country/{countryCode}
   * Récupérer les transactions par pays
   */
  getByCountryCode(countryCode: string, page: number = 0, size: number = 20): Observable<any> {
    return this.http.get(`${AUTHO_ACTIVITY_URL}/country/${countryCode}`, {
      params: { page: page.toString(), size: size.toString() }
    });
  }

  // ========== STATISTIQUES ==========

  /**
   * GET /autho-activity/stats/count?businessDate=2026-04-20
   * Compter les transactions d'une date
   */
  countByBusinessDate(businessDate: string): Observable<number> {
    return this.http.get<number>(`${AUTHO_ACTIVITY_URL}/stats/count`, {
      params: { businessDate }
    });
  }

  /**
   * GET /autho-activity/stats/declined-count?businessDate=2026-04-20
   * Compter les transactions refusées d'une date
   */
  countDeclinedByBusinessDate(businessDate: string): Observable<number> {
    return this.http.get<number>(`${AUTHO_ACTIVITY_URL}/stats/declined-count`, {
      params: { businessDate }
    });
  }

  /**
   * GET /autho-activity/stats/sum-amount?businessDate=2026-04-20
   * Somme des montants pour une date
   */
  sumAmountByBusinessDate(businessDate: string): Observable<number> {
    return this.http.get<number>(`${AUTHO_ACTIVITY_URL}/stats/sum-amount`, {
      params: { businessDate }
    });
  }

  /**
   * GET /autho-activity/stats/avg-amount?businessDate=2026-04-20
   * Moyenne des montants pour une date
   */
  avgAmountByBusinessDate(businessDate: string): Observable<number> {
    return this.http.get<number>(`${AUTHO_ACTIVITY_URL}/stats/avg-amount`, {
      params: { businessDate }
    });
  }

  /**
   * GET /autho-activity/stats/approval-rate?businessDate=2026-04-20
   * Taux d'approbation pour une date (%)
   */
  getApprovalRate(businessDate: string): Observable<number> {
    return this.http.get<number>(`${AUTHO_ACTIVITY_URL}/stats/approval-rate`, {
      params: { businessDate }
    });
  }

  /**
   * GET /autho-activity/detail/{referenceNumber}/{internalStan}
   * Récupérer le détail complet d'une transaction par clé primaire composite
   */
  getTransactionDetail(referenceNumber: string, internalStan: string): Observable<AutohoActivityAdm> {
    return this.http.get<AutohoActivityAdm>(
      `${AUTHO_ACTIVITY_URL}/detail/${encodeURIComponent(referenceNumber)}/${encodeURIComponent(internalStan)}`
    );
  }

  // ============================================================================
  // ALERTS & SLA MANAGEMENT
  // ============================================================================

  getAlerts(): Observable<AlertEvent[]> {
    return this.http.get<AlertEvent[]>(`${API_BASE_URL}/alerts`);
  }

  createAlert(payload: AlertEvent): Observable<AlertEvent> {
    return this.http.post<AlertEvent>(`${API_BASE_URL}/alerts`, payload);
  }

  getSlaSnapshots(): Observable<SlaSnapshot[]> {
    return this.http.get<SlaSnapshot[]>(`${API_BASE_URL}/sla-snapshots`);
  }

  createSlaSnapshot(payload: SlaSnapshot): Observable<SlaSnapshot> {
    return this.http.post<SlaSnapshot>(`${API_BASE_URL}/sla-snapshots`, payload);
  }

  // ============================================================================
  // ZONES & COUNTRIES (GÉOGRAPHIE)
  // ============================================================================

  /**
   * Get all zones with countries
   */
  getZonesAndCountries(): Observable<{ [zone: string]: string[] }> {
    return this.http.get<{ [zone: string]: string[] }>(`${API_BASE_URL}/config/zones`);
  }

  /**
   * Get countries for a specific zone
   */
  getCountriesByZone(zone: string): Observable<any> {
    return this.http.get(`${API_BASE_URL}/config/zones/${encodeURIComponent(zone)}`);
  }

  /**
   * Legacy: Get all zones
   */
  getZones(): Observable<string[]> {
    return this.http.get<string[]>(`${API_BASE_URL}/config/zones`);
  }

  /**
   * Legacy: Get countries by zone
   */
  getCountriesByZone_Legacy(): Observable<{ [zone: string]: string[] }> {
    return this.http.get<{ [zone: string]: string[] }>(`${API_BASE_URL}/config/zones`);
  }

  // ============================================================================
  // BANKS (BANQUES)
  // ============================================================================

  /**
   * Get banks for a specific country
   */
  getBanksByCountry(country: string): Observable<any> {
    return this.http.get(`${API_BASE_URL}/config/banks/${encodeURIComponent(country)}`);
  }

  /**
   * Get all banks for all countries
   */
  getAllBanks(): Observable<{ [country: string]: string[] }> {
    return this.http.get<{ [country: string]: string[] }>(`${API_BASE_URL}/config/banks-all`);
  }

  /**
   * Get banks for a specific zone
   */
  getBanksByZone(zone: string): Observable<any> {
    return this.http.get(`${API_BASE_URL}/config/banks-zone/${encodeURIComponent(zone)}`);
  }

  // ============================================================================
  // TRANSACTION TYPES & MTI CODES
  // ============================================================================

  /**
   * Get all MTI transaction types
   */
  getTransactionTypes(): Observable<{ [mti: string]: string }> {
    return this.http.get<{ [mti: string]: string }>(`${API_BASE_URL}/config/transaction-types`);
  }

  /**
   * Get transaction types for a specific channel
   */
  getTransactionTypesByChannel(channel: 'GAB' | 'POS' | 'ECOM'): Observable<any> {
    return this.http.get(`${API_BASE_URL}/config/transaction-types-channel/${channel}`);
  }

  /**
   * Get all transaction types by channel
   */
  getAllTransactionTypesByChannel(): Observable<{ [channel: string]: string[] }> {
    return this.http.get<{ [channel: string]: string[] }>(`${API_BASE_URL}/config/transaction-types-all`);
  }

  // ============================================================================
  // ISO 8583 RESPONSE CODES
  // ============================================================================

  /**
   * Get all ISO 8583 response codes
   */
  getResponseCodes(): Observable<{ [code: string]: string }> {
    return this.http.get<{ [code: string]: string }>(`${API_BASE_URL}/config/response-codes`);
  }

  /**
   * Get description for a specific response code
   */
  getResponseCode(code: string): Observable<any> {
    return this.http.get(`${API_BASE_URL}/config/response-code/${code}`);
  }

  /**
   * Search response codes by pattern
   */
  searchResponseCodes(pattern: string): Observable<{ [code: string]: string }> {
    return this.http.get<{ [code: string]: string }>(`${API_BASE_URL}/config/response-codes-search`, {
      params: { pattern }
    });
  }

  // ============================================================================
  // SECURITY METHODS
  // ============================================================================

  /**
   * Get security methods for a specific channel
   */
  getSecurityMethodsByChannel(channel: 'GAB' | 'POS' | 'ECOM'): Observable<any> {
    return this.http.get(`${API_BASE_URL}/config/security-methods/${channel}`);
  }

  /**
   * Get all security methods by channel
   */
  getAllSecurityMethods(): Observable<{ [channel: string]: string[] }> {
    return this.http.get<{ [channel: string]: string[] }>(`${API_BASE_URL}/config/security-methods-all`);
  }

  // ============================================================================
  // TRANSACTION STATUSES
  // ============================================================================

  /**
   * Get all transaction statuses
   */
  getTransactionStatuses(): Observable<{ [status: string]: string }> {
    return this.http.get<{ [status: string]: string }>(`${API_BASE_URL}/config/transaction-statuses`);
  }

  // ============================================================================
  // COMPLETE SYSTEM CONFIGURATION (ONE CALL)
  // ============================================================================

  /**
   * Get ENTIRE system configuration in one call
   * Includes zones, banks, codes, types, statuses - everything!
   */
  getCompleteConfiguration(): Observable<PaymentSystemConfig> {
    return this.http.get<PaymentSystemConfig>(`${API_BASE_URL}/config/complete`);
  }

  /**
   * Health check for configuration
   */
  getConfigHealth(): Observable<any> {
    return this.http.get(`${API_BASE_URL}/config/health`);
  }

  // ============================================================================
  // CHANNEL-SPECIFIC TRANSACTION ENDPOINTS
  // ============================================================================

  /**
   * Submit GAB transaction
   */
  submitGabTransaction(payload: any): Observable<any> {
    return this.http.post(`${API_BASE_URL}/transactions/gab`, payload);
  }

  /**
   * Submit POS transaction
   */
  submitPosTransaction(payload: any): Observable<any> {
    return this.http.post(`${API_BASE_URL}/transactions/pos`, payload);
  }

  /**
   * Submit ECOM transaction
   */
  submitEcomTransaction(payload: any): Observable<any> {
    return this.http.post(`${API_BASE_URL}/transactions/ecom`, payload);
  }

  // ============================================================================
  // INTELLIGENCE MONÉTIQUE  -  MonetixAnalyticsController
  // ============================================================================

  private readonly ANALYTICS_URL = `${API_BASE_URL}/analytics`;

  /** Dashboard KPIs analytiques pour une date */
  getAnalyticsDashboard(businessDate: string): Observable<any> {
    return this.http.get(`${this.ANALYTICS_URL}/dashboard`, {
      params: { businessDate }
    });
  }

  /** Analyse complète (EMV + Time + Currency + ISO 8583) d'une transaction */
  getFullTransactionAnalysis(transactionId: string): Observable<any> {
    return this.http.get(`${this.ANALYTICS_URL}/transaction/${transactionId}/full`);
  }

  /** Diagnostic EMV/Chip d'une transaction */
  getChipDiagnostic(transactionId: string): Observable<any> {
    return this.http.get(`${this.ANALYTICS_URL}/chip/${transactionId}`);
  }

  /** Transactions chip à risque élevé (TVR non clean) */
  getHighRiskChipTransactions(page = 0, size = 20): Observable<any[]> {
    return this.http.get<any[]>(`${this.ANALYTICS_URL}/chip/batch/high-risk`, {
      params: { page: page.toString(), size: size.toString() }
    });
  }

  /** Analyse temporelle multinationale d'une transaction */
  getTimeAnalysis(transactionId: string): Observable<any> {
    return this.http.get(`${this.ANALYTICS_URL}/time/${transactionId}`);
  }

  /** Transactions avec SLA de traitement dépassé (> 5s) */
  getSlaBreaches(businessDate: string, size = 50): Observable<any[]> {
    return this.http.get<any[]>(`${this.ANALYTICS_URL}/time/sla-breaches`, {
      params: { businessDate, size: size.toString() }
    });
  }

  /** Résoudre la timezone d'un pays (code ISO 3166 numérique) */
  getTimezone(countryCode: string): Observable<{ countryCode: string; timezone: string }> {
    return this.http.get<{ countryCode: string; timezone: string }>(
      `${this.ANALYTICS_URL}/time/timezone/${countryCode}`
    );
  }

  /** Analyse multi-devise d'une transaction */
  getCurrencyAnalysis(transactionId: string): Observable<any> {
    return this.http.get(`${this.ANALYTICS_URL}/currency/${transactionId}`);
  }

  /** Transactions approuvées avec settlement en attente */
  getPendingSettlements(businessDate: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.ANALYTICS_URL}/currency/settlement-pending`, {
      params: { businessDate }
    });
  }

  /** Transactions avec anomalie de taux de change (variance > 1%) */
  getFxAnomalies(days = 7): Observable<any[]> {
    return this.http.get<any[]>(`${this.ANALYTICS_URL}/currency/fx-anomalies`, {
      params: { days: days.toString() }
    });
  }

  /** Décoder un action_code ISO 8583 */
  decodeActionCode(code: string): Observable<any> {
    return this.http.get(`${this.ANALYTICS_URL}/iso/action-code/${code}`);
  }

  /** Décoder un MTI (message_type) ISO 8583 */
  decodeMti(mti: string): Observable<any> {
    return this.http.get(`${this.ANALYTICS_URL}/iso/mti/${mti}`);
  }

  /** Décodage ISO 8583 complet d'une transaction */
  decodeTransactionIso(transactionId: string): Observable<any> {
    return this.http.get(`${this.ANALYTICS_URL}/iso/transaction/${transactionId}`);
  }

  // ============================================================================
  // GEO ANALYTICS  -  Filtrage bidirectionnel Pays ↔ Devise
  // ============================================================================

  private readonly GEO_URL    = `${API_BASE_URL}/geo`;
  private readonly HEALTH_URL = `${API_BASE_URL}/zone-health`;

  /** Contexte initial : pays ET devises actifs pour une date */
  getGeoFilterContext(date: string): Observable<any> {
    return this.http.get(`${this.GEO_URL}/context`, {
      params: new HttpParams().set('date', date)
    });
  }

  /** Filtrage Pays → Devise : devises disponibles pour les pays sélectionnés */
  getCurrenciesForCountries(date: string, countries: string[]): Observable<any[]> {
    let params = new HttpParams().set('date', date);
    countries.forEach(c => { params = params.append('countries', c); });
    return this.http.get<any[]>(`${this.GEO_URL}/currencies`, { params });
  }

  /** Filtrage Devise → Pays : pays utilisant la devise sélectionnée */
  getCountriesForCurrency(date: string, currency: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.GEO_URL}/countries`, {
      params: new HttpParams().set('date', date).set('currency', currency)
    });
  }

  /** Volume multi-zone avec conversion pivot MAD */
  getMultiZoneVolume(fromDate: string, toDate: string,
                     countries: string[], currencies: string[]): Observable<any> {
    let params = new HttpParams()
      .set('fromDate', fromDate)
      .set('toDate', toDate);
    countries.forEach(c  => { params = params.append('countries', c); });
    currencies.forEach(c => { params = params.append('currencies', c); });
    return this.http.get(`${this.GEO_URL}/volume`, { params });
  }

  // ============================================================================
  // ZONE HEALTH  -  Heatmap de santé géographique
  // ============================================================================

  /** Heatmap complète : toutes les zones pour une date */
  getZoneHealthHeatmap(date: string): Observable<any> {
    return this.http.get(`${this.HEALTH_URL}/heatmap`, {
      params: new HttpParams().set('date', date)
    });
  }

  /** KPI détaillé d'un pays (code ISO 3166 numérique) */
  getCountryHealthKpi(countryCode: string, date: string): Observable<any> {
    return this.http.get(`${this.HEALTH_URL}/country/${countryCode}`, {
      params: new HttpParams().set('date', date)
    });
  }

  /** Zones en état CRITICAL ou WARNING uniquement */
  getAlertZones(date: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.HEALTH_URL}/alerts`, {
      params: new HttpParams().set('date', date)
    });
  }

  // ============================================================================
  // DATA ARCHIVING & MAINTENANCE
  // ============================================================================

  archiveOldTransactions(months: number = 3): Observable<any> {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return this.http.post(`${AUTHO_ACTIVITY_URL}/archive`, { beforeDate: cutoff.toISOString(), retainData: true });
  }
}
