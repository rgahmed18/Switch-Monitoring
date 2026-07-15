import { TestBed } from '@angular/core/testing';
import { RefusalStackedComponent } from './refusal-stacked.component';
import { Transaction } from '../../models';
import { AppStateService } from '../../state.service';

function tx(overrides: Partial<Transaction>): Transaction {
  return { ...overrides } as Transaction;
}

describe('RefusalStackedComponent', () => {
  let component: RefusalStackedComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new RefusalStackedComponent());
  });

  it('devrait reinitialiser labels/datasets si transactions est vide', () => {
    component.transactions = [];
    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.labels).toEqual([]);
    expect(component.chartData.datasets[0].data).toEqual([]);
  });

  it('devrait regrouper les transactions par minute et compter approuvees/refusees', () => {
    const now = new Date();
    now.setSeconds(0, 0);
    const isoNow = now.toISOString();

    component.transactions = [
      tx({ transmissionDateAndTime: isoNow, status: 'APPROVED' } as any),
      tx({ transmissionDateAndTime: isoNow, status: 'DECLINED' } as any),
    ];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.datasets[0].data).toEqual([1]);
    expect(component.chartData.datasets[1].data).toEqual([1]);
  });

  it('devrait ignorer les transactions sans timestamp exploitable', () => {
    component.transactions = [tx({ status: 'APPROVED' } as any)];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.labels).toEqual([]);
  });

  it('devrait limiter a 30 buckets (MAX_BARS) les plus recents', () => {
    const base = Date.now();
    component.transactions = Array.from({ length: 40 }, (_, i) => tx({
      transmissionDateAndTime: new Date(base - (40 - i) * 60_000).toISOString(),
      status: 'APPROVED',
    } as any));

    component.ngOnChanges({ transactions: {} as any });

    expect((component.chartData.labels as string[]).length).toBeLessThanOrEqual(30);
  });

  it('devrait utiliser les labels francais par defaut', () => {
    const appState = TestBed.inject(AppStateService);
    appState.lang.set('fr');
    component.transactions = [tx({
      transmissionDateAndTime: new Date().toISOString(),
      status: 'APPROVED',
    } as any)];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.datasets[0].label).toBe('Approuvées');
  });
});
