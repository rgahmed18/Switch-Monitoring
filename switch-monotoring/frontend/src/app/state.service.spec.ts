import { TestBed } from '@angular/core/testing';
import { AppStateService } from './state.service';
import { Transaction, PaymentSystemConfig } from './models';

function tx(overrides: Partial<Transaction>): Transaction {
  return { ...overrides } as Transaction;
}

describe('AppStateService', () => {
  let service: AppStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppStateService);
  });

  describe('toggleLive / toggleLanguage', () => {
    it('toggleLive() devrait inverser isLive', () => {
      expect(service.isLive()).toBeTrue();
      service.toggleLive();
      expect(service.isLive()).toBeFalse();
    });

    it('toggleLanguage() devrait basculer entre fr et en', () => {
      service.lang.set('en');
      service.toggleLanguage();
      expect(service.lang()).toBe('fr');
      service.toggleLanguage();
      expect(service.lang()).toBe('en');
    });
  });

  describe('setFilters / resetFilters', () => {
    it('setFilters() devrait fusionner partiellement sans ecraser les autres champs', () => {
      service.setFilters({ zone: 'Europe' });

      expect(service.filters().zone).toBe('Europe');
      expect(service.filters().transactionType).toBe('Toutes'); // inchange
    });

    it('resetFilters() devrait revenir aux valeurs par defaut', () => {
      service.setFilters({ zone: 'Europe', currency: 'EUR' });

      service.resetFilters();

      expect(service.filters().zone).toBe('');
      expect(service.filters().currency).toBeUndefined();
    });
  });

  describe('applyFilters - date', () => {
    it('devrait exclure les transactions avant dateStart', () => {
      service.setFilters({ dateStart: '2026-07-10' });
      const txs = [
        tx({ referenceNumber: 'OLD', timestamp: '2026-07-01T10:00:00' } as any),
        tx({ referenceNumber: 'NEW', timestamp: '2026-07-14T10:00:00' } as any),
      ];

      const result = service.applyFilters(txs);

      expect(result.map(t => t.referenceNumber)).toEqual(['NEW']);
    });

    it('devrait exclure les transactions apres dateEnd', () => {
      service.setFilters({ dateEnd: '2026-07-10' });
      const txs = [
        tx({ referenceNumber: 'OLD', timestamp: '2026-07-01T10:00:00' } as any),
        tx({ referenceNumber: 'NEW', timestamp: '2026-07-14T10:00:00' } as any),
      ];

      const result = service.applyFilters(txs);

      expect(result.map(t => t.referenceNumber)).toEqual(['OLD']);
    });
  });

  describe('applyFilters - heure', () => {
    it('devrait filtrer sur la tranche horaire timeStart/timeEnd', () => {
      service.setFilters({ timeStart: '08:00', timeEnd: '10:00' });
      const txs = [
        tx({ referenceNumber: 'NIGHT', timestamp: '2026-07-14T02:00:00' } as any),
        tx({ referenceNumber: 'MORNING', timestamp: '2026-07-14T09:00:00' } as any),
      ];

      const result = service.applyFilters(txs);

      expect(result.map(t => t.referenceNumber)).toEqual(['MORNING']);
    });
  });

  describe('applyFilters - zone', () => {
    it('devrait filtrer Local sur le code pays 504', () => {
      service.setFilters({ zone: 'Local' });
      const txs = [
        tx({ referenceNumber: 'MA', country: '504' } as any),
        tx({ referenceNumber: 'FR', country: '250' } as any),
      ];

      const result = service.applyFilters(txs);

      expect(result.map(t => t.referenceNumber)).toEqual(['MA']);
    });

    it('devrait filtrer International sur tout sauf 504', () => {
      service.setFilters({ zone: 'International' });
      const txs = [
        tx({ referenceNumber: 'MA', country: '504' } as any),
        tx({ referenceNumber: 'FR', country: '250' } as any),
      ];

      const result = service.applyFilters(txs);

      expect(result.map(t => t.referenceNumber)).toEqual(['FR']);
    });

    it('devrait filtrer par zone geographique (Europe)', () => {
      service.setFilters({ zone: 'Europe' });
      const txs = [
        tx({ referenceNumber: 'FR', country: '250' } as any),
        tx({ referenceNumber: 'MA', country: '504' } as any),
      ];

      const result = service.applyFilters(txs);

      expect(result.map(t => t.referenceNumber)).toEqual(['FR']);
    });
  });

  describe('applyFilters - pays', () => {
    it('devrait resoudre un nom de pays lisible vers son code ISO', () => {
      service.setFilters({ selectedCountry: 'Maroc' });
      const txs = [
        tx({ referenceNumber: 'MA', country: '504' } as any),
        tx({ referenceNumber: 'FR', country: '250' } as any),
      ];

      const result = service.applyFilters(txs);

      expect(result.map(t => t.referenceNumber)).toEqual(['MA']);
    });

    it('devrait ignorer les accents et la casse', () => {
      service.setFilters({ selectedCountry: 'etats-unis' });
      const txs = [tx({ referenceNumber: 'US', country: '840' } as any)];

      const result = service.applyFilters(txs);

      expect(result.map(t => t.referenceNumber)).toEqual(['US']);
    });
  });

  describe('applyFilters - banque', () => {
    it('devrait resoudre un nom de banque complet vers son code court', () => {
      service.setFilters({ selectedBank: 'Attijariwafa Bank' });
      const txs = [
        tx({ referenceNumber: 'AWB', acquirerBank: 'AWB' } as any),
        tx({ referenceNumber: 'BMCE', acquirerBank: 'BMCE' } as any),
      ];

      const result = service.applyFilters(txs);

      expect(result.map(t => t.referenceNumber)).toEqual(['AWB']);
    });

    it('devrait matcher sur issuingBank egalement', () => {
      service.setFilters({ selectedBank: 'AWB' });
      const txs = [tx({ referenceNumber: 'ISS', issuingBank: 'AWB' } as any)];

      const result = service.applyFilters(txs);

      expect(result.map(t => t.referenceNumber)).toEqual(['ISS']);
    });
  });

  describe('applyFilters - canal', () => {
    it('devrait matcher ATM avec GAB ou ATM', () => {
      service.setFilters({ channel: 'ATM' });
      const txs = [
        tx({ referenceNumber: 'GAB', channel: 'GAB' } as any),
        tx({ referenceNumber: 'POS', channel: 'POS' } as any),
      ];

      const result = service.applyFilters(txs);

      expect(result.map(t => t.referenceNumber)).toEqual(['GAB']);
    });

    it('devrait matcher ECOM avec ECM ou ECOM', () => {
      service.setFilters({ channel: 'ECOM' });
      const txs = [
        tx({ referenceNumber: 'ECM', channel: 'ECM' } as any),
        tx({ referenceNumber: 'GAB', channel: 'GAB' } as any),
      ];

      const result = service.applyFilters(txs);

      expect(result.map(t => t.referenceNumber)).toEqual(['ECM']);
    });
  });

  describe('applyFilters - mtiGroup', () => {
    it('devrait normaliser un MTI 1xxx en 0xxx avant comparaison', () => {
      service.setFilters({ mtiGroup: 'ACHAT' });
      const txs = [
        tx({ referenceNumber: 'MATCH', messageType: '1200' } as any),
        tx({ referenceNumber: 'NOMATCH', messageType: '1800' } as any),
      ];

      const result = service.applyFilters(txs);

      expect(result.map(t => t.referenceNumber)).toEqual(['MATCH']);
    });
  });

  describe('applyFilters - type (Message Type Indicator precis)', () => {
    it('devrait filtrer sur le code MTI extrait du libelle "code - description"', () => {
      service.setFilters({ type: '0100 - Authorization Request' });
      const txs = [
        tx({ referenceNumber: 'MATCH',   messageType: '0100' } as any),
        tx({ referenceNumber: 'NOMATCH', messageType: '0200' } as any),
      ];

      const result = service.applyFilters(txs);

      expect(result.map(t => t.referenceNumber)).toEqual(['MATCH']);
    });

    it('devrait normaliser un MTI 1xxx brut Oracle avant comparaison', () => {
      service.setFilters({ type: '0200 - Financial Request' });
      const txs = [tx({ referenceNumber: 'MATCH', messageType: '1200' } as any)];

      const result = service.applyFilters(txs);

      expect(result.map(t => t.referenceNumber)).toEqual(['MATCH']);
    });
  });

  describe('applyFilters - transactionType (processing code)', () => {
    it('devrait filtrer sur le code extrait du libelle "code - description"', () => {
      service.setFilters({ transactionType: '01 - Purchase' });
      const txs = [
        tx({ referenceNumber: 'MATCH',   processingCode: '01' } as any),
        tx({ referenceNumber: 'NOMATCH', processingCode: '02' } as any),
      ];

      const result = service.applyFilters(txs);

      expect(result.map(t => t.referenceNumber)).toEqual(['MATCH']);
    });

    it('ne devrait rien filtrer si la valeur est "Toutes" (defaut)', () => {
      service.setFilters({ transactionType: 'Toutes' });
      const txs = [
        tx({ referenceNumber: 'A', processingCode: '01' } as any),
        tx({ referenceNumber: 'B', processingCode: '02' } as any),
      ];

      const result = service.applyFilters(txs);

      expect(result.length).toBe(2);
    });
  });

  describe('applyFilters - devise', () => {
    it('devrait filtrer sur la devise exacte', () => {
      service.setFilters({ currency: 'EUR' });
      const txs = [
        tx({ referenceNumber: 'EUR', currency: 'EUR' } as any),
        tx({ referenceNumber: 'MAD', currency: 'MAD' } as any),
      ];

      const result = service.applyFilters(txs);

      expect(result.map(t => t.referenceNumber)).toEqual(['EUR']);
    });
  });

  describe('applyFilters - groupe code reponse', () => {
    it('devrait filtrer SUCCES sur les codes 00/000', () => {
      service.setFilters({ codeReponseGroupe: 'SUCCES' });
      const txs = [
        tx({ referenceNumber: 'OK', actionCode: '000' } as any),
        tx({ referenceNumber: 'KO', actionCode: '051' } as any),
      ];

      const result = service.applyFilters(txs);

      expect(result.map(t => t.referenceNumber)).toEqual(['OK']);
    });

    it('devrait filtrer FRAUDE sur les codes de la liste fraude', () => {
      service.setFilters({ codeReponseGroupe: 'FRAUDE' });
      const txs = [tx({ referenceNumber: 'FRAUD', actionCode: '181' } as any)];

      const result = service.applyFilters(txs);

      expect(result.map(t => t.referenceNumber)).toEqual(['FRAUD']);
    });

    it('devrait filtrer REFUS sur un code qui n\'est dans aucune autre categorie', () => {
      service.setFilters({ codeReponseGroupe: 'REFUS' });
      const txs = [
        tx({ referenceNumber: 'REFUS_GEN', actionCode: '100' } as any),
        tx({ referenceNumber: 'SUCCES', actionCode: '000' } as any),
      ];

      const result = service.applyFilters(txs);

      expect(result.map(t => t.referenceNumber)).toEqual(['REFUS_GEN']);
    });
  });

  describe('applyFilters - aucun filtre actif', () => {
    it('devrait retourner toutes les transactions sans filtre', () => {
      const txs = [tx({ referenceNumber: 'A' }), tx({ referenceNumber: 'B' })];

      const result = service.applyFilters(txs);

      expect(result.length).toBe(2);
    });
  });

  describe('setSystemConfig', () => {
    it('devrait mettre a jour systemConfig et referenceData', () => {
      const config: PaymentSystemConfig = {
        zones: { Europe: ['France'] },
        banks: { France: ['BNP'] },
        transactionTypes: {},
        responseCodes: {},
        securityMethods: {},
        transactionStatuses: {},
        mtiTypes: {},
      };

      service.setSystemConfig(config);

      expect(service.systemConfig()).toEqual(config);
      expect(service.referenceData().zones).toEqual(['Europe']);
      expect(service.configLoadError()).toBeNull();
    });
  });

  describe('setConfigLoading / setConfigError', () => {
    it('devrait mettre a jour isLoadingConfig', () => {
      service.setConfigLoading(true);
      expect(service.isLoadingConfig()).toBeTrue();
    });

    it('devrait mettre a jour configLoadError', () => {
      service.setConfigError('Erreur reseau');
      expect(service.configLoadError()).toBe('Erreur reseau');
    });
  });

  describe('getFiltersAsQueryString', () => {
    it('devrait exclure les valeurs par defaut (Toutes, vide, 0)', () => {
      service.setFilters({ zone: 'Europe' });

      const qs = service.getFiltersAsQueryString();

      expect(qs).toContain('zone=Europe');
      expect(qs).not.toContain('transactionType');
    });
  });

  describe('hasActiveFilters / getActiveFilterCount', () => {
    // Note : l'etat initial a deja fraudScoreMax=100 et latencyMax=30000 (valeurs
    // par defaut non nulles), donc hasActiveFilters() est vrai des le depart.
    it('hasActiveFilters() devrait deja etre actif a l\'etat initial (bornes par defaut non nulles)', () => {
      expect(service.hasActiveFilters()).toBeTrue();
    });

    it('hasActiveFilters() devrait rester actif avec un filtre supplementaire explicite', () => {
      service.setFilters({ zone: 'Europe' });
      expect(service.hasActiveFilters()).toBeTrue();
    });

    it('getActiveFilterCount() devrait compter uniquement les filtres pertinents', () => {
      service.setFilters({ zone: 'Europe', currency: 'EUR', selectedCountry: 'Maroc' });

      expect(service.getActiveFilterCount()).toBe(3);
    });

    it('getActiveFilterCount() devrait compter le filtre type (MTI precis)', () => {
      service.setFilters({ type: '0100 - Authorization Request' });

      expect(service.getActiveFilterCount()).toBe(1);
    });

    it('getActiveFilterCount() devrait compter transactionType sauf si egal a "Toutes"', () => {
      service.setFilters({ transactionType: 'Toutes' });
      expect(service.getActiveFilterCount()).toBe(0);

      service.setFilters({ transactionType: '01 - Purchase' });
      expect(service.getActiveFilterCount()).toBe(1);
    });
  });
});
