import { Component, OnInit } from '@angular/core';
import { Paginated } from '../../models/paginated';
import { formatActorLabel, isDeletedActor } from '../../models/vault';
import { GarageFilters, GarageListing, P2pGarageService } from '../../services/p2p-garage.service';
import { AuthService } from '../../services/auth.service';
import { mapVaultP2pErrorKey } from '../../services/vault-errors';

@Component({
  selector: 'app-p2p-garage-market',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon violet"><span class="mi lg">directions_car</span></div>
        <h1>{{ 'p2pGarage.title' | translate }}</h1>
        <div class="page-actions">
          <button *ngIf="auth.me$ | async" class="btn primary" routerLink="/p2p-garage/sell">
            <span class="mi sm">sell</span> {{ 'p2pGarage.sell' | translate }}
          </button>
        </div>
      </div>

      <div *ngIf="lastBuyId != null" class="buy-success">
        <span class="mi sm">check_circle</span>
        <span>{{ 'p2pGarage.buySuccess' | translate }}</span>
        <button class="btn ghost sm" (click)="lastBuyId = null" style="margin-left:auto;color:var(--muted)">
          <span class="mi sm">close</span>
        </button>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div class="grid-cards">
          <div *ngFor="let l of items" class="listing-card" (click)="select(l)">
            <div class="thumb">
              <img *ngIf="l.image_url; else noImg" [src]="l.image_url">
              <ng-template #noImg><span class="mi xl">directions_car</span></ng-template>
            </div>
            <div class="meta">
              <div class="name">{{ l.vehicle_name || l.garage_name }}</div>
              <div class="muted mono" style="font-size:11px;margin-top:2px">#{{ l.legacy_id }}</div>
              <div class="muted mono" style="font-size:11px" [class.deleted-actor]="isSellerDeleted(l)">{{ sellerLabel(l) }}</div>
              <div class="price mono">{{ l.price | number }} <span class="muted" style="font-weight:400">coins</span></div>
            </div>
          </div>
          <div *ngIf="items.length === 0" class="empty">
            <span class="mi xxl">directions_car</span>
            <div class="empty-title">{{ 'p2pGarage.empty' | translate }}</div>
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
          <h3 style="margin:0 0 12px 0;font-size:18px;font-weight:700">{{ selected.vehicle_name || selected.garage_name }}</h3>
          <div class="row gap-3" style="align-items:center;margin-bottom:12px">
            <div style="width:96px;height:96px;background:var(--surface-2);border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden">
              <img *ngIf="selected.image_url; else noModalImg" [src]="selected.image_url" style="width:100%;height:100%;object-fit:contain;padding:6px">
              <ng-template #noModalImg><span class="mi xl">directions_car</span></ng-template>
            </div>
            <div style="flex:1">
              <div class="muted" style="font-size:12px">{{ 'p2pGarage.seller' | translate }}</div>
              <div class="mono" style="font-weight:600;font-size:13px" [class.deleted-actor]="isSellerDeleted(selected)">{{ sellerLabel(selected) }}</div>
              <div class="muted" style="font-size:12px;margin-top:8px">{{ 'p2pGarage.legacyId' | translate }}</div>
              <div class="mono" style="font-size:13px">#{{ selected.legacy_id }}</div>
              <div class="muted" style="font-size:12px;margin-top:8px">{{ 'p2pGarage.price' | translate }}</div>
              <div class="mono" style="font-weight:700;font-size:18px">{{ selected.price | number }} coins</div>
            </div>
          </div>
          <p class="muted" style="font-size:12px;margin:4px 0 0 0">
            <span class="mi sm">info</span> {{ 'p2pGarage.buyNote' | translate }}
          </p>
          <p *ngIf="buyError" style="color:var(--rose);font-size:13px;margin:8px 0 0 0">{{ buyError | translate }}</p>
          <div class="row gap-2" style="margin-top:16px">
            <button class="btn secondary" style="flex:1" (click)="selected = null">{{ 'common.cancel' | translate }}</button>
            <button class="btn primary" style="flex:1" [disabled]="buying" (click)="buy()">
              {{ (buying ? 'p2pGarage.buying' : 'p2pGarage.buy') | translate }}
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
    .buy-success { display: flex; align-items: center; gap: 8px; padding: 10px 14px; margin-bottom: 12px;
                   background: var(--surface-2); border: 1px solid var(--emerald); border-radius: 6px;
                   color: var(--emerald); font-size: 13px; }
  `],
})
export class P2pGarageMarketComponent implements OnInit {
  sellerLabel = (l: GarageListing) => formatActorLabel(l.seller_discord_name, l.seller_steam);
  isSellerDeleted = (l: GarageListing) => isDeletedActor(l.seller_discord_name);

  loading = true;
  items: GarageListing[] = [];
  page: Paginated<GarageListing> | null = null;
  pageNum = 1;
  pageLimit = 20;
  filters: GarageFilters = {};

  selected: GarageListing | null = null;
  buying = false;
  lastBuyId: number | null = null;
  buyError: string | null = null;

  constructor(
    private svc: P2pGarageService,
    public auth: AuthService,
  ) {}

  ngOnInit() {
    this.reload();
  }

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

  select(l: GarageListing) {
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
