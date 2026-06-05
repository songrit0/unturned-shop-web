import { Component, HostBinding, Input } from '@angular/core';
import { Router } from '@angular/router';
import { MarketItem } from '../../services/market.service';
import { BasketService, BasketKind } from '../../services/basket.service';

@Component({
  selector: 'app-item-card',
  template: `
    <div class="item-card" [class.list]="layout === 'list'" (click)="open()">
      <div class="badge-stack" *ngIf="discountPct() !== 0">
        <span class="badge emerald" *ngIf="discountPct() > 0">
          <span class="mi">trending_down</span>−{{ discountPct() }}%
        </span>
        <span class="badge rose" *ngIf="discountPct() < 0">
          <span class="mi">trending_up</span>+{{ -discountPct() }}%
        </span>
      </div>
      <div class="badge-stack-right" *ngIf="item.amount > 0 && item.amount <= 5">
        <span class="badge amber"><span class="mi">whatshot</span>{{ 'shop.lowStock' | translate }}</span>
      </div>

      <div class="item-img">
        <img *ngIf="item.image_url; else noImg" [src]="item.image_url" [alt]="item.name" loading="lazy">
        <ng-template #noImg><span class="mi xl">inventory_2</span></ng-template>
      </div>

      <div class="item-body" [class.col]="layout !== 'list'">
        <div [class.item-info]="layout === 'list'" style="min-width:0; flex:1;">
          <div class="item-name" [title]="item.name">{{ item.name }}</div>
          <div class="item-meta">
            <span class="item-id">#{{ item.item_id }}</span>
            <span *ngIf="item.type_name" class="badge violet">{{ item.type_name }}</span>
          </div>
        </div>
        <div class="item-foot">
          <div class="item-price">
            <div class="item-price-main" [class.discount]="discountPct() > 0" [class.up]="discountPct() < 0">
              {{ item.price | number }} <img class="coin-img" src="assets/coins/coin.png" alt="">
            </div>
            <div *ngIf="item.meowcoin_price != null" class="item-price-meow muted text-xs row gap-1">
              {{ item.meowcoin_price | number }} <img class="coin-img meow" src="assets/coins/meowcoin.png" alt="">
            </div>
            <span *ngIf="discountPct() !== 0" class="item-price-old">{{ item.base_price | number }}</span>
            <span class="item-stock">{{ 'shop.stock' | translate:{ n: item.amount } }}</span>
          </div>
          <button class="add-btn" [class.added]="added" [disabled]="loading || added || item.amount <= 0"
                  (click)="add($event)" [title]="'shop.addToCart' | translate">
            <span class="mi">{{ added ? 'check' : 'add' }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ItemCardComponent {
  @Input({ required: true }) item!: MarketItem;
  @Input() layout: 'grid' | 'list' = 'grid';
  /** 'item' (default) keeps existing behavior; 'vehicle' adds to basket as a vehicle and skips the market-detail link. */
  @Input() kind: BasketKind = 'item';
  loading = false;
  added = false;

  constructor(private basket: BasketService, private router: Router) {}

  discountPct(): number {
    const base = Number(this.item.base_price);
    const price = Number(this.item.price);
    if (!base || base <= 0 || price <= 0 || base === price) return 0;
    return Math.round(((base - price) / base) * 100);
  }

  open() {
    // Vehicles have no market-detail page; only items navigate.
    if (this.kind !== 'item') return;
    this.router.navigate(['/market', this.item.item_id]);
  }

  add(ev: Event) {
    ev.stopPropagation();
    this.loading = true;
    this.basket.add(this.item.item_id, 1, this.kind).subscribe({
      next: () => { this.loading = false; this.added = true; setTimeout(() => this.added = false, 1500); },
      error: () => { this.loading = false; },
    });
  }
}
