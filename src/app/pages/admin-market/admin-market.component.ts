import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AdminMarketItem, AdminMarketService, UpsertPayload } from '../../services/admin-market.service';
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
    <div class="max-w-7xl mx-auto p-4 space-y-4">
      <header class="flex items-center justify-between gap-2">
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <span class="mi lg text-rose-500">build</span> {{ 'adminMarket.title' | translate }}
        </h1>
        <button (click)="openNew()" class="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg flex items-center gap-1">
          <span class="mi">add</span> {{ 'adminMarket.add' | translate }}
        </button>
      </header>

      <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-sm flex gap-2">
        <span class="mi text-blue-500">info</span>
        <div>{{ 'adminMarket.supplyDemand' | translate }}</div>
      </div>

      <input type="search" [(ngModel)]="q" [placeholder]="'adminMarket.search' | translate"
             class="w-full sm:w-80 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800">

      <ng-container *ngIf="!loading; else loadingTpl">
        <div class="overflow-x-auto bg-white dark:bg-slate-800 rounded-xl shadow">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-700/50 text-left">
              <tr>
                <th class="p-3">{{ 'adminMarket.col.image' | translate }}</th>
                <th class="p-3">{{ 'adminMarket.col.id' | translate }}</th>
                <th class="p-3">{{ 'adminMarket.col.name' | translate }}</th>
                <th class="p-3 text-right" [title]="'adminMarket.col.priceTitle' | translate">{{ 'adminMarket.col.price' | translate }}</th>
                <th class="p-3 text-right" [title]="'adminMarket.col.baseTitle' | translate">{{ 'adminMarket.col.base' | translate }}</th>
                <th class="p-3 text-right">{{ 'adminMarket.col.stock' | translate }}</th>
                <th class="p-3 text-right" [title]="'adminMarket.col.targetTitle' | translate">{{ 'adminMarket.col.target' | translate }}</th>
                <th class="p-3 text-right" [title]="'adminMarket.col.elasTitle' | translate">{{ 'adminMarket.col.elas' | translate }}</th>
                <th class="p-3 text-center">{{ 'adminMarket.col.enabled' | translate }}</th>
                <th class="p-3"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let it of filtered()" class="border-t border-slate-100 dark:border-slate-700">
                <td class="p-3">
                  <div class="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center overflow-hidden">
                    <img *ngIf="it.image_url; else noImg" [src]="it.image_url" class="w-full h-full object-contain p-1">
                    <ng-template #noImg><span class="mi text-slate-400">inventory_2</span></ng-template>
                  </div>
                </td>
                <td class="p-3 font-mono text-xs">{{ it.item_id }}</td>
                <td class="p-3 font-medium">
                  {{ it.name }}
                  <span *ngIf="it.type_name"
                        class="ml-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                    {{ it.type_name }}
                  </span>
                </td>
                <td class="p-3 text-right font-semibold"
                    [class.text-emerald-600]="it.price < it.base_price"
                    [class.text-rose-600]="it.price > it.base_price">
                  {{ it.price | number }}
                  <span *ngIf="it.price < it.base_price" class="mi text-xs">trending_down</span>
                  <span *ngIf="it.price > it.base_price" class="mi text-xs">trending_up</span>
                </td>
                <td class="p-3 text-right text-slate-500">{{ it.base_price | number }}</td>
                <td class="p-3 text-right">{{ it.amount | number }}</td>
                <td class="p-3 text-right text-slate-500">{{ it.target_stock | number }}</td>
                <td class="p-3 text-right text-slate-500">{{ it.elasticity | number:'1.0-2' }}</td>
                <td class="p-3 text-center">
                  <button (click)="toggle(it)" class="px-2 py-1 rounded text-xs"
                          [class.bg-emerald-100]="it.enabled" [class.text-emerald-700]="it.enabled"
                          [class.bg-slate-200]="!it.enabled" [class.text-slate-500]="!it.enabled">
                    {{ (it.enabled ? 'adminMarket.on' : 'adminMarket.off') | translate }}
                  </button>
                </td>
                <td class="p-3 text-right whitespace-nowrap">
                  <button (click)="openEdit(it)" class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                    <span class="mi">edit</span>
                  </button>
                  <button (click)="confirmDel(it)" class="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500">
                    <span class="mi">delete</span>
                  </button>
                </td>
              </tr>
              <tr *ngIf="filtered().length === 0">
                <td colspan="10" class="p-12 text-center text-slate-400">{{ 'adminMarket.empty' | translate }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>
      <ng-template #loadingTpl>
        <div class="text-center py-12">
          <div class="inline-block w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </ng-template>

      <!-- Edit/Create modal -->
      <div *ngIf="editing" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 my-8">
          <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
            <span class="mi">{{ isNew ? 'add_circle' : 'edit' }}</span>
            {{ (isNew ? 'adminMarket.addTitle' : 'adminMarket.editTitle') | translate }}
          </h3>
          <div class="space-y-3 text-sm">
            <!-- Item picker (new) / read-only display (edit) -->
            <div *ngIf="isNew" class="space-y-2">
              <span class="text-slate-500">{{ 'adminMarket.form.pickItem' | translate }}</span>
              <div class="relative">
                <input type="search" [(ngModel)]="pickerQ" (ngModelChange)="onPickerSearch()"
                       [placeholder]="'adminMarket.form.pickItemSearch' | translate"
                       class="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700">
                <div *ngIf="pickerResults.length > 0 && !selectedItem"
                     class="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
                  <button *ngFor="let r of pickerResults" type="button" (click)="pickItem(r)"
                          class="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                    <div class="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img *ngIf="r.image_url; else noPickImg" [src]="r.image_url" class="w-full h-full object-contain">
                      <ng-template #noPickImg><span class="mi text-slate-400 text-sm">inventory_2</span></ng-template>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="font-medium truncate">{{ r.name }}</p>
                      <p class="text-xs text-slate-500">#{{ r.id }}<span *ngIf="r.type_name"> · {{ r.type_name }}</span></p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <!-- Selected item preview -->
            <div *ngIf="selectedItem" class="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
              <div class="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center overflow-hidden">
                <img *ngIf="selectedItem.image_url; else noSelImg" [src]="selectedItem.image_url" class="w-full h-full object-contain p-1">
                <ng-template #noSelImg><span class="mi text-slate-400">inventory_2</span></ng-template>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium">{{ selectedItem.name }}</p>
                <p class="text-xs text-slate-500">
                  #{{ selectedItem.id }}
                  <span *ngIf="selectedItem.type_name" class="ml-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                    {{ selectedItem.type_name }}
                  </span>
                </p>
              </div>
              <button *ngIf="isNew" type="button" (click)="clearPick()"
                      class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500">
                <span class="mi text-sm">close</span>
              </button>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <label class="block">
                <span class="text-slate-500">{{ 'adminMarket.form.basePrice' | translate }}</span>
                <input type="number" [(ngModel)]="form.base_price" min="0" step="0.1"
                       class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700">
              </label>
              <label class="block">
                <span class="text-slate-500">{{ 'adminMarket.form.stockNow' | translate }}</span>
                <input type="number" [(ngModel)]="form.amount" min="0"
                       class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700">
              </label>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <label class="block">
                <span class="text-slate-500">{{ 'adminMarket.form.targetStock' | translate }} <span class="text-xs">{{ 'adminMarket.form.targetStockHint' | translate }}</span></span>
                <input type="number" [(ngModel)]="form.target_stock" min="1"
                       class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700">
              </label>
              <label class="block">
                <span class="text-slate-500">{{ 'adminMarket.form.elasticity' | translate }} <span class="text-xs">{{ 'adminMarket.form.elasticityHint' | translate }}</span></span>
                <input type="number" [(ngModel)]="form.elasticity" min="0" max="2" step="0.1"
                       class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700">
              </label>
            </div>

            <div class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-xs space-y-1">
              <p class="font-medium">{{ 'adminMarket.form.preview' | translate }}</p>
              <p [innerHTML]="'adminMarket.form.previewLine1' | translate:{ amount: form.amount, price: '<strong>' + (preview() | number) + '</strong>' }"></p>
              <p class="text-slate-500">{{ 'adminMarket.form.previewLine2' | translate:{ target: form.target_stock, base: (form.base_price | number) } }}</p>
            </div>

            <label class="flex items-center gap-2">
              <input type="checkbox" [(ngModel)]="form.enabled">
              <span>{{ 'adminMarket.form.enabled' | translate }}</span>
            </label>
          </div>
          <p *ngIf="error" class="text-sm text-rose-500 mt-3">{{ error }}</p>
          <div class="flex gap-2 mt-5">
            <button (click)="editing = null" class="flex-1 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg">{{ 'common.cancel' | translate }}</button>
            <button (click)="save()" [disabled]="saving"
                    class="flex-1 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg">
              {{ (saving ? 'common.saving' : 'common.save') | translate }}
            </button>
          </div>
        </div>
      </div>

      <!-- Delete confirm -->
      <div *ngIf="deleting" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
          <span class="mi xl text-rose-500">warning</span>
          <h3 class="text-lg font-bold mt-2">{{ 'adminMarket.deleteConfirm' | translate }}</h3>
          <p class="text-sm text-slate-500 mt-1">{{ deleting.name }} (#{{ deleting.item_id }})</p>
          <div class="flex gap-2 mt-5">
            <button (click)="deleting = null" class="flex-1 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg">{{ 'common.cancel' | translate }}</button>
            <button (click)="confirmDelete()" class="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg">{{ 'adminMarket.delete' | translate }}</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminMarketComponent implements OnInit {
  loading = true;
  saving = false;
  error: string | null = null;
  items: AdminMarketItem[] = [];
  q = '';

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

  ngOnInit() { this.reload(); }

  reload() {
    this.loading = true;
    this.svc.list().subscribe({
      next: it => { this.items = it; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  filtered(): AdminMarketItem[] {
    const s = this.q.trim().toLowerCase();
    if (!s) return this.items;
    return this.items.filter(i => i.name.toLowerCase().includes(s) || String(i.item_id).includes(s));
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
      this.itemsSvc.adminList(q).subscribe({
        next: r => this.pickerResults = r.slice(0, 20),
        error: () => this.pickerResults = [],
      });
    }, 250);
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
      this.items = this.items.filter(x => x.item_id !== id);
      this.deleting = null;
    });
  }
}
