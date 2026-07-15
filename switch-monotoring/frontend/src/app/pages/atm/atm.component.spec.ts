import { TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { AtmComponent } from './atm.component';
import { ApiService } from '../../api.service';
import { ProjectFilterService } from '../../services/project-filter.service';
import { Transaction } from '../../models';

function tx(overrides: Partial<Transaction>): Transaction {
  return { ...overrides } as Transaction;
}

describe('AtmComponent', () => {
  let component: AtmComponent;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let projectFilterSpy: jasmine.SpyObj<ProjectFilterService>;
  let activeProject$: Subject<string>;

  beforeEach(() => {
    activeProject$ = new Subject<string>();
    apiSpy = jasmine.createSpyObj('ApiService', ['getTransactions']);
    projectFilterSpy = jasmine.createSpyObj('ProjectFilterService', [], {
      activeProject$: activeProject$.asObservable(),
      activeProjectName: 'AWB',
    });

    TestBed.configureTestingModule({});
    component = new AtmComponent(apiSpy, projectFilterSpy);
  });

  it('devrait reinitialiser les KPIs en cas d\'erreur API', () => {
    apiSpy.getTransactions.and.returnValue(throwError(() => new Error('down')));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.kpi.totalGab).toBe(0);
  });

  it('devrait reinitialiser les KPIs si aucune transaction GAB/ATM', () => {
    apiSpy.getTransactions.and.returnValue(of([tx({ channel: 'POS' })]));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.kpi.totalGab).toBe(0);
  });

  it('devrait calculer les KPIs pour les transactions GAB/ATM uniquement', () => {
    apiSpy.getTransactions.and.returnValue(of([
      tx({ channel: 'GAB', status: 'APPROVED', transactionAmount: 100 }),
      tx({ channel: 'ATM', status: 'DECLINED', transactionAmount: 50 }),
      tx({ channel: 'POS', status: 'APPROVED', transactionAmount: 999 }),
    ]));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.kpi.totalGab).toBe(2);
    expect(component.kpi.successRate).toBe(50);
    expect(component.kpi.declineRate).toBe(50);
    expect(component.kpi.cashOutVolume).toBe(150);
  });

  it('devrait exclure les reversals du calcul du taux de succes/refus', () => {
    apiSpy.getTransactions.and.returnValue(of([
      tx({ channel: 'GAB', status: 'APPROVED' }),
      tx({ channel: 'GAB', status: 'DECLINED', functionCode: '400' }), // reversal exclu
    ]));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.kpi.successRate).toBe(100);
  });

  it('devrait trier approvedGab par timestamp decroissant et limiter a 50', () => {
    const many = Array.from({ length: 60 }, (_, i) => tx({
      channel: 'GAB', status: 'APPROVED', timestamp: new Date(2026, 0, i + 1) as any,
    }));
    apiSpy.getTransactions.and.returnValue(of(many));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.approvedGab.length).toBe(50);
    expect((component.approvedGab[0].timestamp as any).getTime())
      .toBeGreaterThan((component.approvedGab[1].timestamp as any).getTime());
  });

  it('projectLabel devrait deleguer a ProjectFilterService', () => {
    expect(component.projectLabel).toBe('AWB');
  });

  it('devrait relancer le chargement quand le projet actif change', () => {
    apiSpy.getTransactions.and.returnValue(of([]));

    component.ngOnInit();
    activeProject$.next('AWB');
    activeProject$.next('BMCE');

    expect(apiSpy.getTransactions).toHaveBeenCalledTimes(2);
  });

  it('ngOnDestroy() devrait completer le destroy$ sans erreur', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
