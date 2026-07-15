import { TestBed } from '@angular/core/testing';
import { BankProjectStoreService } from './bank-project-store.service';

describe('BankProjectStoreService', () => {
  let service: BankProjectStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BankProjectStoreService);
  });

  it('devrait exposer la liste initiale des banques via le signal projects', () => {
    expect(service.projects().length).toBeGreaterThan(0);
  });

  it('getAll() devrait retourner toutes les banques', () => {
    expect(service.getAll()).toEqual(service.projects());
  });

  it('getByCode() devrait trouver une banque par son code exact', () => {
    const bank = service.getByCode('AWB');

    expect(bank?.name).toBe('Attijariwafa Bank');
  });

  it('getByCode() devrait ignorer la casse et les espaces', () => {
    const bank = service.getByCode('  awb  ');

    expect(bank?.code).toBe('AWB');
  });

  it('getByCode() devrait retourner undefined pour un code inconnu', () => {
    expect(service.getByCode('XXXXX')).toBeUndefined();
  });

  it('getName() devrait retourner le nom de la banque pour un code connu', () => {
    expect(service.getName('BMCE')).toContain('Banque Marocaine');
  });

  it('getName() devrait retourner le code tel quel si inconnu', () => {
    expect(service.getName('INCONNU')).toBe('INCONNU');
  });

  it('add() devrait ajouter une nouvelle banque avec un id incremente', () => {
    const before = service.getAll().length;
    const maxId = Math.max(...service.getAll().map(b => b.id));

    const created = service.add({
      name: 'Nouvelle Banque Test',
      code: 'nbt',
      country: 'Maroc',
      type: 'BOTH',
    });

    expect(service.getAll().length).toBe(before + 1);
    expect(created.id).toBe(maxId + 1);
    expect(created.code).toBe('NBT'); // normalise en majuscule
    expect(created.status).toBe('ACTIVE');
  });

  it('update() devrait modifier une banque existante par id', () => {
    const bank = service.getByCode('AWB')!;
    const updated = { ...bank, name: 'AWB Renommee' };

    service.update(updated);

    expect(service.getByCode('AWB')?.name).toBe('AWB Renommee');
  });

  it('toggleStatus() devrait basculer ACTIVE vers INACTIVE et inversement', () => {
    const bank = service.getAll().find(b => b.status === 'ACTIVE')!;

    service.toggleStatus(bank.id);
    expect(service.getAll().find(b => b.id === bank.id)?.status).toBe('INACTIVE');

    service.toggleStatus(bank.id);
    expect(service.getAll().find(b => b.id === bank.id)?.status).toBe('ACTIVE');
  });

  it('remove() devrait supprimer une banque par id', () => {
    const bank = service.getAll()[0];
    const before = service.getAll().length;

    service.remove(bank.id);

    expect(service.getAll().length).toBe(before - 1);
    expect(service.getAll().find(b => b.id === bank.id)).toBeUndefined();
  });
});
