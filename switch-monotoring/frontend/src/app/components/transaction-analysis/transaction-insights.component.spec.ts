import { TestBed } from '@angular/core/testing';
import { TransactionInsightsComponent } from './transaction-insights.component';

describe('TransactionInsightsComponent', () => {
  let component: TransactionInsightsComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new TransactionInsightsComponent());
  });

  it('devrait reinitialiser tous les indicateurs si le filtre ne retourne aucune transaction (pas de valeurs figees)', () => {
    // Bug reel corrige : un early-return sans reset laissait les KPIs
    // (approvalRate, topChannel, topAcquirers...) figes sur le dernier
    // resultat non-vide quand un filtre restrictif retournait 0 transaction.
    component.transactions = [
      { status: 'APPROVED', channel: 'POS', acquirerBank: 'AWB' },
      { status: 'DECLINED', channel: 'ATM', acquirerBank: 'BNP' },
    ];
    component.ngOnChanges();
    expect(component.totalTransactions).toBe(2);

    component.transactions = [];
    component.ngOnChanges();

    expect(component.totalTransactions).toBe(0);
    expect(component.approvedCount).toBe(0);
    expect(component.declinedCount).toBe(0);
    expect(component.approvalRate).toBe(0);
    expect(component.avgLatency).toBe(0);
    expect(component.totalVolume).toBe(0);
    expect(component.topChannel).toBe('');
    expect(component.topChannelCount).toBe(0);
    expect(component.topChannelPercentage).toBe(0);
    expect(component.topAcquirers).toEqual([]);
    expect(component.approvalTrend).toBe(0);
  });

  it('devrait calculer approvalRate/approvedCount/declinedCount via le service de stats', () => {
    component.transactions = [
      { status: 'APPROVED' }, { status: 'APPROVED' }, { status: 'DECLINED' },
    ];
    component.ngOnChanges();

    expect(component.approvedCount).toBe(2);
    expect(component.declinedCount).toBe(1);
    expect(component.approvalRate).toBe(67); // Math.round(66.7)
  });

  it('devrait determiner le canal dominant', () => {
    component.transactions = [
      { channel: 'POS' }, { channel: 'POS' }, { channel: 'ATM' },
    ];
    component.ngOnChanges();

    expect(component.topChannel).toBe('POS');
    expect(component.topChannelCount).toBe(2);
    expect(component.topChannelPercentage).toBe(67);
  });

  it('devrait resoudre le nom complet des acquereurs connus et trier par frequence', () => {
    component.transactions = [
      { acquirerBank: 'AWB' }, { acquirerBank: 'AWB' }, { acquirerBank: 'BNP' },
    ];
    component.ngOnChanges();

    expect(component.topAcquirers[0].name).toBe('Attijariwafa Bank');
    expect(component.topAcquirers[0].count).toBe(2);
  });

  it('devrait utiliser le code brut si l\'acquereur est inconnu', () => {
    component.transactions = [{ acquirerBank: 'XYZ' }];
    component.ngOnChanges();

    expect(component.topAcquirers[0].name).toBe('XYZ');
  });

  it('devrait utiliser "Inconnu" si acquirerBank est absent', () => {
    component.transactions = [{}];
    component.ngOnChanges();

    expect(component.topAcquirers[0].name).toBe('Inconnu');
  });

  it('devrait calculer approvalTrend a 0 sans historique de 48h', () => {
    component.transactions = [{ status: 'APPROVED', timestamp: new Date().toISOString() }];
    component.ngOnChanges();

    expect(component.approvalTrend).toBe(0);
  });

  it('devrait comparer le taux d\'approbation recent (24h) vs precedent (24-48h)', () => {
    const now = Date.now();
    const recentTx = { status: 'APPROVED', timestamp: new Date(now - 1000).toISOString() };
    const previousTx = { status: 'DECLINED', timestamp: new Date(now - 30 * 3600_000).toISOString() };
    component.transactions = [recentTx, previousTx];

    component.ngOnChanges();

    // recent: 100% approved, previous: 0% approved -> trend = +100
    expect(component.approvalTrend).toBe(100);
  });

  it('devrait limiter topAcquirers a 5 entrees', () => {
    component.transactions = Array.from({ length: 10 }, (_, i) => ({ acquirerBank: `BANK${i}` }));

    component.ngOnChanges();

    expect(component.topAcquirers.length).toBe(5);
  });
});
