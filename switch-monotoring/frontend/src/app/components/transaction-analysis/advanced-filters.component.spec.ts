import { TestBed } from '@angular/core/testing';
import { AdvancedFiltersComponent } from './advanced-filters.component';

describe('AdvancedFiltersComponent', () => {
  let component: AdvancedFiltersComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new AdvancedFiltersComponent());
  });

  describe('extractUniqueValues', () => {
    it('devrait extraire et trier les acquereurs uniques', () => {
      component.transactions = [
        { acquirerBank: 'BNP' }, { acquirerBank: 'AWB' }, { acquirerBank: 'AWB' },
      ];

      component.ngOnInit();

      expect(component.uniqueAcquirers).toEqual(['AWB', 'BNP']);
    });

    it('devrait ignorer les acquereurs vides', () => {
      component.transactions = [{ acquirerBank: '' }, {}];

      component.ngOnInit();

      expect(component.uniqueAcquirers).toEqual([]);
    });

    it('devrait etendre maxAmountSlider si un montant depasse 20 000 000', () => {
      component.transactions = [{ transactionAmount: 25_000_000 }];

      component.ngOnInit();

      expect(component.maxAmountSlider).toBeGreaterThan(20_000_000);
    });

    it('ne devrait pas reduire maxAmountSlider sous 20 000 000', () => {
      component.transactions = [{ transactionAmount: 100 }];

      component.ngOnInit();

      expect(component.maxAmountSlider).toBe(20_000_000);
    });
  });

  describe('calculateStats', () => {
    it('devrait calculer approvedCount/declinedCount/approvalRate', () => {
      component.transactions = [
        { status: 'APPROVED' }, { status: 'APPROVED' }, { status: 'DECLINED' },
      ];

      component.ngOnInit();

      expect(component.approvedCount).toBe(2);
      expect(component.declinedCount).toBe(1);
      expect(component.approvalRate).toBe(67);
    });

    it('approvalRate devrait etre 0 sans transaction', () => {
      component.transactions = [];

      component.ngOnInit();

      expect(component.approvalRate).toBe(0);
    });
  });

  describe('onMinAmountChange / onMaxAmountChange', () => {
    it('ne devrait pas laisser minAmount depasser maxAmount', () => {
      component.transactions = [];
      component.ngOnInit();
      component.filters.maxAmount = 1000;
      component.filters.minAmount = 5000;

      component.onMinAmountChange();

      expect(component.filters.minAmount).toBe(1000);
    });

    it('ne devrait pas laisser maxAmount descendre sous minAmount', () => {
      component.transactions = [];
      component.ngOnInit();
      component.filters.minAmount = 5000;
      component.filters.maxAmount = 1000;

      component.onMaxAmountChange();

      expect(component.filters.maxAmount).toBe(5000);
    });
  });

  describe('activeFilterCount', () => {
    it('devrait etre 0 sans filtre actif', () => {
      component.transactions = [];
      component.ngOnInit();

      expect(component.activeFilterCount).toBe(0);
    });

    it('devrait compter chaque filtre actif independamment', () => {
      component.transactions = [];
      component.ngOnInit();
      component.filters.status = 'APPROVED';
      component.filters.channel = 'POS';
      component.filters.searchText = 'test';

      expect(component.activeFilterCount).toBe(3);
    });

    it('devrait compter minAmount > 0 comme filtre actif', () => {
      component.transactions = [];
      component.ngOnInit();
      component.filters.minAmount = 100;

      expect(component.activeFilterCount).toBe(1);
    });
  });

  describe('applyFilters / resetFilters', () => {
    it('applyFilters() devrait emettre les filtres courants avec sliderMax', () => {
      component.transactions = [];
      component.ngOnInit();
      let emitted: any;
      component.onFiltersChange.subscribe(v => emitted = v);
      component.filters.status = 'APPROVED';

      component.applyFilters();

      expect(emitted.status).toBe('APPROVED');
      expect(emitted.sliderMax).toBe(component.maxAmountSlider);
    });

    it('resetFilters() devrait revenir aux valeurs par defaut et emettre', () => {
      component.transactions = [];
      component.ngOnInit();
      component.filters.status = 'APPROVED';
      component.filters.minAmount = 500;
      let emitted: any;
      component.onFiltersChange.subscribe(v => emitted = v);

      component.resetFilters();

      expect(component.filters.status).toBe('');
      expect(component.filters.minAmount).toBe(0);
      expect(emitted.status).toBe('');
    });
  });

  describe('minPct / maxPct', () => {
    it('devrait calculer le pourcentage du curseur min', () => {
      component.transactions = [];
      component.ngOnInit();
      component.filters.minAmount = 10_000_000; // moitie de 20M

      expect(component.minPct).toBe(50);
    });

    it('maxPct devrait etre 100 par defaut (maxAmount = maxAmountSlider)', () => {
      component.transactions = [];
      component.ngOnInit();

      expect(component.maxPct).toBe(100);
    });
  });
});
