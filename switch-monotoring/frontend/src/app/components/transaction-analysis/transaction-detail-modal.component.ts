import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Transaction } from '../../models';

interface Field {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}

interface TvrBit {
  label: string;
  severity: 'warn' | 'error' | 'info';
}

interface TimelineStep {
  name: string;
  time: string;
  desc: string;
  done: boolean;
  fail: boolean;
  last: boolean;
}

@Component({
  selector: 'app-transaction-detail-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- BACKDROP -->
    <div class="backdrop" (click)="closed.emit()"></div>

    <!-- DRAWER -->
    <aside class="drawer" [class.approved]="isApproved" [class.declined]="isDeclined">

      <!-- ── HEADER ── -->
      <header class="dh">
        <div class="dh-left">
          <div class="dh-icon" [class.icon-ok]="isApproved" [class.icon-fail]="isDeclined">
            {{ isApproved ? '✓' : isDeclined ? '✕' : '?' }}
          </div>
          <div class="dh-text">
            <div class="dh-status">{{ statusLabel }}</div>
            <div class="dh-ref">{{ tx?.referenceNumber || 'N/A' }}</div>
            <div class="dh-time">{{ formatDateTime(tx?.transmissionDateAndTime?.toString()) }}</div>
          </div>
        </div>
        <button class="dh-close" (click)="closed.emit()">✕</button>
      </header>

      <!-- DECLINE BANNER -->
      <div class="decline-banner" *ngIf="isDeclined">
        <span class="db-code">{{ tx?.actionCode || tx?.responseCode || '?' }}</span>
        <span class="db-reason">{{ declineLabel }}</span>
        <span class="db-latency" *ngIf="tx?.latencyMs">{{ tx?.latencyMs }}ms</span>
      </div>

      <!-- ── KPI STRIP ── -->
      <div class="kpi-strip">
        <div class="kpi" [class.kpi-green]="isApproved" [class.kpi-red]="isDeclined">
          <div class="kpi-v">{{ tx?.actionCode || tx?.responseCode || '' }}</div>
          <div class="kpi-l">Code Action</div>
        </div>
        <div class="kpi">
          <div class="kpi-v">{{ tx?.mtiCode || tx?.messageType || '' }}</div>
          <div class="kpi-l">MTI</div>
        </div>
        <div class="kpi"
             [class.kpi-warn]="(tx?.latencyMs || 0) > 500 && (tx?.latencyMs || 0) <= 2000"
             [class.kpi-red]="(tx?.latencyMs || 0) > 2000">
          <div class="kpi-v">{{ tx?.latencyMs ? (tx?.latencyMs + 'ms') : '' }}</div>
          <div class="kpi-l">Latence</div>
        </div>
        <div class="kpi">
          <div class="kpi-v">{{ tx?.channel || '' }}</div>
          <div class="kpi-l">Canal</div>
        </div>
      </div>

      <!-- ── SCROLLABLE BODY ── -->
      <div class="db-scroll">

        <!-- Section 1: Identifiants & Routing -->
        <div class="sec">
          <div class="sec-title">Identifiants &amp; Routing</div>
          <div class="fields">
            <ng-container *ngFor="let f of identFields">
              <div class="field" *ngIf="f.value">
                <div class="fl">{{ f.label }}</div>
                <div class="fv" [class.mono]="f.mono">{{ f.value }}</div>
              </div>
            </ng-container>
          </div>
        </div>

        <!-- Section 2: Message ISO 8583 -->
        <div class="sec">
          <div class="sec-title">Message ISO 8583</div>
          <div class="fields">
            <ng-container *ngFor="let f of isoFields">
              <div class="field" *ngIf="f.value">
                <div class="fl">{{ f.label }}</div>
                <div class="fv" [class.mono]="f.mono">{{ f.value }}</div>
              </div>
            </ng-container>
          </div>
        </div>

        <!-- Section 3: Carte & Emetteur -->
        <div class="sec">
          <div class="sec-title">Carte &amp; Emetteur</div>
          <div class="fields">
            <ng-container *ngFor="let f of cardFields">
              <div class="field" *ngIf="f.value">
                <div class="fl">{{ f.label }}</div>
                <div class="fv" [class.mono]="f.mono">{{ f.value }}</div>
              </div>
            </ng-container>
          </div>
        </div>

        <!-- Section 4: Acquereur, Terminal & Commercant -->
        <div class="sec">
          <div class="sec-title">Acquereur, Terminal &amp; Commercant</div>
          <div class="fields">
            <ng-container *ngFor="let f of networkFields">
              <div class="field" *ngIf="f.value">
                <div class="fl">{{ f.label }}</div>
                <div class="fv" [class.mono]="f.mono">{{ f.value }}</div>
              </div>
            </ng-container>
          </div>
        </div>

        <!-- Section 5: Montants -->
        <div class="sec">
          <div class="sec-title">Montants</div>
          <div class="fin-cards">
            <div class="fin-card">
              <div class="fin-amount">{{ formatAmount(tx?.transactionAmount || tx?.amount) }}</div>
              <div class="fin-cur">{{ tx?.transactionCurrency || tx?.currency || 'MAD' }}</div>
              <div class="fin-label">Montant transaction</div>
            </div>
            <div class="fin-card fin-card-alt" *ngIf="tx?.billingAmount">
              <div class="fin-amount">{{ formatAmount(tx?.billingAmount) }}</div>
              <div class="fin-cur">MAD</div>
              <div class="fin-label">Facturation (MAD)</div>
            </div>
          </div>
          <div class="fields" style="margin-top:12px">
            <ng-container *ngFor="let f of finFields">
              <div class="field" *ngIf="f.value">
                <div class="fl">{{ f.label }}</div>
                <div class="fv" [class.mono]="f.mono">{{ f.value }}</div>
              </div>
            </ng-container>
          </div>
        </div>

        <!-- Section 6: EMV / DE55 (shown only if chip data present) -->
        <div class="sec" *ngIf="hasChipData">
          <div class="sec-title">EMV/Chip -DE55</div>

          <div class="tvr-block" *ngIf="chipTvrRaw">
            <div class="tvr-header">
              <span class="tvr-label">TVR (Terminal Verification Results)</span>
              <span class="tvr-hex">{{ chipTvrRaw }}</span>
            </div>
            <div class="tvr-bits" *ngIf="activeTvrBits.length > 0">
              <div class="tvr-bit"
                   *ngFor="let b of activeTvrBits"
                   [class.bit-warn]="b.severity === 'warn'"
                   [class.bit-err]="b.severity === 'error'"
                   [class.bit-info]="b.severity === 'info'">
                <span class="bit-dot">{{ b.severity === 'error' ? '▲' : b.severity === 'warn' ? '!' : 'i' }}</span>
                {{ b.label }}
              </div>
            </div>
            <div class="tvr-clean" *ngIf="activeTvrBits.length === 0">✓ Aucun incident TVR détecté</div>
          </div>

          <div class="fields" style="margin-top:12px">
            <ng-container *ngFor="let f of chipFields">
              <div class="field" *ngIf="f.value">
                <div class="fl">{{ f.label }}</div>
                <div class="fv" [class.mono]="f.mono">{{ f.value }}</div>
              </div>
            </ng-container>
          </div>
        </div>

        <!-- Section 7: Securite -->
        <div class="sec">
          <div class="sec-title">Securite &amp; Verification</div>
          <div class="fields">
            <ng-container *ngFor="let f of securityFields">
              <div class="field" *ngIf="f.value">
                <div class="fl">{{ f.label }}</div>
                <div class="fv" [class.mono]="f.mono">{{ f.value }}</div>
              </div>
            </ng-container>
          </div>
        </div>

        <!-- Section 8: Timeline -->
        <div class="sec sec-last">
          <div class="sec-title">Cycle de Vie de la Transaction</div>
          <div class="timeline">
            <div class="tl-step" *ngFor="let step of timelineSteps; let last = last"
                 [class.tl-done]="step.done"
                 [class.tl-fail]="step.fail"
                 [class.tl-last]="last">
              <div class="tl-col">
                <div class="tl-dot" [class.dot-ok]="step.done && !step.fail" [class.dot-fail]="step.fail"></div>
                <div class="tl-line" *ngIf="!last"></div>
              </div>
              <div class="tl-body">
                <div class="tl-name">{{ step.name }}</div>
                <div class="tl-time">{{ step.time }}</div>
                <div class="tl-desc">{{ step.desc }}</div>
              </div>
            </div>
          </div>
        </div>

      </div><!-- /db-scroll -->
    </aside>
  `,
  styles: [`
    :host {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      justify-content: flex-end;
    }

    /* ── BACKDROP ── */
    .backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(3px);
    }

    /* ── DRAWER ── */
    .drawer {
      position: relative;
      width: 520px;
      height: 100vh;
      background: #0d0f14;
      border-left: 1px solid rgba(255,255,255,0.08);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideIn {
      from { transform: translateX(100%); }
      to   { transform: translateX(0); }
    }

    .drawer.approved { border-left: 3px solid #22c55e; }
    .drawer.declined { border-left: 3px solid #ef4444; }

    /* ── HEADER ── */
    .dh {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 18px 20px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      flex-shrink: 0;
    }
    .approved .dh { background: rgba(34, 197, 94, 0.06); }
    .declined .dh { background: rgba(239, 68, 68, 0.06); }

    .dh-left { display: flex; align-items: flex-start; gap: 14px; }

    .dh-icon {
      width: 42px; height: 42px; border-radius: 50%;
      background: rgba(255,255,255,0.08);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 800; flex-shrink: 0;
    }
    .icon-ok   { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
    .icon-fail { background: rgba(239, 68, 68, 0.2); color: #f87171; }

    .dh-status {
      font-size: 9px; font-weight: 800; letter-spacing: 0.12em;
      text-transform: uppercase; color: #71717a;
    }
    .approved .dh-status { color: #4ade80; }
    .declined .dh-status { color: #f87171; }

    .dh-ref {
      font-size: 15px; font-weight: 700; color: #e4e4e7;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      margin-top: 3px; letter-spacing: 0.02em;
    }
    .dh-time { font-size: 11px; color: #71717a; margin-top: 3px; }

    .dh-close {
      width: 28px; height: 28px; border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.1);
      background: transparent; color: #71717a;
      cursor: pointer; font-size: 12px;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s; flex-shrink: 0;
    }
    .dh-close:hover { background: rgba(255,255,255,0.08); color: #e4e4e7; }

    /* ── DECLINE BANNER ── */
    .decline-banner {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 20px;
      background: rgba(239, 68, 68, 0.08);
      border-bottom: 1px solid rgba(239, 68, 68, 0.18);
      flex-shrink: 0;
    }
    .db-code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px; font-weight: 700;
      background: rgba(239, 68, 68, 0.2); color: #f87171;
      padding: 2px 8px; border-radius: 4px;
    }
    .db-reason { font-size: 12px; color: #fca5a5; flex: 1; }
    .db-latency {
      font-size: 10px; font-family: 'JetBrains Mono', monospace;
      color: #f87171; background: rgba(239, 68, 68, 0.12);
      padding: 2px 8px; border-radius: 4px;
    }

    /* ── KPI STRIP ── */
    .kpi-strip {
      display: grid; grid-template-columns: repeat(4, 1fr);
      border-bottom: 1px solid rgba(255,255,255,0.07);
      flex-shrink: 0;
    }
    .kpi {
      padding: 10px 14px; text-align: center;
      border-right: 1px solid rgba(255,255,255,0.06);
    }
    .kpi:last-child { border-right: none; }
    .kpi-v {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px; font-weight: 700; color: #e4e4e7;
    }
    .kpi-l {
      font-size: 9px; color: #52525b;
      text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px;
    }
    .kpi-green .kpi-v { color: #4ade80; }
    .kpi-red   .kpi-v { color: #f87171; }
    .kpi-warn  .kpi-v { color: #facc15; }

    /* ── SCROLLABLE BODY ── */
    .db-scroll {
      flex: 1; overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.1) transparent;
    }
    .db-scroll::-webkit-scrollbar { width: 4px; }
    .db-scroll::-webkit-scrollbar-track { background: transparent; }
    .db-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

    /* ── SECTIONS ── */
    .sec {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .sec-last { border-bottom: none; }

    .sec-title {
      font-size: 9px; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.1em; color: #a78bfa; margin-bottom: 12px;
    }

    /* ── FIELD GRID ── */
    .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }

    .field {
      background: rgba(255,255,255,0.025);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 6px; padding: 7px 10px;
      min-width: 0;
    }
    .fl {
      font-size: 9px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.06em; color: #52525b; margin-bottom: 3px;
    }
    .fv {
      font-size: 12px; color: #d4d4d8;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .fv.mono {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 11px; color: #e4e4e7; letter-spacing: 0.03em;
    }

    /* ── FINANCIAL ── */
    .fin-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

    .fin-card {
      background: rgba(96, 165, 250, 0.07);
      border: 1px solid rgba(96, 165, 250, 0.18);
      border-radius: 8px; padding: 14px;
    }
    .fin-card-alt {
      background: rgba(167, 139, 250, 0.07);
      border-color: rgba(167, 139, 250, 0.18);
    }
    .fin-amount {
      font-size: 20px; font-weight: 700; color: #e4e4e7;
      font-family: 'JetBrains Mono', monospace;
    }
    .fin-cur { font-size: 11px; color: #60a5fa; font-weight: 600; margin-top: 2px; }
    .fin-card-alt .fin-cur { color: #a78bfa; }
    .fin-label { font-size: 10px; color: #71717a; margin-top: 6px; }

    /* ── TVR BLOCK ── */
    .tvr-block {
      background: rgba(255,255,255,0.025);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 8px; padding: 12px;
    }
    .tvr-header {
      display: flex; align-items: center;
      justify-content: space-between; margin-bottom: 10px;
    }
    .tvr-label { font-size: 11px; color: #a1a1aa; font-weight: 600; }
    .tvr-hex {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px; font-weight: 700; color: #22d3ee;
      letter-spacing: 0.1em;
    }
    .tvr-bits { display: flex; flex-direction: column; gap: 4px; }
    .tvr-bit {
      display: flex; align-items: center; gap: 8px;
      font-size: 11px; padding: 4px 8px; border-radius: 4px;
      color: #d4d4d8; background: rgba(255,255,255,0.03);
    }
    .tvr-bit.bit-warn { background: rgba(234, 179, 8, 0.08); color: #fde047; }
    .tvr-bit.bit-err  { background: rgba(239, 68, 68, 0.08); color: #fca5a5; }
    .tvr-bit.bit-info { background: rgba(96, 165, 250, 0.08); color: #93c5fd; }
    .bit-dot { font-size: 9px; font-weight: 700; width: 14px; text-align: center; flex-shrink: 0; }
    .tvr-clean { font-size: 12px; color: #4ade80; text-align: center; padding: 8px; }

    /* ── TIMELINE ── */
    .timeline { padding: 2px 0; }

    .tl-step { display: flex; gap: 14px; }

    .tl-col {
      display: flex; flex-direction: column;
      align-items: center; flex-shrink: 0;
      padding-top: 2px;
    }

    .tl-dot {
      width: 12px; height: 12px; border-radius: 50%;
      background: rgba(255,255,255,0.12);
      border: 2px solid rgba(255,255,255,0.2);
      flex-shrink: 0;
    }
    .tl-dot.dot-ok   { background: #22c55e; border-color: #16a34a; }
    .tl-dot.dot-fail { background: #ef4444; border-color: #4F46E5; }

    .tl-line {
      flex: 1; width: 2px; margin-top: 4px;
      background: rgba(255,255,255,0.08); min-height: 20px;
    }
    .tl-done .tl-line { background: rgba(34, 197, 94, 0.25); }
    .tl-fail .tl-line { background: rgba(239, 68, 68, 0.2); }

    .tl-body { flex: 1; padding-bottom: 18px; }
    .tl-last .tl-body { padding-bottom: 0; }

    .tl-name {
      font-size: 12px; font-weight: 600; color: #e4e4e7; margin-bottom: 2px;
    }
    .tl-done .tl-name { color: #86efac; }
    .tl-fail .tl-name { color: #fca5a5; }

    .tl-time {
      font-size: 10px; font-family: 'JetBrains Mono', monospace;
      color: #71717a; margin-bottom: 2px;
    }
    .tl-desc { font-size: 11px; color: #52525b; }

    /* ── RESPONSIVE ── */
    @media (max-width: 600px) {
      .drawer { width: 100vw; }
    }
  `]
})
export class TransactionDetailModalComponent implements OnChanges {
  @Input() transaction: Transaction | null = null;
  @Output() closed = new EventEmitter<void>();

  tx: Transaction | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['transaction']) {
      this.tx = changes['transaction'].currentValue;
    }
  }

  // ── Status helpers ──

  get isApproved(): boolean {
    if (this.tx?.status === 'APPROVED') return true;
    const ac = (this.tx?.actionCode || '').trim();
    return ac === '000' || ac === '00';
  }

  get isDeclined(): boolean {
    if (this.tx?.status === 'DECLINED') return true;
    const ac = (this.tx?.actionCode || this.tx?.responseCode || '').trim();
    return !!ac && ac !== '000' && ac !== '00' && ac !== '';
  }

  get statusLabel(): string {
    if (this.isApproved) return 'TRANSACTION APPROUVEE';
    if (this.isDeclined) return 'TRANSACTION REFUSEE';
    return 'EN ATTENTE';
  }

  get declineLabel(): string {
    // Priorité 1 : raison de rejet stockée en base
    if (this.tx?.rejectReason) return this.tx.rejectReason;
    const ac = (this.tx?.actionCode || this.tx?.responseCode || '').trim();
    const map: Record<string, string> = {
      '051': 'Provision insuffisante',
      '055': 'Code PIN incorrect',
      '054': 'Carte expiree',
      '005': 'Transaction non honoree',
      '091': 'Emetteur inaccessible (timeout)',
      '014': 'Numero de carte invalide',
      '096': 'Mauvais fonctionnement systeme',
      '041': 'Carte perdue - retenir',
      '043': 'Carte volee - retenir',
      '057': 'Transaction non permise a ce porteur',
      '062': 'Carte restreinte',
      '065': 'Limite de retrait atteinte',
      '075': 'Nombre PIN incorrects depasse',
      '089': 'Carte non encore effective',
    };
    return map[ac] || 'Refus (code ' + ac + ')';
  }

  // ── Field getters ──

  get identFields(): Field[] {
    return [
      { label: 'REFERENCE NUMBER',       value: this.tx?.referenceNumber,                       mono: true  },
      { label: 'STAN INTERNE (DE11)',     value: this.tx?.internalStan || this.tx?.stan,         mono: true  },
      { label: 'STAN EXTERNE',           value: this.tx?.externalStan,                           mono: true  },
      { label: 'CODE ROUTAGE',           value: this.tx?.routingCode,                            mono: true  },
      { label: 'CODE CAPTURE',           value: this.tx?.captureCode,                            mono: true  },
      { label: 'AUTORISATION ID',        value: this.tx?.authorizationId,                        mono: true  },
      { label: 'TRANSACTION ID',         value: this.tx?.transactionId,                          mono: true  },
      { label: 'CANAL',                  value: this.canalDisplay,                               mono: false },
      { label: 'RESEAU',                 value: this.networkDisplay,                             mono: false },
      { label: 'DATE/HEURE TRANSMISSION',value: this.formatDateTime(this.tx?.transmissionDateAndTime?.toString()), mono: false },
      { label: 'DATE/HEURE REPONSE',     value: this.formatDateTime(this.tx?.responseDateAndTime?.toString()),    mono: false },
      { label: 'DATE METIER',            value: this.tx?.businessDate?.toString(),               mono: true  },
    ];
  }

  get isoFields(): Field[] {
    const mti = (this.tx?.mtiCode || this.tx?.messageType || '').trim();
    // Normalise : PowerCARD retourne 1xxx, l'adapteur le converti en 0xxx -on accepte les deux
    const mtiNorm = mti.startsWith('1') ? '0' + mti.slice(1) : mti;
    const mtiMap: Record<string, string> = {
      '0100': 'Demande d\'autorisation',
      '0110': 'Reponse autorisation',
      '0200': 'Presentment / Transaction financiere',
      '0210': 'Reponse presentment',
      '0400': 'Reversal / Annulation',
      '0420': 'Reversal request',
      '0800': 'Administration reseau',
      '0810': 'Reponse reseau',
    };
    const mtiLabel = mtiMap[mtiNorm]
      ? `${mti} -${mtiMap[mtiNorm]}`
      : (mti || null);

    const procMap: Record<string, string> = {
      '00': '00 -Achat',
      '01': '01 -Retrait GAB',
      '09': '09 -Purchase with cashback',
      '17': '17 -Achat sans contact',
      '20': '20 -Remboursement',
      '28': '28 -Paiement',
      '30': '30 -Demande de solde',
      '40': '40 -Transfert entre comptes',
    };
    const procCode = (this.tx?.processingCode || '').trim();
    const procLabel = procMap[procCode] || (procCode || null);

    const funcMap: Record<string, string> = {
      '100': '100 -Autorisation',
      '180': '180 -Autorisation partielle',
      '200': '200 -Debit financier',
      '400': '400 -Reversal',
      '480': '480 -Reversal partiel',
    };
    const funcCode = (this.tx?.functionCode || '').trim();
    const funcLabel = funcMap[funcCode] || (funcCode || null);

    const acRaw   = (this.tx?.actionCode  || '').trim();
    const rcRaw   = (this.tx?.responseCode || '').trim();
    const acLabel = acRaw
      ? (this.isApproved ? `${acRaw} -APPROUVE` : `${acRaw} -${this.declineLabel}`)
      : (rcRaw || null);

    return [
      { label: 'TYPE MTI (DE0)',              value: mtiLabel,                          mono: true  },
      { label: 'CODE FONCTION (DE24)',         value: funcLabel,                         mono: true  },
      { label: 'CODE TRAITEMENT (DE3)',        value: procLabel,                         mono: true  },
      { label: 'CODE ACTION (DE39)',           value: acLabel,                           mono: true  },
      { label: 'CODE ACTION ORIGINAL',         value: this.tx?.originalActionCode || null, mono: true },
      { label: 'CODE ACTION EMETTEUR',         value: this.tx?.issuerActionCode    || null, mono: true },
      { label: 'CODE EVENEMENT',               value: this.tx?.eventCode           || null, mono: true },
      { label: 'CODE REJET',                   value: this.tx?.rejectCode          || null, mono: true },
      { label: 'MOTIF DE REJET',               value: this.tx?.rejectReason        || null, mono: false},
    ];
  }

  get cardFields(): Field[] {
    return [
      { label: 'PAN (DE2)',             value: this.maskedPan,                                    mono: true  },
      { label: 'TYPE CARTE',            value: this.cardTypeLabel,                                mono: false },
      { label: 'NIVEAU CARTE',          value: this.cardLevelLabel,                               mono: false },
      { label: 'CODE PRODUIT',          value: this.productCodeLabel,                             mono: true  },
      { label: 'CODE SERVICE (DE40)',   value: this.tx?.serviceCode                  || null,     mono: true  },
      { label: 'BANQUE EMETTRICE',      value: (this.tx?.issuingBank || '').trim()   || null,     mono: true  },
      { label: 'MODE ENTREE POS (DE22)',value: this.entryModeDisplay,                             mono: false },
      { label: 'CONDITION POS (DE25)',  value: this.posConditionDisplay,                          mono: false },
      { label: 'CODE AUTORISATION',     value: this.tx?.authorizationCode            || null,     mono: true  },
      { label: 'EXPIRATION (DE14)',     value: this.expiryDisplay,                               mono: true  },
    ];
  }

  get networkFields(): Field[] {
    return [
      { label: 'BANQUE ACQUEREUR (DE32)', value: (this.tx?.acquirerBank || this.tx?.bankName || '').trim() || null, mono: true  },
      { label: 'CODE INSTITUTION ACQ.',   value: this.tx?.acquirerInstitutionCode   || null, mono: true  },
      { label: 'PAYS ACQUEREUR (DE19)',   value: this.acquiringCountryDisplay,                 mono: false },
      { label: 'TERMINAL ID (DE41)',      value: this.tx?.cardAcceptorTermId || this.tx?.terminalId || null, mono: true  },
      { label: 'CARD ACCEPTOR ID (DE42)', value: this.tx?.cardAcceptorId              || null, mono: true  },
      { label: 'NOM COMMERCANT (DE43)',   value: (this.tx?.cardAccNameAddress || this.tx?.merchantName || '').trim() || null, mono: false },
      { label: 'MCC (DE18)',              value: this.mccDisplay,                              mono: false },
      { label: 'BANQUE FORWARDING',       value: (this.tx?.forwardingBank || '').trim()  || null, mono: true  },
      { label: 'INSTITUTION FORWARDING',  value: this.tx?.forwardingInstitutionCode   || null, mono: true  },
      { label: 'INSTITUTION RECEPTRICE',  value: this.tx?.receivingInstitution        || null, mono: true  },
      { label: 'NETWORK CODE (DE02)',     value: this.networkDisplay,                          mono: false },
    ];
  }

  get finFields(): Field[] {
    const rate = this.tx?.conversionRate;
    const rateStr = (rate != null && rate !== 1 && rate !== 1.0)
      ? rate.toString()
      : (rate != null ? '1 (local)' : null);

    const iss = this.tx?.issSettlementAmount;
    const acq = this.tx?.acqSettlementAmount;

    return [
      { label: 'TAUX DE CONVERSION',   value: rateStr, mono: true },
      { label: 'CASHBACK',             value: this.tx?.cashBackAmount ? this.formatAmount(this.tx.cashBackAmount) : null, mono: true },
      { label: 'FRAIS TRANSACTION',    value: this.tx?.transactionFee ? this.formatAmount(this.tx.transactionFee) : null, mono: true },
      { label: 'SETTLEMENT EMETTEUR',  value: iss ? this.formatAmount(iss) + ' ' + (this.tx?.issSettlementCurrency || this.tx?.transactionCurrency || '') : null, mono: true },
      { label: 'SETTLEMENT ACQUEREUR', value: acq ? this.formatAmount(acq) + ' ' + (this.tx?.acqSettlementCurrency || this.tx?.transactionCurrency || '') : null, mono: true },
    ];
  }

  get chipFields(): Field[] {
    return [
      { label: 'APPLICATION CRYPTOGRAM (ARPC)', value: this.tx?.chipApplicationCryptogram || null, mono: true },
      { label: 'TYPE TERMINAL CHIP',             value: this.tx?.chipTerminalType          || null, mono: true },
      { label: 'MONTANT CHIP',                   value: this.tx?.chipTransactionAmount      || null, mono: true },
    ];
  }

  get securityFields(): Field[] {
    const lvl = (this.tx?.securityVerifLevel || '').trim();
    const res = (this.tx?.securityVerifResult || '').trim();
    const lvlMap: Record<string, string> = {
      '3DS':              '3-D Secure (e-commerce)',
      '3DS_FRICTIONLESS': '3DS Frictionless',
      '3DS_CHALLENGE':    '3DS avec challenge',
      'EMV':              'Puce EMV / Chip',
      'PIN':              'Code PIN',
      'NFC':              'Sans contact NFC',
      'CVV':              'CVV / CVC',
      'SIGNATURE':        'Signature',
    };
    const resMap: Record<string, string> = {
      'VERIFIED':      'Verifie avec succes',
      'AUTHENTICATED': 'Authentifie',
      'CHALLENGE_OK':  'Challenge reussi',
      'APPROVED':      'Approuve',
      'OK':            'OK',
      'FAILED':        'Echec',
      'DECLINED':      'Decline',
    };
    return [
      { label: 'NIVEAU VERIFICATION SECURITE', value: lvl ? (lvlMap[lvl] ? `${lvl} -${lvlMap[lvl]}` : lvl) : null, mono: false },
      { label: 'RESULTAT VERIFICATION',        value: res ? (resMap[res] ? `${res} -${resMap[res]}` : res) : null, mono: false },
      { label: 'CODE AUTORISATION (DE38)',      value: this.tx?.authorizationCode          || null, mono: true  },
      { label: 'RESULTAT CVV EXTERNE',          value: this.tx?.externalCvvResultCode       || null, mono: true  },
      { label: 'DONNEES AVS',                   value: this.tx?.addressVerificationData     || null, mono: true  },
    ];
  }

  // ── Computed display properties ──

  get maskedPan(): string | null {
    const raw = (this.tx?.cardNumber || this.tx?.cardNumberMasked || '').trim();
    if (!raw) return null;
    if (raw.includes('X') || raw.includes('*')) {
      return raw.replace(/^(\d{6})(X+)(\d{4})$/, '$1 $2 $3');
    }
    const clean = raw.replace(/\s/g, '');
    if (clean.length < 8) return raw;
    const bin  = clean.slice(0, 6);
    const last = clean.slice(-4);
    const mid  = 'X'.repeat(Math.max(0, clean.length - 10));
    return `${bin} ${mid} ${last}`;
  }

  get cardTypeLabel(): string | null {
    const nc = (this.tx?.networkCode || '').trim();
    const pc = (this.tx?.productCode || '').trim().toUpperCase();
    const ni = (this.tx?.networkId   || '').trim().toUpperCase();
    const ct = (this.tx?.cardType    || '').trim().toUpperCase();
    if (pc === 'VIS' || pc === 'VISA' || nc === '01' || ni.startsWith('VI') || ct === 'VC' || ct === 'VD') {
      const level = ct === 'VC' ? ' Credit' : ct === 'VD' ? ' Debit' : '';
      return `VISA${level}`;
    }
    if (pc === 'MSC' || pc === 'MC' || pc === 'MAS' || nc === '02' || ni.startsWith('MC') || ni.startsWith('MA') || ct === 'MC' || ct === 'MD') {
      const level = ct === 'MC' ? ' Credit' : ct === 'MD' ? ' Debit' : '';
      return `Mastercard${level}`;
    }
    if (pc === 'CMI' || nc === '03' || ni === 'CMI') return 'CMI (Interbanque)';
    if (ct === 'AX') return 'American Express';
    return ct || null;
  }

  get cardLevelLabel(): string | null {
    const lv = (this.tx?.cardLevel || this.tx?.vipLevel || '').trim();
    const map: Record<string, string> = {
      'S': 'Standard', 'G': 'Gold', 'P': 'Platinum', 'B': 'Business',
      'N': 'Normal',   'Y': 'VIP',
    };
    return map[lv] || lv || null;
  }

  get productCodeLabel(): string | null {
    const pc = (this.tx?.productCode || '').trim().toUpperCase();
    const map: Record<string, string> = {
      'VIS': 'VIS - Visa', 'MSC': 'MSC - Mastercard',
      'CMI': 'CMI - Interbanque Maroc', 'VDB': 'VDB - Visa Debit',
      'VCC': 'VCC - Visa Credit', 'MCC': 'MCC - Mastercard Credit',
      'MCD': 'MCD - Mastercard Debit',
    };
    return map[pc] || pc || null;
  }

  get expiryDisplay(): string | null {
    const d = (this.tx?.endExpiryDate || this.tx?.startExpiryDate || '').toString().trim();
    if (!d) return null;
    const m = d.match(/(\d{4})-(\d{2})/);
    if (m) return `${m[2]}/${m[1]}`;
    return d.slice(0, 7) || null;
  }

  get canalDisplay(): string | null {
    const ch = (this.tx?.channel || '').trim().toUpperCase();
    const map: Record<string, string> = {
      'ATM': 'ATM / GAB', 'GAB': 'GAB / ATM',
      'POS': 'Point de Vente (POS)',
      'ECOM': 'E-Commerce', 'ECM': 'E-Commerce',
    };
    return map[ch] || ch || null;
  }

  get networkDisplay(): string | null {
    const nc = (this.tx?.networkCode || '').trim();
    const ni = (this.tx?.networkId   || '').trim().toUpperCase();
    const pc = (this.tx?.productCode || '').trim().toUpperCase();
    if (pc === 'VIS' || pc === 'VISA' || nc === '01' || ni.startsWith('VI')) return 'VISA';
    if (pc === 'MSC' || pc === 'MC'   || nc === '02' || ni.startsWith('MC')) return 'MASTERCARD';
    if (pc === 'CMI'                  || nc === '03' || ni === 'CMI') return 'CMI';
    return ni || nc || null;
  }

  get acquiringCountryDisplay(): string | null {
    const code = (this.tx?.acquiringCountryCode || this.tx?.country || '').trim();
    const map: Record<string, string> = {
      '504': 'Maroc (MAD)', '840': 'Etats-Unis (USD)', '978': 'Zone Euro (EUR)',
      '826': 'Royaume-Uni (GBP)', '682': 'Arabie Saoudite (SAR)',
      '784': 'Emirats Arabes Unis (AED)', '012': 'Algerie (DZD)',
      '788': 'Tunisie (TND)', '566': 'Nigeria (NGN)', '710': 'Afrique du Sud (ZAR)',
      '818': 'Egypte (EGP)', '756': 'Suisse (CHF)', '250': 'France (EUR)',
      '036': 'Australie (AUD)', '392': 'Japon (JPY)', '156': 'Chine (CNY)',
    };
    return map[code] ? `${code} - ${map[code]}` : (code || null);
  }

  get mccDisplay(): string | null {
    const mcc = (this.tx?.cardAcceptorActivity || '').trim();
    const map: Record<string, string> = {
      '5411': 'Supermarche / Grande surface',
      '5541': 'Station-service',
      '5812': 'Restaurant',
      '5912': 'Pharmacie',
      '5999': 'Commerce general',
      '6011': 'Distributeur ATM',
      '4111': 'Transport urbain',
      '7011': 'Hotel',
      '5651': 'Vetements',
      '5311': 'Grand magasin',
      '8049': 'Sante / Clinique',
      '5732': 'Electronique',
      '5045': 'High-Tech / Informatique',
      '7372': 'Services informatiques',
      '5961': 'E-commerce',
      '4816': 'Achat en ligne',
      '5734': 'Logiciels',
      '7922': 'Spectacles / Loisirs',
      '4722': 'Voyage / Agence',
      '5815': 'Telechargements numeriques',
    };
    return map[mcc] ? `${mcc} - ${map[mcc]}` : (mcc || null);
  }

  get entryModeDisplay(): string | null {
    // posEntryMode peut valoir '01', '0100', '05', '0510', '07', '81', etc.
    const raw = (this.tx?.posEntryMode || '').trim();
    // Normalise en prenant les 2 premiers chiffres significatifs
    const em = raw.length >= 2 ? raw.slice(0, 2) : raw;
    const map: Record<string, string> = {
      '01': 'Manuel (saisie clavier)',
      '02': 'Bande magnetique',
      '05': 'Puce EMV contact',
      '07': 'Sans contact NFC',
      '10': 'Credential on file',
      '79': 'Puce (repli manuel)',
      '80': 'Bande (repli mag.)',
      '81': 'E-commerce / Saisie web',
      '90': 'Bande magnetique (terminal)',
      '91': 'Sans contact (repli)',
      '95': 'Puce EMV integree',
    };
    return map[em] ? `${em} - ${map[em]}` : (raw || null);
  }

  get posConditionDisplay(): string | null {
    const pc = (this.tx?.posConditionCode || '').trim();
    const map: Record<string, string> = {
      '00': 'Normal',
      '01': 'Retrait GAB / Cash',
      '02': 'Non assiste',
      '08': 'Mail / Telephone order',
      '59': 'E-commerce',
      '71': 'Fallback (puce vers bande)',
    };
    return map[pc] ? `${pc} - ${map[pc]}` : (pc || null);
  }

  get hasChipData(): boolean {
    return !!(this.tx?.chipTvr || this.tx?.chipApplicationCryptogram
           || (typeof this.tx?.deviceFingerprint === 'string' && this.tx.deviceFingerprint.length >= 10));
  }

  get chipTvrRaw(): string {
    const tvr = this.tx?.chipTvr;
    if (tvr && tvr.length >= 10) return tvr;
    const df = this.tx?.deviceFingerprint;
    if (typeof df === 'string' && df.length === 10) return df;
    return '';
  }

  get activeTvrBits(): TvrBit[] {
    const tvr = this.chipTvrRaw;
    if (!tvr || tvr.length < 10) return [];
    try {
      const b: number[] = [];
      for (let i = 0; i < 10; i += 2) b.push(parseInt(tvr.substring(i, i + 2), 16));

      const all: Array<{ label: string; set: boolean; severity: TvrBit['severity'] }> = [
        // Byte 1 -Offline data auth
        { label: 'Auth. offline non effectuée',  set: !!(b[0] & 0x80), severity: 'warn' },
        { label: 'SDA échouée',                  set: !!(b[0] & 0x40), severity: 'error' },
        { label: 'Données ICC manquantes',        set: !!(b[0] & 0x20), severity: 'error' },
        { label: 'Carte en liste d\'exception',   set: !!(b[0] & 0x10), severity: 'error' },
        { label: 'DDA échouée',                   set: !!(b[0] & 0x08), severity: 'error' },
        { label: 'CDA échouée',                   set: !!(b[0] & 0x04), severity: 'error' },
        // Byte 2 -Cardholder verification
        { label: 'CVM non supporté',              set: !!(b[1] & 0x80), severity: 'warn' },
        { label: 'CVM non reconnu',               set: !!(b[1] & 0x40), severity: 'warn' },
        { label: 'Limite PIN dépassée',           set: !!(b[1] & 0x20), severity: 'error' },
        { label: 'PIN requis -non saisi',        set: !!(b[1] & 0x10), severity: 'warn' },
        { label: 'PIN en ligne saisi',            set: !!(b[1] & 0x08), severity: 'info' },
        // Byte 3 -Terminal risk management
        { label: 'Montant > limite plancher',     set: !!(b[2] & 0x80), severity: 'warn' },
        { label: 'Limite offline min. dépassée',  set: !!(b[2] & 0x40), severity: 'warn' },
        { label: 'Limite offline max. dépassée',  set: !!(b[2] & 0x20), severity: 'error' },
        { label: 'TX sélectionné online (aléa)',  set: !!(b[2] & 0x10), severity: 'info' },
        { label: 'Online forcé par commerçant',   set: !!(b[2] & 0x08), severity: 'info' },
        // Byte 4 -Issuer auth / terminal action analysis
        { label: 'TDOL par défaut utilisé',       set: !!(b[3] & 0x80), severity: 'info' },
        { label: 'Auth. émetteur échouée',        set: !!(b[3] & 0x40), severity: 'error' },
        { label: 'Script échoué avant GENERATE AC', set: !!(b[3] & 0x20), severity: 'error' },
        { label: 'Script échoué après GENERATE AC', set: !!(b[3] & 0x10), severity: 'error' },
        // Byte 5 -Misc
        { label: 'Carte non authentifiée',        set: !!(b[4] & 0x80), severity: 'error' },
        { label: 'Versions application différentes', set: !!(b[4] & 0x40), severity: 'warn' },
        { label: 'Application expirée',           set: !!(b[4] & 0x20), severity: 'error' },
        { label: 'Application non encore effective', set: !!(b[4] & 0x10), severity: 'warn' },
        { label: 'Service non autorisé',          set: !!(b[4] & 0x08), severity: 'warn' },
        { label: 'Nouvelle carte',                set: !!(b[4] & 0x04), severity: 'info' },
      ];

      return all.filter(x => x.set).map(x => ({ label: x.label, severity: x.severity }));
    } catch {
      return [];
    }
  }

  get timelineSteps(): TimelineStep[] {
    return [
      {
        name: 'Transmission',
        time: this.formatDateTime(this.tx?.transmissionDateAndTime?.toString()),
        desc: 'Message ISO 8583 envoyé au switch PowerCARD',
        done: !!this.tx?.transmissionDateAndTime,
        fail: false,
        last: false,
      },
      {
        name: 'Capture',
        time: this.tx?.captureDate?.toString() || this.tx?.businessDate?.toString() || '',
        desc: 'Donnees de carte capturees par le terminal',
        done: !!(this.tx?.captureDate || this.tx?.businessDate),
        fail: false,
        last: false,
      },
      {
        name: 'Traitement Switch',
        time: this.tx?.routingCode ? `Route: ${this.tx.routingCode}` : '',
        desc: `Reseau: ${this.networkDisplay || 'N/A'}  |  Route: ${this.tx?.routingCode || 'N/A'}`,
        done: !!this.tx?.routingCode,
        fail: false,
        last: false,
      },
      {
        name: 'Autorisation Emetteur',
        time: this.tx?.authorizationId || '',
        desc: this.tx?.issuerActionCode
          ? `Code emetteur: ${this.tx.issuerActionCode}`
          : `Emetteur: ${(this.tx?.issuingBank || '').trim() || 'N/A'}`,
        done: !!this.tx?.authorizationId,
        fail: false,
        last: false,
      },
      {
        name: 'Réponse',
        time: this.formatDateTime(this.tx?.responseDateAndTime?.toString()),
        desc: (this.isApproved ? '✓ Approuvée' : this.isDeclined ? '✕ Refusée' : 'En attente')
            + (this.tx?.latencyMs ? ` -${this.tx.latencyMs}ms` : ''),
        done: !!this.tx?.responseDateAndTime,
        fail: this.isDeclined,
        last: false,
      },
      {
        name: 'Rapprochement',
        time: this.tx?.matchingDate?.toString() || '',
        desc: this.matchingLabel,
        done: this.tx?.matchingStatus === 'M',
        fail: this.tx?.matchingStatus === 'U',
        last: true,
      },
    ];
  }

  get matchingLabel(): string {
    switch (this.tx?.matchingStatus) {
      case 'M': return 'Transaction rapprochée avec succès';
      case 'U': return 'Transaction non rapprochée';
      default:  return 'Rapprochement en attente';
    }
  }

  // ── Formatters ──

  formatDateTime(dt: string | undefined | null): string {
    if (!dt) return '';
    try {
      const d = new Date(dt);
      if (isNaN(d.getTime())) return String(dt);
      return d.toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
    } catch { return String(dt); }
  }

  formatAmount(amount: number | null | undefined): string {
    if (amount == null) return '';
    const n = typeof amount === 'number' ? amount : parseFloat(String(amount));
    if (isNaN(n)) return '';
    return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  }
}
