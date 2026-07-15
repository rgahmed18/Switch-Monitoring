import { TestBed } from '@angular/core/testing';
import { TransactionStatsService } from './transaction-stats.service';
import { Transaction } from '../models';

describe('TransactionStatsService', () => {
  let service: TransactionStatsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransactionStatsService);
  });

  it('devrait retourner des stats a zero pour une liste vide', () => {
    const stats = service.compute([]);

    expect(stats.total).toBe(0);
    expect(stats.approvalRate).toBe(0);
    expect(stats.topErrors).toEqual([]);
  });

  it('devrait compter approved/declined/pending correctement', () => {
    const txs = [
      { status: 'APPROVED' } as Transaction,
      { status: 'APPROVED' } as Transaction,
      { status: 'DECLINED' } as Transaction,
      { status: 'PENDING' } as Transaction,
    ];

    const stats = service.compute(txs);

    expect(stats.total).toBe(4);
    expect(stats.approved).toBe(2);
    expect(stats.declined).toBe(1);
    expect(stats.pending).toBe(1);
  });

  it('devrait calculer le taux d\'approbation arrondi a 1 decimale', () => {
    const txs = [
      { status: 'APPROVED' } as Transaction,
      { status: 'APPROVED' } as Transaction,
      { status: 'DECLINED' } as Transaction,
    ];

    const stats = service.compute(txs);

    expect(stats.approvalRate).toBe(66.7);
  });

  it('devrait calculer la latence moyenne en ignorant les valeurs hors [0, 30000[', () => {
    const txs = [
      { status: 'APPROVED', latencyMs: 100 } as Transaction,
      { status: 'APPROVED', latencyMs: 200 } as Transaction,
      { status: 'APPROVED', latencyMs: 50000 } as Transaction, // hors plage, ignore
      { status: 'APPROVED', latencyMs: 0 } as Transaction,      // ignore (pas > 0)
    ];

    const stats = service.compute(txs);

    expect(stats.avgLatency).toBe(150);
  });

  it('devrait sommer le volume total depuis amount ou transactionAmount', () => {
    const txs = [
      { status: 'APPROVED', amount: 100 } as Transaction,
      { status: 'APPROVED', transactionAmount: 200 } as any,
    ];

    const stats = service.compute(txs);

    expect(stats.totalVolume).toBe(300);
    expect(stats.avgAmount).toBe(150);
  });

  it('devrait extraire le top 5 des codes de refus, tries par frequence decroissante', () => {
    const txs = [
      { status: 'DECLINED', responseCode: '51' } as any,
      { status: 'DECLINED', responseCode: '51' } as any,
      { status: 'DECLINED', responseCode: '55' } as any,
      { status: 'DECLINED', responseCode: '00' } as any, // exclu : code approuve
    ];

    const stats = service.compute(txs);

    expect(stats.topErrors[0].code).toBe('51');
    expect(stats.topErrors[0].count).toBe(2);
    expect(stats.topErrors.find(e => e.code === '00')).toBeUndefined();
  });

  it('devrait calculer le TPS a partir du pic de transactions par minute', () => {
    const baseTime = new Date('2026-07-14T10:00:00Z').getTime();
    const txs = [
      { status: 'APPROVED', timestamp: new Date(baseTime).toISOString() } as any,
      { status: 'APPROVED', timestamp: new Date(baseTime + 1000).toISOString() } as any,
      { status: 'APPROVED', timestamp: new Date(baseTime + 2000).toISOString() } as any,
    ];

    const stats = service.compute(txs);

    // pic = 3 tx dans la meme minute -> tps = 3/60 = 0.05 arrondi 1 decimale
    expect(stats.tps).toBe(0.1);
  });

  it('devrait ignorer les timestamps invalides sans lever d\'exception', () => {
    const txs = [{ status: 'APPROVED', timestamp: 'not-a-date' } as any];

    expect(() => service.compute(txs)).not.toThrow();
  });
});
