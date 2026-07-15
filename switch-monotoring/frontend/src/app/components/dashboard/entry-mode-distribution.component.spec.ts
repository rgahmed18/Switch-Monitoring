import { EntryModeDistributionComponent } from './entry-mode-distribution.component';
import { ApiService } from '../../api.service';

describe('EntryModeDistributionComponent', () => {
  let component: EntryModeDistributionComponent;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['getLatestTransactions']);
    component = new EntryModeDistributionComponent(apiSpy);
  });

  it('devrait regrouper les transactions par entry_mode', () => {
    component.transactions = [
      { entry_mode: '05' }, { entry_mode: '05' }, { entry_mode: '02' },
    ];

    component.ngOnInit();

    const chip = component.entryModes.find(m => m.code === '05');
    expect(chip.count).toBe(2);
  });

  it('devrait utiliser 00 (Non specifie) si entry_mode absent', () => {
    component.transactions = [{}];

    component.ngOnInit();

    expect(component.entryModes[0].code).toBe('00');
  });

  it('devrait calculer contactlessPercentage sur les modes 06/07/08/09', () => {
    component.transactions = [
      { entry_mode: '06' }, { entry_mode: '05' },
    ];

    component.ngOnInit();

    expect(component.contactlessCount).toBe(1);
    expect(component.contactlessPercentage).toBe(50);
  });

  it('devrait calculer chipPercentage sur le mode 05', () => {
    component.transactions = [{ entry_mode: '05' }, { entry_mode: '05' }];

    component.ngOnInit();

    expect(component.chipPercentage).toBe(100);
  });

  it('devrait calculer manualPercentage sur les modes 01/02', () => {
    component.transactions = [{ entry_mode: '02' }, { entry_mode: '05' }];

    component.ngOnInit();

    expect(component.manualPercentage).toBe(50);
  });

  it('securePaymentsPercentage devrait sommer contactless + chip', () => {
    component.transactions = [{ entry_mode: '06' }, { entry_mode: '05' }, { entry_mode: '02' }];

    component.ngOnInit();

    expect(component.securePaymentsPercentage).toBe(component.contactlessPercentage + component.chipPercentage);
    expect(component.riskyPaymentsPercentage).toBe(100 - component.securePaymentsPercentage);
  });

  it('manualFraudRate devrait etre 0 sans transaction manuelle', () => {
    component.transactions = [{ entry_mode: '05' }];

    component.ngOnInit();

    expect(component.manualFraudRate).toBe(0);
  });

  it('manualFraudRate devrait compter les echecs (response_code != 00) parmi les manuelles', () => {
    component.transactions = [
      { entry_mode: '02', response_code: '51' },
      { entry_mode: '02', response_code: '00' },
    ];

    component.ngOnInit();

    expect(component.manualFraudRate).toBe(50);
  });

  describe('helpers de style', () => {
    it('getModeClass devrait retourner une classe verte pour contactless', () => {
      expect(component.getModeClass('06')).toContain('green');
    });

    it('getModeTextColor devrait retourner un texte gris pour un code inconnu', () => {
      expect(component.getModeTextColor('99')).toBe('text-gray-700');
    });

    it('getModeBgColor devrait retourner un fond bleu fonce pour manual', () => {
      expect(component.getModeBgColor('02')).toBe('bg-blue-600');
    });
  });
});
