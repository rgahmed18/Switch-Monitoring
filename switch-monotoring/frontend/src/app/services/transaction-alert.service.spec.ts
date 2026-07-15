import { TestBed } from '@angular/core/testing';
import { TransactionAlertService } from './transaction-alert.service';
import { Transaction } from '../models';

describe('TransactionAlertService', () => {
  let service: TransactionAlertService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransactionAlertService);
  });

  describe('processBatch - stats', () => {
    it('devrait reinitialiser les stats a vide pour un lot vide', () => {
      service.processBatch([]);

      expect(service.stats.totalCount).toBe(0);
    });

    it('devrait calculer le taux de refus en excluant les reversals', () => {
      const txs: Transaction[] = [
        { responseCode: '00' } as any,
        { responseCode: '51' } as any,
        { functionCode: '400' } as any, // reversal, exclu du total
      ];

      service.processBatch(txs);

      expect(service.stats.totalCount).toBe(2);
      expect(service.stats.declinedCount).toBe(1);
      expect(service.stats.refusalRate).toBe(50);
    });

    it('devrait compter les reversals via mtiCode 0420/0421', () => {
      const txs: Transaction[] = [
        { responseCode: '00' } as any,
        { mtiCode: '0420' } as any,
      ];

      service.processBatch(txs);

      expect(service.stats.reversalCount).toBe(1);
    });

    it('devrait extraire le top5 des codes de refus dans l\'ordre fixe 51/55/05/54/14', () => {
      const txs: Transaction[] = [
        { responseCode: '51' } as any,
        { responseCode: '51' } as any,
        { responseCode: '55' } as any,
      ];

      service.processBatch(txs);

      const codes = service.stats.top5RejectionCodes.map(s => s.code);
      expect(codes).toEqual(['51', '55']); // 05/54/14 absents car count=0, filtres
      expect(service.stats.top5RejectionCodes[0].count).toBe(2);
    });

    it('devrait reconnaitre un statut approuve via actionCode ou status', () => {
      const txs: Transaction[] = [
        { actionCode: '000' } as any,
        { status: 'APPROVED' } as any,
      ];

      service.processBatch(txs);

      expect(service.stats.declinedCount).toBe(0);
    });
  });

  describe('processBatch - declenchement alertes', () => {
    it('devrait declencher une alerte CRITICAL au-dela de 50% de refus', () => {
      const txs: Transaction[] = Array.from({ length: 10 }, (_, i) => ({
        responseCode: i < 6 ? '51' : '00',
      } as any));

      service.processBatch(txs);

      const critical = service.alerts.find(a => a.type === 'CRITICAL_REFUSAL_RATE');
      expect(critical).toBeTruthy();
      expect(critical?.severity).toBe('critical');
    });

    it('devrait declencher une alerte WARNING entre 35% et 50% de refus', () => {
      const txs: Transaction[] = Array.from({ length: 10 }, (_, i) => ({
        responseCode: i < 4 ? '51' : '00',
      } as any));

      service.processBatch(txs);

      const warning = service.alerts.find(a => a.type === 'HIGH_REFUSAL_RATE');
      expect(warning).toBeTruthy();
    });

    it('ne devrait declencher aucune alerte de refus sous 35%', () => {
      const txs: Transaction[] = Array.from({ length: 10 }, (_, i) => ({
        responseCode: i < 2 ? '51' : '00',
      } as any));

      service.processBatch(txs);

      expect(service.alerts.find(a => a.type === 'CRITICAL_REFUSAL_RATE')).toBeUndefined();
      expect(service.alerts.find(a => a.type === 'HIGH_REFUSAL_RATE')).toBeUndefined();
    });

    it('devrait declencher une alerte INFO si des reversals sont detectes', () => {
      const txs: Transaction[] = [{ mtiCode: '0420' } as any];

      service.processBatch(txs);

      const reversalAlert = service.alerts.find(a => a.type === 'REVERSAL_DETECTED');
      expect(reversalAlert?.severity).toBe('info');
    });

    it('devrait dedupliquer les alertes OPEN du meme type au lieu de les accumuler', () => {
      const highDeclineBatch: Transaction[] = Array.from({ length: 10 }, () => ({
        responseCode: '51',
      } as any));

      service.processBatch(highDeclineBatch);
      service.processBatch(highDeclineBatch);

      const criticalAlerts = service.alerts.filter(a => a.type === 'CRITICAL_REFUSAL_RATE');
      expect(criticalAlerts.length).toBe(1);
    });
  });

  describe('processLive', () => {
    it('devrait declencher une alerte info pour un reversal MTI 0420', () => {
      service.processLive({ mtiCode: '0420', referenceNumber: 'REF1' } as any);

      const alert = service.alerts.find(a => a.type === 'REVERSAL_DETECTED');
      expect(alert?.transactionRef).toBe('REF1');
    });

    it('ne devrait rien declencher pour une transaction non-reversal', () => {
      service.processLive({ mtiCode: '0200' } as any);

      expect(service.alerts.length).toBe(0);
    });
  });

  describe('resolveAlert / reopenAlert', () => {
    it('devrait marquer une alerte comme RESOLVED puis la rouvrir', () => {
      service.processLive({ mtiCode: '0420' } as any);
      const alertId = service.alerts[0].id;

      service.resolveAlert(alertId);
      expect(service.alerts.find(a => a.id === alertId)?.status).toBe('RESOLVED');

      service.reopenAlert(alertId);
      expect(service.alerts.find(a => a.id === alertId)?.status).toBe('OPEN');
    });

    it('devrait recalculer criticalOpenCount apres resolution d\'une alerte critique', () => {
      const highDeclineBatch: Transaction[] = Array.from({ length: 10 }, () => ({
        responseCode: '51',
      } as any));
      service.processBatch(highDeclineBatch);
      const criticalId = service.alerts.find(a => a.severity === 'critical')!.id;

      expect(service.criticalOpenCount).toBe(1);

      service.resolveAlert(criticalId);

      expect(service.criticalOpenCount).toBe(0);
    });
  });

  describe('getResponseCodeLabel', () => {
    it('devrait retourner le libelle francais pour un code connu', () => {
      expect(service.getResponseCodeLabel('51')).toBe('Fonds insuffisants');
    });

    it('devrait retourner un libelle generique pour un code inconnu', () => {
      expect(service.getResponseCodeLabel('999')).toBe('Code 999');
    });
  });
});
