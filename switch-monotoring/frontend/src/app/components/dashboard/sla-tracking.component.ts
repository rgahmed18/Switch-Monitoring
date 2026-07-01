import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Transaction } from '../../models';

@Component({
  selector: 'app-sla-tracking',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <h3 class="font-heading font-bold text-foreground tracking-tight mb-5">Suivi SLA</h3>

      <!-- Disponibilité (Uptime) -->
      <div class="mb-5">
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm text-muted-foreground">Disponibilité (Uptime)</label>
          <span class="text-sm font-semibold tabular-nums"
                [ngClass]="uptimePercentage >= 99.0 ? 'text-green-600' : 'text-red-500'">
            {{ uptimePercentage | number:'1.2-2' }}% / {{ slaThresholds.uptime }}%
          </span>
        </div>
        <div class="w-full bg-muted/40 rounded-full h-2.5 overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500"
               [style.width.%]="Math.min(uptimePercentage, 100)"
               [ngClass]="uptimePercentage >= 99.0 ? 'bg-green-500' : 'bg-red-500'">
          </div>
        </div>
      </div>

      <!-- Latence Moyenne -->
      <div class="mb-5">
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm text-muted-foreground">Latence Moyenne</label>
          <span class="text-sm font-semibold tabular-nums"
                [ngClass]="avgLatency <= slaThresholds.latency ? 'text-green-600' : 'text-red-500'">
            {{ avgLatency | number:'1.0-0' }} ms / {{ slaThresholds.latency }} ms
          </span>
        </div>
        <div class="w-full bg-muted/40 rounded-full h-2.5 overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500"
               [style.width.%]="Math.min((1 - avgLatency / slaThresholds.latency) * 100, 100)"
               [ngClass]="avgLatency <= slaThresholds.latency ? 'bg-green-500' : 'bg-red-500'">
          </div>
        </div>
      </div>

      <!-- Taux de Succès -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm text-muted-foreground">Taux de Succès</label>
          <span class="text-sm font-semibold tabular-nums"
                [ngClass]="successRate >= slaThresholds.successRate ? 'text-green-600' : 'text-red-500'">
            {{ successRate | number:'1.1-1' }}% / {{ slaThresholds.successRate }}%
          </span>
        </div>
        <div class="w-full bg-muted/40 rounded-full h-2.5 overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500"
               [style.width.%]="Math.min(successRate, 100)"
               [ngClass]="successRate >= slaThresholds.successRate ? 'bg-green-500' : 'bg-red-500'">
          </div>
        </div>
      </div>
    </div>
  `
})
export class SlaTrackingComponent implements OnChanges {
  @Input() transactions: Transaction[] = [];
  @Input() slaThresholds: any = {};

  public uptimePercentage: number = 0;
  public avgLatency: number = 0;
  public successRate: number = 0;

  Math = Math;

  private defaultThresholds = { uptime: 99.90, latency: 2000, successRate: 95.0 };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['transactions'] || changes['slaThresholds']) {
      this.updateSlaMetrics();
    }
  }

  private updateSlaMetrics() {
    if (!this.slaThresholds || Object.keys(this.slaThresholds).length === 0) {
      this.slaThresholds = this.defaultThresholds;
    }
    if (this.transactions.length > 0) {
      const successfulTx = this.transactions.filter(
        tx => tx.status === 'APPROVED' || tx.status === 'PENDING'
      ).length;
      this.successRate = (successfulTx / this.transactions.length) * 100;

      const txWithLatency = this.transactions.filter(tx => tx.latencyMs);
      if (txWithLatency.length > 0) {
        const totalLatency = txWithLatency.reduce((sum, tx) => sum + (tx.latencyMs || 0), 0);
        this.avgLatency = totalLatency / txWithLatency.length;
      } else {
        this.avgLatency = 0;
      }

      const operationalTx = this.transactions.filter(
        tx => tx.status !== 'TIMEOUT' && tx.status !== 'ERROR'
      ).length;
      this.uptimePercentage = (operationalTx / this.transactions.length) * 100;
    } else {
      this.successRate = 0;
      this.avgLatency = 0;
      this.uptimePercentage = 0;
    }
  }
}
