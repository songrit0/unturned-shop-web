import { Component, OnInit } from '@angular/core';
import { formatActorLabel, isDeletedActor, P2pConfig } from '../../models/vault';
import { GarageListing, MineVehicle, P2pGarageService } from '../../services/p2p-garage.service';
import { P2pService } from '../../services/p2p.service';
import { mapVaultP2pErrorKey } from '../../services/vault-errors';

@Component({
  selector: 'app-p2p-garage-sell',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon amber"><span class="mi lg">garage</span></div>
        <h1>{{ 'p2pGarage.sellTitle' | translate }}</h1>
        <div class="page-actions">
          <button class="btn ghost" routerLink="/p2p-garage">
            <span class="mi sm">storefront</span> {{ 'p2pGarage.market' | translate }}
          </button>
        </div>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <!-- My garage vehicles -->
        <h3 class="section-h"><span class="mi">directions_car</span>{{ 'p2pGarage.myVehicles' | translate }}</h3>
        <div class="card flush" style="margin-bottom:24px">
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th style="width:56px"></th>
                  <th>{{ 'p2pGarage.col.vehicle' | translate }}</th>
                  <th style="width:120px">{{ 'p2pGarage.col.legacyId' | translate }}</th>
                  <th style="width:160px"></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let v of vehicles">
                  <td>
                    <div style="width:40px;height:40px;background:var(--surface-2);border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden">
                      <img *ngIf="v.image_url; else noVImg" [src]="v.image_url" style="width:100%;height:100%;object-fit:contain;padding:2px">
                      <ng-template #noVImg><span class="mi faint">directions_car</span></ng-template>
                    </div>
                  </td>
                  <td><div style="font-weight:600">{{ v.vehicle_name || v.name }}</div></td>
                  <td class="muted mono" style="font-size:12px">#{{ v.legacy_id }}</td>
                  <td>
                    <span *ngIf="v.listed_for_sale" class="badge faint">{{ 'p2pGarage.listed' | translate }}</span>
                    <button *ngIf="!v.listed_for_sale" class="btn primary sm" (click)="openList(v)">
                      <span class="mi sm">sell</span> {{ 'p2pGarage.listForSale' | translate }}
                    </button>
                  </td>
                </tr>
                <tr *ngIf="vehicles.length === 0">
                  <td colspan="4">
                    <div class="empty">
                      <span class="mi xxl">directions_car</span>
                      <div class="empty-title">{{ 'p2pGarage.noVehicles' | translate }}</div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- My garage listings -->
        <h3 class="section-h"><span class="mi">sell</span>{{ 'p2pGarage.myListings' | translate }}</h3>
        <div class="card flush">
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th style="width:56px"></th>
                  <th>{{ 'p2pGarage.col.vehicle' | translate }}</th>
                  <th style="width:120px">{{ 'p2pGarage.col.price' | translate }}</th>
                  <th style="width:120px">{{ 'p2pGarage.col.status' | translate }}</th>
                  <th style="width:200px">{{ 'p2pGarage.col.buyer' | translate }}</th>
                  <th style="width:160px">{{ 'p2pGarage.col.created' | translate }}</th>
                  <th style="width:120px"></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let l of listings">
                  <td>
                    <div style="width:40px;height:40px;background:var(--surface-2);border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden">
                      <img *ngIf="l.image_url; else noLImg" [src]="l.image_url" style="width:100%;height:100%;object-fit:contain;padding:2px">
                      <ng-template #noLImg><span class="mi faint">directions_car</span></ng-template>
                    </div>
                  </td>
                  <td><div style="font-weight:600">{{ l.vehicle_name || l.garage_name }}</div></td>
                  <td class="mono">{{ l.price | number }}</td>
                  <td><span class="badge faint">{{ ('p2p.status.' + l.status) | translate }}</span></td>
                  <td class="muted mono" style="font-size:12px" [class.deleted-actor]="isBuyerDeleted(l)">
                    <span *ngIf="l.buyer_steam">{{ buyerLabel(l) }}</span>
                    <span *ngIf="!l.buyer_steam" class="muted">—</span>
                  </td>
                  <td class="muted mono" style="font-size:12px">{{ l.created_at | date:'short' }}</td>
                  <td>
                    <button *ngIf="l.status === 'active'" class="btn ghost sm" style="color:var(--rose)" (click)="cancel(l)">
                      {{ 'p2pGarage.cancel' | translate }}
                    </button>
                  </td>
                </tr>
                <tr *ngIf="listings.length === 0">
                  <td colspan="7">
                    <div class="empty">
                      <span class="mi xxl">sell</span>
                      <div class="empty-title">{{ 'p2pGarage.noListings' | translate }}</div>
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

      <!-- List-for-sale price modal -->
      <div *ngIf="listTarget" class="modal-backdrop" (click)="closeList()">
        <div class="modal-card tactical" style="max-width:420px" (click)="$event.stopPropagation()">
          <h3 style="display:flex;align-items:center;gap:8px;margin:0 0 12px 0;font-size:18px;font-weight:700">
            <span class="mi">sell</span>{{ 'p2pGarage.listForSale' | translate }}
          </h3>

          <div class="row gap-3" style="align-items:center;margin-bottom:12px">
            <div style="width:56px;height:56px;background:var(--surface-2);border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden">
              <img *ngIf="listTarget.image_url; else noModalImg" [src]="listTarget.image_url" style="width:100%;height:100%;object-fit:contain;padding:4px">
              <ng-template #noModalImg><span class="mi">directions_car</span></ng-template>
            </div>
            <div>
              <div style="font-weight:600">{{ listTarget.vehicle_name || listTarget.name }}</div>
              <div class="muted mono" style="font-size:12px">#{{ listTarget.legacy_id }}</div>
            </div>
          </div>

          <label style="display:block;margin-bottom:8px">
            <span class="muted" style="font-size:12px">{{ 'p2pGarage.priceLabel' | translate }}</span>
            <input type="number" min="1" step="1" class="input mono" [(ngModel)]="listPrice" style="margin-top:4px">
          </label>

          <div class="preview" *ngIf="config && listPrice > 0">
            <div class="row" style="justify-content:space-between"><span class="muted">{{ 'p2p.list.commission' | translate }}</span><span class="mono">{{ (config.commission * 100) | number:'1.0-1' }}%</span></div>
            <div class="row" style="justify-content:space-between"><span class="muted">{{ 'p2p.list.youReceive' | translate }}</span><span class="mono"><b>{{ payout | number:'1.0-2' }}</b></span></div>
          </div>

          <p *ngIf="listError" style="color:var(--rose);font-size:13px;margin:8px 0 0 0">{{ listError | translate }}</p>

          <div class="row gap-2" style="margin-top:16px">
            <button class="btn secondary" style="flex:1" (click)="closeList()">{{ 'common.cancel' | translate }}</button>
            <button class="btn primary" style="flex:1" [disabled]="listBusy || listPrice <= 0" (click)="confirmList()">
              {{ (listBusy ? 'common.saving' : 'p2p.list.confirm') | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .section-h { display: flex; align-items: center; gap: 8px; margin: 0 0 10px 0; font-size: 15px; font-weight: 700; }
    .preview { background: var(--surface-2); border-radius: 6px; padding: 8px 10px; font-size: 13px; display: flex; flex-direction: column; gap: 4px; }
  `],
})
export class P2pGarageSellComponent implements OnInit {
  buyerLabel = (l: GarageListing) => formatActorLabel(l.buyer_discord_name, l.buyer_steam);
  isBuyerDeleted = (l: GarageListing) => isDeletedActor(l.buyer_discord_name);

  loading = true;
  vehicles: MineVehicle[] = [];
  listings: GarageListing[] = [];

  config: P2pConfig | null = null;

  listTarget: MineVehicle | null = null;
  listPrice = 0;
  listBusy = false;
  listError: string | null = null;

  constructor(private svc: P2pGarageService, private p2p: P2pService) {}

  ngOnInit() {
    this.reload();
    this.p2p.getConfig().subscribe({
      next: c => (this.config = c),
      error: () => (this.config = { commission: 0, commission_pct: 0, ttl_days: 7, cancel_penalty_pct: 0 }),
    });
  }

  reload() {
    this.loading = true;
    let pending = 2;
    const done = () => { if (--pending === 0) this.loading = false; };
    this.svc.mineVehicles().subscribe({
      next: v => { this.vehicles = v; done(); },
      error: () => { done(); },
    });
    this.svc.listMine().subscribe({
      next: p => { this.listings = p.items; done(); },
      error: () => { done(); },
    });
  }

  get payout(): number {
    if (!this.config) return this.listPrice;
    return this.listPrice * (1 - this.config.commission);
  }

  openList(v: MineVehicle) {
    this.listTarget = v;
    this.listPrice = 0;
    this.listBusy = false;
    this.listError = null;
  }

  closeList() {
    this.listTarget = null;
    this.listBusy = false;
    this.listError = null;
  }

  confirmList() {
    if (!this.listTarget || this.listPrice <= 0) return;
    this.listBusy = true;
    this.listError = null;
    this.svc.createListing(this.listTarget.garage_id, this.listPrice).subscribe({
      next: () => {
        this.closeList();
        this.reload();
      },
      error: e => {
        this.listBusy = false;
        this.listError = mapVaultP2pErrorKey(e);
      },
    });
  }

  cancel(l: GarageListing) {
    this.svc.cancel(l.id).subscribe({
      next: () => this.reload(),
      error: () => {},
    });
  }
}
