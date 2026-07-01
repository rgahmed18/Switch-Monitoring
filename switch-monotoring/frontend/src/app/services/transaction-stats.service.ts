import { Injectable } from '@angular/core';
import { Transaction } from '../models';
import { responseCodes } from '../data/iso8583';

// ============================================================================
// FORMULES OFFICIELLES  -  SOURCE UNIQUE DE VERITE
//
// approved    = count( status === 'APPROVED' )
// declined    = count( status === 'DECLINED' )
// total       = transactions.length
// approvalRate= (approved / total) * 100          [arrondi 1 décimale]
// avgLatency  = moyenne( latencyMs ∈ ]0 ; 30000[ ) [arrondi ms]
// totalVolume = Σ( amount || transactionAmount )
// avgAmount   = totalVolume / total               [arrondi]
// tps         = peak(tx par minute) / 60          [arrondi 1 décimale]
// ============================================================================

export interface TransactionStats {
  total: number;
  approved: number;
  declined: number;
  pending: number;
  approvalRate: number;
  avgLatency: number;
  totalVolume: number;
  avgAmount: number;
  tps: number;
  topErrors: { code: string; desc: string; count: number }[];
}

@Injectable({ providedIn: 'root' })
export class TransactionStatsService {

  compute(transactions: Transaction[]): TransactionStats {
    const total = transactions.length;
    if (total === 0) {
      return {
        total: 0, approved: 0, declined: 0, pending: 0,
        approvalRate: 0, avgLatency: 0, totalVolume: 0,
        avgAmount: 0, tps: 0, topErrors: []
      };
    }

    // ── Compteurs statut ─────────────────────────────────────────────────────
    let approved = 0;
    let declined = 0;
    let pending  = 0;

    // ── Latence ──────────────────────────────────────────────────────────────
    let latencySum   = 0;
    let latencyCount = 0;

    // ── Volume ───────────────────────────────────────────────────────────────
    let totalVolume = 0;

    // ── Codes refus (top erreurs) ─────────────────────────────────────────────
    const errorMap: Record<string, number> = {};

    // ── TPS (pic par minute) ─────────────────────────────────────────────────
    const minuteMap = new Map<number, number>();

    // ── Parcours unique ───────────────────────────────────────────────────────
    for (const tx of transactions) {
      const status = (tx.status || '').toUpperCase();

      if (status === 'APPROVED')       approved++;
      else if (status === 'DECLINED')  declined++;
      else if (status === 'PENDING')   pending++;

      const lat = tx.latencyMs || 0;
      if (lat > 0 && lat < 30_000) {
        latencySum += lat;
        latencyCount++;
      }

      totalVolume += tx.amount || (tx as any).transactionAmount || 0;

      if (status === 'DECLINED') {
        const rc = ((tx as any).responseCode || (tx as any).actionCode || '').toString().trim();
        if (rc && rc !== '00' && rc !== '000') {
          errorMap[rc] = (errorMap[rc] || 0) + 1;
        }
      }

      const ts = new Date((tx as any).timestamp || (tx as any).transmissionDateAndTime || 0).getTime();
      if (!isNaN(ts) && ts > 0) {
        const minute = Math.floor(ts / 60_000);
        minuteMap.set(minute, (minuteMap.get(minute) || 0) + 1);
      }
    }

    // ── Taux d'approbation ────────────────────────────────────────────────────
    const approvalRate = parseFloat(((approved / total) * 100).toFixed(1));

    // ── Latence moyenne ───────────────────────────────────────────────────────
    const avgLatency = latencyCount > 0
      ? Math.round(latencySum / latencyCount)
      : 0;

    // ── Montant moyen ─────────────────────────────────────────────────────────
    const avgAmount = Math.round(totalVolume / total);

    // ── TPS : pic dans la fenêtre de 1 minute la plus dense ──────────────────
    const peak = minuteMap.size > 0 ? Math.max(...minuteMap.values()) : 0;
    const tps  = parseFloat((peak / 60).toFixed(1));

    // ── Top 5 codes refus ─────────────────────────────────────────────────────
    const topErrors = Object.entries(errorMap)
      .map(([code, count]) => ({
        code,
        desc:  (responseCodes as any)[code]?.label || code,
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total, approved, declined, pending,
      approvalRate, avgLatency, totalVolume,
      avgAmount, tps, topErrors
    };
  }
}
