import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { AdminVehicleMarketItem, Paginated, VehicleMarketService, VehicleUpsertPayload } from '../../services/vehicle-market.service';
import { Vehicle, VehiclesService } from '../../services/vehicles.service';

interface FormState {
  vehicle_id: number | null;
  price: number;
  amount: number;
  enabled: boolean;
  meowcoin_price: number | null; // optional Meowcoin price; null = not Meowcoin-buyable
}

@Component({
  selector: 'app-admin-vehicle-market',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon rose"><span class="mi lg">directions_car</span></div>
        <h1>{{ 'adminVehicleMarket.title' | translate }}</h1>
        <span class="badge rose"><span class="mi sm">shield</span>ADMIN</span>
        <div class="page-actions">
          <div class="input-wrap" style="width:260px">
            <span class="mi lead">search</span>
            <input type="search" class="input" [(ngModel)]="q" (ngModelChange)="onSearch($event)" [placeholder]="'adminVehicleMarket.search' | translate">
          </div>
          <button (click)="openNew()" class="btn primary">
            <span class="mi sm">add</span> {{ 'adminVehicleMarket.add' | translate }}
          </button>
        </div>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div class="card flush">
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th style="width:64px">{{ 'adminVehicleMarket.col.image' | translate }}</th>
                  <th>{{ 'adminVehicleMarket.col.id' | translate }}</th>
                  <th>{{ 'adminVehicleMarket.col.name' | translate }}</th>
                  <th class="r">{{ 'adminVehicleMarket.col.price' | translate }}</th>
                  <th class="r">{{ 'adminVehicleMarket.col.stock' | translate }}</th>
                  <th>{{ 'adminVehicleMarket.col.enabled' | translate }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let it of items">
                  <td>
                    <div style="width:40px;height:40px;background:var(--surface-2);border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden">
                      <img *ngIf="it.image_url; else noImg" [src]="it.image_url" style="width:100%;height:100%;object-fit:contain;padding:2px">
                      <ng-template #noImg><span class="mi faint">directions_car</span></ng-template>
                    </div>
                  </td>
                  <td class="mono faint">{{ it.vehicle_id }}</td>
                  <td>
                    <span style="font-weight:600">{{ it.name }}</span>
                    <span *ngIf="it.type_name" class="badge violet" style="margin-left:6px">{{ it.type_name }}</span>
                  </td>
                  <td class="r mono" style="font-weight:600">{{ it.price | number }}</td>
                  <td class="r mono">{{ it.amount | number }}</td>
                  <td>
                    <button (click)="toggle(it)" class="badge" [class.emerald]="it.enabled" [class.slate]="!it.enabled" style="cursor:pointer;border:none">
                      {{ (it.enabled ? 'adminVehicleMarket.on' : 'adminVehicleMarket.off') | translate }}
                    </button>
                  </td>
                  <td>
                    <div class="row gap-1">
                      <button (click)="openEdit(it)" class="btn ghost sm"><span class="mi sm">edit</span></button>
                      <button (click)="confirmDel(it)" class="btn ghost sm" style="color:var(--rose)"><span class="mi sm">delete</span></button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="items.length === 0">
                  <td colspan="7">
                    <div class="empty">
                      <span class="mi xxl">directions_car</span>
                      <div class="empty-title">{{ 'adminVehicleMarket.empty' | translate }}</div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
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

      <!-- Edit/Create modal -->
      <div *ngIf="editing" class="modal-backdrop">
        <div class="modal-card tactical" style="max-width:560px">
          <h3 style="display:flex;align-items:center;gap:8px;margin:0 0 16px 0;font-size:18px;font-weight:700">
            <span class="mi">{{ isNew ? 'add_circle' : 'edit' }}</span>
            {{ (isNew ? 'adminVehicleMarket.addTitle' : 'adminVehicleMarket.editTitle') | translate }}
          </h3>
          <div style="display:flex;flex-direction:column;gap:12px">
            <div *ngIf="isNew">
              <label class="muted" style="font-size:12px;display:block;margin-bottom:4px">{{ 'adminVehicleMarket.form.pickVehicle' | translate }}</label>
              <div style="position:relative">
                <input type="search" class="input" [(ngModel)]="pickerQ" (ngModelChange)="onPickerSearch()"
                       [placeholder]="'adminVehicleMarket.form.pickVehicleSearch' | translate">
                <div *ngIf="pickerResults.length > 0 && !selectedVehicle"
                     style="position:absolute;z-index:10;margin-top:4px;width:100%;max-height:240px;overflow-y:auto;background:var(--surface);border:1px solid var(--border);border-radius:8px;box-shadow:var(--shadow-lg)">
                  <button *ngFor="let r of pickerResults" type="button" (click)="pickVehicle(r)"
                          style="width:100%;text-align:left;padding:8px 12px;background:transparent;border:none;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;cursor:pointer;color:var(--text)">
                    <div style="width:32px;height:32px;background:var(--surface-2);border-radius:4px;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
                      <img *ngIf="r.image_url; else noPickImg" [src]="r.image_url" style="width:100%;height:100%;object-fit:contain">
                      <ng-template #noPickImg><span class="mi sm faint">directions_car</span></ng-template>
                    </div>
                    <div style="flex:1;min-width:0">
                      <div style="font-weight:600">{{ r.name }}</div>
                      <div class="muted" style="font-size:11px">#{{ r.id }}<span *ngIf="r.type_name"> · {{ r.type_name }}</span></div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div *ngIf="selectedVehicle" style="display:flex;align-items:center;gap:12px;background:var(--surface-2);border-radius:8px;padding:12px">
              <div style="width:56px;height:56px;background:var(--surface-3);border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden">
                <img *ngIf="selectedVehicle.image_url; else noSelImg" [src]="selectedVehicle.image_url" style="width:100%;height:100%;object-fit:contain;padding:2px">
                <ng-template #noSelImg><span class="mi faint">directions_car</span></ng-template>
              </div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:600">{{ selectedVehicle.name }}</div>
                <div class="muted" style="font-size:11px">
                  #{{ selectedVehicle.id }}
                  <span *ngIf="selectedVehicle.type_name" class="badge violet" style="margin-left:4px">{{ selectedVehicle.type_name }}</span>
                </div>
              </div>
              <button *ngIf="isNew" type="button" (click)="clearPick()" class="btn ghost sm"><span class="mi sm">close</span></button>
            </div>

            <div class="row gap-3" style="align-items:stretch">
              <label style="flex:1;display:block">
                <span class="muted" style="font-size:12px">{{ 'adminVehicleMarket.form.price' | translate }}</span>
                <input type="number" class="input mono" [(ngModel)]="form.price" min="0" step="0.1" style="margin-top:4px">
              </label>
              <label style="flex:1;display:block">
                <span class="muted" style="font-size:12px">{{ 'adminVehicleMarket.form.stock' | translate }}</span>
                <input type="number" class="input mono" [(ngModel)]="form.amount" min="0" style="margin-top:4px">
              </label>
            </div>
            <div class="row gap-3" style="align-items:stretch">
              <label style="flex:1;display:block">
                <span class="muted" style="font-size:12px">{{ 'adminVehicleMarket.form.meowcoinPrice' | translate }}</span>
                <input type="number" class="input mono" [(ngModel)]="form.meowcoin_price" min="0" step="0.01" style="margin-top:4px" placeholder="—">
              </label>
            </div>

            <div class="row gap-3">
              <label style="flex:1;display:flex;align-items:center;gap:8px">
                <input type="checkbox" [(ngModel)]="form.enabled">
                <span>{{ 'adminVehicleMarket.form.enabled' | translate }}</span>
              </label>
            </div>
          </div>
          <p *ngIf="error" style="color:var(--rose);font-size:13px;margin:12px 0 0 0">{{ error }}</p>
          <div class="row gap-2" style="margin-top:20px">
            <button (click)="editing = null" class="btn secondary" style="flex:1">{{ 'common.cancel' | translate }}</button>
            <button (click)="save()" [disabled]="saving" class="btn primary" style="flex:1">
              {{ (saving ? 'common.saving' : 'common.save') | translate }}
            </button>
          </div>
        </div>
      </div>

      <!-- Delete confirm -->
      <div *ngIf="deleting" class="modal-backdrop">
        <div class="modal-card tactical" style="max-width:380px;text-align:center">
          <span class="mi xl" style="color:var(--rose)">warning</span>
          <h3 style="margin:8px 0 0 0;font-size:16px;font-weight:700">{{ 'adminVehicleMarket.deleteConfirm' | translate }}</h3>
          <p class="muted" style="font-size:13px;margin:4px 0 0 0">{{ deleting.name }} <span class="mono">(#{{ deleting.vehicle_id }})</span></p>
          <div class="row gap-2" style="margin-top:20px">
            <button (click)="deleting = null" class="btn secondary" style="flex:1">{{ 'common.cancel' | translate }}</button>
            <button (click)="confirmDelete()" class="btn danger" style="flex:1">{{ 'adminVehicleMarket.delete' | translate }}</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminVehicleMarketComponent implements OnInit, OnDestroy {
  loading = true;
  saving = false;
  error: string | null = null;
  items: AdminVehicleMarketItem[] = [];
  page: Paginated<AdminVehicleMarketItem> | null = null;
  pageNum = 1;
  pageLimit = 20;
  q = '';

  private search$ = new Subject<string>();
  private searchSub?: Subscription;

  editing: AdminVehicleMarketItem | null = null;
  isNew = false;
  form: FormState = this.emptyForm();
  deleting: AdminVehicleMarketItem | null = null;

  pickerQ = '';
  pickerResults: Vehicle[] = [];
  selectedVehicle: Vehicle | null = null;
  private pickerTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private svc: VehicleMarketService,
    private t: TranslateService,
    private vehiclesSvc: VehiclesService,
  ) {}

  ngOnInit() {
    this.searchSub = this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.pageNum = 1;
      this.reload();
    });
    this.reload();
  }

  ngOnDestroy() { this.searchSub?.unsubscribe(); }

  reload() {
    this.loading = true;
    this.svc.adminList(this.pageNum, this.pageLimit).subscribe({
      next: p => { this.page = p; this.items = this.applyClientFilter(p.items); this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  private applyClientFilter(arr: AdminVehicleMarketItem[]): AdminVehicleMarketItem[] {
    const s = this.q.trim().toLowerCase();
    if (!s) return arr;
    return arr.filter(i => i.name.toLowerCase().includes(s) || String(i.vehicle_id).includes(s));
  }

  onSearch(v: string) { this.search$.next(v ?? ''); }
  goPage(page: number, limit: number) {
    this.pageNum = page;
    this.pageLimit = limit;
    this.reload();
  }

  emptyForm(): FormState {
    return { vehicle_id: null, price: 100, amount: 1, enabled: true, meowcoin_price: null };
  }

  openNew() {
    this.editing = { vehicle_id: 0, name: '', price: 0, amount: 1, image_url: null, enabled: 1 };
    this.isNew = true;
    this.form = this.emptyForm();
    this.error = null;
    this.pickerQ = '';
    this.pickerResults = [];
    this.selectedVehicle = null;
  }

  openEdit(it: AdminVehicleMarketItem) {
    this.editing = it;
    this.isNew = false;
    this.form = {
      vehicle_id: it.vehicle_id,
      price: it.price,
      amount: it.amount,
      enabled: !!it.enabled,
      meowcoin_price: it.meowcoin_price ?? null,
    };
    this.selectedVehicle = {
      id: it.vehicle_id, name: it.name, description: null,
      image_url: it.image_url, type_id: it.type_id ?? null, type_name: it.type_name ?? null,
    };
    this.pickerQ = '';
    this.pickerResults = [];
    this.error = null;
  }

  onPickerSearch() {
    if (this.pickerTimer) clearTimeout(this.pickerTimer);
    const q = this.pickerQ.trim();
    if (!q) { this.pickerResults = []; return; }
    this.pickerTimer = setTimeout(() => {
      this.vehiclesSvc.adminList(q, null, 1, 20).subscribe({
        next: p => this.pickerResults = p.items,
        error: () => this.pickerResults = [],
      });
    }, 300);
  }

  pickVehicle(r: Vehicle) {
    this.selectedVehicle = r;
    this.form.vehicle_id = r.id;
    this.pickerResults = [];
    this.pickerQ = '';
  }

  clearPick() {
    this.selectedVehicle = null;
    this.form.vehicle_id = null;
    this.pickerQ = '';
    this.pickerResults = [];
  }

  save() {
    if (!this.form.vehicle_id) {
      this.error = this.t.instant('adminVehicleMarket.errors.missing');
      return;
    }
    this.saving = true;
    const payload: VehicleUpsertPayload = {
      vehicle_id: Number(this.form.vehicle_id),
      price: Number(this.form.price) || 0,
      amount: Number(this.form.amount) || 0,
      enabled: this.form.enabled !== false,
      // Empty input → null (clears the Meowcoin price); otherwise the numeric value.
      meowcoin_price: this.form.meowcoin_price == null || (this.form.meowcoin_price as any) === '' || !Number.isFinite(Number(this.form.meowcoin_price))
        ? null : Number(this.form.meowcoin_price),
    };
    this.svc.upsert(payload).subscribe({
      next: () => { this.saving = false; this.editing = null; this.reload(); },
      error: e => { this.saving = false; this.error = e?.error?.message?.join?.(', ') || e?.error?.message || this.t.instant('adminVehicleMarket.errors.saveFail'); },
    });
  }

  toggle(it: AdminVehicleMarketItem) {
    this.svc.toggleEnabled(it.vehicle_id, !it.enabled).subscribe(updated => {
      const i = this.items.findIndex(x => x.vehicle_id === it.vehicle_id);
      if (i >= 0) this.items[i] = updated;
    });
  }

  confirmDel(it: AdminVehicleMarketItem) { this.deleting = it; }
  confirmDelete() {
    if (!this.deleting) return;
    const id = this.deleting.vehicle_id;
    this.svc.remove(id).subscribe(() => {
      this.deleting = null;
      this.reload();
    });
  }
}
