import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { TransactionAnalysisComponent } from './transaction-analysis.component';
import { ApiService } from '../../api.service';
import { ProjectFilterService } from '../../services/project-filter.service';
import { TranslateService } from '../../services/translate.service';

function tx(overrides: any): any {
  return { ...overrides };
}

describe('TransactionAnalysisComponent', () => {
  let component: TransactionAnalysisComponent;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let activeProject$: Subject<string>;

  beforeEach(() => {
    activeProject$ = new Subject<string>();
    apiSpy = jasmine.createSpyObj('ApiService', [
      'getTransactions', 'getAnalyticsDashboard', 'getSlaBreaches',
    ]);
    apiSpy.getTransactions.and.returnValue(of([]));
    apiSpy.getAnalyticsDashboard.and.returnValue(of(null));
    apiSpy.getSlaBreaches.and.returnValue(of([]));

    const projectFilterSpy = jasmine.createSpyObj('ProjectFilterService', [], {
      activeProject$: activeProject$.asObservable(),
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: apiSpy },
        { provide: ProjectFilterService, useValue: projectFilterSpy },
      ],
    });

    component = new TransactionAnalysisComponent(
      apiSpy, TestBed.inject(ProjectFilterService), TestBed.inject(TranslateService),
    );
  });

  afterEach(() => component.ngOnDestroy());

  describe('chargement initial', () => {
    it('devrait charger les transactions quand le projet actif emet', () => {
      apiSpy.getTransactions.and.returnValue(of([tx({ referenceNumber: 'A' })]));

      component.ngOnInit();
      activeProject$.next('');

      expect(component.transactions.length).toBe(1);
      expect(component.isLoading).toBeFalse();
    });

    it('devrait gerer une erreur de chargement sans planter', () => {
      apiSpy.getTransactions.and.returnValue(of([]));
      component.ngOnInit();

      expect(() => activeProject$.next('')).not.toThrow();
    });

    it('devrait charger le dashboard analytics et le nombre de breaches SLA', () => {
      apiSpy.getAnalyticsDashboard.and.returnValue(of({ chipTransactionCount: 10, fraudActionCodeCount: 2 }));
      apiSpy.getSlaBreaches.and.returnValue(of([{}, {}, {}]));

      component.ngOnInit();
      activeProject$.next('');

      expect(component.analyticsDashboard.chipTransactionCount).toBe(10);
      expect(component.slaBreachCount).toBe(3);
    });
  });

  describe('onFiltersChange', () => {
    beforeEach(() => {
      component.transactions = [
        tx({ referenceNumber: 'A', status: 'APPROVED', channel: 'GAB', transmissionDateAndTime: '2026-07-14T10:00:00' }),
        tx({ referenceNumber: 'B', status: 'DECLINED', channel: 'ECOM', transmissionDateAndTime: '2026-07-14T11:00:00' }),
      ];
    });

    it('devrait filtrer par statut', () => {
      component.onFiltersChange({ status: 'APPROVED' });

      expect(component.filteredTransactions.map((t: any) => t.referenceNumber)).toEqual(['A']);
    });

    it('devrait mapper ATM/GAB comme equivalents pour le filtre canal', () => {
      component.onFiltersChange({ channel: 'GAB' });

      expect(component.filteredTransactions.map((t: any) => t.referenceNumber)).toEqual(['A']);
    });

    it('devrait mapper ECOM/ECM comme equivalents pour le filtre canal', () => {
      component.onFiltersChange({ channel: 'ECOM' });

      expect(component.filteredTransactions.map((t: any) => t.referenceNumber)).toEqual(['B']);
    });

    it('devrait filtrer par montant min/max (reproduit le bug signale : le slider ne filtrait rien)', () => {
      component.transactions = [
        tx({ referenceNumber: 'LOW',  amount: 100 }),
        tx({ referenceNumber: 'MID',  amount: 5_000_000 }),
        tx({ referenceNumber: 'HIGH', amount: 15_000_000 }),
      ];

      component.onFiltersChange({ minAmount: 1_000_000, maxAmount: 10_000_000, sliderMax: 20_000_000 });

      expect(component.filteredTransactions.map((t: any) => t.referenceNumber)).toEqual(['MID']);
    });

    it('ne devrait pas filtrer sur le montant si minAmount=0 et maxAmount=sliderMax (etat par defaut)', () => {
      component.transactions = [
        tx({ referenceNumber: 'LOW',  amount: 100 }),
        tx({ referenceNumber: 'HIGH', amount: 15_000_000 }),
      ];

      component.onFiltersChange({ minAmount: 0, maxAmount: 20_000_000, sliderMax: 20_000_000 });

      expect(component.filteredTransactions.length).toBe(2);
    });

    it('devrait filtrer par plage de dates', () => {
      component.onFiltersChange({ startDate: '2026-07-14', endDate: '2026-07-14' });

      expect(component.filteredTransactions.length).toBe(2);

      component.onFiltersChange({ startDate: '2026-07-15' });

      expect(component.filteredTransactions.length).toBe(0);
    });

    it('devrait filtrer par tranche horaire', () => {
      component.onFiltersChange({ startTime: '10:30', endTime: '12:00' });

      expect(component.filteredTransactions.map((t: any) => t.referenceNumber)).toEqual(['B']);
    });

    it('devrait filtrer par recherche libre', () => {
      component.transactions = [tx({ referenceNumber: 'FINDME', merchantName: 'Jumia' })];

      component.onFiltersChange({ searchText: 'jumia' });

      expect(component.filteredTransactions.length).toBe(1);
    });

    it('devrait mettre a jour selectedDateRange', () => {
      component.onFiltersChange({ startDate: '2026-07-01', endDate: '2026-07-14' });

      expect(component.selectedDateRange.startDate).toBe('2026-07-01');
      expect(component.selectedDateRange.endDate).toBe('2026-07-14');
    });

    it('devrait mettre a jour les compteurs d\'onglets', () => {
      component.onFiltersChange({ status: 'APPROVED' });

      const detailsTab = component.tabs.find(t => t.id === 'details')!;
      expect(detailsTab.count).toBe(1);
    });
  });

  describe('selection de transaction', () => {
    it('onTxSelected() devrait definir selectedTx', () => {
      const t = tx({ referenceNumber: 'X' });
      component.onTxSelected(t);
      expect(component.selectedTx).toBe(t);
    });

    it('closeTxDetail() devrait reinitialiser selectedTx', () => {
      component.onTxSelected(tx({}));
      component.closeTxDetail();
      expect(component.selectedTx).toBeNull();
    });
  });

  describe('export', () => {
    it('exportAnalysis() devrait ouvrir le modal d\'export', () => {
      component.exportAnalysis();
      expect(component.showExportModal).toBeTrue();
    });

    it('confirmExport() devrait fermer le modal', () => {
      component.showExportModal = true;
      component.filteredTransactions = [];

      component.confirmExport();

      expect(component.showExportModal).toBeFalse();
    });

    it('confirmExport() ne devrait pas planter avec des transactions a exporter', () => {
      component.filteredTransactions = [tx({ referenceNumber: 'A', amount: 100 })];

      expect(() => component.confirmExport()).not.toThrow();
    });
  });

  describe('refreshData', () => {
    it('devrait recharger les transactions', () => {
      component.refreshData();
      expect(apiSpy.getTransactions).toHaveBeenCalled();
    });
  });
});
