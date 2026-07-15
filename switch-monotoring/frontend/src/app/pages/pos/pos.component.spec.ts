import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { PosComponent } from './pos.component';
import { ApiService } from '../../api.service';
import { ProjectFilterService } from '../../services/project-filter.service';
import { Transaction } from '../../models';

function tx(overrides: Partial<Transaction>): Transaction {
  return { ...overrides } as Transaction;
}

describe('PosComponent', () => {
  let component: PosComponent;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let projectFilterSpy: jasmine.SpyObj<ProjectFilterService>;
  let activeProject$: Subject<string>;

  beforeEach(() => {
    activeProject$ = new Subject<string>();
    apiSpy = jasmine.createSpyObj('ApiService', ['getTransactions', 'invalidateTransactionCache']);
    projectFilterSpy = jasmine.createSpyObj('ProjectFilterService', [], {
      activeProject$: activeProject$.asObservable(),
    });

    TestBed.configureTestingModule({});
    component = new PosComponent(apiSpy, projectFilterSpy);
  });

  it('devrait invalider le cache au demarrage', () => {
    apiSpy.getTransactions.and.returnValue(of([]));

    component.ngOnInit();

    expect(apiSpy.invalidateTransactionCache).toHaveBeenCalled();
  });

  it('ne devrait rien calculer sans transaction POS', () => {
    apiSpy.getTransactions.and.returnValue(of([tx({ channel: 'ECOM' } as any)]));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.kpi.total).toBe(0);
  });

  it('devrait calculer les KPIs de base pour les transactions POS', () => {
    apiSpy.getTransactions.and.returnValue(of([
      tx({ channel: 'POS', status: 'APPROVED', transactionAmount: 100 } as any),
      tx({ channel: 'POS', status: 'DECLINED', transactionAmount: 50 } as any),
    ]));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.kpi.total).toBe(2);
    expect(component.kpi.successRate).toBe(50);
    expect(component.kpi.totalVolume).toBe(150);
  });

  it('devrait construire la table MCC en utilisant cardAcceptorActivity direct', () => {
    apiSpy.getTransactions.and.returnValue(of([
      tx({ channel: 'POS', cardAcceptorActivity: '5411', status: 'APPROVED' } as any),
    ]));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.mccRows.length).toBe(1);
    expect(component.mccRows[0].mcc).toBe('5411');
  });

  it('devrait deriver le MCC depuis le nom du commercant si absent', () => {
    apiSpy.getTransactions.and.returnValue(of([
      tx({ channel: 'POS', cardAccNameAddress: 'POS 5732-XXXX', status: 'APPROVED' } as any),
    ]));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.mccRows[0].mcc).toBe('5732');
  });

  it('devrait ignorer les transactions sans MCC deductible', () => {
    apiSpy.getTransactions.and.returnValue(of([
      tx({ channel: 'POS', cardAccNameAddress: 'Boutique sans indice' } as any),
    ]));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.mccRows.length).toBe(0);
  });

  it('devrait trier mccRows par taux d\'approbation croissant', () => {
    apiSpy.getTransactions.and.returnValue(of([
      tx({ channel: 'POS', cardAcceptorActivity: '5411', status: 'APPROVED' } as any),
      tx({ channel: 'POS', cardAcceptorActivity: '5541', status: 'DECLINED' } as any),
    ]));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.mccRows[0].approvalRate).toBeLessThanOrEqual(component.mccRows[1].approvalRate);
  });

  it('devrait construire la table marchands avec volume et taux de refus', () => {
    apiSpy.getTransactions.and.returnValue(of([
      tx({ channel: 'POS', cardAcceptorId: 'MID1', status: 'APPROVED', transactionAmount: 100 } as any),
      tx({ channel: 'POS', cardAcceptorId: 'MID1', status: 'DECLINED', transactionAmount: 50 } as any),
    ]));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.merchantRows[0].total).toBe(2);
    expect(component.merchantRows[0].declineRate).toBe(50);
  });

  it('ngOnDestroy() ne devrait pas lever d\'exception', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
