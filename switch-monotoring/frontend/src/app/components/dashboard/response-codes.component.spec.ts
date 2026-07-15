import { ResponseCodesComponent } from './response-codes.component';
import { Transaction } from '../../models';

function tx(overrides: Partial<Transaction>): Transaction {
  return { ...overrides } as Transaction;
}

describe('ResponseCodesComponent', () => {
  let component: ResponseCodesComponent;

  beforeEach(() => {
    component = new ResponseCodesComponent();
  });

  it('devrait compter les transactions par responseCode', () => {
    component.transactions = [
      tx({ responseCode: '00' } as any),
      tx({ responseCode: '00' } as any),
      tx({ responseCode: '51' } as any),
    ];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.totalTransactions).toBe(3);
    expect(component.chartData.labels).toContain('00');
  });

  it('devrait toujours placer le code 00 en premiere position', () => {
    component.transactions = [
      tx({ responseCode: '51' } as any),
      tx({ responseCode: '51' } as any),
      tx({ responseCode: '51' } as any),
      tx({ responseCode: '00' } as any),
    ];

    component.ngOnChanges({ transactions: {} as any });

    expect((component.chartData.labels as string[])[0]).toBe('00');
  });

  it('devrait limiter aux 15 codes les plus frequents', () => {
    component.transactions = Array.from({ length: 20 }, (_, i) => tx({
      responseCode: `C${i}`,
    } as any));

    component.ngOnChanges({ transactions: {} as any });

    expect((component.chartData.labels as string[]).length).toBe(15);
  });

  it('devrait colorer en vert le code 00', () => {
    component.transactions = [tx({ responseCode: '00' } as any)];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.datasets[0].backgroundColor).toEqual(['#10b981']);
  });

  it('devrait colorer en rouge les codes timeout/systeme (91, 96)', () => {
    component.transactions = [tx({ responseCode: '91' } as any)];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.datasets[0].backgroundColor).toEqual(['#ef4444']);
  });

  it('devrait utiliser UNKNOWN pour un responseCode absent', () => {
    component.transactions = [tx({} as any)];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.labels).toContain('UNKNOWN');
  });
});
