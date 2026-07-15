import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ProjectFilterService } from './project-filter.service';
import { environment } from '../../environments/environment';
import { AppUser, LoginCredentials } from '../models';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let projectFilterSpy: jasmine.SpyObj<ProjectFilterService>;

  const credentials: LoginCredentials = { username: 'a.rguibi@hps.ma', password: 'Str0ng!Pass' };
  const mockUser: AppUser = {
    id: 1,
    username: 'a.rguibi',
    firstName: 'Ahmed',
    lastName: 'Rguibi',
    email: 'a.rguibi@hps.ma',
    role: 'USER',
    status: 'ACTIVE',
    projects: [],
    createdAt: '2026-01-01',
  };

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    projectFilterSpy = jasmine.createSpyObj('ProjectFilterService', ['clearProject']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
        { provide: ProjectFilterService, useValue: projectFilterSpy },
      ],
    });

    sessionStorage.clear();
    localStorage.clear();
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('devrait demarrer sans utilisateur connecte si sessionStorage est vide', () => {
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentUser()).toBeNull();
  });

  it('login() devrait appeler POST /auth/login et stocker la session en cas de succes', () => {
    service.login(credentials).subscribe((user) => {
      expect(user.email).toBe(mockUser.email);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(credentials);
    req.flush(mockUser);

    expect(service.isAuthenticated()).toBeTrue();
    expect(service.currentUser()?.email).toBe(mockUser.email);
    expect(projectFilterSpy.clearProject).toHaveBeenCalled();
  });

  it('login() devrait normaliser la chaine "projects" en tableau', () => {
    service.login(credentials).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`);
    req.flush({ ...mockUser, projects: 'AWB, BMCE ,SGMB' } as unknown as AppUser);

    expect(service.currentUser()?.projects).toEqual(['AWB', 'BMCE', 'SGMB']);
  });

  it('login() devrait propager un message d\'erreur exploitable en cas d\'echec', () => {
    let receivedError: Error | undefined;

    service.login(credentials).subscribe({
      error: (err) => (receivedError = err),
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`);
    req.flush({ error: 'Identifiants incorrects.' }, { status: 401, statusText: 'Unauthorized' });

    expect(receivedError?.message).toBe('Identifiants incorrects.');
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('login() devrait utiliser un message par defaut si le backend n\'en fournit pas', () => {
    let receivedError: Error | undefined;

    service.login(credentials).subscribe({
      error: (err) => (receivedError = err),
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`);
    req.flush({}, { status: 500, statusText: 'Internal Server Error' });

    expect(receivedError?.message).toBe('Identifiants incorrects.');
  });

  it('logout() devrait vider la session et rediriger vers /login', () => {
    service.login(credentials).subscribe();
    httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`).flush(mockUser);
    expect(service.isAuthenticated()).toBeTrue();

    service.logout();

    expect(service.isAuthenticated()).toBeFalse();
    expect(sessionStorage.getItem('switch_monitor_user')).toBeNull();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    expect(projectFilterSpy.clearProject).toHaveBeenCalled();
  });

  it('isAdmin() devrait refleter le role de l\'utilisateur connecte', () => {
    service.login(credentials).subscribe();
    httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`).flush({ ...mockUser, role: 'ADMIN' });

    expect(service.isAdmin()).toBeTrue();
  });

  it('isAdmin() devrait retourner false si aucun utilisateur n\'est connecte', () => {
    expect(service.isAdmin()).toBeFalse();
  });

  it('mustChangePassword() devrait refleter le flag renvoye par le backend', () => {
    service.login(credentials).subscribe();
    httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`).flush({ ...mockUser, mustChangePassword: true });

    expect(service.mustChangePassword()).toBeTrue();

    service.completePasswordChange();

    expect(service.mustChangePassword()).toBeFalse();
  });

  describe('refreshCurrentUser()', () => {
    it('devrait appeler GET /auth/me et mettre a jour les projets assignes', async () => {
      service.login(credentials).subscribe();
      httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`).flush({ ...mockUser, projects: [] });

      const refreshPromise = service.refreshCurrentUser();

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/me`);
      expect(req.request.method).toBe('GET');
      req.flush({ ...mockUser, projects: 'SGM' } as unknown as AppUser);
      await refreshPromise;

      expect(service.currentUser()?.projects).toEqual(['SGM']);
    });

    it('ne devrait rien faire si aucun utilisateur n\'est connecte', async () => {
      await service.refreshCurrentUser();

      httpMock.expectNone(`${environment.apiBaseUrl}/auth/me`);
      expect(service.currentUser()).toBeNull();
    });

    it('devrait conserver la session existante en cas d\'erreur reseau', async () => {
      service.login(credentials).subscribe();
      httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`).flush(mockUser);

      const refreshPromise = service.refreshCurrentUser();
      const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/me`);
      req.flush({}, { status: 500, statusText: 'Internal Server Error' });
      await refreshPromise;

      expect(service.currentUser()?.email).toBe(mockUser.email);
    });
  });
});
