import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AdjustResult, AdminCoinsService, CoinUserRow, CoinUsersPage, HistoryRow, Paginated } from '../../services/admin-coins.service';

const SOURCE_ICON: Record<string, string> = {
  shop: 'shopping_cart',
  p2p: 'swap_horiz',
  admin: 'shield',
  tax: 'percent',
  transfer: 'send',
};

@Component({
  selector: 'app-admin-coins',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon rose"><span class="mi lg">account_balance_wallet</span></div>
        <h1>{{ 'adminCoins.title' | translate }}</h1>
        <span class="badge rose"><span class="mi sm">shield</span>ADMIN</span>
        <!-- <div class="page-actions">
          <div class="input-wrap" style="width:280px">
            <span class="mi lead">search</span>
            <input type="search" class="input" [(ngModel)]="q" (ngModelChange)="onSearch()" [placeholder]="'adminCoins.search' | translate">
          </div>
        </div> -->
      </div>

      <div class="welcome-alert" style="margin-bottom:16px">
        <span class="alert-icon mi">info</span>
        <div>{{ 'adminCoins.info' | translate }}</div>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div class="card flush">
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>{{ 'adminCoins.col.steamId' | translate }}</th>
                  <th>{{ 'adminCoins.col.discordId' | translate }}</th>
                  <th>{{ 'adminCoins.col.linkedAt' | translate }}</th>
                  <th class="r">{{ 'adminCoins.col.balance' | translate }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let u of page?.items">
                  <td class="mono" style="font-size:12px">{{ u.steam_id }}</td>
                  <td class="mono muted" style="font-size:12px">{{ u.discord_id || '—' }}</td>
                  <td class="mono muted" style="font-size:12px">{{ u.linked_at ? (u.linked_at | date:'short') : '—' }}</td>
                  <td class="r mono" style="font-weight:700;color:var(--accent-hi)">{{ u.balance | number }}</td>
                  <td>
                    <div class="row gap-1" style="justify-content:flex-end">
                      <button (click)="openAdjust(u, 1)" class="btn emerald sm"><span class="mi sm">add</span> {{ 'adminCoins.grant' | translate }}</button>
                      <button (click)="openAdjust(u, -1)" class="btn danger sm"><span class="mi sm">remove</span> {{ 'adminCoins.take' | translate }}</button>
                      <button (click)="openHistory(u)" class="btn ghost sm"><span class="mi sm">history</span></button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="page && page.items.length === 0">
                  <td colspan="5">
                    <div class="empty">
                      <span class="mi xxl">person_off</span>
                      <div class="empty-title">{{ 'adminCoins.noUser' | translate }}</div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <app-pager *ngIf="page"
          [page]="page.page" [pages]="page.pages"
          [total]="page.total" [limit]="page.limit"
          (pageChange)="load($event, page.limit)"
          (limitChange)="load(1, $event)"></app-pager>
      </ng-container>

      <ng-template #loadingTpl>
        <div style="text-align:center;padding:48px 0"><div class="spinner"></div></div>
      </ng-template>

      <!-- Adjust modal -->
      <div *ngIf="adjusting" class="modal-backdrop">
        <div class="modal-card tactical" style="max-width:420px">
          <h3 style="display:flex;align-items:center;gap:8px;margin:0 0 8px 0;font-size:18px;font-weight:700">
            <span class="mi" [style.color]="sign>0 ? 'var(--emerald)' : 'var(--rose)'">
              {{ sign > 0 ? 'add_circle' : 'remove_circle' }}
            </span>
            {{ (sign > 0 ? 'adminCoins.grantTitle' : 'adminCoins.takeTitle') | translate }}
          </h3>
          <p class="mono muted" style="font-size:11px;margin:0 0 12px 0">{{ adjusting.steam_id }}</p>
          <div style="display:flex;flex-direction:column;align-items:center;padding:16px;background:var(--surface-2);border-radius:8px;margin-bottom:16px">
            <span class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em">{{ 'adminCoins.currentBalance' | translate }}</span>
            <div class="coin-amt lg" style="margin-top:4px"><img class="coin-img lg" src="assets/coins/coin.png" alt="">{{ adjusting.balance | number }}</div>
          </div>

          <div style="display:flex;flex-direction:column;gap:12px">
            <label style="display:block">
              <span class="muted" style="font-size:12px">{{ 'adminCoins.amount' | translate }}</span>
              <input type="number" class="input mono" [(ngModel)]="amount" min="1" style="margin-top:4px">
            </label>
            <label style="display:block">
              <span class="muted" style="font-size:12px">{{ 'adminCoins.reason' | translate }}</span>
              <input type="text" class="input" [(ngModel)]="reason" maxlength="80" [placeholder]="'adminCoins.reasonPlaceholder' | translate" style="margin-top:4px">
            </label>
          </div>

          <p *ngIf="error" style="color:var(--rose);font-size:13px;margin:12px 0 0 0">{{ error }}</p>
          <div class="row gap-2" style="margin-top:20px">
            <button (click)="adjusting = null" class="btn secondary" style="flex:1">{{ 'common.cancel' | translate }}</button>
            <button (click)="confirmAdjust()" [disabled]="saving" [class.emerald]="sign>0" [class.danger]="sign<0" class="btn" style="flex:1">
              {{ saving ? ('adminCoins.saving' | translate) : ((sign > 0 ? 'adminCoins.grant' : 'adminCoins.take') | translate) }}
            </button>
          </div>
        </div>
      </div>

      <!-- History modal -->
      <div *ngIf="showHistory" class="modal-backdrop">
        <div class="modal-card tactical" style="max-width:560px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <h3 style="display:flex;align-items:center;gap:8px;margin:0;font-size:16px;font-weight:700">
              <span class="mi">history</span> {{ 'adminCoins.history' | translate }}
            </h3>
            <button (click)="showHistory = null" class="btn ghost sm"><span class="mi sm">close</span></button>
          </div>
          <p class="mono muted" style="font-size:11px;margin:0 0 12px 0">{{ showHistory.steam_id }}</p>
          <div style="max-height:360px;overflow-y:auto">
            <p *ngIf="historyPage && historyPage.items.length === 0" class="muted" style="text-align:center;padding:32px 0">{{ 'adminCoins.noHistory' | translate }}</p>
            <div *ngIf="historyPage">
              <div *ngFor="let h of historyPage.items" class="activity-row">
                <div class="ico"
                     [class.rose]="h.direction === 'out'"
                     [class.emerald]="h.direction === 'in'">
                  <span class="mi sm">{{ iconFor(h.source) }}</span>
                </div>
                <div class="grow" style="min-width:0;">
                  <div class="a-name">{{ ('coins.history.label.' + h.label) | translate }}</div>
                  <div class="a-src" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                    <span class="badge">{{ ('coins.history.source.' + h.source) | translate }}</span>
                    <span *ngIf="h.item_name" class="faint" style="font-size:12px;">{{ h.item_name }}<span *ngIf="h.amount"> × {{ h.amount }}</span></span>
                    <span *ngIf="h.counterparty" class="faint mono" style="font-size:11px;">{{ h.counterparty }}</span>
                    <span class="faint mono" style="font-size:11px;">{{ h.at | date:'short' }}</span>
                  </div>
                </div>
                <span class="a-amount" [class.down]="h.coins < 0"
                      [style.color]="h.coins >= 0 ? 'var(--emerald)' : 'var(--rose)'">
                  {{ h.coins >= 0 ? '+' : '−' }}{{ absCoins(h.coins) | number }}
                  <img class="coin-img" src="assets/coins/coin.png" alt="">
                </span>
              </div>
            </div>
          </div>
          <app-pager *ngIf="historyPage && showHistory"
            [page]="historyPage.page" [pages]="historyPage.pages"
            [total]="historyPage.total" [limit]="historyPage.limit"
            (pageChange)="loadHistory(showHistory.steam_id, $event, historyPage.limit)"
            (limitChange)="loadHistory(showHistory.steam_id, 1, $event)"></app-pager>
        </div>
      </div>
    </div>
  `,
})
export class AdminCoinsComponent implements OnInit {
  loading = true;
  page: CoinUsersPage | null = null;
  q = '';
  qDebounce: any;

  adjusting: CoinUserRow | null = null;
  sign: 1 | -1 = 1;
  amount = 0;
  reason = '';
  saving = false;
  error: string | null = null;

  showHistory: CoinUserRow | null = null;
  historyPage: Paginated<HistoryRow> | null = null;

  constructor(private svc: AdminCoinsService, private t: TranslateService) {}

  iconFor(source: string): string { return SOURCE_ICON[source] || 'paid'; }
  absCoins(n: number): number { return Math.abs(n); }

  ngOnInit() { this.load(1, 20); }

  load(page: number, limit: number) {
    this.loading = true;
    this.svc.listUsers(page, limit, this.q).subscribe({
      next: p => { this.page = p; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  onSearch() {
    clearTimeout(this.qDebounce);
    this.qDebounce = setTimeout(() => this.load(1, this.page?.limit || 20), 300);
  }

  openAdjust(u: CoinUserRow, sign: 1 | -1) {
    this.adjusting = u; this.sign = sign;
    this.amount = 0; this.reason = ''; this.error = null;
  }

  confirmAdjust() {
    if (!this.adjusting) return;
    const n = Number(this.amount);
    if (!n || n <= 0) { this.error = this.t.instant('adminCoins.errors.needAmount'); return; }
    const delta = this.sign * n;
    this.saving = true;
    this.svc.adjust(this.adjusting.steam_id, delta, this.reason.trim()).subscribe({
      next: (r: AdjustResult) => {
        this.saving = false;
        // update row balance
        if (this.page) {
          const row = this.page.items.find(x => x.steam_id === r.steam_id);
          if (row) row.balance = r.balance;
        }
        this.adjusting = null;
      },
      error: e => { this.saving = false; this.error = e?.error?.message || this.t.instant('adminCoins.errors.saveFail'); },
    });
  }

  openHistory(u: CoinUserRow) {
    this.showHistory = u;
    this.historyPage = null;
    this.loadHistory(u.steam_id, 1, 20);
  }

  loadHistory(steamId: string, page: number, limit: number) {
    this.svc.historyAll(steamId, page, limit).subscribe(p => this.historyPage = p);
  }
}
