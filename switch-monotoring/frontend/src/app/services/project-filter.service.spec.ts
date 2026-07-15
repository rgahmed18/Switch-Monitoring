import { TestBed } from '@angular/core/testing';
import { ProjectFilterService } from './project-filter.service';
import { BankProjectStoreService } from './bank-project-store.service';

describe('ProjectFilterService', () => {
  let service: ProjectFilterService;
  let bankStoreSpy: jasmine.SpyObj<BankProjectStoreService>;

  beforeEach(() => {
    bankStoreSpy = jasmine.createSpyObj('BankProjectStoreService', ['getName']);

    TestBed.configureTestingModule({
      providers: [
        { provide: BankProjectStoreService, useValue: bankStoreSpy },
      ],
    });

    service = TestBed.inject(ProjectFilterService);
  });

  it('devrait demarrer sans projet actif', () => {
    expect(service.activeProject).toBe('');
    expect(service.activeProjectName).toBe('');
  });

  it('setProject() devrait mettre a jour activeProject', () => {
    service.setProject('AWB');

    expect(service.activeProject).toBe('AWB');
  });

  it('setProject() devrait emettre la nouvelle valeur sur activeProject$', (done) => {
    const values: string[] = [];
    service.activeProject$.subscribe(v => values.push(v));

    service.setProject('BMCE');

    expect(values).toEqual(['', 'BMCE']);
    done();
  });

  it('clearProject() devrait reinitialiser activeProject a vide', () => {
    service.setProject('AWB');
    service.clearProject();

    expect(service.activeProject).toBe('');
  });

  it('activeProjectName devrait resoudre le nom via BankProjectStoreService quand un projet est actif', () => {
    bankStoreSpy.getName.and.returnValue('Attijariwafa Bank');
    service.setProject('AWB');

    expect(service.activeProjectName).toBe('Attijariwafa Bank');
    expect(bankStoreSpy.getName).toHaveBeenCalledWith('AWB');
  });

  it('activeProjectName devrait retourner une chaine vide sans appeler le store si aucun projet actif', () => {
    expect(service.activeProjectName).toBe('');
    expect(bankStoreSpy.getName).not.toHaveBeenCalled();
  });

  it('getProjectName() devrait deleguer directement a BankProjectStoreService', () => {
    bankStoreSpy.getName.and.returnValue('Banque Marocaine du Commerce Exterieur');

    expect(service.getProjectName('BMCE')).toBe('Banque Marocaine du Commerce Exterieur');
    expect(bankStoreSpy.getName).toHaveBeenCalledWith('BMCE');
  });
});
