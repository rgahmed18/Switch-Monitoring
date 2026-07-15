import { TransactionTableComponent } from './transaction-table.component';
import { Transaction } from '../../models';

function tx(overrides: Partial<Transaction>): Transaction {
  return { ...overrides } as Transaction;
}

describe('TransactionTableComponent', () => {
  let component: TransactionTableComponent;

  beforeEach(() => {
    component = new TransactionTableComponent();
  });

  describe('pagination', () => {
    it('totalPages devrait etre au moins 1 meme sans transaction', () => {
      component.transactions = [];
      expect(component.totalPages).toBe(1);
    });

    it('totalPages devrait arrondir au superieur', () => {
      component.transactions = Array.from({ length: 45 }, () => tx({}));
      expect(component.totalPages).toBe(3); // 45/20 = 2.25 -> 3
    });

    it('pageStart/pageEnd devraient refleter la page courante', () => {
      component.transactions = Array.from({ length: 45 }, () => tx({}));

      expect(component.pageStart).toBe(1);
      expect(component.pageEnd).toBe(20);

      component.nextPage();

      expect(component.pageStart).toBe(21);
      expect(component.pageEnd).toBe(40);
    });

    it('pageStart devrait etre 0 sans transaction', () => {
      component.transactions = [];
      expect(component.pageStart).toBe(0);
    });

    it('nextPage() ne devrait pas depasser la derniere page', () => {
      component.transactions = Array.from({ length: 10 }, () => tx({}));

      component.nextPage();
      component.nextPage();

      expect(component.currentPage).toBe(0);
    });

    it('prevPage() ne devrait pas descendre sous 0', () => {
      component.prevPage();

      expect(component.currentPage).toBe(0);
    });

    it('displayTransactions devrait retourner la tranche correspondant a la page courante', () => {
      component.transactions = Array.from({ length: 25 }, (_, i) => tx({ referenceNumber: `R${i}` } as any));

      component.nextPage();

      expect(component.displayTransactions.length).toBe(5);
      expect(component.displayTransactions[0].referenceNumber).toBe('R20');
    });
  });

  describe('onRowClick', () => {
    it('devrait emettre la transaction cliquee via txSelected', () => {
      const emitted: Transaction[] = [];
      component.txSelected.subscribe(t => emitted.push(t));
      const target = tx({ referenceNumber: 'REF1' } as any);

      component.onRowClick(target);

      expect(emitted).toEqual([target]);
    });
  });

  describe('formatDate', () => {
    it('devrait retourner " - " si la date est absente', () => {
      expect(component.formatDate(undefined)).toBe(' - ');
    });

    it('devrait formater une date valide en heure locale', () => {
      const result = component.formatDate('2026-07-14T10:00:00Z');
      expect(result).not.toBe(' - ');
    });

    it('devrait retourner la chaine brute si la date est invalide', () => {
      expect(component.formatDate('pas-une-date')).toBe('pas-une-date');
    });
  });

  describe('maskPan', () => {
    it('devrait retourner " - " pour un PAN vide', () => {
      expect(component.maskPan('')).toBe(' - ');
    });

    it('devrait laisser un PAN deja masque inchange', () => {
      expect(component.maskPan('**** **** **** 1234')).toBe('**** **** **** 1234');
    });

    it('devrait masquer un PAN brut en ne montrant que les 4 derniers chiffres', () => {
      expect(component.maskPan('4000005327187750')).toBe('**** **** **** 7750');
    });
  });

  describe('formatAmount', () => {
    it('devrait retourner " - " pour un montant absent', () => {
      expect(component.formatAmount(undefined)).toBe(' - ');
    });

    it('devrait formater le montant en notation francaise', () => {
      // toLocaleString('fr-FR') utilise une espace fine insecable (U+202F), pas une espace normale
      expect(component.formatAmount(1234)).toBe((1234).toLocaleString('fr-FR'));
    });
  });

  describe('getNetworkDisplay', () => {
    it('devrait retourner " - " sans reseau', () => {
      expect(component.getNetworkDisplay(tx({} as any))).toBe(' - ');
    });

    it('devrait abreger VISA', () => {
      expect(component.getNetworkDisplay(tx({ networkId: 'VISA' } as any))).toBe('VISA ...');
    });

    it('devrait abreger Mastercard', () => {
      expect(component.getNetworkDisplay(tx({ networkId: 'MASTERCARD' } as any))).toBe('MC ...');
    });
  });

  describe('getChannelBadgeClass', () => {
    it('devrait retourner la classe POS', () => {
      expect(component.getChannelBadgeClass('POS')).toContain('channel-pos');
    });

    it('devrait retourner la classe par defaut sans canal', () => {
      expect(component.getChannelBadgeClass(undefined)).toContain('channel-default');
    });
  });

  describe('getBadgeClasses', () => {
    it('devrait retourner status-success pour le code 00', () => {
      expect(component.getBadgeClasses('00')).toContain('status-success');
    });

    it('devrait retourner status-error pour un code inconnu', () => {
      expect(component.getBadgeClasses('999')).toContain('status-error');
    });
  });

  describe('getLatencyClass', () => {
    it('devrait retourner td-muted sans latence', () => {
      expect(component.getLatencyClass(undefined)).toBe('td-muted');
    });

    it('devrait retourner latency-good sous 500ms', () => {
      expect(component.getLatencyClass(300)).toBe('latency-good');
    });

    it('devrait retourner latency-warn entre 500 et 2000ms', () => {
      expect(component.getLatencyClass(1000)).toBe('latency-warn');
    });

    it('devrait retourner latency-bad au-dela de 2000ms', () => {
      expect(component.getLatencyClass(3000)).toBe('latency-bad');
    });
  });
});
