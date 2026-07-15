import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError, Subject, BehaviorSubject } from 'rxjs';
import { AlertesComponent } from './alertes.component';
import { ApiService } from '../../api.service';
import { ProjectFilterService } from '../../services/project-filter.service';
import { TransactionAlertService, TransactionAlert, AlertStats } from '../../services/transaction-alert.service';
import { Transaction, AlertEvent } from '../../models';

function tx(overrides: Partial<Transaction>): Transaction {
  return { ...overrides } as Transaction;
}

function liveAlert(overrides: Partial<TransactionAlert>): TransactionAlert {
  return {
    id: 'a1', type: 'HIGH_REFUSAL_RATE', severity: 'warning', title: 'T', details: 'D',
    status: 'OPEN', createdAt: new Date('2026-07-14T10:00:00'), ...overrides,
  };
}

function emptyStats(): AlertStats {
  return { totalCount: 0, declinedCount: 0, refusalRate: 0, reversalCount: 0, criticalOpenCount: 0, top5RejectionCodes: [] };
}

describe('AlertesComponent', () => {
  let component: AlertesComponent;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let alertSvcSpy: jasmine.SpyObj<TransactionAlertService>;
  let alerts$: BehaviorSubject<TransactionAlert[]>;
  let stats$: BehaviorSubject<AlertStats>;
  let activeProject$: Subject<string>;

  beforeEach(() => {
    activeProject$ = new Subject<string>();
    alerts$ = new BehaviorSubject<TransactionAlert[]>([]);
    stats$ = new BehaviorSubject<AlertStats>(emptyStats());

    apiSpy = jasmine.createSpyObj('ApiService', [
      'getTransactions', 'getAlerts', 'invalidateTransactionCache',
    ]);
    apiSpy.getTransactions.and.returnValue(of([]));
    apiSpy.getAlerts.and.returnValue(of([]));

    alertSvcSpy = jasmine.createSpyObj('TransactionAlertService',
      ['processBatch', 'resolveAlert', 'reopenAlert', 'getResponseCodeLabel'],
      { alerts$: alerts$.asObservable(), stats$: stats$.asObservable() },
    );
    alertSvcSpy.getResponseCodeLabel.and.returnValue('Libelle');

    const projectFilterSpy = jasmine.createSpyObj('ProjectFilterService', [], {
      activeProject$: activeProject$.asObservable(),
      activeProjectName: 'AWB',
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: apiSpy },
        { provide: ProjectFilterService, useValue: projectFilterSpy },
        { provide: TransactionAlertService, useValue: alertSvcSpy },
      ],
    });

    component = new AlertesComponent(apiSpy, projectFilterSpy, alertSvcSpy);
  });

  afterEach(() => component.ngOnDestroy());

  describe('ngOnInit / chargement', () => {
    it('devrait charger les transactions et appeler processBatch', fakeAsync(() => {
      apiSpy.getTransactions.and.returnValue(of([tx({ referenceNumber: 'A' })]));

      component.ngOnInit();
      activeProject$.next('');
      tick(300);

      expect(component.transactions.length).toBe(1);
      expect(alertSvcSpy.processBatch).toHaveBeenCalled();
      expect(component.isLoading).toBeFalse();
    }));

    it('devrait gerer une erreur de chargement transactions sans planter', () => {
      apiSpy.getTransactions.and.returnValue(throwError(() => new Error('down')));

      component.ngOnInit();

      expect(() => activeProject$.next('')).not.toThrow();
      expect(component.isLoading).toBeFalse();
    });

    it('devrait charger les alertes DB', () => {
      const dbAlert: AlertEvent = {
        id: 1, severity: 'critical', title: 'DB Alert', details: 'x',
        status: 'OPEN', createdAt: '2026-07-14T09:00:00',
      } as AlertEvent;
      apiSpy.getAlerts.and.returnValue(of([dbAlert]));

      component.ngOnInit();

      expect(component.allAlerts.some(a => a.source === 'db')).toBeTrue();
    });

    it('devrait ignorer silencieusement une erreur de chargement des alertes DB', () => {
      apiSpy.getAlerts.and.returnValue(throwError(() => new Error('down')));

      expect(() => component.ngOnInit()).not.toThrow();
    });

    it('devrait mettre a jour stats depuis stats$', () => {
      component.ngOnInit();
      const s: AlertStats = { ...emptyStats(), totalCount: 10, declinedCount: 4, refusalRate: 40 };

      stats$.next(s);

      expect(component.stats.totalCount).toBe(10);
      expect(component.stats.refusalRate).toBe(40);
    });
  });

  describe('fusion des alertes (allAlerts / compteurs KPI)', () => {
    beforeEach(() => component.ngOnInit());

    it('devrait fusionner alertes live et DB triees par date decroissante', () => {
      alerts$.next([
        liveAlert({ id: 'live1', createdAt: new Date('2026-07-14T08:00:00') }),
      ]);
      apiSpy.getAlerts.and.returnValue(of([
        { id: 2, severity: 'info', title: 'Old', details: '', status: 'OPEN', createdAt: '2026-07-14T12:00:00' } as AlertEvent,
      ]));

      component.ngOnInit();

      expect(component.allAlerts[0].source).toBe('db');
    });

    it('criticalOpenCount ne devrait compter que les alertes live critiques ouvertes', () => {
      alerts$.next([
        liveAlert({ id: '1', severity: 'critical', status: 'OPEN' }),
        liveAlert({ id: '2', severity: 'critical', status: 'RESOLVED' }),
        liveAlert({ id: '3', severity: 'warning', status: 'OPEN' }),
      ]);

      expect(component.criticalOpenCount).toBe(1);
    });

    it('warningOpenCount et infoOpenCount devraient filtrer par severite', () => {
      alerts$.next([
        liveAlert({ id: '1', severity: 'warning', status: 'OPEN' }),
        liveAlert({ id: '2', severity: 'info', status: 'OPEN' }),
        liveAlert({ id: '3', severity: 'info', status: 'OPEN' }),
      ]);

      expect(component.warningOpenCount).toBe(1);
      expect(component.infoOpenCount).toBe(2);
    });

    it('openAlerts devrait exclure les alertes DB et les alertes resolues', () => {
      alerts$.next([
        liveAlert({ id: '1', status: 'OPEN' }),
        liveAlert({ id: '2', status: 'RESOLVED' }),
      ]);

      expect(component.openAlerts.map(a => a.id)).toEqual(['1']);
    });

    it('resolvedAlerts devrait inclure toutes les alertes DB et les live resolues', () => {
      alerts$.next([
        liveAlert({ id: '1', status: 'OPEN' }),
        liveAlert({ id: '2', status: 'RESOLVED' }),
      ]);
      apiSpy.getAlerts.and.returnValue(of([
        { id: 9, severity: 'info', title: 'X', details: '', status: 'OPEN', createdAt: '2026-07-14T00:00:00' } as AlertEvent,
      ]));
      component.ngOnInit();

      const ids = component.resolvedAlerts.map(a => a.id);
      expect(ids).toContain('2');
      expect(ids).toContain('9');
    });
  });

  describe('toggleResolved', () => {
    beforeEach(() => component.ngOnInit());

    it('devrait appeler resolveAlert() pour une alerte live ouverte', () => {
      const alert = { id: 'live1', severity: 'warning' as const, title: '', details: '', status: 'OPEN' as const, createdAt: new Date(), source: 'live' as const };

      component.toggleResolved(alert);

      expect(alertSvcSpy.resolveAlert).toHaveBeenCalledWith('live1');
    });

    it('devrait appeler reopenAlert() pour une alerte live resolue', () => {
      const alert = { id: 'live1', severity: 'warning' as const, title: '', details: '', status: 'RESOLVED' as const, createdAt: new Date(), source: 'live' as const };

      component.toggleResolved(alert);

      expect(alertSvcSpy.reopenAlert).toHaveBeenCalledWith('live1');
    });

    it('devrait basculer localement le statut d\'une alerte DB sans appeler le service live', () => {
      component['allAlerts'] = [
        { id: 'db1', severity: 'info', title: '', details: '', status: 'OPEN', createdAt: new Date(), source: 'db' },
      ];
      const alert = component.allAlerts[0];

      component.toggleResolved(alert);

      expect(component.allAlerts[0].status).toBe('RESOLVED');
      expect(alertSvcSpy.resolveAlert).not.toHaveBeenCalled();
      expect(alertSvcSpy.reopenAlert).not.toHaveBeenCalled();
    });
  });

  describe('applyFilters', () => {
    beforeEach(() => {
      component.transactions = [
        tx({ referenceNumber: 'A', transmissionDateAndTime: '2026-07-10T10:00:00' }),
        tx({ referenceNumber: 'B', transmissionDateAndTime: '2026-07-14T10:00:00' }),
      ];
    });

    it('devrait garder toutes les transactions sans filtre de date', () => {
      component.applyFilters();
      expect(component.filteredTransactions.length).toBe(2);
    });

    it('devrait filtrer par date de debut', () => {
      component.startDate = '2026-07-12';
      component.applyFilters();
      expect(component.filteredTransactions.map(t => t.referenceNumber)).toEqual(['B']);
    });

    it('devrait filtrer par date de fin', () => {
      component.endDate = '2026-07-11';
      component.applyFilters();
      expect(component.filteredTransactions.map(t => t.referenceNumber)).toEqual(['A']);
    });

    it('devrait garder les transactions sans date', () => {
      component.transactions = [tx({ referenceNumber: 'NODATE' })];
      component.startDate = '2026-07-12';
      component.applyFilters();
      expect(component.filteredTransactions.length).toBe(1);
    });

    it('devrait appeler processBatch apres filtrage', () => {
      component.applyFilters();
      expect(alertSvcSpy.processBatch).toHaveBeenCalledWith(component.filteredTransactions);
    });
  });

  describe('refreshData', () => {
    it('devrait invalider le cache et recharger les transactions', () => {
      apiSpy.getTransactions.and.returnValue(of([tx({ referenceNumber: 'A' })]));

      component.refreshData();

      expect(apiSpy.invalidateTransactionCache).toHaveBeenCalled();
      expect(component.transactions.length).toBe(1);
      expect(component.isLoading).toBeFalse();
    });

    it('devrait gerer une erreur de rafraichissement sans planter', () => {
      apiSpy.getTransactions.and.returnValue(throwError(() => new Error('down')));

      component.refreshData();

      expect(component.isLoading).toBeFalse();
    });
  });

  describe('toggleHistory', () => {
    it('devrait basculer showHistory', () => {
      expect(component.showHistory).toBeFalse();
      component.toggleHistory();
      expect(component.showHistory).toBeTrue();
      component.toggleHistory();
      expect(component.showHistory).toBeFalse();
    });
  });

  describe('codeStats / isTop5 / pct', () => {
    beforeEach(() => {
      component.filteredTransactions = [
        tx({ responseCode: '51' }), tx({ responseCode: '51' }), tx({ responseCode: '51' }),
        tx({ responseCode: '55' }), tx({ responseCode: '55' }),
        tx({ responseCode: '00' }),
        tx({ responseCode: '05', functionCode: '400' }),
      ];
      component['_processTransactions']();
      component.stats = { ...emptyStats(), totalCount: 5 };
    });

    it('devrait construire codeStats en excluant les codes approuves et les reversals', () => {
      expect(component.codeStats.map(s => s.code)).toEqual(['51', '55']);
    });

    it('devrait trier codeStats par count decroissant', () => {
      expect(component.codeStats[0].code).toBe('51');
    });

    it('isTop5 devrait reconnaitre un code dans le top 5', () => {
      expect(component.isTop5('51')).toBeTrue();
      expect(component.isTop5('99')).toBeFalse();
    });

    it('pct devrait calculer le pourcentage arrondi', () => {
      expect(component.pct(3)).toBe(60);
    });

    it('pct devrait retourner 0 si totalCount est 0', () => {
      component.stats = emptyStats();
      expect(component.pct(5)).toBe(0);
    });

    it('top5Label devrait joindre les codes du top 5', () => {
      expect(component.top5Label).toBe('51 · 55');
    });
  });

  describe('style helpers', () => {
    it('codeChipClass devrait marquer un code critique', () => {
      expect(component.codeChipClass('05')['bg-red-500/10 text-red-400']).toBeTrue();
    });

    it('codeTextClass devrait marquer un code warning', () => {
      expect(component.codeTextClass('55')['text-orange-400']).toBeTrue();
    });

    it('codeBarClass devrait retomber sur le style par defaut pour un code inconnu', () => {
      expect(component.codeBarClass('99')['bg-slate-500']).toBeTrue();
    });
  });

  describe('projectLabel', () => {
    it('devrait deleguer a activeProjectName du service de filtre', () => {
      expect(component.projectLabel).toBe('AWB');
    });
  });
});
