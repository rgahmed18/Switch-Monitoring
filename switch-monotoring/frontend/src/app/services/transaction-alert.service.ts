import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Transaction } from '../models';

// ── Types publics ─────────────────────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus   = 'OPEN' | 'RESOLVED';

export type AlertType =
  | 'CRITICAL_REFUSAL_RATE'
  | 'HIGH_REFUSAL_RATE'
  | 'REVERSAL_DETECTED';

export interface TransactionAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  details: string;
  status: AlertStatus;
  createdAt: Date;
  transactionRef?: string;
}

/** Statistique pour un code ISO 8583 individuel */
export interface RejectionCodeStat {
  code: string;
  label: string;
  count: number;
  /** % sur le total des transactions de la période */
  percentage: number;
}

/** Snapshot complet des métriques calculées sur un lot de transactions */
export interface AlertStats {
  totalCount: number;
  declinedCount: number;
  refusalRate: number;
  reversalCount: number;
  /** Alertes CRITICAL actuellement OPEN dans le BehaviorSubject */
  criticalOpenCount: number;
  /** Top 5 codes de refus ISO 8583 (51 / 55 / 05 / 54 / 14) */
  top5RejectionCodes: RejectionCodeStat[];
}

// ── Helpers internes ──────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function emptyStats(): AlertStats {
  return {
    totalCount: 0, declinedCount: 0, refusalRate: 0,
    reversalCount: 0, criticalOpenCount: 0,
    top5RejectionCodes: [],
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class TransactionAlertService {

  // ── Seuils de déclenchement ────────────────────────────────────────────────
  /** Au-delà de ce taux → alerte CRITICAL */
  private readonly CRITICAL_REFUSAL_THRESHOLD = 50;
  /** Au-delà de ce taux → alerte WARNING */
  private readonly WARNING_REFUSAL_THRESHOLD  = 35;

  // ── Top 5 codes de refus ISO 8583 à surveiller ────────────────────────────
  private readonly TOP5_CODES = ['51', '55', '05', '54', '14'] as const;

  // ── Libellés français (ISO 8583 2-car + codes PowerCARD bruts fréquents) ──
  private readonly RESPONSE_LABELS: Record<string, string> = {
    '00': 'Approuvé',
    '01': 'Référer à l\'émetteur',
    '03': 'Commerçant invalide',
    '05': 'Refus émetteur',
    '12': 'Transaction invalide',
    '13': 'Montant invalide',
    '14': 'Carte invalide / PAN',
    '30': 'Erreur de format',
    '41': 'Carte perdue',
    '43': 'Carte volée',
    '51': 'Fonds insuffisants',
    '54': 'Carte expirée',
    '55': 'PIN incorrect',
    '61': 'Limite de retrait dépassée',
    '91': 'Émetteur injoignable',
    '96': 'Erreur système',
    // Codes PowerCARD bruts (fallback si non mappés par ApiService)
    '000': 'Approuvé',
    '051': 'Fonds insuffisants',
    '055': 'PIN incorrect',
    '101': 'Carte expirée',
    '111': 'Carte invalide / PAN',
    '906': 'Erreur système switch',
    '907': 'Émetteur injoignable',
    '909': 'Erreur réseau',
    '910': 'Timeout émetteur',
    '911': 'Émetteur hors ligne',
    '912': 'Émetteur non opérationnel',
  };

  // ── État réactif ──────────────────────────────────────────────────────────
  private readonly _alerts$ = new BehaviorSubject<TransactionAlert[]>([]);
  private readonly _stats$  = new BehaviorSubject<AlertStats>(emptyStats());

  // ── Observables publics ───────────────────────────────────────────────────
  readonly alerts$ = this._alerts$.asObservable();
  readonly stats$  = this._stats$.asObservable();

  // ── Snapshots synchrones ──────────────────────────────────────────────────
  get alerts(): TransactionAlert[] { return this._alerts$.value; }
  get stats(): AlertStats          { return this._stats$.value; }

  get criticalOpenCount(): number {
    return this._alerts$.value.filter(
      a => a.severity === 'critical' && a.status === 'OPEN'
    ).length;
  }

  // ── API publique ──────────────────────────────────────────────────────────

  /**
   * Traite un lot complet de transactions (chargement initial ou changement de filtre).
   * Recalcule toutes les métriques et déclenche les alertes correspondantes.
   */
  processBatch(transactions: Transaction[]): void {
    if (!transactions.length) {
      this._stats$.next(emptyStats());
      return;
    }
    const stats = this._computeStats(transactions);
    this._stats$.next(stats);
    this._detectAndFireAlerts(stats);
  }

  /**
   * Traite une transaction SSE en temps réel.
   * Déclenche une alerte INFO si c'est un reversal.
   */
  processLive(tx: Transaction): void {
    if (tx.mtiCode === '0420' || tx.mtiCode === '0421') {
      this._pushAlert({
        type: 'REVERSAL_DETECTED',
        severity: 'info',
        title: 'Reversal détecté (MTI 0420)',
        details: `Réf: ${tx.referenceNumber || tx.externalId || 'N/A'}  -  `
               + `${tx.transactionAmount ?? tx.amount ?? 0} ${tx.transactionCurrency || 'MAD'}`,
        transactionRef: tx.referenceNumber,
      });
    }
  }

  /** Marque une alerte comme RESOLVED. */
  resolveAlert(id: string): void {
    this._updateAlertStatus(id, 'RESOLVED');
  }

  /** Rouvre une alerte déjà résolue (retour en OPEN). */
  reopenAlert(id: string): void {
    this._updateAlertStatus(id, 'OPEN');
  }

  private _updateAlertStatus(id: string, status: AlertStatus): void {
    const updated = this._alerts$.value.map(a =>
      a.id === id ? { ...a, status } : a
    );
    this._alerts$.next(updated);
    this._stats$.next({
      ...this._stats$.value,
      criticalOpenCount: updated.filter(a => a.severity === 'critical' && a.status === 'OPEN').length,
    });
  }

  /**
   * Retourne le libellé français d'un code réponse ISO 8583 ou PowerCARD.
   * Alimente la section "Raisons des Refus - Top 5" du composant.
   *
   * @example getResponseCodeLabel('51') → 'Fonds insuffisants'
   * @example getResponseCodeLabel('55') → 'PIN incorrect'
   */
  getResponseCodeLabel(code: string): string {
    return this.RESPONSE_LABELS[code] ?? `Code ${code}`;
  }

  // ── Logique interne ───────────────────────────────────────────────────────

  private _computeStats(transactions: Transaction[]): AlertStats {
    // Exclude reversals  -  same rule as Dashboard successRate formula
    const nonReversals = transactions.filter(tx =>
      tx.functionCode !== '400' && tx.reversalFlag !== 'Y'
    );
    const total = nonReversals.length;

    const reversals = transactions.filter(t =>
      t.mtiCode === '0420' || t.mtiCode === '0421'
    ).length;

    // Approved: multi-field check identical to Dashboard updateKpis()
    const approved = nonReversals.filter(tx => {
      const rc = (tx.responseCode || '').toString().trim();
      return rc === '00' || rc === '000'
        || (tx.actionCode || '').toString().trim() === '000'
        || tx.status === 'APPROVED';
    }).length;

    const declined = total - approved;

    // Code counting on non-reversals only
    const codeCounts = new Map<string, number>();
    for (const t of nonReversals) {
      const code = (t.responseCode || '').toString().trim();
      if (code && code !== '00' && code !== '000') {
        codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
      }
    }

    // Top 5 dans l'ordre fixe : 51, 55, 05, 54, 14
    const top5RejectionCodes: RejectionCodeStat[] = this.TOP5_CODES
      .map(code => ({
        code,
        label:      this.getResponseCodeLabel(code),
        count:      codeCounts.get(code) ?? 0,
        percentage: total > 0
          ? Math.round(((codeCounts.get(code) ?? 0) / total) * 1000) / 10
          : 0,
      }))
      .filter(s => s.count > 0);

    const criticalOpenCount = this._alerts$.value.filter(
      a => a.severity === 'critical' && a.status === 'OPEN'
    ).length;

    return {
      totalCount: total,
      declinedCount: declined,
      refusalRate: total > 0 ? Math.round((declined / total) * 100) : 0,
      reversalCount: reversals,
      criticalOpenCount,
      top5RejectionCodes,
    };
  }

  private _detectAndFireAlerts(stats: AlertStats): void {
    // CRITICAL  -  Taux de refus très élevé (> 50%)
    if (stats.refusalRate > this.CRITICAL_REFUSAL_THRESHOLD) {
      this._pushAlert({
        type: 'CRITICAL_REFUSAL_RATE',
        severity: 'critical',
        title: 'Taux de Refus Critique',
        details: `${stats.refusalRate}% de refus (seuil critique: ${this.CRITICAL_REFUSAL_THRESHOLD}%)  -  `
               + `${stats.declinedCount} / ${stats.totalCount} transactions refusées.`,
      });
    }

    // WARNING  -  Taux de refus élevé (> 35%)
    if (stats.refusalRate > this.WARNING_REFUSAL_THRESHOLD
        && stats.refusalRate <= this.CRITICAL_REFUSAL_THRESHOLD) {
      this._pushAlert({
        type: 'HIGH_REFUSAL_RATE',
        severity: 'warning',
        title: 'Taux de Refus Global Élevé',
        details: `${stats.refusalRate}% de refus (seuil: ${this.WARNING_REFUSAL_THRESHOLD}%)  -  `
               + `${stats.declinedCount} / ${stats.totalCount} transactions refusées.`,
      });
    }

    // INFO  -  Reversals détectés dans le lot
    if (stats.reversalCount > 0) {
      this._pushAlert({
        type: 'REVERSAL_DETECTED',
        severity: 'info',
        title: 'Transactions Reversals Détectées',
        details: `${stats.reversalCount} reversal(s) MTI 0420/0421 sur la période.`,
      });
    }
  }

  private _pushAlert(partial: Omit<TransactionAlert, 'id' | 'status' | 'createdAt'>): void {
    const alert: TransactionAlert = {
      id: uid(),
      ...partial,
      status: 'OPEN',
      createdAt: new Date(),
    };
    // Déduplique : retire l'alerte OPEN du même type si elle existe déjà
    const deduped = this._alerts$.value.filter(
      a => !(a.type === alert.type && a.status === 'OPEN')
    );
    this._alerts$.next([alert, ...deduped].slice(0, 100));
  }
}
