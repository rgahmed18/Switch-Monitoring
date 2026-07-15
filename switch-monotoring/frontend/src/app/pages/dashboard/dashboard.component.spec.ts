import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { of, throwError, Subject, BehaviorSubject } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { ApiService } from '../../api.service';
import { AppStateService } from '../../state.service';
import { Router } from '@angular/router';
import { ProjectFilterService } from '../../services/project-filter.service';
import { TransactionStoreService } from '../../services/transaction-store.service';
import { TransactionAlertService } from '../../services/transaction-alert.service';
import { TransactionStatsService } from '../../services/transaction-stats.service';
import { Transaction, AlertEvent } from '../../models';

function tx(overrides: Partial<Transaction>): Transaction {
  return { timestamp: new Date().toISOString(), ...overrides } as Transaction;
}

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let alertSvcSpy: jasmine.SpyObj<TransactionAlertService>;
  let statsSvcSpy: jasmine.SpyObj<TransactionStatsService>;
  let txStoreSpy: jasmine.SpyObj<TransactionStoreService>;
  let activeProject$: Subject<string>;
  let txStoreTransactions$: BehaviorSubject<Transaction[]>;

  beforeEach(() => {
    activeProject$ = new Subject<string>();
    txStoreTransactions$ = new BehaviorSubject<Transaction[]>([]);

    apiSpy = jasmine.createSpyObj('ApiService', [
      'invalidateTransactionCache', 'getCompleteConfiguration', 'getTransactions', 'getAlerts',
    ]);
    apiSpy.getCompleteConfiguration.and.returnValue(of({ zones: {}, mtiTypes: {} } as any));
    apiSpy.getTransactions.and.returnValue(of([]));
    apiSpy.getAlerts.and.returnValue(of([]));

    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    alertSvcSpy = jasmine.createSpyObj('TransactionAlertService', ['processBatch'], {
      alerts: [],
    });

    statsSvcSpy = jasmine.createSpyObj('TransactionStatsService', ['compute']);
    statsSvcSpy.compute.and.returnValue({ avgLatency: 0, approvalRate: 0, tps: 0 } as any);

    txStoreSpy = jasmine.createSpyObj('TransactionStoreService', ['addLive'], {
      transactions$: txStoreTransactions$.asObservable(),
      snapshot: [],
    });

    const projectFilterSpy = jasmine.createSpyObj('ProjectFilterService', [], {
      activeProject$: activeProject$.asObservable(),
      activeProject: '',
      activeProjectName: '',
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: apiSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ProjectFilterService, useValue: projectFilterSpy },
        { provide: TransactionStoreService, useValue: txStoreSpy },
        { provide: TransactionAlertService, useValue: alertSvcSpy },
        { provide: TransactionStatsService, useValue: statsSvcSpy },
      ],
    });

    component = new DashboardComponent(
      apiSpy,
      TestBed.inject(AppStateService),
      TestBed.inject(ChangeDetectorRef, { markForCheck: () => {} } as any),
      routerSpy,
      projectFilterSpy,
      txStoreSpy,
      alertSvcSpy,
      statsSvcSpy,
    );
  });

  afterEach(() => component.ngOnDestroy());

  describe('navigateTo', () => {
    it('devrait naviguer vers la page demandee', () => {
      component.navigateTo('atm');
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/atm']);
    });
  });

  describe('ngOnInit / chargement config', () => {
    it('devrait invalider le cache transaction au demarrage', () => {
      component.ngOnInit();
      expect(apiSpy.invalidateTransactionCache).toHaveBeenCalled();
    });

    it('devrait charger la configuration et construire les zones/pays/banques', () => {
      apiSpy.getCompleteConfiguration.and.returnValue(of({
        zones: { Afrique: ['Maroc', 'Nigeria'] },
        mtiTypes: { '0100': 'Authorization Request' },
        transactionTypes: { '00': 'Purchase' },
      } as any));

      component.ngOnInit();

      expect(component.availableZones).toEqual(['Local', 'International', 'Afrique']);
      expect(component.availableCountries).toEqual(['Maroc', 'Nigeria']);
      expect(component.availableTypes).toEqual(['0100 - Authorization Request']);
      expect(component.availableTransactionTypes).toEqual(['00 - Purchase']);
    });

    it('devrait utiliser la configuration mock en cas d\'erreur backend', () => {
      apiSpy.getCompleteConfiguration.and.returnValue(throwError(() => new Error('down')));

      component.ngOnInit();

      expect(component.config).toBeTruthy();
      expect(component.availableZones.length).toBeGreaterThan(0);
    });
  });

  describe('ngOnInit / chargement transactions', () => {
    it('devrait charger les transactions quand le projet actif emet', () => {
      apiSpy.getTransactions.and.returnValue(of([tx({ referenceNumber: 'A' })]));

      component.ngOnInit();
      activeProject$.next('');

      expect(component.allRawTransactions.length).toBe(1);
      expect(alertSvcSpy.processBatch).toHaveBeenCalled();
    });

    it('devrait utiliser les transactions mock en cas d\'erreur backend', () => {
      apiSpy.getTransactions.and.returnValue(throwError(() => new Error('down')));

      component.ngOnInit();
      activeProject$.next('');

      expect(component.allRawTransactions.length).toBeGreaterThan(0);
    });
  });

  describe('ngOnInit / chargement alertes', () => {
    it('devrait charger les alertes', () => {
      const evt: AlertEvent = { id: 1, severity: 'critical', title: 'A', details: '', status: 'OPEN', createdAt: '2026-07-14T00:00:00' } as AlertEvent;
      apiSpy.getAlerts.and.returnValue(of([evt]));

      component.ngOnInit();

      expect(component.alerts.length).toBe(1);
    });

    it('devrait utiliser les alertes mock en cas d\'erreur backend', () => {
      apiSpy.getAlerts.and.returnValue(throwError(() => new Error('down')));

      component.ngOnInit();

      expect(component.alerts.length).toBeGreaterThan(0);
    });
  });

  describe('filtres en cascade', () => {
    beforeEach(() => {
      component.config = {
        zones: { Afrique: ['Maroc', 'Nigeria'], Europe: ['France'] },
        banks: { Maroc: ['Attijariwafa Bank'], Nigeria: ['Zenith Bank'], France: ['BNP Paribas'] },
      };
    });

    it('onZoneChange() avec zone Local devrait limiter les pays au Maroc', () => {
      component.selectedZone = 'Local';
      component.onZoneChange();

      expect(component.availableCountries).toEqual(['Maroc']);
      expect(component.availableBanks).toEqual(['Attijariwafa Bank']);
    });

    it('onZoneChange() avec zone International devrait exclure le Maroc', () => {
      component.selectedZone = 'International';
      component.onZoneChange();

      expect(component.availableCountries).not.toContain('Maroc');
      expect(component.availableCountries).toContain('Nigeria');
    });

    it('onZoneChange() avec une zone geographique devrait filtrer ses pays', () => {
      component.selectedZone = 'Afrique';
      component.onZoneChange();

      expect(component.availableCountries).toEqual(['Maroc', 'Nigeria']);
    });

    it('onZoneChange() sans zone devrait retourner tous les pays', () => {
      component.selectedZone = '';
      component.onZoneChange();

      expect(component.availableCountries.sort()).toEqual(['France', 'Maroc', 'Nigeria'].sort());
    });

    it('onZoneChange() devrait reinitialiser pays/banque/type en aval', () => {
      component.selectedCountry = 'Maroc';
      component.selectedBank = 'Attijariwafa Bank';
      component.selectedType = 'X';

      component.onZoneChange();

      expect(component.selectedCountry).toBe('');
      expect(component.selectedBank).toBe('');
      expect(component.selectedType).toBe('');
    });

    it('onCountryChange() devrait filtrer les banques du pays selectionne', () => {
      component.selectedCountry = 'Nigeria';
      component.onCountryChange();

      expect(component.availableBanks).toEqual(['Zenith Bank']);
    });

    it('onBankChange() devrait reinitialiser le type', () => {
      component.selectedType = 'X';
      component.onBankChange();

      expect(component.selectedType).toBe('');
    });

    it('resetAllFilters() devrait effacer tous les filtres et reconstruire les listes', () => {
      component.selectedZone = 'Afrique';
      component.selectedCountry = 'Maroc';
      component.selectedBank = 'Attijariwafa Bank';
      component.dateStart = '2026-01-01';

      component.resetAllFilters();

      expect(component.selectedZone).toBe('');
      expect(component.selectedCountry).toBe('');
      expect(component.selectedBank).toBe('');
      expect(component.dateStart).toBe('');
      expect(component.availableZones).toEqual(['Local', 'International', 'Afrique', 'Europe']);
    });
  });

  describe('gestion des widgets', () => {
    it('resetWidgets() devrait tout desactiver', () => {
      component.resetWidgets();
      expect(Object.values(component.widgetsConfig).every(v => v === false)).toBeTrue();
    });

    it('showAllWidgets() devrait tout activer', () => {
      component.resetWidgets();
      component.showAllWidgets();
      expect(Object.values(component.widgetsConfig).every(v => v === true)).toBeTrue();
    });

    it('getWidgetKeys() devrait retourner les cles de configuration', () => {
      expect(component.getWidgetKeys()).toContain('kpiCards');
    });
  });

  describe('handleResolveAlert', () => {
    it('devrait marquer une alerte comme resolue', () => {
      component.alerts = [{ id: 1, status: 'OPEN' } as AlertEvent];

      component.handleResolveAlert({ id: 1 } as AlertEvent);

      expect(component.alerts[0].status).toBe('RESOLVED');
    });
  });

  describe('KPIs reseau (Visa / Mastercard)', () => {
    it('devrait comptabiliser les transactions Visa via productCode', () => {
      component.transactions = [
        tx({ productCode: 'VIS', status: 'APPROVED' }),
        tx({ productCode: 'VIS', status: 'DECLINED' }),
      ];
      component['calculateNetworkKpis']();

      expect(component.visaCount).toBe(2);
      expect(component.visaRefusal).toBe(50);
    });

    it('devrait comptabiliser les transactions Mastercard via networkCode', () => {
      component.transactions = [
        tx({ networkCode: '02', status: 'APPROVED' }),
      ];
      component['calculateNetworkKpis']();

      expect(component.mastercardCount).toBe(1);
    });

    it('devrait retourner 0 refus sans transaction du reseau', () => {
      component.transactions = [];
      component['calculateNetworkKpis']();

      expect(component.visaCount).toBe(0);
      expect(component.visaRefusal).toBe(0);
    });
  });

  describe('KPIs POS', () => {
    it('devrait retourner des KPIs a zero sans transaction POS', () => {
      component.transactions = [tx({ channel: 'ECOM' } as any)];
      component['calculatePosKpis']();

      expect(component.posTxCount).toBe(0);
    });

    it('devrait calculer le nombre de terminaux actifs et le taux de refus', () => {
      component.transactions = [
        tx({ channel: 'POS', terminalId: 'T1', status: 'APPROVED' } as any),
        tx({ channel: 'POS', terminalId: 'T2', status: 'DECLINED' } as any),
      ];
      component['calculatePosKpis']();

      expect(component.posActiveTerminals).toBe(2);
      expect(component.posTxCount).toBe(2);
      expect(component.posRefusalRate).toBe(50);
    });
  });

  describe('KPIs ECOM', () => {
    it('devrait retourner des KPIs a zero sans transaction ECOM', () => {
      component.transactions = [tx({ channel: 'POS', terminalId: 'T1' } as any)];
      component['calculateEcomKpis']();

      expect(component.ecomActiveSessions).toBe(0);
    });

    it('devrait calculer le taux d\'abandon et le taux de fraude', () => {
      component.transactions = [
        tx({ channel: 'ECOM', status: 'TIMEOUT' } as any),
        tx({ channel: 'ECOM', status: 'FRAUD_BLOCKED' } as any),
        tx({ channel: 'ECOM', status: 'APPROVED' } as any),
      ];
      component['calculateEcomKpis']();

      expect(component.ecomAbandonmentRate).toBeCloseTo(33.33, 1);
      expect(component.ecomFraudRate).toBeCloseTo(33.33, 1);
    });
  });

  describe('alertsCount', () => {
    it('devrait compter uniquement les alertes ouvertes du moteur live', () => {
      Object.defineProperty(alertSvcSpy, 'alerts', {
        get: () => [
          { id: 'a', status: 'OPEN' },
          { id: 'b', status: 'RESOLVED' },
        ],
      });

      expect(component.alertsCount).toBe(1);
    });
  });

  describe('updateKpis', () => {
    it('ne devrait rien faire si aucune transaction', () => {
      component.transactions = [];
      component['updateKpis']();

      expect(statsSvcSpy.compute).not.toHaveBeenCalled();
    });

    it('devrait deleguer le calcul des stats et alimenter le moteur d\'alertes', () => {
      statsSvcSpy.compute.and.returnValue({ avgLatency: 120, approvalRate: 90, tps: 5 } as any);
      component.transactions = [tx({ responseCode: '00' })];

      component['updateKpis']();

      expect(component.avgLatency).toBe(120);
      expect(component.successRate).toBe(90);
      expect(component.tps).toBe(5);
      expect(alertSvcSpy.processBatch).toHaveBeenCalledWith(component.transactions);
    });

    it('devrait calculer uptime a 100% sans erreur systeme', () => {
      component.transactions = [tx({ responseCode: '00' })];
      component['updateKpis']();

      expect(component.uptime).toBe(100);
    });

    it('devrait reduire uptime en presence d\'erreurs systeme (91/96)', () => {
      component.transactions = [
        tx({ responseCode: '91' }),
        tx({ responseCode: '00' }),
      ];
      component['updateKpis']();

      expect(component.uptime).toBe(50);
    });
  });

  describe('t (traductions)', () => {
    it('devrait retourner les libelles francais par defaut', () => {
      expect(component.t.uptime).toBe('UPTIME');
    });
  });

  describe('projectLabel', () => {
    it('devrait deleguer a activeProjectName', () => {
      expect(component.projectLabel).toBe('');
    });
  });
});
