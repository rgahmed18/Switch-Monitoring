import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { ProjectSelectorComponent } from './project-selector.component';
import { ProjectFilterService } from '../../services/project-filter.service';
import { AuthService } from '../../services/auth.service';
import { UserStoreService } from '../../services/user-store.service';
import { BankProjectStoreService } from '../../services/bank-project-store.service';
import { AppUser, BankProject } from '../../models';
import { of } from 'rxjs';

function bank(overrides: Partial<BankProject>): BankProject {
  return { id: 1, name: '', code: '', country: 'Maroc', type: 'BOTH', status: 'ACTIVE', createdAt: '' , ...overrides } as BankProject;
}

function user(overrides: Partial<AppUser>): AppUser {
  return { id: 1, username: 'u', firstName: 'F', lastName: 'L', email: 'u@hps.ma',
    role: 'USER', status: 'ACTIVE', projects: [], createdAt: '', ...overrides } as AppUser;
}

describe('ProjectSelectorComponent', () => {
  let component: ProjectSelectorComponent;
  let projectFilterSpy: jasmine.SpyObj<ProjectFilterService>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let userStoreSpy: jasmine.SpyObj<UserStoreService>;
  let bankStoreSpy: jasmine.SpyObj<BankProjectStoreService>;

  const allBanks: BankProject[] = [
    bank({ id: 1, code: 'AWB', name: 'Attijariwafa Bank', country: 'Maroc' }),
    bank({ id: 2, code: 'BNP', name: 'BNP Paribas', country: 'France' }),
    bank({ id: 3, code: 'HSBC', name: 'HSBC', country: 'Royaume-Uni' }),
  ];

  beforeEach(() => {
    projectFilterSpy = jasmine.createSpyObj('ProjectFilterService', ['clearProject', 'setProject'], {
      activeProject$: of(''),
    });
    authSpy = jasmine.createSpyObj('AuthService', ['isAdmin'], { currentUser: () => user({}) });
    userStoreSpy = jasmine.createSpyObj('UserStoreService', ['loadFromBackend'], { users: () => [] });
    bankStoreSpy = jasmine.createSpyObj('BankProjectStoreService', ['getAll']);
    bankStoreSpy.getAll.and.returnValue(allBanks);

    TestBed.configureTestingModule({
      providers: [
        { provide: ProjectFilterService, useValue: projectFilterSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: UserStoreService, useValue: userStoreSpy },
        { provide: BankProjectStoreService, useValue: bankStoreSpy },
        { provide: ChangeDetectorRef, useValue: jasmine.createSpyObj('ChangeDetectorRef', ['markForCheck']) },
      ],
    });

    component = TestBed.runInInjectionContext(() => new ProjectSelectorComponent(
      projectFilterSpy, authSpy, userStoreSpy,
      TestBed.inject(ChangeDetectorRef), bankStoreSpy,
    ));
  });

  describe('assignedProjects', () => {
    it('devrait retourner toutes les banques pour un ADMIN', () => {
      Object.defineProperty(authSpy, 'currentUser', { value: () => user({ role: 'ADMIN' }) });

      expect(component.assignedProjects().length).toBe(3);
    });

    it('devrait filtrer sur les projets assignes pour un USER', () => {
      Object.defineProperty(authSpy, 'currentUser', { value: () => user({ role: 'USER', projects: ['AWB'] }) });

      expect(component.assignedProjects().map(p => p.code)).toEqual(['AWB']);
    });

    it('devrait retourner une liste vide sans utilisateur connecte', () => {
      Object.defineProperty(authSpy, 'currentUser', { value: () => null });

      expect(component.assignedProjects()).toEqual([]);
    });

    it('devrait preferer les donnees fraiches de userStore a celles de la session', () => {
      Object.defineProperty(authSpy, 'currentUser', {
        value: () => user({ role: 'USER', id: 1, projects: ['AWB'] }),
      });
      Object.defineProperty(userStoreSpy, 'users', {
        value: () => [{ ...user({ id: 1 }), projects: ['BNP'] }],
      });

      expect(component.assignedProjects().map(p => p.code)).toEqual(['BNP']);
    });
  });

  describe('groupedByZone', () => {
    beforeEach(() => {
      Object.defineProperty(authSpy, 'currentUser', { value: () => user({ role: 'ADMIN' }) });
    });

    it('devrait regrouper les projets par zone geographique', () => {
      const zones = component.groupedByZone.map(z => z.zone);

      expect(zones).toContain('Afrique');
      expect(zones).toContain('Europe');
    });

    it('devrait filtrer par recherche sur nom/code/pays', () => {
      component.searchQuery = 'BNP';

      const zones = component.groupedByZone;
      const allProjects = zones.flatMap(z => z.countries.flatMap(c => c.projects));

      expect(allProjects.map(p => p.code)).toEqual(['BNP']);
    });

    it('devrait retourner une liste vide si aucun resultat de recherche', () => {
      component.searchQuery = 'INEXISTANT';

      expect(component.groupedByZone).toEqual([]);
    });
  });

  describe('actions', () => {
    it('selectAll() devrait vider le filtre et fermer le modal', () => {
      component.isOpen = true;

      component.selectAll();

      expect(projectFilterSpy.clearProject).toHaveBeenCalled();
      expect(component.isOpen).toBeFalse();
    });

    it('selectProject() devrait definir le projet actif et fermer le modal', () => {
      component.selectProject('AWB');

      expect(projectFilterSpy.setProject).toHaveBeenCalledWith('AWB');
      expect(component.isOpen).toBeFalse();
    });

    it('closeModal() devrait reinitialiser la recherche', () => {
      component.searchQuery = 'test';
      component.closeModal();

      expect(component.searchQuery).toBe('');
    });

    it('toggleModal() devrait ouvrir le modal et recharger les utilisateurs si admin', () => {
      authSpy.isAdmin.and.returnValue(true);
      const event = new MouseEvent('click');

      component.toggleModal(event);

      expect(component.isOpen).toBeTrue();
      expect(userStoreSpy.loadFromBackend).toHaveBeenCalled();
    });

    it('toggleModal() ne devrait pas recharger les utilisateurs si non-admin', () => {
      authSpy.isAdmin.and.returnValue(false);

      component.toggleModal(new MouseEvent('click'));

      expect(userStoreSpy.loadFromBackend).not.toHaveBeenCalled();
    });
  });

  describe('zoneAccent / zoneText', () => {
    it('devrait retourner une couleur specifique pour une zone connue', () => {
      expect(component.zoneAccent('Afrique')).toBe('bg-amber-500');
    });

    it('devrait retourner une couleur par defaut pour une zone inconnue', () => {
      expect(component.zoneAccent('Antarctique')).toBe('bg-muted');
    });
  });
});
