import { TestBed } from '@angular/core/testing';
import { SummaryWidgetComponent } from './summary-widget.component';
import { Transaction } from '../../models';

function tx(overrides: Partial<Transaction>): Transaction {
  return { ...overrides } as Transaction;
}

describe('SummaryWidgetComponent', () => {
  let component: SummaryWidgetComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new SummaryWidgetComponent());
  });

  it('ne devrait pas recalculer si transactions est vide', () => {
    component.transactions = [];
    component.ngOnChanges({ transactions: {} as any });

    expect(component.approvedCount).toBe(0);
  });

  it('devrait calculer approvedCount/declinedCount via TransactionStatsService', () => {
    component.transactions = [
      tx({ status: 'APPROVED' } as any),
      tx({ status: 'APPROVED' } as any),
      tx({ status: 'DECLINED' } as any),
    ];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.approvedCount).toBe(2);
    expect(component.declinedCount).toBe(1);
    expect(component.successRate).toBe('66.7');
  });

  it('devrait mettre a jour les donnees du donut chart', () => {
    component.transactions = [
      tx({ status: 'APPROVED' } as any),
      tx({ status: 'DECLINED' } as any),
    ];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.datasets[0].data).toEqual([1, 1]);
  });

  it('devrait exposer topErrors depuis le service de stats', () => {
    component.transactions = [
      tx({ status: 'DECLINED', responseCode: '51' } as any),
      tx({ status: 'DECLINED', responseCode: '51' } as any),
    ];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.topErrors[0].code).toBe('51');
    expect(component.topErrors[0].count).toBe(2);
  });
});
