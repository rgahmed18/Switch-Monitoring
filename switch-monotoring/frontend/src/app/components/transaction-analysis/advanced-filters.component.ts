import { Component, Input, Output, EventEmitter, OnInit, OnChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TransactionStatsService } from '../../services/transaction-stats.service';

@Component({
  selector: 'app-advanced-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="af-wrapper">

      <!-- ── HEADER ─────────────────────────────────────────────────────────── -->
      <div class="af-header" (click)="isExpanded = !isExpanded">
        <div class="af-header-left">
          <span class="af-header-icon">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.553.894l-4 2A1 1 0 016 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd"/>
            </svg>
          </span>
          <span class="af-header-title">Filtres Avancés</span>
          <span *ngIf="activeFilterCount > 0" class="af-badge">{{ activeFilterCount }}</span>
        </div>
        <button class="af-collapse-btn" type="button" [attr.aria-expanded]="isExpanded">
          <svg class="af-chevron" [class.rotated]="isExpanded" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>

      <!-- ── FILTER BODY ──────────────────────────────────────────────────────── -->
      <div class="af-body" *ngIf="isExpanded">

        <!-- SECTION 1 : PÉRIODE ──────────────────────────────────────────────── -->
        <div class="af-section">
          <div class="af-section-label">
            <span class="af-dot dot-blue"></span>Période
          </div>
          <div class="af-section-grid period-grid">

            <div class="af-field">
              <label class="af-label">Date début</label>
              <div class="af-input-wrap">
                <svg class="af-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
                </svg>
                <input type="date" [(ngModel)]="filters.startDate" (change)="applyFilters()" class="af-input icon-input" title="Date de début">
              </div>
            </div>

            <div class="af-field">
              <label class="af-label">Date fin</label>
              <div class="af-input-wrap">
                <svg class="af-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
                </svg>
                <input type="date" [(ngModel)]="filters.endDate" (change)="applyFilters()" class="af-input icon-input" title="Date de fin">
              </div>
            </div>

            <div class="af-field">
              <label class="af-label">Heure début</label>
              <div class="af-input-wrap">
                <svg class="af-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
                </svg>
                <input type="time" [(ngModel)]="filters.startTime" (change)="applyFilters()" class="af-input icon-input" title="Heure de début">
              </div>
            </div>

            <div class="af-field">
              <label class="af-label">Heure fin</label>
              <div class="af-input-wrap">
                <svg class="af-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
                </svg>
                <input type="time" [(ngModel)]="filters.endTime" (change)="applyFilters()" class="af-input icon-input" title="Heure de fin">
              </div>
            </div>

          </div>
        </div>

        <!-- SECTION 2 : STATUT, CANAL, ACQUÉREUR ─────────────────────────────── -->
        <div class="af-section">
          <div class="af-section-label">
            <span class="af-dot dot-green"></span>Qualification
          </div>
          <div class="af-section-grid qual-grid">

            <div class="af-field">
              <label class="af-label">Statut</label>
              <div class="af-select-wrap">
                <select [(ngModel)]="filters.status" (change)="applyFilters()" class="af-select">
                  <option value="">Tous les statuts</option>
                  <option value="APPROVED">Approuvé</option>
                  <option value="DECLINED">Refusé</option>
                </select>
                <svg class="af-select-arrow" viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
              </div>
            </div>

            <div class="af-field">
              <label class="af-label">Canal</label>
              <div class="af-select-wrap">
                <select [(ngModel)]="filters.channel" (change)="applyFilters()" class="af-select">
                  <option value="">Tous les canaux</option>
                  <option value="GAB">GAB / ATM</option>
                  <option value="POS">POS</option>
                  <option value="ECOM">E-Commerce</option>
                </select>
                <svg class="af-select-arrow" viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
              </div>
            </div>

            <div class="af-field">
              <label class="af-label">Acquéreur</label>
              <div class="af-select-wrap">
                <select [(ngModel)]="filters.acquirer" (change)="applyFilters()" class="af-select">
                  <option value="">Tous les acquéreurs</option>
                  <option *ngFor="let acq of uniqueAcquirers" [value]="acq">{{ acq }}</option>
                </select>
                <svg class="af-select-arrow" viewBox="0 0 20 20" fill="currentColor" width="12" height="12">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
              </div>
            </div>

          </div>
        </div>

        <!-- SECTION 3 : MONTANTS ─────────────────────────────────────────────── -->
        <div class="af-section">
          <div class="af-section-label">
            <span class="af-dot dot-orange"></span>Montant
          </div>
          <div class="af-section-grid amount-grid">

            <div class="af-field">
              <label class="af-label">
                Montant min
                <span class="af-amount-val">{{ filters.minAmount | number }}</span>
              </label>
              <div class="af-range-wrap">
                <span class="af-range-bound">0</span>
                <input type="range" min="0" [max]="maxAmountSlider"
                       [(ngModel)]="filters.minAmount" (input)="onMinAmountChange()"
                       class="af-range" [style.--pct]="minPct + '%'">
                <span class="af-range-bound">{{ maxAmountSlider | number }}</span>
              </div>
            </div>

            <div class="af-field">
              <label class="af-label">
                Montant max
                <span class="af-amount-val">{{ filters.maxAmount | number }}</span>
              </label>
              <div class="af-range-wrap">
                <span class="af-range-bound">0</span>
                <input type="range" min="0" [max]="maxAmountSlider"
                       [(ngModel)]="filters.maxAmount" (input)="onMaxAmountChange()"
                       class="af-range" [style.--pct]="maxPct + '%'">
                <span class="af-range-bound">{{ maxAmountSlider | number }}</span>
              </div>
            </div>

          </div>
        </div>

        <!-- SECTION 4 : RECHERCHE ───────────────────────────────────────────── -->
        <div class="af-section">
          <div class="af-section-label">
            <span class="af-dot dot-purple"></span>Recherche
          </div>
          <div class="af-search-wrap">
            <svg class="af-search-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
            </svg>
            <input type="text" [(ngModel)]="filters.searchText" (keyup)="applyFilters()"
                   placeholder="Rechercher par STAN, PAN, référence…"
                   class="af-search-input">
            <button *ngIf="filters.searchText" (click)="filters.searchText=''; applyFilters()" class="af-search-clear" type="button">×</button>
          </div>
        </div>

        <!-- FOOTER : ACTIONS ───────────────────────────────────────────────── -->
        <div class="af-footer">
          <button class="af-btn-reset" type="button" (click)="resetFilters()">
            <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
              <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
            </svg>
            Réinitialiser
          </button>
          <button class="af-btn-apply" type="button" (click)="applyFilters()">
            <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
              <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.553.894l-4 2A1 1 0 016 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd"/>
            </svg>
            Appliquer
          </button>
        </div>

      </div>

      <!-- ── STATS RAPIDES ────────────────────────────────────────────────────── -->
      <div class="af-stats">
        <div class="af-stat">
          <span class="af-stat-label">Total</span>
          <span class="af-stat-value">{{ (filteredTransactions ?? transactions)?.length || 0 }}</span>
        </div>
        <div class="af-stat-divider"></div>
        <div class="af-stat">
          <span class="af-stat-label">Approuvées</span>
          <span class="af-stat-value approved">{{ approvedCount }}</span>
        </div>
        <div class="af-stat-divider"></div>
        <div class="af-stat">
          <span class="af-stat-label">Refusées</span>
          <span class="af-stat-value declined">{{ declinedCount }}</span>
        </div>
        <div class="af-stat-divider"></div>
        <div class="af-stat">
          <span class="af-stat-label">Volume</span>
          <span class="af-stat-value">{{ totalAmount | number:'1.0-0' }} MAD</span>
        </div>
        <div class="af-stat-divider"></div>
        <div class="af-stat">
          <span class="af-stat-label">Taux approbation</span>
          <span class="af-stat-value"
                [class.approved]="approvalRate >= 90"
                [class.warn]="approvalRate >= 70 && approvalRate < 90"
                [class.declined]="approvalRate < 70">
            {{ approvalRate }}%
          </span>
        </div>
      </div>

    </div>
  `,
  styles: [`
    /* ═══════════════════════════════════════════════════════════════════════════
       ADVANCED FILTERS — PROFESSIONAL DESIGN
       ═══════════════════════════════════════════════════════════════════════════ */

    .af-wrapper {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(0,0,0,.06);
    }

    /* ── Header ──────────────────────────────────────────────────────────────── */
    .af-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 20px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      cursor: pointer;
      user-select: none;
      transition: background .15s;
    }
    .af-header:hover { background: #f1f5f9; }

    .af-header-left {
      display: flex;
      align-items: center;
      gap: 9px;
    }
    .af-header-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: #eff6ff;
      border-radius: 7px;
      color: #2563eb;
      flex-shrink: 0;
    }
    .af-header-title {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
      letter-spacing: .2px;
    }
    .af-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 5px;
      background: #2563eb;
      color: #fff;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
    }
    .af-collapse-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      color: #64748b;
      display: flex;
      align-items: center;
    }
    .af-chevron {
      transition: transform .25s ease;
    }
    .af-chevron.rotated { transform: rotate(180deg); }

    /* ── Body ────────────────────────────────────────────────────────────────── */
    .af-body {
      padding: 0;
    }

    /* ── Section ─────────────────────────────────────────────────────────────── */
    .af-section {
      padding: 16px 20px;
      border-bottom: 1px solid #f1f5f9;
    }
    .af-section:last-of-type { border-bottom: none; }

    .af-section-label {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: .08em;
      margin-bottom: 12px;
    }
    .af-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .dot-blue   { background: #3b82f6; box-shadow: 0 0 5px rgba(59,130,246,.45); }
    .dot-green  { background: #22c55e; box-shadow: 0 0 5px rgba(34,197,94,.45);  }
    .dot-orange { background: #f97316; box-shadow: 0 0 5px rgba(249,115,22,.45); }
    .dot-purple { background: #8b5cf6; box-shadow: 0 0 5px rgba(139,92,246,.45); }

    /* ── Section grids ───────────────────────────────────────────────────────── */
    .af-section-grid { display: grid; gap: 12px; }
    .period-grid { grid-template-columns: repeat(4, 1fr); }
    .qual-grid   { grid-template-columns: repeat(3, 1fr); }
    .amount-grid { grid-template-columns: repeat(2, 1fr); }

    @media (max-width: 1100px) {
      .period-grid { grid-template-columns: repeat(2, 1fr); }
      .qual-grid   { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 640px) {
      .period-grid,
      .qual-grid,
      .amount-grid { grid-template-columns: 1fr; }
      .af-section  { padding: 14px 16px; }
    }

    /* ── Field ───────────────────────────────────────────────────────────────── */
    .af-field { display: flex; flex-direction: column; gap: 5px; }

    .af-label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: .07em;
    }
    .af-amount-val {
      font-size: 12px;
      font-weight: 700;
      color: #2563eb;
      text-transform: none;
      letter-spacing: 0;
    }

    /* ── Input with icon ─────────────────────────────────────────────────────── */
    .af-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .af-icon {
      position: absolute;
      left: 10px;
      width: 14px;
      height: 14px;
      color: #94a3b8;
      pointer-events: none;
      flex-shrink: 0;
    }
    .af-input {
      width: 100%;
      height: 38px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
      color: #1e293b;
      font-size: 13px;
      font-weight: 500;
      padding: 0 10px;
      outline: none;
      transition: border-color .2s, box-shadow .2s, background .2s;
    }
    .af-input.icon-input { padding-left: 32px; }
    .af-input:focus {
      border-color: #2563eb;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(37,99,235,.10);
    }
    .af-input::-webkit-calendar-picker-indicator { opacity: .5; cursor: pointer; }

    /* ── Select ──────────────────────────────────────────────────────────────── */
    .af-select-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .af-select {
      width: 100%;
      height: 38px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
      color: #1e293b;
      font-size: 13px;
      font-weight: 500;
      padding: 0 32px 0 12px;
      appearance: none;
      -webkit-appearance: none;
      outline: none;
      cursor: pointer;
      transition: border-color .2s, box-shadow .2s, background .2s;
    }
    .af-select:focus {
      border-color: #2563eb;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(37,99,235,.10);
    }
    .af-select-arrow {
      position: absolute;
      right: 11px;
      color: #94a3b8;
      pointer-events: none;
      flex-shrink: 0;
    }

    /* ── Range slider ────────────────────────────────────────────────────────── */
    .af-range-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .af-range-bound {
      font-size: 10px;
      color: #94a3b8;
      font-weight: 600;
      white-space: nowrap;
      min-width: 34px;
    }
    .af-range-bound:last-child { text-align: right; }

    .af-range {
      flex: 1;
      height: 4px;
      border-radius: 2px;
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      background: linear-gradient(to right, #2563eb 0%, #2563eb var(--pct, 50%), #e2e8f0 var(--pct, 50%), #e2e8f0 100%);
      cursor: pointer;
    }
    .af-range::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      background: #2563eb;
      border-radius: 50%;
      border: 2px solid #fff;
      box-shadow: 0 1px 4px rgba(37,99,235,.35);
      cursor: pointer;
      transition: transform .15s, box-shadow .15s;
    }
    .af-range::-webkit-slider-thumb:hover {
      transform: scale(1.2);
      box-shadow: 0 2px 8px rgba(37,99,235,.45);
    }
    .af-range::-moz-range-thumb {
      width: 16px;
      height: 16px;
      background: #2563eb;
      border-radius: 50%;
      border: 2px solid #fff;
      box-shadow: 0 1px 4px rgba(37,99,235,.35);
      cursor: pointer;
    }

    /* ── Search ──────────────────────────────────────────────────────────────── */
    .af-search-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .af-search-icon {
      position: absolute;
      left: 11px;
      width: 15px;
      height: 15px;
      color: #94a3b8;
      pointer-events: none;
    }
    .af-search-input {
      width: 100%;
      height: 40px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
      color: #1e293b;
      font-size: 13px;
      padding: 0 36px 0 36px;
      outline: none;
      transition: border-color .2s, box-shadow .2s, background .2s;
    }
    .af-search-input::placeholder { color: #94a3b8; }
    .af-search-input:focus {
      border-color: #2563eb;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(37,99,235,.10);
    }
    .af-search-clear {
      position: absolute;
      right: 10px;
      background: #e2e8f0;
      border: none;
      border-radius: 50%;
      width: 18px;
      height: 18px;
      font-size: 13px;
      line-height: 1;
      color: #64748b;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background .15s;
    }
    .af-search-clear:hover { background: #cbd5e1; color: #1e293b; }

    /* ── Footer ──────────────────────────────────────────────────────────────── */
    .af-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 20px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }

    .af-btn-reset, .af-btn-apply {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all .2s;
      border: 1px solid transparent;
    }
    .af-btn-reset {
      background: #ffffff;
      color: #64748b;
      border-color: #e2e8f0;
    }
    .af-btn-reset:hover {
      background: #f1f5f9;
      color: #1e293b;
      border-color: #cbd5e1;
    }
    .af-btn-apply {
      background: #2563eb;
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(37,99,235,.25);
    }
    .af-btn-apply:hover {
      background: #1d4ed8;
      box-shadow: 0 4px 12px rgba(37,99,235,.35);
      transform: translateY(-1px);
    }

    /* ── Stats ───────────────────────────────────────────────────────────────── */
    .af-stats {
      display: flex;
      align-items: center;
      gap: 0;
      padding: 14px 20px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 0;
    }
    .af-stat {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 8px 18px;
      flex: 1;
      min-width: 100px;
    }
    .af-stat-divider {
      width: 1px;
      height: 36px;
      background: #e2e8f0;
      flex-shrink: 0;
    }
    .af-stat-label {
      font-size: 10px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: .07em;
    }
    .af-stat-value {
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
      letter-spacing: -.5px;
    }
    .af-stat-value.approved { color: #16a34a; }
    .af-stat-value.declined { color: #dc2626; }
    .af-stat-value.warn     { color: #d97706; }

    @media (max-width: 768px) {
      .af-stats { gap: 8px; }
      .af-stat-divider { display: none; }
      .af-stat { padding: 6px 12px; min-width: 80px; }
      .af-stat-value { font-size: 16px; }
    }
  `]
})
export class AdvancedFiltersComponent implements OnInit, OnChanges {
  // Jeu de donnees COMPLET (non filtre) : sert uniquement a peupler la liste
  // des acquereurs et la borne max du slider de montant, pour que l'utilisateur
  // puisse toujours choisir un filtre meme apres en avoir deja applique un autre.
  @Input() transactions: any[] = [];
  // Resultat du filtrage applique par le parent : sert de base aux 5 statistiques
  // rapides affichees (Total/Approuvees/Refusees/Volume/Taux). Sans cet input,
  // ces stats resteraient figees sur le total non filtre quel que soit le filtre.
  @Input() filteredTransactions: any[] | null = null;
  @Output() onFiltersChange = new EventEmitter<any>();

  private readonly statsService = inject(TransactionStatsService);

  isExpanded = true;
  uniqueAcquirers: string[] = [];
  maxAmountSlider = 20000000;

  filters = {
    startDate:  '',
    endDate:    '',
    startTime:  '',
    endTime:    '',
    status:     '',
    channel:    '',
    acquirer:   '',
    minAmount:  0,
    maxAmount:  20000000,
    searchText: ''
  };

  approvedCount  = 0;
  declinedCount  = 0;
  totalAmount    = 0;
  approvalRate   = 0;

  get minPct(): number {
    return this.maxAmountSlider > 0
      ? Math.round((this.filters.minAmount / this.maxAmountSlider) * 100)
      : 0;
  }
  get maxPct(): number {
    return this.maxAmountSlider > 0
      ? Math.round((this.filters.maxAmount / this.maxAmountSlider) * 100)
      : 100;
  }

  get activeFilterCount(): number {
    let n = 0;
    if (this.filters.startDate)  n++;
    if (this.filters.endDate)    n++;
    if (this.filters.startTime)  n++;
    if (this.filters.endTime)    n++;
    if (this.filters.status)     n++;
    if (this.filters.channel)    n++;
    if (this.filters.acquirer)   n++;
    if (this.filters.minAmount > 0) n++;
    if (this.filters.maxAmount < this.maxAmountSlider) n++;
    if (this.filters.searchText) n++;
    return n;
  }

  ngOnInit() {
    this.extractUniqueValues();
    this.calculateStats();
  }

  ngOnChanges() {
    this.extractUniqueValues();
    this.calculateStats();
  }

  extractUniqueValues() {
    const txs = this.transactions || [];

    this.uniqueAcquirers = [...new Set(
      txs.map(t => (t.acquirerBank || t.acquirer || '').trim()).filter(Boolean)
    )].sort();

    const dataMax = txs.reduce((m, t) => Math.max(m, t.transactionAmount || t.amount || 0), 0);
    const newMax  = Math.max(20000000, Math.ceil(dataMax / 1000) * 1000);
    if (newMax !== this.maxAmountSlider) {
      if (this.filters.maxAmount >= this.maxAmountSlider) this.filters.maxAmount = newMax;
      this.maxAmountSlider = newMax;
    }
  }

  calculateStats() {
    // Les stats rapides refletent le resultat FILTRE (si fourni par le parent),
    // pas le total brut, sinon elles resteraient toujours identiques quel que
    // soit le filtre applique par l'utilisateur.
    const source = this.filteredTransactions ?? this.transactions ?? [];
    const s = this.statsService.compute(source);
    this.approvedCount = s.approved;
    this.declinedCount = s.declined;
    this.totalAmount   = s.totalVolume;
    const total = s.approved + s.declined;
    this.approvalRate  = total > 0 ? Math.round((s.approved / total) * 100) : 0;
  }

  onMinAmountChange() {
    // Ne pas dépasser maxAmount
    if (this.filters.minAmount > this.filters.maxAmount) {
      this.filters.minAmount = this.filters.maxAmount;
    }
    this.applyFilters();
  }

  onMaxAmountChange() {
    // Ne pas descendre sous minAmount
    if (this.filters.maxAmount < this.filters.minAmount) {
      this.filters.maxAmount = this.filters.minAmount;
    }
    this.applyFilters();
  }

  applyFilters() {
    this.onFiltersChange.emit({ ...this.filters, sliderMax: this.maxAmountSlider });
    this.calculateStats();
  }

  resetFilters() {
    this.filters = {
      startDate:  '',
      endDate:    '',
      startTime:  '',
      endTime:    '',
      status:     '',
      channel:    '',
      acquirer:   '',
      minAmount:  0,
      maxAmount:  20000000,
      searchText: ''
    };
    this.applyFilters();
  }
}
