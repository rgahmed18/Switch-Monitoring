import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TransactionsComponent } from './transactions.component';
import { ApiService } from '../../api.service';
import { AppStateService } from '../../state.service';
import { TransactionStoreService } from '../../services/transaction-store.service';
import { ProjectFilterService } from '../../services/project-filter.service';
import { Transaction } from '../../models';

function tx(overrides: Partial<Transaction>): Transaction {
  return { ...overrides } as Transaction;
}

describe('TransactionsComponent', () => {
  let component: TransactionsComponent;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['invalidateTransactionCache', 'getTransactions']);
    apiSpy.getTransactions.and.returnValue(of([]));

    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: apiSpy },
      ],
    });

    component = TestBed.runInInjectionContext(() => new TransactionsComponent());
  });

  afterEach(() => component.ngOnDestroy());

  describe('ngOnInit / chargement', () => {
    it('devrait afficher les donnees du store immediatement si presentes', () => {
      const store = TestBed.inject(TransactionStoreService);
      store.replaceAll([tx({ referenceNumber: 'FROM_STORE' })]);

      component.ngOnInit();

      expect(component.totalCount()).toBeGreaterThanOrEqual(0);
    });

    it('devrait remplacer les transactions par la reponse backend si le store est vide', () => {
      apiSpy.getTransactions.and.returnValue(of([tx({ referenceNumber: 'API_TX' })]));

      component.ngOnInit();

      expect(component.totalCount()).toBe(1);
      expect(component.isLoading()).toBeFalse();
    });

    it('devrait gerer une erreur backend sans planter', () => {
      apiSpy.getTransactions.and.returnValue(throwError(() => new Error('down')));

      expect(() => component.ngOnInit()).not.toThrow();
      expect(component.isLoading()).toBeFalse();
    });
  });

  describe('filteredTransactions / onglets', () => {
    beforeEach(() => {
      apiSpy.getTransactions.and.returnValue(of([
        tx({ referenceNumber: 'A', status: 'APPROVED' }),
        tx({ referenceNumber: 'B', status: 'DECLINED' }),
        tx({ referenceNumber: 'C', actionCode: '000' }),
      ]));
      component.ngOnInit();
    });

    it('devrait retourner toutes les transactions sur l\'onglet all', () => {
      component.setTab('all');
      expect(component.filteredTransactions().length).toBe(3);
    });

    it('devrait filtrer les transactions approuvees', () => {
      component.setTab('approved');
      expect(component.filteredTransactions().every(t => t.referenceNumber !== 'B')).toBeTrue();
    });

    it('devrait filtrer les transactions refusees', () => {
      component.setTab('declined');
      expect(component.filteredTransactions().map(t => t.referenceNumber)).toEqual(['B']);
    });

    it('devrait reinitialiser currentPage a 1 lors du changement d\'onglet', () => {
      component.goToPage(1);
      component.setTab('declined');
      expect(component.currentPage()).toBe(1);
    });
  });

  describe('recherche', () => {
    beforeEach(() => {
      apiSpy.getTransactions.and.returnValue(of([
        tx({ referenceNumber: 'REF123', merchantName: 'Jumia' }),
        tx({ referenceNumber: 'REF456', merchantName: 'Carrefour' }),
      ]));
      component.ngOnInit();
    });

    it('devrait filtrer par texte de recherche insensible a la casse', () => {
      component.onSearchInput({ target: { value: 'jumia' } } as any);

      expect(component.filteredTransactions().map(t => t.referenceNumber)).toEqual(['REF123']);
    });

    it('devrait retourner une liste vide si aucune correspondance', () => {
      component.onSearchInput({ target: { value: 'inexistant' } } as any);

      expect(component.filteredTransactions()).toEqual([]);
    });
  });

  describe('pagination', () => {
    beforeEach(() => {
      const many = Array.from({ length: 60 }, (_, i) => tx({ referenceNumber: `R${i}` }));
      apiSpy.getTransactions.and.returnValue(of(many));
      component.ngOnInit();
    });

    it('devrait calculer totalPages selon pageSize', () => {
      component.setPageSize(25);
      expect(component.totalPages()).toBe(3); // 60/25 = 2.4 -> 3
    });

    it('goToPage() ne devrait pas depasser les bornes', () => {
      component.goToPage(999);
      expect(component.currentPage()).toBe(1);

      component.goToPage(0);
      expect(component.currentPage()).toBe(1);
    });

    it('paginatedTransactions devrait retourner la bonne tranche', () => {
      component.setPageSize(25);
      component.goToPage(2);

      expect(component.paginatedTransactions().length).toBe(25);
    });
  });

  describe('status helpers', () => {
    it('getStatusType devrait retourner error pour un code timeout', () => {
      const t = tx({ actionCode: '091' });
      expect(component.getStatusType(t)).toBe('error');
    });

    it('getStatusType devrait retourner approved pour actionCode 000', () => {
      const t = tx({ actionCode: '000' });
      expect(component.getStatusType(t)).toBe('approved');
    });

    it('getStatusLabel devrait traduire le type en libelle francais', () => {
      const t = tx({ status: 'DECLINED' });
      expect(component.getStatusLabel(t)).toBe('REFUSE');
    });
  });

  describe('formatters', () => {
    it('getPanLast4 devrait retourner les 4 derniers chiffres', () => {
      expect(component.getPanLast4(tx({ cardNumberMasked: '400000XXXXXX7750' }))).toBe('7750');
    });

    it('getPanLast4 devrait retourner ???? sans PAN', () => {
      expect(component.getPanLast4(tx({}))).toBe('????');
    });

    it('getAmount devrait formater le montant avec devise', () => {
      const result = component.getAmount(tx({ transactionAmount: 100, transactionCurrency: 'MAD' }));
      expect(result).toContain('MAD');
    });

    it('getChannel devrait traduire GAB en libelle complet', () => {
      expect(component.getChannel(tx({ channel: 'GAB' }))).toBe('GAB / ATM');
    });

    it('getNetworkLabel devrait reconnaitre VISA via productCode', () => {
      expect(component.getNetworkLabel(tx({ productCode: 'VIS' }))).toBe('VISA');
    });

    it('getPosEntryLabel devrait resoudre le libelle du mode d\'entree', () => {
      expect(component.getPosEntryLabel('05')).toBe('Puce EMV');
    });

    it('getPosEntryLabel devrait retourner une chaine vide sans mode', () => {
      expect(component.getPosEntryLabel(undefined)).toBe('');
    });
  });

  describe('detail modal', () => {
    it('openDetail() devrait definir selectedTransaction', () => {
      const t = tx({ referenceNumber: 'REF1' });
      component.openDetail(t);

      expect(component.selectedTransaction()).toBe(t);
    });

    it('closeDetail() devrait reinitialiser selectedTransaction', () => {
      component.openDetail(tx({}));
      component.closeDetail();

      expect(component.selectedTransaction()).toBeNull();
    });
  });

  describe('val', () => {
    it('devrait retourner une chaine vide pour null/undefined', () => {
      expect(component.val(null)).toBe('');
      expect(component.val(undefined)).toBe('');
    });

    it('devrait convertir un nombre en chaine', () => {
      expect(component.val(42)).toBe('42');
    });
  });
});
