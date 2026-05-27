import { Component, OnInit } from '@angular/core';
import { Item, ItemPayload, ItemsService } from '../../services/items.service';
import { ItemType, ItemTypesService } from '../../services/item-types.service';

@Component({
  selector: 'app-admin-items',
  template: `
    <div class="max-w-7xl mx-auto p-4 space-y-4">
      <header class="flex items-center justify-between gap-2">
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <span class="mi lg text-indigo-500">inventory_2</span> {{ 'adminItems.title' | translate }}
        </h1>
        <button (click)="openNew()" class="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg flex items-center gap-1">
          <span class="mi">add</span> {{ 'adminItems.add' | translate }}
        </button>
      </header>

      <div class="flex flex-wrap gap-2 items-center">
        <input type="search" [(ngModel)]="q" [placeholder]="'adminItems.search' | translate"
               class="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 flex-1 min-w-[200px] max-w-md">
        <select [(ngModel)]="typeFilter"
                class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800">
          <option [ngValue]="null">{{ 'adminItems.allTypes' | translate }}</option>
          <option *ngFor="let t of types" [ngValue]="t.id">{{ t.name }}</option>
        </select>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div class="overflow-x-auto bg-white dark:bg-slate-800 rounded-xl shadow">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-700/50 text-left">
              <tr>
                <th class="p-3 w-20">{{ 'adminItems.col.image' | translate }}</th>
                <th class="p-3 w-20">ID</th>
                <th class="p-3">{{ 'adminItems.col.name' | translate }}</th>
                <th class="p-3">{{ 'adminItems.col.type' | translate }}</th>
                <th class="p-3 w-24"></th>
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
                <td class="p-3 font-mono text-xs">{{ it.id }}</td>
                <td class="p-3 font-medium">
                  {{ it.name }}
                  <p *ngIf="it.description" class="text-xs text-slate-500 mt-0.5 line-clamp-1" [title]="it.description">{{ it.description }}</p>
                </td>
                <td class="p-3">
                  <span *ngIf="it.type_name; else noType"
                        class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                    {{ it.type_name }}
                  </span>
                  <ng-template #noType><span class="text-slate-400 text-xs">—</span></ng-template>
                </td>
                <td class="p-3 text-right whitespace-nowrap">
                  <button (click)="openEdit(it)" class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                    <span class="mi">edit</span>
                  </button>
                  <button (click)="deleting = it" class="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500">
                    <span class="mi">delete</span>
                  </button>
                </td>
              </tr>
              <tr *ngIf="filtered().length === 0">
                <td colspan="5" class="p-12 text-center text-slate-400">{{ 'adminItems.empty' | translate }}</td>
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
            {{ (isNew ? 'adminItems.addTitle' : 'adminItems.editTitle') | translate }}
          </h3>
          <div class="space-y-3 text-sm">
            <div class="grid grid-cols-2 gap-3">
              <label class="block">
                <span class="text-slate-500">{{ 'adminItems.form.id' | translate }}</span>
                <input type="number" [(ngModel)]="form.id" [disabled]="!isNew"
                       class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 disabled:opacity-50">
              </label>
              <label class="block">
                <span class="text-slate-500">{{ 'adminItems.form.name' | translate }}</span>
                <input type="text" [(ngModel)]="form.name" maxlength="128"
                       class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700">
              </label>
            </div>
            <label class="block">
              <span class="text-slate-500">{{ 'adminItems.form.description' | translate }}</span>
              <textarea [(ngModel)]="form.description" maxlength="512" rows="2"
                        class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700"></textarea>
            </label>
            <label class="block">
              <span class="text-slate-500">{{ 'adminItems.form.imageUrl' | translate }}</span>
              <input type="url" [(ngModel)]="form.image_url" maxlength="512"
                     class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700">
            </label>
            <label class="block">
              <span class="text-slate-500">{{ 'adminItems.form.type' | translate }}</span>
              <select [(ngModel)]="form.type_id"
                      class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700">
                <option [ngValue]="null">—</option>
                <option *ngFor="let t of types" [ngValue]="t.id">{{ t.name }}</option>
              </select>
            </label>

            <div *ngIf="form.image_url" class="bg-slate-50 dark:bg-slate-700/50 rounded p-2 flex items-center gap-2">
              <div class="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center overflow-hidden">
                <img [src]="form.image_url" class="w-full h-full object-contain">
              </div>
              <span class="text-xs text-slate-500">{{ 'adminItems.form.preview' | translate }}</span>
            </div>
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
          <h3 class="text-lg font-bold mt-2">{{ 'adminItems.deleteConfirm' | translate }}</h3>
          <p class="text-sm text-slate-500 mt-1">{{ deleting.name }} (#{{ deleting.id }})</p>
          <p class="text-xs text-amber-600 mt-2">{{ 'adminItems.deleteWarn' | translate }}</p>
          <p *ngIf="deleteError" class="text-sm text-rose-500 mt-2">{{ deleteError }}</p>
          <div class="flex gap-2 mt-5">
            <button (click)="deleting = null; deleteError = null" class="flex-1 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg">{{ 'common.cancel' | translate }}</button>
            <button (click)="confirmDelete()" [disabled]="deletingBusy"
                    class="flex-1 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-lg">{{ 'adminItems.delete' | translate }}</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminItemsComponent implements OnInit {
  loading = true;
  saving = false;
  error: string | null = null;
  items: Item[] = [];
  types: ItemType[] = [];
  q = '';
  typeFilter: number | null = null;

  editing: Item | null = null;
  isNew = false;
  form: {
    id: number | null;
    name: string;
    description: string;
    image_url: string;
    type_id: number | null;
  } = this.emptyForm();
  deleting: Item | null = null;
  deletingBusy = false;
  deleteError: string | null = null;

  constructor(private svc: ItemsService, private typesSvc: ItemTypesService) {}

  ngOnInit() {
    this.reload();
    this.typesSvc.list().subscribe({ next: t => this.types = t, error: () => {} });
  }

  reload() {
    this.loading = true;
    this.svc.adminList().subscribe({
      next: it => { this.items = it; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  filtered(): Item[] {
    const s = this.q.trim().toLowerCase();
    let arr = this.items;
    if (this.typeFilter != null) arr = arr.filter(i => i.type_id === this.typeFilter);
    if (s) arr = arr.filter(i => i.name.toLowerCase().includes(s) || String(i.id).includes(s));
    return arr;
  }

  emptyForm() {
    return { id: null, name: '', description: '', image_url: '', type_id: null };
  }

  openNew() {
    this.editing = { id: 0, name: '', description: '', image_url: '', type_id: null };
    this.isNew = true;
    this.form = this.emptyForm();
    this.error = null;
  }

  openEdit(it: Item) {
    this.editing = it;
    this.isNew = false;
    this.form = {
      id: it.id,
      name: it.name,
      description: it.description || '',
      image_url: it.image_url || '',
      type_id: it.type_id ?? null,
    };
    this.error = null;
  }

  save() {
    const name = (this.form.name || '').trim();
    if (this.isNew && (this.form.id == null || Number(this.form.id) <= 0)) {
      this.error = 'ID required';
      return;
    }
    if (!name) { this.error = 'Name required'; return; }

    this.saving = true;
    const payload: ItemPayload = {
      name,
      description: (this.form.description || '').trim() || null,
      image_url: (this.form.image_url || '').trim() || null,
      type_id: this.form.type_id ?? null,
    };
    const obs = this.isNew
      ? this.svc.adminCreate({ ...payload, id: Number(this.form.id) })
      : this.svc.adminUpdate(this.editing!.id, payload);
    obs.subscribe({
      next: () => { this.saving = false; this.editing = null; this.reload(); },
      error: e => { this.saving = false; this.error = e?.error?.message || 'Save failed'; },
    });
  }

  confirmDelete() {
    if (!this.deleting) return;
    const id = this.deleting.id;
    this.deletingBusy = true;
    this.deleteError = null;
    this.svc.adminDelete(id).subscribe({
      next: () => {
        this.items = this.items.filter(x => x.id !== id);
        this.deleting = null;
        this.deletingBusy = false;
      },
      error: e => {
        this.deletingBusy = false;
        this.deleteError = e?.error?.message || 'Delete failed — item may still be referenced.';
      },
    });
  }
}
