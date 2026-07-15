import { Component, Input, OnChanges, SimpleChanges, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { Transaction } from '../../models';
import { AppStateService } from '../../state.service';

@Component({
  selector: 'app-latency-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div>
      <div class="h-[300px] w-full relative">
        <canvas baseChart
                [data]="chartData"
                [options]="chartOptions"
                [type]="chartType">
        </canvas>

        <div *ngIf="currentLatency !== null && currentTimestamp"
             class="absolute top-2 right-2 bg-white border border-border/40 rounded-lg px-3 py-2 text-xs shadow-sm z-10">
          <p class="text-muted-foreground font-mono">{{ currentTimestamp }}</p>
          <p class="text-blue-600 font-semibold">{{ currentLatency }} ms</p>
        </div>
      </div>
    </div>
  `
})
export class LatencyChartComponent implements OnChanges {
  @Input() transactions: Transaction[] = [];

  private readonly appState = inject(AppStateService);

  public chartType: ChartType = 'line';
  public currentLatency: number | null = null;
  public currentTimestamp: string | null = null;

  public chartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [],
        label: '',
        backgroundColor: 'rgba(37, 99, 235, 0.08)',
        borderColor: '#2563EB',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#2563EB',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointHoverRadius: 5,
        fill: true,
        tension: 0.3
      },
      {
        label: 'SLA (2000ms)',
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
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 10 }, maxTicksLimit: 12, maxRotation: 45 }
      },
      y: {
        grid: { color: 'rgba(0, 0, 0, 0.05)', drawBorder: false },
        ticks: {
          color: '#94a3b8',
          font: { size: 10 },
          callback: (val: any) => val + ' ms'
        },
        beginAtZero: true
      }
    },
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(255, 255, 255, 0.97)',
        titleColor: '#1e293b',
        bodyColor: '#475569',
        borderColor: 'rgba(37, 99, 235, 0.2)',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          title: (context: any) => {
            if (context.length > 0) this.currentTimestamp = context[0].label;
            return context[0]?.label || '';
          },
          label: (context: any) => {
            if (context.datasetIndex === 1) return '';
            const value = context.parsed.y;
            this.currentLatency = Math.round(value);
            const lang = this.appState.lang();
            const word = lang === 'fr' ? 'Latence' : 'Latency';
            return `${word} : ${value.toFixed(0)} ms`;
          },
          filter: (context: any) => context.datasetIndex === 0
        }
      }
    }
  };

  constructor() {
    effect(() => {
      const lang = this.appState.lang();
      this.chartData.datasets[0].label = lang === 'fr' ? 'Latence (ms)' : 'Latency (ms)';
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
    const BUCKET_MS = 60_000;
    const MAX_BARS  = 30;

    if (!this.transactions.length) {
      // Filtre actif ne retournant aucune transaction : vider le graphique
      // plutot que de garder les anciennes barres affichees.
      this.chartData.labels = [];
      this.chartData.datasets[0].data = [];
      this.chartData.datasets[1].data = [];
      this.chartData = { ...this.chartData };
      return;
    }

    // Grouper par minute — meme logique que refusal-stacked et refusal-rate
    const bucketMap = new Map<number, { sumLatency: number; count: number }>();

    for (const tx of this.transactions) {
      const raw = (tx.transmissionDateAndTime || '').toString().trim();
      if (!raw) continue;
      const ts = new Date(raw).getTime();
      if (!ts || isNaN(ts) || ts <= 0) continue;

      // Exclure les latences nulles ou aberrantes :
      // - <= 0 : non calculée
      // - > 30 000ms (30s) : valeur synthétique (timeout simulé, jamais réel en banking)
      const lat = tx.latencyMs ?? 0;
      if (lat <= 0 || lat > 30_000) continue;

      const key = Math.floor(ts / BUCKET_MS) * BUCKET_MS;
      if (!bucketMap.has(key)) bucketMap.set(key, { sumLatency: 0, count: 0 });
      const slot = bucketMap.get(key)!;
      slot.sumLatency += lat;
      slot.count++;
    }

    if (!bucketMap.size) return;

    // Meme logique : uniquement les minutes avec donnees, pas de remplissage des trous
    const nowBucket     = Math.floor(Date.now() / BUCKET_MS) * BUCKET_MS;
    const allKeysSorted = Array.from(bucketMap.keys())
      .filter(k => k <= nowBucket)
      .sort((a, b) => a - b);
    if (!allKeysSorted.length) return;
    const usedKeys      = allKeysSorted.slice(-MAX_BARS);

    const labels:    string[] = [];
    const latencies: number[] = [];

    for (const key of usedKeys) {
      const d    = new Date(key);
      const data = bucketMap.get(key)!;
      labels.push(d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      latencies.push(Math.round(data.sumLatency / data.count));
    }

    this.chartData.datasets[0].label = lang === 'fr' ? 'Latence moy. (ms)' : 'Avg Latency (ms)';
    this.chartData.labels            = labels;
    this.chartData.datasets[0].data  = latencies;
    this.chartData.datasets[1].data  = labels.map(() => 2000);

    // Indicateur coin haut-droite = derniere minute
    const lastLatency = latencies[latencies.length - 1];
    const lastLabel   = labels[labels.length - 1];
    this.currentLatency   = lastLatency ?? null;
    this.currentTimestamp = lastLabel ?? null;

    this.chartData = { ...this.chartData };
  }
}
