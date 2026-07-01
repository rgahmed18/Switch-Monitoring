import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Transaction } from '../../models';

interface DeclineStat {
  code: string;
  label: string;
  category: string;
  count: number;
  pctOfDeclined: number;   // % sur total déclinées
  pctOfTotal: number;      // % sur total transactions
  colorText: string;
  colorBar: string;
  colorBadge: string;
}

// Mapping ISO 8583 2-char → libellé + catégorie + couleur
const CODE_META: Record<string, { label: string; category: string; tier: 'red' | 'orange' | 'yellow' | 'blue' | 'muted' }> = {
  '51': { label: 'Fonds Insuffisants',       category: 'Provision',    tier: 'blue'   },
  '55': { label: 'PIN Incorrect',            category: 'Authentif.',   tier: 'orange' },
  '05': { label: 'Refus Émetteur',           category: 'Émetteur',     tier: 'red'    },
  '54': { label: 'Carte Expirée',            category: 'Carte',        tier: 'yellow' },
  '14': { label: 'Carte Invalide / PAN',     category: 'Carte',        tier: 'yellow' },
  '41': { label: 'Carte Perdue',             category: 'Sécurité',     tier: 'red'    },
  '43': { label: 'Carte Volée',              category: 'Sécurité',     tier: 'red'    },
  '61': { label: 'Limite Dépassée',          category: 'Plafond',      tier: 'orange' },
  '91': { label: 'Émetteur Injoignable',     category: 'Réseau',       tier: 'muted'  },
  '96': { label: 'Erreur Système',           category: 'Technique',    tier: 'muted'  },
  '12': { label: 'Transaction Invalide',     category: 'Format',       tier: 'muted'  },
  '13': { label: 'Montant Invalide',         category: 'Format',       tier: 'muted'  },
  '30': { label: 'Erreur de Format',         category: 'Technique',    tier: 'muted'  },
};

const TIER_CLASSES = {
  red:    { text: 'text-red-400',    bar: 'bg-red-500',    badge: 'bg-red-500/10 text-red-400 border-red-500/30'    },
  orange: { text: 'text-blue-400', bar: 'bg-blue-600', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  yellow: { text: 'text-yellow-400', bar: 'bg-yellow-500', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  blue:   { text: 'text-blue-400',   bar: 'bg-blue-500',   badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30'   },
  muted:  { text: 'text-slate-400',  bar: 'bg-slate-500',  badge: 'bg-slate-500/10 text-slate-400 border-slate-500/30'  },
};

@Component({
  selector: 'app-decline-reasons-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="stats.length === 0"
         class="text-xs text-muted-foreground text-center py-8 italic">
      Aucune transaction refusée sur la période.
    </div>

    <div *ngIf="stats.length > 0">

      <!-- ── Résumé en ligne ──────────────────────────────────── -->
      <div class="flex flex-wrap gap-3 mb-6">
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/20 border border-border/30">
          <span class="text-xs text-muted-foreground">Total déclinées</span>
          <span class="text-sm font-bold font-mono text-foreground">{{ totalDeclined }}</span>
        </div>
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/20 border border-border/30">
          <span class="text-xs text-muted-foreground">Sur</span>
          <span class="text-sm font-bold font-mono text-foreground">{{ totalTx }}</span>
          <span class="text-xs text-muted-foreground">transactions</span>
        </div>
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border/30"
             [ngClass]="overallRate > 35 ? 'bg-red-500/10' : 'bg-muted/20'">
          <span class="text-xs text-muted-foreground">Taux global</span>
          <span class="text-sm font-bold font-mono"
                [class.text-red-400]="overallRate > 35"
                [class.text-blue-400]="overallRate > 20 && overallRate <= 35"
                [class.text-green-400]="overallRate <= 20">
            {{ overallRate }}%
          </span>
        </div>
      </div>

      <!-- ── Table ────────────────────────────────────────────── -->
      <div class="overflow-x-auto">
        <table class="w-full text-xs">

          <!-- En-tête -->
          <thead>
            <tr class="border-b border-border/40">
              <th class="text-left py-2 px-3 font-bold uppercase tracking-widest
                         text-muted-foreground w-16">Code</th>
              <th class="text-left py-2 px-3 font-bold uppercase tracking-widest
                         text-muted-foreground">Libellé</th>
              <th class="text-left py-2 px-3 font-bold uppercase tracking-widest
                         text-muted-foreground hidden sm:table-cell">Catégorie</th>
              <th class="text-right py-2 px-3 font-bold uppercase tracking-widest
                         text-muted-foreground w-20">Nb tx</th>
              <th class="text-right py-2 px-3 font-bold uppercase tracking-widest
                         text-muted-foreground w-20 hidden md:table-cell">% Refus</th>
              <th class="py-2 px-3 font-bold uppercase tracking-widest
                         text-muted-foreground w-40 hidden lg:table-cell">Répartition</th>
            </tr>
          </thead>

          <!-- Corps -->
          <tbody>
            <tr *ngFor="let s of stats; let i = index"
                class="border-b border-border/20 hover:bg-muted/10 transition-colors">

              <!-- Code ISO -->
              <td class="py-3 px-3">
                <span class="inline-block font-mono font-bold text-[11px] px-2 py-0.5
                             rounded border min-w-[36px] text-center"
                      [ngClass]="s.colorBadge">
                  {{ s.code }}
                </span>
              </td>

              <!-- Libellé + rang -->
              <td class="py-3 px-3">
                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-bold w-4 text-center text-muted-foreground/60">
                    #{{ i + 1 }}
                  </span>
                  <span class="font-semibold text-foreground">{{ s.label }}</span>
                </div>
              </td>

              <!-- Catégorie -->
              <td class="py-3 px-3 hidden sm:table-cell">
                <span class="text-[10px] px-2 py-0.5 rounded bg-muted/20
                             text-muted-foreground border border-border/30 font-medium">
                  {{ s.category }}
                </span>
              </td>

              <!-- Nb transactions -->
              <td class="py-3 px-3 text-right">
                <span class="font-bold font-mono tabular-nums" [ngClass]="s.colorText">
                  {{ s.count }}
                </span>
              </td>

              <!-- % des déclinées -->
              <td class="py-3 px-3 text-right hidden md:table-cell">
                <span class="font-mono tabular-nums text-muted-foreground">
                  {{ s.pctOfDeclined }}%
                </span>
              </td>

              <!-- Barre de progression -->
              <td class="py-3 px-3 hidden lg:table-cell">
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-700"
                         [style.width.%]="s.pctOfDeclined"
                         [ngClass]="s.colorBar">
                    </div>
                  </div>
                  <span class="text-[10px] font-mono text-muted-foreground w-8 text-right shrink-0">
                    {{ s.pctOfDeclined }}%
                  </span>
                </div>
              </td>

            </tr>

            <!-- Ligne "Autres" si des codes non-Top-5 existent -->
            <tr *ngIf="othersCount > 0"
                class="border-t border-border/30 bg-muted/5">
              <td class="py-2 px-3">
                <span class="inline-block font-mono font-bold text-[11px] px-2 py-0.5
                             rounded border text-center border-border/30
                             bg-muted/20 text-muted-foreground">
                  ...
                </span>
              </td>
              <td class="py-2 px-3 text-muted-foreground italic" colspan="2">
                Autres codes ({{ othersCodes }})
              </td>
              <td class="py-2 px-3 text-right font-mono text-muted-foreground">
                {{ othersCount }}
              </td>
              <td class="py-2 px-3 text-right font-mono text-muted-foreground hidden md:table-cell">
                {{ othersPct }}%
              </td>
              <td class="py-2 px-3 hidden lg:table-cell">
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                    <div class="h-full rounded-full bg-slate-500 transition-all duration-700"
                         [style.width.%]="othersPct">
                    </div>
                  </div>
                  <span class="text-[10px] font-mono text-muted-foreground w-8 text-right shrink-0">
                    {{ othersPct }}%
                  </span>
                </div>
              </td>
            </tr>

          </tbody>
        </table>
      </div>

    </div>
  `
})
export class DeclineReasonsStatsComponent implements OnChanges {
  @Input() transactions: Transaction[] = [];

  stats: DeclineStat[]  = [];
  totalDeclined  = 0;
  totalTx        = 0;
  overallRate    = 0;
  othersCount    = 0;
  othersPct      = 0;
  othersCodes    = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['transactions']) this._compute();
  }

  private _compute(): void {
    this.totalTx       = this.transactions.length;
    const declined     = this.transactions.filter(t => t.status === 'DECLINED');
    this.totalDeclined = declined.length;
    this.overallRate   = this.totalTx > 0
      ? Math.round((this.totalDeclined / this.totalTx) * 100) : 0;

    if (this.totalDeclined === 0) { this.stats = []; return; }

    // Compter par responseCode
    const counts = new Map<string, number>();
    for (const t of declined) {
      const code = (t.responseCode || 'XX').trim();
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }

    // Trier par count desc, prendre Top 7
    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1]);

    const top    = sorted.slice(0, 7);
    const others = sorted.slice(7);

    this.stats = top.map(([code, count]) => {
      const meta = CODE_META[code];
      const tier = meta?.tier ?? 'muted';
      const cls  = TIER_CLASSES[tier];
      return {
        code,
        label:         meta?.label    ?? `Code ${code}`,
        category:      meta?.category ?? 'Autre',
        count,
        pctOfDeclined: Math.round((count / this.totalDeclined) * 100),
        pctOfTotal:    Math.round((count / this.totalTx) * 100),
        colorText:  cls.text,
        colorBar:   cls.bar,
        colorBadge: cls.badge,
      };
    });

    // Ligne "Autres"
    this.othersCount = others.reduce((s, [, n]) => s + n, 0);
    this.othersPct   = this.othersCount > 0
      ? Math.round((this.othersCount / this.totalDeclined) * 100) : 0;
    this.othersCodes = others.map(([c]) => c).join(', ');
  }
}
