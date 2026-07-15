import { TestBed } from '@angular/core/testing';
import { LatencyChartComponent } from './latency-chart.component';
import { Transaction } from '../../models';

function tx(overrides: Partial<Transaction>): Transaction {
  return { ...overrides } as Transaction;
}

describe('LatencyChartComponent', () => {
  let component: LatencyChartComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new LatencyChartComponent());
  });

  it('ne devrait rien faire si transactions est vide', () => {
    component.transactions = [];
    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.labels).toEqual([]);
  });

  it('devrait calculer la latence moyenne par minute', () => {
    const now = new Date(); now.setSeconds(0, 0);
    component.transactions = [
      tx({ transmissionDateAndTime: now.toISOString(), latencyMs: 100 } as any),
      tx({ transmissionDateAndTime: now.toISOString(), latencyMs: 200 } as any),
    ];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.datasets[0].data).toEqual([150]);
  });

  it('devrait exclure les latences <= 0 ou > 30000ms', () => {
    const now = new Date(); now.setSeconds(0, 0);
    component.transactions = [
      tx({ transmissionDateAndTime: now.toISOString(), latencyMs: 100 } as any),
      tx({ transmissionDateAndTime: now.toISOString(), latencyMs: 0 } as any),
      tx({ transmissionDateAndTime: now.toISOString(), latencyMs: 50000 } as any),
    ];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.datasets[0].data).toEqual([100]);
  });

  it('devrait ajouter une ligne de seuil SLA fixe a 2000ms', () => {
    const now = new Date(); now.setSeconds(0, 0);
    component.transactions = [tx({ transmissionDateAndTime: now.toISOString(), latencyMs: 100 } as any)];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.datasets[1].data).toEqual([2000]);
  });

  it('devrait mettre a jour currentLatency et currentTimestamp sur le dernier bucket', () => {
    const now = new Date(); now.setSeconds(0, 0);
    component.transactions = [tx({ transmissionDateAndTime: now.toISOString(), latencyMs: 300 } as any)];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.currentLatency).toBe(300);
    expect(component.currentTimestamp).not.toBeNull();
  });

  it('devrait ignorer les transactions sans transmissionDateAndTime', () => {
    component.transactions = [tx({ latencyMs: 100 } as any)];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.labels).toEqual([]);
  });
});
