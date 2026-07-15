import { resolveCardNetwork } from './card-network';
import { Transaction } from '../models';

function tx(overrides: Partial<Transaction>): Transaction {
  return { ...overrides } as Transaction;
}

describe('resolveCardNetwork', () => {
  it('devrait detecter Visa via productCode', () => {
    expect(resolveCardNetwork(tx({ productCode: 'VIS' }))).toBe('visa');
    expect(resolveCardNetwork(tx({ productCode: 'VISA' }))).toBe('visa');
  });

  it('devrait detecter Visa via networkCode 01', () => {
    expect(resolveCardNetwork(tx({ networkCode: '01' }))).toBe('visa');
  });

  it('devrait detecter Visa via networkId prefixe VI', () => {
    expect(resolveCardNetwork(tx({ networkId: 'VISA_NET' }))).toBe('visa');
  });

  it('devrait detecter Visa via BIN 4 en l\'absence de signal concurrent', () => {
    expect(resolveCardNetwork(tx({ cardNumberMasked: '400000XXXXXX1111' }))).toBe('visa');
  });

  it('ne devrait PAS classer un BIN 4 comme Visa si un signal Mastercard est present', () => {
    expect(resolveCardNetwork(tx({ cardNumberMasked: '400000XXXXXX1111', networkCode: '02' }))).toBe('mastercard');
  });

  it('devrait detecter Mastercard via productCode', () => {
    expect(resolveCardNetwork(tx({ productCode: 'MSC' }))).toBe('mastercard');
    expect(resolveCardNetwork(tx({ productCode: 'MC' }))).toBe('mastercard');
    expect(resolveCardNetwork(tx({ productCode: 'MAS' }))).toBe('mastercard');
  });

  it('devrait detecter Mastercard via BIN 5 ou 2', () => {
    expect(resolveCardNetwork(tx({ cardNumberMasked: '531000XXXXXX1111' }))).toBe('mastercard');
    expect(resolveCardNetwork(tx({ cardNumberMasked: '222100XXXXXX1111' }))).toBe('mastercard');
  });

  it('devrait classer CMI (reseau local) comme "other", pas Mastercard', () => {
    expect(resolveCardNetwork(tx({ productCode: 'CMI' }))).toBe('other');
  });

  it('devrait empecher un faux-positif Visa via BIN 4 quand productCode=CMI', () => {
    expect(resolveCardNetwork(tx({ cardNumberMasked: '400000XXXXXX1111', productCode: 'CMI' }))).toBe('other');
  });

  it('devrait retourner "other" sans aucun signal reconnu', () => {
    expect(resolveCardNetwork(tx({ cardNumberMasked: '999999XXXXXX1111' }))).toBe('other');
    expect(resolveCardNetwork(tx({}))).toBe('other');
  });
});
