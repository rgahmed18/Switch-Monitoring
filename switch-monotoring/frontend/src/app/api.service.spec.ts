import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { AuthService } from './services/auth.service';
import { UserStoreService } from './services/user-store.service';
import { authInterceptor } from './interceptors/auth.interceptor';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AutohoActivityAdm } from './models';
import { environment } from '../environments/environment';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({ role: 'ADMIN', email: 'qa@hps.com' }),
          },
        },
        // UserStoreService declenche un GET /admin/users dans son constructeur ;
        // on le remplace pour isoler le test sur ApiService uniquement.
        { provide: UserStoreService, useValue: {} },
      ],
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getLatestTransactions devrait appeler /autho-activity/latest avec le header X-User-Role propage par l\'interceptor', () => {
    const mockResponse: AutohoActivityAdm[] = [];

    service.getLatestTransactions(2000).subscribe((result) => {
      expect(result).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiBaseUrl}/autho-activity/latest`
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('limit')).toBe('2000');
    expect(req.request.headers.get('X-User-Role')).toBe('ADMIN');
    expect(req.request.headers.get('X-User-Email')).toBe('qa@hps.com');

    req.flush(mockResponse);
  });

  it('getLatestTransactions devrait reutiliser le cache pendant la fenetre de TTL (pas de second appel HTTP)', () => {
    let secondCallResult: AutohoActivityAdm[] | undefined;

    service.getLatestTransactions(2000).subscribe();
    httpMock.expectOne(() => true).flush([]);

    // Deuxieme appel immediat : doit venir du cache, aucune nouvelle requete HTTP
    service.getLatestTransactions(2000).subscribe((result) => (secondCallResult = result));
    httpMock.expectNone(() => true);

    expect(secondCallResult).toEqual([]);
  });
});
