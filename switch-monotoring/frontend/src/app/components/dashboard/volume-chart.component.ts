import { Component, Input, OnChanges, SimpleChanges, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { Transaction } from '../../models';
import { AppStateService } from '../../state.service';

@Component({
  selector: 'app-volume-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div class="h-[300px] w-full">
      <canvas baseChart
              [data]="lineChartData"
              [options]="lineChartOptions"
              [type]="lineChartType">
      </canvas>
    </div>
  `
})
export class VolumeChartComponent implements OnChanges {
  @Input() transactions: Transaction[] = [];

  private readonly appState = inject(AppStateService);

  public lineChartType: ChartType = 'line';
  public lineChartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [],
        label: '',
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        borderColor: '#22c55e',
        pointBackgroundColor: '#22c55e',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(34,197,94,0.8)',
        fill: 'origin',
        tension: 0.4
      },
      {
        data: [],
        label: '',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: '#ef4444',
        pointBackgroundColor: '#ef4444',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(239,68,68,0.8)',
        fill: 'origin',
        tension: 0.4
      },
      {
        data: [],
        label: 'Total',
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        borderColor: '#38bdf8',
        pointBackgroundColor: '#38bdf8',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(56,189,248,0.8)',
        fill: false,
        tension: 0.4,
        borderDash: [4, 4]
      }
    ],
    labels: []
  };

  public lineChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: {
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { color: '#64748b', font: { size: 10 }, maxTicksLimit: 24 },
        title: { display: true, text: '', color: '#475569', font: { size: 11 } }
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { color: '#64748b', font: { size: 11 }, precision: 0 },
        beginAtZero: true,
        title: { display: true, text: '', color: '#475569', font: { size: 11 } }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { color: '#64748b', boxWidth: 12, font: { size: 11 } }
      },
      tooltip: {
        backgroundColor: 'rgba(255,255,255,0.97)',
        titleColor: '#1e293b',
        bodyColor: '#475569',
        borderColor: 'rgba(0,0,0,0.08)',
        borderWidth: 1
      }
    }
  };

  constructor() {
    effect(() => {
      this.applyI18n(this.appState.lang());
    });
  }

  private applyI18n(lang: 'fr' | 'en') {
    this.lineChartData.datasets[0].label = lang === 'fr' ? 'Approuvées' : 'Approved';
    this.lineChartData.datasets[1].label = lang === 'fr' ? 'Refusées'   : 'Declined';

    const xTitle = lang === 'fr' ? 'Heure (tranches de 5 min)' : 'Time (5-min buckets)';
    const yTitle = lang === 'fr' ? 'Nombre de transactions'    : 'Number of transactions';

    if (this.lineChartOptions?.scales?.['x']?.title) {
      (this.lineChartOptions.scales['x'].title as any).text = xTitle;
    }
    if (this.lineChartOptions?.scales?.['y']?.title) {
      (this.lineChartOptions.scales['y'].title as any).text = yTitle;
    }

    this.lineChartData    = { ...this.lineChartData };
    this.lineChartOptions = { ...this.lineChartOptions };
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['transactions'] && this.transactions) {
      this.updateChart();
    }
  }

  private updateChart() {
    const lang         = this.appState.lang();
    const BUCKET_MS    = 5 * 60_000;   // tranche de 5 minutes
    const MAX_BUCKETS  = 48;           // 4 heures max affichées

    // ── Étape 1 : buckétiser uniquement depuis transmissionDateAndTime ─────────
    // On ignore tx.timestamp (peut contenir une date sans heure réelle)
    // On exclut tout bucket dont la clé dépasse l'heure actuelle (Maroc = Date.now())
    const nowMs        = Date.now();
    const nowBucketKey = Math.floor(nowMs / BUCKET_MS) * BUCKET_MS;

    const bucketMap = new Map<number, { total: number; approved: number; declined: number }>();

    for (const tx of this.transactions) {
      const raw = (tx.transmissionDateAndTime || '').toString().trim();
      if (!raw) continue;
      const ts = new Date(raw).getTime();
      if (!ts || isNaN(ts) || ts <= 0) continue;

      // Ignorer les buckets futurs
      const key = Math.floor(ts / BUCKET_MS) * BUCKET_MS;
      if (key > nowBucketKey) continue;

      if (!bucketMap.has(key)) bucketMap.set(key, { total: 0, approved: 0, declined: 0 });
      const slot = bucketMap.get(key)!;
      slot.total++;

      const ac = (tx.actionCode || '').trim();
      const isApproved = tx.status === 'APPROVED' || ac === '000' || ac === '00';
      const isDeclined = tx.status === 'DECLINED'
                      || (ac !== '' && ac !== '000' && ac !== '00');
      if (isApproved) slot.approved++;
      if (isDeclined) slot.declined++;
    }

    if (!bucketMap.size) return;

    // ── Étape 2 : trier et prendre les MAX_BUCKETS derniers ──────────────────
    const sortedKeys = Array.from(bucketMap.keys())
      .sort((a, b) => a - b)
      .slice(-MAX_BUCKETS);

    // ── Étape 3 : construire labels et données ────────────────────────────────
    const labels:    string[] = [];
    const approved:  number[] = [];
    const declined:  number[] = [];
    const totals:    number[] = [];

    for (const key of sortedKeys) {
      const d    = new Date(key);
      const data = bucketMap.get(key)!;
      labels.push(d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      approved.push(data.approved);
      declined.push(data.declined);
      totals.push(data.total);
    }

    // ── Étape 4 : mettre à jour le graphe ────────────────────────────────────
    this.lineChartData.labels            = labels;
    this.lineChartData.datasets[0].label = lang === 'fr' ? 'Approuvées' : 'Approved';
    this.lineChartData.datasets[1].label = lang === 'fr' ? 'Refusées'   : 'Declined';
    this.lineChartData.datasets[0].data  = approved;
    this.lineChartData.datasets[1].data  = declined;
    this.lineChartData.datasets[2].data  = totals;

    const xTitle = lang === 'fr' ? 'Heure (tranches de 5 min)' : 'Time (5-min buckets)';
    const yTitle = lang === 'fr' ? 'Nombre de transactions'    : 'Number of transactions';
    if (this.lineChartOptions?.scales?.['x']?.title) {
      (this.lineChartOptions.scales['x'].title as any).text = xTitle;
    }
    if (this.lineChartOptions?.scales?.['y']?.title) {
      (this.lineChartOptions.scales['y'].title as any).text = yTitle;
    }

    this.lineChartData    = { ...this.lineChartData };
    this.lineChartOptions = { ...this.lineChartOptions };
  }
}
