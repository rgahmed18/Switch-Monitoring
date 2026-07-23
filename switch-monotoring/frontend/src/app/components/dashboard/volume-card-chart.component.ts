import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { Transaction } from '../../models';
import { resolveCardNetwork } from '../../data/card-network';

@Component({
  selector: 'app-volume-card-chart',
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
export class VolumeCardChartComponent implements OnChanges {
  @Input() transactions: Transaction[] = [];

  public chartType: ChartType = 'bar';
  public chartData: ChartConfiguration['data'] = {
    labels: ['Visa', 'Mastercard', 'Autres'],
    datasets: [{
      data: [0, 0, 0],
      backgroundColor: ['#2563EB', '#F97316', '#94a3b8'],
      borderColor:     ['#2563EB', '#F97316', '#94a3b8'],
      hoverBackgroundColor: ['#1d4ed8', '#ea6600', '#64748b'],
      borderRadius: 4
    }]
  };

  public chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
      y: { grid: { color: 'rgba(0, 0, 0, 0.05)' }, ticks: { color: '#64748b', font: { size: 10 } } }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.97)',
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
    let visa = 0, mastercard = 0, autres = 0;

    // Ne compter que les transactions dont l'heure de transmission est deja
    // passee (meme principe que volume-chart.component.ts) : le total
    // progresse naturellement minute apres minute au lieu d'afficher
    // immediatement la totalite du jeu de donnees des le premier chargement.
    const nowMs = Date.now();

    // Exclude ATM/GAB  -  they have their own dedicated page
    const eligible = this.transactions.filter(tx => {
      if (tx.channel === 'ATM' || tx.channel === 'GAB') return false;

      const raw = (tx.transmissionDateAndTime || '').toString().trim();
      if (!raw) return false;
      const ts = new Date(raw).getTime();
      if (!ts || isNaN(ts) || ts <= 0) return false;

      return ts <= nowMs;
    });

    eligible.forEach(tx => {
      const network = resolveCardNetwork(tx);
      if (network === 'visa')            visa++;
      else if (network === 'mastercard') mastercard++;
      else                                autres++;
    });

    this.chartData.datasets[0].data = [visa, mastercard, autres];
    this.chartData = { ...this.chartData };
  }
}
