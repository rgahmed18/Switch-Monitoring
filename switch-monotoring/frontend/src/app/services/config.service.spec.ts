import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ConfigService } from './config.service';
import { ApiService } from '../api.service';
import { AppStateService } from '../state.service';
import { PaymentSystemConfig } from '../models';

describe('ConfigService', () => {
  let service: ConfigService;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let appState: AppStateService;

  const sampleConfig: PaymentSystemConfig = {
    zones: { Europe: ['France'] },
    banks: { France: ['BNP'] },
    transactionTypes: { '0100': 'Autorisation' },
    responseCodes: { '00': 'Approuvé' },
    securityMethods: { ATM: ['PIN_ONLINE'] },
    transactionStatuses: { APPROVED: 'Approuvé' },
    mtiTypes: { '0100': 'Autorisation' },
  };

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', [
      'getCompleteConfiguration', 'getZonesAndCountries', 'getBanksByZone',
      'getBanksByCountry', 'getTransactionTypes', 'getTransactionTypesByChannel',
      'getResponseCodes', 'getResponseCode', 'getSecurityMethodsByChannel',
      'getTransactionStatuses',
    ]);

    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: apiSpy }],
    });

    service = TestBed.inject(ConfigService);
    appState = TestBed.inject(AppStateService);
  });

  describe('loadCompleteConfiguration', () => {
    it('devrait charger depuis le backend et mettre a jour le state au premier appel', (done) => {
      apiSpy.getCompleteConfiguration.and.returnValue(of(sampleConfig));

      service.loadCompleteConfiguration().subscribe(config => {
        expect(config).toEqual(sampleConfig);
        expect(appState.systemConfig()).toEqual(sampleConfig);
        done();
      });
    });

    it('devrait utiliser le cache au second appel sans re-appeler le backend', (done) => {
      apiSpy.getCompleteConfiguration.and.returnValue(of(sampleConfig));

      service.loadCompleteConfiguration().subscribe(() => {
        service.loadCompleteConfiguration().subscribe(() => {
          expect(apiSpy.getCompleteConfiguration).toHaveBeenCalledTimes(1);
          done();
        });
      });
    });

    it('devrait definir configError et propager l\'erreur en cas d\'echec backend', (done) => {
      apiSpy.getCompleteConfiguration.and.returnValue(
        throwError(() => ({ error: { message: 'Backend down' } })),
      );

      service.loadCompleteConfiguration().subscribe({
        error: (err) => {
          expect(appState.configLoadError()).toBe('Backend down');
          expect(appState.isLoadingConfig()).toBeFalse();
          done();
        },
      });
    });
  });

  describe('forceReloadConfiguration', () => {
    it('devrait vider le cache et rappeler le backend', (done) => {
      apiSpy.getCompleteConfiguration.and.returnValue(of(sampleConfig));

      service.loadCompleteConfiguration().subscribe(() => {
        service.forceReloadConfiguration().subscribe(() => {
          expect(apiSpy.getCompleteConfiguration).toHaveBeenCalledTimes(2);
          done();
        });
      });
    });
  });

  describe('getZones', () => {
    it('devrait retourner les zones depuis le state si deja charge', (done) => {
      apiSpy.getCompleteConfiguration.and.returnValue(of(sampleConfig));

      service.loadCompleteConfiguration().subscribe(() => {
        service.getZones().subscribe(zones => {
          expect(zones).toEqual(sampleConfig.zones);
          expect(apiSpy.getZonesAndCountries).not.toHaveBeenCalled();
          done();
        });
      });
    });

    it('devrait appeler le backend si le state est vide', (done) => {
      apiSpy.getZonesAndCountries.and.returnValue(of({ Europe: ['France'] }));

      service.getZones().subscribe(zones => {
        expect(zones).toEqual({ Europe: ['France'] });
        done();
      });
    });
  });

  describe('getResponseCodeColor', () => {
    it('devrait retourner success pour le code 00', () => {
      expect(service.getResponseCodeColor('00')).toBe('success');
    });

    it('devrait retourner secondary si aucune config chargee', () => {
      expect(service.getResponseCodeColor('51')).toBe('secondary');
    });

    it('devrait retourner danger pour un code de refus', (done) => {
      apiSpy.getCompleteConfiguration.and.returnValue(of({
        ...sampleConfig,
        responseCodes: { '51': 'Erreur - fonds insuffisants' },
      }));

      service.loadCompleteConfiguration().subscribe(() => {
        expect(service.getResponseCodeColor('51')).toBe('danger');
        done();
      });
    });
  });

  describe('isConfigurationLoaded', () => {
    it('devrait retourner false si aucune configuration n\'est chargee', () => {
      expect(service.isConfigurationLoaded()).toBeFalse();
    });

    it('devrait retourner true si zones/banks/responseCodes sont presents', (done) => {
      apiSpy.getCompleteConfiguration.and.returnValue(of(sampleConfig));

      service.loadCompleteConfiguration().subscribe(() => {
        expect(service.isConfigurationLoaded()).toBeTrue();
        done();
      });
    });
  });

  describe('getConfigurationSummary', () => {
    it('devrait retourner des zeros sans configuration', () => {
      expect(service.getConfigurationSummary()).toEqual({
        totalZones: 0, totalCountries: 0, totalBanks: 0, totalCodes: 0,
      });
    });

    it('devrait calculer les totaux a partir de la configuration chargee', (done) => {
      apiSpy.getCompleteConfiguration.and.returnValue(of(sampleConfig));

      service.loadCompleteConfiguration().subscribe(() => {
        const summary = service.getConfigurationSummary();
        expect(summary.totalZones).toBe(1);
        expect(summary.totalCountries).toBe(1);
        expect(summary.totalBanks).toBe(1);
        expect(summary.totalCodes).toBe(1);
        done();
      });
    });
  });

  describe('clearCache', () => {
    it('devrait forcer un nouvel appel backend apres un clearCache explicite', (done) => {
      apiSpy.getCompleteConfiguration.and.returnValue(of(sampleConfig));

      service.loadCompleteConfiguration().subscribe(() => {
        service.clearCache();
        service.loadCompleteConfiguration().subscribe(() => {
          expect(apiSpy.getCompleteConfiguration).toHaveBeenCalledTimes(2);
          done();
        });
      });
    });
  });
});
