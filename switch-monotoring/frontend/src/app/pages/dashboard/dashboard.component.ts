import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { timeout, catchError, switchMap, skip, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { of, Subscription, Subject } from 'rxjs';
import { ProjectFilterService } from '../../services/project-filter.service';
import { TransactionStoreService } from '../../services/transaction-store.service';
import { LucideAngularModule, Activity, CheckCircle, Clock, AlertTriangle, Zap, Filter, CreditCard, Landmark, CircleDollarSign } from 'lucide-angular';
import { KpiCardComponent } from '../../components/dashboard/kpi-card.component';
import { environment } from '../../../environments/environment';
import { RefusalStackedComponent } from '../../components/dashboard/refusal-stacked.component';
import { RefusalRateComponent } from '../../components/dashboard/refusal-rate.component';
import { RefusalBySubtypeComponent } from '../../components/dashboard/refusal-by-subtype.component';
import { ApprovedBySubtypeComponent } from '../../components/dashboard/approved-by-subtype.component';
import { SummaryWidgetComponent } from '../../components/dashboard/summary-widget.component';
import { ApiService } from '../../api.service';
import { AppStateService } from '../../state.service';
import { Transaction, AlertEvent } from '../../models';
import { TransactionAlertService } from '../../services/transaction-alert.service';
import { TransactionStatsService } from '../../services/transaction-stats.service';
import { resolveCardNetwork } from '../../data/card-network';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    KpiCardComponent,
    RefusalStackedComponent,
    RefusalRateComponent,
    RefusalBySubtypeComponent,
    ApprovedBySubtypeComponent,
    SummaryWidgetComponent,
  ],
  template: `
    <div class="space-y-4 sm:space-y-5 lg:space-y-6 w-full min-w-0">
      
      <!-- ══════════════════════════════════════════════════════════════════════
           FILTER BAR
           ══════════════════════════════════════════════════════════════════════ -->
      <div class="filter-panel-wrapper">

        <!-- Toggle button -->
        <button (click)="filterOpen = !filterOpen" class="filter-toggle-btn">
          <lucide-icon [img]="FilterIcon" class="w-4 h-4"></lucide-icon>
          <span>{{ filterOpen ? 'Masquer' : 'Afficher' }} les Filtres</span>
          <span *ngIf="appState.getActiveFilterCount() > 0"
                class="filter-badge">{{ appState.getActiveFilterCount() }}</span>
          <span class="filter-toggle-arrow" [class.open]="filterOpen">▾</span>
        </button>

        <!-- Panel -->
        <div *ngIf="filterOpen" class="filter-panel">

          <!-- ── SECTION 1 : PÉRIODE ─────────────────────────────────────────── -->
          <div class="filter-section">
            <div class="filter-section-header">
              <span class="filter-section-dot dot-blue"></span>
              <span class="filter-section-title">Période</span>
            </div>
            <div class="filter-section-body period-grid">

              <!-- Date début -->
              <div class="filter-field">
                <label class="filter-label">Date début</label>
                <div class="filter-input-icon">
                  <svg class="fi-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
                  <input type="date" [(ngModel)]="dateStart" (ngModelChange)="onDateChange()" class="filter-input with-icon">
                </div>
              </div>

              <!-- Date fin -->
              <div class="filter-field">
                <label class="filter-label">Date fin</label>
                <div class="filter-input-icon">
                  <svg class="fi-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
                  <input type="date" [(ngModel)]="dateEnd" (ngModelChange)="onDateChange()" class="filter-input with-icon">
                </div>
              </div>

              <!-- Heure début -->
              <div class="filter-field">
                <label class="filter-label">Heure début</label>
                <div class="filter-input-icon">
                  <svg class="fi-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
                  <input type="time" [(ngModel)]="timeStart" (ngModelChange)="onTimeChange()" class="filter-input with-icon">
                </div>
              </div>

              <!-- Heure fin -->
              <div class="filter-field">
                <label class="filter-label">Heure fin</label>
                <div class="filter-input-icon">
                  <svg class="fi-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
                  <input type="time" [(ngModel)]="timeEnd" (ngModelChange)="onTimeChange()" class="filter-input with-icon">
                </div>
              </div>

            </div>
          </div>

          <!-- ── SECTION 2 : GÉOGRAPHIE ──────────────────────────────────────── -->
          <div class="filter-section">
            <div class="filter-section-header">
              <span class="filter-section-dot dot-green"></span>
              <span class="filter-section-title">Géographie</span>
            </div>
            <div class="filter-section-body geo-grid">

              <div class="filter-field">
                <label class="filter-label">Zone</label>
                <div class="filter-select-wrap">
                  <select [(ngModel)]="selectedZone" (change)="onZoneChange()" class="filter-select">
                    <option value="">Toutes</option>
                    <option *ngFor="let zone of availableZones" [value]="zone">{{ zone }}</option>
                  </select>
                  <span class="select-arrow">▾</span>
                </div>
              </div>

              <div class="filter-field">
                <label class="filter-label">Pays</label>
                <div class="filter-select-wrap" [class.disabled]="!selectedZone && availableCountries.length === 0">
                  <select [(ngModel)]="selectedCountry" (change)="onCountryChange()" class="filter-select">
                    <option value="">Tous</option>
                    <option *ngFor="let country of availableCountries" [value]="country">{{ country }}</option>
                  </select>
                  <span class="select-arrow">▾</span>
                </div>
              </div>

              <div class="filter-field">
                <label class="filter-label">Banque</label>
                <div class="filter-select-wrap">
                  <select [(ngModel)]="selectedBank" (change)="onBankChange()" class="filter-select">
                    <option value="">Toutes</option>
                    <option *ngFor="let bank of availableBanks" [value]="bank">{{ bank }}</option>
                  </select>
                  <span class="select-arrow">▾</span>
                </div>
              </div>

            </div>
          </div>

          <!-- ── SECTION 3 : TRANSACTION ─────────────────────────────────────── -->
          <div class="filter-section">
            <div class="filter-section-header">
              <span class="filter-section-dot dot-orange"></span>
              <span class="filter-section-title">Transaction</span>
            </div>
            <div class="filter-section-body tx-grid">

              <div class="filter-field">
                <label class="filter-label">{{ t.typeLabel }}</label>
                <div class="filter-select-wrap">
                  <select [(ngModel)]="selectedType" (change)="onTypeChange()" class="filter-select">
                    <option value="">Tous</option>
                    <option *ngFor="let type of availableTypes" [value]="type">{{ type }}</option>
                  </select>
                  <span class="select-arrow">▾</span>
                </div>
              </div>

              <div class="filter-field">
                <label class="filter-label">Type de Transaction</label>
                <div class="filter-select-wrap">
                  <select [(ngModel)]="selectedTransactionType" (change)="onTransactionTypeChange()" class="filter-select">
                    <option value="">Tous</option>
                    <option *ngFor="let txType of availableTransactionTypes" [value]="txType">{{ txType }}</option>
                  </select>
                  <span class="select-arrow">▾</span>
                </div>
              </div>

              <div class="filter-field">
                <label class="filter-label">Devise</label>
                <div class="filter-select-wrap">
                  <select [(ngModel)]="selectedCurrency" (change)="onCurrencyChange()" class="filter-select">
                    <option value="">Toutes</option>
                    <option *ngFor="let curr of availableCurrencies" [value]="curr">{{ curr }}</option>
                  </select>
                  <span class="select-arrow">▾</span>
                </div>
              </div>

              <div class="filter-field">
                <label class="filter-label">Canal</label>
                <div class="filter-select-wrap">
                  <select [(ngModel)]="selectedCanal" (ngModelChange)="onCanalChange()" class="filter-select">
                    <option value="">Tous</option>
                    <option *ngFor="let c of canalOptions" [value]="c.value">{{ c.label }}</option>
                  </select>
                  <span class="select-arrow">▾</span>
                </div>
              </div>

              <div class="filter-field">
                <label class="filter-label">Type MTI</label>
                <div class="filter-select-wrap">
                  <select [(ngModel)]="selectedMtiGroup" (ngModelChange)="onMtiGroupChange()" class="filter-select">
                    <option value="">Tous</option>
                    <option *ngFor="let g of mtiGroupOptions" [value]="g.value">{{ g.label }}</option>
                  </select>
                  <span class="select-arrow">▾</span>
                </div>
              </div>

              <div class="filter-field">
                <label class="filter-label">Code Réponse</label>
                <div class="filter-select-wrap">
                  <select [(ngModel)]="selectedCodeGroupe" (ngModelChange)="onCodeGroupeChange()" class="filter-select">
                    <option value="">Tous</option>
                    <option *ngFor="let g of codeGroupeOptions" [value]="g.value">{{ g.label }}</option>
                  </select>
                  <span class="select-arrow">▾</span>
                </div>
              </div>

            </div>
          </div>

          <!-- ── FOOTER : ACTIONS + WIDGETS ─────────────────────────────────── -->
          <div class="filter-footer">
            <div class="filter-footer-left">
              <button (click)="resetAllFilters()" class="btn-reset-filters">
                <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>
                Réinitialiser
                <span *ngIf="appState.getActiveFilterCount() > 0" class="reset-count">{{ appState.getActiveFilterCount() }}</span>
              </button>
            </div>

            <div class="filter-footer-right">
              <span class="filter-footer-label">Widgets :</span>
              <button (click)="showAllWidgets()" class="btn-widget-ctrl show">Tout afficher</button>
              <button (click)="resetWidgets()"   class="btn-widget-ctrl hide">Tout masquer</button>
            </div>
          </div>

          <!-- Widget toggles -->
          <div class="widget-toggles-grid">
            <label *ngFor="let widget of getWidgetKeys()"
                   class="widget-toggle-item"
                   [class.active]="widgetsConfig[widget]">
              <input type="checkbox" [(ngModel)]="widgetsConfig[widget]" class="widget-checkbox">
              <span class="widget-toggle-dot" [class.active]="widgetsConfig[widget]"></span>
              <span class="widget-toggle-label">{{ widgetNames[widget] }}</span>
            </label>
          </div>

        </div>
      </div>

      <!-- Navigation to Analysis Pages -->
      <div *ngIf="widgetsConfig['navigationCards']" class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
        <button (click)="navigateTo('atm')"
                class="bg-card border border-border/50 rounded-xl p-3 sm:p-5 text-left
                       hover:border-primary/40 hover:shadow-md transition-all group shadow-sm">
          <div class="flex items-center gap-3 mb-1 sm:mb-2">
            <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <lucide-icon [img]="LandmarkIcon" class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary"></lucide-icon>
            </div>
            <h3 class="text-sm font-bold text-foreground">ATM / GAB</h3>
          </div>
          <p class="text-xs text-muted-foreground hidden sm:block">Monitoring complet des GAB et banques</p>
        </button>

        <button (click)="navigateTo('pos')"
                class="bg-card border border-border/50 rounded-xl p-3 sm:p-5 text-left
                       hover:border-primary/40 hover:shadow-md transition-all group shadow-sm">
          <div class="flex items-center gap-3 mb-1 sm:mb-2">
            <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <lucide-icon [img]="CreditIcon" class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary"></lucide-icon>
            </div>
            <h3 class="text-sm font-bold text-foreground">POS</h3>
          </div>
          <p class="text-xs text-muted-foreground hidden sm:block">Points de vente  -  terminaux physiques</p>
        </button>

        <button (click)="navigateTo('ecom')"
                class="bg-card border border-border/50 rounded-xl p-3 sm:p-5 text-left
                       hover:border-primary/40 hover:shadow-md transition-all group shadow-sm">
          <div class="flex items-center gap-3 mb-1 sm:mb-2">
            <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <lucide-icon [img]="DollarIcon" class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary"></lucide-icon>
            </div>
            <h3 class="text-sm font-bold text-foreground">E-Commerce</h3>
          </div>
          <p class="text-xs text-muted-foreground hidden sm:block">Transactions en ligne et marchands ECOM</p>
        </button>
      </div>

      <!-- === PRIMARY KPIs === -->
      <div *ngIf="widgetsConfig['kpiCards']" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
        <app-kpi-card [title]="t.uptime" [value]="uptime + '%'" subtitle="Objectif: 99.99%" [icon]="CheckCircleIcon" [variant]="uptime > 99.0 ? 'success' : 'danger'" class="h-full"></app-kpi-card>
        <app-kpi-card [title]="t.avgLatency" [value]="avgLatency + 'ms'" subtitle="SLA < 2000ms" [icon]="ClockIcon" [variant]="avgLatency < 500 ? 'success' : (avgLatency < 1500 ? 'warning' : 'danger')" class="h-full"></app-kpi-card>
        <app-kpi-card [title]="t.success" [value]="successRate + '%'" subtitle="Target: 95%" [icon]="ActivityIcon" [variant]="successRate >= 80 ? 'success' : 'warning'" class="h-full"></app-kpi-card>
        <app-kpi-card title="TPS" [value]="tps" subtitle="Trans./sec" [icon]="ZapIcon" variant="default" class="h-full"></app-kpi-card>
        <app-kpi-card [title]="t.alerts" [value]="alertsCount" subtitle="Non résolues" [icon]="AlertTriangleIcon" [variant]="alertsCount > 0 ? 'danger' : 'success'" class="h-full"></app-kpi-card>
      </div>



      <!-- === NETWORK KPIs (Visa / Mastercard  -  ATM excluded) === -->
      <div *ngIf="widgetsConfig['cardTypeKpis']" class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        <app-kpi-card [title]="t.credit" [value]="visaCount"       [subtitle]="t.refuseLabel + ' ' + visaRefusal       + '%'" [icon]="CreditIcon" subtitleColor="text-destructive" class="h-full"></app-kpi-card>
        <app-kpi-card [title]="t.debit"  [value]="mastercardCount" [subtitle]="t.refuseLabel + ' ' + mastercardRefusal + '%'" [icon]="CreditIcon" subtitleColor="text-destructive" class="h-full"></app-kpi-card>
      </div>

      <!-- === 1. APPROVED VS REFUSED (Stacked Bar Chart) === -->
      <div *ngIf="widgetsConfig['approvedVsRefused']" class="bg-card rounded-xl border border-border/40 p-4 sm:p-6 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
        <h2 class="text-base sm:text-lg font-bold text-foreground mb-4 sm:mb-6">
          {{ t.approvedVsRefused }}
          <span *ngIf="projectLabel" class="ml-2 text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">{{ projectLabel }}</span>
        </h2>
        <div style="height: 300px;">
          <app-refusal-stacked [transactions]="transactions"></app-refusal-stacked>
        </div>
      </div>

      <!-- === 2. APPROVED BY SUBTYPE (Stacked Bar Chart) === -->
      <div *ngIf="widgetsConfig['approvedBySubtype']" class="bg-card rounded-xl border border-border/40 p-4 sm:p-6 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
        <h2 class="text-base sm:text-lg font-bold text-foreground mb-4 sm:mb-6">
          Approuvees par Sous-type (par minute)
          <span *ngIf="projectLabel" class="ml-2 text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">{{ projectLabel }}</span>
        </h2>
        <div style="height: 300px;">
          <app-approved-by-subtype [transactions]="transactions"></app-approved-by-subtype>
        </div>
      </div>

      <!-- === 3. DECLINED BY SUBTYPE (Stacked Bar Chart) === -->
      <div *ngIf="widgetsConfig['declinedBySubtype']" class="bg-card rounded-xl border border-border/40 p-4 sm:p-6 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
        <h2 class="text-base sm:text-lg font-bold text-foreground mb-4 sm:mb-6">
          {{ t.declinedBySubtype }}
          <span *ngIf="projectLabel" class="ml-2 text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">{{ projectLabel }}</span>
        </h2>
        <div style="height: 300px;">
          <app-refusal-by-subtype [transactions]="transactions"></app-refusal-by-subtype>
        </div>
      </div>

            <!-- === 4. REFUSAL RATE (Line Chart) === -->
      <div *ngIf="widgetsConfig['declineRate']" class="bg-card rounded-xl border border-border/40 p-4 sm:p-6 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
        <app-refusal-rate [transactions]="transactions"></app-refusal-rate>
      </div>

      <!-- === RÉSUMÉ === -->
      <div *ngIf="widgetsConfig['summaryWidget']">
        <app-summary-widget [transactions]="transactions" [alertsCount]="alertsCount"></app-summary-widget>
      </div>


























    </div>
  `,
  styles: [`
    :host ::ng-deep .chart-container {
      position: relative;
      width: 100%;
      height: 100%;
    }

    /* ═══════════════════════════════════════════════════════════════════════════
       FILTER PANEL
       ═══════════════════════════════════════════════════════════════════════════ */

    .filter-panel-wrapper {
      position: relative;
    }

    /* ── Toggle button ──────────────────────────────────────────────────────── */
    .filter-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background: var(--color-primary, #f97316);
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(249,115,22,.30);
      transition: box-shadow .2s, transform .15s;
      letter-spacing: .02em;
    }
    .filter-toggle-btn:hover {
      box-shadow: 0 4px 14px rgba(249,115,22,.45);
      transform: translateY(-1px);
    }
    .filter-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 5px;
      background: rgba(255,255,255,.30);
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
    }
    .filter-toggle-arrow {
      font-size: 12px;
      transition: transform .25s;
      opacity: .8;
    }
    .filter-toggle-arrow.open { transform: rotate(180deg); }

    /* ── Panel container ────────────────────────────────────────────────────── */
    .filter-panel {
      margin-top: 10px;
      background: var(--color-card, #fff);
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,.08);
    }

    /* ── Section ────────────────────────────────────────────────────────────── */
    .filter-section {
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-border, #f1f5f9);
    }
    .filter-section:last-of-type { border-bottom: none; }

    .filter-section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 14px;
    }
    .filter-section-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .dot-blue   { background: #3b82f6; box-shadow: 0 0 6px rgba(59,130,246,.5); }
    .dot-green  { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,.5);  }
    .dot-orange { background: #f97316; box-shadow: 0 0 6px rgba(249,115,22,.5); }

    .filter-section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: var(--color-muted-foreground, #6b7280);
    }

    /* ── Grids ──────────────────────────────────────────────────────────────── */
    .filter-section-body { display: grid; gap: 12px; }

    .period-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .geo-grid {
      grid-template-columns: repeat(3, 1fr);
    }
    .tx-grid {
      grid-template-columns: repeat(3, 1fr);
    }

    @media (max-width: 1024px) {
      .period-grid { grid-template-columns: repeat(2, 1fr); }
      .geo-grid    { grid-template-columns: repeat(2, 1fr); }
      .tx-grid     { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 640px) {
      .period-grid,
      .geo-grid,
      .tx-grid { grid-template-columns: 1fr; }
      .filter-section { padding: 14px 16px; }
    }

    /* ── Field ──────────────────────────────────────────────────────────────── */
    .filter-field { display: flex; flex-direction: column; gap: 5px; }

    .filter-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--color-muted-foreground, #6b7280);
      text-transform: uppercase;
      letter-spacing: .06em;
    }

    /* ── Input with icon ────────────────────────────────────────────────────── */
    .filter-input-icon {
      position: relative;
      display: flex;
      align-items: center;
    }
    .fi-icon {
      position: absolute;
      left: 10px;
      width: 15px;
      height: 15px;
      color: var(--color-muted-foreground, #9ca3af);
      pointer-events: none;
      flex-shrink: 0;
    }
    .filter-input {
      width: 100%;
      height: 38px;
      border: 1px solid var(--color-border, #d1d5db);
      border-radius: 8px;
      background: var(--color-muted, #f9fafb);
      background: var(--color-input, #f9fafb);
      color: var(--color-foreground, #111827);
      font-size: 13px;
      font-weight: 500;
      outline: none;
      transition: border-color .2s, box-shadow .2s;
      padding: 0 10px;
    }
    .filter-input.with-icon { padding-left: 34px; }
    .filter-input:focus {
      border-color: #f97316;
      box-shadow: 0 0 0 3px rgba(249,115,22,.12);
    }
    /* native date/time picker color fix in dark mode */
    .filter-input::-webkit-calendar-picker-indicator {
      opacity: .5;
      cursor: pointer;
    }

    /* ── Select ─────────────────────────────────────────────────────────────── */
    .filter-select-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .filter-select-wrap.disabled { opacity: .45; pointer-events: none; }

    .filter-select {
      width: 100%;
      height: 38px;
      border: 1px solid var(--color-border, #d1d5db);
      border-radius: 8px;
      background: var(--color-muted, #f9fafb);
      color: var(--color-foreground, #111827);
      font-size: 13px;
      font-weight: 500;
      padding: 0 32px 0 12px;
      appearance: none;
      -webkit-appearance: none;
      outline: none;
      cursor: pointer;
      transition: border-color .2s, box-shadow .2s;
    }
    .filter-select:focus {
      border-color: #f97316;
      box-shadow: 0 0 0 3px rgba(249,115,22,.12);
    }
    .select-arrow {
      position: absolute;
      right: 10px;
      font-size: 11px;
      color: var(--color-muted-foreground, #9ca3af);
      pointer-events: none;
    }

    /* ── Footer ─────────────────────────────────────────────────────────────── */
    .filter-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      padding: 14px 20px;
      background: var(--color-muted, #f8fafc);
      border-top: 1px solid var(--color-border, #f1f5f9);
    }
    .filter-footer-left,
    .filter-footer-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .filter-footer-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--color-muted-foreground, #6b7280);
      text-transform: uppercase;
      letter-spacing: .06em;
    }

    .btn-reset-filters {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      background: #fff7ed;
      color: #c2410c;
      border: 1px solid #fed7aa;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background .2s, border-color .2s;
    }
    .btn-reset-filters:hover { background: #ffedd5; border-color: #fb923c; }
    .reset-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      background: #f97316;
      color: #fff;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 700;
    }

    .btn-widget-ctrl {
      padding: 6px 12px;
      border-radius: 7px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background .2s;
      border: 1px solid transparent;
    }
    .btn-widget-ctrl.show {
      background: rgba(59,130,246,.08);
      color: #3b82f6;
      border-color: rgba(59,130,246,.25);
    }
    .btn-widget-ctrl.show:hover { background: rgba(59,130,246,.15); }
    .btn-widget-ctrl.hide {
      background: rgba(239,68,68,.07);
      color: #ef4444;
      border-color: rgba(239,68,68,.20);
    }
    .btn-widget-ctrl.hide:hover { background: rgba(239,68,68,.14); }

    /* ── Widget toggles ─────────────────────────────────────────────────────── */
    .widget-toggles-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      padding: 12px 20px 16px;
    }
    @media (max-width: 1024px) { .widget-toggles-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px)  { .widget-toggles-grid { grid-template-columns: 1fr; } }

    .widget-toggle-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--color-border, #e5e7eb);
      cursor: pointer;
      transition: border-color .2s, background .2s;
      background: transparent;
    }
    .widget-toggle-item.active {
      border-color: rgba(249,115,22,.35);
      background: rgba(249,115,22,.05);
    }
    .widget-toggle-item:hover:not(.active) {
      border-color: var(--color-border, #d1d5db);
      background: var(--color-muted, #f9fafb);
    }
    .widget-checkbox { display: none; }
    .widget-toggle-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid #d1d5db;
      flex-shrink: 0;
      transition: background .2s, border-color .2s;
    }
    .widget-toggle-dot.active { background: #f97316; border-color: #f97316; }
    .widget-toggle-label {
      font-size: 11px;
      font-weight: 500;
      color: var(--color-foreground, #374151);
      line-height: 1.3;
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  ActivityIcon = Activity;
  CheckCircleIcon = CheckCircle;
  ClockIcon = Clock;
  AlertTriangleIcon = AlertTriangle;
  ZapIcon = Zap;
  FilterIcon = Filter;
  CreditIcon = CreditCard;
  LandmarkIcon = Landmark;
  DollarIcon = CircleDollarSign;
  
  get projectLabel(): string { return this.projectFilter.activeProjectName; }

  transactions: Transaction[] = [];
  allRawTransactions: Transaction[] = [];
  alerts: AlertEvent[] = [];

  uptime = 0;
  avgLatency = 0;
  successRate = 0;
  tps = 0;

  // SLA Thresholds
  slaThresholds: any = {
    uptime: 99.90,
    latency: 2000,
    successRate: 95.0
  };

  // Network KPIs (Visa / Mastercard)  -  ATM/GAB excluded
  visaCount = 0;
  visaRefusal = 0;
  mastercardCount = 0;
  mastercardRefusal = 0;

  // POS (Point Of Sale) KPIs
  posActiveTerminals = 0;
  posConnectivity = 0;
  posTxCount = 0;
  posRefusalRate = 0;

  // ECOM (E-Commerce) KPIs
  ecomActiveSessions = 0;
  ecomAbandonmentRate = 0;
  ecom3dsSuccessRate = 0;
  ecomFraudRate = 0;

  private txEvents?: EventSource;
  private alertEvents?: EventSource;
  
  filterOpen = false;

  widgetsConfig: Record<string, boolean> = {
    navigationCards:   true,
    kpiCards:          true,
    cardTypeKpis:      true,
    approvedVsRefused: true,
    declineRate:       true,
    declinedBySubtype: true,
    approvedBySubtype: true,
    summaryWidget:     true,
  };

  widgetNames: Record<string, string> = {
    navigationCards:   'Raccourcis ATM / POS / E-Commerce',
    kpiCards:          'Indicateurs KPI (UPTIME / LATENCE / SUCCÈS / TPS / ALERTES)',
    cardTypeKpis:      'KPI par Réseau (Visa / Mastercard)',
    approvedVsRefused: 'Volume Approuvees vs Refusees',
    declineRate:       'Taux de Refus (courbe)',
    declinedBySubtype: 'Refus par Sous-type (par minute)',
    approvedBySubtype: 'Approuvees par Sous-type (par minute)',
    summaryWidget:     'Resume global',
  };

  get t() {
    return this.appState.lang() === 'fr' ? this.translations.fr : this.translations.en;
  }

  private translations = {
    fr: {
      date: 'Date',
      region: 'Répartition par Région',
      country: 'Top Pays',
      banks: 'Top 5 - Banques',
      volume: 'Volume',
      declined: 'Refus par Sous-type',
      declineRate: 'Taux de Refus',
      perMinute: 'Par minute',
      threshold: 'SEUIL',
      latency: 'Latence (ms)',
      isoCodes: 'Codes ISO 8583',
      filters: 'Filtres',
      customize: 'Widgets',
      networkKpis: 'Indicateurs Réseau',
      globalKpis: 'Performances Globales',
      credit: 'VISA',
      debit: 'MASTERCARD',
      uptime: 'UPTIME',
      avgLatency: 'LATENCE',
      regionLabel: 'Région',
      zoneLabel: 'Zone',
      countryLabel: 'Pays',
      bankLabel: 'Banque',
      typeLabel: 'Message Type Indicators',
      all: 'Tous',
      success: 'SUCCÈS',
      alerts: 'ALERTES',
      approvedVsRefused: 'Volume Approuvées vs Refusées',
      declinedBySubtype: 'Refus par Sous-type (par minute)',
      refuseLabel: 'Refus:',
    },
    en: {
      date: 'Date',
      region: 'By Region',
      country: 'Top Countries',
      banks: 'Top 5 - Banks',
      acquirer: 'By Acquirer',
      volume: 'Volume',
      declined: 'Declined by Subtype',
      declineRate: 'Decline Rate',
      perMinute: 'Per minute',
      threshold: 'THRESHOLD',
      latency: 'Latency (ms)',
      isoCodes: 'ISO 8583 Codes',
      filters: 'Filters',
      customize: 'Widgets',
      networkKpis: 'Network Indicators',
      globalKpis: 'Global Performance',
      credit: 'VISA',
      debit: 'MASTERCARD',
      uptime: 'UPTIME',
      avgLatency: 'LATENCY',
      regionLabel: 'Region',
      zoneLabel: 'Zone',
      countryLabel: 'Country',
      bankLabel: 'Bank',
      typeLabel: 'Message Type Indicators',
      all: 'All',
      success: 'SUCCESS',
      alerts: 'ALERTS',
      approvedVsRefused: 'Approved vs Declined Volume',
      declinedBySubtype: 'Declines by Subtype (per minute)',
      refuseLabel: 'Decline:',
    }
  };

  // Filter properties
  dateStart: string = '';
  dateEnd: string = '';
  timeStart: string = '';
  timeEnd: string = '';
  selectedZone: string = '';
  selectedCountry: string = '';
  selectedBank: string = '';
  selectedType: string = '';
  selectedTransactionType: string = '';
  
  // Complete configuration data
  config: any = null;
  
  // Dynamic filter options (will update based on selections)
  availableZones: string[] = [];
  availableCountries: string[] = [];
  availableBanks: string[] = [];
  availableTypes: string[] = [];
  availableTransactionTypes: string[] = [];
  // Devises présentes dans inject_data.sql : MAD (87.5%), EUR/GBP/USD/TND (12.5%)
  availableCurrencies: string[] = ['MAD', 'EUR', 'GBP', 'USD', 'TND'];

  // Table de correspondance code banque Oracle → nom affiché dans le dropdown
  // Alignée exactement sur inject_data.sql
  readonly bankCodeToName: Record<string, string> = {
    'AWB':   'Attijariwafa Bank',
    'BCP':   'Banque Centrale Populaire',
    'BMCE':  'BMCE Bank',
    'CIH':   'CIH Bank',
    'BPM':   'Banque Populaire du Maroc',
    'CDM':   'Crédit du Maroc',
    'SGM':   'Société Générale Maroc',
    'BOA':   'Bank of Africa',
    'CAGM':  'Crédit Agricole Maroc',
    'BCM':   'Banque Centrale',
    'BIAT':  'Banque Internationale Arabe de Tunisie',
    'STDB':  'Standard Bank',
    'BNP':   'BNP Paribas',
    'HSBC':  'HSBC',
    'JPMCH': 'JPMorgan Chase',
    'ICBC':  'ICBC',
    'MUFG':  'Bank of Tokyo-Mitsubishi UFJ',
    'SNBSA': 'Saudi National Bank',
    'FAB':   'First Abu Dhabi Bank',
    'ZENTH': 'Zenith Bank',
  };
  selectedCurrency: string = '';
  selectedCanal: string = '';
  selectedMtiGroup: string = '';
  selectedCodeGroupe: string = '';

  readonly canalOptions = [
    { value: 'ATM',  label: 'GAB / ATM' },
    { value: 'POS',  label: 'Point de Vente (POS)' },
    { value: 'ECOM', label: 'E-Commerce' },
  ];
  readonly mtiGroupOptions = [
    { value: 'AUTORISATION', label: 'Autorisation (0100/1100)' },
    { value: 'ACHAT',        label: 'Achat (0200/1200)' },
    { value: 'REVERSAL',     label: 'Reversal / Annulation (0420)' },
    { value: 'RESEAU',       label: 'Administration Réseau (0800)' },
  ];
  readonly codeGroupeOptions = [
    { value: 'SUCCES',    label: 'Succès (000)' },
    { value: 'TIMEOUT',   label: 'Timeout / Réseau (906...)' },
    { value: 'PROVISION', label: 'Provision insuffisante (051)' },
    { value: 'REFUS',     label: 'Autres refus' },
  ];

  private projectSub?: Subscription;
  private destroy$ = new Subject<void>();

  constructor(
    private api: ApiService,
    public appState: AppStateService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private projectFilter: ProjectFilterService,
    private txStore: TransactionStoreService,
    private alertSvc: TransactionAlertService,
    private statsService: TransactionStatsService,
  ) {}

  navigateTo(page: string) {
    this.router.navigate([`/${page}`]);
  }
  
  // ============================================================================
  // CASCADE FILTER HANDLERS
  // ============================================================================

  onDateChange() {
    this.appState.setFilters({
      dateStart: this.dateStart,
      dateEnd:   this.dateEnd,
      timeStart: this.timeStart,
      timeEnd:   this.timeEnd,
    });
    this.applyClientFilters();
  }

  onTimeChange() {
    this.appState.setFilters({
      dateStart: this.dateStart,
      dateEnd:   this.dateEnd,
      timeStart: this.timeStart,
      timeEnd:   this.timeEnd,
    });
    this.applyClientFilters();
  }

  onZoneChange() {
    this.selectedCountry = '';
    this.selectedBank    = '';
    this.selectedType    = '';

    if (!this.selectedZone) {
      // Pas de zone → tous les pays (union sans doublons)
      this.availableCountries = Array.from(new Set(Object.values(this.config?.zones || {}).flat() as string[]));
    } else if (this.selectedZone === 'Local') {
      // Local = Maroc uniquement
      this.availableCountries = ['Maroc'];
    } else if (this.selectedZone === 'International') {
      // International = tout sauf Maroc
      const all = Array.from(new Set(Object.values(this.config?.zones || {}).flat() as string[]));
      this.availableCountries = all.filter(c => c !== 'Maroc');
    } else if (this.config?.zones?.[this.selectedZone]) {
      // Zone géographique ('Afrique','Europe'...) → pays de cette zone
      this.availableCountries = this.config.zones[this.selectedZone];
    } else {
      this.availableCountries = Array.from(new Set(Object.values(this.config?.zones || {}).flat() as string[]));
    }

    // Banques : filtrer par pays disponibles dans la zone sélectionnée
    this.availableBanks = this.getBanksForCountries(this.availableCountries);

    this.appState.setFilters({ zone: this.selectedZone, selectedCountry: '', selectedBank: '' });
    this.applyClientFilters();
  }

  onCountryChange() {
    this.selectedBank = '';
    this.selectedType = '';

    // Banques : filtrer selon le pays sélectionné (si défini), sinon les pays de la zone active
    if (this.selectedCountry && this.config?.banks?.[this.selectedCountry]) {
      this.availableBanks = this.getBanksForCountries([this.selectedCountry]);
    } else if (this.selectedZone) {
      this.availableBanks = this.getBanksForCountries(this.availableCountries);
    } else {
      this.availableBanks = Object.values(this.bankCodeToName);
    }

    this.appState.setFilters({ selectedCountry: this.selectedCountry, selectedBank: '' });
    this.applyClientFilters();
  }

  onBankChange() {
    this.selectedType = '';
    this.appState.setFilters({ selectedBank: this.selectedBank });
    this.applyClientFilters();
  }

  onTypeChange() {
    this.appState.setFilters({ type: this.selectedType });
    this.applyClientFilters();
  }

  onTransactionTypeChange() {
    this.appState.setFilters({ transactionType: this.selectedTransactionType });
    this.applyClientFilters();
  }

  onCurrencyChange() {
    this.appState.setFilters({ currency: this.selectedCurrency });
    this.applyClientFilters();
  }

  onCanalChange() {
    this.appState.setFilters({ channel: this.selectedCanal as any });
    this.applyClientFilters();
  }

  onMtiGroupChange() {
    this.appState.setFilters({ mtiGroup: this.selectedMtiGroup });
    this.applyClientFilters();
  }

  onCodeGroupeChange() {
    this.appState.setFilters({ codeReponseGroupe: this.selectedCodeGroupe });
    this.applyClientFilters();
  }

  resetAllFilters() {
    this.dateStart             = '';
    this.dateEnd               = '';
    this.timeStart             = '';
    this.timeEnd               = '';
    this.selectedZone          = '';
    this.selectedCountry       = '';
    this.selectedBank          = '';
    this.selectedType          = '';
    this.selectedTransactionType = '';
    this.selectedCurrency      = '';
    this.selectedCanal         = '';
    this.selectedMtiGroup      = '';
    this.selectedCodeGroupe    = '';
    const geoZones = Object.keys(this.config?.zones || {});
    this.availableZones        = ['Local', 'International', ...geoZones.filter(z => z !== 'Local' && z !== 'International')];
    this.availableCountries    = Array.from(new Set(Object.values(this.config?.zones || {}).flat() as string[]));
    this.availableBanks        = Object.values(this.bankCodeToName);
    this.appState.resetFilters();
    this.applyClientFilters();
  }

  private getBanksForCountries(countries: string[]): string[] {
    if (!countries || countries.length === 0) return Object.values(this.bankCodeToName);
    const banks = new Set<string>();
    countries.forEach(country => {
      const countryBanks: string[] = this.config?.banks?.[country] || [];
      countryBanks.forEach(b => {
        // Garder seulement les banques qui ont un code Oracle connu (présentes dans inject_data.sql)
        const upperB = b.toUpperCase();
        const hasCode = Object.values(this.bankCodeToName).some(name => name.toUpperCase() === upperB);
        if (hasCode) banks.add(b);
      });
    });
    // Si aucune banque trouvée pour ces pays (ex: pays sans txn Oracle), retourner toutes les banques Oracle
    return banks.size > 0 ? Array.from(banks) : Object.values(this.bankCodeToName);
  }

  private applyClientFilters(): void {
    this.transactions = this.appState.applyFilters(this.allRawTransactions);
    this.updateKpis();
    this.calculateNetworkKpis();
    this.calculatePosKpis();
    this.calculateEcomKpis();
    this.cdr.markForCheck();
  }

  handleResolveAlert(alert: AlertEvent) {
    this.alerts = this.alerts.map(a =>
      a.id === alert.id
        ? { ...a, status: 'RESOLVED' as const }
        : a
    );
    this.cdr.markForCheck();
  }

  resetWidgets() {
    Object.keys(this.widgetsConfig).forEach(key => {
      this.widgetsConfig[key] = false;
    });
  }

  showAllWidgets() {
    Object.keys(this.widgetsConfig).forEach(key => {
      this.widgetsConfig[key] = true;
    });
  }

  getWidgetKeys(): string[] {
    return Object.keys(this.widgetsConfig);
  }

  ngOnInit() {
    // Force fresh data on every dashboard load  -  clears any stale adapted-cache
    // that may carry wrong networkCode values from before the last backend restart.
    this.api.invalidateTransactionCache();

    // Load complete configuration with timeout and fallback
    this.api.getCompleteConfiguration().pipe(
      timeout(5000), // 5 second timeout
      catchError(() => of(this.getMockConfiguration()))
    ).subscribe({
      next: (config) => {
        this.config = config;
        // Zone : 'Local'/'International' (valeurs de tx.zone Oracle) + zones géographiques de la config
        const geoZones = Object.keys(config.zones || {});
        this.availableZones = ['Local', 'International', ...geoZones.filter(z => z !== 'Local' && z !== 'International')];
        // Pays : tous les pays de toutes les zones (union sans doublons)
        const allCountries = Array.from(new Set(Object.values(config.zones || {}).flat() as string[]));
        this.availableCountries = allCountries;
        // Banques : noms complets issus de bankCodeToName (correspondance exacte avec BANK_NAME_TO_CODE)
        this.availableBanks = Object.values(this.bankCodeToName);
        const typesMap = config.mtiTypes || {};
        this.availableTypes = Object.entries(typesMap).map(([code, desc]) => `${code} - ${desc}`).sort();
        
        // Load transaction types
        const transactionTypesMap = (config as any).transactionTypes || {};
        this.availableTransactionTypes = Object.entries(transactionTypesMap)
          .map(([code, desc]) => `${code} - ${desc}`)
          .sort();
        
        this.cdr.markForCheck();
      }
    });

    // Load transactions  -  re-triggers on every project filter change
    // Project-specific mode: display only that project's data (bypass cumulative store)
    // No-filter mode: accumulate in store for full history
    this.projectSub = this.projectFilter.activeProject$.pipe(
      switchMap(() => this.api.getTransactions().pipe(
        timeout(30000),
        catchError(() => of(this.getMockTransactions()))
      ))
    ).subscribe({
      next: (data) => {
        this.allRawTransactions = data;
        this.applyClientFilters();
      }
    });

    // Load alerts with timeout and fallback
    this.api.getAlerts().pipe(
      timeout(5000),
      catchError(() => of(this.getMockAlerts()))
    ).subscribe({
      next: (data) => {
        this.alerts = data;
        this.cdr.markForCheck();
      }
    });

    // Réagit aux changements du store (flush buffer pause→live, SSE batch)
    // Seul le mode sans projet sélectionné utilise le store global
    this.txStore.transactions$.pipe(
      skip(1),
      distinctUntilChanged((a, b) => a.length === b.length && a[0] === b[0]),
      takeUntil(this.destroy$)
    ).subscribe(txs => {
      if (!this.projectFilter.activeProject && this.appState.isLive()) {
        this.allRawTransactions = txs;
        this.applyClientFilters();
        this.cdr.markForCheck();
      }
    });

    // Try to connect SSE but don't block if it fails
    setTimeout(() => this.connectSse(), 1000);
  }

  // Mock data generators for when API is unavailable
  private getMockConfiguration() {
    return {
      zones: {
        'Europe':       ['France', 'Royaume-Uni', 'Espagne', 'Allemagne', 'Grèce', 'Belgique', 'Pays-Bas', 'Italie', 'Portugal'],
        'Afrique':      ['Maroc', 'Algérie', 'Tunisie', 'Égypte', 'Nigeria', 'Afrique du Sud', "Côte d'Ivoire", 'Sénégal'],
        'Amériques':    ['Etats-Unis', 'Canada', 'Mexique', 'Brésil'],
        'Asie':         ['Chine', 'Japon', 'Singapour', 'Hong Kong'],
        'Moyen-Orient': ['Arabie Saoudite', 'Emirats Arabes Unis', 'Turquie'],
      },
      banks: {
        // ── Europe ─────────────────────────────────────────────
        'France': [
          'BNP Paribas', 'Crédit Agricole', 'Société Générale',
          'BPCE', 'La Banque Postale', 'Banque de France', 'Natixis',
        ],
        'Royaume-Uni': [
          'HSBC', 'Barclays', 'Lloyds Bank',
          'Standard Chartered', 'RBS', 'Santander UK', 'NatWest',
        ],
        'Espagne': [
          'Banco Santander', 'BBVA', 'CaixaBank',
          'Banco Bilbao', 'IberCaja', 'Sabadell',
        ],
        'Allemagne': [
          'Deutsche Bank', 'Commerzbank', 'KfW',
          'DZ Bank', 'WestLB', 'Bundesbank',
        ],
        'Grèce': [
          'Piraeus Bank', 'National Bank of Greece', 'Alpha Bank',
          'Eurobank', 'Attica Bank', 'TT Hellenic Bank',
        ],
        // ── Afrique ────────────────────────────────────────────
        'Maroc': [
          'Attijariwafa Bank', 'BMCE Bank', 'Crédit du Maroc',
          'Société Générale Maroc', 'CIH Bank', 'Banque Populaire du Maroc',
          'Banque Centrale Populaire', 'Bank of Africa', 'Crédit Agricole Maroc', 'Banque Centrale',
        ],
        'Afrique du Sud': [
          'Standard Bank', 'FirstRand', 'Absa Group',
          'Nedbank', 'Capitec Bank', 'South African Reserve Bank',
        ],
        'Nigeria': [
          'Zenith Bank', 'Access Bank', 'United Bank for Africa (UBA)',
          'First Bank of Nigeria', 'Guaranty Trust Bank', 'Central Bank of Nigeria',
        ],
        'Égypte': [
          'National Bank of Egypt', 'Banque Misr', 'Commercial International Bank (CIB)',
          'Banque Al-Ahli', 'Suez Canal Bank', 'Central Bank of Egypt',
        ],
        "Côte d'Ivoire": ['Société Ivoirienne de Banque'],
        'Tunisie':        ['Banque Internationale Arabe de Tunisie'],
        'Sénégal':        ['Ecobank Sénégal'],
        // ── Amériques ──────────────────────────────────────────
        'Etats-Unis': [
          'JPMorgan Chase', 'Bank of America', 'Citigroup',
          'Wells Fargo', 'Goldman Sachs', 'Morgan Stanley', 'Federal Reserve',
        ],
        'Canada': [
          'RBC Royal Bank', 'TD Bank', 'Scotiabank',
          'BMO', 'CIBC', 'National Bank of Canada', 'Bank of Canada',
        ],
        'Mexique': [
          'Banco Santander México', 'BBVA México', 'Scotiabank Inverlat',
          'Banco del Bajio', 'Banco Azteca', 'Bank of Mexico',
        ],
        'Brésil': [
          'Banco do Brasil', 'Itaú Unibanco', 'Banco Bradesco',
          'Caixa Econômica', 'Banco Santander Brasil', 'Central Bank of Brazil',
        ],
        // ── Asie ───────────────────────────────────────────────
        'Chine': [
          'ICBC', 'China Construction Bank (CCB)', 'Agricultural Bank of China (ABC)',
          'Bank of China', 'Bank of Communications', 'China Merchants Bank',
        ],
        'Japon': [
          'Bank of Tokyo-Mitsubishi UFJ', 'Sumitomo Mitsui Banking Corporation', 'Mizuho Financial Group',
          'Nomura Holdings', 'Japan Post Bank', 'Bank of Japan',
        ],
        'Singapour': [
          'DBS Bank', 'OCBC Bank', 'UOB',
          'Citibank', 'HSBC', 'Monetary Authority of Singapore',
        ],
        'Hong Kong': [
          'HSBC Hong Kong', 'Bank of China', 'Standard Chartered HK',
          'Hang Seng Bank', 'DBS Bank HK', 'Hong Kong Monetary Authority',
        ],
        // ── Moyen-Orient ───────────────────────────────────────
        'Arabie Saoudite': [
          'Saudi National Bank', 'Al Rajhi Bank', 'Riyad Bank',
          'SABB', 'Banque Saudi Fransi', 'Saudi Central Bank',
        ],
        'Emirats Arabes Unis': [
          'First Abu Dhabi Bank', 'Dubai Islamic Bank', 'ADIB',
          'Abu Dhabi Commercial Bank', 'Mashreq Bank', 'Central Bank of UAE',
        ],
        'Turquie': [
          'Ziraat Bankası', 'Halkbank', 'Garanti BBVA',
          'İşbank', 'Akbank', 'Central Bank of the Republic of Turkey',
        ],
      },
      mtiTypes: {
        '0100': 'Authorization Request',
        '0110': 'Authorization Response',
        '0200': 'Financial Request',
        '0210': 'Financial Response',
        '0420': 'Reversal',
        '0800': 'Network Management',
      },
    };
  }

  private getMockTransactions(): Transaction[] {
    return [
      {
        id: 1, externalId: 'TXN1', timestamp: new Date().toISOString(), mtiCode: '0100',
        amount: 150, currency: 'EUR', responseCode: '00', status: 'SUCCESS',
        latencyMs: 385, channel: 'ATM', zone: 'International'
      } as any,
      {
        id: 2, externalId: 'TXN2', timestamp: new Date().toISOString(), mtiCode: '0100',
        amount: 250, currency: 'EUR', responseCode: '05', status: 'TIMEOUT',
        latencyMs: 652, channel: 'POS', zone: 'International'
      } as any
    ];
  }

  private getMockAlerts(): AlertEvent[] {
    return [
      {
        id: 1, type: 'TIMEOUT', severity: 'critical' as const, title: 'High Timeout Rate',
        details: 'Aeroport ATM timeout rate > 4%', status: 'OPEN' as const, createdAt: new Date().toISOString()
      }
    ];
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.txEvents) this.txEvents.close();
    if (this.alertEvents) this.alertEvents.close();
    this.projectSub?.unsubscribe();
  }

  private connectSse(): void {
    this.txEvents = new EventSource(`${environment.apiBaseUrl}/stream/transactions`);
    this.txEvents.addEventListener('transaction-created', (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as Transaction;
      const activeProject = this.projectFilter.activeProject;

      if (activeProject) {
        const code = activeProject.trim().toUpperCase();
        const acq = (payload.acquirerBank || '').trim().toUpperCase();
        const iss = (payload.issuingBank  || (payload as any).issuing_bank || '').trim().toUpperCase();
        if (acq !== code && iss !== code) return;
        if (this.appState.isLive()) {
          this.allRawTransactions = [payload, ...this.allRawTransactions].slice(0, 500);
          this.applyClientFilters();
        }
      } else {
        this.txStore.addLive(payload, this.appState.isLive());
        if (this.appState.isLive()) {
          this.allRawTransactions = this.txStore.snapshot;
          this.applyClientFilters();
        }
      }
    });

    this.alertEvents = new EventSource(`${environment.apiBaseUrl}/stream/alerts`);
    this.alertEvents.addEventListener('alert-created', (event) => {
      if (!this.appState.isLive()) return;
      const payload = JSON.parse((event as MessageEvent).data) as AlertEvent;
      this.alerts = [payload, ...this.alerts];
    });
  }

  private calculateNetworkKpis() {
    let vp = 0, vr = 0, mp = 0, mr = 0;

    this.transactions.forEach(tx => {
      const rc = (tx.responseCode || '').toString().trim();
      const isDeclined = tx.status === 'DECLINED'
        || (rc && rc !== '00' && rc !== '000' && tx.status !== 'APPROVED');

      const network = resolveCardNetwork(tx);
      if (network === 'visa') {
        vp++; if (isDeclined) vr++;
      } else if (network === 'mastercard') {
        mp++; if (isDeclined) mr++;
      }
    });

    this.visaCount         = vp;
    this.visaRefusal       = vp > 0 ? parseFloat(((vr / vp) * 100).toFixed(2)) : 0;
    this.mastercardCount   = mp;
    this.mastercardRefusal = mp > 0 ? parseFloat(((mr / mp) * 100).toFixed(2)) : 0;
  }

  private calculatePosKpis() {
    // Filter POS transactions only
    const posTransactions = this.transactions.filter(tx => tx.channel === 'POS' || tx.terminalId);
    
    if (posTransactions.length === 0) {
      this.posActiveTerminals = 0;
      this.posConnectivity = 0;
      this.posTxCount = 0;
      this.posRefusalRate = 0;
      return;
    }

    // Count unique terminals
    const uniqueTerminals = new Set(posTransactions.map(tx => tx.terminalId).filter(tid => tid));
    this.posActiveTerminals = uniqueTerminals.size;

    // Count total POS transactions
    this.posTxCount = posTransactions.length;

    // Calculate connectivity: successful transactions / total terminals * 100
    const successfulTx = posTransactions.filter(tx => tx.status === 'APPROVED').length;
    this.posConnectivity = this.posActiveTerminals > 0 
      ? parseFloat(((successfulTx / this.posActiveTerminals) * 100).toFixed(2)) 
      : 0;

    // Calculate refusal rate
    const declinedTx = posTransactions.filter(tx => tx.status === 'DECLINED').length;
    this.posRefusalRate = this.posTxCount > 0 
      ? parseFloat(((declinedTx / this.posTxCount) * 100).toFixed(2)) 
      : 0;
  }

  private calculateEcomKpis() {
    // Filter ECOM transactions only (channel = ECOM or no terminal ID)
    const ecomTransactions = this.transactions.filter(tx => tx.channel === 'ECOM' || (!tx.terminalId && tx.channel !== 'POS'));
    
    if (ecomTransactions.length === 0) {
      this.ecomActiveSessions = 0;
      this.ecomAbandonmentRate = 0;
      this.ecom3dsSuccessRate = 0;
      this.ecomFraudRate = 0;
      return;
    }

    // Active sessions: Count unique IP addresses (simulated for now)
    const uniqueIps = new Set(ecomTransactions.map(tx => tx.ipAddress || tx.cardNumberMasked).filter(ip => ip));
    this.ecomActiveSessions = Math.max(uniqueIps.size, Math.ceil(ecomTransactions.length / 5));

    // Abandonment rate: Simulate as percentage of timeouts or pending transactions
    const abandonedTx = ecomTransactions.filter(tx => tx.status === 'TIMEOUT' || tx.status === 'PENDING').length;
    this.ecomAbandonmentRate = ecomTransactions.length > 0 
      ? parseFloat(((abandonedTx / ecomTransactions.length) * 100).toFixed(2)) 
      : 0;

    // 3D Secure Success Rate: Approved transactions with 3DS (simulated based on status)
    const successful3dsTx = ecomTransactions.filter(tx => tx.status === 'APPROVED' && tx.is3dsSuccess !== false).length;
    this.ecom3dsSuccessRate = ecomTransactions.length > 0 
      ? parseFloat(((successful3dsTx / ecomTransactions.length) * 100).toFixed(2)) 
      : 0;

    // Fraud Rate: Transactions flagged as fraud or blocked (FRAUD_BLOCKED status)
    const fraudTx = ecomTransactions.filter(tx => tx.status === 'FRAUD_BLOCKED' || (tx.fraudScore && tx.fraudScore > 75)).length;
    this.ecomFraudRate = ecomTransactions.length > 0 
      ? parseFloat(((fraudTx / ecomTransactions.length) * 100).toFixed(2)) 
      : 0;
  }

  // Alertes non résolues = uniquement celles du moteur live (singleton partagé avec la page Alertes).
  // Quand l'utilisateur résout une alerte dans la page Alertes, alertSvc.alerts se met à jour
  // automatiquement ici via le getter (pas de double comptage des alertes DB historiques).
  get alertsCount(): number {
    return this.alertSvc.alerts.filter(a => a.status === 'OPEN').length;
  }

  private updateKpis() {
    if (this.transactions.length === 0) {
      // Filtre actif ne retournant aucune transaction : les KPIs doivent
      // refleter cet etat vide, pas garder les valeurs du filtre precedent.
      this.avgLatency  = 0;
      this.successRate = 0;
      this.tps         = 0;
      this.uptime      = 0;
      return;
    }

    const s = this.statsService.compute(this.transactions);

    this.avgLatency  = s.avgLatency;
    this.successRate = s.approvalRate;
    this.tps         = s.tps;

    // UPTIME: % sans erreurs système (91=inopérant, 96=dysfonctionnement) sur les 24h récentes
    const H24 = 86_400_000;
    const now = Date.now();
    const base   = this.transactions.filter(tx => (now - new Date(tx.timestamp as string).getTime()) < H24);
    const baseTx = base.length > 0 ? base : this.transactions;
    const sysErr = baseTx.filter(tx => {
      const rc = (tx.responseCode || '').toString().trim();
      return rc === '91' || rc === '96' || rc === '091' || rc === '096';
    }).length;
    this.uptime = parseFloat(((1 - sysErr / baseTx.length) * 100).toFixed(2));

    // Feed the live alert engine  -  keeps Alertes page in sync with Dashboard transactions
    this.alertSvc.processBatch(this.transactions);
  }
}
