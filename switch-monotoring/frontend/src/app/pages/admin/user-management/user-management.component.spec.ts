import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { UserManagementComponent } from './user-management.component';
import { UserStoreService } from '../../../services/user-store.service';
import { EmailValidationService } from '../../../services/email-validation.service';
import { BankProjectStoreService } from '../../../services/bank-project-store.service';
import { AppUser } from '../../../models';
import { environment } from '../../../../environments/environment';

function user(overrides: Partial<AppUser>): AppUser {
  return { id: 1, username: 'u', firstName: 'Ahmed', lastName: 'R', email: 'a@hps.ma',
    role: 'USER', status: 'ACTIVE', projects: [], createdAt: '2026-01-01', ...overrides } as AppUser;
}

describe('UserManagementComponent', () => {
  let component: UserManagementComponent;
  let httpMock: HttpTestingController;
  let userStoreSpy: jasmine.SpyObj<UserStoreService>;
  let emailValidatorSpy: jasmine.SpyObj<EmailValidationService>;
  let bankStoreSpy: jasmine.SpyObj<BankProjectStoreService>;
  let usersUpdateSpy: jasmine.Spy;

  beforeEach(() => {
    usersUpdateSpy = jasmine.createSpy('update');
    userStoreSpy = jasmine.createSpyObj('UserStoreService', ['loadFromBackend', 'resetUserPassword'], {
      users: Object.assign(() => [user({ id: 1, role: 'ADMIN' }), user({ id: 2, role: 'USER', status: 'BLOCKED' })],
        { update: usersUpdateSpy }),
    });
    emailValidatorSpy = jasmine.createSpyObj('EmailValidationService', ['validateFormat', 'validateDomain']);
    bankStoreSpy = jasmine.createSpyObj('BankProjectStoreService', ['getAll']);
    bankStoreSpy.getAll.and.returnValue([]);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UserStoreService, useValue: userStoreSpy },
        { provide: EmailValidationService, useValue: emailValidatorSpy },
        { provide: BankProjectStoreService, useValue: bankStoreSpy },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    component = new UserManagementComponent(
      userStoreSpy, emailValidatorSpy, TestBed.inject(HttpClient), bankStoreSpy,
    );
  });

  afterEach(() => httpMock.verify());

  it('ngOnInit() devrait recharger les utilisateurs', () => {
    component.ngOnInit();
    expect(userStoreSpy.loadFromBackend).toHaveBeenCalled();
  });

  describe('compteurs', () => {
    it('devrait compter admin/user/actif/bloque', () => {
      expect(component.totalCount()).toBe(2);
      expect(component.adminCount()).toBe(1);
      expect(component.userCount()).toBe(1);
      expect(component.activeCount()).toBe(1);
      expect(component.blockedCount()).toBe(1);
    });
  });

  describe('filteredUsers', () => {
    it('devrait filtrer par nom ou email', () => {
      component.searchQuery.set('ahmed');
      expect(component.filteredUsers().length).toBe(2);

      component.searchQuery.set('inexistant');
      expect(component.filteredUsers().length).toBe(0);
    });
  });

  describe('modal CRUD', () => {
    it('openCreate() devrait reinitialiser le formulaire', () => {
      component.openCreate();
      expect(component.form.email).toBe('');
      expect(component.showModal()).toBeTrue();
    });

    it('openEdit() devrait pre-remplir le formulaire avec les projets existants', () => {
      const u = user({ projects: ['AWB', 'BMCE'] });
      component.openEdit(u);

      expect(component.form.email).toBe(u.email);
      expect(component.editProjectCodes()).toEqual(['AWB', 'BMCE']);
    });
  });

  describe('onEmailBlur', () => {
    it('devrait rejeter un format invalide sans appeler validateDomain', () => {
      component.form.email = 'pas-un-email';
      emailValidatorSpy.validateFormat.and.returnValue(false);

      component.onEmailBlur();

      expect(component.emailValid).toBeFalse();
      expect(emailValidatorSpy.validateDomain).not.toHaveBeenCalled();
    });

    it('devrait valider le domaine si le format est correct', () => {
      component.form.email = 'a@hps.ma';
      emailValidatorSpy.validateFormat.and.returnValue(true);
      emailValidatorSpy.validateDomain.and.returnValue(of({ valid: true }));

      component.onEmailBlur();

      expect(component.emailValid).toBeTrue();
    });

    it('devrait reinitialiser l\'etat si l\'email est vide', () => {
      component.form.email = '   ';
      component.onEmailBlur();

      expect(component.emailValid).toBeNull();
    });
  });

  describe('saveUser - validation', () => {
    it('devrait rejeter un formulaire incomplet', () => {
      component.openCreate();
      component.form.firstName = '';

      component.saveUser();

      expect(component.formError).toContain('obligatoires');
    });

    it('devrait bloquer si la validation email est en cours', () => {
      component.openCreate();
      component.form = { firstName: 'A', lastName: 'B', email: 'a@hps.ma', role: 'USER' };
      component.emailValidating = true;

      component.saveUser();

      expect(component.formError).toContain('en cours');
    });

    it('devrait bloquer si l\'email est invalide (format)', () => {
      component.openCreate();
      component.form = { firstName: 'A', lastName: 'B', email: 'bad', role: 'USER' };
      emailValidatorSpy.validateFormat.and.returnValue(false);

      component.saveUser();

      expect(component.formError).toContain('invalide');
    });

    it('devrait bloquer si emailValid=false (domaine invalide)', () => {
      component.openCreate();
      component.form = { firstName: 'A', lastName: 'B', email: 'a@hps.ma', role: 'USER' };
      emailValidatorSpy.validateFormat.and.returnValue(true);
      component.emailValid = false;
      component.emailValidMsg = 'Domaine invalide.';

      component.saveUser();

      expect(component.formError).toBe('Domaine invalide.');
    });
  });

  describe('saveUser - edition', () => {
    it('devrait appeler PUT et recharger en cas de succes', () => {
      const editing = user({ id: 5 });
      component.openEdit(editing);
      component.form = { firstName: 'Nouveau', lastName: 'Nom', email: editing.email, role: 'USER' };
      emailValidatorSpy.validateFormat.and.returnValue(true);

      component.saveUser();

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/users/5`);
      req.flush({ success: true });

      expect(userStoreSpy.loadFromBackend).toHaveBeenCalled();
      expect(component.showModal()).toBeFalse();
    });

    it('devrait appliquer une mise a jour locale en cas d\'echec backend', () => {
      const editing = user({ id: 5 });
      component.openEdit(editing);
      component.form = { firstName: 'Nouveau', lastName: 'Nom', email: editing.email, role: 'USER' };
      emailValidatorSpy.validateFormat.and.returnValue(true);

      component.saveUser();

      const req = httpMock.expectOne(() => true);
      req.flush({}, { status: 500, statusText: 'Error' });

      expect(usersUpdateSpy).toHaveBeenCalled();
    });
  });

  describe('saveUser - creation (invitation)', () => {
    it('devrait afficher un toast si l\'email a ete envoye', () => {
      component.openCreate();
      component.form = { firstName: 'A', lastName: 'B', email: 'a@hps.ma', role: 'USER' };
      emailValidatorSpy.validateFormat.and.returnValue(true);

      component.saveUser();

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/invite`);
      req.flush({ success: true, emailSent: true, email: 'a@hps.ma' });

      expect(component.toastVisible).toBeTrue();
    });

    it('devrait afficher le dialogue de lien d\'activation si SMTP absent', () => {
      component.openCreate();
      component.form = { firstName: 'A', lastName: 'B', email: 'a@hps.ma', role: 'USER' };
      emailValidatorSpy.validateFormat.and.returnValue(true);

      component.saveUser();

      const req = httpMock.expectOne(() => true);
      req.flush({ success: true, emailSent: false, activationLink: 'http://link' });

      expect(component.showActivationDialog).toBeTrue();
      expect(component.activationLink).toBe('http://link');
    });

    it('devrait afficher l\'erreur backend si success=false', () => {
      component.openCreate();
      component.form = { firstName: 'A', lastName: 'B', email: 'a@hps.ma', role: 'USER' };
      emailValidatorSpy.validateFormat.and.returnValue(true);

      component.saveUser();

      const req = httpMock.expectOne(() => true);
      req.flush({ success: false, error: 'Email deja utilise.' });

      expect(component.formError).toBe('Email deja utilise.');
    });

    it('devrait creer localement si le backend est totalement inaccessible (status 0)', () => {
      component.openCreate();
      component.form = { firstName: 'A', lastName: 'B', email: 'a@hps.ma', role: 'USER' };
      emailValidatorSpy.validateFormat.and.returnValue(true);

      component.saveUser();

      const req = httpMock.expectOne(() => true);
      req.error(new ProgressEvent('error'), { status: 0 });

      expect(usersUpdateSpy).toHaveBeenCalled();
      expect(component.showModal()).toBeFalse();
    });
  });

  describe('toggleStatus', () => {
    it('devrait recharger apres un PATCH reussi', () => {
      const u = user({ id: 2 });

      component.toggleStatus(u);

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/users/2/status`);
      req.flush({});

      expect(userStoreSpy.loadFromBackend).toHaveBeenCalled();
    });

    it('devrait appliquer un fallback local en cas d\'echec', () => {
      const u = user({ id: 2 });

      component.toggleStatus(u);

      const req = httpMock.expectOne(() => true);
      req.flush({}, { status: 500, statusText: 'Error' });

      expect(usersUpdateSpy).toHaveBeenCalled();
    });
  });

  describe('suppression', () => {
    it('confirmDelete/executeDelete devrait supprimer via DELETE', () => {
      const u = user({ id: 3 });
      component.confirmDelete(u);
      component.executeDelete();

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/users/3`);
      req.flush({});

      expect(userStoreSpy.loadFromBackend).toHaveBeenCalled();
      expect(component.deleteTarget()).toBeNull();
    });

    it('executeDelete() ne devrait rien faire sans cible', () => {
      component.executeDelete();
      httpMock.expectNone(() => true);
      expect(userStoreSpy.loadFromBackend).not.toHaveBeenCalled();
    });
  });

  describe('reset password', () => {
    it('devrait afficher un toast si l\'email de reset a ete envoye', () => {
      const u = user({ id: 4 });
      component.openResetPassword(u);
      component.confirmResetPassword();

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/users/4/reset-password`);
      req.flush({ emailSent: true });

      expect(component.toastVisible).toBeTrue();
      expect(component.resetTarget()).toBeNull();
    });

    it('devrait afficher le lien si SMTP absent', () => {
      const u = user({ id: 4 });
      component.openResetPassword(u);
      component.confirmResetPassword();

      const req = httpMock.expectOne(() => true);
      req.flush({ emailSent: false, resetLink: 'http://reset-link' });

      expect(component.resetTempPwd).toBe('http://reset-link');
    });

    it('devrait utiliser le fallback local userStore.resetUserPassword en cas d\'echec', () => {
      const u = user({ id: 4 });
      userStoreSpy.resetUserPassword.and.returnValue({ tempPassword: 'Temp1234!' });
      component.openResetPassword(u);
      component.confirmResetPassword();

      const req = httpMock.expectOne(() => true);
      req.flush({}, { status: 500, statusText: 'Error' });

      expect(component.resetTempPwd).toBe('Temp1234!');
    });
  });

  describe('display helpers', () => {
    it('fullName devrait concatener prenom et nom', () => {
      expect(component.fullName(user({ firstName: 'Ahmed', lastName: 'R' }))).toBe('Ahmed R');
    });

    it('initials devrait construire les initiales', () => {
      expect(component.initials(user({ firstName: 'Ahmed', lastName: 'Rguibi' }))).toBe('AR');
    });

    it('roleLabel devrait traduire le role', () => {
      expect(component.roleLabel('ADMIN')).toBe('Administrateur');
      expect(component.roleLabel('USER')).toBe('Utilisateur');
    });

    it('statusLabel devrait traduire le statut', () => {
      expect(component.statusLabel('ACTIVE')).toBe('Actif');
      expect(component.statusLabel('BLOCKED')).toBe('Bloqué');
    });
  });

  describe('assignation de projets (edition)', () => {
    it('toggleProjectCode() devrait ajouter puis retirer un code', () => {
      component.editProjectCodes.set([]);

      component.toggleProjectCode('AWB');
      expect(component.editProjectCodes()).toEqual(['AWB']);

      component.toggleProjectCode('AWB');
      expect(component.editProjectCodes()).toEqual([]);
    });

    it('removeProjectCode() devrait retirer un code specifique', () => {
      component.editProjectCodes.set(['AWB', 'BMCE']);

      component.removeProjectCode('AWB');

      expect(component.editProjectCodes()).toEqual(['BMCE']);
    });

    it('isProjectSelected() devrait refleter l\'etat courant', () => {
      component.editProjectCodes.set(['AWB']);

      expect(component.isProjectSelected('AWB')).toBeTrue();
      expect(component.isProjectSelected('BMCE')).toBeFalse();
    });
  });
});
