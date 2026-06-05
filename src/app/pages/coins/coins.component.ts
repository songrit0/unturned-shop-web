import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  CoinConfig, CoinsMe, CoinsService, HistoryRow, Paginated,
  TransferLookupResult, TransferTargetType,
} from '../../services/coins.service';

const SOURCE_ICON: Record<string, string> = {
  shop: 'shopping_cart',
  p2p: 'swap_horiz',
  admin: 'shield',
  tax: 'percent',
  transfer: 'send',
};

@Component({
  selector: 'app-coins',
  template: `
    <div class="page">
      <div class="page-header">
        <h1><span class="h-icon"><span class="mi fill">paid</span></span>{{ 'coins.title' | translate }}</h1>
      </div>

      <section class="card tactical mb-4">
        <div class="row gap-4 wrap">
          <div class="grow">
            <span class="stat-label">CURRENT BALANCE</span>
            <div class="coin-amt xl mt-2">{{ me ? (me.balance | number) : '...' }} <img class="coin-img xl" src="assets/coins/coin.png" alt=""></div>
            <p *ngIf="me && !me.linked" class="text-rose text-sm row gap-1 mt-2">
              <span class="mi sm">warning</span>{{ 'coins.needLink' | translate }}
            </p>
          </div>
          <div class="row gap-2">
            <a routerLink="/quests" class="btn primary"><span class="mi">flag</span>{{ 'nav.quests' | translate }}</a>
            <a routerLink="/shop" class="btn secondary"><span class="mi">shopping_bag</span>{{ 'nav.shop' | translate }}</a>
          </div>
        </div>
      </section>

      <div class="grid" style="display:grid; grid-template-columns: minmax(340px, 1fr) minmax(320px, 0.7fr); gap: 16px; align-items:start;">

        <!-- Unified history timeline -->
        <div class="card flush">
          <div class="card-title" style="padding:16px 18px 0;"><span class="mi">receipt_long</span>{{ 'coins.history.title' | translate }}</div>
          <div *ngIf="historyPage && historyPage.items.length === 0" class="empty" style="padding:32px;">{{ 'coins.history.empty' | translate }}</div>
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
          <div style="padding:12px 18px;" *ngIf="historyPage">
            <app-pager [page]="historyPage.page" [pages]="historyPage.pages" [total]="historyPage.total" [limit]="historyPage.limit"
              (pageChange)="loadHistory($event, historyPage.limit)" (limitChange)="loadHistory(1, $event)"></app-pager>
          </div>
        </div>

        <!-- Transfer box -->
        <div class="card tactical">
          <div class="card-title"><span class="mi">send</span>{{ 'coins.transfer.title' | translate }}</div>

          <!-- segmented Steam / Discord -->
          <div class="seg" style="display:flex;gap:6px;margin:14px 0 12px;">
            <button type="button" class="btn sm" style="flex:1"
                    [class.primary]="targetType === 'steam'" [class.ghost]="targetType !== 'steam'"
                    (click)="setTargetType('steam')">
              <span class="mi sm">sports_esports</span>{{ 'coins.transfer.bySteam' | translate }}
            </button>
            <button type="button" class="btn sm" style="flex:1"
                    [class.primary]="targetType === 'discord'" [class.ghost]="targetType !== 'discord'"
                    (click)="setTargetType('discord')">
              <span class="mi sm">forum</span>{{ 'coins.transfer.byDiscord' | translate }}
            </button>
          </div>

          <label style="display:block;margin-bottom:10px;">
            <span class="muted" style="font-size:12px;">{{ (targetType === 'steam' ? 'coins.transfer.bySteam' : 'coins.transfer.byDiscord') | translate }}</span>
            <input type="text" class="input mono" [(ngModel)]="targetId" (ngModelChange)="onTargetChange()"
                   [placeholder]="'coins.transfer.targetPlaceholder' | translate" style="margin-top:4px;">
          </label>

          <label style="display:block;margin-bottom:10px;">
            <span class="muted" style="font-size:12px;">{{ 'coins.transfer.amount' | translate }}</span>
            <input type="number" class="input mono" [(ngModel)]="amount" (ngModelChange)="onAmountChange()"
                   [min]="config?.transfer_min || 1" step="1" style="margin-top:4px;">
            <span class="faint" style="font-size:11px;display:block;margin-top:4px;"
                  *ngIf="config">{{ 'coins.transfer.minHint' | translate:{ min: (config.transfer_min | number) } }}</span>
          </label>

          <!-- fee + total -->
          <div style="background:var(--surface-2);border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:13px;">
            <div class="row" style="justify-content:space-between;">
              <span class="muted">{{ 'coins.transfer.fee' | translate }}</span>
              <span class="mono">{{ (config?.transfer_fee || 0) | number }} <img class="coin-img" src="assets/coins/coin.png" alt=""></span>
            </div>
            <div class="row" style="justify-content:space-between;margin-top:6px;font-weight:700;">
              <span>{{ 'coins.transfer.total' | translate }}</span>
              <span class="mono" style="color:var(--accent-hi)">{{ total | number }} <img class="coin-img" src="assets/coins/coin.png" alt=""></span>
            </div>
          </div>

          <!-- disclaimer -->
          <div style="display:flex;gap:8px;align-items:flex-start;background:rgba(244,63,94,0.10);border:1px solid rgba(244,63,94,0.35);border-radius:8px;padding:10px 12px;margin-bottom:12px;">
            <span class="mi sm" style="color:var(--rose);flex:none;margin-top:1px;">warning</span>
            <span class="text-rose" style="font-size:12px;line-height:1.4;">{{ 'coins.transfer.disclaimer' | translate }}</span>
          </div>

          <!-- confirm panel after a successful lookup -->
          <div *ngIf="lookup" style="background:var(--surface-2);border:1px solid var(--emerald);border-radius:8px;padding:10px 12px;margin-bottom:12px;">
            <div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;">{{ 'coins.transfer.recipientIs' | translate }}</div>
            <div style="font-weight:700;margin-top:2px;">{{ lookup.name }}</div>
            <div class="faint mono" style="font-size:11px;margin-top:2px;">{{ maskedSteam(lookup.steam_id) }}</div>
          </div>

          <p *ngIf="error" class="text-rose" style="font-size:13px;margin:0 0 10px;">{{ error }}</p>
          <p *ngIf="success" class="text-emerald" style="font-size:13px;margin:0 0 10px;display:flex;gap:6px;align-items:center;">
            <span class="mi sm">check_circle</span>{{ 'coins.transfer.success' | translate }}
          </p>

          <button *ngIf="!lookup" type="button" class="btn primary" style="width:100%;"
                  [disabled]="busy || !canLookup()" (click)="doLookup()">
            <span class="mi sm">person_search</span>{{ 'coins.transfer.lookup' | translate }}
          </button>
          <button *ngIf="lookup" type="button" class="btn emerald" style="width:100%;"
                  [disabled]="busy" (click)="doTransfer()">
            <span class="mi sm">send</span>{{ 'coins.transfer.confirm' | translate:{ total: (total | number) } }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class CoinsComponent implements OnInit {
  me: CoinsMe | null = null;
  historyPage: Paginated<HistoryRow> | null = null;
  config: CoinConfig | null = null;

  // transfer form
  targetType: TransferTargetType = 'steam';
  targetId = '';
  amount: number | null = null;
  lookup: TransferLookupResult | null = null;
  busy = false;
  error: string | null = null;
  success = false;

  constructor(private coins: CoinsService, private t: TranslateService) {}

  ngOnInit() {
    this.coins.refreshMe().subscribe(me => this.me = me);
    this.coins.getCoinConfig().subscribe(c => this.config = c);
    this.loadHistory(1, 20);
  }

  loadHistory(page: number, limit: number) {
    this.coins.historyAll(page, limit).subscribe(p => this.historyPage = p);
  }

  iconFor(source: string): string { return SOURCE_ICON[source] || 'paid'; }
  absCoins(n: number): number { return Math.abs(n); }

  get total(): number {
    const amt = Number(this.amount) || 0;
    const fee = this.config?.transfer_fee || 0;
    return amt > 0 ? amt + fee : 0;
  }

  setTargetType(tt: TransferTargetType) {
    if (this.targetType === tt) return;
    this.targetType = tt;
    this.resetLookup();
  }

  onTargetChange() { this.resetLookup(); }
  onAmountChange() { this.resetLookup(); }

  private resetLookup() {
    this.lookup = null;
    this.error = null;
    this.success = false;
  }

  canLookup(): boolean {
    const amt = Number(this.amount);
    const min = this.config?.transfer_min ?? 1;
    return !!this.targetId.trim() && Number.isInteger(amt) && amt >= min;
  }

  maskedSteam(id: string): string {
    if (!id || id.length <= 7) return id;
    return id.slice(0, 4) + '•••' + id.slice(-3);
  }

  doLookup() {
    if (!this.canLookup()) {
      const amt = Number(this.amount);
      const min = this.config?.transfer_min ?? 1;
      if (!Number.isInteger(amt) || amt < min) {
        this.error = this.t.instant('errors.amount_too_low');
      }
      return;
    }
    this.busy = true;
    this.error = null;
    this.success = false;
    this.coins.transferLookup(this.targetType, this.targetId.trim()).subscribe({
      next: r => { this.busy = false; this.lookup = r; },
      error: e => { this.busy = false; this.error = this.t.instant('errors.' + (e?.error?.message || 'not_found')); },
    });
  }

  doTransfer() {
    if (!this.lookup) return;
    const amt = Number(this.amount);
    this.busy = true;
    this.error = null;
    this.coins.transfer(this.targetType, this.targetId.trim(), amt).subscribe({
      next: () => {
        this.busy = false;
        this.success = true;
        this.targetId = '';
        this.amount = null;
        this.lookup = null;
        this.coins.refreshMe().subscribe(me => this.me = me);
        this.loadHistory(1, this.historyPage?.limit || 20);
      },
      error: e => { this.busy = false; this.error = this.t.instant('errors.' + (e?.error?.message || 'not_found')); },
    });
  }
}
