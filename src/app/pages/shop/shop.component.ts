import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MarketItem, MarketKind, MarketService, MarketTypeOption } from '../../services/market.service';

@Component({
  selector: 'app-shop',
  template: `
    <div class="page">
      <div class="page-header">
        <h1>
          <span class="h-icon" [class.emerald]="kind === 'bills'"><span class="mi">{{ kind === 'bills' ? 'payments' : 'shopping_bag' }}</span></span>
          {{ (kind === 'bills' ? 'shop.billsTitle' : 'shop.title') | translate }}
        </h1>
        <span class="h-sub mono">Showing {{ filtered.length }} of {{ items.length }}</span>
        <div class="page-actions">
          <div class="segmented">
            <button [class.active]="view === 'grid'" (click)="view='grid'"><span class="mi">grid_view</span>Grid</button>
            <button [class.active]="view === 'list'" (click)="view='list'"><span class="mi">view_list</span>List</button>
          </div>
        </div>
      </div>

      <div class="card mb-4" style="padding:14px;">
        <div class="row gap-3 wrap">
          <div class="input-wrap" style="max-width:320px; flex:1; min-width:200px;">
            <span class="mi lead">search</span>
            <input class="input" type="search" [(ngModel)]="q" (ngModelChange)="apply()" [placeholder]="'shop.search' | translate">
          </div>
          <div class="chip-row">
            <button class="chip" [class.active]="filter==='all'" (click)="filter='all'; apply()">
              {{ 'shop.all' | translate }}<span class="count">{{ items.length }}</span>
            </button>
            <button class="chip" [class.active]="filter==='sale'" (click)="filter='sale'; apply()">
              <span class="mi">trending_down</span>{{ 'shop.sale' | translate }}<span class="count">{{ countSale }}</span>
            </button>
            <button class="chip" [class.active]="filter==='hot'" (click)="filter='hot'; apply()">
              <span class="mi">whatshot</span>{{ 'shop.hot' | translate }}<span class="count">{{ countHot }}</span>
            </button>
          </div>
          <div class="row gap-2" style="margin-left:auto;">
            <select class="select" [(ngModel)]="typeId" (ngModelChange)="onTypeChange()">
              <option [ngValue]="null">{{ 'shop.allTypes' | translate }}</option>
              <option *ngFor="let t of types" [ngValue]="t.id">{{ t.name }}</option>
            </select>
            <select class="select" [(ngModel)]="sort" (ngModelChange)="apply()">
              <option value="price-asc">{{ 'shop.sortPriceAsc' | translate }}</option>
              <option value="price-desc">{{ 'shop.sortPriceDesc' | translate }}</option>
              <option value="discount-desc">{{ 'shop.sortDiscount' | translate }}</option>
              <option value="name">{{ 'shop.sortName' | translate }}</option>
            </select>
          </div>
        </div>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div *ngIf="filtered.length === 0" class="empty">
          <span class="mi xxl">inventory_2</span>
          <div class="empty-title">{{ 'shop.empty' | translate }}</div>
        </div>
        <div [class.item-grid]="view === 'grid'" [class.item-list]="view === 'list'">
          <app-item-card *ngFor="let it of filtered; trackBy: trackById" [item]="it" [layout]="view"></app-item-card>
        </div>
      </ng-container>
      <ng-template #loadingTpl>
        <div class="empty"><div class="spinner"></div></div>
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
  view: 'grid' | 'list' = 'grid';
  countSale = 0;
  countHot = 0;
  types: MarketTypeOption[] = [];
  typeId: number | null = null;

  constructor(private market: MarketService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    const raw = this.route.snapshot.queryParamMap.get('type_id');
    const parsed = raw != null ? Number(raw) : NaN;
    this.typeId = Number.isFinite(parsed) ? parsed : null;
    this.q = this.route.snapshot.queryParamMap.get('q') ?? '';
    this.market.types().subscribe({ next: t => this.types = t, error: () => this.types = [] });
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
      error: () => this.loading = false,
    });
  }

  onTypeChange() {
    this.router.navigate([], { relativeTo: this.route, queryParams: { type_id: this.typeId ?? null }, queryParamsHandling: 'merge' });
    this.fetch();
  }

  discountPct(it: MarketItem): number {
    const base = Number(it.base_price); const price = Number(it.price);
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
