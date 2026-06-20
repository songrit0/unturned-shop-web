import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  AdjustResult,
  AdminBmcClaim,
  AdminProviderRow,
  AdminTopupRow,
  AdminTopupStatus,
  AdminMeowcoinsService,
  AdminMeowcoinWallet,
  Paginated,
} from '../../services/admin-meowcoins.service';

type StatusFilter = 'all' | AdminTopupStatus;

@Component({
  selector: 'app-admin-meowcoins',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon rose"><span class="mi lg">account_balance_wallet</span></div>
        <h1>{{ 'adminMeowcoins.title' | translate }}</h1>
        <span class="badge rose"><span class="mi sm">shield</span>ADMIN</span>
      </div>

      <div class="welcome-alert" style="margin-bottom:16px">
        <span class="alert-icon mi">info</span>
        <div>{{ 'adminMeowcoins.info' | translate }}</div>
      </div>

      <!-- ===== Payment providers ===== -->
      <div class="card" style="margin-bottom:24px">
        <h3 style="margin:0 0 4px 0;font-size:16px;font-weight:700"><span class="mi sm">tune</span> {{ 'adminMeowcoins.providersTitle' | translate }}</h3>
        <p class="muted" style="font-size:12px;margin:0 0 12px 0">{{ 'adminMeowcoins.providersHint' | translate }}</p>

        <div *ngIf="providersLoading" style="text-align:center;padding:24px 0"><div class="spinner"></div></div>
        <p *ngIf="providersError" style="color:var(--rose);font-size:13px;margin:0">{{ providersError }}</p>

        <ng-container *ngIf="!providersLoading">
          <div *ngFor="let p of providers" class="row" style="align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-weight:600">{{ p.label }} <span class="mono muted" style="font-size:11px">({{ p.key }})</span></div>
              <div class="muted" style="font-size:12px">
                <span [style.color]="p.enabled ? 'var(--emerald)' : 'var(--text-faint)'">
                  {{ (p.enabled ? 'adminMeowcoins.provider.enabled' : 'adminMeowcoins.provider.disabled') | translate }}
                </span>
              </div>
            </div>
            <button class="btn sm" [class.danger]="p.enabled" [class.emerald]="!p.enabled"
                    [disabled]="providerSaving === p.key" (click)="toggleProvider(p)">
              <span class="mi sm">{{ p.enabled ? 'toggle_off' : 'toggle_on' }}</span>
              {{ (p.enabled ? 'adminMeowcoins.provider.disable' : 'adminMeowcoins.provider.enable') | translate }}
            </button>
          </div>
          <p *ngIf="providers.length === 0" class="muted" style="font-size:13px;margin:8px 0 0 0">{{ 'adminMeowcoins.provider.none' | translate }}</p>
        </ng-container>
      </div>

      <!-- ===== BuyMeACoffee manual claims ===== -->
      <div class="card" style="margin-bottom:24px">
        <div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <h3 style="margin:0 0 4px 0;font-size:16px;font-weight:700"><span class="mi sm">help</span> {{ 'adminMeowcoins.bmcClaims.title' | translate }}</h3>
          <select class="select" [(ngModel)]="bmcClaimFilter" (ngModelChange)="loadBmcClaims()">
            <option value="pending">{{ 'adminMeowcoins.bmcClaims.filter.pending' | translate }}</option>
            <option value="approved">{{ 'adminMeowcoins.bmcClaims.filter.approved' | translate }}</option>
            <option value="rejected">{{ 'adminMeowcoins.bmcClaims.filter.rejected' | translate }}</option>
            <option value="">{{ 'adminMeowcoins.bmcClaims.filter.all' | translate }}</option>
          </select>
        </div>
        <p class="muted" style="font-size:12px;margin:4px 0 12px 0">{{ 'adminMeowcoins.bmcClaims.hint' | translate }}</p>

        <div *ngIf="bmcClaimsLoading" style="text-align:center;padding:24px 0"><div class="spinner"></div></div>

        <div *ngIf="!bmcClaimsLoading" style="display:grid;gap:12px">
          <div *ngFor="let c of bmcClaims" class="card flush" style="padding:12px;display:grid;grid-template-columns:120px 1fr auto;gap:12px;align-items:start">
            <button type="button" style="border:0;background:none;padding:0;cursor:pointer" (click)="previewImage = c.screenshot">
              <img [src]="c.screenshot" style="width:120px;height:80px;object-fit:cover;border-radius:6px;border:1px solid var(--border)">
            </button>
            <div>
              <div style="font-weight:600">{{ c.discord_name || '—' }} <span class="mono muted" style="font-size:11px">{{ c.steam_id }}</span></div>
              <div class="muted" style="font-size:12px">{{ c.created_at | date:'short' }}{{ c.note ? ' — ' + c.note : '' }}</div>
              <div *ngIf="c.status !== 'pending'" class="muted" style="font-size:12px;margin-top:4px">
                {{ ('adminMeowcoins.bmcClaims.status.' + c.status) | translate }}
                <ng-container *ngIf="c.credited_meowcoins">— {{ c.credited_meowcoins | number }} {{ 'adminMeowcoins.meowcoins' | translate }}</ng-container>
              </div>
            </div>
            <div *ngIf="c.status === 'pending'" style="display:flex;flex-direction:column;gap:6px;min-width:160px">
              <input type="number" class="input mono" [(ngModel)]="bmcCreditInputs[c.id]" placeholder="Meowcoins" style="width:140px">
              <button class="btn primary sm" [disabled]="bmcResolving === c.id || !bmcCreditInputs[c.id]" (click)="approveBmcClaim(c)">
                <span class="mi sm">check</span> {{ 'adminMeowcoins.bmcClaims.approve' | translate }}
              </button>
              <button class="btn danger sm" [disabled]="bmcResolving === c.id" (click)="rejectBmcClaim(c)">
                <span class="mi sm">close</span> {{ 'adminMeowcoins.bmcClaims.reject' | translate }}
              </button>
            </div>
          </div>
          <p *ngIf="bmcClaims.length === 0" class="muted" style="font-size:13px;margin:8px 0 0 0">{{ 'adminMeowcoins.bmcClaims.none' | translate }}</p>
        </div>
      </div>

      <!-- Screenshot preview overlay (data: URLs are too long for a browser tab — show inline instead). -->
      <div *ngIf="previewImage" class="img-overlay" (click)="previewImage = null">
        <img [src]="previewImage" (click)="$event.stopPropagation()">
      </div>

      <!-- ===== A. Top-ups ===== -->
      <div class="card flush" style="margin-bottom:24px">
        <div class="row" style="justify-content:space-between;align-items:center;padding:12px 16px;gap:12px;flex-wrap:wrap">
          <h3 style="margin:0;font-size:16px;font-weight:700"><span class="mi sm">receipt_long</span> {{ 'adminMeowcoins.topupsTitle' | translate }}</h3>
          <div class="row gap-2" style="align-items:center;flex-wrap:wrap">
            <select class="select" [(ngModel)]="status" (ngModelChange)="onFilter()">
              <option *ngFor="let s of statuses" [ngValue]="s">{{ ('adminMeowcoins.statusFilter.' + s) | translate }}</option>
            </select>
            <div class="input-wrap" style="width:260px">
              <span class="mi lead">search</span>
              <input class="input" [(ngModel)]="q" (ngModelChange)="onSearch()" [placeholder]="'adminMeowcoins.searchTopups' | translate">
            </div>
          </div>
        </div>

        <ng-container *ngIf="!loading; else loadingTpl">
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th style="width:150px">{{ 'adminMeowcoins.col.date' | translate }}</th>
                  <th>{{ 'adminMeowcoins.col.player' | translate }}</th>
                  <th class="r">{{ 'adminMeowcoins.col.baht' | translate }}</th>
                  <th class="r">{{ 'adminMeowcoins.col.meowcoins' | translate }}</th>
                  <th>{{ 'adminMeowcoins.col.status' | translate }}</th>
                  <th>{{ 'adminMeowcoins.col.ref' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let t of page?.items">
                  <td class="mono muted" style="font-size:12px">{{ t.created_at | date:'short' }}</td>
                  <td>
                    <button class="link-player" (click)="pickPlayer(t.steam_id)" [title]="'adminMeowcoins.loadWallet' | translate">
                      <span style="font-weight:600">{{ t.discord_name || '—' }}</span>
                      <span class="mono muted" style="font-size:11px;display:block">{{ t.steam_id }}</span>
                    </button>
                  </td>
                  <td class="r mono">{{ num(t.baht) | number:'1.0-2' }}</td>
                  <td class="r mono" style="color:var(--meowcoin)">{{ num(t.meowcoins) | number }}</td>
                  <td><span class="badge" [ngClass]="statusClass(t.status)">{{ ('adminMeowcoins.status.' + t.status) | translate }}</span></td>
                  <td class="mono muted" style="font-size:11px">{{ t.ref }}</td>
                </tr>
                <tr *ngIf="page && page.items.length === 0">
                  <td colspan="6">
                    <div class="empty"><span class="mi xxl">receipt_long</span><div class="empty-title">{{ 'adminMeowcoins.noTopups' | translate }}</div></div>
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
        <h3 style="margin:0 0 12px 0;font-size:16px;font-weight:700"><span class="mi sm">manage_accounts</span> {{ 'adminMeowcoins.walletTitle' | translate }}</h3>
        <div class="row gap-2" style="align-items:center;flex-wrap:wrap">
          <div class="input-wrap" style="flex:1;max-width:360px">
            <span class="mi lead">person_search</span>
            <input class="input mono" [(ngModel)]="steamId" (keydown.enter)="loadWallet()" [placeholder]="'adminMeowcoins.steamIdPlaceholder' | translate">
          </div>
          <button (click)="loadWallet()" [disabled]="!steamId.trim() || walletLoading" class="btn primary">
            <span class="mi sm">search</span> {{ 'adminMeowcoins.lookup' | translate }}
          </button>
        </div>

        <p *ngIf="walletError" style="color:var(--rose);font-size:13px;margin:12px 0 0 0">{{ walletError }}</p>

        <div *ngIf="walletLoading" style="text-align:center;padding:32px 0"><div class="spinner"></div></div>

        <ng-container *ngIf="wallet && !walletLoading">
          <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-top:16px;padding:16px;background:var(--surface-2);border-radius:8px">
            <div style="flex:1;min-width:200px">
              <div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em">{{ 'adminMeowcoins.player' | translate }}</div>
              <div style="font-weight:600">{{ wallet.discord_name || '—' }}</div>
              <div class="mono muted" style="font-size:12px">{{ wallet.steam_id }}</div>
            </div>
            <div style="text-align:right">
              <div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em">{{ 'adminMeowcoins.currentBalance' | translate }}</div>
              <div class="mono" style="font-size:26px;font-weight:700" [style.color]="num(wallet.balance) < 0 ? 'var(--rose)' : 'var(--meowcoin)'">
                {{ num(wallet.balance) | number }} <span class="muted" style="font-size:13px">{{ 'adminMeowcoins.meowcoins' | translate }}</span>
              </div>
            </div>
          </div>

          <!-- Adjust + Set controls -->
          <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:16px">
            <div class="card flush" style="padding:14px">
              <div style="font-weight:700;font-size:14px;display:flex;align-items:center;gap:6px"><span class="mi sm">exposure</span> {{ 'adminMeowcoins.adjust' | translate }}</div>
              <p class="muted" style="font-size:12px;margin:4px 0 10px 0">{{ 'adminMeowcoins.adjustHint' | translate }}</p>
              <label style="display:block;margin-bottom:8px">
                <span class="muted" style="font-size:12px">{{ 'adminMeowcoins.delta' | translate }}</span>
                <input type="number" class="input mono" [(ngModel)]="delta" step="1" style="margin-top:4px" placeholder="-100 / +100">
              </label>
              <label style="display:block;margin-bottom:10px">
                <span class="muted" style="font-size:12px">{{ 'adminMeowcoins.reason' | translate }}</span>
                <input type="text" class="input" [(ngModel)]="adjustReason" maxlength="120" [placeholder]="'adminMeowcoins.reasonPlaceholder' | translate" style="margin-top:4px">
              </label>
              <div class="row" style="align-items:center;gap:8px">
                <span class="muted" style="font-size:12px">{{ 'adminMeowcoins.preview' | translate }}:</span>
                <span class="mono" [style.color]="previewAdjust() < 0 ? 'var(--rose)' : null">{{ previewAdjust() | number }}</span>
              </div>
              <button (click)="doAdjust()" [disabled]="saving || !delta" class="btn primary" style="width:100%;margin-top:10px">
                <span class="mi sm">check</span> {{ (saving ? 'adminMeowcoins.saving' : 'adminMeowcoins.applyAdjust') | translate }}
              </button>
            </div>

            <div class="card flush" style="padding:14px">
              <div style="font-weight:700;font-size:14px;display:flex;align-items:center;gap:6px"><span class="mi sm">edit</span> {{ 'adminMeowcoins.setBalance' | translate }}</div>
              <p class="muted" style="font-size:12px;margin:4px 0 10px 0">{{ 'adminMeowcoins.setHint' | translate }}</p>
              <label style="display:block;margin-bottom:8px">
                <span class="muted" style="font-size:12px">{{ 'adminMeowcoins.newBalance' | translate }}</span>
                <input type="number" class="input mono" [(ngModel)]="newBalance" step="1" style="margin-top:4px" placeholder="0">
              </label>
              <label style="display:block;margin-bottom:10px">
                <span class="muted" style="font-size:12px">{{ 'adminMeowcoins.reason' | translate }}</span>
                <input type="text" class="input" [(ngModel)]="setReason" maxlength="120" [placeholder]="'adminMeowcoins.reasonPlaceholder' | translate" style="margin-top:4px">
              </label>
              <div class="muted" style="font-size:11px;display:flex;align-items:center;gap:4px;min-height:18px">
                <span *ngIf="newBalance !== null && num2(newBalance) < 0" class="mi sm" style="color:var(--rose)">warning</span>
                <span *ngIf="newBalance !== null && num2(newBalance) < 0" style="color:var(--rose)">{{ 'adminMeowcoins.negativeNote' | translate }}</span>
              </div>
              <button (click)="doSet()" [disabled]="saving || newBalance === null" class="btn danger" style="width:100%;margin-top:10px">
                <span class="mi sm">check</span> {{ (saving ? 'adminMeowcoins.saving' : 'adminMeowcoins.applySet') | translate }}
              </button>
            </div>
          </div>

          <!-- Log -->
          <div style="margin-top:20px">
            <div style="font-weight:700;font-size:14px;display:flex;align-items:center;gap:6px;margin-bottom:8px"><span class="mi sm">history</span> {{ 'adminMeowcoins.logTitle' | translate }}</div>
            <div class="table-wrap" style="max-height:340px;overflow-y:auto">
              <table class="tbl">
                <thead>
                  <tr>
                    <th style="width:150px">{{ 'adminMeowcoins.col.date' | translate }}</th>
                    <th class="r">{{ 'adminMeowcoins.col.delta' | translate }}</th>
                    <th>{{ 'adminMeowcoins.col.reason' | translate }}</th>
                    <th>{{ 'adminMeowcoins.col.actor' | translate }}</th>
                    <th>{{ 'adminMeowcoins.col.ref' | translate }}</th>
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
                    <td colspan="5"><div class="empty" style="padding:24px 0"><span class="mi xl">history</span><div class="empty-title">{{ 'adminMeowcoins.noLog' | translate }}</div></div></td>
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
    .img-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:1000; cursor:zoom-out; }
    .img-overlay img { max-width:90vw; max-height:90vh; border-radius:8px; }
  `],
})
export class AdminMeowcoinsComponent implements OnInit {
  // ---- Payment providers ----
  providers: AdminProviderRow[] = [];
  providersLoading = true;
  providersError: string | null = null;
  providerSaving: string | null = null;

  // ---- A. Top-ups ----
  loading = true;
  page: Paginated<AdminTopupRow> | null = null;
  status: StatusFilter = 'all';
  statuses: StatusFilter[] = ['all', 'pending', 'confirmed', 'credited', 'expired', 'cancelled', 'failed'];
  q = '';
  private qDebounce: any;

  // ---- B. Wallet ----
  steamId = '';
  wallet: AdminMeowcoinWallet | null = null;
  walletLoading = false;
  walletError: string | null = null;

  delta: number | null = null;
  adjustReason = '';
  newBalance: number | null = null;
  setReason = '';
  saving = false;

  // ---- BuyMeACoffee manual claims ----
  bmcClaims: AdminBmcClaim[] = [];
  bmcClaimsLoading = true;
  bmcClaimFilter: 'pending' | 'approved' | 'rejected' | '' = 'pending';
  bmcCreditInputs: Record<number, number | null> = {};
  bmcResolving: number | null = null;
  previewImage: string | null = null;

  constructor(private svc: AdminMeowcoinsService, private t: TranslateService) {}

  ngOnInit() { this.load(1, 20); this.loadProviders(); this.loadBmcClaims(); }

  /** Coerce string/number DECIMAL/BIGINT fields to a number for display/math. */
  num(v: string | number | null | undefined): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  num2(v: number | null): number { return this.num(v); }

  // ---- Payment providers ----
  loadProviders() {
    this.providersLoading = true;
    this.providersError = null;
    this.svc.listProviders().subscribe({
      next: list => { this.providers = list; this.providersLoading = false; },
      error: e => { this.providersLoading = false; this.providersError = e?.error?.message || this.t.instant('adminMeowcoins.errors.providersFail'); },
    });
  }

  toggleProvider(p: AdminProviderRow) {
    this.providerSaving = p.key;
    this.svc.setProvider(p.key, !p.enabled).subscribe({
      next: () => { this.providerSaving = null; this.loadProviders(); },
      error: e => { this.providerSaving = null; this.providersError = e?.error?.message || this.t.instant('adminMeowcoins.errors.providersFail'); },
    });
  }

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
      error: e => { this.walletLoading = false; this.wallet = null; this.walletError = e?.error?.message || this.t.instant('adminMeowcoins.errors.lookupFail'); },
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
      error: e => { this.saving = false; this.walletError = e?.error?.message || this.t.instant('adminMeowcoins.errors.saveFail'); },
    });
  }

  doSet() {
    if (!this.wallet || this.newBalance === null) return;
    const b = Number(this.newBalance);
    if (!Number.isFinite(b)) return;
    this.saving = true;
    this.svc.set(this.wallet.steam_id, b, this.setReason.trim() || undefined).subscribe({
      next: (r: AdjustResult) => { this.saving = false; this.afterMutation(r); },
      error: e => { this.saving = false; this.walletError = e?.error?.message || this.t.instant('adminMeowcoins.errors.saveFail'); },
    });
  }

  /** After adjust/set, reflect the new balance and reload the wallet (refreshes the log). */
  private afterMutation(r: AdjustResult) {
    if (this.wallet) this.wallet.balance = r.balance;
    this.walletError = null;
    this.loadWallet();
  }

  // ---- BuyMeACoffee manual claims ----
  loadBmcClaims() {
    this.bmcClaimsLoading = true;
    this.svc.listBmcClaims(this.bmcClaimFilter).subscribe({
      next: list => { this.bmcClaims = list; this.bmcClaimsLoading = false; },
      error: () => { this.bmcClaimsLoading = false; },
    });
  }

  approveBmcClaim(c: AdminBmcClaim) {
    const credit = Number(this.bmcCreditInputs[c.id]);
    if (!Number.isFinite(credit) || credit <= 0) return;
    this.bmcResolving = c.id;
    this.svc.approveBmcClaim(c.id, credit).subscribe({
      next: () => { this.bmcResolving = null; delete this.bmcCreditInputs[c.id]; this.loadBmcClaims(); },
      error: () => { this.bmcResolving = null; },
    });
  }

  rejectBmcClaim(c: AdminBmcClaim) {
    this.bmcResolving = c.id;
    this.svc.rejectBmcClaim(c.id).subscribe({
      next: () => { this.bmcResolving = null; this.loadBmcClaims(); },
      error: () => { this.bmcResolving = null; },
    });
  }
}
