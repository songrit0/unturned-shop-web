import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BasketService, BasketItem, CheckoutResult } from '../../services/basket.service';
import { CoinsService } from '../../services/coins.service';
import { TopupService } from '../../services/topup.service';

@Component({
  selector: 'app-basket-drawer',
  template: `
    <ng-container *ngIf="basket.open$ | async">
      <div class="drawer-backdrop" (click)="close()"></div>

      <aside class="drawer">
        <header class="drawer-head">
          <h2>
            <span class="mi">shopping_cart</span>{{ 'basket.title' | translate }}
            <span *ngIf="(basket.basket$ | async)?.items?.length as n" class="basket-count">{{ n }}</span>
          </h2>
          <button class="icon-btn" (click)="close()"><span class="mi">close</span></button>
        </header>

        <div class="basket-body" *ngIf="basket.basket$ | async as b">
          <div *ngIf="b.items.length === 0" class="empty basket-empty">
            <span class="mi xxl">remove_shopping_cart</span>
            <div class="empty-title">{{ 'basket.empty' | translate }}</div>
            <button class="btn secondary" (click)="close()">{{ 'basket.keepShopping' | translate }}</button>
          </div>

          <div *ngFor="let it of b.items" class="basket-line">
            <div class="basket-thumb">
              <img *ngIf="it.image_url; else noImg" [src]="it.image_url" [alt]="it.name">
              <ng-template #noImg><span class="mi md faint">inventory_2</span></ng-template>
            </div>
            <div class="basket-line-main">
              <div class="basket-line-top">
                <div class="basket-line-name" [title]="it.name">{{ it.name }}</div>
                <button class="basket-del" (click)="remove(it)"
                        [attr.aria-label]="'basket.remove' | translate"><span class="mi sm">delete</span></button>
              </div>
              <div class="basket-line-unit muted text-xs">
                {{ it.price | number }} <img class="coin-img" src="assets/coins/coin.png" alt=""> / {{ 'basket.perItem' | translate }}
                <span *ngIf="it.meowcoin_price != null" class="basket-meow-tag">
                  {{ it.meowcoin_price | number }} <img class="coin-img meow" src="assets/coins/meowcoin.png" alt="">
                </span>
              </div>
              <div class="basket-line-bottom">
                <div class="qty-stepper">
                  <button (click)="dec(it)" [disabled]="it.qty <= 1">−</button>
                  <span>{{ it.qty }}</span>
                  <button (click)="inc(it)" [disabled]="it.qty >= it.amount_avail">+</button>
                </div>
                <div class="basket-line-sub">
                  <span class="coin-amt">{{ it.price * it.qty | number }} <img class="coin-img" src="assets/coins/coin.png" alt=""></span>
                  <span *ngIf="it.meowcoin_price != null" class="coin-amt basket-sub-meow">
                    {{ it.meowcoin_price * it.qty | number }} <img class="coin-img meow" src="assets/coins/meowcoin.png" alt="">
                  </span>
                </div>
              </div>
              <div *ngIf="it.qty >= it.amount_avail" class="basket-line-max muted text-xs">
                {{ 'basket.maxStock' | translate:{ n: it.amount_avail } }}
              </div>
            </div>
          </div>
        </div>

        <footer class="basket-foot" *ngIf="basket.basket$ | async as b">
          <div class="row-between muted text-sm">
            <span>{{ 'basket.balance' | translate }}</span>
            <span class="mono">{{ (coins.balance$ | async) ?? '—' }}</span>
          </div>
          <div class="row-between fw-7" style="font-size:16px;">
            <span>{{ 'basket.total' | translate }}</span>
            <span class="coin-amt lg">{{ b.total | number }} <img class="coin-img lg" src="assets/coins/coin.png" alt=""></span>
          </div>
          <div *ngIf="b.meowcoin_eligible_count > 0" class="row-between muted text-sm">
            <span>{{ 'basket.meowcoinTotal' | translate }}</span>
            <span class="coin-amt">{{ b.meowcoin_total | number }} <img class="coin-img meow" src="assets/coins/meowcoin.png" alt=""></span>
          </div>
          <button class="btn primary lg full" (click)="checkout('coin')" [disabled]="b.items.length === 0 || loading">
            <span *ngIf="!loading" class="mi">payments</span>
            <span *ngIf="loading" class="spinner sm"></span>
            {{ (loading ? 'basket.checkoutLoading' : 'basket.payCoin') | translate }}
          </button>
          <button class="btn secondary lg full" (click)="checkout('meowcoin')"
                  [disabled]="loading || b.meowcoin_eligible_count === 0 || ((topup.balance$ | async) ?? 0) < b.meowcoin_total">
            <img class="coin-img meow" src="assets/coins/meowcoin.png" alt="">
            {{ (loading ? 'basket.checkoutLoading' : 'basket.payMeowcoin') | translate }}
          </button>
          <p *ngIf="b.meowcoin_eligible_count > 0 && b.meowcoin_eligible_count < b.items.length"
             class="muted text-xs" style="text-align:center; margin:0;">
            {{ 'basket.meowcoinPartial' | translate:{ n: b.meowcoin_eligible_count } }}
          </p>
          <p *ngIf="error" class="text-rose text-sm" style="text-align:center; margin:0;">{{ error }}</p>
        </footer>
      </aside>

      <div *ngIf="result" class="modal-backdrop">
        <div class="modal-card tactical">
          <span class="mi xxl" style="color:var(--emerald);">check_circle</span>
          <h2 style="margin-top:8px;">{{ 'basket.successTitle' | translate }}</h2>
          <p class="muted text-sm mt-2">{{ 'basket.successHint' | translate }}</p>
          <div class="code-display" style="justify-content:center; margin:20px 0 12px;">
            <code>{{ result.code }}</code>
          </div>
          <p class="text-sm">{{ 'basket.useInGame' | translate }}
            <code class="mono" style="background:var(--surface-2); padding:2px 6px; border-radius:4px;">/code {{ result.code }}</code>
          </p>
          <div class="row gap-2 mt-4">
            <button class="btn secondary grow" (click)="copyCode()">
              <span class="mi">{{ copied ? 'check' : 'content_copy' }}</span>
              {{ (copied ? 'welcome.copied' : 'welcome.copy') | translate }}
            </button>
            <button class="btn primary grow" (click)="closeResult()">{{ 'basket.ok' | translate }}</button>
          </div>
        </div>
      </div>
    </ng-container>
  `,
})
export class BasketDrawerComponent implements OnInit {
  loading = false;
  error: string | null = null;
  result: { code: string; total: number; items: any[] } | null = null;
  copied = false;

  constructor(public basket: BasketService, public coins: CoinsService, public topup: TopupService, private t: TranslateService) {}

  ngOnInit() {
    this.basket.view().subscribe();
    // Ensure the Meowcoin balance is loaded so the "pay with Meowcoin" disable check works.
    this.topup.meowcoinsMe().subscribe({ error: () => {} });
  }

  close() { this.basket.setOpen(false); }
  inc(it: BasketItem) { this.basket.setQty(it.item_id, it.qty + 1, it.kind).subscribe(); }
  dec(it: BasketItem) { this.basket.setQty(it.item_id, it.qty - 1, it.kind).subscribe(); }
  remove(it: BasketItem) { this.basket.remove(it.item_id, it.kind).subscribe(); }

  checkout(currency: 'coin' | 'meowcoin' = 'coin') {
    this.loading = true; this.error = null;
    this.basket.checkout(currency).subscribe({
      next: (r: CheckoutResult) => {
        this.loading = false;
        if (r.ok) {
          this.result = { code: r.code, total: r.total, items: r.items };
          // Refresh whichever balance was spent. For Meowcoin, also re-fetch the basket —
          // the server kept the ineligible (coin-only) lines.
          if (currency === 'meowcoin') {
            this.topup.meowcoinsMe().subscribe({ error: () => {} });
            this.basket.view().subscribe({ error: () => {} });
          } else {
            this.coins.refreshMe().subscribe();
          }
        } else {
          this.error = this.reasonText(r.reason, r.detail);
        }
      },
      error: e => {
        this.loading = false;
        // A Steam-PIN-only user (no linked Discord) gets 403 {error:'discord_required'} from the
        // discord-keyed checkout — show a friendly "link your Discord" message instead of generic.
        if (e?.status === 403 && e?.error?.error === 'discord_required') {
          this.error = this.t.instant('basket.errors.discordRequired');
        } else {
          this.error = e?.error?.message || this.t.instant('basket.errors.generic');
        }
      },
    });
  }

  closeResult() { this.result = null; this.basket.setOpen(false); }

  copyCode() {
    if (!this.result) return;
    navigator.clipboard.writeText(`/code ${this.result.code}`).then(() => {
      this.copied = true; setTimeout(() => this.copied = false, 2000);
    });
  }

  private reasonText(reason: string, detail?: any): string {
    switch (reason) {
      case 'not_linked':   return this.t.instant('basket.errors.notLinked');
      case 'empty':        return this.t.instant('basket.errors.empty');
      case 'no_item':      return this.t.instant('basket.errors.noItem');
      case 'out_of_stock': return this.t.instant('basket.errors.outOfStock', { name: detail?.name || this.t.instant('basket.errors.itemFallback') });
      case 'insufficient': return this.t.instant('basket.errors.insufficient', { balance: detail?.balance, total: detail?.total });
      case 'insufficient_meowcoin': return this.t.instant('basket.errors.insufficientMeowcoin', { balance: detail?.balance, total: detail?.total });
      case 'no_meowcoin_items':     return this.t.instant('basket.errors.noMeowcoinItems');
      default:             return this.t.instant('basket.errors.generic');
    }
  }
}
