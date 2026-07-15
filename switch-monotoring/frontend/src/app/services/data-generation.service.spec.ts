import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { DataGenerationService } from './data-generation.service';

describe('DataGenerationService', () => {
  let service: DataGenerationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DataGenerationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('generateMockTransactions', () => {
    it('devrait generer exactement le nombre de transactions demande', () => {
      const txs = service.generateMockTransactions(50);

      expect(txs.length).toBe(50);
    });

    it('devrait generer des transactionId uniques', () => {
      const txs = service.generateMockTransactions(200);

      const ids = new Set(txs.map(t => t.transactionId));
      expect(ids.size).toBe(200);
    });

    it('devrait trier les transactions par ordre chronologique croissant', () => {
      const txs = service.generateMockTransactions(100);

      for (let i = 1; i < txs.length; i++) {
        expect((txs[i].timestamp as Date).getTime())
          .toBeGreaterThanOrEqual((txs[i - 1].timestamp as Date).getTime());
      }
    });

    it('devrait repartir les transactions sur les 3 canaux GAB/POS/ECOM', () => {
      const txs = service.generateMockTransactions(500);

      const channels = new Set(txs.map(t => t.channel));
      expect(channels.has('GAB')).toBeTrue();
      expect(channels.has('POS')).toBeTrue();
      expect(channels.has('ECOM')).toBeTrue();
    });

    it('devrait generer une majorite de transactions approuvees (code 000)', () => {
      const txs = service.generateMockTransactions(1000);

      const approved = txs.filter(t => t.actionCode === '000').length;
      // Poids configure a 65% -- on verifie une plage large et tolerante
      expect(approved / txs.length).toBeGreaterThan(0.5);
      expect(approved / txs.length).toBeLessThan(0.8);
    });

    it('devrait marquer certaines transactions comme reversal (MTI 1420)', () => {
      const txs = service.generateMockTransactions(200);

      const reversals = txs.filter(t => t.mti === '1420');
      expect(reversals.length).toBeGreaterThan(0);
      expect(reversals.every(t => t.reversalFlag === 'Y')).toBeTrue();
    });

    it('devrait laisser authorizationCode vide pour les transactions refusees', () => {
      const txs = service.generateMockTransactions(200);

      const declined = txs.filter(t => t.actionCode !== '000');
      expect(declined.length).toBeGreaterThan(0);
      expect(declined.every(t => t.authorizationCode === '')).toBeTrue();
    });

    it('devrait ajouter des donnees EMV/chip uniquement pour les entryMode 05/07', () => {
      const txs = service.generateMockTransactions(500);

      const chipTxs = txs.filter(t => t.chipTvr !== undefined);
      expect(chipTxs.length).toBeGreaterThan(0);
      expect(chipTxs.every(t => t.securityVerifLevel === 'EMV')).toBeTrue();
    });

    it('devrait utiliser 3DS pour tous les ECOM', () => {
      const txs = service.generateMockTransactions(500);

      const ecomTxs = txs.filter(t => t.channel === 'ECOM');
      expect(ecomTxs.length).toBeGreaterThan(0);
      expect(ecomTxs.every(t => t.securityVerifLevel === '3DS')).toBeTrue();
    });

    it('devrait accepter un nombre de jours personnalise sans erreur', () => {
      expect(() => service.generateMockTransactions(20, 30)).not.toThrow();
    });
  });

  describe('injectTransactionsToBackend', () => {
    it('devrait poster le batch de transactions vers /transactions/batch-inject', () => {
      const txs = service.generateMockTransactions(5);

      service.injectTransactionsToBackend(txs).subscribe();

      const req = httpMock.expectOne(r => r.url.endsWith('/transactions/batch-inject'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(txs);
      req.flush({ success: true });
    });
  });

  describe('methodes utilitaires (dashboard demo data)', () => {
    it('generateHeatmapData() devrait retourner une entree par banque et 24 heures chacune', () => {
      const data = service.generateHeatmapData();

      const bankKeys = Object.keys(data);
      expect(bankKeys.length).toBe(10);
      expect(Object.keys(data[bankKeys[0]]).length).toBe(24);
    });

    it('generateLinkAvailabilityData() devrait retourner 10 banques avec uptime/status', () => {
      const data = service.generateLinkAvailabilityData();

      expect(data.length).toBe(10);
      expect(data[0].uptime).toBeGreaterThanOrEqual(95);
    });

    it('generateReversalData() devrait retourner 24 lignes avec un taux de reversal proche de 5%', () => {
      const data = service.generateReversalData();

      expect(data.length).toBe(24);
      // revCount = Math.floor(txCount * 0.05) : l'arrondi par troncature peut
      // faire devier le taux reel de quelques dixiemes selon txCount, d'ou la tolerance.
      data.forEach((row: any) => {
        expect(row.reversalRate).toBeGreaterThan(3);
        expect(row.reversalRate).toBeLessThanOrEqual(5);
      });
    });

    it('generateBusinessLossData() devrait retourner des totaux fixes', () => {
      const data = service.generateBusinessLossData();

      expect(data.totalLoss).toBe(1_200_000);
    });

    it('generateEntryModeData() devrait retourner les 3 modes d\'entree', () => {
      const data = service.generateEntryModeData();

      expect(data.contactless).toBeDefined();
      expect(data.chip).toBeDefined();
      expect(data.manual).toBeDefined();
    });

    it('generateTop5MCCData() devrait retourner exactement 5 entrees', () => {
      const data = service.generateTop5MCCData();

      expect(data.length).toBe(5);
    });

    it('generatePayloadSizeData() devrait retourner 5 tailles de payload croissantes', () => {
      const data = service.generatePayloadSizeData();

      expect(data.length).toBe(5);
      expect(data.map((r: any) => r.size)).toEqual([200, 400, 600, 800, 1000]);
    });
  });
});
