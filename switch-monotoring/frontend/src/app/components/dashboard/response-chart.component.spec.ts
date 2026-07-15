import { ResponseChartComponent } from './response-chart.component';
import { Transaction } from '../../models';

function tx(overrides: Partial<Transaction>): Transaction {
  return { ...overrides } as Transaction;
}

describe('ResponseChartComponent', () => {
  let component: ResponseChartComponent;

  beforeEach(() => {
    component = new ResponseChartComponent();
  });

  it('ne devrait rien faire si transactions est vide', () => {
    component.transactions = [];
    component.ngOnChanges({ transactions: {} as any });

    expect(component.doughnutChartData.labels).toEqual([]);
  });

  it('devrait vider le graphique si le filtre passe d\'un resultat non-vide a vide (pas de donnees figees)', () => {
    component.transactions = [tx({ responseCode: '00' } as any), tx({ responseCode: '51' } as any)];
    component.ngOnChanges({ transactions: {} as any });
    expect((component.doughnutChartData.labels as string[]).length).toBeGreaterThan(0);

    component.transactions = [];
    component.ngOnChanges({ transactions: {} as any });

    expect(component.doughnutChartData.labels).toEqual([]);
    expect(component.doughnutChartData.datasets[0].data).toEqual([]);
  });

  it('devrait compter les occurrences par responseCode', () => {
    component.transactions = [
      tx({ responseCode: '00' } as any),
      tx({ responseCode: '00' } as any),
      tx({ responseCode: '51' } as any),
    ];
    component.ngOnChanges({ transactions: {} as any });

    const labels = component.doughnutChartData.labels as string[];
    const data = component.doughnutChartData.datasets[0].data as number[];
    expect(labels).toContain('00');
    expect(labels).toContain('51');
    expect(data[labels.indexOf('00')]).toBe(2);
  });

  it('devrait trier les codes par frequence decroissante', () => {
    component.transactions = [
      tx({ responseCode: '51' } as any),
      tx({ responseCode: '00' } as any),
      tx({ responseCode: '00' } as any),
      tx({ responseCode: '00' } as any),
    ];
    component.ngOnChanges({ transactions: {} as any });

    const labels = component.doughnutChartData.labels as string[];
    expect(labels[0]).toBe('00'); // le plus frequent en premier
  });

  it('ne devrait pas recalculer si transactions est absent du changement', () => {
    component.transactions = [tx({ responseCode: '00' } as any)];
    component.ngOnChanges({ transactions: {} as any });
    const before = component.doughnutChartData;

    component.ngOnChanges({});

    expect(component.doughnutChartData).toBe(before);
  });
});
