import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { AdminMarketItem, AdminMarketService, Paginated, UpsertPayload } from '../../services/admin-market.service';
import { Item, ItemsService } from '../../services/items.service';

interface FormState {
  item_id: number | null;
  base_price: number;
  target_stock: number;
  elasticity: number;
  amount: number;
  enabled: boolean;
}

@Component({
  selector: 'app-admin-market',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon rose"><span class="mi lg">build</span></div>
        <h1>{{ 'adminMarket.title' | translate }}</h1>
        <span class="badge rose"><span class="mi sm">shield</span>ADMIN</span>
        <div class="page-actions">
          <div class="input-wrap" style="width:260px">
            <span class="mi lead">search</span>
            <input type="search" class="input" [(ngModel)]="q" (ngModelChange)="onSearch($event)" [placeholder]="'adminMarket.search' | translate">
          </div>
          <button (click)="openNew()" class="btn primary">
            <span class="mi sm">add</span> {{ 'adminMarket.add' | translate }}
          </button>
        </div>
      </div>

      <div class="welcome-alert" style="margin-bottom:16px">
        <span class="alert-icon mi">info</span>
        <div>{{ 'adminMarket.supplyDemand' | translate }}</div>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div class="card flush">
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th style="width:64px">{{ 'adminMarket.col.image' | translate }}</th>
                  <th>{{ 'adminMarket.col.id' | translate }}</th>
                  <th>{{ 'adminMarket.col.name' | translate }}</th>
                  <th class="r" [title]="'adminMarket.col.priceTitle' | translate">{{ 'adminMarket.col.price' | translate }}</th>
                  <th class="r" [title]="'adminMarket.col.baseTitle' | translate">{{ 'adminMarket.col.base' | translate }}</th>
                  <th class="r">{{ 'adminMarket.col.stock' | translate }}</th>
                  <th class="r" [title]="'adminMarket.col.targetTitle' | translate">{{ 'adminMarket.col.target' | translate }}</th>
                  <th class="r" [title]="'adminMarket.col.elasTitle' | translate">{{ 'adminMarket.col.elas' | translate }}</th>
                  <th>{{ 'adminMarket.col.enabled' | translate }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let it of items">
                  <td>
                    <div style="width:40px;height:40px;background:var(--surface-2);border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden">
                      <img *ngIf="it.image_url; else noImg" [src]="it.image_url" style="width:100%;height:100%;object-fit:contain;padding:2px">
                      <ng-template #noImg><span class="mi faint">inventory_2</span></ng-template>
                    </div>
                  </td>
                  <td class="mono faint">{{ it.item_id }}</td>
                  <td>
                    <span style="font-weight:600">{{ it.name }}</span>
                    <span *ngIf="it.type_name" class="badge violet" style="margin-left:6px">{{ it.type_name }}</span>
                  </td>
                  <td class="r mono" style="font-weight:600"
                      [style.color]="it.price < it.base_price ? 'var(--emerald)' : (it.price > it.base_price ? 'var(--rose)' : null)">
                    {{ it.price | number }}
                    <span *ngIf="it.price < it.base_price" class="mi sm">trending_down</span>
                    <span *ngIf="it.price > it.base_price" class="mi sm">trending_up</span>
                  </td>
                  <td class="r mono muted">{{ it.base_price | number }}</td>
                  <td class="r mono">{{ it.amount | number }}</td>
                  <td class="r mono muted">{{ it.target_stock | number }}</td>
                  <td class="r mono muted">{{ it.elasticity | number:'1.0-2' }}</td>
                  <td>
                    <button (click)="toggle(it)" class="badge" [class.emerald]="it.enabled" [class.slate]="!it.enabled" style="cursor:pointer;border:none">
                      {{ (it.enabled ? 'adminMarket.on' : 'adminMarket.off') | translate }}
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
                  <td colspan="10">
                    <div class="empty">
                      <span class="mi xxl">inventory_2</span>
                      <div class="empty-title">{{ 'adminMarket.empty' | translate }}</div>
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
            {{ (isNew ? 'adminMarket.addTitle' : 'adminMarket.editTitle') | translate }}
          </h3>
          <div style="display:flex;flex-direction:column;gap:12px">
            <div *ngIf="isNew">
              <label class="muted" style="font-size:12px;display:block;margin-bottom:4px">{{ 'adminMarket.form.pickItem' | translate }}</label>
              <div style="position:relative">
                <input type="search" class="input" [(ngModel)]="pickerQ" (ngModelChange)="onPickerSearch()"
                       [placeholder]="'adminMarket.form.pickItemSearch' | translate">
                <div *ngIf="pickerResults.length > 0 && !selectedItem"
                     style="position:absolute;z-index:10;margin-top:4px;width:100%;max-height:240px;overflow-y:auto;background:var(--surface);border:1px solid var(--border);border-radius:8px;box-shadow:var(--shadow-lg)">
                  <button *ngFor="let r of pickerResults" type="button" (click)="pickItem(r)"
                          style="width:100%;text-align:left;padding:8px 12px;background:transparent;border:none;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;cursor:pointer;color:var(--text)">
                    <div style="width:32px;height:32px;background:var(--surface-2);border-radius:4px;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
                      <img *ngIf="r.image_url; else noPickImg" [src]="r.image_url" style="width:100%;height:100%;object-fit:contain">
                      <ng-template #noPickImg><span class="mi sm faint">inventory_2</span></ng-template>
                    </div>
                    <div style="flex:1;min-width:0">
                      <div style="font-weight:600">{{ r.name }}</div>
                      <div class="muted" style="font-size:11px">#{{ r.id }}<span *ngIf="r.type_name"> · {{ r.type_name }}</span></div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div *ngIf="selectedItem" style="display:flex;align-items:center;gap:12px;background:var(--surface-2);border-radius:8px;padding:12px">
              <div style="width:56px;height:56px;background:var(--surface-3);border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden">
                <img *ngIf="selectedItem.image_url; else noSelImg" [src]="selectedItem.image_url" style="width:100%;height:100%;object-fit:contain;padding:2px">
                <ng-template #noSelImg><span class="mi faint">inventory_2</span></ng-template>
              </div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:600">{{ selectedItem.name }}</div>
                <div class="muted" style="font-size:11px">
                  #{{ selectedItem.id }}
                  <span *ngIf="selectedItem.type_name" class="badge violet" style="margin-left:4px">{{ selectedItem.type_name }}</span>
                </div>
              </div>
              <button *ngIf="isNew" type="button" (click)="clearPick()" class="btn ghost sm"><span class="mi sm">close</span></button>
            </div>

            <div class="row gap-3" style="align-items:stretch">
              <label style="flex:1;display:block">
                <span class="muted" style="font-size:12px">{{ 'adminMarket.form.basePrice' | translate }}</span>
                <input type="number" class="input mono" [(ngModel)]="form.base_price" min="0" step="0.1" style="margin-top:4px">
              </label>
              <label style="flex:1;display:block">
                <span class="muted" style="font-size:12px">{{ 'adminMarket.form.stockNow' | translate }}</span>
                <input type="number" class="input mono" [(ngModel)]="form.amount" min="0" style="margin-top:4px">
              </label>
            </div>
            <div class="row gap-3" style="align-items:stretch">
              <label style="flex:1;display:block">
                <span class="muted" style="font-size:12px">{{ 'adminMarket.form.targetStock' | translate }} <span class="faint">{{ 'adminMarket.form.targetStockHint' | translate }}</span></span>
                <input type="number" class="input mono" [(ngModel)]="form.target_stock" min="1" style="margin-top:4px">
              </label>
              <label style="flex:1;display:block">
                <span class="muted" style="font-size:12px">{{ 'adminMarket.form.elasticity' | translate }} <span class="faint">{{ 'adminMarket.form.elasticityHint' | translate }}</span></span>
                <input type="number" class="input mono" [(ngModel)]="form.elasticity" min="0" max="2" step="0.1" style="margin-top:4px">
              </label>
            </div>

            <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:12px;font-size:12px;display:flex;flex-direction:column;gap:4px">
              <div style="font-weight:600">{{ 'adminMarket.form.preview' | translate }}</div>
              <div [innerHTML]="'adminMarket.form.previewLine1' | translate:{ amount: form.amount, price: '<strong>' + (preview() | number) + '</strong>' }"></div>
              <div class="muted">{{ 'adminMarket.form.previewLine2' | translate:{ target: form.target_stock, base: (form.base_price | number) } }}</div>
            </div>

            <label style="display:flex;align-items:center;gap:8px">
              <input type="checkbox" [(ngModel)]="form.enabled">
              <span>{{ 'adminMarket.form.enabled' | translate }}</span>
            </label>
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
          <h3 style="margin:8px 0 0 0;font-size:16px;font-weight:700">{{ 'adminMarket.deleteConfirm' | translate }}</h3>
          <p class="muted" style="font-size:13px;margin:4px 0 0 0">{{ deleting.name }} <span class="mono">(#{{ deleting.item_id }})</span></p>
          <div class="row gap-2" style="margin-top:20px">
            <button (click)="deleting = null" class="btn secondary" style="flex:1">{{ 'common.cancel' | translate }}</button>
            <button (click)="confirmDelete()" class="btn danger" style="flex:1">{{ 'adminMarket.delete' | translate }}</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminMarketComponent implements OnInit, OnDestroy {
  loading = true;
  saving = false;
  error: string | null = null;
  items: AdminMarketItem[] = [];
  page: Paginated<AdminMarketItem> | null = null;
  pageNum = 1;
  pageLimit = 20;
  q = '';

  private search$ = new Subject<string>();
  private searchSub?: Subscription;

  editing: AdminMarketItem | null = null;
  isNew = false;
  form: FormState = this.emptyForm();
  deleting: AdminMarketItem | null = null;

  pickerQ = '';
  pickerResults: Item[] = [];
  selectedItem: Item | null = null;
  private pickerTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private svc: AdminMarketService,
    private t: TranslateService,
    private itemsSvc: ItemsService,
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
    this.svc.list(this.pageNum, this.pageLimit).subscribe({
      next: p => { this.page = p; this.items = this.applyClientFilter(p.items); this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  private applyClientFilter(arr: AdminMarketItem[]): AdminMarketItem[] {
    const s = this.q.trim().toLowerCase();
    if (!s) return arr;
    return arr.filter(i => i.name.toLowerCase().includes(s) || String(i.item_id).includes(s));
  }

  onSearch(v: string) { this.search$.next(v ?? ''); }
  goPage(page: number, limit: number) {
    this.pageNum = page;
    this.pageLimit = limit;
    this.reload();
  }

  emptyForm(): FormState {
    return { item_id: null, base_price: 100, target_stock: 10, elasticity: 0.5, amount: 10, enabled: true };
  }

  openNew() {
    this.editing = { item_id: 0, name: '', price: 0, amount: 10, base_price: 100, target_stock: 10, elasticity: 0.5, image_url: null, enabled: 1 };
    this.isNew = true;
    this.form = this.emptyForm();
    this.error = null;
    this.pickerQ = '';
    this.pickerResults = [];
    this.selectedItem = null;
  }

  openEdit(it: AdminMarketItem) {
    this.editing = it;
    this.isNew = false;
    this.form = {
      item_id: it.item_id,
      base_price: it.base_price, target_stock: it.target_stock, elasticity: it.elasticity,
      amount: it.amount, enabled: !!it.enabled,
    };
    this.selectedItem = {
      id: it.item_id, name: it.name, description: null,
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
      this.itemsSvc.adminList(q, null, 1, 20).subscribe({
        next: p => this.pickerResults = p.items,
        error: () => this.pickerResults = [],
      });
    }, 300);
  }

  pickItem(r: Item) {
    this.selectedItem = r;
    this.form.item_id = r.id;
    this.pickerResults = [];
    this.pickerQ = '';
  }

  clearPick() {
    this.selectedItem = null;
    this.form.item_id = null;
    this.pickerQ = '';
    this.pickerResults = [];
  }

  /** Local preview of the supply/demand formula (matches backend PricingService.compute). */
  preview(): number {
    const base = Number(this.form.base_price) || 0;
    if (base <= 0) return 0;
    const e = Math.max(0, Math.min(Number(this.form.elasticity) || 0, 2));
    const tgt = Math.max(1, Number(this.form.target_stock) || 1);
    const cur = Math.max(1, Number(this.form.amount) || 1);
    const raw = base * Math.pow(tgt / cur, e);
    return Math.round(Math.max(base * 0.1, Math.min(raw, base * 10)));
  }

  save() {
    if (!this.form.item_id) {
      this.error = this.t.instant('adminMarket.errors.missing');
      return;
    }
    this.saving = true;
    const payload: UpsertPayload = {
      item_id: Number(this.form.item_id),
      base_price: Number(this.form.base_price) || 0,
      target_stock: Number(this.form.target_stock) || 1,
      elasticity: Number(this.form.elasticity) || 0,
      amount: Number(this.form.amount) || 0,
      enabled: this.form.enabled !== false,
    };
    this.svc.upsert(payload).subscribe({
      next: () => { this.saving = false; this.editing = null; this.reload(); },
      error: e => { this.saving = false; this.error = e?.error?.message?.join?.(', ') || e?.error?.message || this.t.instant('adminMarket.errors.saveFail'); },
    });
  }

  toggle(it: AdminMarketItem) {
    this.svc.toggle(it.item_id, !it.enabled).subscribe(updated => {
      const i = this.items.findIndex(x => x.item_id === it.item_id);
      if (i >= 0) this.items[i] = updated;
    });
  }

  confirmDel(it: AdminMarketItem) { this.deleting = it; }
  confirmDelete() {
    if (!this.deleting) return;
    const id = this.deleting.item_id;
    this.svc.remove(id).subscribe(() => {
      this.deleting = null;
      this.reload();
    });
  }
}
