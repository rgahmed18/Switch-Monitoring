import { Component, Input, OnChanges, SimpleChanges, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { Transaction } from '../../models';
import { AppStateService } from '../../state.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-refusal-rate',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, TranslatePipe],
  template: `
    <div>
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-heading font-bold text-foreground tracking-tight">{{ 'chart.declineRate' | translate }}</h3>
        <div class="text-right">
          <p class="text-3xl font-bold text-orange-500">{{ currentRefusalRate }}%</p>
          <p class="text-xs text-muted-foreground">{{ 'chart.perMinute' | translate }}</p>
        </div>
      </div>

      <div class="h-[280px] w-full">
        <canvas baseChart
                [data]="chartData"
                [options]="chartOptions"
                [type]="chartType">
        </canvas>
      </div>
    </div>
  `
})
export class RefusalRateComponent implements OnChanges {
  @Input() transactions: Transaction[] = [];

  private readonly appState = inject(AppStateService);

  public chartType: ChartType = 'line';
  public currentRefusalRate: number = 0;

  public chartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [],
        label: '',
        backgroundColor: 'rgba(251, 146, 60, 0.15)',
        borderColor: '#fb923c',
        pointBackgroundColor: '#fbbf24',
        pointBorderColor: '#1e293b',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.3,
        borderWidth: 2,
        segment: { borderDash: [0] }
      },
      {
        label: 'THRESHOLD',
        data: [],
        borderColor: '#ef4444',
        borderWidth: 1.5,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
        tension: 0
      }
    ],
    labels: []
  };

  public chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 45, autoSkip: false }
      },
      y: {
        grid: { color: 'rgba(0, 0, 0, 0.05)', drawBorder: false },
        ticks: {
          color: '#64748b',
          font: { size: 10 },
          callback: (val: any) => val + '%'
        },
        max: 100,
        min: 0
      }
    },
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.97)',
        titleColor: '#1e293b',
        bodyColor: '#475569',
        borderColor: 'rgba(0, 0, 0, 0.08)',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          title: (context: any) => context[0]?.label || '',
          label: (context: any) => {
            if (context.datasetIndex === 1) return '';
            const lang  = this.appState.lang();
            const word  = lang === 'fr' ? 'Taux' : 'Rate';
            return `${word} : ${context.parsed.y.toFixed(1)}%`;
          },
          filter: (context: any) => context.datasetIndex === 0
        }
      }
    }
  };

  constructor() {
    effect(() => {
      const lang = this.appState.lang();
      this.chartData.datasets[0].label = lang === 'fr' ? 'Taux de refus (%)' : 'Decline rate (%)';
      this.chartData.datasets[1].label = lang === 'fr' ? 'Seuil d\'alerte (30%)' : 'Alert threshold (30%)';
      this.chartData = { ...this.chartData };
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['transactions'] && this.transactions) {
      this.updateChart();
    }
  }

  private updateChart() {
    const lang      = this.appState.lang();
    const BUCKET_MS = 60_000;   // 1 minute par point
    const MAX_BARS  = 30;       // 30 dernières minutes affichées

    if (!this.transactions.length) return;

    const nowMs     = Date.now();
    const nowBucket = Math.floor(nowMs / BUCKET_MS) * BUCKET_MS;

    // Fenêtre : les 30 dernières minutes uniquement
    // Si le simulateur Java génère des tx récentes elles seront ici.
    // Les tx historiques injectées (J-30) sont ignorées pour ce graphe temps réel.
    const windowStart = nowBucket - (MAX_BARS - 1) * BUCKET_MS;

    // Pré-initialiser les 30 buckets à 0 pour que l'axe X soit continu
    const bucketMap = new Map<number, { total: number; refused: number }>();
    for (let k = windowStart; k <= nowBucket; k += BUCKET_MS) {
      bucketMap.set(k, { total: 0, refused: 0 });
    }

    // Remplir uniquement avec les tx tombant dans la fenêtre
    for (const tx of this.transactions) {
      const raw = (tx.transmissionDateAndTime || '').toString().trim();
      if (!raw) continue;
      const ts = new Date(raw).getTime();
      if (!ts || isNaN(ts) || ts <= 0) continue;

      const key = Math.floor(ts / BUCKET_MS) * BUCKET_MS;
      if (!bucketMap.has(key)) continue;   // hors fenêtre → ignoré

      const slot = bucketMap.get(key)!;
      slot.total++;

      const st = (tx.status || '').toUpperCase();
      const ac = (tx.actionCode || tx.responseCode || '').trim();
      const isDeclined = st === 'DECLINED' || st === 'FAILED' || st === 'TIMEOUT'
                      || st === 'ERROR'    || st === 'BLOCKED'
                      || (ac !== '' && ac !== '000' && ac !== '00');
      if (isDeclined) slot.refused++;
    }

    const sortedKeys = Array.from(bucketMap.keys()).sort((a, b) => a - b);

    const final_labels: string[] = [];
    const final_rates:  number[] = [];

    for (const key of sortedKeys) {
      const d    = new Date(key);
      const data = bucketMap.get(key)!;
      final_labels.push(d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      final_rates.push(
        data.total === 0 ? 0 : parseFloat(((data.refused / data.total) * 100).toFixed(1))
      );
    }

    this.chartData.labels            = final_labels;
    this.chartData.datasets[0].label = lang === 'fr' ? 'Taux de refus (%)' : 'Decline rate (%)';
    this.chartData.datasets[1].label = lang === 'fr' ? 'Seuil alerte (30%)' : 'Alert threshold (30%)';
    this.chartData.datasets[0].data  = final_rates;
    this.chartData.datasets[1].data  = final_labels.map(() => 30);

    // Taux global = sur toutes les transactions reçues (pas seulement la fenêtre)
    // pour que le chiffre en haut à droite reflète la réalité complète
    let totalAll = 0, refusedAll = 0;
    for (const tx of this.transactions) {
      totalAll++;
      const st = (tx.status || '').toUpperCase();
      const ac = (tx.actionCode || tx.responseCode || '').trim();
      const isDeclined = st === 'DECLINED' || st === 'FAILED' || st === 'TIMEOUT'
                      || st === 'ERROR'    || st === 'BLOCKED'
                      || (ac !== '' && ac !== '000' && ac !== '00');
      if (isDeclined) refusedAll++;
    }
    this.currentRefusalRate = totalAll > 0
      ? parseFloat(((refusedAll / totalAll) * 100).toFixed(1))
      : 0;

    this.chartData = { ...this.chartData };
  }
}
