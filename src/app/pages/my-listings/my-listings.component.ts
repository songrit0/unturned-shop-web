import { Component, OnInit } from '@angular/core';
import { formatActorLabel, isDeletedActor, P2pListing } from '../../models/vault';
import { P2pService } from '../../services/p2p.service';

type Tab = 'active' | 'sold' | 'cancelled';

@Component({
  selector: 'app-my-listings',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon amber"><span class="mi lg">sell</span></div>
        <h1>{{ 'myListings.title' | translate }}</h1>
      </div>

      <div class="tabs">
        <button *ngFor="let t of tabs"
                class="tab"
                [class.active]="tab === t"
                (click)="select(t)">
          {{ ('myListings.tab.' + t) | translate }}
        </button>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div class="card flush">
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th style="width:56px"></th>
                  <th>{{ 'myListings.col.item' | translate }}</th>
                  <th style="width:100px">{{ 'myListings.col.quality' | translate }}</th>
                  <th style="width:120px">{{ 'myListings.col.price' | translate }}</th>
                  <th *ngIf="tab === 'sold'" style="width:200px">{{ 'myListings.col.buyer' | translate }}</th>
                  <th style="width:160px">{{ 'myListings.col.created' | translate }}</th>
                  <th style="width:120px"></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let l of items">
                  <td>
                    <div style="width:40px;height:40px;background:var(--surface-2);border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden">
                      <img *ngIf="l.image_url" [src]="l.image_url" style="width:100%;height:100%;object-fit:contain;padding:2px">
                    </div>
                  </td>
                  <td><div style="font-weight:600">{{ l.item_name }}</div></td>
                  <td>Q{{ l.quality }}<ng-container *ngIf="l.amount > 1"> · ×{{ l.amount }}</ng-container></td>
                  <td class="mono">{{ l.price | number }}</td>
                  <td *ngIf="tab === 'sold'" class="muted mono" style="font-size:12px" [class.deleted-actor]="isBuyerDeleted(l)">{{ buyerLabel(l) }}</td>
                  <td class="muted mono" style="font-size:12px">{{ l.created_at | date:'short' }}</td>
                  <td>
                    <button *ngIf="l.status === 'active'" class="btn ghost sm" style="color:var(--rose)" (click)="cancel(l)">
                      {{ 'myListings.cancel' | translate }}
                    </button>
                    <span *ngIf="l.status !== 'active'" class="muted" style="font-size:12px">{{ ('p2p.status.' + l.status) | translate }}</span>
                  </td>
                </tr>
                <tr *ngIf="items.length === 0">
                  <td [attr.colspan]="tab === 'sold' ? 7 : 6">
                    <div class="empty">
                      <span class="mi xxl">sell</span>
                      <div class="empty-title">{{ ('myListings.empty.' + tab) | translate }}</div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>
      <ng-template #loadingTpl>
        <div style="text-align:center;padding:48px 0"><div class="spinner"></div></div>
      </ng-template>
    </div>
  `,
  styles: [`
    .tabs { display: flex; gap: 4px; margin-bottom: 12px; border-bottom: 1px solid var(--border); }
    .tab { padding: 8px 14px; background: transparent; border: 0; color: var(--muted); cursor: pointer; border-bottom: 2px solid transparent; font-weight: 600; }
    .tab.active { color: var(--text); border-bottom-color: var(--accent); }
  `],
})
export class MyListingsComponent implements OnInit {
  buyerLabel = (l: P2pListing) => formatActorLabel(l.buyer_discord_name, l.buyer_steam);
  isBuyerDeleted = (l: P2pListing) => isDeletedActor(l.buyer_discord_name);

  loading = true;
  tab: Tab = 'active';
  tabs: Tab[] = ['active', 'sold', 'cancelled'];
  all: P2pListing[] = [];

  constructor(private svc: P2pService) {}

  ngOnInit() { this.reload(); }

  get items(): P2pListing[] {
    if (this.tab === 'cancelled') {
      return this.all.filter(l => l.status === 'cancelled' || l.status === 'expired');
    }
    return this.all.filter(l => l.status === this.tab);
  }

  select(t: Tab) {
    if (this.tab === t) return;
    this.tab = t;
  }

  reload() {
    this.loading = true;
    this.svc.myListings().subscribe({
      next: p => { this.all = p.items; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  cancel(l: P2pListing) {
    this.svc.cancel(l.id).subscribe({
      next: () => this.reload(),
      error: () => {},
    });
  }
}
