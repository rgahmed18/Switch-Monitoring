import { Component, Input, OnChanges, SimpleChanges, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { Transaction } from '../../models';
import { AppStateService } from '../../state.service';

@Component({
  selector: 'app-refusal-stacked',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div class="h-[250px] w-full">
      <canvas baseChart
              [data]="chartData"
              [options]="chartOptions"
              [type]="chartType">
      </canvas>
    </div>
  `
})
export class RefusalStackedComponent implements OnChanges {
  @Input() transactions: Transaction[] = [];

  private readonly appState = inject(AppStateService);

  public chartType: ChartType = 'bar';

  public chartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      { label: 'Approuvées', data: [], backgroundColor: '#22c55e', stack: 'a' },
      { label: 'Refusées',   data: [], backgroundColor: '#ef4444', stack: 'a' },
    ]
  };

  public chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'x',
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 45, autoSkip: false },
        title: { display: true, text: 'Par minute', color: '#64748b', font: { size: 10 } }
      },
      y: {
        stacked: true,
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#64748b', font: { size: 10 } }
      }
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { boxWidth: 12, color: '#64748b', font: { size: 11 } }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(255,255,255,0.97)',
        titleColor: '#1e293b',
        titleFont: { size: 12, weight: 600 },
        bodyColor: '#475569',
        bodyFont: { size: 11 },
        borderColor: 'rgba(0,0,0,0.08)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          title: (ctx: any) => ctx[0]?.label ? `Minute ${ctx[0].label}` : '',
          label: (ctx: any) => `${ctx.dataset.label} : ${ctx.parsed.y || 0} tx`
        }
      }
    }
  };

  constructor() {
    effect(() => {
      const lang = this.appState.lang();
      (this.chartData.datasets[0] as any).label = lang === 'fr' ? 'Approuvées' : 'Approved';
      (this.chartData.datasets[1] as any).label = lang === 'fr' ? 'Refusées'   : 'Declined';
      this.chartData = { ...this.chartData };
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['transactions'] && this.transactions) {
      this.updateChart();
    }
  }

  private updateChart(): void {
    const lang          = this.appState.lang();
    const labelApproved = lang === 'fr' ? 'Approuvées' : 'Approved';
    const labelDeclined = lang === 'fr' ? 'Refusées'   : 'Declined';
    const MAX_BARS      = 30;
    const BUCKET_MS     = 60_000;

    if (!this.transactions.length) {
      this.chartData = { ...this.chartData, labels: [], datasets: [
        { label: labelApproved, data: [], backgroundColor: '#22c55e', stack: 'a' },
        { label: labelDeclined, data: [], backgroundColor: '#ef4444', stack: 'a' },
      ]};
      return;
    }

    // Toutes les transactions sans exclusion de canal (périmètre total)
    // Statut basé uniquement sur tx.status (normalisé par ApiService)
    const bucketMap = new Map<number, { approved: number; declined: number }>();

    for (const tx of this.transactions) {
      const raw = (tx.transmissionDateAndTime || (tx as any).timestamp || '').toString().trim();
      if (!raw) continue;
      const ts = new Date(raw).getTime();
      if (!ts || isNaN(ts) || ts <= 0) continue;

      const key = Math.floor(ts / BUCKET_MS) * BUCKET_MS;
      if (!bucketMap.has(key)) bucketMap.set(key, { approved: 0, declined: 0 });
      const slot = bucketMap.get(key)!;

      const status = (tx.status || '').toUpperCase();
      if (status === 'APPROVED') slot.approved++;
      else                       slot.declined++;
    }

    if (!bucketMap.size) return;

    const nowBucket     = Math.floor(Date.now() / BUCKET_MS) * BUCKET_MS;
    const allKeysSorted = Array.from(bucketMap.keys())
      .filter(k => k <= nowBucket)
      .sort((a, b) => a - b);
    if (!allKeysSorted.length) return;
    const usedKeys = allKeysSorted.slice(-MAX_BARS);

    const final = usedKeys.map(key => {
      const d    = new Date(key);
      const data = bucketMap.get(key)!;
      return {
        label:    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        approved: data.approved,
        declined: data.declined,
      };
    });

    this.chartData.labels                              = final.map(b => b.label);
    this.chartData.datasets[0].label                  = labelApproved;
    this.chartData.datasets[1].label                  = labelDeclined;
    this.chartData.datasets[0].data                   = final.map(b => b.approved);
    this.chartData.datasets[1].data                   = final.map(b => b.declined);
    (this.chartData.datasets[0] as any).backgroundColor = '#22c55e';
    (this.chartData.datasets[1] as any).backgroundColor = '#ef4444';
    this.chartData = { ...this.chartData };
  }
}
