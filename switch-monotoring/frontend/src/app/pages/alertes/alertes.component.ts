import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, switchMap, takeUntil, debounceTime } from 'rxjs';
import { ApiService } from '../../api.service';
import { Transaction, AlertEvent } from '../../models';
import { ProjectFilterService } from '../../services/project-filter.service';
import { TransactionAlertService, TransactionAlert, AlertStats } from '../../services/transaction-alert.service';
import { DeclineReasonsStatsComponent } from '../../components/dashboard/decline-reasons-stats.component';
import { ResponseCodesComponent } from '../../components/dashboard/response-codes.component';

// Type unifié pour afficher les alertes live ET historique avec le même rendu
interface DisplayAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  details: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: Date;
  source: 'live' | 'db';
}


@Component({
  selector: 'app-alertes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DeclineReasonsStatsComponent,
    ResponseCodesComponent,
  ],
  template: `
    <div class="space-y-6">

      <!-- â”€â”€ HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
      <div class="flex flex-col sm:flex-row justify-between items-start gap-4
                  p-5 bg-card rounded-xl border border-border/40"
           style="border-left:4px solid #F97316">
        <div>
          <h1 class="font-heading text-2xl font-bold tracking-tight">Alertes &amp; Sécurité</h1>
          <p class="mt-1 text-sm text-muted-foreground max-w-xl">
            Supervision des alertes sécuritaires  -  codes ISO 8583 : PIN, carte, provision, émetteur
          </p>
        </div>
        <div class="flex items-center gap-3 shrink-0 flex-wrap">
          <div class="flex items-center gap-2">
            <label class="text-xs font-semibold text-muted-foreground">Du</label>
            <input type="date"
                   class="px-2 py-1.5 text-xs rounded-md border border-border
                          bg-background text-foreground"
                   [(ngModel)]="startDate" (change)="applyFilters()" />
            <label class="text-xs font-semibold text-muted-foreground">Au</label>
            <input type="date"
                   class="px-2 py-1.5 text-xs rounded-md border border-border
                          bg-background text-foreground"
                   [(ngModel)]="endDate" (change)="applyFilters()" />
          </div>
          <button (click)="refreshData()" [disabled]="isLoading"
                  class="btn-hps px-4 py-2 text-xs rounded-md font-semibold transition-opacity"
                  [class.opacity-60]="isLoading">
            {{ isLoading ? 'Chargement...' : 'Actualiser' }}
          </button>
        </div>
      </div>

      <!-- â”€â”€ KPI STRIP  -  coordonné avec allAlerts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

        <!-- Alertes Critiques -->
        <div class="bg-card rounded-xl border border-border/40 p-4"
             style="border-top:3px solid #ef4444">
          <p class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Alertes Critiques
          </p>
          <p class="text-3xl font-bold font-mono tabular-nums text-foreground">
            {{ criticalOpenCount }}
          </p>
          <p class="text-xs mt-1"
             [class.text-red-400]="criticalOpenCount > 0"
             [class.text-muted-foreground]="criticalOpenCount === 0">
            {{ criticalOpenCount > 0 ? 'Investigation requise' : 'Niveau normal' }}
          </p>
        </div>

        <!-- Alertes Warning -->
        <div class="bg-card rounded-xl border border-border/40 p-4"
             style="border-top:3px solid #F97316">
          <p class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Alertes Warning
          </p>
          <p class="text-3xl font-bold font-mono tabular-nums"
             [class.text-orange-400]="warningOpenCount > 0"
             [class.text-muted-foreground]="warningOpenCount === 0">
            {{ warningOpenCount }}
          </p>
          <p class="text-xs mt-1"
             [class.text-orange-400]="warningOpenCount > 0"
             [class.text-muted-foreground]="warningOpenCount === 0">
            {{ warningOpenCount > 0 ? 'Surveillance requise' : 'Niveau normal' }}
          </p>
        </div>

        <!-- Alertes Info -->
        <div class="bg-card rounded-xl border border-border/40 p-4"
             style="border-top:3px solid #06b6d4">
          <p class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Alertes Info
          </p>
          <p class="text-3xl font-bold font-mono tabular-nums"
             [class.text-sky-400]="infoOpenCount > 0"
             [class.text-muted-foreground]="infoOpenCount === 0">
            {{ infoOpenCount }}
          </p>
          <p class="text-xs mt-1"
             [class.text-sky-400]="infoOpenCount > 0"
             [class.text-muted-foreground]="infoOpenCount === 0">
            {{ infoOpenCount > 0 ? 'À surveiller' : 'Aucune alerte' }}
          </p>
        </div>

        <!-- Taux de Refus Global -->
        <div class="bg-card rounded-xl border border-border/40 p-4"
             style="border-top:3px solid #8b5cf6">
          <p class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Taux de Refus Global
          </p>
          <p class="text-3xl font-bold font-mono tabular-nums"
             [class.text-red-400]="stats.refusalRate > 35"
             [class.text-orange-400]="stats.refusalRate > 20 && stats.refusalRate <= 35"
             [class.text-foreground]="stats.refusalRate <= 20">
            {{ stats.refusalRate }}%
          </p>
          <p class="text-xs text-muted-foreground mt-1">
            {{ stats.declinedCount }} / {{ stats.totalCount }}
          </p>
        </div>

        <!-- Reversals -->
        <div class="bg-card rounded-xl border border-border/40 p-4"
             style="border-top:3px solid #475569">
          <p class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Reversals (MTI 0420)
          </p>
          <p class="text-3xl font-bold font-mono tabular-nums text-foreground">
            {{ stats.reversalCount }}
          </p>
          <p class="text-xs text-muted-foreground mt-1">Transactions annulées</p>
        </div>

      </div>

      <!-- â”€â”€ ALERTES ACTIVES (OPEN) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
      <div class="bg-card rounded-xl border border-border/40 p-6">
        <div class="mb-5 pb-4 border-b border-border/30 flex items-center justify-between">
          <div>
            <h2 class="text-xs font-bold uppercase tracking-widest text-amber-400">
              Alertes Actives
              <span *ngIf="projectLabel"
                    class="ml-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded
                           bg-indigo-500/10 border border-indigo-500/30 text-indigo-400
                           normal-case tracking-normal">{{ projectLabel }}</span>
            </h2>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ openAlerts.length }} alerte(s) non résolue(s)  - 
              <span class="text-red-400 font-semibold">{{ criticalOpenCount }} critique(s)</span> ·
              <span class="text-orange-400 font-semibold">{{ warningOpenCount }} warning(s)</span> ·
              <span class="text-sky-400 font-semibold">{{ infoOpenCount }} info(s)</span>
            </p>
          </div>
          <div class="hidden sm:flex items-center gap-3 shrink-0">
            <span class="flex items-center gap-1 text-[10px] text-red-400 font-semibold">
              <span class="w-2 h-2 rounded-full bg-red-400 inline-block"></span>CRITICAL
            </span>
            <span class="flex items-center gap-1 text-[10px] text-orange-400 font-semibold">
              <span class="w-2 h-2 rounded-full bg-orange-400 inline-block"></span>WARNING
            </span>
            <span class="flex items-center gap-1 text-[10px] text-sky-400 font-semibold">
              <span class="w-2 h-2 rounded-full bg-sky-400 inline-block"></span>INFO
            </span>
          </div>
        </div>

        <div class="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-1 alert-scroll">

          <div *ngIf="openAlerts.length === 0"
               class="flex items-center justify-center gap-2 py-10 text-xs text-green-400/80 font-semibold">
            <span class="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
            Aucune alerte active  -  système nominal.
          </div>

          <div *ngFor="let alert of openAlerts"
               class="shrink-0 rounded-lg border transition-colors"
               [ngClass]="{
                 'bg-red-500/5 border-red-500/20':       alert.severity === 'critical',
                 'bg-orange-600/5 border-orange-500/20': alert.severity === 'warning',
                 'bg-sky-500/5 border-sky-500/20':       alert.severity === 'info'
               }">

            <div class="flex items-center gap-3 px-4 py-3">

              <div class="w-1 self-stretch rounded-full shrink-0 min-h-[20px]"
                   [ngClass]="{
                     'bg-red-500':    alert.severity === 'critical',
                     'bg-orange-600': alert.severity === 'warning',
                     'bg-sky-500':    alert.severity === 'info'
                   }">
              </div>

              <div class="shrink-0 text-[10px] font-bold tracking-wider px-2 py-1 rounded
                          min-w-[72px] text-center border"
                   [ngClass]="{
                     'bg-red-500/10 text-red-400 border-red-500/30':          alert.severity === 'critical',
                     'bg-orange-500/10 text-orange-400 border-orange-500/30': alert.severity === 'warning',
                     'bg-sky-500/10 text-sky-400 border-sky-500/30':          alert.severity === 'info'
                   }">
                {{ alert.severity | uppercase }}
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                  <p class="text-sm font-semibold text-foreground truncate">{{ alert.title }}</p>
                  <span class="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                        [ngClass]="{
                          'bg-amber-500/10 text-amber-400':   alert.source === 'live',
                          'bg-purple-500/10 text-purple-400': alert.source === 'db'
                        }">
                    {{ alert.source === 'live' ? 'MOTEUR' : 'HISTORIQUE' }}
                  </span>
                </div>
                <p class="text-xs text-muted-foreground">{{ alert.details }}</p>
              </div>

              <span class="text-[11px] text-muted-foreground font-mono shrink-0">
                {{ alert.createdAt | date:'dd/MM HH:mm' }}
              </span>

              <button (click)="toggleResolved(alert)"
                      class="shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-md border
                             transition-colors cursor-pointer select-none
                             bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20">
                Non résolu
              </button>
            </div>

          </div>

        </div>
      </div>

      <!-- â”€â”€ HISTORIQUE  -  ALERTES RÉSOLUES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
      <div class="bg-card rounded-xl border border-border/40 p-6">
        <div class="pb-4 flex items-center justify-between"
             [class.mb-5]="showHistory"
             [class.border-b]="showHistory"
             [class.border-border]="showHistory">
          <div>
            <h2 class="text-xs font-bold uppercase tracking-widest text-green-400">
              Historique  -  Alertes Résolues
              <span *ngIf="projectLabel"
                    class="ml-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded
                           bg-indigo-500/10 border border-indigo-500/30 text-indigo-400
                           normal-case tracking-normal">{{ projectLabel }}</span>
            </h2>
            <p class="mt-1 text-xs text-muted-foreground">
              <span class="text-green-400 font-semibold">{{ resolvedAlerts.length }}</span>
              alerte(s) résolue(s) archivée(s)
            </p>
          </div>
          <button (click)="toggleHistory()"
                  class="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-md
                         border border-border/40 text-muted-foreground hover:text-foreground
                         hover:bg-card transition-colors select-none">
            <span *ngIf="showHistory">▲ Masquer</span>
            <span *ngIf="!showHistory">▼ Afficher l'historique</span>
            <span *ngIf="resolvedAlerts.length > 0"
                  class="px-1.5 py-0.5 rounded-full text-[10px] font-bold
                         bg-green-500/10 text-green-400 border border-green-500/30">
              {{ resolvedAlerts.length }}
            </span>
          </button>
        </div>

        <div *ngIf="showHistory"
             class="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1 alert-scroll">

          <div *ngIf="resolvedAlerts.length === 0"
               class="text-xs text-muted-foreground text-center py-8 italic">
            Aucune alerte résolue.
          </div>

          <div *ngFor="let alert of resolvedAlerts"
               class="shrink-0 rounded-lg border border-border/20 bg-card/20 opacity-70
                      transition-colors hover:opacity-90">

            <div class="flex items-center gap-3 px-4 py-3">

              <div class="w-1 self-stretch rounded-full shrink-0 min-h-[20px] bg-green-500/60"></div>

              <div class="shrink-0 text-[10px] font-bold tracking-wider px-2 py-1 rounded
                          min-w-[72px] text-center border border-border/30
                          bg-muted/10 text-muted-foreground">
                {{ alert.severity | uppercase }}
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                  <p class="text-sm font-semibold text-muted-foreground truncate">{{ alert.title }}</p>
                  <span class="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0
                               bg-green-500/10 text-green-400 border border-green-500/30">
                    RÉSOLU
                  </span>
                  <span class="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                        [ngClass]="{
                          'bg-amber-500/10 text-amber-400':   alert.source === 'live',
                          'bg-purple-500/10 text-purple-400': alert.source === 'db'
                        }">
                    {{ alert.source === 'live' ? 'MOTEUR' : 'HISTORIQUE' }}
                  </span>
                </div>
                <p class="text-xs text-muted-foreground">{{ alert.details }}</p>
              </div>

              <span class="text-[11px] text-muted-foreground font-mono shrink-0">
                {{ alert.createdAt | date:'dd/MM HH:mm' }}
              </span>

              <button (click)="toggleResolved(alert)"
                      class="shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-md border
                             transition-colors cursor-pointer select-none
                             bg-green-500/10 text-green-400 border-green-500/30 hover:bg-red-500/10
                             hover:text-red-400 hover:border-red-500/30">
                Résolu
              </button>
            </div>

          </div>

        </div>
      </div>

      <!-- â”€â”€ CODES DE REFUS ISO 8583 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
      <div class="bg-card rounded-xl border border-border/40 p-6">
        <div class="mb-5 pb-4 border-b border-border/30">
          <h2 class="text-xs font-bold uppercase tracking-widest text-red-400">
            Catégories de Rejet  -  Codes ISO 8583
            <span *ngIf="projectLabel"
                  class="ml-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded
                         bg-indigo-500/10 border border-indigo-500/30 text-indigo-400
                         normal-case tracking-normal">{{ projectLabel }}</span>
          </h2>
          <p class="mt-1 text-xs text-muted-foreground">
            {{ codeStats.length }} code(s) actif(s) sur {{ stats.totalCount }} transactions  - 
            <span class="text-orange-400 font-semibold">TOP 5</span> : {{ top5Label }}
          </p>
        </div>

        <div *ngIf="codeStats.length === 0"
             class="text-xs text-muted-foreground text-center py-6 italic">
          Aucun code de refus détecté sur la période sélectionnée.
        </div>

        <div *ngIf="codeStats.length > 0"
             class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div *ngFor="let s of codeStats"
               class="bg-card/40 rounded-lg p-4 transition-colors hover:bg-card"
               [ngClass]="{
                 'border-2': isTop5(s.code),
                 'border border-border/30': !isTop5(s.code),
                 'border-red-500/40':    isTop5(s.code) && ['05','41','43'].includes(s.code),
                 'border-orange-500/40': isTop5(s.code) && ['55','61','51'].includes(s.code),
                 'border-yellow-500/40': isTop5(s.code) && ['54','14'].includes(s.code)
               }">

            <!-- En-tête : code + badge TOP 5 + pourcentage -->
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs font-bold px-2 py-0.5 rounded"
                      [ngClass]="codeChipClass(s.code)">
                  {{ s.code }}
                </span>
                <span *ngIf="isTop5(s.code)"
                      class="text-[9px] font-bold px-1.5 py-0.5 rounded
                             bg-orange-500/10 text-orange-400 border border-orange-500/30">
                  TOP 5
                </span>
              </div>
              <span class="text-xs text-muted-foreground font-mono">
                {{ pct(s.count) }}%
              </span>
            </div>

            <!-- Libellé -->
            <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {{ alertSvc.getResponseCodeLabel(s.code) }}
            </p>

            <!-- Compteur -->
            <p class="text-2xl font-bold font-mono tabular-nums mb-3"
               [ngClass]="codeTextClass(s.code)">{{ s.count }}</p>

            <!-- Barre de progression -->
            <div class="h-1.5 rounded-full bg-muted/30 overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500"
                   [style.width.%]="pct(s.count)"
                   [ngClass]="codeBarClass(s.code)">
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- â”€â”€ ANALYSE DÉTAILLÉE DES REJETS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
      <div class="bg-card rounded-xl border border-border/40 p-6">
        <div class="mb-5 pb-4 border-b border-border/30">
          <h2 class="text-xs font-bold uppercase tracking-widest text-sky-400">
            Analyse Détaillée des Rejets
            <span *ngIf="projectLabel"
                  class="ml-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded
                         bg-indigo-500/10 border border-indigo-500/30 text-indigo-400
                         normal-case tracking-normal">{{ projectLabel }}</span>
          </h2>
          <p class="mt-1 text-xs text-muted-foreground">Distribution des codes de rejet ISO 8583</p>
        </div>
        <app-decline-reasons-stats [transactions]="filteredTransactions">
        </app-decline-reasons-stats>
      </div>

    </div>
  `,
  styles: [`
    .alert-scroll::-webkit-scrollbar { width: 4px; }
    .alert-scroll::-webkit-scrollbar-track { background: transparent; }
    .alert-scroll::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.3); border-radius: 2px; }
  `]
})
export class AlertesComponent implements OnInit, OnDestroy {

  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];

  /** Liste fusionnée live + DB  -  source unique pour l'affichage et les compteurs */
  allAlerts: DisplayAlert[] = [];

  stats: AlertStats = {
    totalCount: 0, declinedCount: 0, refusalRate: 0,
    reversalCount: 0, criticalOpenCount: 0,
    top5RejectionCodes: [],
  };

  codeStats: { code: string; count: number }[] = [];

  startDate = '';
  endDate   = '';
  isLoading = false;

  get projectLabel(): string { return this.projectFilter.activeProjectName; }

  get top5Label(): string {
    return this.codeStats.slice(0, 5).map(s => s.code).join(' · ') || ' - ';
  }

  // â”€â”€ Compteurs KPI coordonnés avec allAlerts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // KPI cards count only LIVE OPEN alerts  -  DB alerts are always historical, never active
  get criticalOpenCount(): number {
    return this.allAlerts.filter(a => a.source === 'live' && a.severity === 'critical' && a.status === 'OPEN').length;
  }
  get warningOpenCount(): number {
    return this.allAlerts.filter(a => a.source === 'live' && a.severity === 'warning' && a.status === 'OPEN').length;
  }
  get infoOpenCount(): number {
    return this.allAlerts.filter(a => a.source === 'live' && a.severity === 'info' && a.status === 'OPEN').length;
  }

  get openAlerts(): DisplayAlert[] {
    return this.allAlerts.filter(a => a.source === 'live' && a.status === 'OPEN');
  }

  // History: all DB alerts + any live alerts resolved by the user
  get resolvedAlerts(): DisplayAlert[] {
    return this.allAlerts.filter(a => a.source === 'db' || a.status === 'RESOLVED');
  }

  showHistory = false;
  toggleHistory(): void { this.showHistory = !this.showHistory; }

  private liveAlerts: TransactionAlert[] = [];
  private dbAlerts: AlertEvent[]         = [];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly api: ApiService,
    private readonly projectFilter: ProjectFilterService,
    readonly alertSvc: TransactionAlertService,
  ) {}

  ngOnInit(): void {
    // â”€â”€ Stream alertes live (moteur de détection) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    this.alertSvc.alerts$.pipe(takeUntil(this.destroy$)).subscribe(alerts => {
      this.liveAlerts = alerts;
      this._mergeAlerts();
    });

    this.alertSvc.stats$.pipe(takeUntil(this.destroy$)).subscribe(s => {
      this.stats = s;
    });

    // â”€â”€ Chargement transactions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    this.projectFilter.activeProject$.pipe(
      switchMap(() => this.api.getTransactions(2000)),
      debounceTime(300),
      takeUntil(this.destroy$),
    ).subscribe({
      next: (data: Transaction[]) => {
        this.transactions = data;
        this.filteredTransactions = data;
        this._processTransactions();
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; },
    });

    // â”€â”€ Alertes historique DB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    this.api.getAlerts().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: AlertEvent[]) => {
        this.dbAlerts = data;
        this._mergeAlerts();
      },
      error: () => {},
    });
  }

  // â”€â”€ Actions UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  toggleResolved(alert: DisplayAlert): void {
    const next: 'OPEN' | 'RESOLVED' = alert.status === 'RESOLVED' ? 'OPEN' : 'RESOLVED';
    if (alert.source === 'live') {
      // Déléguer au service singleton — le dashboard se met à jour automatiquement
      // via alertSvc.alerts (getter synchrone partagé)
      if (next === 'RESOLVED') {
        this.alertSvc.resolveAlert(alert.id);
      } else {
        this.alertSvc.reopenAlert(alert.id);
      }
      // La subscription alerts$ va rappeler _mergeAlerts() automatiquement
    } else {
      // Alerte DB : mise à jour locale uniquement (pas de backend pour l'instant)
      this.allAlerts = this.allAlerts.map(a =>
        a.id === alert.id ? { ...a, status: next } : a
      );
    }
  }

  applyFilters(): void {
    this.filteredTransactions = this.transactions.filter(t => {
      const ts = t.transmissionDateAndTime || t.timestamp as string;
      if (!ts) return true;
      const d = new Date(ts);
      if (this.startDate && d < new Date(this.startDate)) return false;
      if (this.endDate) {
        const end = new Date(this.endDate);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
    this._processTransactions();
  }

  refreshData(): void {
    this.isLoading = true;
    this.api.invalidateTransactionCache();
    this.api.getTransactions(2000).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.transactions = data;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // â”€â”€ Méthodes utilitaires â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  isTop5(code: string): boolean {
    const top5 = this.codeStats.slice(0, 5).map(s => s.code);
    return top5.includes(code);
  }

  pct(count: number): number {
    if (!this.stats.totalCount) return 0;
    return Math.round((count / this.stats.totalCount) * 1000) / 10;
  }

  // â”€â”€ Méthodes de style partagées â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  codeChipClass(code: string): Record<string, boolean> {
    return {
      'bg-red-500/10 text-red-400':       ['05','41','43'].includes(code),
      'bg-orange-500/10 text-orange-400': ['55','61','51'].includes(code),
      'bg-yellow-500/10 text-yellow-400': ['54','14'].includes(code),
      'bg-muted/20 text-muted-foreground':!['05','41','43','55','61','54','14','51'].includes(code),
    };
  }

  codeTextClass(code: string): Record<string, boolean> {
    return {
      'text-red-400':            ['05','41','43'].includes(code),
      'text-orange-400':         ['55','61','51'].includes(code),
      'text-yellow-400':         ['54','14'].includes(code),
      'text-muted-foreground':   !['05','41','43','55','61','54','14','51'].includes(code),
    };
  }

  codeBarClass(code: string): Record<string, boolean> {
    return {
      'bg-red-500':    ['05','41','43'].includes(code),
      'bg-orange-600': ['55','61'].includes(code),
      'bg-yellow-500': ['54','14'].includes(code),
      'bg-orange-500':   code === '51',
      'bg-slate-500':  !['05','41','43','55','61','54','14','51'].includes(code),
    };
  }

  // â”€â”€ Logique interne â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private _processTransactions(): void {
    this.alertSvc.processBatch(this.filteredTransactions);
    this._buildAllCodeStats();
  }

  /**
   * Fusionne liveAlerts + dbAlerts en une liste DisplayAlert unifiée,
   * triée du plus récent au plus ancien.
   * Cette liste est la source unique pour l'affichage ET les compteurs KPI.
   */
  private _mergeAlerts(): void {
    const live: DisplayAlert[] = this.liveAlerts.map(a => ({
      id:        a.id,
      severity:  a.severity,
      title:     a.title,
      details:   a.details,
      status:    a.status,
      createdAt: a.createdAt,
      source:    'live' as const,
    }));

    const db: DisplayAlert[] = this.dbAlerts.map(a => ({
      id:        String(a.id ?? Math.random()),
      severity:  a.severity,
      title:     a.title,
      details:   a.details ?? '',
      status:    (a.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN') as 'OPEN' | 'RESOLVED',
      createdAt: a.createdAt ? new Date(a.createdAt) : new Date(),
      source:    'db' as const,
    }));

    this.allAlerts = [...live, ...db].sort((a, b) =>
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  private _buildAllCodeStats(): void {
    const counts = new Map<string, number>();
    // Exclude reversals so counts share the same base as stats.totalCount (non-reversals)
    const nonReversals = this.filteredTransactions.filter(t =>
      t.functionCode !== '400' && t.reversalFlag !== 'Y'
    );
    for (const t of nonReversals) {
      const code = t.responseCode;
      if (code && code !== '00' && code !== '000') {
        counts.set(code, (counts.get(code) ?? 0) + 1);
      }
    }
    this.codeStats = Array.from(counts.entries())
      .filter(([, n]) => n > 0)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count);
  }
}

