import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { EcomComponent } from './ecom.component';
import { ApiService } from '../../api.service';
import { ProjectFilterService } from '../../services/project-filter.service';
import { Transaction } from '../../models';

function tx(overrides: Partial<Transaction>): Transaction {
  return { ...overrides } as Transaction;
}

describe('EcomComponent', () => {
  let component: EcomComponent;
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
    component = new EcomComponent(apiSpy, projectFilterSpy);
  });

  it('devrait invalider le cache de transactions au demarrage', () => {
    apiSpy.getTransactions.and.returnValue(of([]));

    component.ngOnInit();

    expect(apiSpy.invalidateTransactionCache).toHaveBeenCalled();
  });

  it('ne devrait rien calculer sans transaction ECOM', () => {
    apiSpy.getTransactions.and.returnValue(of([tx({ channel: 'POS' } as any)]));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.kpi.total).toBe(0);
  });

  it('devrait calculer successRate/declineRate en excluant les reversals', () => {
    apiSpy.getTransactions.and.returnValue(of([
      tx({ channel: 'ECOM', status: 'APPROVED' } as any),
      tx({ channel: 'ECOM', status: 'DECLINED' } as any),
      tx({ channel: 'ECOM', status: 'DECLINED', functionCode: '400' } as any), // reversal exclu
    ]));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.kpi.total).toBe(3);
    expect(component.kpi.successRate).toBe(50);
  });

  it('devrait calculer fraudRate sur FRAUD_BLOCKED ou fraudScore > 75', () => {
    apiSpy.getTransactions.and.returnValue(of([
      tx({ channel: 'ECOM', fraudScore: 90 } as any),
      tx({ channel: 'ECOM', fraudScore: 10 } as any),
    ]));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.kpi.fraudRate).toBe(50);
  });

  it('devrait calculer threeDsRate uniquement sur les tx ayant tente le 3DS', () => {
    apiSpy.getTransactions.and.returnValue(of([
      tx({ channel: 'ECOM', is3dsSuccess: true } as any),
      tx({ channel: 'ECOM', is3dsSuccess: false } as any),
      tx({ channel: 'ECOM' } as any), // pas tente, exclu du denominateur
    ]));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.kpi.threeDsRate).toBe(50);
  });

  it('devrait regrouper les transactions par marchand (cardAcceptorId)', () => {
    apiSpy.getTransactions.and.returnValue(of([
      tx({ channel: 'ECOM', cardAcceptorId: 'MID1', cardAccNameAddress: 'Jumia', status: 'APPROVED', transactionAmount: 100 } as any),
      tx({ channel: 'ECOM', cardAcceptorId: 'MID1', status: 'DECLINED', transactionAmount: 50 } as any),
    ]));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.merchantRows.length).toBe(1);
    expect(component.merchantRows[0].merchantName).toBe('Jumia');
    expect(component.merchantRows[0].total).toBe(2);
    expect(component.merchantRows[0].declineRate).toBe(50);
    expect(component.merchantRows[0].volume).toBe(150);
  });

  it('devrait utiliser INCONNU si cardAcceptorId est absent', () => {
    apiSpy.getTransactions.and.returnValue(of([tx({ channel: 'ECOM' } as any)]));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.merchantRows[0].merchantId).toBe('INCONNU');
  });

  it('devrait limiter merchantRows aux 20 marchands les plus actifs', () => {
    const txs: Transaction[] = [];
    for (let i = 0; i < 25; i++) txs.push(tx({ channel: 'ECOM', cardAcceptorId: `M${i}` } as any));
    apiSpy.getTransactions.and.returnValue(of(txs));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.merchantRows.length).toBe(20);
  });

  it('devrait gerer une erreur API en reinitialisant les transactions', () => {
    apiSpy.getTransactions.and.returnValue(of([]));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.kpi.total).toBe(0);
  });

  it('ngOnDestroy() ne devrait pas lever d\'exception', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
