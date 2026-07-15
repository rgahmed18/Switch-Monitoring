import { TestBed, ComponentFixture } from '@angular/core/testing';
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

    it('devrait calculer les stats sur filteredTransactions si fourni, pas sur le total brut', () => {
      // Bug reel corrige : les stats rapides restaient figees sur le total
      // brut quel que soit le filtre applique par l'utilisateur, car le
      // composant recevait toujours les transactions non filtrees.
      component.transactions = [
        { status: 'APPROVED' }, { status: 'APPROVED' }, { status: 'DECLINED' }, { status: 'DECLINED' },
      ];
      component.filteredTransactions = [{ status: 'APPROVED' }];

      component.ngOnInit();

      expect(component.approvedCount).toBe(1);
      expect(component.declinedCount).toBe(0);
      expect(component.approvalRate).toBe(100);
    });

    it('devrait retomber sur transactions si filteredTransactions n\'est pas fourni', () => {
      component.transactions = [{ status: 'APPROVED' }, { status: 'DECLINED' }];
      component.filteredTransactions = null;

      component.ngOnInit();

      expect(component.approvedCount).toBe(1);
      expect(component.declinedCount).toBe(1);
    });

    it('devrait recalculer les stats quand filteredTransactions change (ngOnChanges)', () => {
      component.transactions = [
        { status: 'APPROVED' }, { status: 'APPROVED' }, { status: 'DECLINED' },
      ];
      component.filteredTransactions = component.transactions;
      component.ngOnInit();
      expect(component.approvedCount).toBe(2);

      component.filteredTransactions = [{ status: 'DECLINED' }];
      component.ngOnChanges();

      expect(component.approvedCount).toBe(0);
      expect(component.declinedCount).toBe(1);
    });
  });

  describe('extractUniqueValues avec filteredTransactions', () => {
    it('la liste des acquereurs doit rester basee sur le total BRUT, pas sur le resultat filtre', () => {
      // Sinon, une fois un premier filtre applique, l'utilisateur ne pourrait
      // plus choisir un acquereur absent du sous-ensemble deja filtre.
      component.transactions = [
        { acquirerBank: 'AWB' }, { acquirerBank: 'BNP' },
      ];
      component.filteredTransactions = [{ acquirerBank: 'AWB' }];

      component.ngOnInit();

      expect(component.uniqueAcquirers).toEqual(['AWB', 'BNP']);
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

describe('AdvancedFiltersComponent — affichage du Total dans le template (rendu reel)', () => {
  // Bug reel corrige : le template affichait toujours {{ transactions?.length }}
  // (le total BRUT) au lieu de suivre filteredTransactions, donc le stat
  // "Total" restait fige quel que soit le filtre applique (montant, statut...),
  // meme apres la premiere correction qui n'avait repare que calculateStats().
  // Describe top-level separe : le describe principal instancie deja un TestBed
  // "vide" via runInInjectionContext, incompatible avec TestBed.createComponent
  // (necessite le module de test standalone configure des le depart).
  let fixture: ComponentFixture<AdvancedFiltersComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AdvancedFiltersComponent] });
    fixture = TestBed.createComponent(AdvancedFiltersComponent);
  });

  it('devrait afficher filteredTransactions.length, pas transactions.length', () => {
    fixture.componentInstance.transactions = [{ status: 'APPROVED' }, { status: 'APPROVED' }, { status: 'DECLINED' }];
    fixture.componentInstance.filteredTransactions = [{ status: 'APPROVED' }];
    fixture.detectChanges();

    const totalEl = fixture.nativeElement.querySelector('.af-stat-value');
    expect(totalEl.textContent.trim()).toBe('1');
  });

  it('devrait retomber sur transactions.length si filteredTransactions est null', () => {
    fixture.componentInstance.transactions = [{ status: 'APPROVED' }, { status: 'DECLINED' }];
    fixture.componentInstance.filteredTransactions = null;
    fixture.detectChanges();

    const totalEl = fixture.nativeElement.querySelector('.af-stat-value');
    expect(totalEl.textContent.trim()).toBe('2');
  });
});
