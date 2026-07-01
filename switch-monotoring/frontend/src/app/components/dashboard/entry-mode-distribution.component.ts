import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../api.service';
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-entry-mode-distribution',
  standalone: true,
  imports: [CommonModule, ChartModule, CardModule],
  template: `
    <p-card class="shadow-lg">
      <ng-template pTemplate="header">
        <div class="bg-gradient-to-r from-violet-600 to-indigo-500 h-32 flex items-center px-6">
          <h3 class="text-white font-bold text-lg">🔐 Mode d'Entrée - Distribution (DE 22)</h3>
        </div>
      </ng-template>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Graphique Radar -->
        <div class="lg:col-span-2">
          <div *ngIf="chartData">
            <p-chart type="radar" [data]="chartData" [options]="chartOptions"></p-chart>
          </div>
        </div>

        <!-- Détails -->
        <div class="space-y-3">
          <h4 class="font-bold text-gray-800 mb-4">📊 Mode d'Entrée</h4>
          <div *ngFor="let mode of entryModes" 
            class="p-3 rounded border-l-4 transition-all"
            [ngClass]="getModeClass(mode.code)">
            <div class="flex justify-between items-start mb-2">
              <div>
                <div class="font-bold" [ngClass]="getModeTextColor(mode.code)">{{ mode.name }}</div>
                <div class="text-xs text-gray-600">{{ mode.code }}</div>
              </div>
              <span class="font-bold" [ngClass]="getModeTextColor(mode.code)">{{ mode.percentage }}%</span>
            </div>
            <div class="bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                class="h-full"
                [style.width]="mode.percentage + '%'"
                [ngClass]="getModeBgColor(mode.code)">
              </div>
            </div>
            <div class="text-xs text-gray-600 mt-2">{{ mode.count }} transactions</div>
          </div>
        </div>
      </div>

      <!-- Analyse Sécurité -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t">
        <!-- Paiements Contactles -->
        <div class="bg-green-50 p-4 rounded-lg border border-green-200">
          <div class="text-gray-600 text-sm font-bold mb-2">📱 Sans Contact</div>
          <div class="font-bold text-2xl text-green-700">{{ contactlessPercentage }}%</div>
          <div class="text-xs text-gray-600">{{ contactlessCount }} transactions - Plus sûr</div>
        </div>

        <!-- Paiements Chip -->
        <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div class="text-gray-600 text-sm font-bold mb-2">💳 Chip/EMV</div>
          <div class="font-bold text-2xl text-blue-700">{{ chipPercentage }}%</div>
          <div class="text-xs text-gray-600">{{ chipCount }} transactions</div>
        </div>

        <!-- Paiements Manuels -->
        <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div class="text-gray-600 text-sm font-bold mb-2">⌨️ Manuel/Mag</div>
          <div class="font-bold text-2xl text-blue-700">{{ manualPercentage }}%</div>
          <div class="text-xs text-gray-600">{{ manualCount }} transactions - Moins sûr</div>
        </div>
      </div>

      <!-- Insights Sécurité -->
      <div class="bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-300 rounded-lg p-4 mt-6">
        <h4 class="font-bold text-purple-900 mb-3">🔒 Insights Sécurité</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-gray-700">Utilisation 3-D Secure:</span>
            <div class="font-bold text-purple-700">{{ secure3dUsage }}%</div>
          </div>
          <div>
            <span class="text-gray-700">Taux Fraude (Manuel):</span>
            <div class="font-bold text-blue-700">{{ manualFraudRate }}%</div>
          </div>
          <div>
            <span class="text-gray-700">Paiements Sécurisés:</span>
            <div class="font-bold text-green-700">{{ securePaymentsPercentage }}%</div>
          </div>
          <div>
            <span class="text-gray-700">Paiements À Risque:</span>
            <div class="font-bold text-red-700">{{ riskyPaymentsPercentage }}%</div>
          </div>
        </div>
      </div>

      <!-- Recommandations -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <h4 class="font-bold text-blue-900 mb-2">💡 Recommandations</h4>
        <ul class="text-xs space-y-1 text-blue-900">
          <li *ngIf="manualPercentage > 20">
            • <strong>Alerte:</strong> {{ manualPercentage }}% de paiements manuels - Encourage l'utilisation du chip ou sans contact
          </li>
          <li *ngIf="contactlessPercentage < 30">
            • <strong>Opportunité:</strong> Augmenter l'adoption du paiement sans contact (seulement {{ contactlessPercentage }}%)
          </li>
          <li>
            • <strong>Sécurité:</strong> Implémenter la vérification 3-D Secure pour les paiements manuels
          </li>
        </ul>
      </div>
    </p-card>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class EntryModeDistributionComponent implements OnInit {
  @Input() transactions: any[] = [];
  
  chartData: any;
  chartOptions: any;
  entryModes: any[] = [];
  contactlessPercentage: number = 0;
  contactlessCount: number = 0;
  chipPercentage: number = 0;
  chipCount: number = 0;
  manualPercentage: number = 0;
  manualCount: number = 0;
  secure3dUsage: number = 0;
  manualFraudRate: number = 0;
  securePaymentsPercentage: number = 0;
  riskyPaymentsPercentage: number = 0;

  private entryModeDescriptions: any = {
    '00': { name: 'Non Spécifié', category: 'other' },
    '01': { name: 'Manuel - Pas de Bande', category: 'manual' },
    '02': { name: 'Bande Magnétique', category: 'manual' },
    '05': { name: 'Chip/EMV', category: 'chip' },
    '06': { name: 'Chip - Contactless', category: 'contactless' },
    '07': { name: 'Code QR', category: 'contactless' },
    '08': { name: 'NFC', category: 'contactless' },
    '09': { name: 'Mobile Wallet', category: 'contactless' }
  };

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.analyzeEntryModes();
  }

  analyzeEntryModes() {
    // Grouper par mode
    const modeData = new Map();
    const total = this.transactions.length;

    this.transactions.forEach(tx => {
      const mode = tx.entry_mode || '00';
      modeData.set(mode, (modeData.get(mode) || 0) + 1);
    });

    // Créer liste
    this.entryModes = Array.from(modeData.entries())
      .map(([code, count]) => ({
        code,
        name: this.entryModeDescriptions[code]?.name || 'Inconnu',
        category: this.entryModeDescriptions[code]?.category || 'other',
        count,
        percentage: Math.round((count / total) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    // Calculer catégories
    this.contactlessCount = this.entryModes
      .filter(m => m.category === 'contactless')
      .reduce((sum, m) => sum + m.count, 0);
    this.contactlessPercentage = Math.round((this.contactlessCount / total) * 100);

    this.chipCount = this.entryModes
      .filter(m => m.category === 'chip')
      .reduce((sum, m) => sum + m.count, 0);
    this.chipPercentage = Math.round((this.chipCount / total) * 100);

    this.manualCount = this.entryModes
      .filter(m => m.category === 'manual')
      .reduce((sum, m) => sum + m.count, 0);
    this.manualPercentage = Math.round((this.manualCount / total) * 100);

    // Analyse sécurité
    this.securePaymentsPercentage = this.contactlessPercentage + this.chipPercentage;
    this.riskyPaymentsPercentage = 100 - this.securePaymentsPercentage;

    // Taux fraude manuel (estimation)
    const manualTxs = this.transactions.filter(tx => 
      this.entryModeDescriptions[tx.entry_mode]?.category === 'manual'
    );
    const manualFailed = manualTxs.filter(tx => tx.response_code !== '00').length;
    this.manualFraudRate = manualTxs.length > 0 
      ? Math.round((manualFailed / manualTxs.length) * 100)
      : 0;

    // 3-D Secure usage (estimation)
    this.secure3dUsage = Math.min(100, 85); // Placeholder

    // Graphique Radar
    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];
    
    this.chartData = {
      labels: this.entryModes.map(m => m.name),
      datasets: [{
        label: 'Nombre de Transactions',
        data: this.entryModes.map(m => m.count),
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: '#3B82F6',
        borderWidth: 2,
        pointBackgroundColor: this.entryModes.map((_, i) => colors[i % colors.length]),
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }]
    };

    this.chartOptions = {
      plugins: {
        legend: { display: true }
      },
      scales: {
        r: {
          beginAtZero: true
        }
      }
    };
  }

  getModeClass(code: string): string {
    const category = this.entryModeDescriptions[code]?.category;
    if (category === 'contactless') return 'bg-green-50 border-green-400';
    if (category === 'chip') return 'bg-blue-50 border-blue-400';
    if (category === 'manual') return 'bg-blue-50 border-blue-400';
    return 'bg-gray-50 border-gray-400';
  }

  getModeTextColor(code: string): string {
    const category = this.entryModeDescriptions[code]?.category;
    if (category === 'contactless') return 'text-green-700';
    if (category === 'chip') return 'text-blue-700';
    if (category === 'manual') return 'text-blue-700';
    return 'text-gray-700';
  }

  getModeBgColor(code: string): string {
    const category = this.entryModeDescriptions[code]?.category;
    if (category === 'contactless') return 'bg-green-500';
    if (category === 'chip') return 'bg-blue-500';
    if (category === 'manual') return 'bg-blue-600';
    return 'bg-gray-500';
  }
}
