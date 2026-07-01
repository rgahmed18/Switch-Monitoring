import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { Transaction } from '../../models';

@Component({
  selector: 'app-response-codes',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div>
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-heading font-bold text-foreground tracking-tight">Codes de Réponse ISO 8583</h3>
        <span class="text-xs text-muted-foreground">{{ totalTransactions }} transactions</span>
      </div>
      <div class="h-[320px] w-full">
        <canvas baseChart
                [data]="chartData"
                [options]="chartOptions"
                [type]="chartType">
        </canvas>
      </div>
    </div>
  `
})
export class ResponseCodesComponent implements OnChanges {
  @Input() transactions: Transaction[] = [];
  @Input() responseCodes: { [code: string]: string } = {};

  public chartType: ChartType = 'bar';
  public totalTransactions: number = 0;

  public chartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [],
        label: 'Nombre de transactions',
        backgroundColor: [],
        borderColor: 'transparent',
        borderWidth: 0,
        borderRadius: 4,
        barThickness: 20,
        maxBarThickness: 30
      }
    ],
    labels: []
  };

  public chartOptions: any = {
    indexAxis: 'x',
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(0, 0, 0, 0.05)', drawBorder: false },
        ticks: {
          color: '#94a3b8',
          font: { size: 10 },
          beginAtZero: true,
          callback: (value: any) => Number.isInteger(value) ? value.toString() : ''
        }
      }
    },
    animation: { duration: 400 },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(255, 255, 255, 0.97)',
        titleColor: '#1e293b',
        bodyColor: '#475569',
        borderColor: 'rgba(0, 0, 0, 0.08)',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          title: (context: any) => {
            const code = context[0]?.label || '';
            const description = this.responseCodes[code] || 'Unknown';
            return `Code ${code}  -  ${description}`;
          },
          label: (context: any) => {
            const value = context.parsed.y;
            const pct = this.totalTransactions > 0
              ? ((value / this.totalTransactions) * 100).toFixed(1) : '0.0';
            return `${value} transactions (${pct}%)`;
          }
        }
      }
    }
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['transactions'] || changes['responseCodes']) {
      this.updateChart();
    }
  }

  private updateChart() {
    const codeCount = new Map<string, number>();
    this.transactions.forEach(tx => {
      const code = tx.responseCode || 'UNKNOWN';
      codeCount.set(code, (codeCount.get(code) || 0) + 1);
    });

    const sortedCodes = Array.from(codeCount.entries())
      .sort((a, b) => {
        if (a[0] === '00') return -1;
        if (b[0] === '00') return 1;
        return b[1] - a[1];
      })
      .slice(0, 15);

    this.chartData.labels = sortedCodes.map(([code]) => code);
    this.chartData.datasets[0].data = sortedCodes.map(([_, count]) => count);

    this.chartData.datasets[0].backgroundColor = sortedCodes.map(([code]) => {
      if (code === '00')                                       return '#10b981';
      if (['05','51','54','55'].includes(code))                return '#2563EB';
      if (['91','96'].includes(code))                          return '#ef4444';
      return '#f59e0b';
    });

    this.totalTransactions = this.transactions.length;
    this.chartData = { ...this.chartData };
  }
}
