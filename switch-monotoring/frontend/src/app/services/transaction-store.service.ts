import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Transaction } from '../models';

const MAX_SIZE    = 2000;
const MAX_BUFFER  = 500;
const ARCHIVE_MONTHS = 3;

function txKey(tx: Transaction): string {
  return [
    tx.referenceNumber || '',
    tx.internalStan || tx.stan || '',
    tx.transmissionDateAndTime || tx.timestamp || '',
  ].join('|');
}

function archiveCutoff(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - ARCHIVE_MONTHS);
  return d;
}

@Injectable({ providedIn: 'root' })
export class TransactionStoreService {
  private readonly _store  = new BehaviorSubject<Transaction[]>([]);
  private _pauseBuffer: Transaction[] = [];

  readonly transactions$ = this._store.asObservable();

  get snapshot(): Transaction[] { return this._store.value; }
  get bufferSize(): number      { return this._pauseBuffer.length; }

  /** Recent transactions (< 3 months)  -  primary dashboard view. */
  get current(): Transaction[] {
    const cutoff = archiveCutoff();
    return this._store.value.filter(tx => {
      const d = new Date(tx.transmissionDateAndTime || tx.timestamp || 0);
      return d >= cutoff;
    });
  }

  /** Archived transactions (>= 3 months old)  -  kept for comparison, never deleted. */
  get archived(): Transaction[] {
    const cutoff = archiveCutoff();
    return this._store.value.filter(tx => {
      const d = new Date(tx.transmissionDateAndTime || tx.timestamp || 0);
      return d < cutoff;
    });
  }

  get archivedCount(): number { return this.archived.length; }

  /**
   * Remplace completement le store par un nouveau batch.
   * Utilise quand on veut garantir que les donnees affichees
   * correspondent exactement a ce que retourne le backend
   * (pas d'accumulation d'anciennes sessions).
   */
  replaceAll(incoming: Transaction[]): void {
    this._store.next(incoming.slice(0, MAX_SIZE));
  }

  /**
   * Merge an API batch into the store using upsert semantics.
   * Incoming transactions REPLACE existing entries with the same key so that
   * corrected field values (networkCode, networkId, cardNumberMasked) are
   * always reflected  -  never silently discarded when keys match stale data.
   * Archived data not present in the incoming batch is retained.
   */
  mergeBatch(incoming: Transaction[]): void {
    if (!incoming.length) return;
    const incomingKeys = new Set(incoming.map(txKey));
    // Keep only archived entries that aren't superseded by the fresh batch
    const retained = this._store.value.filter(t => !incomingKeys.has(txKey(t)));
    this._store.next([...incoming, ...retained].slice(0, MAX_SIZE));
  }

  /**
   * Add a single live SSE transaction.
   * Buffers the transaction when paused; merges immediately when live.
   */
  addLive(tx: Transaction, isLive: boolean): void {
    if (!isLive) {
      if (this._pauseBuffer.length < MAX_BUFFER) this._pauseBuffer.push(tx);
      return;
    }
    this._mergeSingle(tx);
  }

  /**
   * Flush buffered transactions into the store after pause ends.
   */
  flushBuffer(): void {
    if (!this._pauseBuffer.length) return;
    const buf = this._pauseBuffer.splice(0);
    const existing = this._store.value;
    const keys = new Set(existing.map(txKey));
    const newOnes = buf.filter(t => !keys.has(txKey(t)));
    if (newOnes.length) {
      this._store.next([...newOnes, ...existing].slice(0, MAX_SIZE));
    }
  }

  private _mergeSingle(tx: Transaction): void {
    const existing = this._store.value;
    const k = txKey(tx);
    if (existing.some(t => txKey(t) === k)) return;
    this._store.next([tx, ...existing].slice(0, MAX_SIZE));
  }
}
