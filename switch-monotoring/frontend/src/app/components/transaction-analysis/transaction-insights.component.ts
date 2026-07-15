import { Component, Input, OnChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TransactionStatsService } from '../../services/transaction-stats.service';

@Component({
  selector: 'app-transaction-insights',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="space-y-4">

      <!-- ── KPI CARDS ─────────────────────────────────────── -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <!-- Taux d'Approbation -->
        <div class="bg-card rounded-xl border border-border/40 p-4 hover:border-border/70 transition-colors">
          <div class="flex justify-between items-center mb-3">
            <p class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {{ 'insights.approvalRate' | translate }}
            </p>
            <span class="text-lg"></span>
          </div>
          <p class="text-2xl font-bold font-mono tabular-nums text-foreground">{{ approvalRate }}%</p>
          <p class="text-xs text-muted-foreground mt-1">
            {{ approvedCount }} / {{ eligibleTotal }} {{ 'common.transactions' | translate }}
          </p>
          <span *ngIf="approvalTrend !== 0"
                class="mt-2 inline-block text-xs font-medium px-2 py-1 rounded bg-green-500/10 text-green-500">
            {{ approvalTrend > 0 ? '↑' : '↓' }} {{ Math.abs(approvalTrend) }}% {{ 'insights.vsYesterday' | translate }}
          </span>
        </div>

        <!-- Latence Moyenne -->
        <div class="bg-card rounded-xl border border-border/40 p-4 hover:border-border/70 transition-colors">
          <div class="flex justify-between items-center mb-3">
            <p class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {{ 'insights.avgLatency' | translate }}
            </p>
            <span class="text-lg"></span>
          </div>
          <p class="text-2xl font-bold font-mono tabular-nums text-foreground">{{ avgLatency }}ms</p>
          <p class="text-xs text-muted-foreground mt-1">{{ 'insights.slaTarget' | translate }}</p>
          <span class="mt-2 inline-block text-xs font-medium px-2 py-1 rounded"
                [ngClass]="avgLatency < 2000
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-red-500/10 text-red-400'">
            {{ avgLatency < 2000 ? ('insights.compliant' | translate) : ('insights.breach' | translate) }}
          </span>
        </div>

        <!-- Volume Traité -->
        <div class="bg-card rounded-xl border border-border/40 p-4 hover:border-border/70 transition-colors">
          <div class="flex justify-between items-center mb-3">
            <p class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {{ 'insights.volume' | translate }}
            </p>
            <span class="text-lg"></span>
          </div>
          <p class="text-2xl font-bold font-mono tabular-nums text-foreground">
            {{ totalVolume | currency }}
          </p>
          <p class="text-xs text-muted-foreground mt-1">{{ transactionCount }} {{ 'common.transactions' | translate }}</p>
          <span class="mt-2 inline-block text-xs font-medium px-2 py-1 rounded
                       bg-sky-500/10 text-sky-500">
            {{ 'insights.avg' | translate }} {{ avgAmount | currency }}
          </span>
        </div>

        <!-- Canal Dominant -->
        <div class="bg-card rounded-xl border border-border/40 p-4 hover:border-border/70 transition-colors">
          <div class="flex justify-between items-center mb-3">
            <p class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {{ 'insights.topChannel' | translate }}
            </p>
            <span class="text-lg"></span>
          </div>
          <p class="text-2xl font-bold font-mono tabular-nums text-foreground">{{ topChannel }}</p>
          <p class="text-xs text-muted-foreground mt-1">{{ topChannelCount }} transactions</p>
          <span class="mt-2 inline-block text-xs font-medium px-2 py-1 rounded
                       bg-purple-500/10 text-purple-500">
            {{ topChannelPercentage }}% {{ 'insights.ofTotal' | translate }}
          </span>
        </div>

      </div>

      <!-- ── DETAILED INSIGHTS ──────────────────────────────── -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

        <!-- Analyse par Statut -->
        <div class="bg-card rounded-xl border border-border/40 p-4">
          <h4 class="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
            {{ 'insights.statusAnalysis' | translate }}
          </h4>
          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <span class="text-xs font-medium text-muted-foreground w-20 shrink-0">{{ 'insights.approved' | translate }}</span>
              <span class="text-sm font-bold font-mono text-green-500 w-10 text-right tabular-nums shrink-0">
                {{ approvedCount }}
              </span>
              <div class="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                <div class="h-full rounded-full bg-green-500 transition-all"
                     [style.width.%]="totalTransactions ? (approvedCount / totalTransactions) * 100 : 0">
                </div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs font-medium text-muted-foreground w-20 shrink-0">{{ 'insights.declined' | translate }}</span>
              <span class="text-sm font-bold font-mono text-red-400 w-10 text-right tabular-nums shrink-0">
                {{ declinedCount }}
              </span>
              <div class="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                <div class="h-full rounded-full bg-red-500 transition-all"
                     [style.width.%]="totalTransactions ? (declinedCount / totalTransactions) * 100 : 0">
                </div>
              </div>
            </div>
            <div *ngIf="errorCount > 0" class="flex items-center gap-3">
              <span class="text-xs font-medium text-muted-foreground w-20 shrink-0">{{ 'insights.errors' | translate }}</span>
              <span class="text-sm font-bold font-mono text-amber-400 w-10 text-right tabular-nums shrink-0">
                {{ errorCount }}
              </span>
              <div class="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                <div class="h-full rounded-full bg-amber-400 transition-all"
                     [style.width.%]="totalTransactions ? (errorCount / totalTransactions) * 100 : 0">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Top 5 Acquéreurs -->
        <div class="bg-card rounded-xl border border-border/40 p-4">
          <h4 class="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
            {{ 'insights.topAcquirers' | translate }}
          </h4>
          <div class="space-y-3">
            <div *ngFor="let acq of topAcquirers; let i = index"
                 class="flex items-center gap-3">
              <span class="text-xs font-medium text-muted-foreground w-24 shrink-0 truncate">
                {{ i + 1 }}. {{ acq.name }}
              </span>
              <span class="text-sm font-bold font-mono text-foreground w-10 text-right tabular-nums shrink-0">
                {{ acq.count }}
              </span>
              <div class="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                <div class="h-full rounded-full bg-sky-500 transition-all"
                     [style.width.%]="(acq.count / (topAcquirers[0]?.count || 1)) * 100">
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: []
})
export class TransactionInsightsComponent implements OnChanges {
  @Input() transactions: any[] = [];
  @Input() dateRange: any = {};

  private readonly statsService = inject(TransactionStatsService);

  approvalRate      = 0;
  approvedCount     = 0;
  declinedCount     = 0;
  errorCount        = 0;
  totalTransactions = 0;
  eligibleTotal     = 0;
  avgLatency        = 0;
  totalVolume       = 0;
  transactionCount  = 0;
  avgAmount         = 0;
  topChannel        = '';
  topChannelCount   = 0;
  topChannelPercentage = 0;
  topAcquirers: any[] = [];
  approvalTrend     = 0;

  Math = Math;

  ngOnChanges() {
    this.calculateInsights();
  }

  calculateInsights() {
    if (!this.transactions || this.transactions.length === 0) return;

    // ── Statistiques via le service centralisé ──────────────────────────────
    const s = this.statsService.compute(this.transactions);

    this.totalTransactions = s.total;
    this.eligibleTotal     = s.total;
    this.approvedCount     = s.approved;
    this.declinedCount     = s.declined;
    this.errorCount        = s.pending;
    this.approvalRate      = Math.round(s.approvalRate);
    this.avgLatency        = s.avgLatency;
    this.transactionCount  = s.total;
    this.totalVolume       = s.totalVolume;
    this.avgAmount         = s.avgAmount;

    // ── Tendance approbation : 24h récentes vs 24h précédentes ──────────────
    const now = Date.now();
    const H24 = 86_400_000;
    const recent   = this.transactions.filter(t => (now - new Date(t.timestamp || t.transmissionDateAndTime || 0).getTime()) < H24);
    const previous = this.transactions.filter(t => {
      const age = now - new Date(t.timestamp || t.transmissionDateAndTime || 0).getTime();
      return age >= H24 && age < H24 * 2;
    });
    const rRate = recent.length   ? (recent.filter(t   => t.status === 'APPROVED').length / recent.length)   * 100 : 0;
    const pRate = previous.length ? (previous.filter(t => t.status === 'APPROVED').length / previous.length) * 100 : 0;
    this.approvalTrend = previous.length ? Math.round(rRate - pRate) : 0;

    // ── Canal dominant ────────────────────────────────────────────────────────
    const channels = new Map<string, number>();
    this.transactions.forEach(t => {
      const ch = t.channel || 'Unknown';
      channels.set(ch, (channels.get(ch) || 0) + 1);
    });
    let maxCount = 0;
    channels.forEach((count, ch) => {
      if (count > maxCount) { maxCount = count; this.topChannel = ch; this.topChannelCount = count; }
    });
    this.topChannelPercentage = Math.round((this.topChannelCount / s.total) * 100) || 0;

    // ── Top 5 acquéreurs — résolution code → nom complet ─────────────────────
    const CODE_TO_NAME: Record<string, string> = {
      // Maroc
      'AWB':   'Attijariwafa Bank',
      'BMCE':  'BMCE Bank',
      'BPM':   'Banque Populaire',
      'BP':    'Banque Populaire',
      'BCP':   'Banque Centrale Populaire',
      'CIH':   'CIH Bank',
      'BOA':   'Bank of Africa',
      'CAGM':  'Crédit Agricole Maroc',
      'CDM':   'Crédit du Maroc',
      'SGM':   'Société Générale Maroc',
      'BCM':   'Banque Centrale',
      // International
      'BIAT':  'BIAT Tunisie',
      'STDB':  'Standard Bank',
      'BNP':   'BNP Paribas',
      'HSBC':  'HSBC',
      'JPMCH': 'JPMorgan Chase',
      'ICBC':  'ICBC',
      'MUFG':  'MUFG Tokyo',
      'SNBSA': 'Saudi National Bank',
      'FAB':   'First Abu Dhabi Bank',
      'ZENTH': 'Zenith Bank',
    };
    const acquirers = new Map<string, number>();
    this.transactions.forEach(t => {
      const raw = (t.acquirerBank || '').trim() || 'Inconnu';
      const label = CODE_TO_NAME[raw.toUpperCase()] || raw;
      acquirers.set(label, (acquirers.get(label) || 0) + 1);
    });
    this.topAcquirers = Array.from(acquirers.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }
}
