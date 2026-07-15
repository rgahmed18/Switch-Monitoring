import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { Transaction } from '../../models';
import { resolveCardNetwork } from '../../data/card-network';

@Component({
  selector: 'app-refusal-by-subtype',
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
export class RefusalBySubtypeComponent implements OnChanges {
  @Input() transactions: Transaction[] = [];

  public chartType: ChartType = 'bar';
  public chartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      { label: 'Visa',       data: [], backgroundColor: '#2563EB', stack: 'a' },
      { label: 'Mastercard', data: [], backgroundColor: '#F97316', stack: 'a' },
      { label: 'Autre',      data: [], backgroundColor: '#94a3b8', stack: 'a' },
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
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
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
          title: (ctx: any) => ctx[0]?.label ? `${ctx[0].label}` : '',
          label: (ctx: any) => `${ctx.dataset.label} : ${ctx.parsed.y || 0} tx`,
          footer: (ctxArr: any[]) => {
            const total = ctxArr.reduce((s, c) => s + (c.parsed.y || 0), 0);
            return total > 0 ? `Total refusées : ${total} tx` : '';
          }
        }
      }
    }
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['transactions'] && this.transactions) {
      this.updateChart();
    }
  }

  private resolveNetwork(tx: Transaction): 'visa' | 'mastercard' | 'other' {
    return resolveCardNetwork(tx);
  }

  private updateChart() {
    const MAX_BARS  = 30;
    const BUCKET_MS = 60_000;

    // Toutes les transactions DÉCLINÉES, tous canaux confondus
    const declined = this.transactions.filter(tx => (tx.status || '').toUpperCase() === 'DECLINED');

    if (!declined.length) {
      this.chartData = { ...this.chartData, labels: [], datasets: [
        { label: 'Visa',       data: [], backgroundColor: '#2563EB', stack: 'a' },
        { label: 'Mastercard', data: [], backgroundColor: '#F97316', stack: 'a' },
        { label: 'Autre',      data: [], backgroundColor: '#94a3b8', stack: 'a' },
      ]};
      return;
    }

    const bucketMap = new Map<number, { visa: number; mastercard: number; other: number }>();

    for (const tx of declined) {
      const raw = ((tx as any).transmissionDateAndTime || (tx as any).timestamp || '').toString().trim();
      if (!raw) continue;
      const ts = new Date(raw).getTime();
      if (!ts || isNaN(ts) || ts <= 0) continue;

      const key = Math.floor(ts / BUCKET_MS) * BUCKET_MS;
      if (!bucketMap.has(key)) bucketMap.set(key, { visa: 0, mastercard: 0, other: 0 });
      const slot = bucketMap.get(key)!;

      const net = this.resolveNetwork(tx);
      slot[net]++;
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
        label:      d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        visa:       data.visa,
        mastercard: data.mastercard,
        other:      data.other,
      };
    });

    this.chartData.labels                              = final.map(b => b.label);
    this.chartData.datasets[0].data                   = final.map(b => b.visa);
    this.chartData.datasets[1].data                   = final.map(b => b.mastercard);
    this.chartData.datasets[2].data                   = final.map(b => b.other);
    (this.chartData.datasets[0] as any).backgroundColor = '#2563EB';
    (this.chartData.datasets[1] as any).backgroundColor = '#F97316';
    (this.chartData.datasets[2] as any).backgroundColor = '#94a3b8';
    this.chartData = { ...this.chartData };
  }
}
