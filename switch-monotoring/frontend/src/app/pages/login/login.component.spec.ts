import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', [
      'isAuthenticated', 'login', 'mustChangePassword', 'completePasswordChange',
    ]);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    authServiceSpy.isAuthenticated.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('devrait rediriger vers / si deja authentifie au chargement', () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);

    fixture.detectChanges();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  });

  it('ne devrait pas rediriger si non authentifie au chargement', () => {
    fixture.detectChanges();

    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  describe('onSubmit', () => {
    it('devrait bloquer la soumission si les champs sont vides et afficher les erreurs de validation', () => {
      fixture.detectChanges();

      component.onSubmit();

      expect(authServiceSpy.login).not.toHaveBeenCalled();
      expect(component.usernameInvalid).toBeTrue();
      expect(component.passwordInvalid).toBeTrue();
    });

    it('devrait appeler AuthService.login puis rediriger vers / en cas de succes', () => {
      fixture.detectChanges();
      component.credentials = { username: 'a.rguibi@hps.ma', password: 'Str0ng!Pass' };
      authServiceSpy.login.and.returnValue(of({} as any));
      authServiceSpy.mustChangePassword.and.returnValue(false);

      component.onSubmit();

      expect(authServiceSpy.login).toHaveBeenCalledWith(component.credentials);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
      expect(component.isLoading).toBeFalse();
    });

    it('devrait afficher le formulaire de changement de mot de passe si mustChangePassword est true', () => {
      fixture.detectChanges();
      component.credentials = { username: 'a.rguibi@hps.ma', password: 'Str0ng!Pass' };
      authServiceSpy.login.and.returnValue(of({} as any));
      authServiceSpy.mustChangePassword.and.returnValue(true);

      component.onSubmit();

      expect(component.mustChangePwd).toBeTrue();
      expect(routerSpy.navigate).not.toHaveBeenCalledWith(['/']);
    });

    it('devrait afficher le message d\'erreur retourne par AuthService en cas d\'echec', () => {
      fixture.detectChanges();
      component.credentials = { username: 'a.rguibi@hps.ma', password: 'mauvais' };
      authServiceSpy.login.and.returnValue(throwError(() => new Error('Identifiants incorrects.')));

      component.onSubmit();

      expect(component.errorMessage).toBe('Identifiants incorrects.');
      expect(component.isLoading).toBeFalse();
    });
  });

  describe('sendForgotPassword', () => {
    it('devrait refuser un email vide sans appel HTTP', () => {
      fixture.detectChanges();
      component.forgotEmail = '   ';

      component.sendForgotPassword();

      expect(component.forgotError).toContain('adresse email');
      httpMock.expectNone(() => true);
    });

    it('devrait toujours afficher un succes, meme en cas d\'erreur backend (anti-enumeration)', () => {
      fixture.detectChanges();
      component.forgotEmail = 'inconnu@hps.ma';

      component.sendForgotPassword();

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/forgot-password`);
      req.flush({ error: 'peu importe' }, { status: 500, statusText: 'Error' });

      expect(component.forgotSent).toBeTrue();
      expect(component.forgotSending).toBeFalse();
    });

    it('devrait afficher un succes sur une reponse 200', () => {
      fixture.detectChanges();
      component.forgotEmail = 'connu@hps.ma';

      component.sendForgotPassword();

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/forgot-password`);
      req.flush({ message: 'ok' });

      expect(component.forgotSent).toBeTrue();
    });
  });

  describe('onChangePassword', () => {
    it('devrait rejeter un mot de passe trop court', () => {
      fixture.detectChanges();
      component.newPassword = 'short';
      component.confirmPassword = 'short';

      component.onChangePassword();

      expect(component.changeError).toContain('8 caracteres');
      expect(authServiceSpy.completePasswordChange).not.toHaveBeenCalled();
    });

    it('devrait rejeter des mots de passe qui ne correspondent pas', () => {
      fixture.detectChanges();
      component.newPassword = 'Str0ng!Pass';
      component.confirmPassword = 'Different!Pass1';

      component.onChangePassword();

      expect(component.changeError).toContain('correspondent');
      expect(authServiceSpy.completePasswordChange).not.toHaveBeenCalled();
    });

    it('devrait finaliser le changement et rediriger vers / si valide', () => {
      fixture.detectChanges();
      component.newPassword = 'Str0ng!Pass1';
      component.confirmPassword = 'Str0ng!Pass1';

      component.onChangePassword();

      expect(authServiceSpy.completePasswordChange).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
    });
  });
});
