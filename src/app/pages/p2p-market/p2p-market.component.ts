import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Paginated } from '../../models/paginated';
import { EnrichedVaultItem, formatActorLabel, isDeletedActor, P2pListing, VaultDetail, VaultSummary } from '../../models/vault';
import { P2pFilters, P2pService } from '../../services/p2p.service';
import { ItemType, ItemTypesService } from '../../services/item-types.service';
import { VaultsService } from '../../services/vaults.service';
import { AuthService } from '../../services/auth.service';
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
          <button class="btn ghost" (click)="showGuide = !showGuide">
            <span class="mi sm">help</span> {{ 'p2p.guide.btn' | translate }}
          </button>
          <button *ngIf="auth.me$ | async" class="btn primary" (click)="openSell()">
            <span class="mi sm">sell</span> {{ 'p2p.sell.btn' | translate }}
          </button>
        </div>
      </div>

      <!-- How-to guide (collapsible) -->
      <div *ngIf="showGuide" class="card" style="margin-bottom:16px;padding:16px">
        <div class="row gap-2" style="justify-content:space-between;align-items:flex-start">
          <h3 style="margin:0;font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px">
            <span class="mi">menu_book</span>{{ 'p2p.guide.title' | translate }}
          </h3>
          <button class="btn ghost sm" (click)="showGuide = false"><span class="mi sm">close</span></button>
        </div>
        <ul style="margin:10px 0 0 0;padding-left:20px;font-size:13px;line-height:1.9;color:var(--muted)">
          <li>{{ 'p2p.guide.buy' | translate }}</li>
          <li>{{ 'p2p.guide.sell' | translate }}</li>
          <li>{{ 'p2p.guide.commission' | translate }}</li>
          <li>{{ 'p2p.guide.expire' | translate }}</li>
        </ul>
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
              <app-gun-chips *ngIf="l.gun" [gun]="l.gun"></app-gun-chips>
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
          <div *ngIf="selected.gun" style="margin-bottom:12px">
            <div class="muted" style="font-size:12px;margin-bottom:4px">{{ 'p2p.gun.title' | translate }}</div>
            <app-gun-chips [gun]="selected.gun"></app-gun-chips>
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

      <!-- Sell-from-vault popup: pick a vault, list an item without leaving this page -->
      <div *ngIf="sellOpen" class="modal-backdrop" (click)="closeSell()">
        <div class="modal-card tactical" style="max-width:560px" (click)="$event.stopPropagation()">
          <div class="row gap-2" style="justify-content:space-between;align-items:center;margin-bottom:12px">
            <h3 style="margin:0;font-size:18px;font-weight:700;display:flex;align-items:center;gap:8px">
              <span class="mi">sell</span>{{ 'p2p.sell.title' | translate }}
            </h3>
            <button class="btn ghost sm" (click)="closeSell()"><span class="mi sm">close</span></button>
          </div>

          <div *ngIf="loadingVaults" style="text-align:center;padding:32px 0"><div class="spinner"></div></div>

          <ng-container *ngIf="!loadingVaults">
            <div *ngIf="vaults.length === 0" class="empty" style="padding:24px 0">
              <span class="mi xxl">inventory_2</span>
              <div class="empty-title">{{ 'p2p.sell.noVaults' | translate }}</div>
            </div>

            <ng-container *ngIf="vaults.length > 0">
              <div class="vault-tabs" style="margin-bottom:12px">
                <button *ngFor="let v of vaults" class="vault-tab" [class.active]="activeVault?.name === v.name" (click)="openVault(v)">
                  <span class="mi sm">archive</span> {{ v.name }} <span class="badge faint">{{ v.item_count }}</span>
                </button>
              </div>

              <div *ngIf="loadingVaultDetail" style="text-align:center;padding:24px 0"><div class="spinner"></div></div>

              <div *ngIf="activeVault && !loadingVaultDetail" style="max-height:320px;overflow-y:auto">
                <div *ngFor="let it of activeVault.items; let i = index" class="row gap-2" style="align-items:center;padding:8px;border-bottom:1px solid var(--border)">
                  <div style="width:40px;height:40px;background:var(--surface-2);border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
                    <img *ngIf="it.image_url; else noVImg" [src]="it.image_url" style="width:100%;height:100%;object-fit:contain;padding:2px">
                    <ng-template #noVImg><span class="mi faint">inventory_2</span></ng-template>
                  </div>
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:600">{{ it.name || ('#' + it.Id) }}</div>
                    <div class="muted mono" style="font-size:11px">Q{{ it.Quality }}<span *ngIf="it.Amount > 1"> · ×{{ it.Amount }}</span></div>
                  </div>
                  <button class="btn primary sm" (click)="onRequestList(i)">
                    <span class="mi sm">storefront</span> {{ 'vaults.listOnMarket' | translate }}
                  </button>
                </div>
                <div *ngIf="activeVault.items.length === 0" class="empty" style="padding:24px 0">
                  <span class="mi xxl">inventory_2</span>
                  <div class="empty-title">{{ 'vaults.empty' | translate }}</div>
                </div>
              </div>
            </ng-container>
          </ng-container>
        </div>
      </div>

      <app-list-on-market-modal
        *ngIf="listing"
        [item]="listing"
        [busy]="listingBusy"
        [error]="listingError"
        (confirm)="confirmList($event)"
        (cancel)="cancelList()"
      ></app-list-on-market-modal>
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

  // guide + sell-from-vault popup
  showGuide = false;
  sellOpen = false;
  loadingVaults = false;
  loadingVaultDetail = false;
  vaults: VaultSummary[] = [];
  activeVault: VaultDetail | null = null;

  listing: EnrichedVaultItem | null = null;
  listingIndex: number | null = null;
  listingBusy = false;
  listingError: string | null = null;

  private search$ = new Subject<string>();
  private sub?: Subscription;

  constructor(
    private svc: P2pService,
    private typesSvc: ItemTypesService,
    private vaultsSvc: VaultsService,
    public auth: AuthService,
  ) {}

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

  // ---- Sell from vault (popup) -------------------------------------------
  openSell() {
    this.sellOpen = true;
    this.activeVault = null;
    if (this.vaults.length > 0) { this.openVault(this.vaults[0]); return; }
    this.loadingVaults = true;
    this.vaultsSvc.getMine().subscribe({
      next: list => {
        this.vaults = list;
        this.loadingVaults = false;
        if (list.length) this.openVault(list[0]);
      },
      error: () => { this.loadingVaults = false; },
    });
  }

  openVault(v: VaultSummary) {
    if (this.activeVault?.name === v.name) return;
    this.loadingVaultDetail = true;
    this.vaultsSvc.getMineByName(v.name).subscribe({
      next: d => { this.activeVault = d; this.loadingVaultDetail = false; },
      error: () => { this.loadingVaultDetail = false; },
    });
  }

  closeSell() {
    this.sellOpen = false;
    this.activeVault = null;
  }

  onRequestList(index: number) {
    if (!this.activeVault) return;
    this.listingIndex = index;
    this.listing = this.activeVault.items[index];
    this.listingBusy = false;
    this.listingError = null;
  }

  confirmList(price: number) {
    if (!this.activeVault || this.listingIndex == null) return;
    this.listingBusy = true;
    this.listingError = null;
    this.svc.create({ vault_name: this.activeVault.name, item_index: this.listingIndex, price }).subscribe({
      next: () => {
        if (this.activeVault && this.listingIndex != null) {
          const items = this.activeVault.items.filter((_, i) => i !== this.listingIndex);
          this.activeVault = { ...this.activeVault, items };
        }
        this.listingBusy = false;
        this.cancelList();
        this.reload(); // refresh the market grid so the new listing shows
      },
      error: e => {
        this.listingBusy = false;
        this.listingError = mapVaultP2pErrorKey(e);
      },
    });
  }

  cancelList() {
    this.listing = null;
    this.listingIndex = null;
    this.listingBusy = false;
    this.listingError = null;
  }
}
