import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { EmailValidationService } from './email-validation.service';
import { environment } from '../../environments/environment';

describe('EmailValidationService', () => {
  let service: EmailValidationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EmailValidationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('validateFormat', () => {
    it('devrait accepter un email bien forme', () => {
      expect(service.validateFormat('qa@hps.ma')).toBeTrue();
    });

    it('devrait rejeter un email sans arobase', () => {
      expect(service.validateFormat('pas-un-email')).toBeFalse();
    });

    it('devrait rejeter un domaine jetable connu', () => {
      expect(service.validateFormat('qa@mailinator.com')).toBeFalse();
      expect(service.validateFormat('qa@yopmail.com')).toBeFalse();
    });

    it('devrait ignorer la casse et les espaces', () => {
      expect(service.validateFormat('  QA@HPS.MA  ')).toBeTrue();
    });

    it('devrait rejeter un domaine sans TLD', () => {
      expect(service.validateFormat('qa@localhost')).toBeFalse();
    });
  });

  describe('validateDomain', () => {
    it('devrait retourner invalid sans appel HTTP si le format est deja invalide', (done) => {
      service.validateDomain('pas-un-email').subscribe(result => {
        expect(result.valid).toBeFalse();
        expect(result.reason).toContain('invalide');
        done();
      });

      httpMock.expectNone(() => true);
    });

    it('devrait appeler le backend et relayer sa reponse si le format est valide', (done) => {
      service.validateDomain('qa@hps.ma').subscribe(result => {
        expect(result.valid).toBeTrue();
        done();
      });

      const req = httpMock.expectOne(
        r => r.url === `${environment.apiBaseUrl}/admin/validate-email`,
      );
      expect(req.request.params.get('email')).toBe('qa@hps.ma');
      req.flush({ valid: true });
    });

    it('devrait degrader gracieusement si le backend est indisponible', (done) => {
      service.validateDomain('qa@hps.ma').subscribe(result => {
        expect(result.valid).toBeTrue();
        expect(result.reason).toContain('indisponible');
        done();
      });

      const req = httpMock.expectOne(() => true);
      req.flush({}, { status: 500, statusText: 'Error' });
    });
  });
});
