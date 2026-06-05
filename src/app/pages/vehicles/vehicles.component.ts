import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MarketItem } from '../../services/market.service';
import { Paginated, VehicleMarketItem, VehicleMarketService } from '../../services/vehicle-market.service';
import { ItemType, ItemTypesService } from '../../services/item-types.service';

@Component({
  selector: 'app-vehicles',
  template: `
    <div class="page">
      <div class="page-header">
        <h1>
          <span class="h-icon"><span class="mi">directions_car</span></span>
          {{ 'vehicles.title' | translate }}
        </h1>
        <span class="h-sub mono">Showing {{ filtered.length }} of {{ page?.total ?? 0 }}</span>
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
            <input class="input" type="search" [(ngModel)]="q" (ngModelChange)="onSearch()" [placeholder]="'vehicles.search' | translate">
          </div>
          <div class="chip-row">
            <button class="chip" [class.active]="filter==='all'" (click)="filter='all'; apply()">
              {{ 'vehicles.all' | translate }}<span class="count">{{ items.length }}</span>
            </button>
            <button class="chip" [class.active]="filter==='hot'" (click)="filter='hot'; apply()">
              <span class="mi">whatshot</span>{{ 'vehicles.hot' | translate }}<span class="count">{{ countHot }}</span>
            </button>
          </div>

          <div class="row gap-2" style="margin-left:auto;">
            <select class="select" [(ngModel)]="typeId" (ngModelChange)="onTypeChange()">
              <option [ngValue]="null">{{ 'vehicles.allTypes' | translate }}</option>
              <option *ngFor="let t of types" [ngValue]="t.id">{{ t.name }}</option>
            </select>
            <select class="select" [(ngModel)]="sort" (ngModelChange)="apply()">
              <option value="price-asc">{{ 'vehicles.sortPriceAsc' | translate }}</option>
              <option value="price-desc">{{ 'vehicles.sortPriceDesc' | translate }}</option>
              <option value="name">{{ 'vehicles.sortName' | translate }}</option>
            </select>
          </div>
        </div>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div *ngIf="filtered.length === 0" class="empty">
          <span class="mi xxl">directions_car</span>
          <div class="empty-title">{{ 'vehicles.empty' | translate }}</div>
        </div>
        <div [class.item-grid]="view === 'grid'" [class.item-list]="view === 'list'">
          <app-item-card *ngFor="let it of filtered; trackBy: trackById" [item]="it" [layout]="view" kind="vehicle"></app-item-card>
        </div>

        <app-pager *ngIf="page"
          [page]="page.page" [pages]="page.pages"
          [total]="page.total" [limit]="page.limit"
          (pageChange)="goPage($event, page.limit)"
          (limitChange)="goPage(1, $event)"></app-pager>
      </ng-container>
      <ng-template #loadingTpl>
        <div class="empty"><div class="spinner"></div></div>
      </ng-template>
    </div>
  `,
})
export class VehiclesComponent implements OnInit {
  loading = true;
  page: Paginated<VehicleMarketItem> | null = null;
  // mapped onto MarketItem shape so app-item-card can render them (base_price = price → no discount UI)
  items: MarketItem[] = [];
  filtered: MarketItem[] = [];
  q = '';
  filter: 'all' | 'hot' = 'all';
  sort: 'price-asc' | 'price-desc' | 'name' = 'price-asc';
  view: 'grid' | 'list' = 'grid';
  countHot = 0;
  types: ItemType[] = [];
  typeId: number | null = null;
  pageNum = 1;
  pageLimit = 20;

  constructor(
    private market: VehicleMarketService,
    private typesSvc: ItemTypesService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    const raw = this.route.snapshot.queryParamMap.get('type_id');
    const parsed = raw != null ? Number(raw) : NaN;
    this.typeId = Number.isFinite(parsed) ? parsed : null;
    this.q = this.route.snapshot.queryParamMap.get('q') ?? '';
    this.typesSvc.list().subscribe({ next: p => this.types = p.items, error: () => this.types = [] });
    this.fetch();
  }

  fetch() {
    this.loading = true;
    this.market.list(this.q.trim(), this.typeId, this.pageNum, this.pageLimit).subscribe({
      next: p => {
        this.page = p;
        this.items = p.items.map(v => this.toCard(v));
        this.countHot = this.items.filter(i => i.amount > 0 && i.amount <= 5).length;
        this.apply();
        this.loading = false;
      },
      error: () => this.loading = false,
    });
  }

  /** Map a vehicle market row onto the MarketItem shape app-item-card expects. */
  private toCard(v: VehicleMarketItem): MarketItem {
    return {
      item_id: v.vehicle_id,
      name: v.name,
      price: v.price,
      base_price: v.price, // fixed price → discount = 0
      amount: v.amount,
      target_stock: 0,
      image_url: v.image_url,
      type_id: v.type_id ?? null,
      type_name: v.type_name ?? null,
      meowcoin_price: v.meowcoin_price ?? null,
    };
  }

  onSearch() {
    this.pageNum = 1;
    this.fetch();
  }

  onTypeChange() {
    this.pageNum = 1;
    this.router.navigate([], { relativeTo: this.route, queryParams: { type_id: this.typeId ?? null }, queryParamsHandling: 'merge' });
    this.fetch();
  }

  goPage(page: number, limit: number) {
    this.pageNum = page;
    this.pageLimit = limit;
    this.fetch();
  }

  apply() {
    const s = this.q.trim().toLowerCase();
    let arr = this.items;
    if (s) arr = arr.filter(i => i.name.toLowerCase().includes(s) || String(i.item_id).includes(s));
    if (this.filter === 'hot') arr = arr.filter(i => i.amount > 0 && i.amount <= 5);
    arr = [...arr];
    switch (this.sort) {
      case 'price-asc':  arr.sort((a, b) => a.price - b.price); break;
      case 'price-desc': arr.sort((a, b) => b.price - a.price); break;
      case 'name':       arr.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    this.filtered = arr;
  }

  trackById = (_: number, it: MarketItem) => it.item_id;
}
