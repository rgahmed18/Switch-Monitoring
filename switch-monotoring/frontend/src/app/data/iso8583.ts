export const responseCodes: Record<string, { label: string; description: string; severity: 'success' | 'warning' | 'error' }> = {
  // ── 2-char legacy ISO 8583 codes ─────────────────────────────────────
  '00': { label: 'Approuvée',           description: 'Transaction approuvée avec succès',          severity: 'success' },
  '01': { label: 'Référer émetteur',    description: 'Appel vocal requis',                         severity: 'warning' },
  '03': { label: 'Commerçant invalide', description: 'Numéro de commerçant non reconnu',           severity: 'error'   },
  '05': { label: 'Déclinée',            description: 'Ne pas honorer - problème général',           severity: 'error'   },
  '12': { label: 'Tx invalide',         description: 'Type de transaction non supporté',            severity: 'error'   },
  '13': { label: 'Montant invalide',    description: 'Montant de la transaction invalide',          severity: 'error'   },
  '14': { label: 'Carte invalide',      description: 'Numéro de carte non reconnu',                 severity: 'error'   },
  '30': { label: 'Erreur format',       description: 'Erreur de format du message ISO',             severity: 'error'   },
  '41': { label: 'Carte perdue',        description: 'Carte signalée comme perdue',                 severity: 'error'   },
  '43': { label: 'Carte volée',         description: 'Carte signalée comme volée',                  severity: 'error'   },
  '51': { label: 'Provision insuf.',    description: 'Fonds insuffisants sur le compte',            severity: 'warning' },
  '54': { label: 'Carte expirée',       description: 'La carte est expirée',                        severity: 'error'   },
  '55': { label: 'PIN incorrect',       description: 'Code PIN incorrect',                          severity: 'warning' },
  '61': { label: 'Limite dépassée',     description: 'Montant maximum de retrait dépassé',          severity: 'warning' },
  '91': { label: 'Émetteur indispo.',   description: 'La banque émettrice ne répond pas',           severity: 'error'   },
  '96': { label: 'Erreur système',      description: 'Dysfonctionnement du système',                severity: 'error'   },

  // ── 3-char PowerCARD action codes (HPS switch) ────────────────────────
  '000': { label: 'Approuvée',           description: 'Transaction approuvée',                     severity: 'success' },
  '100': { label: 'Refus générique',     description: 'Refus émetteur générique',                  severity: 'error'   },
  '101': { label: 'Carte expirée',       description: 'Carte expirée  -  vérifier date',             severity: 'error'   },
  '102': { label: 'Suspicion fraude',    description: 'Suspicion de fraude détectée',              severity: 'error'   },
  '105': { label: 'PIN bloqué',          description: 'Nombre d\'essais PIN dépassé',              severity: 'error'   },
  '110': { label: 'Montant invalide',    description: 'Montant de transaction invalide',            severity: 'error'   },
  '111': { label: 'PAN invalide',        description: 'Numéro de carte invalide',                  severity: 'error'   },
  '114': { label: 'Compte inexistant',   description: 'Compte non trouvé chez l\'émetteur',        severity: 'error'   },
  '116': { label: 'Fonds insuf.',        description: 'Provision insuffisante sur le compte',      severity: 'warning' },
  '117': { label: 'PIN incorrect',       description: 'Code PIN incorrect',                        severity: 'warning' },
  '119': { label: 'Titulaire non aut.', description: 'Titulaire non autorisé pour ce type de tx', severity: 'error'   },
  '121': { label: 'Plafond quotidien',   description: 'Plafond quotidien de transactions dépassé', severity: 'warning' },
  '122': { label: 'Plafond retrait',     description: 'Plafond de retraits dépassé',               severity: 'warning' },
  '125': { label: 'Carte invalide',      description: 'Numéro de carte invalide',                  severity: 'error'   },
  '133': { label: 'Carte expirée',       description: 'Carte expirée (vérif date)',                severity: 'error'   },
  '141': { label: 'Carte perdue',        description: 'Carte signalée comme perdue',               severity: 'error'   },
  '143': { label: 'Carte volée',         description: 'Carte signalée comme volée',                severity: 'error'   },
  '181': { label: 'Fraude TVR',          description: 'Fraude  -  code TVR suspect',                 severity: 'error'   },
  '182': { label: 'ATC anormal',         description: 'Fraude  -  ATC anormal (rejeu probable)',     severity: 'error'   },
  '183': { label: 'Cryptogramme inv.',   description: 'Fraude  -  cryptogramme EMV invalide',        severity: 'error'   },
  '200': { label: 'Contacter émetteur',  description: 'Erreur  -  contacter la banque émettrice',   severity: 'error'   },
  '051': { label: 'Déclinée',            description: 'Ne pas honorer  -  refus générique',          severity: 'error'   },
  '014': { label: 'Carte invalide',      description: 'Carte non reconnue par l\'émetteur',        severity: 'error'   },
  '906': { label: 'Switch indispo.',     description: 'Switch de paiement indisponible',           severity: 'error'   },
  '907': { label: 'Émetteur injoignable',description: 'Banque émettrice inaccessible',             severity: 'error'   },
  '909': { label: 'Erreur système',      description: 'Erreur interne du système',                 severity: 'error'   },
  '910': { label: 'Émetteur réseau',     description: 'Émetteur inaccessible (réseau)',            severity: 'error'   },
  '911': { label: 'Timeout émetteur',    description: 'Délai de réponse émetteur dépassé',        severity: 'error'   },
  '912': { label: 'Émetteur hors ligne', description: 'Banque émettrice hors ligne',               severity: 'error'   },
};

// MTI normalisation : PowerCARD 1xxx → ISO 8583 0xxx (remplace le premier '1' par '0')
export function normalizeMti(code: string | undefined): string {
  if (!code || code === ' - ') return code ?? ' - ';
  return code.startsWith('1') ? '0' + code.slice(1) : code;
}

export const mtiCodes: Record<string, string> = {
  // ── ISO 8583 standard (format 0xxx) ──────────────────────────────────
  '0100': 'Demande d\'autorisation',
  '0102': 'Autorisation complète',
  '0110': 'Réponse d\'autorisation',
  '0120': 'Avis d\'autorisation',
  '0200': 'Transaction financière',
  '0210': 'Réponse financière',
  '0220': 'Avis financier',
  '0230': 'Réponse avis financier',
  '0400': 'Annulation',
  '0410': 'Réponse annulation',
  '0420': 'Avis annulation',
  '0421': 'Avis reversal',
  '0430': 'Réponse avis annulation',
  '0800': 'Message réseau',
  '0804': 'Message réseau',
  '0810': 'Réponse réseau',
  '0814': 'Réponse réseau',
};
