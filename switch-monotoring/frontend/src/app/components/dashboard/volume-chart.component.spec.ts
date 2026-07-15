import { TestBed } from '@angular/core/testing';
import { VolumeChartComponent } from './volume-chart.component';
import { Transaction } from '../../models';

function tx(overrides: Partial<Transaction>): Transaction {
  return { ...overrides } as Transaction;
}

describe('VolumeChartComponent', () => {
  let component: VolumeChartComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new VolumeChartComponent());
  });

  it('ne devrait rien faire si aucune transaction n\'a de timestamp exploitable', () => {
    component.transactions = [tx({} as any)];
    component.ngOnChanges({ transactions: {} as any });

    expect(component.lineChartData.labels).toEqual([]);
  });

  it('devrait regrouper par tranche de 5 minutes et compter approuvees/refusees', () => {
    const now = new Date();
    now.setMinutes(Math.floor(now.getMinutes() / 5) * 5, 0, 0);
    component.transactions = [
      tx({ transmissionDateAndTime: now.toISOString(), status: 'APPROVED', actionCode: '000' } as any),
      tx({ transmissionDateAndTime: now.toISOString(), status: 'DECLINED', actionCode: '051' } as any),
    ];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.lineChartData.datasets[0].data).toEqual([1]);
    expect(component.lineChartData.datasets[1].data).toEqual([1]);
    expect(component.lineChartData.datasets[2].data).toEqual([2]);
  });

  it('devrait ignorer les buckets futurs', () => {
    const future = new Date(Date.now() + 3600_000);
    component.transactions = [tx({ transmissionDateAndTime: future.toISOString() } as any)];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.lineChartData.labels).toEqual([]);
  });

  it('devrait limiter a 48 buckets maximum (4h)', () => {
    const base = Date.now();
    component.transactions = Array.from({ length: 60 }, (_, i) => tx({
      transmissionDateAndTime: new Date(base - (60 - i) * 5 * 60_000).toISOString(),
      status: 'APPROVED', actionCode: '000',
    } as any));

    component.ngOnChanges({ transactions: {} as any });

    expect((component.lineChartData.labels as string[]).length).toBeLessThanOrEqual(48);
  });
});
