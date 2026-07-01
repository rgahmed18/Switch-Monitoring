import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { LucideAngularModule, ArrowLeft, BarChart3, AlertCircle } from 'lucide-angular';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { ApiService } from '../../api.service';
import { Transaction } from '../../models';
import { ProjectFilterService } from '../../services/project-filter.service';

@Component({
  selector: 'app-gab',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-background">
      <div class="border-b border-border/40 bg-card -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mb-5 lg:mb-6">
        <button (click)="goBack()" class="flex items-center gap-2 mb-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <lucide-icon name="arrowLeft" class="w-4 h-4"></lucide-icon>
          <span>Retour</span>
        </button>
        <h1 class="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">GAB - Utilisation par Banque</h1>
        <p class="mt-1 text-sm text-muted-foreground">Analyse comparative de l'utilisation des Guichets Automatiques</p>
      </div>

      <!-- Main Content -->
      <div class="space-y-5 lg:space-y-6">
        
        <!-- Summary Stats -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-card rounded-lg border border-border/40 p-5 shadow-sm">
            <p class="text-xs font-semibold text-muted-foreground mb-1">Total Transactions GAB</p>
            <p class="text-3xl font-bold text-foreground">{{ summary.totalGab }}</p>
            <p class="text-xs text-muted-foreground mt-2">{{ summary.gabPercentage }}% du volume total</p>
          </div>

          <div class="bg-card rounded-lg border border-border/40 p-5 shadow-sm">
            <p class="text-xs font-semibold text-muted-foreground mb-1">Nombre de Banques</p>
            <p class="text-3xl font-bold text-blue-500">{{ banksCount }}</p>
            <p class="text-xs text-muted-foreground mt-2">Établissements actifs</p>
          </div>

          <div class="bg-card rounded-lg border border-border/40 p-5 shadow-sm">
            <p class="text-xs font-semibold text-muted-foreground mb-1">Taux de Succès Global</p>
            <p class="text-3xl font-bold text-green-500">{{ summary.successRate }}%</p>
            <p class="text-xs text-muted-foreground mt-2">Transactions approuvées</p>
          </div>

          <div class="bg-card rounded-lg border border-border/40 p-5 shadow-sm">
            <p class="text-xs font-semibold text-muted-foreground mb-1">Latence Moyenne</p>
            <p class="text-3xl font-bold text-purple-500">{{ summary.avgLatency }}ms</p>
            <p class="text-xs text-muted-foreground mt-2">Temps de réponse</p>
          </div>
        </div>

        <!-- Chart -->
        <div class="bg-card rounded-xl border border-border/40 p-8 shadow-md">
          <h2 class="text-xl font-bold text-foreground mb-6">Volume de Transactions par Banque</h2>
          <div *ngIf="chartData.labels && chartData.labels.length > 0" style="height: 450px;">
            <canvas baseChart 
              [type]="'bar'" 
              [data]="chartData" 
              [options]="chartOptions"
              #gabChart>
            </canvas>
          </div>
          <div *ngIf="!chartData.labels || chartData.labels.length === 0" class="flex items-center justify-center h-96 text-muted-foreground">
            <p>Aucune donnée disponible</p>
          </div>
        </div>

        <!-- Analysis Section -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Top Banks -->
          <div class="bg-card rounded-xl border border-border/40 p-6 shadow-md">
            <h3 class="text-lg font-bold text-foreground mb-4">Top 5 Banques</h3>
            <div class="space-y-3">
              <div *ngFor="let bank of topBanks; let i = index" class="flex items-center justify-between p-3 hover:bg-primary/5 rounded-lg transition">
                <div class="flex items-center gap-3">
                  <span class="font-bold text-primary text-lg">{{ i + 1 }}</span>
                  <span class="font-semibold text-foreground">{{ bank.name }}</span>
                </div>
                <span class="text-sm font-mono bg-primary/20 text-primary px-3 py-1 rounded">{{ bank.transactions }}</span>
              </div>
            </div>
          </div>

          <!-- Performance Analysis -->
          <div class="bg-card rounded-xl border border-border/40 p-6 shadow-md">
            <h3 class=”text-lg font-bold text-foreground mb-4”>Analyse de Performance</h3>
            <div class="space-y-4">
              <div class="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span class="text-sm font-semibold text-muted-foreground">Taux de Succès Min</span>
                <span class="font-bold text-red-500">{{ analysis.minSuccess }}%</span>
              </div>
              <div class="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span class="text-sm font-semibold text-muted-foreground">Taux de Succès Max</span>
                <span class="font-bold text-green-500">{{ analysis.maxSuccess }}%</span>
              </div>
              <div class="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span class="text-sm font-semibold text-muted-foreground">Taux de Succès Moyen</span>
                <span class="font-bold text-blue-500">{{ analysis.avgSuccess }}%</span>
              </div>
              <div class="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span class="text-sm font-semibold text-muted-foreground">Variance</span>
                <span class="font-bold text-blue-500">{{ analysis.variance }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Detailed Table -->
        <div class="bg-card rounded-xl border border-border/40 p-6 shadow-md">
          <h3 class=”text-lg font-bold text-foreground mb-4”>Analyse Détaillée par Banque</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border/40 bg-muted/40">
                  <th class="text-left py-3 px-4 font-semibold text-foreground">Banque</th>
                  <th class="text-right py-3 px-4 font-semibold text-foreground">Transactions</th>
                  <th class="text-right py-3 px-4 font-semibold text-foreground">% du Total</th>
                  <th class="text-right py-3 px-4 font-semibold text-foreground">Approuvées</th>
                  <th class="text-right py-3 px-4 font-semibold text-foreground">Déclinées</th>
                  <th class="text-right py-3 px-4 font-semibold text-foreground">Erreurs</th>
                  <th class="text-right py-3 px-4 font-semibold text-foreground">Taux Succès</th>
                  <th class="text-right py-3 px-4 font-semibold text-foreground">Latence (ms)</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let bank of bankStats" class="border-b border-border/20 hover:bg-primary/5 transition">
                  <td class="py-3 px-4 text-foreground font-semibold">{{ bank.name }}</td>
                  <td class="py-3 px-4 text-right font-mono text-primary">{{ bank.total }}</td>
                  <td class="py-3 px-4 text-right font-mono text-muted-foreground">{{ bank.percentage }}%</td>
                  <td class="py-3 px-4 text-right font-mono text-green-500">{{ bank.approved }}</td>
                  <td class="py-3 px-4 text-right font-mono text-red-500">{{ bank.declined }}</td>
                  <td class="py-3 px-4 text-right font-mono text-yellow-500">{{ bank.errors }}</td>
                  <td class="py-3 px-4 text-right">
                    <span [ngClass]="{
                      'text-green-500': bank.successRate >= 90,
                      'text-blue-500': bank.successRate >= 70 && bank.successRate < 90,
                      'text-red-500': bank.successRate < 70
                    }" class="font-bold">{{ bank.successRate }}%</span>
                  </td>
                  <td class="py-3 px-4 text-right font-mono text-purple-500">{{ bank.avgLatency }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class GabComponent implements OnInit, OnDestroy {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  private destroy$ = new Subject<void>();

  transactions: Transaction[] = [];
  chartData: ChartData<'bar'> = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration['options'] = {};
  
  summary = { totalGab: 0, gabPercentage: 0, successRate: 0, avgLatency: 0 };
  banksCount = 0;
  topBanks: any[] = [];
  bankStats: any[] = [];
  analysis = { minSuccess: 0, maxSuccess: 0, avgSuccess: 0, variance: 0 };

  constructor(
    private apiService: ApiService,
    private router: Router,
    private projectFilter: ProjectFilterService
  ) {}

  ngOnInit() {
    this.projectFilter.activeProject$.pipe(
      switchMap(() => this.apiService.getTransactions(2000)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.transactions = data;
        this.analyzeGab();
      },
      error: () => {}
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private analyzeGab() {
    const atmTx = this.transactions.filter(tx => 
      tx.mtiCode.startsWith('04') || tx.channel === 'GAB' || tx.gabId
    );

    this.summary.totalGab = atmTx.length;
    this.summary.gabPercentage = this.transactions.length > 0 
      ? Math.round((atmTx.length / this.transactions.length) * 100)
      : 0;

    // Group by bank
    const bankMap = new Map<string, Transaction[]>();
    atmTx.forEach(tx => {
      const bank = tx.bankName || 'Unknown Bank';
      if (!bankMap.has(bank)) bankMap.set(bank, []);
      bankMap.get(bank)!.push(tx);
    });

    this.banksCount = bankMap.size;

    // Calculate per-bank statistics
    this.bankStats = Array.from(bankMap.entries()).map(([name, txs]) => {
      const nonReversals = txs.filter(t => t.functionCode !== '400' && t.reversalFlag !== 'Y');
      const nonRevTotal = nonReversals.length || 1;
      const approved = nonReversals.filter(t => t.status === 'APPROVED').length;
      const declined = nonReversals.filter(t => t.status === 'DECLINED').length;
      const errors = txs.filter(t => t.status === 'ERROR' || t.status === 'FAILED').length;
      const latencies = txs.filter(t => t.latencyMs).map(t => t.latencyMs || 0);

      return {
        name,
        total: txs.length,
        percentage: Math.round((txs.length / this.summary.totalGab) * 100),
        approved,
        declined,
        errors,
        successRate: Math.round((approved / nonRevTotal) * 100),
        avgLatency: latencies.length > 0
          ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
          : 0
      };
    }).sort((a, b) => b.total - a.total);

    // Top 5 banks
    this.topBanks = this.bankStats.slice(0, 5);

    // Analysis metrics
    const successRates = this.bankStats.map(b => b.successRate);
    this.analysis.minSuccess = Math.min(...successRates);
    this.analysis.maxSuccess = Math.max(...successRates);
    this.analysis.avgSuccess = Math.round(successRates.reduce((a, b) => a + b, 0) / successRates.length);
    this.analysis.variance = Math.round(this.analysis.maxSuccess - this.analysis.minSuccess);

    // Overall summary metrics
    const allNonReversals = atmTx.filter(t => t.functionCode !== '400' && t.reversalFlag !== 'Y');
    const allNonRevTotal = allNonReversals.length || 1;
    const allApproved = allNonReversals.filter(t => t.status === 'APPROVED').length;
    const allLatencies = atmTx.filter(t => t.latencyMs).map(t => t.latencyMs || 0);

    this.summary.successRate = Math.round((allApproved / allNonRevTotal) * 100);
    this.summary.avgLatency = allLatencies.length > 0 
      ? Math.round(allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length)
      : 0;

    // Build chart
    this.buildChart();
  }

  private buildChart() {
    const banks = this.bankStats.map(b => b.name);
    const transactions = this.bankStats.map(b => b.total);

    this.chartData = {
      labels: banks,
      datasets: [{
        label: 'Utilisation GAB',
        data: transactions,
        backgroundColor: 'rgba(34, 197, 94, 0.7)',
        borderColor: 'rgb(22, 163, 74)',
        borderWidth: 2,
        borderRadius: 8,
        barPercentage: 0.7,
        categoryPercentage: 0.85
      }]
    };

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top' },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.97)',
          titleColor: '#1e293b',
          bodyColor: '#475569',
          padding: 12,
          callbacks: {
            label: (context) => {
              const value = context.parsed.y || 0;
              const pct = ((value / this.summary.totalGab) * 100).toFixed(1);
              return ` ${value} transactions (${pct}%)`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0, 0, 0, 0.05)' },
          ticks: { color: '#64748b' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#64748b' }
        }
      }
    };
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}

