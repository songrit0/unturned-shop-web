import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  AdjustResult,
  AdminTopupRow,
  AdminTopupStatus,
  AdminVcoinsService,
  AdminVcoinWallet,
  Paginated,
} from '../../services/admin-vcoins.service';

type StatusFilter = 'all' | AdminTopupStatus;

@Component({
  selector: 'app-admin-vcoins',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon rose"><span class="mi lg">account_balance_wallet</span></div>
        <h1>{{ 'adminVcoins.title' | translate }}</h1>
        <span class="badge rose"><span class="mi sm">shield</span>ADMIN</span>
      </div>

      <div class="welcome-alert" style="margin-bottom:16px">
        <span class="alert-icon mi">info</span>
        <div>{{ 'adminVcoins.info' | translate }}</div>
      </div>

      <!-- ===== A. Top-ups ===== -->
      <div class="card flush" style="margin-bottom:24px">
        <div class="row" style="justify-content:space-between;align-items:center;padding:12px 16px;gap:12px;flex-wrap:wrap">
          <h3 style="margin:0;font-size:16px;font-weight:700"><span class="mi sm">receipt_long</span> {{ 'adminVcoins.topupsTitle' | translate }}</h3>
          <div class="row gap-2" style="align-items:center;flex-wrap:wrap">
            <select class="select" [(ngModel)]="status" (ngModelChange)="onFilter()">
              <option *ngFor="let s of statuses" [ngValue]="s">{{ ('adminVcoins.statusFilter.' + s) | translate }}</option>
            </select>
            <div class="input-wrap" style="width:260px">
              <span class="mi lead">search</span>
              <input class="input" [(ngModel)]="q" (ngModelChange)="onSearch()" [placeholder]="'adminVcoins.searchTopups' | translate">
            </div>
          </div>
        </div>

        <ng-container *ngIf="!loading; else loadingTpl">
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th style="width:150px">{{ 'adminVcoins.col.date' | translate }}</th>
                  <th>{{ 'adminVcoins.col.player' | translate }}</th>
                  <th class="r">{{ 'adminVcoins.col.baht' | translate }}</th>
                  <th class="r">{{ 'adminVcoins.col.vcoins' | translate }}</th>
                  <th>{{ 'adminVcoins.col.status' | translate }}</th>
                  <th>{{ 'adminVcoins.col.ref' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let t of page?.items">
                  <td class="mono muted" style="font-size:12px">{{ t.created_at | date:'short' }}</td>
                  <td>
                    <button class="link-player" (click)="pickPlayer(t.steam_id)" [title]="'adminVcoins.loadWallet' | translate">
                      <span style="font-weight:600">{{ t.discord_name || '—' }}</span>
                      <span class="mono muted" style="font-size:11px;display:block">{{ t.steam_id }}</span>
                    </button>
                  </td>
                  <td class="r mono">{{ num(t.baht) | number:'1.0-2' }}</td>
                  <td class="r mono" style="color:var(--vcoin)">{{ num(t.vcoins) | number }}</td>
                  <td><span class="badge" [ngClass]="statusClass(t.status)">{{ ('adminVcoins.status.' + t.status) | translate }}</span></td>
                  <td class="mono muted" style="font-size:11px">{{ t.ref }}</td>
                </tr>
                <tr *ngIf="page && page.items.length === 0">
                  <td colspan="6">
                    <div class="empty"><span class="mi xxl">receipt_long</span><div class="empty-title">{{ 'adminVcoins.noTopups' | translate }}</div></div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <app-pager *ngIf="page"
            [page]="page.page" [pages]="page.pages" [total]="page.total" [limit]="page.limit"
            (pageChange)="load($event, page.limit)" (limitChange)="load(1, $event)"></app-pager>
        </ng-container>
        <ng-template #loadingTpl>
          <div style="text-align:center;padding:48px 0"><div class="spinner"></div></div>
        </ng-template>
      </div>

      <!-- ===== B. Player wallet manager ===== -->
      <div class="card" style="margin-bottom:16px">
        <h3 style="margin:0 0 12px 0;font-size:16px;font-weight:700"><span class="mi sm">manage_accounts</span> {{ 'adminVcoins.walletTitle' | translate }}</h3>
        <div class="row gap-2" style="align-items:center;flex-wrap:wrap">
          <div class="input-wrap" style="flex:1;max-width:360px">
            <span class="mi lead">person_search</span>
            <input class="input mono" [(ngModel)]="steamId" (keydown.enter)="loadWallet()" [placeholder]="'adminVcoins.steamIdPlaceholder' | translate">
          </div>
          <button (click)="loadWallet()" [disabled]="!steamId.trim() || walletLoading" class="btn primary">
            <span class="mi sm">search</span> {{ 'adminVcoins.lookup' | translate }}
          </button>
        </div>

        <p *ngIf="walletError" style="color:var(--rose);font-size:13px;margin:12px 0 0 0">{{ walletError }}</p>

        <div *ngIf="walletLoading" style="text-align:center;padding:32px 0"><div class="spinner"></div></div>

        <ng-container *ngIf="wallet && !walletLoading">
          <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-top:16px;padding:16px;background:var(--surface-2);border-radius:8px">
            <div style="flex:1;min-width:200px">
              <div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em">{{ 'adminVcoins.player' | translate }}</div>
              <div style="font-weight:600">{{ wallet.discord_name || '—' }}</div>
              <div class="mono muted" style="font-size:12px">{{ wallet.steam_id }}</div>
            </div>
            <div style="text-align:right">
              <div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em">{{ 'adminVcoins.currentBalance' | translate }}</div>
              <div class="mono" style="font-size:26px;font-weight:700" [style.color]="num(wallet.balance) < 0 ? 'var(--rose)' : 'var(--vcoin)'">
                {{ num(wallet.balance) | number }} <span class="muted" style="font-size:13px">{{ 'adminVcoins.vcoins' | translate }}</span>
              </div>
            </div>
          </div>

          <!-- Adjust + Set controls -->
          <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:16px">
            <div class="card flush" style="padding:14px">
              <div style="font-weight:700;font-size:14px;display:flex;align-items:center;gap:6px"><span class="mi sm">exposure</span> {{ 'adminVcoins.adjust' | translate }}</div>
              <p class="muted" style="font-size:12px;margin:4px 0 10px 0">{{ 'adminVcoins.adjustHint' | translate }}</p>
              <label style="display:block;margin-bottom:8px">
                <span class="muted" style="font-size:12px">{{ 'adminVcoins.delta' | translate }}</span>
                <input type="number" class="input mono" [(ngModel)]="delta" step="1" style="margin-top:4px" placeholder="-100 / +100">
              </label>
              <label style="display:block;margin-bottom:10px">
                <span class="muted" style="font-size:12px">{{ 'adminVcoins.reason' | translate }}</span>
                <input type="text" class="input" [(ngModel)]="adjustReason" maxlength="120" [placeholder]="'adminVcoins.reasonPlaceholder' | translate" style="margin-top:4px">
              </label>
              <div class="row" style="align-items:center;gap:8px">
                <span class="muted" style="font-size:12px">{{ 'adminVcoins.preview' | translate }}:</span>
                <span class="mono" [style.color]="previewAdjust() < 0 ? 'var(--rose)' : null">{{ previewAdjust() | number }}</span>
              </div>
              <button (click)="doAdjust()" [disabled]="saving || !delta" class="btn primary" style="width:100%;margin-top:10px">
                <span class="mi sm">check</span> {{ (saving ? 'adminVcoins.saving' : 'adminVcoins.applyAdjust') | translate }}
              </button>
            </div>

            <div class="card flush" style="padding:14px">
              <div style="font-weight:700;font-size:14px;display:flex;align-items:center;gap:6px"><span class="mi sm">edit</span> {{ 'adminVcoins.setBalance' | translate }}</div>
              <p class="muted" style="font-size:12px;margin:4px 0 10px 0">{{ 'adminVcoins.setHint' | translate }}</p>
              <label style="display:block;margin-bottom:8px">
                <span class="muted" style="font-size:12px">{{ 'adminVcoins.newBalance' | translate }}</span>
                <input type="number" class="input mono" [(ngModel)]="newBalance" step="1" style="margin-top:4px" placeholder="0">
              </label>
              <label style="display:block;margin-bottom:10px">
                <span class="muted" style="font-size:12px">{{ 'adminVcoins.reason' | translate }}</span>
                <input type="text" class="input" [(ngModel)]="setReason" maxlength="120" [placeholder]="'adminVcoins.reasonPlaceholder' | translate" style="margin-top:4px">
              </label>
              <div class="muted" style="font-size:11px;display:flex;align-items:center;gap:4px;min-height:18px">
                <span *ngIf="newBalance !== null && num2(newBalance) < 0" class="mi sm" style="color:var(--rose)">warning</span>
                <span *ngIf="newBalance !== null && num2(newBalance) < 0" style="color:var(--rose)">{{ 'adminVcoins.negativeNote' | translate }}</span>
              </div>
              <button (click)="doSet()" [disabled]="saving || newBalance === null" class="btn danger" style="width:100%;margin-top:10px">
                <span class="mi sm">check</span> {{ (saving ? 'adminVcoins.saving' : 'adminVcoins.applySet') | translate }}
              </button>
            </div>
          </div>

          <!-- Log -->
          <div style="margin-top:20px">
            <div style="font-weight:700;font-size:14px;display:flex;align-items:center;gap:6px;margin-bottom:8px"><span class="mi sm">history</span> {{ 'adminVcoins.logTitle' | translate }}</div>
            <div class="table-wrap" style="max-height:340px;overflow-y:auto">
              <table class="tbl">
                <thead>
                  <tr>
                    <th style="width:150px">{{ 'adminVcoins.col.date' | translate }}</th>
                    <th class="r">{{ 'adminVcoins.col.delta' | translate }}</th>
                    <th>{{ 'adminVcoins.col.reason' | translate }}</th>
                    <th>{{ 'adminVcoins.col.actor' | translate }}</th>
                    <th>{{ 'adminVcoins.col.ref' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let l of wallet.log">
                    <td class="mono muted" style="font-size:12px">{{ l.at | date:'short' }}</td>
                    <td class="r mono" [style.color]="num(l.delta) > 0 ? 'var(--emerald)' : (num(l.delta) < 0 ? 'var(--rose)' : null)">
                      {{ num(l.delta) > 0 ? '+' : '' }}{{ num(l.delta) | number }}
                    </td>
                    <td class="muted" style="font-size:12px">{{ l.reason || '—' }}</td>
                    <td class="mono muted" style="font-size:11px">{{ l.actor || '—' }}</td>
                    <td class="mono muted" style="font-size:11px">{{ l.ref || '—' }}</td>
                  </tr>
                  <tr *ngIf="wallet.log.length === 0">
                    <td colspan="5"><div class="empty" style="padding:24px 0"><span class="mi xl">history</span><div class="empty-title">{{ 'adminVcoins.noLog' | translate }}</div></div></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .link-player { background:none; border:0; padding:0; text-align:left; cursor:pointer; color:var(--text); }
    .link-player:hover span:first-child { color:var(--accent-hi); text-decoration:underline; }
    .badge.st-credited { background:var(--emerald); color:#fff; }
    .badge.st-pending, .badge.st-confirmed { background:var(--amber); color:#1a1a1a; }
    .badge.st-failed, .badge.st-cancelled { background:var(--rose); color:#fff; }
    .badge.st-expired { background:var(--surface-3, var(--surface-2)); color:var(--muted); }
  `],
})
export class AdminVcoinsComponent implements OnInit {
  // ---- A. Top-ups ----
  loading = true;
  page: Paginated<AdminTopupRow> | null = null;
  status: StatusFilter = 'all';
  statuses: StatusFilter[] = ['all', 'pending', 'confirmed', 'credited', 'expired', 'cancelled', 'failed'];
  q = '';
  private qDebounce: any;

  // ---- B. Wallet ----
  steamId = '';
  wallet: AdminVcoinWallet | null = null;
  walletLoading = false;
  walletError: string | null = null;

  delta: number | null = null;
  adjustReason = '';
  newBalance: number | null = null;
  setReason = '';
  saving = false;

  constructor(private svc: AdminVcoinsService, private t: TranslateService) {}

  ngOnInit() { this.load(1, 20); }

  /** Coerce string/number DECIMAL/BIGINT fields to a number for display/math. */
  num(v: string | number | null | undefined): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  num2(v: number | null): number { return this.num(v); }

  // ---- A. Top-ups ----
  load(page: number, limit: number) {
    this.loading = true;
    this.svc.listTopups(page, limit, this.status, this.q).subscribe({
      next: p => { this.page = p; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  onFilter() { this.load(1, this.page?.limit || 20); }

  onSearch() {
    clearTimeout(this.qDebounce);
    this.qDebounce = setTimeout(() => this.load(1, this.page?.limit || 20), 300);
  }

  statusClass(s: AdminTopupStatus): string { return 'st-' + s; }

  /** Click a top-up row's player -> load their wallet in section B. */
  pickPlayer(steamId: string) {
    this.steamId = steamId;
    this.loadWallet();
    if (typeof window !== 'undefined') window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  // ---- B. Wallet ----
  loadWallet() {
    const sid = this.steamId.trim();
    if (!sid) return;
    this.walletLoading = true;
    this.walletError = null;
    this.svc.wallet(sid).subscribe({
      next: w => {
        this.wallet = w;
        this.walletLoading = false;
        this.delta = null; this.adjustReason = '';
        this.newBalance = this.num(w.balance); this.setReason = '';
      },
      error: e => { this.walletLoading = false; this.wallet = null; this.walletError = e?.error?.message || this.t.instant('adminVcoins.errors.lookupFail'); },
    });
  }

  previewAdjust(): number {
    if (!this.wallet) return 0;
    return this.num(this.wallet.balance) + this.num(this.delta);
  }

  doAdjust() {
    if (!this.wallet || !this.delta) return;
    const d = Number(this.delta);
    if (!Number.isFinite(d) || d === 0) return;
    this.saving = true;
    this.svc.adjust(this.wallet.steam_id, d, this.adjustReason.trim() || undefined).subscribe({
      next: (r: AdjustResult) => { this.saving = false; this.afterMutation(r); },
      error: e => { this.saving = false; this.walletError = e?.error?.message || this.t.instant('adminVcoins.errors.saveFail'); },
    });
  }

  doSet() {
    if (!this.wallet || this.newBalance === null) return;
    const b = Number(this.newBalance);
    if (!Number.isFinite(b)) return;
    this.saving = true;
    this.svc.set(this.wallet.steam_id, b, this.setReason.trim() || undefined).subscribe({
      next: (r: AdjustResult) => { this.saving = false; this.afterMutation(r); },
      error: e => { this.saving = false; this.walletError = e?.error?.message || this.t.instant('adminVcoins.errors.saveFail'); },
    });
  }

  /** After adjust/set, reflect the new balance and reload the wallet (refreshes the log). */
  private afterMutation(r: AdjustResult) {
    if (this.wallet) this.wallet.balance = r.balance;
    this.walletError = null;
    this.loadWallet();
  }
}
