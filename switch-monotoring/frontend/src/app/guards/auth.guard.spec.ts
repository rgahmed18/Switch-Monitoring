import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated']);
    routerSpy = jasmine.createSpyObj('Router', ['createUrlTree']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });
  });

  it('devrait autoriser l\'acces si l\'utilisateur est authentifie', () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() => authGuard(null as any, null as any));

    expect(result).toBeTrue();
  });

  it('devrait rediriger vers /login si non authentifie', () => {
    authServiceSpy.isAuthenticated.and.returnValue(false);
    const urlTree = {} as any;
    routerSpy.createUrlTree.and.returnValue(urlTree);

    const result = TestBed.runInInjectionContext(() => authGuard(null as any, null as any));

    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toBe(urlTree);
  });
});
