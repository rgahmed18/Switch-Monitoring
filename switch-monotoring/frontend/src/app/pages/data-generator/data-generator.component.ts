import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { ChartModule } from 'primeng/chart';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DataGenerationService } from '../../services/data-generation.service';
import { ApiService } from '../../api.service';

@Component({
  selector: 'app-data-generator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputNumberModule,
    ChartModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <div class="bg-gradient-to-br from-slate-900 to-slate-800 min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -my-4 sm:-my-5 lg:-my-6 px-4 sm:px-6 lg:px-8 py-6">
      <p-toast></p-toast>

      <div class="w-full">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-4xl font-bold text-white mb-2">Générateur de Données de Test</h1>
          <p class="text-gray-400">Injecte des données réalistes pour visualiser tous les graphes du dashboard</p>
        </div>

        <!-- Control Card -->
        <p-card class="mb-6">
          <ng-template pTemplate="header">
            <div class="bg-gradient-to-r from-blue-600 to-blue-500 p-4">
              <h2 class="text-white text-xl font-semibold">Paramètres de Génération</h2>
            </div>
          </ng-template>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Transaction Count -->
            <div>
              <label class="block text-sm font-semibold mb-2 text-gray-700">Nombre de Transactions</label>
              <p-inputNumber
                [(ngModel)]="transactionCount"
                [min]="100"
                [max]="100000"
                [step]="1000"
                class="w-full"
              ></p-inputNumber>
              <p class="text-xs text-gray-500 mt-1">{{ transactionCount }} transactions</p>
            </div>

            <!-- Days Span -->
            <div>
              <label class="block text-sm font-semibold mb-2 text-gray-700">Période (jours glissants)</label>
              <p-inputNumber
                [(ngModel)]="daysSpan"
                [min]="1"
                [max]="90"
                [step]="1"
                class="w-full"
              ></p-inputNumber>
              <p class="text-xs text-gray-500 mt-1">Couvre les {{ daysSpan }} derniers jours</p>
            </div>

            <!-- Actions -->
            <div>
              <label class="block text-sm font-semibold mb-2 text-gray-700">Actions</label>
              <div class="flex gap-2">
                <button
                  pButton
                  type="button"
                  label="Générer"
                  icon="pi pi-refresh"
                  (click)="generateData()"
                  [disabled]="isLoading"
                  class="w-full"
                  severity="primary"
                ></button>
              </div>
            </div>
          </div>
        </p-card>

        <!-- Statistics -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <p-card>
            <div class="text-center">
              <p class="text-3xl font-bold text-blue-600">{{ generatedCount }}</p>
              <p class="text-gray-600 text-sm">Transactions Générées</p>
            </div>
          </p-card>

          <p-card>
            <div class="text-center">
              <p class="text-3xl font-bold text-green-600">{{ (generatedCount * 0.97) | number:'1.0-0' }}</p>
              <p class="text-gray-600 text-sm">Approuvées (97%)</p>
            </div>
          </p-card>

          <p-card>
            <div class="text-center">
              <p class="text-3xl font-bold text-blue-600">{{ (generatedCount * 0.02) | number:'1.0-0' }}</p>
              <p class="text-gray-600 text-sm">Rejetées (3%)</p>
            </div>
          </p-card>

          <p-card>
            <div class="text-center">
              <p class="text-3xl font-bold text-purple-600">10</p>
              <p class="text-gray-600 text-sm">Acquéreurs Couverts</p>
            </div>
          </p-card>
        </div>

        <!-- Preview Data -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Heatmap Preview -->
          <p-card>
            <ng-template pTemplate="header">
              <div class="bg-gradient-to-r from-blue-600 to-red-500 p-3">
                <h3 class="text-white font-semibold">Aperçu: Latence par Heure (MA)</h3>
              </div>
            </ng-template>
            <p-chart
              type="line"
              [data]="heatmapChartData"
              [options]="chartOptions"
            ></p-chart>
          </p-card>

          <!-- Entry Mode Distribution -->
          <p-card>
            <ng-template pTemplate="header">
              <div class="bg-gradient-to-r from-green-500 to-emerald-500 p-3">
                <h3 class="text-white font-semibold">Aperçu: Modes d'Entrée (DE22)</h3>
              </div>
            </ng-template>
            <p-chart
              type="doughnut"
              [data]="entryModeChartData"
              [options]="chartOptions"
            ></p-chart>
          </p-card>

          <!-- Top 5 MCC -->
          <p-card>
            <ng-template pTemplate="header">
              <div class="bg-gradient-to-r from-blue-500 to-cyan-500 p-3">
                <h3 class="text-white font-semibold">Top 5 MCC</h3>
              </div>
            </ng-template>
            <p-chart
              type="bar"
              [data]="mccChartData"
              [options]="chartOptions"
            ></p-chart>
          </p-card>

          <!-- Response Codes -->
          <p-card>
            <ng-template pTemplate="header">
              <div class="bg-gradient-to-r from-purple-500 to-pink-500 p-3">
                <h3 class="text-white font-semibold">Distribution des Codes Réponse</h3>
              </div>
            </ng-template>
            <p-chart
              type="pie"
              [data]="responseCodesChartData"
              [options]="chartOptions"
            ></p-chart>
          </p-card>
        </div>

        <!-- Resources Table -->
        <p-card class="mt-6">
          <ng-template pTemplate="header">
            <div class="bg-gradient-to-r from-indigo-600 to-blue-600 p-4">
              <h2 class="text-white text-lg font-semibold">Ressources Utilisées</h2>
            </div>
          </ng-template>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Acquirers -->
            <div>
              <h3 class="font-semibold text-gray-800 mb-3">Acquéreurs (10)</h3>
              <div class="space-y-2">
                <div *ngFor="let acq of acquirers" class="text-sm text-gray-700">
                  <span class="font-mono bg-gray-100 px-2 py-1 rounded">{{ acq }}</span>
                </div>
              </div>
            </div>

            <!-- Entry Modes -->
            <div>
              <h3 class="font-semibold text-gray-800 mb-3">Modes d'Entrée (3)</h3>
              <div class="space-y-2">
                <div class="text-sm text-gray-700"><strong>01</strong> - Manual Entry</div>
                <div class="text-sm text-gray-700"><strong>05</strong> - Contactless/NFC</div>
                <div class="text-sm text-gray-700"><strong>06</strong> - Chip/EMV</div>
              </div>
            </div>

            <!-- MCC Codes -->
            <div>
              <h3 class="font-semibold text-gray-800 mb-3">MCC Codes (10)</h3>
              <div class="space-y-2">
                <div class="text-sm text-gray-700"><strong>5411</strong> - Supermarkets</div>
                <div class="text-sm text-gray-700"><strong>5812</strong> - Fast Food</div>
                <div class="text-sm text-gray-700"><strong>5815</strong> - Restaurants</div>
                <div class="text-sm text-gray-700"><strong>4225</strong> - Fuel Stations</div>
                <div class="text-sm text-gray-700"><strong>5921</strong> - Pharmacies</div>
              </div>
            </div>

            <!-- Response Codes -->
            <div>
              <h3 class="font-semibold text-gray-800 mb-3">Codes Réponse</h3>
              <div class="space-y-2">
                <div class="text-sm text-gray-700"><strong>00</strong> - Approved (97%)</div>
                <div class="text-sm text-gray-700"><strong>91</strong> - Insufficient Funds (1%)</div>
                <div class="text-sm text-gray-700"><strong>96</strong> - Invalid Account (1%)</div>
                <div class="text-sm text-gray-700"><strong>05, 98</strong> - Other (1%)</div>
              </div>
            </div>

            <!-- MTI Types -->
            <div>
              <h3 class="font-semibold text-gray-800 mb-3">Message Types (MTI)</h3>
              <div class="space-y-2">
                <div class="text-sm text-gray-700"><strong>0200/0210</strong> - Purchase</div>
                <div class="text-sm text-gray-700"><strong>0420</strong> - Reversals</div>
                <div class="text-sm text-gray-700"><strong>0800/0810</strong> - Echo Test</div>
              </div>
            </div>

            <!-- Merchants -->
            <div>
              <h3 class="font-semibold text-gray-800 mb-3">15 Commerçants</h3>
              <div class="space-y-1 text-xs text-gray-700 max-h-32 overflow-y-auto">
                <div *ngFor="let merchant of merchants">{{ merchant }}</div>
              </div>
            </div>
          </div>
        </p-card>

        <!-- Instructions -->
        <p-card class="mt-6 bg-blue-50 border-l-4 border-blue-500">
          <ng-template pTemplate="header">
            <div class="bg-blue-100 p-4">
              <h2 class="text-blue-900 font-semibold">Instructions</h2>
            </div>
          </ng-template>
          <div class="space-y-3 text-gray-700">
            <p>
              <strong>1. Configuration:</strong> Ajustez le nombre de transactions et la période couverte
            </p>
            <p>
              <strong>2. Génération:</strong> Cliquez sur "Générer" pour créer les données
            </p>
            <p>
              <strong>3. Injection:</strong> Les données sont injectées directement dans la base de données
            </p>
            <p>
              <strong>4. Ajout:</strong> Les données s'ajoutent aux transactions existantes
            </p>
            <p>
              <strong>5. Visualisation:</strong> Allez au dashboard pour voir les nouveaux graphes avec données réelles
            </p>
            <p class="text-sm text-gray-600">
              <strong>Astuce:</strong> Genérez 10,000 transactions sur 24 heures pour une bonne représentation de tous les KPIs
            </p>
          </div>
        </p-card>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class DataGeneratorComponent implements OnInit {
  transactionCount = 2000;
  daysSpan = 7;
  isLoading = false;
  generatedCount = 0;

  // Resources (affichage UI uniquement)
  acquirers = ['AWB','BCP','BMCE','CIH','BPM','CDM','SGM','BOA','CAGM','BCM'];
  merchants = [
    'MARJANE ANFA CASABLANCA', 'CARREFOUR MAARIF CAS', 'STATION TOTAL RABAT',
    'PHARMACIE ATLAS CASA', 'RESTAURANT RIAD FES', 'HOTEL KENZI TOWER CAS',
    'JUMIA MAROC ECOM', 'AMAZON.FR ECOM', 'BOOKING.COM ECOM', 'AIR ARABIA ECOM TICKET',
  ];

  // Chart data
  heatmapChartData: any;
  entryModeChartData: any;
  mccChartData: any;
  responseCodesChartData: any;
  chartOptions: any;

  constructor(
    private dataGenService: DataGenerationService,
    private apiService: ApiService,
    private messageService: MessageService
  ) {
    this.initializeCharts();
  }

  ngOnInit() {
    this.loadPreviewData();
  }

  initializeCharts() {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');

    this.chartOptions = {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: textColor
          }
        }
      }
    };
  }

  loadPreviewData() {
    // Heatmap data
    const latencyData = Array.from({ length: 24 }, (_, i) => 300 + Math.random() * 200 + Math.sin(i / 4) * 100);
    this.heatmapChartData = {
      labels: Array.from({ length: 24 }, (_, i) => `${i}h`),
      datasets: [
        {
          label: 'Latence Moyenne (ms)',
          data: latencyData,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4
        }
      ]
    };

    // Entry Mode Doughnut
    this.entryModeChartData = {
      labels: ['Contactless (05)', 'Chip/EMV (06)', 'Manual (01)'],
      datasets: [
        {
          data: [40, 35, 25],
          backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'],
          borderColor: ['#059669', '#1e40af', '#d97706']
        }
      ]
    };

    // Top 5 MCC
    this.mccChartData = {
      labels: ['5411 (Supermarkets)', '5815 (Restaurants)', '5812 (Fast Food)', '4225 (Fuel)', '5921 (Pharmacy)'],
      datasets: [
        {
          label: 'Transactions',
          data: [2500, 2000, 1800, 1500, 1200],
          backgroundColor: '#3b82f6',
          borderColor: '#1e40af'
        }
      ]
    };

    // Response Codes
    this.responseCodesChartData = {
      labels: ['Approved (00)', 'Insufficient Funds (91)', 'Invalid Account (96)', 'Other'],
      datasets: [
        {
          data: [9700, 150, 100, 50],
          backgroundColor: ['#10b981', '#ef4444', '#2563EB', '#6366f1'],
          borderColor: ['#059669', '#4F46E5', '#ea580c', '#4f46e5']
        }
      ]
    };
  }

  generateData() {
    this.isLoading = true;

    try {
      const transactions = this.dataGenService.generateMockTransactions(
        this.transactionCount,
        this.daysSpan
      );
      this.generatedCount = transactions.length;
      this.loadPreviewData();

      this.messageService.add({
        severity: 'success',
        summary: 'Données Générées',
        detail: `${this.generatedCount} transactions distribuées sur ${this.daysSpan} jours avec courbe de charge réaliste`,
        life: 5000
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Une erreur est survenue lors de la génération'
      });
    } finally {
      this.isLoading = false;
    }
  }
}
