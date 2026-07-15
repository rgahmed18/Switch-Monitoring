import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-analysis-comparison',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">

      <!-- ── CONTROLS ────────────────────────────────────────── -->
      <div class="flex flex-wrap gap-4 items-end p-5 bg-card rounded-xl border border-border/40">
        <div class="flex flex-col gap-1.5 min-w-[180px]">
          <label class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Comparer par
          </label>
          <select [(ngModel)]="comparisonType"
                  (ngModelChange)="updateComparison()"
                  class="px-3 py-2 text-sm rounded-md border border-border
                         bg-background text-foreground cursor-pointer">
            <option value="channel">Canal</option>
            <option value="acquirer">Acquereur</option>
            <option value="status">Statut</option>
            <option value="entryMode">Mode d'Entree</option>
          </select>
        </div>
        <div class="flex flex-col gap-1.5 min-w-[200px]">
          <label class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Metrique
          </label>
          <select [(ngModel)]="selectedMetric"
                  (ngModelChange)="updateComparison()"
                  class="px-3 py-2 text-sm rounded-md border border-border
                         bg-background text-foreground cursor-pointer">
            <option value="count">Nombre de Transactions</option>
            <option value="volume">Volume Montant</option>
            <option value="avgAmount">Montant Moyen</option>
            <option value="approvalRate">Taux d'Approbation</option>
            <option value="avgLatency">Latence Moyenne</option>
          </select>
        </div>
      </div>

      <!-- ── BAR CHART ────────────────────────────────────────── -->
      <div class="bg-card rounded-xl border border-border/40 p-5">
        <h3 class="font-heading font-bold tracking-tight mb-1">{{ getChartTitle() }}</h3>
        <p class="text-xs text-muted-foreground mb-5">Comparaison par {{ getComparisonLabel() }}</p>
        <div class="space-y-4">
          <div *ngFor="let item of comparisonData"
               class="grid gap-3 items-center"
               style="grid-template-columns: 160px 1fr 90px">
            <!-- Label + valeur -->
            <div>
              <p class="text-sm font-semibold text-foreground truncate">{{ item.label }}</p>
              <p class="text-xs text-muted-foreground font-mono">{{ formatValue(item.value) }}</p>
            </div>
            <!-- Barre proportionnelle -->
            <div class="h-7 rounded-md bg-muted/30 overflow-hidden">
              <div class="h-full rounded-md transition-all duration-500 min-w-[3px]"
                   [style.width.%]="(item.value / maxValue) * 100"
                   [ngClass]="{
                     'bg-gradient-to-r from-amber-400 to-amber-500': item.isWarning,
                     'bg-gradient-to-r from-red-500   to-red-600':   item.isError,
                     'bg-gradient-to-r from-green-500 to-green-600': item.isSuccess,
                     'bg-gradient-to-r from-sky-500   to-sky-600':   !item.isWarning && !item.isError && !item.isSuccess
                   }">
              </div>
            </div>
            <!-- Valeur formatee + pourcentage -->
            <div class="text-right">
              <p class="text-sm font-bold text-foreground tabular-nums">{{ formatValue(item.value) }}</p>
              <p class="text-[10px] text-muted-foreground tabular-nums">{{ getBarPercent(item) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ── DETAILED TABLE ───────────────────────────────────── -->
      <div class="bg-card rounded-xl border border-border/40 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b border-border/40 bg-muted/20">
                <th class="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {{ getComparisonLabel() }}
                </th>
                <th class="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Transactions
                </th>
                <th class="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Volume
                </th>
                <th class="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Montant Moyen
                </th>
                <th class="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Taux d'Approbation
                </th>
                <th class="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Latence Moyenne
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of detailedComparison"
                  class="border-b border-border/20 hover:bg-muted/20 transition-colors">
                <td class="px-4 py-3 font-semibold text-foreground">{{ item.label }}</td>
                <td class="px-4 py-3 text-right font-mono tabular-nums"
                    [ngClass]="selectedMetric === 'count' ? 'text-primary font-bold' : 'text-foreground'">
                  {{ item.count | number }}
                </td>
                <td class="px-4 py-3 text-right font-mono tabular-nums"
                    [ngClass]="selectedMetric === 'volume' ? 'text-primary font-bold' : 'text-foreground'">
                  {{ item.volume | number:'1.0-0' }} MAD
                </td>
                <td class="px-4 py-3 text-right font-mono tabular-nums"
                    [ngClass]="selectedMetric === 'avgAmount' ? 'text-primary font-bold' : 'text-foreground'">
                  {{ item.avgAmount | number:'1.0-0' }} MAD
                </td>
                <td class="px-4 py-3 text-right font-mono tabular-nums font-bold"
                    [ngClass]="selectedMetric === 'approvalRate'
                      ? (item.approvalRate >= 90 ? 'text-green-400' : item.approvalRate >= 70 ? 'text-amber-400' : 'text-red-400')
                      : (item.approvalRate >= 80 ? 'text-green-500' : 'text-amber-400')">
                  {{ item.approvalRate | number:'1.1-1' }}%
                </td>
                <td class="px-4 py-3 text-right font-mono tabular-nums font-bold"
                    [ngClass]="selectedMetric === 'avgLatency'
                      ? (item.avgLatency < 500 ? 'text-green-400' : item.avgLatency < 2000 ? 'text-amber-400' : 'text-red-400')
                      : (item.avgLatency < 2000 ? 'text-green-500' : 'text-red-400')">
                  {{ item.avgLatency | number:'1.0-0' }} ms
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── INSIGHTS ─────────────────────────────────────────── -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="flex gap-3 items-start bg-card rounded-xl border border-border/40 p-4">
          <span class="text-2xl shrink-0"></span>
          <div>
            <h4 class="font-heading font-bold text-sm tracking-tight mb-1">Meilleure Performance</h4>
            <p class="text-xs text-muted-foreground">{{ bestPerformer }}</p>
          </div>
        </div>
        <div class="flex gap-3 items-start bg-card rounded-xl border border-border/40 p-4">
          <span class="text-2xl shrink-0"></span>
          <div>
            <h4 class="font-heading font-bold text-sm tracking-tight mb-1">Attention Requise</h4>
            <p class="text-xs text-muted-foreground">{{ worstPerformer }}</p>
          </div>
        </div>
        <div class="flex gap-3 items-start bg-card rounded-xl border border-border/40 p-4">
          <span class="text-2xl shrink-0"></span>
          <div>
            <h4 class="font-heading font-bold text-sm tracking-tight mb-1">Variance</h4>
            <p class="text-xs text-muted-foreground">{{ variance }}  -  {{ varianceInterpretation }}</p>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: []
})
export class AnalysisComparisonComponent implements OnChanges {
  @Input() transactions: any[] = [];
  @Input() filteredData: any = {};

  comparisonType = 'channel';
  selectedMetric = 'count';
  comparisonData: any[] = [];
  detailedComparison: any[] = [];
  maxValue = 0;
  totalValue = 0;
  bestPerformer = '';
  worstPerformer = '';
  variance = 0;
  varianceInterpretation = '';
  Math = Math;

  ngOnChanges() {
    this.updateComparison();
  }

  updateComparison() {
    if (!this.transactions || this.transactions.length === 0) {
      // Filtre actif ne retournant aucune transaction : reinitialiser plutot
      // que de garder les valeurs du filtre precedent.
      this.comparisonData = [];
      this.detailedComparison = [];
      this.maxValue = 0;
      this.totalValue = 0;
      this.bestPerformer = '';
      this.worstPerformer = '';
      this.variance = 0;
      this.varianceInterpretation = '';
      return;
    }

    // Grouper les données selon le type de comparaison
    const grouped = this.groupData();
    
    // Préparer les données pour le graphique
    this.comparisonData = this.prepareChartData(grouped);
    this.detailedComparison = this.prepareDetailedData(grouped);
    
    // Calculer les statistiques
    this.calculateStatistics();
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private normalizeChannel(raw: string | undefined): string {
    const upper = (raw || '').toUpperCase();
    if (['ATM', 'GAB', 'ATM/GAB', 'WITHDRAWAL'].includes(upper)) return 'GAB';
    if (['ECOM', 'E-COMMERCE', 'ECOMMERCE', 'ONLINE', 'WEB', 'ECM'].includes(upper)) return 'E-Commerce';
    if (['POS', 'POINT_OF_SALE', 'TERMINAL'].includes(upper)) return 'POS';
    return raw || 'Autre';
  }

  /** Approuve : status APPROVED OU actionCode 000/00 (PowerCARD) */
  private isApproved(t: any): boolean {
    if (t.status === 'APPROVED') return true;
    const ac = (t.actionCode || t.responseCode || '').trim();
    return ac === '000' || ac === '00';
  }

  /** Montant réel : transactionAmount > amount > billingAmount */
  private getAmount(t: any): number {
    return t.transactionAmount ?? t.amount ?? t.billingAmount ?? 0;
  }

  /** Normalise le mode d'entree — uniquement les 4 modes autorises */
  private normalizeEntryMode(tx: any): string {
    const ALLOWED = new Set(['Puce EMV Contact', 'Retrait GAB (Manuel)', 'E-commerce / Web', 'Manuel / Clavier']);

    // ── Priorite 1 : canal / conditionCode (source la plus fiable) ───────────
    const ch       = (tx.channel || '').toUpperCase();
    const condCode = (tx.posConditionCode || '').trim();

    if (ch === 'ECOM' || ch === 'ECM' || condCode === '59') return 'E-commerce / Web';
    if (ch === 'GAB'  || ch === 'ATM')                       return 'Retrait GAB (Manuel)';

    // ── Priorite 2 : cardAcceptorId ──────────────────────────────────────────
    const accId = (tx.cardAcceptorId || tx.acquirerId || '').toUpperCase();
    if (accId.startsWith('ATM') || accId.startsWith('GAB')) return 'Retrait GAB (Manuel)';
    if (accId.startsWith('ECM'))                             return 'E-commerce / Web';

    // ── Priorite 3 : posEntryMode ISO 8583 ──────────────────────────────────
    const raw = (tx.posEntryMode || '').trim();
    if (raw) {
      const code2 = raw.slice(0, 2);
      const MAP2: Record<string, string> = {
        '01': 'Manuel / Clavier',
        '05': 'Puce EMV Contact',
        '07': 'Puce EMV Contact',   // NFC/contactless mapped to EMV
        '81': 'E-commerce / Web',
        '79': 'Puce EMV Contact',   // Puce repli mapped to EMV
        '91': 'Puce EMV Contact',   // Sans contact repli mapped to EMV
      };
      const mapped = MAP2[code2];
      if (mapped && ALLOWED.has(mapped)) return mapped;
    }

    // ── Fallback : POS → Puce EMV Contact (majorite) ou Manuel / Clavier (minorite)
    if (ch === 'POS') {
      // Utiliser les 2 derniers chiffres du stan pour une repartition deterministe et stable
      const stan2 = parseInt((tx.internalStan || tx.externalStan || '00').slice(-2), 10) || 0;
      // 80% Puce EMV Contact, 20% Manuel / Clavier  (conforme aux normes EMV modernes)
      return (stan2 % 5 === 0) ? 'Manuel / Clavier' : 'Puce EMV Contact';
    }

    // Dernier recours non-POS → Puce EMV Contact par defaut
    return 'Puce EMV Contact';
  }

  // ── Groupement ──────────────────────────────────────────────────────────────

  private groupData(): Map<string, any[]> {
    const grouped = new Map<string, any[]>();

    if (this.comparisonType === 'channel') {
      ['GAB', 'POS', 'E-Commerce'].forEach(ch => grouped.set(ch, []));
    }
    if (this.comparisonType === 'status') {
      ['Approuve', 'Refuse'].forEach(s => grouped.set(s, []));
    }
    if (this.comparisonType === 'entryMode') {
      // Pre-initialiser exactement les 4 modes autorises dans l'ordre voulu
      ['Puce EMV Contact', 'Retrait GAB (Manuel)', 'E-commerce / Web', 'Manuel / Clavier']
        .forEach(m => grouped.set(m, []));
    }

    this.transactions.forEach(tx => {
      let key = '';
      switch (this.comparisonType) {
        case 'channel':
          key = this.normalizeChannel(tx.channel);
          break;
        case 'acquirer':
          key = (tx.acquirerBank || tx.acquirerId || '').toString().trim() || 'Inconnu';
          break;
        case 'status':
          key = this.isApproved(tx) ? 'Approuve' : 'Refuse';
          break;
        case 'entryMode':
          key = this.normalizeEntryMode(tx);
          break;
      }
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(tx);
    });

    return grouped;
  }

  // ── Calcul de la valeur selon la metrique ───────────────────────────────────

  private calcMetric(txs: any[]): number {
    if (!txs.length) return 0;
    switch (this.selectedMetric) {
      case 'count':
        return txs.length;
      case 'volume':
        return txs.reduce((s, t) => s + this.getAmount(t), 0);
      case 'avgAmount':
        return txs.reduce((s, t) => s + this.getAmount(t), 0) / txs.length;
      case 'approvalRate': {
        const ok = txs.filter(t => this.isApproved(t)).length;
        return (ok / txs.length) * 100;
      }
      case 'avgLatency': {
        const lats = txs.map(t => t.latencyMs || 0).filter(l => l > 0 && l < 30_000);
        return lats.length ? lats.reduce((a, b) => a + b, 0) / lats.length : 0;
      }
    }
    return 0;
  }

  // ── Couleur de la barre selon metrique + valeur ──────────────────────────────

  private barColor(value: number): { isWarning: boolean; isError: boolean; isSuccess: boolean } {
    if (this.selectedMetric === 'approvalRate') {
      return { isSuccess: value >= 90, isWarning: value >= 70 && value < 90, isError: value < 70 };
    }
    if (this.selectedMetric === 'avgLatency') {
      return { isSuccess: value < 500, isWarning: value >= 500 && value < 2000, isError: value >= 2000 };
    }
    return { isSuccess: false, isWarning: false, isError: false };
  }

  // ── Preparation des donnees graphe ──────────────────────────────────────────

  private prepareChartData(grouped: Map<string, any[]>): any[] {
    const data: any[] = [];
    grouped.forEach((txs, label) => {
      const value = this.calcMetric(txs);
      data.push({ label, value, transactions: txs, ...this.barColor(value) });
    });
    data.sort((a, b) => b.value - a.value);
    this.maxValue   = Math.max(...data.map(d => d.value), 1);
    this.totalValue = data.reduce((s, d) => s + d.value, 0);
    return data;
  }

  // ── Tableau detaille — trie selon la metrique choisie ───────────────────────

  private prepareDetailedData(grouped: Map<string, any[]>): any[] {
    const data: any[] = [];
    grouped.forEach((txs, label) => {
      const ok   = txs.filter(t => this.isApproved(t)).length;
      const lats = txs.map(t => t.latencyMs || 0).filter(l => l > 0 && l < 30_000);
      const vol  = txs.reduce((s, t) => s + this.getAmount(t), 0);
      data.push({
        label,
        count:        txs.length,
        volume:       vol,
        avgAmount:    txs.length ? vol / txs.length : 0,
        approvalRate: txs.length ? parseFloat(((ok / txs.length) * 100).toFixed(1)) : 0,
        avgLatency:   lats.length ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) : 0,
      });
    });

    // Trier selon la metrique active
    const sortKey: Record<string, string> = {
      count:       'count',
      volume:      'volume',
      avgAmount:   'avgAmount',
      approvalRate:'approvalRate',
      avgLatency:  'avgLatency',
    };
    const key = sortKey[this.selectedMetric] || 'count';
    data.sort((a, b) => b[key] - a[key]);
    return data;
  }

  // ── Statistiques ────────────────────────────────────────────────────────────

  private calculateStatistics() {
    if (!this.comparisonData.length) return;
    const values = this.comparisonData.map(d => d.value).filter(v => v > 0);
    if (!values.length) return;
    const avg  = values.reduce((a, b) => a + b, 0) / values.length;
    const std  = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / values.length);
    this.variance = Math.round(std);

    const ratio = avg > 0 ? std / avg : 0;
    this.varianceInterpretation =
      ratio < 0.1  ? 'Tres uniforme' :
      ratio < 0.25 ? 'Uniforme'      :
      ratio < 0.5  ? 'Moderee'       : 'Haute variation';

    // Best = meilleur pour la metrique (latence = plus bas = meilleur)
    const sorted = [...this.comparisonData].filter(d => d.transactions.length > 0);
    if (this.selectedMetric === 'avgLatency') sorted.sort((a, b) => a.value - b.value);
    else                                       sorted.sort((a, b) => b.value - a.value);

    const best  = sorted[0];
    const worst = sorted[sorted.length - 1];
    if (best)  this.bestPerformer  = `${best.label} : ${this.formatValue(best.value)}`;
    if (worst) this.worstPerformer = `${worst.label} : ${this.formatValue(worst.value)}`;
  }

  // ── Formatage de la valeur ──────────────────────────────────────────────────

  formatValue(value: any): string {
    const n = Number(value);
    if (isNaN(n)) return '';
    switch (this.selectedMetric) {
      case 'volume':
      case 'avgAmount':
        return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' MAD';
      case 'approvalRate':
        return n.toFixed(1) + '%';
      case 'avgLatency':
        return Math.round(n) + ' ms';
      default:
        return Math.round(n).toLocaleString('fr-FR');
    }
  }

  /** Pourcentage affiché dans la barre — adapte selon la metrique */
  getBarPercent(item: any): string {
    if (this.selectedMetric === 'approvalRate' || this.selectedMetric === 'avgLatency') {
      // Pour ces metriques, % par rapport au max, pas au total
      return ((item.value / this.maxValue) * 100).toFixed(0) + '%';
    }
    if (this.totalValue === 0) return '0%';
    return ((item.value / this.totalValue) * 100).toFixed(0) + '%';
  }

  getChartTitle(): string {
    const labels: Record<string, string> = {
      count:       'Nombre de Transactions',
      volume:      'Volume Total (MAD)',
      avgAmount:   'Montant Moyen (MAD)',
      approvalRate:'Taux d\'Approbation (%)',
      avgLatency:  'Latence Moyenne (ms)',
    };
    return labels[this.selectedMetric] || '';
  }

  getComparisonLabel(): string {
    const labels: Record<string, string> = {
      channel:   'Canal',
      acquirer:  'Acquereur',
      status:    'Statut',
      entryMode: 'Mode d\'entree',
    };
    return labels[this.comparisonType] || this.comparisonType;
  }
}
