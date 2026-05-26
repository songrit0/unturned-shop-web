import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BasketService, BasketItem, CheckoutResult } from '../../services/basket.service';
import { CoinsService } from '../../services/coins.service';

@Component({
  selector: 'app-basket-drawer',
  template: `
    <ng-container *ngIf="basket.open$ | async">
      <div class="fixed inset-0 bg-black/40 z-40" (click)="close()"></div>

      <aside class="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col">
        <header class="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 class="font-bold text-lg flex items-center gap-2">
            <span class="mi lg">shopping_cart</span> {{ 'basket.title' | translate }}
          </h2>
          <button (click)="close()" class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
            <span class="mi">close</span>
          </button>
        </header>

        <div class="flex-1 overflow-y-auto p-4 space-y-3" *ngIf="basket.basket$ | async as b">
          <p *ngIf="b.items.length === 0" class="text-center text-slate-400 py-12">
            <span class="mi xl block mb-2">remove_shopping_cart</span>
            {{ 'basket.empty' | translate }}
          </p>

          <div *ngFor="let it of b.items" class="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
            <div class="w-14 h-14 bg-white dark:bg-slate-700 rounded flex items-center justify-center overflow-hidden shrink-0">
              <img *ngIf="it.image_url; else noImg" [src]="it.image_url" [alt]="it.name" class="w-full h-full object-contain p-1">
              <ng-template #noImg><span class="mi lg text-slate-400">inventory_2</span></ng-template>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ it.name }}</p>
              <p class="text-sm text-slate-500">{{ it.price | number }} <span class="mi text-amber-500">paid</span> / {{ 'basket.perItem' | translate }}</p>
            </div>
            <div class="flex items-center gap-1">
              <button (click)="dec(it)" class="w-7 h-7 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 flex items-center justify-center">
                <span class="mi">remove</span>
              </button>
              <span class="w-8 text-center font-mono">{{ it.qty }}</span>
              <button (click)="inc(it)" [disabled]="it.qty >= it.amount_avail"
                      class="w-7 h-7 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 flex items-center justify-center disabled:opacity-40">
                <span class="mi">add</span>
              </button>
            </div>
            <button (click)="remove(it)" class="text-slate-400 hover:text-rose-500">
              <span class="mi">delete</span>
            </button>
          </div>
        </div>

        <footer class="border-t border-slate-200 dark:border-slate-700 p-4 space-y-3" *ngIf="basket.basket$ | async as b">
          <div class="flex justify-between text-sm text-slate-500">
            <span>{{ 'basket.balance' | translate }}</span>
            <span class="font-mono">{{ (coins.balance$ | async) ?? '—' }}</span>
          </div>
          <div class="flex justify-between font-semibold text-lg">
            <span>{{ 'basket.total' | translate }}</span>
            <span class="text-amber-500">{{ b.total | number }} Coin</span>
          </div>
          <button (click)="checkout()" [disabled]="b.items.length === 0 || loading"
                  class="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2">
            <span *ngIf="!loading" class="mi">payments</span>
            <span *ngIf="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            {{ (loading ? 'basket.checkoutLoading' : 'basket.checkout') | translate }}
          </button>
          <p *ngIf="error" class="text-sm text-rose-500 text-center">{{ error }}</p>
        </footer>
      </aside>

      <!-- success modal -->
      <div *ngIf="result" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
          <span class="mi xl text-emerald-500">check_circle</span>
          <h3 class="text-xl font-bold mt-3">{{ 'basket.successTitle' | translate }}</h3>
          <p class="text-sm text-slate-500 mt-1">{{ 'basket.successHint' | translate }}</p>
          <div class="my-4 p-3 bg-slate-100 dark:bg-slate-700 rounded-xl">
            <code class="font-mono text-2xl font-bold tracking-widest text-brand-600">{{ result.code }}</code>
          </div>
          <p class="text-sm">{{ 'basket.useInGame' | translate }}
            <code class="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded font-mono">/code {{ result.code }}</code>
          </p>
          <div class="flex gap-2 mt-5">
            <button (click)="copyCode()" class="flex-1 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300">
              <span class="mi">content_copy</span> {{ (copied ? 'welcome.copied' : 'welcome.copy') | translate }}
            </button>
            <button (click)="closeResult()" class="flex-1 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600">
              {{ 'basket.ok' | translate }}
            </button>
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

  ngOnInit() {
    this.basket.view().subscribe();
  }

  close() { this.basket.setOpen(false); }

  inc(it: BasketItem) { this.basket.setQty(it.item_id, it.qty + 1).subscribe(); }
  dec(it: BasketItem) { this.basket.setQty(it.item_id, it.qty - 1).subscribe(); }
  remove(it: BasketItem) { this.basket.remove(it.item_id).subscribe(); }

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
      error: e => { this.loading = false; this.error = e?.error?.message || this.t.instant('basket.errors.generic'); },
    });
  }

  closeResult() { this.result = null; this.basket.setOpen(false); }

  copyCode() {
    if (!this.result) return;
    navigator.clipboard.writeText(this.result.code).then(() => {
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
