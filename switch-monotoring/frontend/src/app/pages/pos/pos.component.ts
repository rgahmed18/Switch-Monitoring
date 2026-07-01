import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { LucideAngularModule } from 'lucide-angular';
import { ApiService } from '../../api.service';
import { ProjectFilterService } from '../../services/project-filter.service';
import { Transaction } from '../../models';

interface MccRow {
  mcc: string;
  label: string;
  total: number;
  approved: number;
  declined: number;
  approvalRate: number;
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

const MCC_LABELS: Record<string, string> = {
  '5411': 'Supermarche / Epicerie',
  '5812': 'Restaurant',
  '5311': 'Grand Magasin',
  '5541': 'Station Service',
  '5912': 'Pharmacie',
  '5999': 'Commerce General',
  '5651': 'Vetements / Sport',
  '5732': 'Electronique',
  '7011': 'Hotel',
  '4111': 'Transport',
  '5960': 'Vente Directe',
};

// Correspondance nom marchand → MCC pour dériver le code quand cardAcceptorActivity est null
const MERCHANT_NAME_TO_MCC: Array<{ keywords: string[]; mcc: string }> = [
  { keywords: ['MARJANE', 'CARREFOUR'],                 mcc: '5411' },
  { keywords: ['IKEA'],                                  mcc: '5311' },
  { keywords: ['ZARA', 'H&M', 'DECATHLON'],              mcc: '5651' },
  { keywords: ['SEPHORA', 'PHARMACIE'],                  mcc: '5912' },
  { keywords: ['SHELL', 'TOTAL', 'STATION'],             mcc: '5541' },
  { keywords: ['MCDONALD', 'PIZZA', 'RESTAURANT'],       mcc: '5812' },
  { keywords: ['APPLE', 'SAMSUNG', 'ELECTRONIQUE'],      mcc: '5732' },
  { keywords: ['ONCF', 'TRANSPORT', 'TRAIN'],            mcc: '4111' },
];

function deriveMccFromName(name: string): string {
  const upper = (name || '').toUpperCase();

  // Cas 1 : nom généré par le fallback api.service → "POS 5411-XXXX" → extraire le MCC directement
  const posMatch = upper.match(/^POS\s+(\d{4})/);
  if (posMatch) return posMatch[1];

  // Cas 2 : correspondance par mot-clé dans le nom du commerçant
  for (const entry of MERCHANT_NAME_TO_MCC) {
    if (entry.keywords.some(k => upper.includes(k))) return entry.mcc;
  }
  return '';
}


@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="w-full">

      <div class="border-b border-border/40 bg-card -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mb-5 lg:mb-6">
        <h1 class="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">POS</h1>
        <p class="mt-1 text-sm text-muted-foreground">Canal POS  -  Transactions Point de Vente</p>
      </div>

      <div class="space-y-5 lg:space-y-6">

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          <div class="bg-card rounded-lg border border-border/40 p-5 shadow-sm">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-semibold text-muted-foreground mb-1">Transactions POS</p>
                <p class="text-2xl font-bold text-foreground">{{ kpi.total }}</p>
              </div>
              <lucide-icon name="shopping-cart" class="w-6 h-6 text-blue-500"></lucide-icon>
            </div>
            <p class="text-xs text-muted-foreground mt-2">{{ kpi.posShare }}% du trafic total</p>
          </div>

          <div class="bg-card rounded-lg border border-border/40 p-5 shadow-sm">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-semibold text-muted-foreground mb-1">Volume Total</p>
                <p class="text-2xl font-bold text-green-500">
                  {{ kpi.totalVolume | number:'1.0-0' }}
                </p>
              </div>
              <lucide-icon name="trending-up" class="w-6 h-6 text-green-500"></lucide-icon>
            </div>
            <p class="text-xs text-muted-foreground mt-2">Somme des montants POS</p>
          </div>

          <div class="bg-card rounded-lg border border-border/40 p-5 shadow-sm">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-semibold text-muted-foreground mb-1">Taux de Succes</p>
                <p class="text-2xl font-bold text-blue-500">{{ kpi.successRate }}%</p>
              </div>
              <lucide-icon name="check-circle" class="w-6 h-6 text-blue-500"></lucide-icon>
            </div>
            <p class="text-xs text-muted-foreground mt-2">Transactions approuvees</p>
          </div>

          <div class="bg-card rounded-lg border border-border/40 p-5 shadow-sm">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-semibold text-muted-foreground mb-1">Taux de Refus</p>
                <p class="text-2xl font-bold text-red-500">{{ kpi.declineRate }}%</p>
              </div>
              <lucide-icon name="alert-triangle" class="w-6 h-6 text-red-500"></lucide-icon>
            </div>
            <p class="text-xs text-muted-foreground mt-2">Transactions declinees</p>
          </div>

        </div>

        <div class="bg-card rounded-xl border border-border/40 p-6 shadow-md">
          <div class="mb-6">
            <h2 class="text-xl font-bold text-foreground">
              Taux d'Approbation par MCC
              <span *ngIf="projectLabel" class="ml-2 text-sm font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">{{ projectLabel }}</span>
            </h2>
            <p class="text-sm text-muted-foreground mt-1">
              Trie par taux d'approbation ascendant - les MCC les plus problematiques en premier
            </p>
          </div>

          <div *ngIf="mccRows.length > 0" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
              <tr class="border-b-2 border-border/40 bg-muted/30">
                <th class="text-left py-3 px-4 font-semibold text-foreground">MCC</th>
                <th class="text-left py-3 px-4 font-semibold text-foreground">Categorie</th>
                <th class="text-right py-3 px-4 font-semibold text-foreground">Total</th>
                <th class="text-right py-3 px-4 font-semibold text-foreground">Approuvees</th>
                <th class="text-right py-3 px-4 font-semibold text-foreground">Declinees</th>
                <th class="text-right py-3 px-4 font-semibold text-foreground">Taux Approbation</th>
                <th class="text-left py-3 px-4 font-semibold text-foreground">Barre</th>
              </tr>
              </thead>
              <tbody>
              <tr *ngFor="let mccRow of mccRows"
                  class="border-b border-border/20 hover:bg-primary/5 transition">
                <td class="py-3 px-4 font-mono text-foreground font-semibold">{{ mccRow.mcc }}</td>
                <td class="py-3 px-4 text-foreground text-xs">{{ mccRow.label }}</td>
                <td class="py-3 px-4 text-right font-mono text-foreground">{{ mccRow.total }}</td>
                <td class="py-3 px-4 text-right font-mono text-green-500">{{ mccRow.approved }}</td>
                <td class="py-3 px-4 text-right font-mono text-red-500">{{ mccRow.declined }}</td>
                <td class="py-3 px-4 text-right font-bold"
                    [class.text-green-500]="mccRow.approvalRate >= 90"
                    [class.text-blue-500]="mccRow.approvalRate >= 80 && mccRow.approvalRate < 90"
                    [class.text-blue-500]="mccRow.approvalRate >= 70 && mccRow.approvalRate < 80"
                    [class.text-red-500]="mccRow.approvalRate < 70">
                  {{ mccRow.approvalRate }}%
                </td>
                <td class="py-3 px-4 min-w-24">
                  <div class="w-full bg-muted rounded-full h-2">
                    <div class="h-2 rounded-full transition-all"
                         [style.width.%]="mccRow.approvalRate"
                         [class.bg-green-500]="mccRow.approvalRate >= 90"
                         [class.bg-blue-500]="mccRow.approvalRate >= 80 && mccRow.approvalRate < 90"
                         [class.bg-blue-600]="mccRow.approvalRate >= 70 && mccRow.approvalRate < 80"
                         [class.bg-red-500]="mccRow.approvalRate < 70">
                    </div>
                  </div>
                </td>
              </tr>
              </tbody>
            </table>
          </div>

          <div *ngIf="mccRows.length === 0"
               class="flex items-center justify-center h-24 text-sm text-muted-foreground">
            Aucune donnee MCC disponible
          </div>
        </div>

        <div class="bg-card rounded-xl border border-border/40 p-6 shadow-md">
          <div class="mb-6">
            <h2 class="text-xl font-bold text-foreground">
              Performance par Commercant
              <span *ngIf="projectLabel" class="ml-2 text-sm font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">{{ projectLabel }}</span>
            </h2>
            <p class="text-sm text-muted-foreground mt-1">
              Top 20 commercants par volume de transactions
            </p>
          </div>

          <div *ngIf="merchantRows.length > 0" class="overflow-auto max-h-[400px]">
            <table class="w-full text-sm">
              <thead class="sticky top-0 z-10 bg-card">
              <tr class="border-b-2 border-border/40 bg-muted/30">
                <th class="text-left py-3 px-4 font-semibold text-foreground">ID Commercant</th>
                <th class="text-left py-3 px-4 font-semibold text-foreground">Nom</th>
                <th class="text-right py-3 px-4 font-semibold text-foreground">Transactions</th>
                <th class="text-right py-3 px-4 font-semibold text-foreground">Approuvees</th>
                <th class="text-right py-3 px-4 font-semibold text-foreground">Declinees</th>
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
                <td class="py-3 px-4 text-right font-mono text-blue-500 font-semibold">{{ mRow.total }}</td>
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
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class PosComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();
  get projectLabel(): string { return this.projectFilter.activeProjectName; }

  transactions: Transaction[] = [];

  kpi = { total: 0, posShare: 0, totalVolume: 0, successRate: 0, declineRate: 0 };
  mccRows: MccRow[] = [];
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
    const posTx = this.transactions.filter(tx => tx.channel === 'POS');

    if (posTx.length === 0) {
      return;
    }

    const total = posTx.length;
    const nonReversals = posTx.filter(tx => tx.functionCode !== '400' && tx.reversalFlag !== 'Y');
    const nonRevTotal = nonReversals.length || 1;
    const approved = nonReversals.filter(tx =>
      tx.status === 'APPROVED' || (tx.actionCode || '').trim() === '000'
    ).length;
    const declined = nonReversals.filter(tx => {
      const ac = (tx.actionCode || '').trim();
      return tx.status === 'DECLINED' || (ac !== '' && ac !== '000' && ac !== '00');
    }).length;

    this.kpi.total = total;
    this.kpi.posShare = this.transactions.length > 0
        ? Math.round((total / this.transactions.length) * 100)
        : 0;
    this.kpi.totalVolume = posTx.reduce(
        (sum, tx) => sum + (tx.transactionAmount ?? tx.amount ?? 0), 0
    );
    this.kpi.successRate = Math.round((approved / nonRevTotal) * 100);
    this.kpi.declineRate = Math.round((declined / nonRevTotal) * 100);

    this.buildMccTable(posTx);
    this.buildMerchantTable(posTx);
  }

  private buildMccTable(posTx: Transaction[]): void {
    const mccMap = new Map<string, { approved: number; declined: number; total: number }>();

    posTx.forEach(tx => {
      // Priorité 1 : cardAcceptorActivity direct depuis la DB
      // Priorité 2 : dérivé depuis le nom du commerçant (données sans MCC en DB)
      let mcc = (tx.cardAcceptorActivity || '').trim();
      if (!mcc || mcc === '6011') {
        mcc = deriveMccFromName(tx.cardAccNameAddress || tx.merchantName || '');
      }
      if (!mcc) return; // aucun MCC disponible → ignorer

      if (!mccMap.has(mcc)) mccMap.set(mcc, { approved: 0, declined: 0, total: 0 });
      const entry = mccMap.get(mcc)!;
      entry.total++;

      const ac = (tx.actionCode || '').trim();
      const isApproved = tx.status === 'APPROVED' || ac === '000';
      const isDeclined = tx.status === 'DECLINED'
                      || (ac !== '' && ac !== '000' && ac !== '00');
      if (isApproved) entry.approved++;
      if (isDeclined) entry.declined++;
    });

    this.mccRows = Array.from(mccMap.entries())
        .map(([mcc, data]) => ({
          mcc,
          label: MCC_LABELS[mcc] ?? 'Categorie ' + mcc,
          total: data.total,
          approved: data.approved,
          declined: data.declined,
          approvalRate: data.total > 0
              ? Math.round((data.approved / data.total) * 100)
              : 0
        }))
        .sort((a, b) => a.approvalRate - b.approvalRate);
  }

  private buildMerchantTable(posTx: Transaction[]): void {
    const merchantMap = new Map<string, {
      name: string; approved: number; declined: number; total: number; volume: number;
    }>();

    posTx.forEach(tx => {
      const mid = tx.cardAcceptorId ?? 'INCONNU';
      if (!merchantMap.has(mid)) {
        merchantMap.set(mid, {
          name: tx.cardAccNameAddress ?? tx.merchantName ?? mid,
          approved: 0, declined: 0, total: 0, volume: 0
        });
      }
      const entry = merchantMap.get(mid)!;
      entry.total++;
      entry.volume += tx.transactionAmount ?? tx.amount ?? 0;
      const ac2 = (tx.actionCode || '').trim();
      if (tx.status === 'APPROVED' || ac2 === '000') entry.approved++;
      if (tx.status === 'DECLINED' || (ac2 !== '' && ac2 !== '000' && ac2 !== '00')) entry.declined++;
    });

    this.merchantRows = Array.from(merchantMap.entries())
        .map(([merchantId, data]) => ({
          merchantId,
          merchantName: data.name,
          total: data.total,
          approved: data.approved,
          declined: data.declined,
          declineRate: data.total > 0
              ? Math.round((data.declined / data.total) * 100)
              : 0,
          volume: data.volume
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 20);
  }

}
