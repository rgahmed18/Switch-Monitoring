import { Component, OnInit, OnChanges, SimpleChanges, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../api.service';
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-mti-distribution',
  standalone: true,
  imports: [CommonModule, ChartModule, CardModule],
  template: `
    <p-card class="shadow-lg">
      <ng-template pTemplate="header">
        <div class="bg-gradient-to-r from-indigo-600 to-purple-500 h-12 flex items-center px-5">
          <h3 class="text-white font-semibold text-sm">Distribution des Types de Messages (MTI)</h3>
        </div>
      </ng-template>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Graphique Pie -->
        <div>
          <div *ngIf="chartData" style="height: 240px; position: relative;">
            <p-chart type="pie" [data]="chartData" [options]="chartOptions" [style]="{'height': '100%'}"></p-chart>
          </div>
        </div>

        <!-- Détails MTI -->
        <div class="space-y-2">
          <h4 class="font-bold text-gray-800 mb-4">Détails par Type</h4>
          <div *ngFor="let mti of mtiDetails" 
            class="p-3 rounded border-l-4 transition-all hover:shadow-md"
            [ngClass]="getMtiClass(mti.code)">
            <div class="flex justify-between items-start">
              <div>
                <div class="font-bold" [ngClass]="getMtiTextColor(mti.code)">{{ mti.code }}</div>
                <div class="text-xs text-gray-600">{{ mti.name }}</div>
              </div>
              <span class="font-bold" [ngClass]="getMtiTextColor(mti.code)">{{ mti.count }}</span>
            </div>
            <div class="mt-2">
              <div class="text-xs text-gray-600 mb-1">{{ mti.percentage }}%</div>
              <div class="bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  class="h-full"
                  [style.width]="mti.percentage + '%'"
                  [ngClass]="getMtiBgColor(mti.code)">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Statistiques -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t">
        <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div class="text-gray-600 text-sm">Message le Plus Fréquent</div>
          <div class="font-bold text-xl text-blue-700">{{ topMti?.code }}</div>
          <div class="text-xs text-gray-600">{{ topMti?.name }}</div>
        </div>
        <div class="bg-green-50 p-4 rounded-lg border border-green-200">
          <div class="text-gray-600 text-sm">Transactions Authentification</div>
          <div class="font-bold text-xl text-green-700">{{ authTransactions }}</div>
          <div class="text-xs text-gray-600">(0100, 0110)</div>
        </div>
      </div>
    </p-card>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class MtiDistributionComponent implements OnInit, OnChanges {
  @Input() transactions: any[] = [];
  
  chartData: any;
  chartOptions: any;
  mtiDetails: any[] = [];
  topMti: any;
  authTransactions: number = 0;

  private mtiDescriptions: any = {
    '0100': { name: 'Demande d\'autorisation',      type: 'auth'      },
    '0110': { name: 'Réponse d\'autorisation',      type: 'auth'      },
    '0200': { name: 'Transaction financière',       type: 'financial' },
    '0210': { name: 'Réponse financière',           type: 'financial' },
    '0220': { name: 'Avis financier',               type: 'financial' },
    '0230': { name: 'Réponse avis financier',       type: 'financial' },
    '0400': { name: 'Annulation',                   type: 'reversal'  },
    '0410': { name: 'Réponse annulation',           type: 'reversal'  },
    '0420': { name: 'Avis annulation',              type: 'reversal'  },
    '0800': { name: 'Message réseau',               type: 'network'   },
    '0810': { name: 'Réponse réseau',               type: 'network'   },
  };

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.analyzeMti();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['transactions'] && this.transactions?.length) {
      this.analyzeMti();
    }
  }

  analyzeMti() {
    // Grouper par MTI
    const mtiData = new Map();
    const total = this.transactions.length;

    this.transactions.forEach(tx => {
      const raw = tx.mtiCode || 'Unknown';
      const mti = raw.startsWith('1') ? '0' + raw.slice(1) : raw;
      mtiData.set(mti, (mtiData.get(mti) || 0) + 1);
    });

    // Créer détails
    this.mtiDetails = Array.from(mtiData.entries())
      .map(([code, count]) => ({
        code,
        name: this.mtiDescriptions[code]?.name || 'Unknown',
        type: this.mtiDescriptions[code]?.type || 'other',
        count,
        percentage: Math.round((count / total) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    this.topMti = this.mtiDetails[0];

    // Compter les catégories
    this.authTransactions = this.mtiDetails
      .filter(m => m.type === 'auth')
      .reduce((sum, m) => sum + m.count, 0);

    // Graphique
    const colors = ['#3B82F6', '#EC4899', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444', '#14B8A6', '#2563EB'];
    
    this.chartData = {
      labels: this.mtiDetails.map(m => m.code),
      datasets: [{
        data: this.mtiDetails.map(m => m.count),
        backgroundColor: this.mtiDetails.map((_, i) => colors[i % colors.length]),
        borderColor: '#fff',
        borderWidth: 2
      }]
    };

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
      }
    };
  }

  getMtiClass(code: string): string {
    const type = this.mtiDescriptions[code]?.type;
    if (type === 'auth') return 'bg-blue-50 border-blue-400';
    if (type === 'financial') return 'bg-green-50 border-green-400';
    if (type === 'reversal') return 'bg-blue-50 border-blue-400';
    if (type === 'network') return 'bg-purple-50 border-purple-400';
    return 'bg-gray-50 border-gray-400';
  }

  getMtiTextColor(code: string): string {
    const type = this.mtiDescriptions[code]?.type;
    if (type === 'auth') return 'text-blue-700';
    if (type === 'financial') return 'text-green-700';
    if (type === 'reversal') return 'text-blue-700';
    if (type === 'network') return 'text-purple-700';
    return 'text-gray-700';
  }

  getMtiBgColor(code: string): string {
    const type = this.mtiDescriptions[code]?.type;
    if (type === 'auth') return 'bg-blue-500';
    if (type === 'financial') return 'bg-green-500';
    if (type === 'reversal') return 'bg-blue-600';
    if (type === 'network') return 'bg-purple-500';
    return 'bg-gray-500';
  }
}
