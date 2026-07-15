import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { SetPasswordComponent } from './set-password.component';
import { environment } from '../../../environments/environment';

describe('SetPasswordComponent', () => {
  let component: SetPasswordComponent;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let activatedRoute: Partial<ActivatedRoute>;

  function createComponent(token: string | null, url: string) {
    routerSpy = jasmine.createSpyObj('Router', ['navigate'], { url });
    activatedRoute = {
      snapshot: { paramMap: convertToParamMap({ token: token ?? '' }) } as any,
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    component = new SetPasswordComponent(
      TestBed.inject(ActivatedRoute), TestBed.inject(Router), TestBed.inject(HttpClient),
    );
  }

  afterEach(() => httpMock.verify());

  it('devrait passer en etat invalid si le token est absent de l\'URL', () => {
    createComponent(null, '/activate/');

    component.ngOnInit();

    expect(component.state).toBe('invalid');
    expect(component.invalidReason).toContain('Token manquant');
  });

  it('devrait detecter le mode reset via l\'URL', () => {
    createComponent('tok-123', '/reset-password/tok-123');

    component.ngOnInit();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/reset-token-info/tok-123`);
    req.flush({ valid: true, firstName: 'Ahmed', email: 'a@hps.ma' });

    expect(component.mode).toBe('reset');
    expect(component.state).toBe('valid');
  });

  it('devrait detecter le mode activate par defaut', () => {
    createComponent('tok-123', '/activate/tok-123');

    component.ngOnInit();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/token-info/tok-123`);
    req.flush({ valid: true, firstName: 'Ahmed', email: 'a@hps.ma' });

    expect(component.mode).toBe('activate');
  });

  it('devrait passer en invalid si le backend retourne valid=false', () => {
    createComponent('tok-123', '/activate/tok-123');

    component.ngOnInit();

    const req = httpMock.expectOne(() => true);
    req.flush({ valid: false, reason: 'Lien expiré.' });

    expect(component.state).toBe('invalid');
    expect(component.invalidReason).toBe('Lien expiré.');
  });

  it('devrait passer en invalid si le backend est indisponible', () => {
    createComponent('tok-123', '/activate/tok-123');

    component.ngOnInit();

    const req = httpMock.expectOne(() => true);
    req.flush({}, { status: 500, statusText: 'Error' });

    expect(component.state).toBe('invalid');
    expect(component.invalidReason).toContain('indisponible');
  });

  describe('strength', () => {
    beforeEach(() => createComponent('tok-123', '/activate/tok-123'));

    it('devrait retourner 0 pour un mot de passe vide', () => {
      component.password = '';
      expect(component.strength).toBe(0);
    });

    it('devrait augmenter le score avec longueur/majuscule/chiffre/special', () => {
      component.password = 'Str0ng!Pass1234';
      expect(component.strength).toBe(4);
    });

    it('devrait plafonner a 4', () => {
      component.password = 'ExtremelyStr0ng!Password1234567890';
      expect(component.strength).toBeLessThanOrEqual(4);
    });
  });

  describe('submit', () => {
    beforeEach(() => createComponent('tok-123', '/activate/tok-123'));

    it('devrait rejeter un mot de passe trop court', () => {
      component.password = 'short';
      component.confirmPassword = 'short';

      component.submit();

      expect(component.errorMsg).toContain('8 caractères');
      httpMock.expectNone(() => true);
    });

    it('devrait rejeter des mots de passe qui ne correspondent pas', () => {
      component.password = 'Str0ng!Pass';
      component.confirmPassword = 'Different!Pass1';

      component.submit();

      expect(component.errorMsg).toContain('ne correspondent pas');
    });

    it('devrait passer en succes si le backend confirme', () => {
      component.password = 'Str0ng!Pass1';
      component.confirmPassword = 'Str0ng!Pass1';

      component.submit();

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/activate`);
      req.flush({ success: true });

      expect(component.state).toBe('success');
    });

    it('devrait afficher l\'erreur backend en cas d\'echec', () => {
      component.password = 'Str0ng!Pass1';
      component.confirmPassword = 'Str0ng!Pass1';

      component.submit();

      const req = httpMock.expectOne(() => true);
      req.flush({ success: false, error: 'Lien deja utilise.' });

      expect(component.errorMsg).toBe('Lien deja utilise.');
      expect(component.isSubmitting).toBeFalse();
    });
  });

  describe('goToLogin', () => {
    it('devrait naviguer vers /login', () => {
      createComponent('tok-123', '/activate/tok-123');

      component.goToLogin();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });
  });
});
