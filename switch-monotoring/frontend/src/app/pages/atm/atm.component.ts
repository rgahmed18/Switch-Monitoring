import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../api.service';
import { ProjectFilterService } from '../../services/project-filter.service';
import { Transaction } from '../../models';

@Component({
  selector: 'app-atm',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
  ],
  template: `
    <div class="w-full">

      <div class="border-b border-border/40 bg-card -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mb-5 lg:mb-6">
        <h1 class="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">ATM / GAB</h1>
        <p class="mt-1 text-sm text-muted-foreground">Canal GAB  -  Transactions Guichet Automatique</p>
      </div>

      <div class="space-y-5 lg:space-y-6">

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          <div class="bg-card rounded-lg border border-border/40 p-5 shadow-sm">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-semibold text-muted-foreground mb-1">Transactions GAB</p>
                <p class="text-2xl font-bold text-foreground">{{ kpi.totalGab }}</p>
              </div>
              <lucide-icon name="trending-up" class="w-6 h-6 text-blue-500"></lucide-icon>
            </div>
            <p class="text-xs text-muted-foreground mt-2">{{ kpi.gabShare }}% du trafic total</p>
          </div>

          <div class="bg-card rounded-lg border border-border/40 p-5 shadow-sm">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-semibold text-muted-foreground mb-1">Volume Cash-out</p>
                <p class="text-2xl font-bold text-green-500">
                  {{ kpi.cashOutVolume | number:'1.0-0' }}
                </p>
              </div>
              <lucide-icon name="dollar-sign" class="w-6 h-6 text-green-500"></lucide-icon>
            </div>
            <p class="text-xs text-muted-foreground mt-2">Somme des retraits (devise locale)</p>
          </div>

<div class="bg-card rounded-lg border border-border/40 p-5 shadow-sm">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-semibold text-muted-foreground mb-1">Taux de Succès</p>
                <p class="text-2xl font-bold text-blue-500">{{ kpi.successRate }}%</p>
              </div>
              <lucide-icon name="check-circle" class="w-6 h-6 text-blue-500"></lucide-icon>
            </div>
            <p class="text-xs text-muted-foreground mt-2">Transactions approuvées (actionCode 000)</p>
          </div>

          <div class="bg-card rounded-lg border border-border/40 p-5 shadow-sm">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-semibold text-muted-foreground mb-1">Taux de Refus</p>
                <p class="text-2xl font-bold"
                   [class.text-red-500]="kpi.declineRate > 20"
                   [class.text-blue-500]="kpi.declineRate > 10 && kpi.declineRate <= 20"
                   [class.text-green-500]="kpi.declineRate <= 10">
                  {{ kpi.declineRate }}%
                </p>
              </div>
              <lucide-icon name="alert-triangle" class="w-6 h-6 text-red-500"></lucide-icon>
            </div>
            <p class="text-xs text-muted-foreground mt-2">{{ declinedGab.length }} transactions refusées</p>
          </div>

        </div>

<!-- Transactions Approuvées GAB -->
        <div class="bg-card rounded-xl border border-border/40 p-6 shadow-md">
          <div class="mb-6">
            <h2 class="text-xl font-bold text-foreground">
              Transactions Approuvées - Canal GAB
              <span *ngIf="projectLabel" class="ml-2 text-sm font-semibold px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 border border-green-500/20">{{ projectLabel }}</span>
            </h2>
            <p class="text-sm text-muted-foreground mt-1">
              {{ approvedGab.length }} transactions autorisées identifiées
            </p>
          </div>
          <div class="overflow-auto max-h-[400px]">
            <table class="w-full text-sm">
              <thead class="sticky top-0 z-10 bg-card">
                <tr class="border-b-2 border-border/40 bg-muted/30">
                  <th class="text-left py-3 px-4 font-semibold text-foreground">Terminal</th>
                  <th class="text-left py-3 px-4 font-semibold text-foreground">Référence</th>
                  <th class="text-left py-3 px-4 font-semibold text-foreground">PAN</th>
                  <th class="text-right py-3 px-4 font-semibold text-foreground">Montant</th>
                  <th class="text-left py-3 px-4 font-semibold text-foreground">MTI</th>
                  <th class="text-left py-3 px-4 font-semibold text-foreground">Code Réponse</th>
                  <th class="text-left py-3 px-4 font-semibold text-foreground">Banque Émettrice</th>
                  <th class="text-left py-3 px-4 font-semibold text-foreground">Statut</th>
                  <th class="text-left py-3 px-4 font-semibold text-foreground">Heure</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let tx of approvedGab"
                    class="border-b border-border/20 hover:bg-green-500/5 transition">
                  <td class="py-3 px-4 font-mono text-xs text-foreground font-semibold">
                    {{ tx.cardAcceptorTermId || tx.terminalId || tx.cardAcceptorId || '-' }}
                  </td>
                  <td class="py-3 px-4 font-mono text-xs text-muted-foreground">
                    {{ tx.referenceNumber || tx.externalId || '-' }}
                  </td>
                  <td class="py-3 px-4 font-mono text-xs text-muted-foreground">
                    {{ tx.cardNumber || tx.cardNumberMasked || '-' }}
                  </td>
                  <td class="py-3 px-4 text-right font-mono font-semibold text-green-500">
                    {{ (tx.transactionAmount ?? tx.amount ?? 0) | number:'1.2-2' }}
                    {{ tx.transactionCurrency || tx.currency || '' }}
                  </td>
                  <td class="py-3 px-4">
                    <span class="font-mono text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-400">
                      {{ tx.mtiCode || '-' }}
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <span class="font-mono text-xs px-2 py-1 rounded bg-green-500/10 text-green-600">
                      {{ tx.responseCode || tx.actionCode || '00' }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-xs text-muted-foreground">
                    {{ tx.issuingBank || tx.issuerBankCode || '-' }}
                  </td>
                  <td class="py-3 px-4">
                    <span class="text-xs font-semibold px-2 py-1 rounded bg-green-500/10 text-green-600">
                      {{ tx.status }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-xs text-muted-foreground">
                    {{ (tx.transmissionDateAndTime || tx.timestamp) | date:'HH:mm:ss' }}
                  </td>
                </tr>
                <tr *ngIf="approvedGab.length === 0">
                  <td colspan="9" class="py-8 text-center text-sm text-muted-foreground">
                    Aucune transaction GAB approuvée sur la période
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="bg-card rounded-xl border border-border/40 p-6 shadow-md">
          <div class="mb-6">
            <h2 class="text-xl font-bold text-foreground">
              Transactions Déclinées - Canal GAB
              <span *ngIf="projectLabel" class="ml-2 text-sm font-semibold px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">{{ projectLabel }}</span>
            </h2>
            <p class="text-sm text-muted-foreground mt-1">
              {{ declinedGab.length }} transactions refusées identifiées
            </p>
          </div>
          <div class="overflow-auto max-h-[400px]">
            <table class="w-full text-sm">
              <thead class="sticky top-0 z-10 bg-card">
              <tr class="border-b-2 border-border/40 bg-muted/30">
                <th class="text-left py-3 px-4 font-semibold text-foreground">Terminal</th>
                <th class="text-left py-3 px-4 font-semibold text-foreground">Référence</th>
                <th class="text-right py-3 px-4 font-semibold text-foreground">Montant</th>
                <th class="text-left py-3 px-4 font-semibold text-foreground">Heure</th>
              </tr>
              </thead>
              <tbody>
              <tr *ngFor="let tx of declinedGab"
                  class="border-b border-border/20 hover:bg-destructive/5 transition">
                <td class="py-3 px-4 font-mono text-xs text-foreground">
                  {{ tx.cardAcceptorTermId || tx.terminalId || tx.cardAcceptorId || '-' }}
                </td>
                <td class="py-3 px-4 font-mono text-xs text-muted-foreground">
                  {{ tx.referenceNumber || tx.externalId || '-' }}
                </td>
                <td class="py-3 px-4 text-right font-mono font-semibold text-destructive">
                  {{ (tx.transactionAmount || tx.amount || 0) | number:'1.2-2' }}
                  {{ tx.transactionCurrency || tx.currency || '' }}
                </td>
                <td class="py-3 px-4 text-xs text-muted-foreground">
                  {{ (tx.timestamp || tx.transmissionDateAndTime) | date:'HH:mm:ss' }}
                </td>
              </tr>
              <tr *ngIf="declinedGab.length === 0">
                <td colspan="4" class="py-8 text-center text-sm text-muted-foreground">
                  Aucune transaction GAB déclinée sur la période
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class AtmComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  get projectLabel(): string { return this.projectFilter.activeProjectName; }

  transactions: Transaction[] = [];
  approvedGab: Transaction[] = [];
  declinedGab: Transaction[] = [];
  kpi = {
    totalGab: 0, gabShare: 0, cashOutVolume: 0, successRate: 0, declineRate: 0
  };

  constructor(
    private readonly apiService: ApiService,
    private readonly projectFilter: ProjectFilterService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData(): void {
    this.projectFilter.activeProject$.pipe(
      switchMap(() => this.apiService.getTransactions(2000)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.transactions = data || [];
        this.calculateMetrics();
      },
      error: () => {
        this.resetKpis();
      }
    });
  }

  private calculateMetrics(): void {
    const gabTx = this.transactions.filter(tx => tx.channel === 'GAB' || tx.channel === 'ATM');
    if (gabTx.length === 0) {
      this.resetKpis();
      return;
    }

    const total = gabTx.length;
    const nonReversals = gabTx.filter(tx => tx.functionCode !== '400' && tx.reversalFlag !== 'Y');
    const nonRevTotal = nonReversals.length || 1;
    const approved = nonReversals.filter(tx => tx.status === 'APPROVED').length;
    const declined = nonReversals.filter(tx => tx.status === 'DECLINED').length;

    this.kpi.totalGab = total;
    this.kpi.gabShare = Math.round((total / this.transactions.length) * 100);
    this.kpi.successRate = Math.round((approved / nonRevTotal) * 100);
    this.kpi.declineRate = Math.round((declined / nonRevTotal) * 100);
    this.kpi.cashOutVolume = gabTx.reduce((sum, tx) => sum + (tx.transactionAmount ?? 0), 0);

    this.approvedGab = gabTx
        .filter(tx => tx.status === 'APPROVED')
        .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
        .slice(0, 50);

    this.declinedGab = gabTx.filter(tx => tx.status === 'DECLINED')
        .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
        .slice(0, 50);
  }

  resetKpis(): void {
    this.kpi = { totalGab: 0, gabShare: 0, cashOutVolume: 0, successRate: 0, declineRate: 0 };
    this.approvedGab = [];
    this.declinedGab = [];
  }
}
