import { Transaction } from '../models';

// ============================================================================
// RESOLUTION DU RESEAU DE CARTE (VISA / MASTERCARD / AUTRE)
// SOURCE UNIQUE DE VERITE — utilisee par le dashboard, les widgets
// approuvees/refusees par sous-type et le graphique de repartition reseau.
//
// Priorite de detection : productCode > networkCode > networkId > BIN (1er
// chiffre du PAN). Le BIN n'est utilise qu'en dernier recours et seulement
// si aucun signal explicite du reseau concurrent n'est present, pour eviter
// de classer a tort une carte Mastercard commencant par 5 comme Visa via un
// faux-positif sur le prefixe BIN 4 d'un autre champ.
// ============================================================================

export type CardNetwork = 'visa' | 'mastercard' | 'other';

export function resolveCardNetwork(tx: Transaction): CardNetwork {
  const nc  = ((tx as any).networkCode || '').toString().trim();
  const nid = ((tx as any).networkId   || '').toString().trim().toUpperCase();
  const pc  = ((tx as any).productCode || '').toString().trim().toUpperCase();
  const bin = ((tx as any).cardNumberMasked || (tx as any).cardNumber || '').toString().charAt(0);

  // Signal d'un reseau concurrent explicite (Mastercard OU reseau local CMI) :
  // empeche un faux-positif Visa via le seul prefixe BIN 4 quand un autre
  // champ identifie clairement un reseau different.
  const hasOtherNetworkSignal =
    nc === '02' || pc === 'MSC' || pc === 'MC' || pc === 'MAS' || pc === 'CMI'
    || nid.startsWith('MC') || nid.startsWith('MA') || nid.startsWith('CMI');

  const isVisa = nc === '01'
    || pc === 'VIS' || pc === 'VISA'
    || nid.startsWith('VI')
    || (bin === '4' && !hasOtherNetworkSignal);

  if (isVisa) return 'visa';

  const isMastercard =
    nc === '02' || pc === 'MSC' || pc === 'MC' || pc === 'MAS'
    || nid.startsWith('MC') || nid.startsWith('MA')
    || bin === '5' || bin === '2';
  if (isMastercard) return 'mastercard';

  return 'other';
}
