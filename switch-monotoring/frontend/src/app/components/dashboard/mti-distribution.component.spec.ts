import { MtiDistributionComponent } from './mti-distribution.component';
import { ApiService } from '../../api.service';

describe('MtiDistributionComponent', () => {
  let component: MtiDistributionComponent;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['getLatestTransactions']);
    component = new MtiDistributionComponent(apiSpy);
  });

  it('devrait normaliser un MTI 1xxx en 0xxx', () => {
    component.transactions = [{ mtiCode: '1200' }];

    component.ngOnInit();

    expect(component.mtiDetails[0].code).toBe('0200');
  });

  it('devrait utiliser Unknown pour un mtiCode absent', () => {
    component.transactions = [{}];

    component.ngOnInit();

    expect(component.mtiDetails[0].code).toBe('Unknown');
  });

  it('devrait calculer le pourcentage de chaque MTI', () => {
    component.transactions = [
      { mtiCode: '0100' }, { mtiCode: '0100' }, { mtiCode: '0200' }, { mtiCode: '0200' },
    ];

    component.ngOnInit();

    const auth = component.mtiDetails.find(m => m.code === '0100');
    expect(auth.percentage).toBe(50);
  });

  it('devrait resoudre le nom du MTI depuis le dictionnaire connu', () => {
    component.transactions = [{ mtiCode: '0100' }];

    component.ngOnInit();

    expect(component.mtiDetails[0].name).toBe('Demande d\'autorisation');
  });

  it('topMti devrait etre le MTI le plus frequent', () => {
    component.transactions = [
      { mtiCode: '0100' }, { mtiCode: '0200' }, { mtiCode: '0200' }, { mtiCode: '0200' },
    ];

    component.ngOnInit();

    expect(component.topMti.code).toBe('0200');
  });

  it('authTransactions devrait sommer uniquement les MTI de type auth (0100/0110)', () => {
    component.transactions = [
      { mtiCode: '0100' }, { mtiCode: '0110' }, { mtiCode: '0200' },
    ];

    component.ngOnInit();

    expect(component.authTransactions).toBe(2);
  });

  it('ngOnChanges ne devrait rien faire si transactions est vide', () => {
    component.transactions = [];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.mtiDetails.length).toBe(0);
  });

  it('ngOnChanges devrait recalculer si transactions non vide', () => {
    component.transactions = [{ mtiCode: '0100' }];

    component.ngOnChanges({ transactions: {} as any });

    expect(component.mtiDetails.length).toBe(1);
  });

  it('devrait reinitialiser mtiDetails si le filtre passe d\'un resultat non-vide a vide (pas de valeurs figees)', () => {
    component.transactions = [{ mtiCode: '0100' }, { mtiCode: '0200' }];
    component.ngOnChanges({ transactions: {} as any });
    expect(component.mtiDetails.length).toBe(2);

    component.transactions = [];
    component.ngOnChanges({ transactions: {} as any });

    expect(component.mtiDetails).toEqual([]);
    expect(component.chartData).toBeNull();
  });

  describe('helpers de style (getMtiClass/getMtiTextColor/getMtiBgColor)', () => {
    beforeEach(() => {
      component.transactions = [{ mtiCode: '0100' }];
      component.ngOnInit();
    });

    it('getMtiClass devrait retourner une classe bleue pour un MTI auth', () => {
      expect(component.getMtiClass('0100')).toContain('blue');
    });

    it('getMtiTextColor devrait retourner un texte gris pour un code inconnu', () => {
      expect(component.getMtiTextColor('9999')).toBe('text-gray-700');
    });

    it('getMtiBgColor devrait retourner un fond vert pour un MTI financier', () => {
      expect(component.getMtiBgColor('0200')).toBe('bg-green-500');
    });
  });
});
