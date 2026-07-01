import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../api.service';
import { ProjectFilterService } from '../../services/project-filter.service';
import { Transaction } from '../../models';

interface EcomKpi {
  total: number;
  ecomShare: number;
  totalVolume: number;
  avgAmount: number;
  successRate: number;
  declineRate: number;
  fraudRate: number;
  threeDsRate: number;
}

interface MerchantRow {
  merchantId: string;
  merchantName: string;
  total: number;
  approved: number;
  declined: number;
  declineRate: number;
  volume: number;
}


@Component({
  selector: 'app-ecom',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="w-full">

      <div class="border-b border-border/40 bg-card -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mb-5 lg:mb-6">
        <h1 class="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">Transactions en Ligne</h1>
        <p class="mt-1 text-sm text-muted-foreground">Canal E-Commerce  -  Transactions ECOM</p>
      </div>

      <div class="space-y-5 lg:space-y-6">

        <!-- KPIs -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div class="bg-card rounded-lg border border-border/40 p-5 shadow-sm">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-semibold text-muted-foreground mb-1">Transactions ECOM</p>
                <p class="text-2xl font-bold text-foreground">{{ kpi.total }}</p>
              </div>
              <lucide-icon name="shopping-cart" class="w-6 h-6 text-purple-500"></lucide-icon>
            </div>
            <p class="text-xs text-muted-foreground mt-2">{{ kpi.ecomShare }}% du trafic total</p>
          </div>

          <div class="bg-card rounded-lg border border-border/40 p-5 shadow-sm">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-semibold text-muted-foreground mb-1">Volume Total ECOM</p>
                <p class="text-2xl font-bold text-green-500">{{ kpi.totalVolume | number:'1.0-0' }}</p>
              </div>
              <lucide-icon name="trending-up" class="w-6 h-6 text-green-500"></lucide-icon>
            </div>
            <p class="text-xs text-muted-foreground mt-2">Moy. {{ kpi.avgAmount | number:'1.0-0' }} / transaction</p>
          </div>

          <div class="bg-card rounded-lg border border-border/40 p-5 shadow-sm">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-semibold text-muted-foreground mb-1">Taux de Succès</p>
                <p class="text-2xl font-bold text-blue-500">{{ kpi.successRate }}%</p>
              </div>
              <lucide-icon name="check-circle" class="w-6 h-6 text-blue-500"></lucide-icon>
            </div>
            <p class="text-xs text-muted-foreground mt-2">Refus: {{ kpi.declineRate }}%</p>
          </div>


        </div>

        <!-- Transactions Approuvées ECOM -->
        <div class="bg-card rounded-xl border border-border/40 p-6 shadow-md">
          <div class="mb-6">
            <h2 class="text-xl font-bold text-foreground">
              Transactions Approuvées - Canal ECOM
              <span *ngIf="projectLabel" class="ml-2 text-sm font-semibold px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 border border-green-500/20">{{ projectLabel }}</span>
            </h2>
            <p class="text-sm text-muted-foreground mt-1">
              {{ approvedEcom.length }} transactions autorisées identifiées
            </p>
          </div>
          <div class="overflow-auto max-h-[400px]">
            <table class="w-full text-sm">
              <thead class="sticky top-0 z-10 bg-card">
                <tr class="border-b-2 border-border/40 bg-muted/30">
                  <th class="text-left py-3 px-4 font-semibold text-foreground">Référence</th>
                  <th class="text-left py-3 px-4 font-semibold text-foreground">Marchand</th>
                  <th class="text-right py-3 px-4 font-semibold text-foreground">Montant</th>
                  <th class="text-left py-3 px-4 font-semibold text-foreground">Code Réponse</th>
                  <th class="text-left py-3 px-4 font-semibold text-foreground">Statut</th>
                  <th class="text-left py-3 px-4 font-semibold text-foreground">Heure</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let tx of approvedEcom"
                    class="border-b border-border/20 hover:bg-green-500/5 transition">
                  <td class="py-3 px-4 font-mono text-xs text-muted-foreground">
                    {{ tx.referenceNumber || tx.externalId || '-' }}
                  </td>
                  <td class="py-3 px-4 font-semibold text-xs text-foreground">
                    {{ tx.cardAccNameAddress || tx.merchantName || tx.cardAcceptorId || '-' }}
                  </td>
                  <td class="py-3 px-4 text-right font-mono font-semibold text-green-500">
                    {{ (tx.transactionAmount ?? tx.amount ?? 0) | number:'1.2-2' }}
                    {{ tx.transactionCurrency || tx.currency || '' }}
                  </td>
                  <td class="py-3 px-4">
                    <span class="font-mono text-xs px-2 py-1 rounded bg-green-500/10 text-green-600">
                      {{ tx.responseCode || tx.actionCode || '00' }}
                    </span>
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
                <tr *ngIf="approvedEcom.length === 0">
                  <td colspan="6" class="py-8 text-center text-sm text-muted-foreground">
                    Aucune transaction ECOM approuvée sur la période
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Transactions Déclinées ECOM -->
        <div class="bg-card rounded-xl border border-border/40 p-6 shadow-md">
          <div class="mb-6">
            <h2 class="text-xl font-bold text-foreground">
              Transactions Déclinées - Canal ECOM
              <span *ngIf="projectLabel" class="ml-2 text-sm font-semibold px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">{{ projectLabel }}</span>
            </h2>
            <p class="text-sm text-muted-foreground mt-1">
              {{ declinedEcom.length }} transactions refusées identifiées
            </p>
          </div>
          <div class="overflow-auto max-h-[400px]">
            <table class="w-full text-sm">
              <thead class="sticky top-0 z-10 bg-card">
                <tr class="border-b-2 border-border/40 bg-muted/30">
                  <th class="text-left py-3 px-4 font-semibold text-foreground">Référence</th>
                  <th class="text-left py-3 px-4 font-semibold text-foreground">Marchand</th>
                  <th class="text-right py-3 px-4 font-semibold text-foreground">Montant</th>
                  <th class="text-left py-3 px-4 font-semibold text-foreground">Code Action</th>
                  <th class="text-left py-3 px-4 font-semibold text-foreground">Statut</th>
                  <th class="text-left py-3 px-4 font-semibold text-foreground">Heure</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let tx of declinedEcom"
                    class="border-b border-border/20 hover:bg-destructive/5 transition">
                  <td class="py-3 px-4 font-mono text-xs text-muted-foreground">
                    {{ tx.referenceNumber || tx.externalId || '-' }}
                  </td>
                  <td class="py-3 px-4 font-semibold text-xs text-foreground">
                    {{ tx.cardAccNameAddress || tx.merchantName || tx.cardAcceptorId || '-' }}
                  </td>
                  <td class="py-3 px-4 text-right font-mono font-semibold text-destructive">
                    {{ (tx.transactionAmount ?? tx.amount ?? 0) | number:'1.2-2' }}
                    {{ tx.transactionCurrency || tx.currency || '' }}
                  </td>
                  <td class="py-3 px-4">
                    <span class="font-mono text-xs px-2 py-1 rounded bg-red-500/10 text-red-600">
                      {{ tx.responseCode || tx.actionCode || '-' }}
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <span class="text-xs font-semibold px-2 py-1 rounded"
                          [ngClass]="tx.status === 'FRAUD_BLOCKED' ? 'bg-red-500/10 text-red-600' : 'bg-blue-500/10 text-blue-600'">
                      {{ tx.status }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-xs text-muted-foreground">
                    {{ (tx.transmissionDateAndTime || tx.timestamp) | date:'HH:mm:ss' }}
                  </td>
                </tr>
                <tr *ngIf="declinedEcom.length === 0">
                  <td colspan="6" class="py-8 text-center text-sm text-muted-foreground">
                    Aucune transaction ECOM déclinée sur la période
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Performance Marchands En Ligne -->
        <div class="bg-card rounded-xl border border-border/40 p-6 shadow-md">
          <div class="mb-6">
            <h2 class="text-xl font-bold text-foreground">
              Performance par Marchand En Ligne
              <span *ngIf="projectLabel" class="ml-2 text-sm font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">{{ projectLabel }}</span>
            </h2>
            <p class="text-sm text-muted-foreground mt-1">Top 20 marchands par volume de transactions ECOM</p>
          </div>
          <div class="overflow-auto max-h-[400px]">
            <table class="w-full text-sm">
              <thead class="sticky top-0 z-10 bg-card">
                <tr class="border-b-2 border-border/40 bg-muted/30">
                  <th class="text-left py-3 px-4 font-semibold text-foreground">ID Marchand</th>
                  <th class="text-left py-3 px-4 font-semibold text-foreground">Nom</th>
                  <th class="text-right py-3 px-4 font-semibold text-foreground">Transactions</th>
                  <th class="text-right py-3 px-4 font-semibold text-foreground">Approuvées</th>
                  <th class="text-right py-3 px-4 font-semibold text-foreground">Déclinées</th>
                  <th class="text-right py-3 px-4 font-semibold text-foreground">Taux Refus</th>
                  <th class="text-right py-3 px-4 font-semibold text-foreground">Volume</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let mRow of merchantRows"
                    class="border-b border-border/20 hover:bg-primary/5 transition"
                    [ngClass]="{'bg-red-500/5': mRow.declineRate > 20}">
                  <td class="py-3 px-4 font-mono text-xs text-foreground">{{ mRow.merchantId }}</td>
                  <td class="py-3 px-4 text-foreground text-xs font-semibold">{{ mRow.merchantName }}</td>
                  <td class="py-3 px-4 text-right font-mono text-purple-500 font-semibold">{{ mRow.total }}</td>
                  <td class="py-3 px-4 text-right font-mono text-green-500">{{ mRow.approved }}</td>
                  <td class="py-3 px-4 text-right font-mono text-red-500">{{ mRow.declined }}</td>
                  <td class="py-3 px-4 text-right font-bold"
                      [class.text-red-500]="mRow.declineRate > 20"
                      [class.text-blue-500]="mRow.declineRate > 10 && mRow.declineRate <= 20"
                      [class.text-green-500]="mRow.declineRate <= 10">
                    {{ mRow.declineRate }}%
                  </td>
                  <td class="py-3 px-4 text-right font-mono text-muted-foreground text-xs">
                    {{ mRow.volume | number:'1.0-0' }}
                  </td>
                </tr>
                <tr *ngIf="merchantRows.length === 0">
                  <td colspan="7" class="py-8 text-center text-sm text-muted-foreground">
                    Aucun marchand ECOM disponible
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
export class EcomComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  transactions: Transaction[] = [];

  get projectLabel(): string { return this.projectFilter.activeProjectName; }

  kpi: EcomKpi = {
    total: 0, ecomShare: 0, totalVolume: 0, avgAmount: 0,
    successRate: 0, declineRate: 0, fraudRate: 0, threeDsRate: 0
  };

  approvedEcom: Transaction[] = [];
  declinedEcom: Transaction[] = [];
  merchantRows: MerchantRow[] = [];

  constructor(
    private readonly apiService: ApiService,
    private readonly projectFilter: ProjectFilterService,
  ) {}

  ngOnInit(): void {
    this.apiService.invalidateTransactionCache();
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
        this.transactions = [];
        this.calculateMetrics();
      }
    });
  }

  private calculateMetrics(): void {
    const ecomTx = this.transactions.filter(tx => tx.channel === 'ECOM');

    if (ecomTx.length === 0) return;

    const total = ecomTx.length;
    const nonReversals = ecomTx.filter(tx => tx.functionCode !== '400' && tx.reversalFlag !== 'Y');
    const nonRevTotal = nonReversals.length || 1;
    const approved = nonReversals.filter(tx =>
      tx.status === 'APPROVED' || (tx.actionCode || '').trim() === '000'
    ).length;
    const declined = nonReversals.filter(tx => {
      const ac = (tx.actionCode || '').trim();
      return tx.status === 'DECLINED' || (ac !== '' && ac !== '000' && ac !== '00');
    }).length;
    const fraudBlocked = ecomTx.filter(tx =>
      tx.status === 'FRAUD_BLOCKED' || (tx.fraudScore != null && tx.fraudScore > 75)
    ).length;
    const threeDsSuccess = ecomTx.filter(tx => tx.is3dsSuccess === true).length;
    const threeDsAttempted = ecomTx.filter(tx => tx.is3dsSuccess != null).length;
    const totalVolume = ecomTx.reduce((s, tx) => s + (tx.transactionAmount ?? tx.amount ?? 0), 0);

    this.kpi = {
      total,
      ecomShare: this.transactions.length > 0 ? Math.round((total / this.transactions.length) * 100) : 0,
      totalVolume,
      avgAmount: total > 0 ? Math.round(totalVolume / total) : 0,
      successRate: Math.round((approved / nonRevTotal) * 100),
      declineRate: Math.round((declined / nonRevTotal) * 100),
      fraudRate: total > 0 ? Math.round((fraudBlocked / total) * 100 * 100) / 100 : 0,
      threeDsRate: threeDsAttempted > 0 ? Math.round((threeDsSuccess / threeDsAttempted) * 100) : 0
    };

    this.approvedEcom = ecomTx
      .filter(tx => tx.status === 'APPROVED' || (tx.actionCode || '').trim() === '000')
      .sort((a, b) => new Date(b.timestamp as string || 0).getTime()
                    - new Date(a.timestamp as string || 0).getTime())
      .slice(0, 50);

    this.declinedEcom = ecomTx
      .filter(tx => {
        const ac = (tx.actionCode || '').trim();
        return tx.status === 'DECLINED'
            || tx.status === 'FRAUD_BLOCKED'
            || (ac !== '' && ac !== '000' && ac !== '00');
      })
      .sort((a, b) => new Date(b.timestamp as string || 0).getTime()
                    - new Date(a.timestamp as string || 0).getTime())
      .slice(0, 50);

    this.buildMerchantTable(ecomTx);
  }

  private buildMerchantTable(ecomTx: Transaction[]): void {
    const map = new Map<string, { name: string; approved: number; declined: number; total: number; volume: number }>();

    ecomTx.forEach(tx => {
      const mid = tx.cardAcceptorId ?? 'INCONNU';
      if (!map.has(mid)) {
        map.set(mid, { name: tx.cardAccNameAddress ?? tx.merchantName ?? mid, approved: 0, declined: 0, total: 0, volume: 0 });
      }
      const e = map.get(mid)!;
      e.total++;
      e.volume += tx.transactionAmount ?? tx.amount ?? 0;
      const ac = (tx.actionCode || '').trim();
      if (tx.status === 'APPROVED' || ac === '000') e.approved++;
      if (tx.status === 'DECLINED' || (ac !== '' && ac !== '000' && ac !== '00')) e.declined++;
    });

    this.merchantRows = Array.from(map.entries())
      .map(([merchantId, d]) => ({
        merchantId,
        merchantName: d.name,
        total: d.total,
        approved: d.approved,
        declined: d.declined,
        declineRate: d.total > 0 ? Math.round((d.declined / d.total) * 100) : 0,
        volume: d.volume
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);
  }

}

