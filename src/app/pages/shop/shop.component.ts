import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MarketItem, MarketKind, MarketService, MarketTypeOption } from '../../services/market.service';

@Component({
  selector: 'app-shop',
  template: `
    <div class="max-w-6xl mx-auto p-4">
      <h1 class="text-2xl font-bold mb-4 flex items-center gap-2">
        <span class="mi lg" [class.text-brand-500]="kind === 'normal'" [class.text-emerald-500]="kind === 'bills'">
          {{ kind === 'bills' ? 'payments' : 'shopping_bag' }}
        </span>
        {{ (kind === 'bills' ? 'shop.billsTitle' : 'shop.title') | translate }}
      </h1>

      <div class="flex flex-wrap gap-3 items-center mb-4">
        <div class="relative max-w-sm flex-1 min-w-[200px]">
          <span class="mi absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input type="search" [(ngModel)]="q" [placeholder]="'shop.search' | translate"
                 (ngModelChange)="apply()"
                 class="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800">
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <button (click)="filter='all'; apply()" class="text-sm px-3 py-1.5 rounded-lg"
                  [class.bg-brand-500]="filter==='all'" [class.text-white]="filter==='all'"
                  [class.bg-slate-100]="filter!=='all'" [class.dark:bg-slate-700]="filter!=='all'">
            {{ 'shop.all' | translate }} ({{ items.length }})
          </button>
          <button (click)="filter='sale'; apply()" class="text-sm px-3 py-1.5 rounded-lg flex items-center gap-1"
                  [class.bg-emerald-500]="filter==='sale'" [class.text-white]="filter==='sale'"
                  [class.bg-emerald-50]="filter!=='sale'" [class.text-emerald-700]="filter!=='sale'"
                  [class.dark:bg-emerald-900]="filter!=='sale'" [class.dark:text-emerald-300]="filter!=='sale'">
            <span class="mi">trending_down</span> {{ 'shop.sale' | translate }} ({{ countSale }})
          </button>
          <button (click)="filter='hot'; apply()" class="text-sm px-3 py-1.5 rounded-lg flex items-center gap-1"
                  [class.bg-amber-500]="filter==='hot'" [class.text-white]="filter==='hot'"
                  [class.bg-amber-50]="filter!=='hot'" [class.text-amber-700]="filter!=='hot'"
                  [class.dark:bg-amber-900]="filter!=='hot'" [class.dark:text-amber-300]="filter!=='hot'">
            <span class="mi">whatshot</span> {{ 'shop.hot' | translate }} ({{ countHot }})
          </button>
          <select [(ngModel)]="sort" (ngModelChange)="apply()"
                  class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800">
            <option value="price-asc">{{ 'shop.sortPriceAsc' | translate }}</option>
            <option value="price-desc">{{ 'shop.sortPriceDesc' | translate }}</option>
            <option value="discount-desc">{{ 'shop.sortDiscount' | translate }}</option>
            <option value="name">{{ 'shop.sortName' | translate }}</option>
          </select>

          <select [(ngModel)]="typeId" (ngModelChange)="onTypeChange()"
                  class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800">
            <option [ngValue]="null">{{ 'shop.allTypes' | translate }}</option>
            <option *ngFor="let t of types" [ngValue]="t.id">{{ t.name }}</option>
          </select>

          <button *ngIf="typeId !== null" (click)="resetType()"
                  class="text-xs px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center gap-1">
            <span class="mi text-sm">close</span> {{ 'shop.resetFilter' | translate }}
          </button>
        </div>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <p *ngIf="filtered.length === 0" class="text-slate-500 text-center py-12">
          <span class="mi xl block mb-2">inventory_2</span>
          {{ 'shop.empty' | translate }}
        </p>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <app-item-card *ngFor="let it of filtered; trackBy: trackById" [item]="it"></app-item-card>
        </div>
      </ng-container>

      <ng-template #loadingTpl>
        <div class="text-center py-12">
          <div class="inline-block w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </ng-template>
    </div>
  `,
})
export class ShopComponent implements OnInit {
  @Input() kind: MarketKind = 'normal';
  loading = true;
  items: MarketItem[] = [];
  filtered: MarketItem[] = [];
  q = '';
  filter: 'all' | 'sale' | 'hot' = 'all';
  sort: 'price-asc' | 'price-desc' | 'discount-desc' | 'name' = 'price-asc';

  countSale = 0;
  countHot = 0;

  types: MarketTypeOption[] = [];
  typeId: number | null = null;

  constructor(
    private market: MarketService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    const raw = this.route.snapshot.queryParamMap.get('type_id');
    const parsed = raw != null ? Number(raw) : NaN;
    this.typeId = Number.isFinite(parsed) ? parsed : null;

    this.market.types().subscribe({
      next: t => this.types = t,
      error: () => { this.types = []; },
    });

    this.fetch();
  }

  fetch() {
    this.loading = true;
    this.market.list(this.kind, this.typeId).subscribe({
      next: items => {
        this.items = items;
        this.countSale = items.filter(i => this.discountPct(i) > 0).length;
        this.countHot = items.filter(i => i.amount > 0 && i.amount <= 5).length;
        this.apply();
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  onTypeChange() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { type_id: this.typeId ?? null },
      queryParamsHandling: 'merge',
    });
    this.fetch();
  }

  resetType() {
    this.typeId = null;
    this.onTypeChange();
  }

  discountPct(it: MarketItem): number {
    const base = Number(it.base_price);
    const price = Number(it.price);
    if (!base || base <= 0 || price <= 0 || base === price) return 0;
    return ((base - price) / base) * 100;
  }

  apply() {
    const s = this.q.trim().toLowerCase();
    let arr = this.items;
    if (s) arr = arr.filter(i => i.name.toLowerCase().includes(s) || String(i.item_id).includes(s));
    if (this.filter === 'sale') arr = arr.filter(i => this.discountPct(i) > 0);
    if (this.filter === 'hot') arr = arr.filter(i => i.amount > 0 && i.amount <= 5);

    arr = [...arr];
    switch (this.sort) {
      case 'price-asc':     arr.sort((a, b) => a.price - b.price); break;
      case 'price-desc':    arr.sort((a, b) => b.price - a.price); break;
      case 'discount-desc': arr.sort((a, b) => this.discountPct(b) - this.discountPct(a)); break;
      case 'name':          arr.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    this.filtered = arr;
  }

  trackById = (_: number, it: MarketItem) => it.item_id;
}
