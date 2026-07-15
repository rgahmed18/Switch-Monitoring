import { SlaTrackingComponent } from './sla-tracking.component';
import { Transaction } from '../../models';

function tx(overrides: Partial<Transaction>): Transaction {
  return { ...overrides } as Transaction;
}

describe('SlaTrackingComponent', () => {
  let component: SlaTrackingComponent;

  beforeEach(() => {
    component = new SlaTrackingComponent();
  });

  it('devrait rester a zero sans transactions', () => {
    component.transactions = [];
    component.ngOnChanges({ transactions: {} as any });

    expect(component.successRate).toBe(0);
    expect(component.avgLatency).toBe(0);
    expect(component.uptimePercentage).toBe(0);
  });

  it('devrait utiliser les seuils par defaut si aucun n\'est fourni', () => {
    component.transactions = [tx({ status: 'APPROVED' } as any)];
    component.slaThresholds = {};

    component.ngOnChanges({ transactions: {} as any });

    expect(component.slaThresholds.uptime).toBe(99.90);
  });

  it('devrait calculer le successRate en ne comptant que APPROVED comme reussi (coherent avec TransactionStatsService)', () => {
    component.transactions = [
      tx({ status: 'APPROVED' } as any),
      tx({ status: 'PENDING' } as any),
      tx({ status: 'DECLINED' } as any),
      tx({ status: 'DECLINED' } as any),
    ];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.successRate).toBe(25);
  });

  it('devrait calculer la latence moyenne uniquement sur les tx avec latencyMs', () => {
    component.transactions = [
      tx({ status: 'APPROVED', latencyMs: 100 } as any),
      tx({ status: 'APPROVED', latencyMs: 200 } as any),
      tx({ status: 'APPROVED' } as any), // pas de latencyMs, ignore
    ];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.avgLatency).toBe(150);
  });

  it('devrait calculer uptimePercentage en excluant TIMEOUT et ERROR', () => {
    component.transactions = [
      tx({ status: 'APPROVED' } as any),
      tx({ status: 'TIMEOUT' } as any),
      tx({ status: 'ERROR' } as any),
      tx({ status: 'DECLINED' } as any),
    ];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.uptimePercentage).toBe(50);
  });

  it('ne devrait pas recalculer si ni transactions ni slaThresholds n\'ont change', () => {
    component.transactions = [tx({ status: 'APPROVED' } as any)];
    component.ngOnChanges({ transactions: {} as any });
    const before = component.successRate;

    component.ngOnChanges({});

    expect(component.successRate).toBe(before);
  });
});
