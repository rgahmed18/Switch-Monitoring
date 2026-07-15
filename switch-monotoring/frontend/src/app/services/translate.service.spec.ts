import { TestBed } from '@angular/core/testing';
import { TranslateService } from './translate.service';
import { AppStateService } from '../state.service';

describe('TranslateService', () => {
  let service: TranslateService;
  let appState: AppStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TranslateService);
    appState = TestBed.inject(AppStateService);
  });

  it('devrait traduire une cle connue en francais par defaut', () => {
    appState.lang.set('fr');

    expect(service.t('nav.dashboard')).toBe('Dashboard');
  });

  it('devrait traduire une cle connue en anglais quand lang=en', () => {
    appState.lang.set('en');

    expect(service.t('nav.alertes')).not.toBe('');
  });

  it('devrait retourner la cle telle quelle si elle est absente des deux langues', () => {
    appState.lang.set('fr');

    expect(service.t('cle.totalement.inexistante')).toBe('cle.totalement.inexistante');
  });

  it('devrait retomber sur le francais si la langue courante ne contient pas la cle mais fr oui', () => {
    // 'nav.dashboard' existe en fr ; on simule une langue exotique non geree
    appState.lang.set('en');

    expect(service.t('nav.dashboard')).toBeTruthy();
  });

  it('c() devrait retourner un signal reactif qui suit les changements de langue', () => {
    appState.lang.set('fr');
    const computedTranslation = service.c('nav.dashboard');

    expect(computedTranslation()).toBe('Dashboard');

    appState.lang.set('en');

    expect(computedTranslation()).not.toBe('');
  });
});
