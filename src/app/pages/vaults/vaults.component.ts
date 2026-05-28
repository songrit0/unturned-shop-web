import { Component, OnInit } from '@angular/core';
import { EnrichedVaultItem, VaultDetail, VaultSummary } from '../../models/vault';
import { VaultsService } from '../../services/vaults.service';
import { P2pService } from '../../services/p2p.service';
import { mapVaultP2pErrorKey } from '../../services/vault-errors';

@Component({
  selector: 'app-vaults',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon emerald"><span class="mi lg">inventory</span></div>
        <h1>{{ 'vaults.title' | translate }}</h1>
      </div>

      <ng-container *ngIf="!loadingList; else loadingTpl">
        <div class="vault-tabs">
          <button *ngFor="let v of summaries"
                  class="vault-tab"
                  [class.active]="active?.name === v.name"
                  (click)="open(v)">
            <span class="mi sm">archive</span>
            {{ v.name }}
            <span class="badge faint">{{ v.item_count }}</span>
          </button>
        </div>

        <ng-container *ngIf="active && !loadingDetail; else detailLoading">
          <div class="card flush">
            <div class="table-wrap">
              <table class="tbl">
                <thead>
                  <tr>
                    <th style="width:56px"></th>
                    <th>{{ 'vaults.col.item' | translate }}</th>
                    <th style="width:80px">{{ 'vaults.col.amount' | translate }}</th>
                    <th style="width:160px">{{ 'vaults.col.quality' | translate }}</th>
                    <th style="width:200px">{{ 'vaults.col.actions' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let it of active.items; let i = index">
                    <td>
                      <div style="width:40px;height:40px;background:var(--surface-2);border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden">
                        <img *ngIf="it.image_url; else noImg" [src]="it.image_url" style="width:100%;height:100%;object-fit:contain;padding:2px">
                        <ng-template #noImg><span class="mi faint">inventory_2</span></ng-template>
                      </div>
                    </td>
                    <td>
                      <div style="font-weight:600">{{ it.name || ('#' + it.Id) }}</div>
                    </td>
                    <td class="mono">×{{ it.Amount }}</td>
                    <td>
                      <div class="qbar"><div class="qfill" [style.width.%]="it.Quality" [class.q-hi]="it.Quality >= 80" [class.q-mid]="it.Quality >= 40 && it.Quality < 80" [class.q-lo]="it.Quality < 40"></div></div>
                      <div class="muted mono" style="font-size:11px;margin-top:2px">Q{{ it.Quality }}</div>
                    </td>
                    <td>
                      <div class="row gap-1">
                        <button class="btn ghost sm" (click)="onRequestList(i)">
                          <span class="mi sm">storefront</span> {{ 'vaults.listOnMarket' | translate }}
                        </button>
                        <button class="btn ghost sm" style="color:var(--rose)" (click)="onDelete(i)">
                          <span class="mi sm">delete</span> {{ 'vaults.delete' | translate }}
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="active.items.length === 0">
                    <td colspan="5">
                      <div class="empty">
                        <span class="mi xxl">inventory_2</span>
                        <div class="empty-title">{{ 'vaults.empty' | translate }}</div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="row gap-2" style="margin-top:16px;justify-content:flex-end">
            <button class="btn secondary" [disabled]="!dirty || saving" (click)="reload()">
              {{ 'common.discard' | translate }}
            </button>
            <button class="btn primary" [disabled]="!dirty || saving" (click)="save()">
              {{ (saving ? 'common.saving' : 'common.save') | translate }}
            </button>
          </div>
          <p *ngIf="saveError" style="color:var(--rose);font-size:13px;margin:8px 0 0 0">{{ saveError | translate }}</p>
        </ng-container>
        <ng-template #detailLoading>
          <div *ngIf="active" style="text-align:center;padding:48px 0"><div class="spinner"></div></div>
        </ng-template>
      </ng-container>
      <ng-template #loadingTpl>
        <div style="text-align:center;padding:48px 0"><div class="spinner"></div></div>
      </ng-template>

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
    .qbar { width: 100%; height: 6px; background: var(--surface-2); border-radius: 3px; overflow: hidden; }
    .qfill { height: 100%; transition: width .2s ease; }
    .qfill.q-hi { background: var(--emerald); }
    .qfill.q-mid { background: var(--amber); }
    .qfill.q-lo { background: var(--rose); }
  `],
})
export class VaultsComponent implements OnInit {
  loadingList = true;
  loadingDetail = false;
  saving = false;
  saveError: string | null = null;

  summaries: VaultSummary[] = [];
  active: VaultDetail | null = null;
  dirty = false;

  listing: EnrichedVaultItem | null = null;
  listingIndex: number | null = null;
  listingBusy = false;
  listingError: string | null = null;

  constructor(private svc: VaultsService, private p2p: P2pService) {}

  ngOnInit() {
    this.svc.getMine().subscribe({
      next: list => {
        this.summaries = list;
        this.loadingList = false;
        if (list.length) this.open(list[0]);
      },
      error: () => { this.loadingList = false; },
    });
  }

  open(v: VaultSummary) {
    if (this.active?.name === v.name) return;
    this.loadingDetail = true;
    this.dirty = false;
    this.svc.getMineByName(v.name).subscribe({
      next: detail => { this.active = detail; this.loadingDetail = false; },
      error: () => { this.loadingDetail = false; },
    });
  }

  reload() {
    if (!this.active) return;
    const cur = this.active;
    this.active = null;
    this.loadingDetail = true;
    this.svc.getMineByName(cur.name).subscribe({
      next: detail => { this.active = detail; this.loadingDetail = false; this.dirty = false; },
      error: () => { this.loadingDetail = false; },
    });
  }

  onDelete(index: number) {
    if (!this.active) return;
    const items = this.active.items.filter((_, i) => i !== index);
    this.active = { ...this.active, items };
    this.dirty = true;
  }

  save() {
    if (!this.active) return;
    this.saving = true;
    this.saveError = null;
    this.svc.updateMine(this.active.name, this.active.items).subscribe({
      next: () => { this.saving = false; this.dirty = false; },
      error: e => { this.saving = false; this.saveError = mapVaultP2pErrorKey(e); },
    });
  }

  onRequestList(index: number) {
    if (!this.active) return;
    this.listingIndex = index;
    this.listing = this.active.items[index];
    this.listingBusy = false;
    this.listingError = null;
  }

  confirmList(price: number) {
    if (!this.active || this.listingIndex == null) return;
    this.listingBusy = true;
    this.listingError = null;
    this.p2p.create({ vault_name: this.active.name, item_index: this.listingIndex, price }).subscribe({
      next: () => {
        if (this.active && this.listingIndex != null) {
          const items = this.active.items.filter((_, i) => i !== this.listingIndex);
          this.active = { ...this.active, items };
        }
        this.listingBusy = false;
        this.cancelList();
        this.dirty = false;
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
