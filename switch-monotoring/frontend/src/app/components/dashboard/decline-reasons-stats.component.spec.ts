import { DeclineReasonsStatsComponent } from './decline-reasons-stats.component';
import { Transaction } from '../../models';

function tx(overrides: Partial<Transaction>): Transaction {
  return { ...overrides } as Transaction;
}

describe('DeclineReasonsStatsComponent', () => {
  let component: DeclineReasonsStatsComponent;

  beforeEach(() => {
    component = new DeclineReasonsStatsComponent();
  });

  it('devrait retourner des stats vides sans transaction refusee', () => {
    component.transactions = [tx({ status: 'APPROVED' } as any)];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.stats).toEqual([]);
    expect(component.totalDeclined).toBe(0);
  });

  it('devrait calculer le taux global de refus', () => {
    component.transactions = [
      tx({ status: 'APPROVED' } as any),
      tx({ status: 'DECLINED', responseCode: '51' } as any),
    ];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.overallRate).toBe(50);
  });

  it('devrait resoudre le libelle et la categorie depuis CODE_META', () => {
    component.transactions = [tx({ status: 'DECLINED', responseCode: '51' } as any)];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.stats[0].label).toBe('Fonds Insuffisants');
    expect(component.stats[0].category).toBe('Provision');
  });

  it('devrait utiliser un libelle generique pour un code inconnu', () => {
    component.transactions = [tx({ status: 'DECLINED', responseCode: '77' } as any)];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.stats[0].label).toBe('Code 77');
  });

  it('devrait trier les codes par frequence decroissante', () => {
    component.transactions = [
      tx({ status: 'DECLINED', responseCode: '55' } as any),
      tx({ status: 'DECLINED', responseCode: '51' } as any),
      tx({ status: 'DECLINED', responseCode: '51' } as any),
    ];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.stats[0].code).toBe('51');
  });

  it('devrait regrouper au-dela du top 7 dans "Autres"', () => {
    component.transactions = Array.from({ length: 10 }, (_, i) => tx({
      status: 'DECLINED', responseCode: `C${i}`,
    } as any));

    component.ngOnChanges({ transactions: {} as any });

    expect(component.stats.length).toBe(7);
    expect(component.othersCount).toBe(3);
  });

  it('devrait calculer pctOfDeclined correctement', () => {
    component.transactions = [
      tx({ status: 'DECLINED', responseCode: '51' } as any),
      tx({ status: 'DECLINED', responseCode: '51' } as any),
      tx({ status: 'DECLINED', responseCode: '55' } as any),
    ];

    component.ngOnChanges({ transactions: {} as any });

    const rule51 = component.stats.find(s => s.code === '51')!;
    expect(rule51.pctOfDeclined).toBe(67);
  });
});
