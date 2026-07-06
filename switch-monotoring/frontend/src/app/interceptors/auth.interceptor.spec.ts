import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { of } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  it('devrait ajouter les headers X-User-Role/X-User-Email si utilisateur connecte', (done) => {
    const authServiceStub = {
      currentUser: () => ({ role: 'ADMIN', email: 'qa@hps.com' }),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authServiceStub }],
    });

    const req = new HttpRequest('GET', '/api/v1/alerts');
    const next: HttpHandlerFn = (r) => {
      expect(r.headers.get('X-User-Role')).toBe('ADMIN');
      expect(r.headers.get('X-User-Email')).toBe('qa@hps.com');
      done();
      return of({} as any);
    };

    TestBed.runInInjectionContext(() => authInterceptor(req, next));
  });

  it('devrait laisser passer la requete sans headers si non connecte', (done) => {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { currentUser: () => null } }],
    });

    const req = new HttpRequest('GET', '/api/v1/alerts');
    const next: HttpHandlerFn = (r) => {
      expect(r.headers.has('X-User-Role')).toBeFalse();
      done();
      return of({} as any);
    };

    TestBed.runInInjectionContext(() => authInterceptor(req, next));
  });
});
