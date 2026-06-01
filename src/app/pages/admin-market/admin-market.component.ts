import { Component, OnDestroy, OnInit } from '@angular/core';
import { forkJoin, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { AdminMarketItem, AdminMarketService, ImportResult, MarketExportRow, Paginated, UpsertPayload } from '../../services/admin-market.service';
import { Item, ItemsService } from '../../services/items.service';

interface FormState {
  item_id: number | null;
  base_price: number;
  target_stock: number;
  elasticity: number;
  amount: number;
  enabled: boolean;
  // "create new (buy-only)" path when the item isn't in Master Items
  createNew: boolean;
  name: string;
  image_url: string;
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
          <button (click)="exportJson()" [disabled]="exporting" class="btn ghost" [title]="'adminMarket.exportHint' | translate">
            <span class="mi sm">download</span> {{ 'adminMarket.export' | translate }}
          </button>
          <button (click)="fileInput.click()" class="btn ghost" [title]="'adminMarket.importHint' | translate">
            <span class="mi sm">upload</span> {{ 'adminMarket.import' | translate }}
          </button>
          <input #fileInput type="file" accept="application/json,.json" hidden (change)="onImportFile($event)">
          <button (click)="openNew()" class="btn primary">
            <span class="mi sm">add</span> {{ 'adminMarket.add' | translate }}
          </button>
        </div>
      </div>

      <div class="welcome-alert" style="margin-bottom:16px">
        <span class="alert-icon mi">info</span>
        <div>{{ 'adminMarket.supplyDemand' | translate }}</div>
      </div>

      <!-- Bulk action bar -->
      <div *ngIf="selected.size > 0" class="card flush" style="padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span class="badge violet"><span class="mi sm">check_box</span>{{ 'adminMarket.bulk.selected' | translate:{ n: selected.size } }}</span>
        <button (click)="bulkSetEnabled(true)" [disabled]="bulkBusy" class="btn ghost sm">
          <span class="mi sm">toggle_on</span> {{ 'adminMarket.bulk.enable' | translate }}
        </button>
        <button (click)="bulkSetEnabled(false)" [disabled]="bulkBusy" class="btn ghost sm">
          <span class="mi sm">toggle_off</span> {{ 'adminMarket.bulk.disable' | translate }}
        </button>
        <button (click)="bulkDeleting = true" [disabled]="bulkBusy" class="btn ghost sm" style="color:var(--rose)">
          <span class="mi sm">delete</span> {{ 'adminMarket.bulk.delete' | translate }}
        </button>
        <button (click)="exportSelected()" [disabled]="bulkBusy" class="btn ghost sm">
          <span class="mi sm">download</span> {{ 'adminMarket.bulk.export' | translate }}
        </button>
        <button (click)="clearSelection()" class="btn ghost sm" style="margin-left:auto">{{ 'adminMarket.bulk.clear' | translate }}</button>
        <span *ngIf="bulkError" style="color:var(--rose);font-size:13px">{{ bulkError }}</span>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div class="card flush">
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th style="width:40px;text-align:center">
                    <input type="checkbox" [checked]="allSelected" [indeterminate]="someSelected && !allSelected" (change)="toggleSelectAll($event)">
                  </th>
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
                <tr *ngFor="let it of items" [class.row-selected]="selected.has(it.item_id)">
                  <td style="text-align:center">
                    <input type="checkbox" [checked]="selected.has(it.item_id)" (change)="toggleSelect(it.item_id)">
                  </td>
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
                  <td colspan="11">
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
            <!-- mode toggle: pick existing catalog item, or create a buy-only stub -->
            <div *ngIf="isNew" class="row gap-2">
              <button type="button" class="btn sm" [class.primary]="!form.createNew" [class.ghost]="form.createNew" (click)="setCreateNew(false)">
                <span class="mi sm">search</span> {{ 'adminMarket.form.fromCatalog' | translate }}
              </button>
              <button type="button" class="btn sm" [class.primary]="form.createNew" [class.ghost]="!form.createNew" (click)="setCreateNew(true)">
                <span class="mi sm">add_circle</span> {{ 'adminMarket.form.createNew' | translate }}
              </button>
            </div>

            <!-- create-new (buy-only) inputs -->
            <div *ngIf="isNew && form.createNew" style="display:flex;flex-direction:column;gap:12px">
              <div class="welcome-alert" style="font-size:12px">
                <span class="alert-icon mi">info</span>
                <div>{{ 'adminMarket.form.createNewHint' | translate }}</div>
              </div>
              <div class="row gap-3" style="align-items:stretch">
                <label style="flex:1;display:block">
                  <span class="muted" style="font-size:12px">{{ 'adminMarket.form.newItemId' | translate }}</span>
                  <input type="number" min="1" class="input mono" [(ngModel)]="form.item_id" style="margin-top:4px">
                </label>
                <label style="flex:2;display:block">
                  <span class="muted" style="font-size:12px">{{ 'adminMarket.form.newItemName' | translate }}</span>
                  <input type="text" maxlength="128" class="input" [(ngModel)]="form.name" style="margin-top:4px">
                </label>
              </div>
              <label style="display:block">
                <span class="muted" style="font-size:12px">{{ 'adminMarket.form.newItemImage' | translate }}</span>
                <input type="url" maxlength="512" class="input" [(ngModel)]="form.image_url" style="margin-top:4px">
              </label>
            </div>

            <div *ngIf="isNew && !form.createNew">
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

      <!-- Bulk delete confirm -->
      <div *ngIf="bulkDeleting" class="modal-backdrop">
        <div class="modal-card tactical" style="max-width:380px;text-align:center">
          <span class="mi xl" style="color:var(--rose)">warning</span>
          <h3 style="margin:8px 0 0 0;font-size:16px;font-weight:700">{{ 'adminMarket.bulk.deleteConfirm' | translate:{ n: selected.size } }}</h3>
          <div class="row gap-2" style="margin-top:20px">
            <button (click)="bulkDeleting = false" class="btn secondary" style="flex:1">{{ 'common.cancel' | translate }}</button>
            <button (click)="bulkDelete()" [disabled]="bulkBusy" class="btn danger" style="flex:1">{{ 'adminMarket.delete' | translate }}</button>
          </div>
        </div>
      </div>

      <!-- Import confirm / result -->
      <div *ngIf="importOpen" class="modal-backdrop">
        <div class="modal-card tactical" style="max-width:480px">
          <h3 style="display:flex;align-items:center;gap:8px;margin:0 0 16px 0;font-size:18px;font-weight:700">
            <span class="mi">upload</span>{{ 'adminMarket.importTitle' | translate }}
          </h3>

          <!-- stage 1: confirm parsed file -->
          <ng-container *ngIf="!importResult">
            <p *ngIf="importError" style="color:var(--rose);font-size:13px;margin:0 0 8px 0">{{ importError }}</p>
            <div *ngIf="!importError" style="background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:12px;font-size:13px">
              <div [innerHTML]="'adminMarket.importReady' | translate:{ count: '<strong>' + importRows.length + '</strong>' }"></div>
              <div class="muted" style="font-size:12px;margin-top:4px">{{ 'adminMarket.importNote' | translate }}</div>
            </div>
            <div class="row gap-2" style="margin-top:20px">
              <button (click)="closeImport()" class="btn secondary" style="flex:1">{{ 'common.cancel' | translate }}</button>
              <button (click)="confirmImport()" [disabled]="importing || !!importError || importRows.length === 0" class="btn primary" style="flex:1">
                {{ (importing ? 'common.saving' : 'adminMarket.import') | translate }}
              </button>
            </div>
          </ng-container>

          <!-- stage 2: result -->
          <ng-container *ngIf="importResult as r">
            <div class="row gap-2" style="margin-bottom:12px">
              <span class="badge emerald"><span class="mi sm">add_circle</span> {{ r.created }} {{ 'adminMarket.importCreated' | translate }}</span>
              <span class="badge violet"><span class="mi sm">sync</span> {{ r.updated }} {{ 'adminMarket.importUpdated' | translate }}</span>
              <span *ngIf="r.failed.length > 0" class="badge rose"><span class="mi sm">error</span> {{ r.failed.length }} {{ 'adminMarket.importFailed' | translate }}</span>
            </div>
            <div *ngIf="r.failed.length > 0" style="max-height:180px;overflow-y:auto;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:8px;font-size:12px">
              <div *ngFor="let f of r.failed" class="row gap-2" style="padding:2px 0">
                <span class="mono faint">#{{ f.item_id }}</span><span class="muted">{{ f.error }}</span>
              </div>
            </div>
            <div class="row gap-2" style="margin-top:20px">
              <button (click)="closeImport()" class="btn primary" style="flex:1">{{ 'common.done' | translate }}</button>
            </div>
          </ng-container>
        </div>
      </div>
    </div>
  `,
  styles: [`
    tr.row-selected td { background: color-mix(in srgb, var(--violet) 12%, transparent); }
    input[type=checkbox] { width:16px; height:16px; cursor:pointer; accent-color: var(--violet); }
  `],
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

  // Bulk selection (keyed by item_id, like Master Items)
  selected = new Set<number>();
  bulkBusy = false;
  bulkError: string | null = null;
  bulkDeleting = false;

  // Export / Import
  exporting = false;
  importOpen = false;
  importing = false;
  importError: string | null = null;
  importRows: MarketExportRow[] = [];
  importResult: ImportResult | null = null;

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
    this.clearSelection();
    this.svc.list(this.pageNum, this.pageLimit).subscribe({
      next: p => { this.page = p; this.items = this.applyClientFilter(p.items); this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  // ---- Bulk selection -----------------------------------------------------
  get allSelected(): boolean {
    return this.items.length > 0 && this.items.every(it => this.selected.has(it.item_id));
  }
  get someSelected(): boolean {
    return this.items.some(it => this.selected.has(it.item_id));
  }
  toggleSelect(id: number) {
    if (this.selected.has(id)) this.selected.delete(id);
    else this.selected.add(id);
  }
  toggleSelectAll(ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    if (checked) this.items.forEach(it => this.selected.add(it.item_id));
    else this.items.forEach(it => this.selected.delete(it.item_id));
  }
  clearSelection() {
    this.selected.clear();
    this.bulkError = null;
    this.bulkDeleting = false;
  }

  private selectedItems(): AdminMarketItem[] {
    return this.items.filter(it => this.selected.has(it.item_id));
  }

  /** Enable/disable every selected row in one batch (reuses the per-row toggle endpoint). */
  bulkSetEnabled(enabled: boolean) {
    const targets = this.selectedItems().filter(it => !!it.enabled !== enabled);
    if (targets.length === 0) { this.clearSelection(); return; }
    this.bulkBusy = true;
    this.bulkError = null;
    forkJoin(targets.map(it => this.svc.toggle(it.item_id, enabled))).subscribe({
      next: () => { this.bulkBusy = false; this.reload(); },
      error: e => { this.bulkBusy = false; this.bulkError = e?.error?.message || 'Bulk update failed'; },
    });
  }

  bulkDelete() {
    const targets = this.selectedItems();
    if (targets.length === 0) { this.bulkDeleting = false; return; }
    this.bulkBusy = true;
    this.bulkError = null;
    forkJoin(targets.map(it => this.svc.remove(it.item_id))).subscribe({
      next: () => { this.bulkBusy = false; this.bulkDeleting = false; this.reload(); },
      error: e => { this.bulkBusy = false; this.bulkDeleting = false; this.bulkError = e?.error?.message || 'Bulk delete failed'; },
    });
  }

  /** Download just the selected rows as JSON (subset of the full Export). */
  exportSelected() {
    const rows = this.selectedItems().map(it => ({
      item_id: it.item_id,
      base_price: it.base_price,
      target_stock: it.target_stock,
      elasticity: it.elasticity,
      amount: it.amount,
      enabled: !!it.enabled,
    }));
    if (rows.length === 0) return;
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `market-selected-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
    return { item_id: null, base_price: 100, target_stock: 10, elasticity: 0.5, amount: 10, enabled: true,
             createNew: false, name: '', image_url: '' };
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
      createNew: false, name: it.name ?? '', image_url: it.image_url ?? '',
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

  /** Switch the Add modal between "pick from catalog" and "create new (buy-only)". */
  setCreateNew(v: boolean) {
    this.form.createNew = v;
    this.error = null;
    this.clearPick();
    if (v) {
      // A buy-only entry: the shop purchases it but doesn't list it for sale.
      this.form.enabled = false;
      this.form.name = '';
      this.form.image_url = '';
    } else {
      this.form.enabled = true;
    }
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
    if (this.form.createNew) {
      if (!this.form.item_id || Number(this.form.item_id) <= 0) {
        this.error = this.t.instant('adminMarket.errors.missingId');
        return;
      }
      if (!this.form.name.trim()) {
        this.error = this.t.instant('adminMarket.errors.missingName');
        return;
      }
    } else if (!this.form.item_id) {
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
    if (this.form.createNew) {
      payload.create_if_missing = true;
      payload.name = this.form.name.trim();
      const img = this.form.image_url.trim();
      if (img) payload.image_url = img;
    }
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

  // ---- Export / Import ----------------------------------------------------
  exportJson() {
    this.exporting = true;
    this.svc.exportAll().subscribe({
      next: rows => {
        this.exporting = false;
        const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const stamp = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `market-export-${stamp}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => { this.exporting = false; },
    });
  }

  onImportFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow re-selecting the same file later
    if (!file) return;

    this.importOpen = true;
    this.importResult = null;
    this.importError = null;
    this.importRows = [];

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const rows = Array.isArray(parsed) ? parsed : parsed?.items;
        if (!Array.isArray(rows)) throw new Error('not-array');
        this.importRows = rows.filter((r: any) => r && Number.isFinite(Number(r.item_id)));
        if (this.importRows.length === 0) {
          this.importError = this.t.instant('adminMarket.importEmpty');
        }
      } catch {
        this.importError = this.t.instant('adminMarket.importBadFile');
      }
    };
    reader.onerror = () => { this.importError = this.t.instant('adminMarket.importBadFile'); };
    reader.readAsText(file);
  }

  confirmImport() {
    if (this.importRows.length === 0) return;
    this.importing = true;
    this.svc.import(this.importRows).subscribe({
      next: res => { this.importing = false; this.importResult = res; this.reload(); },
      error: e => {
        this.importing = false;
        this.importError = e?.error?.message?.join?.(', ') || e?.error?.message || this.t.instant('adminMarket.errors.saveFail');
      },
    });
  }

  closeImport() {
    this.importOpen = false;
    this.importRows = [];
    this.importResult = null;
    this.importError = null;
    this.importing = false;
  }
}
