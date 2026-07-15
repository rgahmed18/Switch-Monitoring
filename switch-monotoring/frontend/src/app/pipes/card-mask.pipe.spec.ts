import { CardMaskPipe } from './card-mask.pipe';

describe('CardMaskPipe', () => {
  let pipe: CardMaskPipe;

  beforeEach(() => {
    pipe = new CardMaskPipe();
  });

  it('devrait retourner " - " pour null', () => {
    expect(pipe.transform(null)).toBe(' - ');
  });

  it('devrait retourner " - " pour undefined', () => {
    expect(pipe.transform(undefined)).toBe(' - ');
  });

  it('devrait retourner " - " pour une chaine vide', () => {
    expect(pipe.transform('')).toBe(' - ');
  });

  it('devrait laisser un PAN deja masque inchange', () => {
    expect(pipe.transform('400000XXXXXX7750')).toBe('400000XXXXXX7750');
  });

  it('devrait masquer un PAN brut en conservant BIN(6) + suffixe(4)', () => {
    expect(pipe.transform('4000005327187750')).toBe('400000XXXXXX7750');
  });

  it('devrait retirer les espaces et tirets avant analyse', () => {
    expect(pipe.transform('4000 0053 2718 7750')).toBe('400000XXXXXX7750');
    expect(pipe.transform('4000-0053-2718-7750')).toBe('400000XXXXXX7750');
  });

  it('devrait retourner **** pour un PAN trop court', () => {
    expect(pipe.transform('123456')).toBe('****');
  });

  it('devrait etre insensible a la casse du X deja present', () => {
    expect(pipe.transform('400000xxxxxx7750')).toBe('400000xxxxxx7750');
  });
});
