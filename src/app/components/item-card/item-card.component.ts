import { Component, Input } from '@angular/core';
import { MarketItem } from '../../services/market.service';
import { BasketService } from '../../services/basket.service';

@Component({
  selector: 'app-item-card',
  template: `
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow hover:shadow-lg transition flex flex-col overflow-hidden relative">
      <!-- price-change badge -->
      <span *ngIf="discountPct() > 0"
            class="absolute top-2 left-2 z-10 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
        <span class="mi text-sm">trending_down</span>
        −{{ discountPct() }}%
      </span>
      <span *ngIf="discountPct() < 0"
            class="absolute top-2 left-2 z-10 bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
        <span class="mi text-sm">trending_up</span>
        +{{ -discountPct() }}%
      </span>
      <span *ngIf="item.amount > 0 && item.amount <= 5"
            class="absolute top-2 right-2 z-10 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
        <span class="mi text-sm">whatshot</span>
        เหลือน้อย
      </span>

      <div class="aspect-square bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
        <img *ngIf="item.image_url; else noImg" [src]="item.image_url" [alt]="item.name"
             class="w-full h-full object-contain p-2" loading="lazy">
        <ng-template #noImg>
          <span class="mi xl text-slate-400">inventory_2</span>
        </ng-template>
      </div>
      <div class="p-3 flex-1 flex flex-col">
        <p class="font-semibold truncate" [title]="item.name">{{ item.name }}</p>
        <p class="text-xs text-slate-500 mb-2">#{{ item.item_id }}</p>
        <div class="mt-auto flex items-end justify-between gap-2">
          <div>
            <div class="flex items-baseline gap-2">
              <p class="text-lg font-bold flex items-center gap-1"
                 [class.text-emerald-600]="discountPct() > 0"
                 [class.text-rose-600]="discountPct() < 0"
                 [class.text-brand-600]="discountPct() === 0">
                {{ item.price | number }}
                <span class="mi text-amber-500">paid</span>
              </p>
              <span *ngIf="discountPct() !== 0" class="text-xs text-slate-400 line-through">{{ item.base_price | number }}</span>
            </div>
            <p class="text-xs text-slate-500">stock: {{ item.amount | number }}</p>
          </div>
          <button (click)="add()" [disabled]="loading || added"
                  class="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-lg disabled:opacity-60 flex items-center gap-1 whitespace-nowrap">
            <span class="mi">{{ added ? 'check' : 'add_shopping_cart' }}</span>
            {{ added ? 'แล้ว' : 'ใส่' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ItemCardComponent {
  @Input({ required: true }) item!: MarketItem;
  loading = false;
  added = false;

  constructor(private basket: BasketService) {}

  /** Returns % discount: positive = cheaper than base; negative = pricier; 0 = equal/no anchor */
  discountPct(): number {
    const base = Number(this.item.base_price);
    const price = Number(this.item.price);
    if (!base || base <= 0 || price <= 0 || base === price) return 0;
    return Math.round(((base - price) / base) * 100);
  }

  add() {
    this.loading = true;
    this.basket.add(this.item.item_id).subscribe({
      next: () => { this.loading = false; this.added = true; setTimeout(() => this.added = false, 1500); },
      error: () => { this.loading = false; },
    });
  }
}
