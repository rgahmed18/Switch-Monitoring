import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { Router } from '@angular/router';
import { GabComponent } from './gab.component';
import { ApiService } from '../../api.service';
import { ProjectFilterService } from '../../services/project-filter.service';
import { Transaction } from '../../models';

function tx(overrides: Partial<Transaction>): Transaction {
  return { ...overrides } as Transaction;
}

describe('GabComponent', () => {
  let component: GabComponent;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let projectFilterSpy: jasmine.SpyObj<ProjectFilterService>;
  let activeProject$: Subject<string>;

  beforeEach(() => {
    activeProject$ = new Subject<string>();
    apiSpy = jasmine.createSpyObj('ApiService', ['getTransactions']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    projectFilterSpy = jasmine.createSpyObj('ProjectFilterService', [], {
      activeProject$: activeProject$.asObservable(),
    });

    TestBed.configureTestingModule({});
    component = new GabComponent(apiSpy, routerSpy, projectFilterSpy);
  });

  it('ne devrait pas lever d\'exception si mtiCode est absent (regression garde null-safe)', () => {
    apiSpy.getTransactions.and.returnValue(of([tx({} as any)]));

    expect(() => {
      component.ngOnInit();
      activeProject$.next('');
    }).not.toThrow();
  });

  it('devrait identifier les transactions GAB via mtiCode commencant par 04', () => {
    apiSpy.getTransactions.and.returnValue(of([tx({ mtiCode: '0400' } as any)]));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.summary.totalGab).toBe(1);
  });

  it('devrait identifier les transactions GAB via channel=GAB', () => {
    apiSpy.getTransactions.and.returnValue(of([
      tx({ channel: 'GAB' } as any),
      tx({ channel: 'POS' } as any),
    ]));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.summary.totalGab).toBe(1);
    expect(component.summary.gabPercentage).toBe(50);
  });

  it('devrait grouper les statistiques par banque', () => {
    apiSpy.getTransactions.and.returnValue(of([
      tx({ channel: 'GAB', bankName: 'AWB', status: 'APPROVED' } as any),
      tx({ channel: 'GAB', bankName: 'AWB', status: 'DECLINED' } as any),
      tx({ channel: 'GAB', bankName: 'BMCE', status: 'APPROVED' } as any),
    ]));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.banksCount).toBe(2);
    const awb = component.bankStats.find(b => b.name === 'AWB')!;
    expect(awb.total).toBe(2);
    expect(awb.successRate).toBe(50);
  });

  it('devrait utiliser "Unknown Bank" si bankName est absent', () => {
    apiSpy.getTransactions.and.returnValue(of([tx({ channel: 'GAB' } as any)]));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.bankStats[0].name).toBe('Unknown Bank');
  });

  it('devrait limiter topBanks aux 5 premieres banques triees par volume', () => {
    const txs: Transaction[] = [];
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j <= i; j++) txs.push(tx({ channel: 'GAB', bankName: `BANK${i}` } as any));
    }
    apiSpy.getTransactions.and.returnValue(of(txs));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.topBanks.length).toBe(5);
    expect(component.topBanks[0].name).toBe('BANK6'); // le plus volumineux
  });

  it('devrait calculer la variance entre min et max successRate', () => {
    apiSpy.getTransactions.and.returnValue(of([
      tx({ channel: 'GAB', bankName: 'A', status: 'APPROVED' } as any),
      tx({ channel: 'GAB', bankName: 'B', status: 'DECLINED' } as any),
    ]));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.analysis.minSuccess).toBe(0);
    expect(component.analysis.maxSuccess).toBe(100);
    expect(component.analysis.variance).toBe(100);
  });

  it('devrait construire le graphique avec les banques et volumes', () => {
    apiSpy.getTransactions.and.returnValue(of([tx({ channel: 'GAB', bankName: 'AWB' } as any)]));

    component.ngOnInit();
    activeProject$.next('');

    expect(component.chartData.labels).toEqual(['AWB']);
    expect(component.chartData.datasets[0].data).toEqual([1]);
  });

  it('ngOnDestroy() ne devrait pas lever d\'exception', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
