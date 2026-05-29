import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Paginated } from '../../models/paginated';
import { formatActorLabel, isDeletedActor, P2pListing } from '../../models/vault';
import { P2pFilters, P2pService } from '../../services/p2p.service';
import { ItemType, ItemTypesService } from '../../services/item-types.service';
import { mapVaultP2pErrorKey } from '../../services/vault-errors';

@Component({
  selector: 'app-p2p-market',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon violet"><span class="mi lg">storefront</span></div>
        <h1>{{ 'p2p.title' | translate }}</h1>
        <div class="page-actions">
          <div class="input-wrap" style="width:240px">
            <span class="mi lead">search</span>
            <input type="search" class="input" [(ngModel)]="filters.q" (ngModelChange)="onSearch($event)" [placeholder]="'p2p.search' | translate">
          </div>
          <select class="select" [(ngModel)]="filters.type_id" (ngModelChange)="reload()">
            <option [ngValue]="null">{{ 'p2p.allTypes' | translate }}</option>
            <option *ngFor="let t of types" [ngValue]="t.id">{{ t.name }}</option>
          </select>
          <input type="number" min="0" class="input mono" style="width:96px" [(ngModel)]="filters.min_price" (change)="reload()" placeholder="min">
          <input type="number" min="0" class="input mono" style="width:96px" [(ngModel)]="filters.max_price" (change)="reload()" placeholder="max">
        </div>
      </div>

      <div *ngIf="lastBuyId != null" class="buy-success">
        <span class="mi sm">check_circle</span>
        <a routerLink="/inventory">{{ 'p2p.buySuccessGoTo' | translate }}</a>
        <button class="btn ghost sm" (click)="lastBuyId = null" style="margin-left:auto;color:var(--muted)">
          <span class="mi sm">close</span>
        </button>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div class="grid-cards">
          <div *ngFor="let l of items" class="listing-card" (click)="select(l)">
            <div class="thumb">
              <img *ngIf="l.image_url; else noImg" [src]="l.image_url">
              <ng-template #noImg><span class="mi xl">inventory_2</span></ng-template>
            </div>
            <div class="meta">
              <div class="name" style="display:flex;align-items:center;gap:6px">
                <span>{{ l.item_name || ('#' + l.item_id) }}</span>
                <span *ngIf="!l.item_name" class="verify-icon" [title]="'verifyStatus.unverified' | translate">
                  <span class="mi sm">info</span>
                </span>
              </div>
              <app-quality-bar [value]="l.quality" [showPercent]="true"></app-quality-bar>
              <div *ngIf="l.amount > 1" class="muted mono" style="font-size:11px;margin-top:2px">×{{ l.amount }}</div>
              <div class="price mono">{{ l.price | number }} <span class="muted" style="font-weight:400">coins</span></div>
            </div>
          </div>
          <div *ngIf="items.length === 0" class="empty">
            <span class="mi xxl">storefront</span>
            <div class="empty-title">{{ 'p2p.empty' | translate }}</div>
          </div>
        </div>

        <app-pager *ngIf="page"
          [page]="page.page" [pages]="page.pages"
          [total]="page.total" [limit]="page.limit"
          (pageChange)="goPage($event, page.limit)"
          (limitChange)="goPage(1, $event)"></app-pager>
      </ng-container>
      <ng-template #loadingTpl>
        <div style="text-align:center;padding:48px 0"><div class="spinner"></div></div>
      </ng-template>

      <!-- Buy modal -->
      <div *ngIf="selected" class="modal-backdrop" (click)="selected = null">
        <div class="modal-card tactical" style="max-width:480px" (click)="$event.stopPropagation()">
          <h3 style="margin:0 0 12px 0;font-size:18px;font-weight:700">{{ selected.item_name || ('#' + selected.item_id) }}</h3>
          <div class="row gap-3" style="align-items:center;margin-bottom:12px">
            <div style="width:96px;height:96px;background:var(--surface-2);border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden">
              <img *ngIf="selected.image_url" [src]="selected.image_url" style="width:100%;height:100%;object-fit:contain;padding:6px">
            </div>
            <div style="flex:1">
              <div class="muted" style="font-size:12px">{{ 'p2p.seller' | translate }}</div>
              <div class="mono" style="font-weight:600;font-size:13px" [class.deleted-actor]="isSellerDeleted(selected)">{{ sellerLabel(selected) }}</div>
              <div class="muted" style="font-size:12px;margin-top:8px">{{ 'p2p.quality' | translate }}</div>
              <app-quality-bar [value]="selected.quality" [showPercent]="true"></app-quality-bar>
              <div *ngIf="selected.amount > 1" class="muted mono" style="font-size:11px">×{{ selected.amount }}</div>
              <div class="muted" style="font-size:12px;margin-top:8px">{{ 'p2p.price' | translate }}</div>
              <div class="mono" style="font-weight:700;font-size:18px">{{ selected.price | number }} coins</div>
            </div>
          </div>
          <p *ngIf="buyError" style="color:var(--rose);font-size:13px;margin:8px 0 0 0">{{ buyError | translate }}</p>
          <div class="row gap-2" style="margin-top:16px">
            <button class="btn secondary" style="flex:1" (click)="selected = null">{{ 'common.cancel' | translate }}</button>
            <button class="btn primary" style="flex:1" [disabled]="buying" (click)="buy()">
              {{ (buying ? 'p2p.buying' : 'p2p.buy') | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
    .listing-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 10px; cursor: pointer; transition: border-color .12s ease, transform .12s ease; }
    .listing-card:hover { border-color: var(--accent); transform: translateY(-2px); }
    .thumb { aspect-ratio: 1; background: var(--surface-2); border-radius: 6px; display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 8px; }
    .thumb img { width: 100%; height: 100%; object-fit: contain; padding: 8px; }
    .name { font-weight: 600; }
    .price { margin-top: 4px; font-size: 15px; font-weight: 700; }
    .verify-icon { display: inline-flex; align-items: center; color: var(--rose); }
    .buy-success { display: flex; align-items: center; gap: 8px; padding: 10px 14px; margin-bottom: 12px;
                   background: var(--surface-2); border: 1px solid var(--emerald); border-radius: 6px;
                   color: var(--emerald); font-size: 13px; }
    .buy-success a { color: var(--emerald); font-weight: 600; text-decoration: underline; }
  `],
})
export class P2pMarketComponent implements OnInit, OnDestroy {
  sellerLabel = (l: P2pListing) => formatActorLabel(l.seller_discord_name, l.seller_steam);
  isSellerDeleted = (l: P2pListing) => isDeletedActor(l.seller_discord_name);

  loading = true;
  items: P2pListing[] = [];
  page: Paginated<P2pListing> | null = null;
  pageNum = 1;
  pageLimit = 20;
  types: ItemType[] = [];
  filters: P2pFilters = { q: '', type_id: null, min_price: null, max_price: null };

  selected: P2pListing | null = null;
  buying = false;
  lastBuyId: number | null = null;
  buyError: string | null = null;

  private search$ = new Subject<string>();
  private sub?: Subscription;

  constructor(private svc: P2pService, private typesSvc: ItemTypesService) {}

  ngOnInit() {
    this.sub = this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.pageNum = 1;
      this.reload();
    });
    this.reload();
    this.typesSvc.list().subscribe({ next: p => this.types = p.items, error: () => {} });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  onSearch(v: string) { this.search$.next(v ?? ''); }

  reload() {
    this.loading = true;
    this.svc.listActive({ ...this.filters, page: this.pageNum, limit: this.pageLimit }).subscribe({
      next: p => { this.page = p; this.items = p.items; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  goPage(page: number, limit: number) {
    this.pageNum = page;
    this.pageLimit = limit;
    this.reload();
  }

  select(l: P2pListing) {
    this.selected = l;
    this.buyError = null;
  }

  buy() {
    if (!this.selected) return;
    this.buying = true;
    this.buyError = null;
    this.svc.buy(this.selected.id).subscribe({
      next: bought => {
        this.buying = false;
        this.lastBuyId = bought.id;
        this.selected = null;
        this.reload();
      },
      error: e => {
        this.buying = false;
        this.buyError = mapVaultP2pErrorKey(e);
      },
    });
  }
}
