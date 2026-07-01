import {
  Component, OnInit, OnDestroy, inject,
  signal, computed, effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  Search, ChevronDown, ChevronLeft, ChevronRight, X,
} from 'lucide-angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Transaction } from '../../models';
import { ApiService } from '../../api.service';
import { AppStateService } from '../../state.service';
import { TransactionStoreService } from '../../services/transaction-store.service';
import { ProjectFilterService } from '../../services/project-filter.service';
import { environment } from '../../../environments/environment';

const MTI_LABELS: Record<string, string> = {
  '0100': 'Demande autorisation',   '1100': 'Demande autorisation',
  '0110': 'Reponse autorisation',   '1110': 'Reponse autorisation',
  '0200': 'Transaction financiere', '1200': 'Transaction financiere',
  '0210': 'Reponse financiere',     '1210': 'Reponse financiere',
  '0400': 'Reversal',               '1400': 'Reversal',
  '0420': 'Reversal request',       '1420': 'Reversal request',
  '0800': 'Administration reseau',  '1800': 'Administration reseau',
  '0810': 'Reponse reseau',         '1810': 'Reponse reseau',
};

const MTI_COLORS: Record<string, string> = {
  '0100': '#60a5fa', '1100': '#60a5fa',
  '0200': '#a78bfa', '1200': '#a78bfa',
  '0400': '#f87171', '1400': '#f87171',
  '0420': '#f87171', '1420': '#f87171',
  '0800': '#94a3b8', '1800': '#94a3b8',
};

const POS_ENTRY_LABELS: Record<string, string> = {
  '01': 'Manuel', '0100': 'Manuel',
  '02': 'Bande mag.', '0200': 'Bande mag.',
  '05': 'Puce EMV', '0510': 'Puce EMV', '0500': 'Puce EMV',
  '07': 'NFC', '0710': 'NFC', '0700': 'NFC',
  '81': 'E-commerce', '8100': 'E-commerce',
  '90': 'Bande (terminal)', '9000': 'Bande (terminal)',
};

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.css'],
})
export class TransactionsComponent implements OnInit, OnDestroy {

  readonly SearchIcon       = Search;
  readonly ChevronDownIcon  = ChevronDown;
  readonly ChevronLeftIcon  = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;
  readonly XIcon            = X;

  // ── Signals UI ────────────────────────────────────────────────────────────
  readonly activeTab           = signal<'all' | 'approved' | 'declined'>('all');
  readonly searchQuery         = signal('');
  readonly pageSize            = signal(25);
  readonly currentPage         = signal(1);
  readonly selectedTransaction = signal<Transaction | null>(null);
  readonly isLoading           = signal(true);

  // ── Compteurs stream ──────────────────────────────────────────────────────
  // transactions affichées dans la liste (batch + live)
  readonly streamedCount = signal(0);
  // transactions reçues en SSE pendant la pause (buffer local)
  readonly pendingCount  = signal(0);

  // ── Données ───────────────────────────────────────────────────────────────
  private readonly allTx$    = signal<Transaction[]>([]);
  // buffer local des transactions SSE reçues pendant la pause
  private pauseBuffer: Transaction[] = [];

  // ── SSE propre à la page ──────────────────────────────────────────────────
  private sseSource?: EventSource;
  private destroy$ = new Subject<void>();

  private readonly api           = inject(ApiService);
  readonly appState              = inject(AppStateService);
  private readonly txStore       = inject(TransactionStoreService);
  private readonly projectFilter = inject(ProjectFilterService);

  // ── Computed : état LIVE depuis appState global ───────────────────────────
  get isLive(): boolean { return this.appState.isLive(); }

  constructor() {
    // Réagit aux changements du signal isLive :
    // quand on repasse en LIVE → on vide le buffer dans allTx$
    effect(() => {
      const live = this.appState.isLive();
      if (live && this.pauseBuffer.length > 0) {
        this._flushPauseBuffer();
      }
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // ── Étape 1 : afficher immédiatement les données déjà dans le store ──────
    // Le Dashboard accumule les transactions via SSE dans txStore.
    // On les affiche sans attendre le backend.
    const storeSnapshot = this.txStore.snapshot;
    if (storeSnapshot.length > 0) {
      this.allTx$.set(storeSnapshot);
      this.streamedCount.set(storeSnapshot.length);
      this.isLoading.set(false);
      // Connexion SSE immédiate si le store a déjà des données
      this._connectSse();
    }

    // ── Étape 2 : rechargement frais depuis le backend (données complètes) ───
    // Invalider le cache pour forcer un vrai appel HTTP
    this.api.invalidateTransactionCache();
    this.api.getTransactions(2000).pipe(
      takeUntil(this.destroy$),
    ).subscribe({
      next: (txs) => {
        // Fusionner : conserver les tx SSE déjà affichées + les nouvelles du batch
        const current = this.allTx$();
        if (current.length === 0) {
          // Aucune donnée en store → remplacer directement
          this.allTx$.set(txs);
          this.streamedCount.set(txs.length);
        } else {
          // Des données sont déjà affichées → merger sans écraser les tx live
          const existingKeys = new Set(
            current.map(t => (t.referenceNumber || '') + '|' + (t.internalStan || t.stan || ''))
          );
          const newOnes = txs.filter(tx => {
            const key = (tx.referenceNumber || '') + '|' + (tx.internalStan || tx.stan || '');
            return !existingKeys.has(key);
          });
          if (newOnes.length > 0) {
            const merged = [...current, ...newOnes].slice(0, 2000);
            this.allTx$.set(merged);
            this.streamedCount.set(merged.length);
          }
        }
        this.isLoading.set(false);
        // Connexion SSE si pas encore faite
        if (!this.sseSource) this._connectSse();
      },
      error: () => {
        this.isLoading.set(false);
        if (!this.sseSource) this._connectSse();
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this._closeSse();
  }

  // ── SSE ───────────────────────────────────────────────────────────────────

  private _connectSse(): void {
    this._closeSse();
    this.sseSource = new EventSource(`${environment.apiBaseUrl}/stream/transactions`);

    this.sseSource.addEventListener('transaction-created', (event) => {
      try {
        const raw = JSON.parse((event as MessageEvent).data) as Transaction;
        // Passer par l'adaptateur de l'API pour normaliser les champs
        this._handleLiveTx(raw);
      } catch { /* ignorer JSON invalide */ }
    });

    this.sseSource.onerror = () => {
      // Reconnexion automatique dans 5s si la connexion se coupe
      setTimeout(() => {
        if (!this.destroy$.closed) this._connectSse();
      }, 5000);
    };
  }

  private _closeSse(): void {
    if (this.sseSource) {
      this.sseSource.close();
      this.sseSource = undefined;
    }
  }

  private _handleLiveTx(tx: Transaction): void {
    if (this.appState.isLive()) {
      // LIVE : insérer immédiatement en tête de liste
      this._prependTx(tx);
    } else {
      // PAUSE : accumuler dans le buffer local
      if (this.pauseBuffer.length < 500) {
        this.pauseBuffer.push(tx);
        this.pendingCount.set(this.pauseBuffer.length);
      }
    }
  }

  private _prependTx(tx: Transaction): void {
    const current = this.allTx$();
    // Déduplication par clé composite
    const key = (tx.referenceNumber || '') + '|' + (tx.internalStan || tx.stan || '');
    if (current.some(t =>
      ((t.referenceNumber || '') + '|' + (t.internalStan || t.stan || '')) === key
    )) return;

    const updated = [tx, ...current].slice(0, 2000);
    this.allTx$.set(updated);
    this.streamedCount.set(updated.length);
  }

  private _flushPauseBuffer(): void {
    if (!this.pauseBuffer.length) return;
    const buf = [...this.pauseBuffer];
    this.pauseBuffer = [];
    this.pendingCount.set(0);

    // Insérer toutes les transactions du buffer en tête, les plus récentes en premier
    const current = this.allTx$();
    const existingKeys = new Set(
      current.map(t => (t.referenceNumber || '') + '|' + (t.internalStan || t.stan || ''))
    );
    const newOnes = buf.filter(tx => {
      const key = (tx.referenceNumber || '') + '|' + (tx.internalStan || tx.stan || '');
      return !existingKeys.has(key);
    });

    if (newOnes.length > 0) {
      const updated = [...newOnes, ...current].slice(0, 2000);
      this.allTx$.set(updated);
      this.streamedCount.set(updated.length);
    }
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  readonly filteredTransactions = computed(() => {
    const tab = this.activeTab();
    const q   = this.searchQuery().toLowerCase().trim();

    return this.allTx$().filter(tx => {
      if (tab === 'approved' && !this._isApproved(tx)) return false;
      if (tab === 'declined' && !this._isDeclined(tx)) return false;
      if (q) {
        const fields = [
          tx.internalStan, tx.stan, tx.referenceNumber,
          tx.cardNumberMasked, tx.cardNumber,
          tx.cardAccNameAddress, tx.merchantName,
          tx.acquirerBank, tx.issuingBank, tx.actionCode,
        ].map(v => (v || '').toLowerCase());
        if (!fields.some(f => f.includes(q))) return false;
      }
      return true;
    });
  });

  readonly totalCount    = computed(() => this.allTx$().length);
  readonly approvedCount = computed(() => this.allTx$().filter(t => this._isApproved(t)).length);
  readonly declinedCount = computed(() => this.allTx$().filter(t => this._isDeclined(t)).length);
  readonly filteredCount = computed(() => this.filteredTransactions().length);
  readonly totalPages    = computed(() => Math.max(1, Math.ceil(this.filteredCount() / this.pageSize())));

  readonly paginatedTransactions = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredTransactions().slice(start, start + this.pageSize());
  });

  // ── Actions UI ────────────────────────────────────────────────────────────

  setTab(tab: 'all' | 'approved' | 'declined'): void {
    this.activeTab.set(tab);
    this.currentPage.set(1);
  }

  onSearchInput(e: Event): void {
    this.searchQuery.set((e.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) this.currentPage.set(page);
  }

  openDetail(tx: Transaction): void  { this.selectedTransaction.set(tx); }
  closeDetail(): void                { this.selectedTransaction.set(null); }

  trackByRef(_: number, tx: Transaction): string {
    return tx.referenceNumber || tx.internalStan || String(tx.id) || String(_);
  }

  // Marque les transactions fraîchement ajoutées (première position = plus récente)
  isNewTx(tx: Transaction): boolean {
    return this.allTx$().indexOf(tx) < 5 && this.isLive;
  }

  // ── Status helpers ────────────────────────────────────────────────────────

  private _isApproved(tx: Transaction): boolean {
    if (tx.status === 'APPROVED') return true;
    const ac = (tx.actionCode || '').trim();
    return ac === '000' || ac === '00';
  }

  private _isDeclined(tx: Transaction): boolean {
    if (tx.status === 'DECLINED') return true;
    const ac = (tx.actionCode || tx.responseCode || '').trim();
    return !!ac && ac !== '000' && ac !== '00';
  }

  getStatusType(tx: Transaction): 'approved' | 'declined' | 'error' | 'pending' {
    if (this._isApproved(tx)) return 'approved';
    const ac = (tx.actionCode || tx.responseCode || '').trim();
    if (ac === '091' || ac === '096' || ac === '906' || ac === '907') return 'error';
    if (this._isDeclined(tx)) return 'declined';
    return 'pending';
  }

  getStatusLabel(tx: Transaction): string {
    switch (this.getStatusType(tx)) {
      case 'approved': return 'APPROUVE';
      case 'declined': return 'REFUSE';
      case 'error':    return 'ERREUR';
      default:         return 'EN ATTENTE';
    }
  }

  getDetailStatusType  = this.getStatusType.bind(this);
  getDetailStatusLabel = this.getStatusLabel.bind(this);

  val(v: string | number | null | undefined): string {
    if (v == null) return '';
    const s = String(v).trim();
    return s || '';
  }

  // ── Formatters tableau ────────────────────────────────────────────────────

  getTime(tx: Transaction): string {
    const raw = tx.transmissionDateAndTime || tx.timestamp;
    if (!raw) return '';
    try {
      const d = new Date(raw as string);
      if (isNaN(d.getTime())) return String(raw).slice(11, 19);
      return d.toLocaleTimeString('fr-FR', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
    } catch { return ''; }
  }

  getStan(tx: Transaction): string         { return (tx.internalStan || tx.stan || '').trim(); }
  getMtiCode(tx: Transaction): string      { return (tx.mtiCode || tx.messageType || '').trim(); }
  getMtiLabel(tx: Transaction): string     { return MTI_LABELS[this.getMtiCode(tx)] || ''; }
  getMtiColor(mti: string): string         { return MTI_COLORS[mti] || '#94a3b8'; }

  getPanLast4(tx: Transaction): string {
    const pan = (tx.cardNumberMasked || tx.cardNumber || '').replace(/\s/g, '');
    return pan.slice(-4) || '????';
  }

  getAmount(tx: Transaction): string {
    const amt = tx.transactionAmount ?? tx.amount;
    if (amt == null) return '';
    const cur = (tx.transactionCurrency || tx.currency || 'MAD').trim();
    return amt.toLocaleString('fr-FR', { minimumFractionDigits: 3 }) + ' ' + cur;
  }

  getMerchant(tx: Transaction): string  { return (tx.cardAccNameAddress || tx.merchantName || '').trim(); }
  getAcquirer(tx: Transaction): string  { return (tx.acquirerBank || tx.bankName || '').trim(); }
  getIssuer(tx: Transaction): string    { return (tx.issuingBank || '').trim(); }
  getActionCode(tx: Transaction): string{ return (tx.actionCode || tx.responseCode || '').trim(); }
  getLatency(tx: Transaction): string   { return tx.latencyMs ? tx.latencyMs + 'ms' : ''; }

  getChannel(tx: Transaction): string {
    const ch = (tx.channel || '').trim().toUpperCase();
    const map: Record<string, string> = {
      'ATM': 'ATM / GAB', 'GAB': 'GAB / ATM',
      'POS': 'Point de Vente (POS)',
      'ECOM': 'E-Commerce', 'ECM': 'E-Commerce',
    };
    return map[ch] || ch || '';
  }

  getNetworkLabel(tx: Transaction): string {
    const nc = (tx.networkCode || '').trim();
    const ni = (tx.networkId   || '').trim().toUpperCase();
    const pc = (tx.productCode || '').trim().toUpperCase();
    if (pc === 'VIS' || pc === 'VISA' || nc === '01' || ni.startsWith('VI')) return 'VISA';
    if (pc === 'MSC' || pc === 'MC'   || nc === '02' || ni.startsWith('MC')) return 'MC (MASTERCARD)';
    if (pc === 'CMI'                  || nc === '03' || ni === 'CMI')        return 'CMI';
    return ni || nc || '';
  }

  getIsInterbank(tx: Transaction): string   { return (tx as any).isInterbank || ''; }
  getPosEntryLabel(mode: string | undefined): string {
    if (!mode) return '';
    return POS_ENTRY_LABELS[mode.trim()] || mode.trim();
  }

  // ── Detail modal ──────────────────────────────────────────────────────────

  getDetailRef(tx: Transaction): string     { return tx.referenceNumber || tx.internalStan || ''; }
  getDetailMtiCode(tx: Transaction): string { return (tx.mtiCode || tx.messageType || '').trim(); }
  getDetailMtiLabel(tx: Transaction): string{ return MTI_LABELS[this.getDetailMtiCode(tx)] || ''; }

  formatDetailDate(raw: string | Date | null | undefined): string {
    if (!raw) return '';
    try {
      const d = new Date(raw as string);
      if (isNaN(d.getTime())) return String(raw);
      return d.toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
    } catch { return String(raw); }
  }

  formatDetailAmount(amount: number | null | undefined, currency?: string | null): string {
    if (amount == null) return '';
    const cur = (currency || 'MAD').trim();
    return amount.toLocaleString('fr-FR', { minimumFractionDigits: 3 }) + ' ' + cur;
  }
}
