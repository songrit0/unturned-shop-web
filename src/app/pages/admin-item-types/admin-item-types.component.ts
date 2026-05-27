import { Component, OnInit } from '@angular/core';
import { ItemType, ItemTypePayload, ItemTypesService } from '../../services/item-types.service';

@Component({
  selector: 'app-admin-item-types',
  template: `
    <div class="max-w-3xl mx-auto p-4 space-y-4">
      <header class="flex items-center justify-between gap-2">
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <span class="mi lg text-violet-500">category</span> {{ 'adminItemTypes.title' | translate }}
        </h1>
        <button (click)="openNew()" class="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg flex items-center gap-1">
          <span class="mi">add</span> {{ 'adminItemTypes.add' | translate }}
        </button>
      </header>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-700/50 text-left">
              <tr>
                <th class="p-3 w-16">ID</th>
                <th class="p-3">{{ 'adminItemTypes.col.name' | translate }}</th>
                <th class="p-3">{{ 'adminItemTypes.col.description' | translate }}</th>
                <th class="p-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let t of types" class="border-t border-slate-100 dark:border-slate-700">
                <td class="p-3 font-mono text-xs">{{ t.id }}</td>
                <td class="p-3 font-medium">{{ t.name }}</td>
                <td class="p-3 text-slate-500">{{ t.description || '—' }}</td>
                <td class="p-3 text-right whitespace-nowrap">
                  <button (click)="openEdit(t)" class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                    <span class="mi">edit</span>
                  </button>
                  <button (click)="deleting = t" class="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500">
                    <span class="mi">delete</span>
                  </button>
                </td>
              </tr>
              <tr *ngIf="types.length === 0">
                <td colspan="4" class="p-12 text-center text-slate-400">{{ 'adminItemTypes.empty' | translate }}</td>
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

      <div *ngIf="editing" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
          <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
            <span class="mi">{{ isNew ? 'add_circle' : 'edit' }}</span>
            {{ (isNew ? 'adminItemTypes.addTitle' : 'adminItemTypes.editTitle') | translate }}
          </h3>
          <div class="space-y-3 text-sm">
            <label class="block">
              <span class="text-slate-500">{{ 'adminItemTypes.form.name' | translate }}</span>
              <input type="text" [(ngModel)]="form.name" maxlength="64"
                     class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700">
            </label>
            <label class="block">
              <span class="text-slate-500">{{ 'adminItemTypes.form.description' | translate }}</span>
              <textarea [(ngModel)]="form.description" maxlength="255" rows="3"
                        class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700"></textarea>
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

      <div *ngIf="deleting" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
          <span class="mi xl text-rose-500">warning</span>
          <h3 class="text-lg font-bold mt-2">{{ 'adminItemTypes.deleteConfirm' | translate }}</h3>
          <p class="text-sm text-slate-500 mt-1">{{ deleting.name }}</p>
          <div class="flex gap-2 mt-5">
            <button (click)="deleting = null" class="flex-1 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg">{{ 'common.cancel' | translate }}</button>
            <button (click)="confirmDelete()" class="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg">{{ 'adminItemTypes.delete' | translate }}</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminItemTypesComponent implements OnInit {
  loading = true;
  saving = false;
  error: string | null = null;
  types: ItemType[] = [];
  editing: ItemType | null = null;
  isNew = false;
  deleting: ItemType | null = null;
  form: ItemTypePayload = { name: '', description: '' };

  constructor(private svc: ItemTypesService) {}

  ngOnInit() { this.reload(); }

  reload() {
    this.loading = true;
    this.svc.list().subscribe({
      next: t => { this.types = t; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  openNew() {
    this.editing = { id: 0, name: '', description: '' };
    this.isNew = true;
    this.form = { name: '', description: '' };
    this.error = null;
  }
  openEdit(t: ItemType) {
    this.editing = t;
    this.isNew = false;
    this.form = { name: t.name, description: t.description || '' };
    this.error = null;
  }

  save() {
    const name = (this.form.name || '').trim();
    if (!name) { this.error = 'Name required'; return; }
    this.saving = true;
    const payload: ItemTypePayload = { name, description: (this.form.description || '').trim() || null };
    const obs = this.isNew
      ? this.svc.create(payload)
      : this.svc.update(this.editing!.id, payload);
    obs.subscribe({
      next: () => { this.saving = false; this.editing = null; this.reload(); },
      error: e => { this.saving = false; this.error = e?.error?.message || 'Save failed'; },
    });
  }

  confirmDelete() {
    if (!this.deleting) return;
    const id = this.deleting.id;
    this.svc.remove(id).subscribe(() => {
      this.types = this.types.filter(x => x.id !== id);
      this.deleting = null;
    });
  }
}
