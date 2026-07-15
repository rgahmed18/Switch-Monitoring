import { TestBed } from '@angular/core/testing';
import { TranslatePipe } from './translate.pipe';
import { TranslateService } from '../services/translate.service';

describe('TranslatePipe', () => {
  let pipe: TranslatePipe;
  let translateSpy: jasmine.SpyObj<TranslateService>;

  beforeEach(() => {
    translateSpy = jasmine.createSpyObj('TranslateService', ['t']);

    TestBed.configureTestingModule({
      providers: [{ provide: TranslateService, useValue: translateSpy }],
    });

    pipe = new TranslatePipe(translateSpy);
  });

  it('devrait deleguer la traduction a TranslateService.t()', () => {
    translateSpy.t.and.returnValue('Dashboard');

    const result = pipe.transform('nav.dashboard');

    expect(result).toBe('Dashboard');
    expect(translateSpy.t).toHaveBeenCalledWith('nav.dashboard');
  });

  it('devrait retourner la valeur brute retournee par le service pour une cle inconnue', () => {
    translateSpy.t.and.returnValue('cle.inconnue');

    expect(pipe.transform('cle.inconnue')).toBe('cle.inconnue');
  });
});
