import { ApprovedBySubtypeComponent } from './approved-by-subtype.component';
import { Transaction } from '../../models';

function tx(overrides: Partial<Transaction>): Transaction {
  return { ...overrides } as Transaction;
}

describe('ApprovedBySubtypeComponent', () => {
  let component: ApprovedBySubtypeComponent;

  beforeEach(() => {
    component = new ApprovedBySubtypeComponent();
  });

  it('devrait reinitialiser le graphique si aucune transaction approuvee', () => {
    component.transactions = [tx({ status: 'DECLINED' } as any)];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.labels).toEqual([]);
  });

  it('ne devrait considerer que les transactions au statut APPROVED', () => {
    const now = new Date(); now.setSeconds(0, 0);
    component.transactions = [
      tx({ status: 'DECLINED', transmissionDateAndTime: now.toISOString(), productCode: 'VIS' } as any),
      tx({ status: 'APPROVED', transmissionDateAndTime: now.toISOString(), productCode: 'VIS' } as any),
    ];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.datasets[0].data).toEqual([1]);
  });

  it('devrait classer par reseau via le BIN de la carte', () => {
    const now = new Date(); now.setSeconds(0, 0);
    component.transactions = [
      tx({ status: 'APPROVED', transmissionDateAndTime: now.toISOString(), cardNumberMasked: '4000XXXXXX0000' } as any),
      tx({ status: 'APPROVED', transmissionDateAndTime: now.toISOString(), cardNumberMasked: '5000XXXXXX0000' } as any),
    ];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.datasets[0].data).toEqual([1]); // visa (BIN 4)
    expect(component.chartData.datasets[1].data).toEqual([1]); // mastercard (BIN 5)
  });
});
