import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api.service';
import { AppStateService } from '../../state.service';
import { TranslateService } from '../../services/translate.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ProjectFilterService } from '../../services/project-filter.service';
import { Subject, takeUntil, debounceTime, forkJoin, catchError, of } from 'rxjs';

import { VolumeChartComponent } from '../../components/dashboard/volume-chart.component';
import { LatencyChartComponent } from '../../components/dashboard/latency-chart.component';
import { ResponseChartComponent } from '../../components/dashboard/response-chart.component';
import { RefusalStackedComponent } from '../../components/dashboard/refusal-stacked.component';
import { MtiDistributionComponent } from '../../components/dashboard/mti-distribution.component';
import { EntryModeDistributionComponent } from '../../components/dashboard/entry-mode-distribution.component';
import { TransactionTableComponent } from '../../components/dashboard/transaction-table.component';
import { AnalysisComparisonComponent } from '../../components/transaction-analysis/analysis-comparison.component';
import { TransactionInsightsComponent } from '../../components/transaction-analysis/transaction-insights.component';
import { AdvancedFiltersComponent } from '../../components/transaction-analysis/advanced-filters.component';
import { TransactionDetailModalComponent } from '../../components/transaction-analysis/transaction-detail-modal.component';
import { Transaction } from '../../models';

@Component({
  selector: 'app-transaction-analysis',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    VolumeChartComponent,
    LatencyChartComponent,
    ResponseChartComponent,
    RefusalStackedComponent,
    MtiDistributionComponent,
    EntryModeDistributionComponent,
    TransactionTableComponent,
    AnalysisComparisonComponent,
    TransactionInsightsComponent,
    AdvancedFiltersComponent,
    TransactionDetailModalComponent,
    TranslatePipe,
  ],
  template: `
    <div class="space-y-6">

      <!-- ── HEADER ──────────────────────────────────────────────────────────── -->
      <div class="flex flex-col lg:flex-row justify-between items-start gap-4
                  p-5 bg-card rounded-xl border border-border/40"
           style="border-left:4px solid #2563EB">
        <div>
          <h1 class="font-heading text-2xl font-bold tracking-tight">
            {{ 'analysis.title' | translate }}
          </h1>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ 'analysis.subtitle' | translate }}
          </p>
        </div>
        <div class="flex items-center gap-2 flex-wrap shrink-0">
          <div class="flex items-center gap-2 flex-wrap" *ngIf="analyticsDashboard">
            <span *ngIf="analyticsDashboard.fraudActionCodeCount > 0"
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
                         bg-red-500/10 border border-red-500/30 text-red-400">
              {{ 'analysis.fraud' | translate }}: {{ analyticsDashboard.fraudActionCodeCount }}
            </span>
          </div>
          <button (click)="exportAnalysis()"
                  class="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold
                         bg-sky-500/10 border border-sky-500/30 text-sky-500
                         hover:bg-sky-500/20 transition-colors">
            {{ 'common.export' | translate }}
          </button>
          <button (click)="refreshData()" [disabled]="isLoading"
                  class="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold
                         bg-muted/50 border border-border text-muted-foreground
                         hover:bg-muted transition-colors"
                  [class.opacity-60]="isLoading">
            {{ isLoading ? ('common.loading' | translate) : ('common.refresh' | translate) }}
          </button>
        </div>
      </div>

      <!-- ── FILTRES ──────────────────────────────────────────────────────────── -->
      <div class="bg-card rounded-xl border border-border/40 p-5">
        <app-advanced-filters
          (onFiltersChange)="onFiltersChange($event)"
          [transactions]="transactions"
          [filteredTransactions]="filteredTransactions">
        </app-advanced-filters>
      </div>

      <!-- ── TABS NAVIGATION ─────────────────────────────────────────────────── -->
      <div class="flex gap-2 flex-wrap">
        <button *ngFor="let tab of tabs"
                (click)="activeTab = tab.id"
                class="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
                       border transition-all"
                [ngClass]="activeTab === tab.id
                  ? 'btn-hps border-transparent shadow-sm'
                  : 'bg-card border-border/40 text-muted-foreground hover:text-foreground hover:bg-card'">
          <span>{{ tab.icon }}</span>
          {{ tab.labelKey | translate }}
          <span *ngIf="tab.count"
                class="px-1.5 py-0.5 rounded text-[11px] font-bold tabular-nums"
                [ngClass]="activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-muted/60 text-muted-foreground'">
            {{ tab.count }}
          </span>
        </button>
      </div>

      <!-- ── TAB: OVERVIEW ───────────────────────────────────────────────────── -->
      <ng-container *ngIf="activeTab === 'overview'">
        <app-transaction-insights
          [transactions]="filteredTransactions"
          [dateRange]="selectedDateRange">
        </app-transaction-insights>

        <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div class="bg-card rounded-xl border border-border/40 p-5">
            <h3 class="font-heading font-bold tracking-tight mb-1">{{ 'analysis.volume.title' | translate }}</h3>
            <p class="text-xs text-muted-foreground mb-4">{{ 'analysis.volume.subtitle' | translate }}</p>
            <app-volume-chart [transactions]="filteredTransactions"></app-volume-chart>
          </div>
          <div class="bg-card rounded-xl border border-border/40 p-5">
            <h3 class="font-heading font-bold tracking-tight mb-1">{{ 'analysis.latency.title' | translate }}</h3>
            <p class="text-xs text-muted-foreground mb-4">{{ 'analysis.latency.subtitle' | translate }}</p>
            <app-latency-chart [transactions]="filteredTransactions"></app-latency-chart>
          </div>
        </div>
      </ng-container>

      <!-- TAB: SUCCES & REFUS -->
      <ng-container *ngIf="activeTab === 'success'">
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div class="bg-card rounded-xl border border-border/40 p-5">
            <h3 class="font-heading font-bold tracking-tight mb-1">{{ 'analysis.codes.title' | translate }}</h3>
            <p class="text-xs text-muted-foreground mb-4">{{ 'analysis.codes.subtitle' | translate }}</p>
            <app-response-chart [transactions]="filteredTransactions"></app-response-chart>
          </div>
          <div class="bg-card rounded-xl border border-border/40 p-5">
            <h3 class="font-heading font-bold tracking-tight mb-1">{{ 'analysis.approvedVs.title' | translate }}</h3>
            <p class="text-xs text-muted-foreground mb-4">{{ 'analysis.approvedVs.sub' | translate }}</p>
            <app-refusal-stacked [transactions]="filteredTransactions"></app-refusal-stacked>
          </div>
        </div>
        <div class="bg-card rounded-xl border border-border/40 p-5">
          <h3 class="font-heading font-bold tracking-tight mb-1">{{ 'analysis.mti.title' | translate }}</h3>
          <p class="text-xs text-muted-foreground mb-4">{{ 'analysis.mti.subtitle' | translate }}</p>
          <app-mti-distribution [transactions]="filteredTransactions"></app-mti-distribution>
        </div>
      </ng-container>

      <!-- ── TAB: COMPARAISON ────────────────────────────────────────────────── -->
      <ng-container *ngIf="activeTab === 'comparison'">
        <app-analysis-comparison
          [transactions]="filteredTransactions"
          [filteredData]="comparisonData">
        </app-analysis-comparison>
      </ng-container>

      <!-- TAB: DETAILS -->
      <ng-container *ngIf="activeTab === 'details'">
        <div *ngIf="!selectedTx"
             class="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm mb-4
                    bg-sky-500/5 border border-sky-500/15 text-sky-500">
          {{ 'analysis.clickForDetail' | translate }}
        </div>
        <div class="bg-card rounded-xl border border-border/40 p-5 overflow-x-auto">
          <app-transaction-table
            [transactions]="filteredTransactions"
            (txSelected)="onTxSelected($event)">
          </app-transaction-table>
        </div>
      </ng-container>

      <!-- ── TRANSACTION DETAIL MODAL ────────────────────────────────────────── -->
      <app-transaction-detail-modal
        *ngIf="selectedTx"
        [transaction]="selectedTx"
        (closed)="closeTxDetail()">
      </app-transaction-detail-modal>

      <!-- ── EXPORT MODAL ────────────────────────────────────────────────────── -->
      <div *ngIf="showExportModal"
           class="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
           (click)="showExportModal = false">
        <div class="bg-card rounded-xl border border-border/40 w-[90%] max-w-md shadow-2xl"
             (click)="$event.stopPropagation()">
          <div class="flex justify-between items-center p-5 border-b border-border/40">
            <h2 class="font-heading font-bold tracking-tight">Exporter le Rapport d'Analyse</h2>
            <button (click)="showExportModal = false"
                    class="text-muted-foreground hover:text-foreground text-xl transition-colors">
              ×
            </button>
          </div>
          <div class="p-5 space-y-3">
            <label class="flex items-center gap-3 cursor-pointer text-sm text-foreground">
              <input type="checkbox" class="w-4 h-4 cursor-pointer"
                     [(ngModel)]="exportOptions.includeCharts">
              <span>Inclure les graphes</span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer text-sm text-foreground">
              <input type="checkbox" class="w-4 h-4 cursor-pointer"
                     [(ngModel)]="exportOptions.includeTable">
              <span>Inclure le tableau détaillé</span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer text-sm text-foreground">
              <input type="checkbox" class="w-4 h-4 cursor-pointer"
                     [(ngModel)]="exportOptions.includeInsights">
              <span>Inclure les insights</span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer text-sm text-foreground">
              <input type="checkbox" class="w-4 h-4 cursor-pointer"
                     [(ngModel)]="exportOptions.includeComparison">
              <span>Inclure les comparaisons</span>
            </label>
            <div class="flex items-center gap-3 pt-2">
              <label class="text-sm font-medium text-foreground">Format :</label>
              <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-primary/40
                           bg-primary/8 text-primary text-sm font-semibold">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                CSV
              </span>
            </div>
          </div>
          <div class="flex justify-end gap-3 p-5 border-t border-border/40">
            <button (click)="showExportModal = false"
                    class="px-4 py-2 text-sm rounded-md border border-border
                           text-muted-foreground hover:bg-muted/50 transition-colors">
              Annuler
            </button>
            <button (click)="confirmExport()"
                    class="btn-hps px-4 py-2 text-sm rounded-md font-semibold">
              Exporter
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: []
})
export class TransactionAnalysisComponent implements OnInit, OnDestroy {
  activeTab = 'overview';
  transactions: any[] = [];
  filteredTransactions: any[] = [];
  comparisonData: any = {};
  selectedDateRange: any = { startDate: null, endDate: null };

  showExportModal = false;
  exportFormat = 'csv';
  exportOptions: { [key: string]: boolean } = {
    includeCharts: true,
    includeTable: true,
    includeInsights: true,
    includeComparison: true
  };

  analyticsDashboard: any = null;
  slaBreachCount = 0;
  isLoading = false;

  selectedTx: Transaction | null = null;

  tabs = [
    { id: 'overview',   labelKey: 'analysis.tab.overview',   icon: '', count: 0 },
    { id: 'success',    labelKey: 'analysis.tab.success',    icon: '', count: 0 },
    { id: 'comparison', labelKey: 'analysis.tab.comparison', icon: '', count: 0 },
    { id: 'details',    labelKey: 'analysis.tab.details',    icon: '', count: 0 }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private projectFilter: ProjectFilterService,
    private ts: TranslateService
  ) {}

  ngOnInit() {
    this.projectFilter.activeProject$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.loadTransactions();
      this.loadAnalyticsDashboard();
    });
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  loadTransactions() {
    this.isLoading = true;
    this.apiService.getTransactions(2000)
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.transactions = data;
          this.filteredTransactions = data;
          this.updateTabCounts();
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  loadAnalyticsDashboard() {
    const today = this.todayIso();
    forkJoin({
      dashboard: this.apiService.getAnalyticsDashboard(today).pipe(catchError(() => of(null))),
      sla:       this.apiService.getSlaBreaches(today, 200).pipe(catchError(() => of([])))
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe(({ dashboard, sla }) => {
      this.analyticsDashboard = dashboard;
      this.slaBreachCount = Array.isArray(sla) ? sla.length : 0;
    });
  }

  onFiltersChange(filters: any) {
    const toMinutes = (hhmm: string): number => {
      const [h, m] = hhmm.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const getTxTimestamp = (t: any): Date | null => {
      const raw = t.transmissionDateAndTime || t.timestamp || t.transactionLocalDate || '';
      if (!raw) return null;
      const d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    };

    // Mettre à jour la plage de dates pour les composants enfants
    this.selectedDateRange = {
      startDate: filters.startDate || null,
      endDate:   filters.endDate   || null,
    };

    this.filteredTransactions = this.transactions.filter(t => {
      const txDate = getTxTimestamp(t);

      // ── Date début ──────────────────────────────────────────────────────────
      if (filters.startDate) {
        if (!txDate) return false;
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        if (txDate < start) return false;
      }

      // ── Date fin ────────────────────────────────────────────────────────────
      if (filters.endDate) {
        if (!txDate) return false;
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        if (txDate > end) return false;
      }

      // ── Heure début ─────────────────────────────────────────────────────────
      if (filters.startTime) {
        if (!txDate) return false;
        const txMin    = txDate.getHours() * 60 + txDate.getMinutes();
        const startMin = toMinutes(filters.startTime);
        if (txMin < startMin) return false;
      }

      // ── Heure fin ───────────────────────────────────────────────────────────
      if (filters.endTime) {
        if (!txDate) return false;
        const txMin  = txDate.getHours() * 60 + txDate.getMinutes();
        const endMin = toMinutes(filters.endTime);
        if (txMin > endMin) return false;
      }

      // ── Statut ──────────────────────────────────────────────────────────────
      if (filters.status) {
        const txStatus = (t.status || '').toUpperCase();
        if (txStatus !== filters.status.toUpperCase()) return false;
      }

      // ── Canal ───────────────────────────────────────────────────────────────
      if (filters.channel) {
        const txCh = (t.channel || '').toUpperCase();
        const fCh  = filters.channel.toUpperCase();
        if (fCh === 'GAB') {
          if (txCh !== 'GAB' && txCh !== 'ATM') return false;
        } else if (fCh === 'ECOM') {
          if (txCh !== 'ECOM' && txCh !== 'ECM') return false;
        } else {
          if (txCh !== fCh) return false;
        }
      }

      // ── Acquéreur ───────────────────────────────────────────────────────────
      if (filters.acquirer) {
        const txAcq = (t.acquirerBank || t.acquirer || '').trim();
        if (txAcq !== filters.acquirer.trim()) return false;
      }

      // ── Montant min ─────────────────────────────────────────────────────────
      if (filters.minAmount > 0) {
        const amt = t.amount || t.transactionAmount || 0;
        if (amt < filters.minAmount) return false;
      }

      // ── Montant max ─────────────────────────────────────────────────────────
      if (filters.maxAmount > 0 && filters.maxAmount < (filters.sliderMax ?? filters.maxAmount + 1)) {
        const amt = t.amount || t.transactionAmount || 0;
        if (amt > filters.maxAmount) return false;
      }

      // ── Recherche libre ─────────────────────────────────────────────────────
      if (filters.searchText && filters.searchText.trim()) {
        const s = filters.searchText.toLowerCase().trim();
        const fields = [
          t.internalStan, t.externalStan, t.stan,
          t.referenceNumber, t.cardNumberMasked, t.cardNumber,
          t.acquirerBank, t.bankName, t.merchantName, t.cardAccNameAddress
        ];
        if (!fields.some(f => f && String(f).toLowerCase().includes(s))) return false;
      }

      return true;
    });
    this.updateTabCounts();
  }

  updateTabCounts() {
    this.tabs.find(t => t.id === 'details')!.count  = this.filteredTransactions.length;
    this.tabs.find(t => t.id === 'overview')!.count = this.filteredTransactions.length;
  }

  onTxSelected(tx: Transaction): void { this.selectedTx = tx; }
  closeTxDetail(): void               { this.selectedTx = null; }
  refreshData()                       { this.loadTransactions(); }
  exportAnalysis()                    { this.showExportModal = true; }

  confirmExport() {
    this.showExportModal = false;
    this.exportCsv();
  }

  private exportCsv() {
    const rows = this.filteredTransactions;
    if (!rows.length) return;

    const SEP = ';';
    const headers = [
      'Référence', 'STAN', 'Date', 'Heure', 'Statut', 'Code Action',
      'MTI', 'Canal', 'Montant (MAD)', 'Devise', 'Commerçant',
      'Acquéreur', 'Pays', 'Latence (ms)'
    ];

    const getTime = (t: any): string => {
      const raw = t.transmissionDateAndTime || t.timestamp || t.responseDateAndTime;
      if (!raw) return '';
      try { return new Date(raw).toLocaleTimeString('fr-FR'); } catch { return ''; }
    };

    const getPays = (t: any): string => {
      if (t.country) return t.country;
      if (t.acquiringCountryCode) return t.acquiringCountryCode;
      if (t.zone) return t.zone;
      return '';
    };

    const escape = (v: any) => {
      const s = v == null ? '' : String(v);
      return s.includes(SEP) || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const csvRows = [
      headers.join(SEP),
      ...rows.map(t => [
        t.referenceNumber || t.externalId || '',
        t.internalStan || t.stan || '',
        t.businessDate || t.transactionLocalDate || '',
        getTime(t),
        t.status || '',
        t.responseCode || '',
        t.mtiCode || '',
        t.channel || '',
        (t.amount || t.transactionAmount || 0).toFixed(2),
        t.currency || t.transactionCurrency || 'MAD',
        t.merchantName || t.cardAccNameAddress || '',
        t.acquirerBank || t.bankName || '',
        getPays(t),
        t.latencyMs || 0
      ].map(escape).join(SEP))
    ];

    const blob = new Blob(['﻿' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
