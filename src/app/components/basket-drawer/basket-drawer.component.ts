import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BasketService, BasketItem, CheckoutResult } from '../../services/basket.service';
import { CoinsService } from '../../services/coins.service';

@Component({
  selector: 'app-basket-drawer',
  template: `
    <ng-container *ngIf="basket.open$ | async">
      <div class="drawer-backdrop" (click)="close()"></div>

      <aside class="drawer">
        <header class="drawer-head">
          <h2><span class="mi">shopping_cart</span>{{ 'basket.title' | translate }}</h2>
          <button class="icon-btn" (click)="close()"><span class="mi">close</span></button>
        </header>

        <div class="basket-body" *ngIf="basket.basket$ | async as b">
          <div *ngIf="b.items.length === 0" class="empty" style="padding:48px 16px;">
            <span class="mi xxl">remove_shopping_cart</span>
            <div class="empty-title">{{ 'basket.empty' | translate }}</div>
          </div>

          <div *ngFor="let it of b.items" class="basket-line">
            <div class="basket-thumb">
              <img *ngIf="it.image_url; else noImg" [src]="it.image_url" [alt]="it.name">
              <ng-template #noImg><span class="mi md faint">inventory_2</span></ng-template>
            </div>
            <div class="grow" style="min-width:0;">
              <div class="fw-6" style="font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ it.name }}</div>
              <div class="muted text-xs row gap-1">{{ it.price | number }} <img class="coin-img" src="assets/coins/coin.png" alt=""> / {{ 'basket.perItem' | translate }}</div>
            </div>
            <div class="qty-stepper">
              <button (click)="dec(it)" [disabled]="it.qty <= 1"><span class="mi sm">remove</span></button>
              <span>{{ it.qty }}</span>
              <button (click)="inc(it)" [disabled]="it.qty >= it.amount_avail"><span class="mi sm">add</span></button>
            </div>
            <button class="icon-btn" (click)="remove(it)" style="width:30px; height:30px;"><span class="mi sm">delete</span></button>
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
          <button class="btn primary lg full" (click)="checkout()" [disabled]="b.items.length === 0 || loading">
            <span *ngIf="!loading" class="mi">payments</span>
            <span *ngIf="loading" class="spinner sm"></span>
            {{ (loading ? 'basket.checkoutLoading' : 'basket.checkout') | translate }}
          </button>
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

  constructor(public basket: BasketService, public coins: CoinsService, private t: TranslateService) {}

  ngOnInit() { this.basket.view().subscribe(); }

  close() { this.basket.setOpen(false); }
  inc(it: BasketItem) { this.basket.setQty(it.item_id, it.qty + 1, it.kind).subscribe(); }
  dec(it: BasketItem) { this.basket.setQty(it.item_id, it.qty - 1, it.kind).subscribe(); }
  remove(it: BasketItem) { this.basket.remove(it.item_id, it.kind).subscribe(); }

  checkout() {
    this.loading = true; this.error = null;
    this.basket.checkout().subscribe({
      next: (r: CheckoutResult) => {
        this.loading = false;
        if (r.ok) {
          this.result = { code: r.code, total: r.total, items: r.items };
          this.coins.refreshMe().subscribe();
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
      default:             return this.t.instant('basket.errors.generic');
    }
  }
}
