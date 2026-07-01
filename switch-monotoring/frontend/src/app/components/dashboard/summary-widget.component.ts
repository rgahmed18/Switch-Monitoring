import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { Transaction } from '../../models';
import { TranslateService } from '../../services/translate.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TransactionStatsService } from '../../services/transaction-stats.service';

@Component({
  selector: 'app-summary-widget',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, TranslatePipe],
  template: `
    <div class="bg-card rounded-xl border border-border/40 p-6 shadow-md">
      <h3 class="text-sm font-bold text-foreground tracking-tight mb-5">{{ 'summary.title' | translate }}</h3>

      <div class="flex flex-col md:flex-row gap-6 items-start">

        <!-- ── Donut ── -->
        <div class="flex flex-col items-center gap-3 shrink-0">
          <div class="relative h-[160px] w-[160px]">
            <canvas baseChart
                    [data]="chartData"
                    [options]="chartOptions"
                    [type]="chartType">
            </canvas>
            <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-0.5">
              <span class="text-2xl font-bold text-foreground tabular-nums">{{ transactions.length }}</span>
              <span class="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">transactions</span>
            </div>
          </div>
          <!-- Légende -->
          <div class="flex flex-col gap-1.5 text-[11px] font-medium">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span class="text-muted-foreground">{{ 'summary.approved' | translate }}</span>
              <span class="ml-auto font-bold text-emerald-400 tabular-nums">{{ approvedCount }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></span>
              <span class="text-muted-foreground">{{ 'summary.declined' | translate }}</span>
              <span class="ml-auto font-bold text-red-400 tabular-nums">{{ declinedCount }}</span>
            </div>
          </div>
        </div>

        <!-- ── Statistiques ── -->
        <div class="flex-1 flex flex-col justify-center divide-y divide-border/30">

          <div class="flex items-center justify-between py-2.5">
            <span class="text-xs text-muted-foreground">{{ 'summary.total' | translate }}</span>
            <span class="text-sm font-bold tabular-nums text-foreground">{{ transactions.length }}</span>
          </div>

          <div class="flex items-center justify-between py-2.5">
            <span class="text-xs text-muted-foreground">{{ 'summary.successRate' | translate }}</span>
            <span class="text-sm font-bold tabular-nums text-emerald-400">{{ successRate }}%</span>
          </div>

          <div class="flex items-center justify-between py-2.5">
            <span class="text-xs text-muted-foreground">{{ 'summary.approved' | translate }}</span>
            <div class="flex items-center gap-2">
              <div class="w-24 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                <div class="h-full rounded-full bg-emerald-500 transition-all"
                     [style.width.%]="(approvedCount + declinedCount) ? (approvedCount / (approvedCount + declinedCount) * 100) : 0"></div>
              </div>
              <span class="text-sm font-bold tabular-nums text-emerald-400 w-8 text-right">{{ approvedCount }}</span>
            </div>
          </div>

          <div class="flex items-center justify-between py-2.5">
            <span class="text-xs text-muted-foreground">{{ 'summary.declined' | translate }}</span>
            <div class="flex items-center gap-2">
              <div class="w-24 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                <div class="h-full rounded-full bg-red-500 transition-all"
                     [style.width.%]="(approvedCount + declinedCount) ? (declinedCount / (approvedCount + declinedCount) * 100) : 0"></div>
              </div>
              <span class="text-sm font-bold tabular-nums text-red-400 w-8 text-right">{{ declinedCount }}</span>
            </div>
          </div>

          <div class="flex items-center justify-between py-2.5">
            <span class="text-xs text-muted-foreground">{{ 'summary.avgLatency' | translate }}</span>
            <span class="text-sm font-bold tabular-nums"
                  [ngClass]="avgLatency < 2000 ? 'text-emerald-400' : 'text-red-400'">{{ avgLatency }} ms</span>
          </div>

          <div class="flex items-center justify-between py-2.5">
            <span class="text-xs text-muted-foreground">{{ 'summary.tps' | translate }}</span>
            <span class="text-sm font-bold tabular-nums text-sky-400">{{ tps }}</span>
          </div>

          <div class="flex items-center justify-between py-2.5">
            <span class="text-xs text-muted-foreground">{{ 'summary.activeAlerts' | translate }}</span>
            <span class="text-sm font-bold tabular-nums"
                  [ngClass]="alertsCount > 0 ? 'text-red-400' : 'text-muted-foreground'">{{ alertsCount }}</span>
          </div>

        </div>

        <!-- ── Top Erreurs ── -->
        <div class="w-full md:w-64 shrink-0 bg-muted/10 rounded-lg border border-border/30 p-4">
          <h4 class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-3">{{ 'summary.topCodes' | translate }}</h4>
          <div class="space-y-2.5 overflow-y-auto max-h-[200px]">
            <div *ngFor="let err of topErrors; let i = index"
                 class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-[10px] font-mono font-bold text-red-400 shrink-0 w-7">{{ err.code }}</span>
                <span class="text-xs text-muted-foreground truncate" [title]="err.desc">{{ err.desc }}</span>
              </div>
              <span class="text-xs font-bold font-mono tabular-nums shrink-0 text-foreground
                           bg-muted/40 border border-border/30 px-2 py-0.5 rounded">{{ err.count }}</span>
            </div>
            <div *ngIf="topErrors.length === 0"
                 class="text-xs text-muted-foreground italic text-center py-4">
              {{ 'summary.noDeclines' | translate }}
            </div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class SummaryWidgetComponent implements OnChanges {
  @Input() transactions: Transaction[] = [];
  @Input() alertsCount: number = 0;

  private readonly statsService = inject(TransactionStatsService);

  successRate = '0.0';
  avgLatency  = 0;
  tps         = '0.0';
  approvedCount = 0;
  declinedCount = 0;
  topErrors: { code: string; desc: string; count: number }[] = [];

  public chartType: ChartType = 'doughnut';
  public chartData: ChartConfiguration['data'] = {
    labels: ['Approuvées', 'Refusées'],
    datasets: [{
      data: [0, 0],
      backgroundColor: ['#22c55e', '#ef4444'],
      borderWidth: 0,
      hoverOffset: 6,
    }]
  };

  public chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(255,255,255,0.97)',
        titleColor: '#1e293b',
        bodyColor: '#475569',
        borderColor: 'rgba(0,0,0,0.08)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (ctx: any) => ` ${ctx.label}: ${ctx.parsed} (${
            (this.approvedCount + this.declinedCount)
              ? ((ctx.parsed / (this.approvedCount + this.declinedCount)) * 100).toFixed(1)
              : 0
          }%)`,
        },
      },
    },
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['transactions'] && this.transactions.length) {
      this.calculateStats();
    }
  }

  private calculateStats(): void {
    const s = this.statsService.compute(this.transactions);

    this.approvedCount = s.approved;
    this.declinedCount = s.declined;
    this.successRate   = s.approvalRate.toFixed(1);
    this.avgLatency    = s.avgLatency;
    this.tps           = s.tps.toFixed(1);
    this.topErrors     = s.topErrors;

    this.chartData.datasets[0].data = [s.approved, s.declined];
    this.chartData = { ...this.chartData };
  }
}
