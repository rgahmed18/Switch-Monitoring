import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { Transaction } from '../../models';
import { responseCodes } from '../../data/iso8583';

@Component({
  selector: 'app-response-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div class="h-[250px] w-full flex items-center justify-center">
      <canvas baseChart
              [data]="doughnutChartData"
              [options]="doughnutChartOptions"
              [type]="doughnutChartType">
      </canvas>
    </div>
  `
})
export class ResponseChartComponent implements OnChanges {
  @Input() transactions: Transaction[] = [];

  public doughnutChartType: ChartType = 'bar';
  public doughnutChartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: [
      { data: [], backgroundColor: [], borderRadius: 4, hoverBackgroundColor: '#38bdf8' }
    ]
  };

  public doughnutChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
      y: { grid: { color: 'rgba(0, 0, 0, 0.05)' }, ticks: { color: '#64748b', font: { size: 10 } } }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.97)',
        titleColor: '#1e293b',
        bodyColor: '#475569',
        borderColor: 'rgba(0, 0, 0, 0.08)',
        borderWidth: 1
      }
    }
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['transactions'] && this.transactions) {
      this.updateChart();
    }
  }

  private updateChart() {
    if (!this.transactions.length) {
      // Filtre actif ne retournant aucune transaction : vider le graphique
      // plutot que de garder les anciennes donnees affichees.
      this.doughnutChartData.labels = [];
      this.doughnutChartData.datasets[0].data = [];
      (this.doughnutChartData.datasets[0] as any).backgroundColor = [];
      this.doughnutChartData = { ...this.doughnutChartData };
      return;
    }

    const counts = new Map<string, number>();
    this.transactions.forEach(tx => {
      counts.set(tx.responseCode, (counts.get(tx.responseCode) || 0) + 1);
    });

    const labels: string[] = [];
    const data: number[] = [];
    const colors: string[] = [];

    // Sort by count descending to match screenshot style
    const sortedCounts = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

    sortedCounts.forEach(([code, count]) => {
      const severity = responseCodes[code]?.severity || 'error';
      labels.push(code);
      data.push(count);

      if (severity === 'success') colors.push('#22c55e');
      else if (severity === 'warning') colors.push('#f59e0b');
      else colors.push('#ef4444');
    });

    this.doughnutChartData.labels = labels;
    this.doughnutChartData.datasets[0].data = data;
    this.doughnutChartData.datasets[0].backgroundColor = colors;
    
    // trigger change detection
    this.doughnutChartData = { ...this.doughnutChartData };
  }
}
