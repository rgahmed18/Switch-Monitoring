import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { UserStoreService, MOCK_USERS } from './user-store.service';
import { environment } from '../../environments/environment';

describe('UserStoreService', () => {
  let service: UserStoreService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserStoreService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('devrait demarrer avec les utilisateurs mockes (aucun appel HTTP au chargement)', () => {
    expect(service.users().length).toBe(MOCK_USERS.length);
    httpMock.expectNone(() => true);
  });

  describe('loadFromBackend', () => {
    it('devrait remplacer les utilisateurs par la reponse backend normalisee', () => {
      service.loadFromBackend();

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/users`);
      req.flush([
        { id: 99, username: 'x.test', email: 'x@test.ma', role: 'admin', status: 'blocked', projects: 'AWB, BMCE' },
      ]);

      const users = service.users();
      expect(users.length).toBe(1);
      expect(users[0].role).toBe('ADMIN');
      expect(users[0].status).toBe('BLOCKED');
      expect(users[0].projects).toEqual(['AWB', 'BMCE']);
    });

    it('devrait conserver les mock users si la reponse backend est vide', () => {
      service.loadFromBackend();

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/users`);
      req.flush([]);

      expect(service.users().length).toBe(MOCK_USERS.length);
    });

    it('devrait conserver les mock users si le backend echoue (403 non-admin)', () => {
      service.loadFromBackend();

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/users`);
      req.flush({ error: 'forbidden' }, { status: 403, statusText: 'Forbidden' });

      expect(service.users().length).toBe(MOCK_USERS.length);
    });

    it('devrait normaliser un role/status inconnu vers les valeurs par defaut', () => {
      service.loadFromBackend();

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/users`);
      req.flush([{ id: 1, role: 'SUPERADMIN', status: 'WEIRD' }]);

      const user = service.users()[0];
      expect(user.role).toBe('USER');
      expect(user.status).toBe('ACTIVE');
    });
  });

  describe('resetUserPassword', () => {
    it('devrait generer un mot de passe temporaire de 10 caracteres', () => {
      const targetUser = service.users()[0];

      const result = service.resetUserPassword(targetUser.id);

      expect(result.tempPassword.length).toBe(10);
    });

    it('devrait marquer mustChangePassword=true pour l\'utilisateur cible uniquement', () => {
      const targetUser = service.users()[0];
      const otherUser = service.users()[1];

      service.resetUserPassword(targetUser.id);

      expect(service.users().find(u => u.id === targetUser.id)?.mustChangePassword).toBeTrue();
      expect(service.users().find(u => u.id === otherUser.id)?.mustChangePassword).toBeFalsy();
    });
  });
});
