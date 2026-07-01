import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe Angular de masquage PAN conforme PCI-DSS §3.3.1.
 *
 * Conserve les 6 premiers chiffres (BIN) et les 4 derniers,
 * remplace le milieu par des 'X'.
 *
 * Usage dans un template :
 *   {{ transaction.cardNumberMasked | cardMask }}   ← champ déjà masqué côté serveur
 *   {{ transaction.cardNumber       | cardMask }}   ← filet de sécurité si PAN brut reçu
 *
 * Exemples :
 *   "400000XXXXXX7750"  →  "400000XXXXXX7750"  (déjà masqué, inchangé)
 *   "4000005327187750"  →  "400000XXXXXX7750"  (masquage appliqué)
 *   null / undefined    →  " - "
 */
@Pipe({ name: 'cardMask', standalone: true })
export class CardMaskPipe implements PipeTransform {

  private readonly BIN_LENGTH    = 6;
  private readonly SUFFIX_LENGTH = 4;

  transform(pan: string | null | undefined): string {
    if (!pan) return ' - ';

    // Retirer les séparateurs (espaces, tirets)
    const digits = pan.replace(/[\s\-]/g, '');

    // Si déjà masqué (contient des 'X'), on retourne tel quel
    if (/X/i.test(digits)) return pan;

    const minLength = this.BIN_LENGTH + this.SUFFIX_LENGTH + 1;

    // PAN trop court : masquage total par précaution
    if (digits.length < minLength) return '****';

    const bin    = digits.slice(0, this.BIN_LENGTH);
    const suffix = digits.slice(-this.SUFFIX_LENGTH);
    const mask   = 'X'.repeat(digits.length - this.BIN_LENGTH - this.SUFFIX_LENGTH);

    return `${bin}${mask}${suffix}`;
  }
}
