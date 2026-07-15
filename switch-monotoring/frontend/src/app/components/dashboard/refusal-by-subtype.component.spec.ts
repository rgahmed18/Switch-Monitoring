import { RefusalBySubtypeComponent } from './refusal-by-subtype.component';
import { Transaction } from '../../models';

function tx(overrides: Partial<Transaction>): Transaction {
  return { ...overrides } as Transaction;
}

describe('RefusalBySubtypeComponent', () => {
  let component: RefusalBySubtypeComponent;

  beforeEach(() => {
    component = new RefusalBySubtypeComponent();
  });

  it('devrait reinitialiser le graphique si aucune transaction refusee', () => {
    component.transactions = [tx({ status: 'APPROVED' } as any)];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.labels).toEqual([]);
  });

  it('ne devrait considerer que les transactions au statut DECLINED', () => {
    const now = new Date(); now.setSeconds(0, 0);
    component.transactions = [
      tx({ status: 'APPROVED', transmissionDateAndTime: now.toISOString(), productCode: 'VIS' } as any),
      tx({ status: 'DECLINED', transmissionDateAndTime: now.toISOString(), productCode: 'VIS' } as any),
    ];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.datasets[0].data).toEqual([1]);
  });

  it('devrait classer par reseau (visa/mastercard/other) via productCode', () => {
    const now = new Date(); now.setSeconds(0, 0);
    component.transactions = [
      tx({ status: 'DECLINED', transmissionDateAndTime: now.toISOString(), productCode: 'VIS' } as any),
      tx({ status: 'DECLINED', transmissionDateAndTime: now.toISOString(), productCode: 'MSC' } as any),
      tx({ status: 'DECLINED', transmissionDateAndTime: now.toISOString(), productCode: 'CMI' } as any),
    ];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.datasets[0].data).toEqual([1]); // visa
    expect(component.chartData.datasets[1].data).toEqual([1]); // mastercard
    expect(component.chartData.datasets[2].data).toEqual([1]); // other
  });

  it('devrait ignorer les transactions sans timestamp exploitable', () => {
    component.transactions = [tx({ status: 'DECLINED' } as any)];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.labels).toEqual([]);
  });
});
