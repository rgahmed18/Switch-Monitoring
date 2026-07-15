import { TestBed } from '@angular/core/testing';
import { RefusalRateComponent } from './refusal-rate.component';
import { Transaction } from '../../models';

function tx(overrides: Partial<Transaction>): Transaction {
  return { ...overrides } as Transaction;
}

describe('RefusalRateComponent', () => {
  let component: RefusalRateComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new RefusalRateComponent());
  });

  it('ne devrait rien faire si transactions est vide', () => {
    component.transactions = [];
    component.ngOnChanges({ transactions: {} as any });

    expect(component.currentRefusalRate).toBe(0);
  });

  it('devrait calculer le taux de refus global sur toutes les transactions', () => {
    component.transactions = [
      tx({ status: 'APPROVED', actionCode: '000' } as any),
      tx({ status: 'DECLINED', actionCode: '051' } as any),
    ];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.currentRefusalRate).toBe(50);
  });

  it('devrait considerer TIMEOUT/ERROR/BLOCKED comme des refus', () => {
    component.transactions = [
      tx({ status: 'TIMEOUT' } as any),
      tx({ status: 'ERROR' } as any),
      tx({ status: 'BLOCKED' } as any),
      tx({ status: 'APPROVED', actionCode: '000' } as any),
    ];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.currentRefusalRate).toBe(75);
  });

  it('devrait ajouter la ligne de seuil fixe a 30%', () => {
    const now = new Date(); now.setSeconds(0, 0);
    component.transactions = [tx({ transmissionDateAndTime: now.toISOString(), status: 'APPROVED', actionCode: '000' } as any)];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.datasets[1].data.every((v: number) => v === 30)).toBeTrue();
  });

  it('devrait pre-remplir 30 buckets meme sans transaction dans la fenetre recente', () => {
    // Transactions anciennes (hors fenetre de 30 min), donc bucketMap initialise a 0 partout
    component.transactions = [tx({
      transmissionDateAndTime: new Date(Date.now() - 3 * 3600_000).toISOString(),
      status: 'APPROVED', actionCode: '000',
    } as any)];

    component.ngOnChanges({ transactions: {} as any });

    expect((component.chartData.labels as string[]).length).toBe(30);
  });

  it('devrait considerer un actionCode different de 000/00 comme refus', () => {
    component.transactions = [
      tx({ actionCode: '051' } as any),
    ];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.currentRefusalRate).toBe(100);
  });
});
