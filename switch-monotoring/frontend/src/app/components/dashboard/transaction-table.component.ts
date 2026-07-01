import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Transaction } from '../../models';
import { responseCodes, mtiCodes } from '../../data/iso8583';

@Component({
  selector: 'app-transaction-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tx-table-container">
      <div class="tx-table-header">
        <div class="tx-table-title-row">
          <h3 class="tx-table-title">Transactions Récentes</h3>
          <span class="tx-table-badge">AUTHO_ACTIVITY_ADM</span>
        </div>
        <div class="tx-table-header-right">
          <span class="tx-table-count">{{ pageStart }}-{{ pageEnd }} / {{ transactions.length }}</span>
          <div class="page-controls">
            <button class="page-btn" [disabled]="currentPage === 0" (click)="prevPage()">‹</button>
            <span class="page-info">{{ currentPage + 1 }}/{{ totalPages }}</span>
            <button class="page-btn" [disabled]="currentPage >= totalPages - 1" (click)="nextPage()">›</button>
          </div>
        </div>
      </div>
      <div class="tx-table-scroll">
        <table class="tx-table">
          <thead>
            <tr>
              <th *ngFor="let h of headers">
                <div class="th-main">{{h.label}}</div>
                <div class="th-sub">{{h.field}}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let tx of displayTransactions" class="tx-row tx-row-clickable" (click)="onRowClick(tx)">
              <!-- HEURE -->
              <td class="td-mono td-muted">
                {{formatDate(tx.timestamp)}}
              </td>
              <!-- STAN -->
              <td class="td-mono td-bold">{{tx.stan || tx.internalStan || ' - '}}</td>
              <!-- CANAL -->
              <td>
                <span [ngClass]="getChannelBadgeClass(tx.channel)">
                  {{tx.channel || ' - '}}
                </span>
              </td>
              <!-- RÉSEAU -->
              <td class="td-mono td-accent">
                {{getNetworkDisplay(tx)}}
              </td>
              <!-- MTI -->
              <td>
                <span class="mti-code">{{tx.mtiCode || tx.messageType || ' - '}}</span>
                <span class="mti-label">{{getMtiLabel(tx.mtiCode || tx.messageType || '')}}</span>
              </td>
              <!-- PAN -->
              <td class="td-mono td-pan">
                {{maskPan(tx.cardNumber || tx.cardNumberMasked || '')}}
              </td>
              <!-- MONTANT -->
              <td class="td-mono td-bold td-amount">
                {{formatAmount(tx.amount || tx.transactionAmount)}} {{tx.currency || tx.transactionCurrency || 'MAD'}}
              </td>
              <!-- COMMERÇANT -->
              <td class="td-merchant">{{tx.merchantName || tx.cardAccNameAddress || ' - '}}</td>
              <!-- CODE RÉP -->
              <td class="td-mono td-center">
                <span class="rc-code">{{tx.responseCode || tx.actionCode || ' - '}}</span>
              </td>
              <!-- STATUT -->
              <td>
                <span [ngClass]="getBadgeClasses(tx.responseCode || tx.actionCode || '')">
                  {{getRcLabel(tx.responseCode || tx.actionCode || '')}}
                </span>
              </td>
              <!-- LATENCE -->
              <td [ngClass]="['td-mono td-latency', getLatencyClass(tx.latencyMs)]">
                {{tx.latencyMs ? tx.latencyMs + 'ms' : ' - '}}
              </td>
            </tr>
            <tr *ngIf="transactions.length === 0">
              <td colspan="11" class="td-empty">En attente de transactions...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .tx-table-container {
      border-radius: 12px;
      border: 1px solid var(--border, rgba(255,255,255,0.08));
      background: var(--card, #1a1d23);
      overflow: hidden;
    }

    .tx-table-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border, rgba(255,255,255,0.08));
    }

    .tx-table-title-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .tx-table-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--card-foreground, #e4e4e7);
      margin: 0;
      letter-spacing: -0.01em;
    }

    .tx-table-badge {
      font-size: 10px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-weight: 600;
      color: #a78bfa;
      background: rgba(167, 139, 250, 0.12);
      border: 1px solid rgba(167, 139, 250, 0.25);
      padding: 2px 8px;
      border-radius: 6px;
      letter-spacing: 0.02em;
    }

    .tx-table-header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .tx-table-count {
      font-size: 12px;
      color: var(--muted-foreground, #71717a);
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }

    .page-controls {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .page-btn {
      width: 26px;
      height: 26px;
      border: 1px solid rgba(0,0,0,0.12);
      border-radius: 6px;
      background: transparent;
      color: #64748b;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      line-height: 1;
    }

    .page-btn:hover:not([disabled]) {
      background: rgba(0,0,0,0.05);
      color: #1e293b;
    }

    .page-btn[disabled] {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .page-info {
      font-size: 11px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      color: #71717a;
      min-width: 36px;
      text-align: center;
    }

    .tx-table-scroll {
      overflow-x: auto;
    }

    .tx-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .tx-table thead tr {
      border-bottom: 1px solid var(--border, rgba(255,255,255,0.08));
      background: var(--muted, rgba(255,255,255,0.03));
    }

    .tx-table th {
      padding: 10px 14px;
      text-align: left;
      vertical-align: bottom;
    }

    .th-main {
      font-size: 11px;
      font-weight: 700;
      color: var(--card-foreground, #e4e4e7);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      white-space: nowrap;
    }

    .th-sub {
      font-size: 9px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      color: var(--muted-foreground, #52525b);
      margin-top: 2px;
      font-weight: 400;
      letter-spacing: 0.01em;
    }

    .tx-row {
      border-bottom: 1px solid var(--border, rgba(255,255,255,0.05));
      transition: background-color 0.15s ease;
    }

    .tx-row:hover {
      background: rgba(0,0,0,0.02);
    }

    .tx-row-clickable {
      cursor: pointer;
    }

    .tx-row-clickable:hover {
      background: rgba(96, 165, 250, 0.06) !important;
    }

    .tx-table td {
      padding: 10px 14px;
      white-space: nowrap;
      vertical-align: middle;
    }

    /* Cell modifiers */
    .td-mono {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }

    .td-muted {
      color: var(--muted-foreground, #71717a);
    }

    .td-bold {
      font-weight: 600;
      color: var(--card-foreground, #e4e4e7);
    }

    .td-accent {
      color: var(--accent, #60a5fa);
    }

    .td-center {
      text-align: center;
    }

    .td-pan {
      color: var(--muted-foreground, #a1a1aa);
      letter-spacing: 0.04em;
      font-size: 11px;
    }

    .td-amount {
      color: var(--card-foreground, #e4e4e7);
      letter-spacing: 0.02em;
    }

    .td-merchant {
      color: var(--secondary-foreground, #a1a1aa);
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .td-empty {
      text-align: center;
      padding: 32px !important;
      color: var(--muted-foreground, #71717a);
    }

    /* Channel badges */
    .channel-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .channel-pos {
      background: rgba(34, 197, 94, 0.15);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    .channel-atm {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .channel-ecom {
      background: rgba(168, 85, 247, 0.15);
      color: #c084fc;
      border: 1px solid rgba(168, 85, 247, 0.3);
    }

    .channel-default {
      background: rgba(161, 161, 170, 0.1);
      color: #a1a1aa;
      border: 1px solid rgba(161, 161, 170, 0.2);
    }

    /* MTI */
    .mti-code {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-weight: 700;
      color: #22d3ee;
      margin-right: 6px;
    }

    .mti-label {
      font-size: 11px;
      color: var(--muted-foreground, #71717a);
    }

    /* Response code */
    .rc-code {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-weight: 600;
      color: var(--card-foreground, #e4e4e7);
    }

    /* Status badges */
    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .status-success {
      background: rgba(34, 197, 94, 0.15);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    .status-warning {
      background: rgba(234, 179, 8, 0.15);
      color: #facc15;
      border: 1px solid rgba(234, 179, 8, 0.3);
    }

    .status-error {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    /* Latency colors */
    .td-latency {
      font-weight: 600;
    }

    .latency-good {
      color: #4ade80 !important;
    }

    .latency-warn {
      color: #facc15 !important;
    }

    .latency-bad {
      color: #f87171 !important;
    }
  `]
})
export class TransactionTableComponent {
  @Input() transactions: Transaction[] = [];
  @Output() txSelected = new EventEmitter<Transaction>();

  currentPage = 0;
  readonly pageSize = 20;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.transactions.length / this.pageSize));
  }

  get pageStart(): number {
    return this.transactions.length === 0 ? 0 : this.currentPage * this.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min((this.currentPage + 1) * this.pageSize, this.transactions.length);
  }

  prevPage(): void {
    if (this.currentPage > 0) this.currentPage--;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) this.currentPage++;
  }

  onRowClick(tx: Transaction): void {
    this.txSelected.emit(tx);
  }

  readonly headers = [
    { label: 'Heure',      field: 'transaction_date_and_time' },
    { label: 'STAN',       field: 'internal_stan' },
    { label: 'Canal',      field: 'channel' },
    { label: 'Réseau',     field: 'network_id' },
    { label: 'MTI',        field: 'message_type' },
    { label: 'PAN',        field: 'card_number' },
    { label: 'Montant',    field: 'transaction_amount' },
    { label: 'Commerçant', field: 'card_acx_name_address' },
    { label: 'Code Rép',   field: 'action_code' },
    { label: 'Statut',     field: 'matching_status' },
    { label: 'Latence',    field: 'internal_transaction_time' },
  ];

  get displayTransactions(): Transaction[] {
    const start = this.currentPage * this.pageSize;
    return this.transactions.slice(start, start + this.pageSize);
  }

  formatDate(dateStr: string | Date | undefined): string {
    if (!dateStr) return ' - ';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleTimeString('fr-FR');
  }

  getMtiLabel(mti: string): string {
    return mtiCodes[mti] || '';
  }

  getRcLabel(rc: string): string {
    return responseCodes[rc]?.label || 'Inconnu';
  }

  maskPan(pan: string): string {
    if (!pan) return ' - ';
    // Already masked
    if (pan.includes('*')) return pan;
    // Mask all but last 4 digits
    const cleaned = pan.replace(/\s/g, '');
    if (cleaned.length < 4) return pan;
    const last4 = cleaned.slice(-4);
    return `**** **** **** ${last4}`;
  }

  formatAmount(amount: number | undefined): string {
    if (amount === undefined || amount === null) return ' - ';
    return amount.toLocaleString('fr-FR');
  }

  getNetworkDisplay(tx: Transaction): string {
    const network = tx.networkId || tx.networkCode || '';
    if (!network) return ' - ';
    // Show abbreviated with ellipsis if it's a known network
    const upper = network.toUpperCase();
    if (upper.includes('VISA')) return 'VISA ...';
    if (upper.includes('MC') || upper.includes('MASTERCARD')) return 'MC ...';
    if (upper.includes('CMI')) return 'CMI ...';
    return network;
  }

  getChannelBadgeClass(channel: string | undefined): string {
    const base = 'channel-badge';
    if (!channel) return `${base} channel-default`;
    const ch = channel.toUpperCase();
    if (ch === 'POS' || ch.includes('POS')) return `${base} channel-pos`;
    if (ch === 'ATM' || ch.includes('ATM')) return `${base} channel-atm`;
    if (ch === 'ECOM' || ch.includes('ECOM') || ch.includes('E-COMMERCE') || ch === 'WEB') return `${base} channel-ecom`;
    return `${base} channel-default`;
  }

  getBadgeClasses(rc: string): string {
    const severity = responseCodes[rc]?.severity || 'error';
    const base = 'status-badge';

    if (severity === 'success') return `${base} status-success`;
    if (severity === 'warning') return `${base} status-warning`;
    return `${base} status-error`;
  }

  getLatencyClass(latency?: number): string {
    if (!latency) return 'td-muted';
    if (latency > 2000) return 'latency-bad';
    if (latency > 500) return 'latency-warn';
    return 'latency-good';
  }
}
