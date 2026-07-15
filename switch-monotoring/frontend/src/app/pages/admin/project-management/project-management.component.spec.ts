import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { ProjectManagementComponent } from './project-management.component';
import { UserStoreService } from '../../../services/user-store.service';
import { BankProjectStoreService } from '../../../services/bank-project-store.service';
import { AppUser, BankProject } from '../../../models';
import { environment } from '../../../../environments/environment';

function bank(overrides: Partial<BankProject>): BankProject {
  return { id: 1, name: '', code: '', country: 'Maroc', type: 'BOTH', status: 'ACTIVE', createdAt: '2026-01-01', ...overrides } as BankProject;
}

function user(overrides: Partial<AppUser>): AppUser {
  return { id: 1, username: 'u', firstName: 'Ahmed', lastName: 'R', email: 'a@hps.ma',
    role: 'USER', status: 'ACTIVE', projects: [], createdAt: '', ...overrides } as AppUser;
}

describe('ProjectManagementComponent', () => {
  let component: ProjectManagementComponent;
  let httpMock: HttpTestingController;
  let userStoreSpy: jasmine.SpyObj<UserStoreService>;
  let bankStoreSpy: jasmine.SpyObj<BankProjectStoreService>;

  beforeEach(() => {
    userStoreSpy = jasmine.createSpyObj('UserStoreService', ['loadFromBackend'], {
      users: Object.assign(() => [user({ id: 1 })], { update: jasmine.createSpy('update') }),
    });
    bankStoreSpy = jasmine.createSpyObj('BankProjectStoreService',
      ['add', 'update', 'toggleStatus', 'remove'],
      { projects: () => [bank({ id: 1, code: 'AWB', name: 'Attijariwafa Bank' })] },
    );

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UserStoreService, useValue: userStoreSpy },
        { provide: BankProjectStoreService, useValue: bankStoreSpy },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    component = new ProjectManagementComponent(
      TestBed.inject(HttpClient), userStoreSpy, bankStoreSpy,
    );
  });

  afterEach(() => httpMock.verify());

  it('ngOnInit() devrait recharger les utilisateurs depuis le backend', () => {
    component.ngOnInit();
    expect(userStoreSpy.loadFromBackend).toHaveBeenCalled();
  });

  describe('filteredProjects', () => {
    it('devrait retourner tous les projets sans recherche', () => {
      expect(component.filteredProjects().length).toBe(1);
    });

    it('devrait filtrer par nom/code/pays', () => {
      component.searchQuery.set('awb');
      expect(component.filteredProjects().length).toBe(1);

      component.searchQuery.set('inexistant');
      expect(component.filteredProjects().length).toBe(0);
    });
  });

  describe('compteurs', () => {
    it('devrait compter les projets actifs/inactifs/par type', () => {
      expect(component.totalCount()).toBe(1);
      expect(component.activeCount()).toBe(1);
      expect(component.bothCount()).toBe(1);
    });
  });

  describe('modal CRUD', () => {
    it('openCreate() devrait reinitialiser le formulaire', () => {
      component.openCreate();

      expect(component.form.name).toBe('');
      expect(component.showModal()).toBeTrue();
      expect(component.editingProject()).toBeNull();
    });

    it('openEdit() devrait pre-remplir le formulaire', () => {
      const p = bank({ id: 1, name: 'Test', code: 'TST' });
      component.openEdit(p);

      expect(component.form.name).toBe('Test');
      expect(component.editingProject()).toBe(p);
    });

    it('saveProject() devrait rejeter un formulaire incomplet', () => {
      component.openCreate();
      component.form.name = '';

      component.saveProject();

      expect(component.formError).toContain('obligatoires');
      expect(bankStoreSpy.add).not.toHaveBeenCalled();
    });

    it('saveProject() devrait rejeter un code de plus de 6 caracteres', () => {
      component.openCreate();
      component.form = { name: 'Test', code: 'TROPLONG', country: 'Maroc', type: 'BOTH' };

      component.saveProject();

      expect(component.formError).toContain('6 caractères');
    });

    it('saveProject() devrait appeler add() en creation', () => {
      component.openCreate();
      component.form = { name: 'Nouvelle', code: 'NEW', country: 'Maroc', type: 'BOTH' };

      component.saveProject();

      expect(bankStoreSpy.add).toHaveBeenCalledWith(component.form);
      expect(component.showModal()).toBeFalse();
    });

    it('saveProject() devrait appeler update() en edition', () => {
      const p = bank({ id: 5 });
      component.openEdit(p);
      component.form = { name: 'Modifie', code: 'MOD', country: 'France', type: 'ISSUER' };

      component.saveProject();

      expect(bankStoreSpy.update).toHaveBeenCalled();
    });
  });

  describe('actions banque', () => {
    it('toggleStatus() devrait deleguer au store', () => {
      const p = bank({ id: 3 });
      component.toggleStatus(p);
      expect(bankStoreSpy.toggleStatus).toHaveBeenCalledWith(3);
    });

    it('confirmDelete/executeDelete devrait supprimer la banque ciblee', () => {
      const p = bank({ id: 3 });
      component.confirmDelete(p);
      component.executeDelete();

      expect(bankStoreSpy.remove).toHaveBeenCalledWith(3);
      expect(component.deleteTarget()).toBeNull();
    });

    it('cancelDelete() devrait annuler la cible sans supprimer', () => {
      component.confirmDelete(bank({ id: 1 }));
      component.cancelDelete();

      expect(component.deleteTarget()).toBeNull();
      expect(bankStoreSpy.remove).not.toHaveBeenCalled();
    });
  });

  describe('assignation utilisateur-projet', () => {
    it('hasProject() devrait verifier l\'appartenance', () => {
      const u = user({ projects: ['AWB'] });
      expect(component.hasProject(u, 'AWB')).toBeTrue();
      expect(component.hasProject(u, 'BMCE')).toBeFalse();
    });

    it('toggleProject() devrait ajouter un projet et persister via PUT', () => {
      const u = user({ id: 1, projects: [] });

      component.toggleProject(u, 'AWB');

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/users/1`);
      expect(req.request.body.projects).toBe('AWB');
      req.flush({ success: true });

      expect(userStoreSpy.loadFromBackend).toHaveBeenCalled();
    });

    it('toggleProject() devrait retirer un projet deja assigne', () => {
      const u = user({ id: 1, projects: ['AWB', 'BMCE'] });

      component.toggleProject(u, 'AWB');

      const req = httpMock.expectOne(() => true);
      expect(req.request.body.projects).toBe('BMCE');
      req.flush({});
    });

    it('toggleProject() devrait recharger meme en cas d\'echec backend', () => {
      const u = user({ id: 1, projects: [] });

      component.toggleProject(u, 'AWB');

      const req = httpMock.expectOne(() => true);
      req.flush({}, { status: 500, statusText: 'Error' });

      expect(userStoreSpy.loadFromBackend).toHaveBeenCalled();
    });
  });

  describe('display helpers', () => {
    it('typeLabel devrait traduire les types de banque', () => {
      expect(component.typeLabel('ACQUIRER')).toBe('Acquéreur');
      expect(component.typeLabel('BOTH')).toBe('Acquéreur & Émetteur');
    });

    it('statusLabel devrait traduire le statut', () => {
      expect(component.statusLabel('ACTIVE')).toBe('Actif');
      expect(component.statusLabel('INACTIVE')).toBe('Inactif');
    });

    it('roleLabel devrait traduire le role', () => {
      expect(component.roleLabel('ADMIN')).toBe('Administrateur');
    });

    it('initials devrait construire les initiales depuis prenom/nom', () => {
      const u = user({ firstName: 'Ahmed', lastName: 'Rguibi' });
      expect(component.initials(u)).toBe('AR');
    });

    it('countryFlag devrait retourner un emoji pour un pays connu', () => {
      expect(component.countryFlag('Maroc')).not.toBe('');
    });

    it('countryFlag devrait retourner une chaine vide pour un pays inconnu', () => {
      expect(component.countryFlag('Atlantide')).toBe('');
    });
  });
});
