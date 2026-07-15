import { TestBed } from '@angular/core/testing';
import { TransactionStoreService } from './transaction-store.service';
import { Transaction } from '../models';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    referenceNumber: 'REF1',
    stan: 'STAN1',
    timestamp: new Date().toISOString(),
    ...overrides,
  } as Transaction;
}

describe('TransactionStoreService', () => {
  let service: TransactionStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransactionStoreService);
  });

  it('devrait demarrer avec un store vide', () => {
    expect(service.snapshot).toEqual([]);
    expect(service.bufferSize).toBe(0);
  });

  describe('replaceAll', () => {
    it('devrait remplacer entierement le contenu du store', () => {
      service.replaceAll([tx({ referenceNumber: 'A' })]);
      service.replaceAll([tx({ referenceNumber: 'B' })]);

      expect(service.snapshot.length).toBe(1);
      expect(service.snapshot[0].referenceNumber).toBe('B');
    });

    it('devrait tronquer a MAX_SIZE (2000) transactions', () => {
      const many = Array.from({ length: 2500 }, (_, i) => tx({ referenceNumber: `R${i}` }));

      service.replaceAll(many);

      expect(service.snapshot.length).toBe(2000);
    });
  });

  describe('mergeBatch', () => {
    it('ne devrait rien faire si le batch entrant est vide', () => {
      service.replaceAll([tx({ referenceNumber: 'A' })]);

      service.mergeBatch([]);

      expect(service.snapshot.length).toBe(1);
    });

    it('devrait remplacer les entrees existantes ayant la meme cle (upsert)', () => {
      const fixedTimestamp = '2026-07-14T10:00:00.000Z';
      service.replaceAll([tx({ referenceNumber: 'A', stan: 'S1', timestamp: fixedTimestamp, networkCode: 'OLD' } as any)]);

      service.mergeBatch([tx({ referenceNumber: 'A', stan: 'S1', timestamp: fixedTimestamp, networkCode: 'NEW' } as any)]);

      expect(service.snapshot.length).toBe(1);
      expect((service.snapshot[0] as any).networkCode).toBe('NEW');
    });

    it('devrait conserver les entrees archivees non presentes dans le batch entrant', () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 6);
      service.replaceAll([tx({ referenceNumber: 'OLD', timestamp: oldDate.toISOString() })]);

      service.mergeBatch([tx({ referenceNumber: 'NEW' })]);

      expect(service.snapshot.length).toBe(2);
      expect(service.archivedCount).toBe(1);
    });
  });

  describe('current / archived', () => {
    it('devrait classer une transaction recente dans current', () => {
      service.replaceAll([tx({ referenceNumber: 'RECENT' })]);

      expect(service.current.length).toBe(1);
      expect(service.archived.length).toBe(0);
    });

    it('devrait classer une transaction de plus de 3 mois dans archived', () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 4);
      service.replaceAll([tx({ referenceNumber: 'OLD', timestamp: oldDate.toISOString() })]);

      expect(service.archived.length).toBe(1);
      expect(service.current.length).toBe(0);
    });
  });

  describe('addLive / flushBuffer', () => {
    it('devrait bufferiser une transaction quand isLive=false', () => {
      service.addLive(tx({ referenceNumber: 'BUFFERED' }), false);

      expect(service.bufferSize).toBe(1);
      expect(service.snapshot.length).toBe(0);
    });

    it('devrait fusionner immediatement quand isLive=true', () => {
      service.addLive(tx({ referenceNumber: 'LIVE' }), true);

      expect(service.snapshot.length).toBe(1);
      expect(service.bufferSize).toBe(0);
    });

    it('flushBuffer() devrait injecter les transactions bufferisees dans le store', () => {
      service.addLive(tx({ referenceNumber: 'BUFFERED' }), false);

      service.flushBuffer();

      expect(service.bufferSize).toBe(0);
      expect(service.snapshot.length).toBe(1);
    });

    it('flushBuffer() ne devrait pas dupliquer une transaction deja presente', () => {
      const fixedTimestamp = '2026-07-14T10:00:00.000Z';
      service.addLive(tx({ referenceNumber: 'DUP', stan: 'S1', timestamp: fixedTimestamp }), true);
      service.addLive(tx({ referenceNumber: 'DUP', stan: 'S1', timestamp: fixedTimestamp }), false);

      service.flushBuffer();

      expect(service.snapshot.length).toBe(1);
    });

    it('addLive ne devrait pas ajouter de doublon quand isLive=true pour une cle existante', () => {
      const fixedTimestamp = '2026-07-14T10:00:00.000Z';
      service.addLive(tx({ referenceNumber: 'A', stan: 'S1', timestamp: fixedTimestamp }), true);
      service.addLive(tx({ referenceNumber: 'A', stan: 'S1', timestamp: fixedTimestamp }), true);

      expect(service.snapshot.length).toBe(1);
    });
  });
});
