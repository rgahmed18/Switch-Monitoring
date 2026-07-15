import { VolumeCardChartComponent } from './volume-card-chart.component';
import { Transaction } from '../../models';

function tx(overrides: Partial<Transaction>): Transaction {
  return { ...overrides } as Transaction;
}

describe('VolumeCardChartComponent', () => {
  let component: VolumeCardChartComponent;

  beforeEach(() => {
    component = new VolumeCardChartComponent();
  });

  it('devrait initialiser le graphique avec des donnees a zero', () => {
    expect(component.chartData.datasets[0].data).toEqual([0, 0, 0]);
  });

  it('devrait classer une transaction Visa via networkCode 01', () => {
    component.transactions = [tx({ channel: 'POS', networkCode: '01' } as any)];
    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.datasets[0].data).toEqual([1, 0, 0]);
  });

  it('devrait classer une transaction Mastercard via networkCode 02', () => {
    component.transactions = [tx({ channel: 'POS', networkCode: '02' } as any)];
    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.datasets[0].data).toEqual([0, 1, 0]);
  });

  it('devrait classer via le BIN de la carte si networkCode absent', () => {
    component.transactions = [
      tx({ channel: 'POS', cardNumberMasked: '400000XXXXXX7750' } as any),
      tx({ channel: 'POS', cardNumberMasked: '540000XXXXXX1234' } as any),
    ];
    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.datasets[0].data).toEqual([1, 1, 0]);
  });

  it('devrait classer dans "autres" si aucun critere Visa/Mastercard ne matche', () => {
    component.transactions = [tx({ channel: 'POS', cardNumberMasked: '600000XXXXXX0000' } as any)];
    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.datasets[0].data).toEqual([0, 0, 1]);
  });

  it('devrait exclure les transactions ATM/GAB du calcul', () => {
    component.transactions = [
      tx({ channel: 'ATM', networkCode: '01' } as any),
      tx({ channel: 'GAB', networkCode: '01' } as any),
      tx({ channel: 'POS', networkCode: '01' } as any),
    ];
    component.ngOnChanges({ transactions: {} as any });

    expect(component.chartData.datasets[0].data).toEqual([1, 0, 0]);
  });

  it('ne devrait pas recalculer si transactions est absent du changement', () => {
    const before = component.chartData.datasets[0].data;

    component.ngOnChanges({});

    expect(component.chartData.datasets[0].data).toBe(before);
  });
});
