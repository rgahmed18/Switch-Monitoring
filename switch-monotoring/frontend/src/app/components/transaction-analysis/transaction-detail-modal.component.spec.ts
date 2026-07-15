import { TransactionDetailModalComponent } from './transaction-detail-modal.component';
import { Transaction } from '../../models';

function tx(overrides: Partial<Transaction>): Transaction {
  return { ...overrides } as Transaction;
}

describe('TransactionDetailModalComponent', () => {
  let component: TransactionDetailModalComponent;

  beforeEach(() => {
    component = new TransactionDetailModalComponent();
  });

  function setTx(t: Transaction) {
    component.transaction = t;
    component.ngOnChanges({ transaction: { currentValue: t } as any });
  }

  describe('isApproved / isDeclined / statusLabel', () => {
    it('devrait reconnaitre APPROVED via status', () => {
      setTx(tx({ status: 'APPROVED' } as any));
      expect(component.isApproved).toBeTrue();
      expect(component.statusLabel).toBe('TRANSACTION APPROUVEE');
    });

    it('devrait reconnaitre APPROVED via actionCode 000', () => {
      setTx(tx({ actionCode: '000' } as any));
      expect(component.isApproved).toBeTrue();
    });

    it('devrait reconnaitre DECLINED via un actionCode different de 000/00', () => {
      setTx(tx({ actionCode: '051' } as any));
      expect(component.isDeclined).toBeTrue();
      expect(component.statusLabel).toBe('TRANSACTION REFUSEE');
    });

    it('devrait retourner EN ATTENTE sans statut ni code', () => {
      setTx(tx({} as any));
      expect(component.statusLabel).toBe('EN ATTENTE');
    });
  });

  describe('declineLabel', () => {
    it('devrait preferer rejectReason si present', () => {
      setTx(tx({ actionCode: '051', rejectReason: 'Motif personnalise' } as any));
      expect(component.declineLabel).toBe('Motif personnalise');
    });

    it('devrait resoudre un libelle connu pour un actionCode standard', () => {
      setTx(tx({ actionCode: '051' } as any));
      expect(component.declineLabel).toBe('Provision insuffisante');
    });

    it('devrait fournir un libelle generique pour un code inconnu', () => {
      setTx(tx({ actionCode: '999' } as any));
      expect(component.declineLabel).toBe('Refus (code 999)');
    });
  });

  describe('maskedPan', () => {
    it('devrait retourner null sans PAN', () => {
      setTx(tx({} as any));
      expect(component.maskedPan).toBeNull();
    });

    it('devrait reformater un PAN deja masque avec des espaces', () => {
      setTx(tx({ cardNumberMasked: '400000XXXXXX7750' } as any));
      expect(component.maskedPan).toBe('400000 XXXXXX 7750');
    });

    it('devrait masquer un PAN brut (BIN 6 + X du milieu + 4 derniers)', () => {
      setTx(tx({ cardNumber: '4000005327187750' } as any));
      // 16 chiffres : BIN(6) + X * (16-6-4=6) + suffixe(4)
      expect(component.maskedPan).toBe('400000 XXXXXX 7750');
    });
  });

  describe('cardTypeLabel', () => {
    it('devrait reconnaitre VISA via productCode', () => {
      setTx(tx({ productCode: 'VIS' } as any));
      expect(component.cardTypeLabel).toBe('VISA');
    });

    it('devrait reconnaitre Mastercard via networkCode', () => {
      setTx(tx({ networkCode: '02' } as any));
      expect(component.cardTypeLabel).toBe('Mastercard');
    });

    it('devrait reconnaitre CMI', () => {
      setTx(tx({ productCode: 'CMI' } as any));
      expect(component.cardTypeLabel).toBe('CMI (Interbanque)');
    });
  });

  describe('entryModeDisplay', () => {
    it('devrait resoudre le libelle du mode d\'entree EMV', () => {
      setTx(tx({ posEntryMode: '05' } as any));
      expect(component.entryModeDisplay).toBe('05 - Puce EMV contact');
    });

    it('devrait tronquer aux 2 premiers chiffres pour un code long', () => {
      setTx(tx({ posEntryMode: '0510' } as any));
      expect(component.entryModeDisplay).toBe('05 - Puce EMV contact');
    });

    it('devrait retourner null sans mode d\'entree', () => {
      setTx(tx({} as any));
      expect(component.entryModeDisplay).toBeNull();
    });
  });

  describe('acquiringCountryDisplay', () => {
    it('devrait resoudre le libelle pays pour un code connu', () => {
      setTx(tx({ acquiringCountryCode: '504' } as any));
      expect(component.acquiringCountryDisplay).toBe('504 - Maroc (MAD)');
    });

    it('devrait retourner le code brut si inconnu', () => {
      setTx(tx({ acquiringCountryCode: '999' } as any));
      expect(component.acquiringCountryDisplay).toBe('999');
    });
  });

  describe('hasChipData / chipTvrRaw / activeTvrBits', () => {
    it('devrait detecter la presence de donnees chip via chipTvr', () => {
      setTx(tx({ chipTvr: '8000000000' } as any));
      expect(component.hasChipData).toBeTrue();
    });

    it('devrait retourner false sans donnees chip', () => {
      setTx(tx({} as any));
      expect(component.hasChipData).toBeFalse();
    });

    it('activeTvrBits devrait detecter le bit SDA echouee (byte1 0x40)', () => {
      setTx(tx({ chipTvr: '4000000000' } as any));
      const bits = component.activeTvrBits;
      expect(bits.some(b => b.label.includes('SDA'))).toBeTrue();
    });

    it('activeTvrBits devrait retourner une liste vide pour un TVR clean', () => {
      setTx(tx({ chipTvr: '0000000000' } as any));
      expect(component.activeTvrBits).toEqual([]);
    });

    it('activeTvrBits devrait retourner une liste vide pour un TVR trop court', () => {
      setTx(tx({ chipTvr: 'AB' } as any));
      expect(component.activeTvrBits).toEqual([]);
    });
  });

  describe('timelineSteps', () => {
    it('devrait marquer Transmission comme done si transmissionDateAndTime present', () => {
      setTx(tx({ transmissionDateAndTime: '2026-07-14T10:00:00' } as any));
      const step = component.timelineSteps.find(s => s.name === 'Transmission')!;
      expect(step.done).toBeTrue();
    });

    it('devrait marquer Reponse comme fail si la transaction est refusee', () => {
      setTx(tx({ actionCode: '051', responseDateAndTime: '2026-07-14T10:00:01' } as any));
      const step = component.timelineSteps.find(s => s.name === 'Réponse')!;
      expect(step.fail).toBeTrue();
    });

    it('devrait marquer Rapprochement comme fail si matchingStatus=U', () => {
      setTx(tx({ matchingStatus: 'U' } as any));
      const step = component.timelineSteps.find(s => s.name === 'Rapprochement')!;
      expect(step.fail).toBeTrue();
      expect(step.last).toBeTrue();
    });
  });

  describe('matchingLabel', () => {
    it('devrait retourner le libelle succes pour M', () => {
      setTx(tx({ matchingStatus: 'M' } as any));
      expect(component.matchingLabel).toBe('Transaction rapprochée avec succès');
    });

    it('devrait retourner en attente sans statut', () => {
      setTx(tx({} as any));
      expect(component.matchingLabel).toBe('Rapprochement en attente');
    });
  });

  describe('formatDateTime / formatAmount', () => {
    it('formatDateTime devrait retourner une chaine vide sans date', () => {
      expect(component.formatDateTime(null)).toBe('');
    });

    it('formatDateTime devrait retourner la chaine brute pour une date invalide', () => {
      expect(component.formatDateTime('pas-une-date')).toBe('pas-une-date');
    });

    it('formatAmount devrait retourner une chaine vide sans montant', () => {
      expect(component.formatAmount(null)).toBe('');
    });

    it('formatAmount devrait formater en notation francaise avec 2 decimales min', () => {
      const result = component.formatAmount(1234.5);
      expect(result).toContain(',5');
    });
  });
});
