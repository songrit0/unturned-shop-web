import { Component, OnInit } from '@angular/core';
import { AdminQuest, AdminQuestPayload, QuestResetType, QuestsService } from '../../services/quests.service';

interface ItemRow { item_id: number | null; qty_required: number; }

@Component({
  selector: 'app-admin-quests',
  template: `
    <div class="max-w-7xl mx-auto p-4 space-y-4">
      <header class="flex items-center justify-between gap-2">
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <span class="mi lg text-amber-500">flag</span> {{ 'adminQuests.title' | translate }}
        </h1>
        <button (click)="openNew()" class="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg flex items-center gap-1">
          <span class="mi">add</span> {{ 'adminQuests.add' | translate }}
        </button>
      </header>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div class="overflow-x-auto bg-white dark:bg-slate-800 rounded-xl shadow">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-700/50 text-left">
              <tr>
                <th class="p-3 w-14">ID</th>
                <th class="p-3">{{ 'adminQuests.col.name' | translate }}</th>
                <th class="p-3">{{ 'adminQuests.col.reset' | translate }}</th>
                <th class="p-3 text-right">{{ 'adminQuests.col.reward' | translate }}</th>
                <th class="p-3 text-right">{{ 'adminQuests.col.items' | translate }}</th>
                <th class="p-3 text-center">{{ 'adminQuests.col.enabled' | translate }}</th>
                <th class="p-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let q of quests" class="border-t border-slate-100 dark:border-slate-700">
                <td class="p-3 font-mono text-xs">{{ q.id }}</td>
                <td class="p-3 font-medium">{{ q.name }}</td>
                <td class="p-3">
                  <span class="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700">{{ q.reset_type }}</span>
                </td>
                <td class="p-3 text-right">
                  <span class="font-semibold flex items-center justify-end gap-1">
                    {{ q.reward_coins | number }} <span class="mi text-amber-500">paid</span>
                  </span>
                </td>
                <td class="p-3 text-right">{{ q.items?.length || 0 }}</td>
                <td class="p-3 text-center">
                  <span class="text-xs px-2 py-0.5 rounded"
                        [class.bg-emerald-100]="q.enabled" [class.text-emerald-700]="q.enabled"
                        [class.bg-slate-200]="!q.enabled" [class.text-slate-500]="!q.enabled">
                    {{ q.enabled ? 'ON' : 'OFF' }}
                  </span>
                </td>
                <td class="p-3 text-right whitespace-nowrap">
                  <button (click)="openEdit(q)" class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                    <span class="mi">edit</span>
                  </button>
                  <button (click)="deleting = q" class="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500">
                    <span class="mi">delete</span>
                  </button>
                </td>
              </tr>
              <tr *ngIf="quests.length === 0">
                <td colspan="7" class="p-12 text-center text-slate-400">{{ 'adminQuests.empty' | translate }}</td>
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
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 my-8">
          <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
            <span class="mi">{{ isNew ? 'add_circle' : 'edit' }}</span>
            {{ (isNew ? 'adminQuests.addTitle' : 'adminQuests.editTitle') | translate }}
          </h3>
          <div class="space-y-3 text-sm">
            <label class="block">
              <span class="text-slate-500">{{ 'adminQuests.form.name' | translate }}</span>
              <input type="text" [(ngModel)]="form.name" maxlength="128"
                     class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700">
            </label>
            <label class="block">
              <span class="text-slate-500">{{ 'adminQuests.form.description' | translate }}</span>
              <textarea [(ngModel)]="form.description" maxlength="512" rows="2"
                        class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700"></textarea>
            </label>
            <div class="grid grid-cols-2 gap-3">
              <label class="block">
                <span class="text-slate-500">{{ 'adminQuests.form.reward' | translate }}</span>
                <input type="number" [(ngModel)]="form.reward_coins" min="0"
                       class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700">
              </label>
              <label class="block">
                <span class="text-slate-500">{{ 'adminQuests.form.reset' | translate }}</span>
                <select [(ngModel)]="form.reset_type"
                        class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700">
                  <option value="once">once</option>
                  <option value="daily">daily</option>
                  <option value="weekly">weekly</option>
                </select>
              </label>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <label class="block">
                <span class="text-slate-500">{{ 'adminQuests.form.startAt' | translate }}</span>
                <input type="datetime-local" [(ngModel)]="form.start_at"
                       class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700">
              </label>
              <label class="block">
                <span class="text-slate-500">{{ 'adminQuests.form.endAt' | translate }}</span>
                <input type="datetime-local" [(ngModel)]="form.end_at"
                       class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700">
              </label>
            </div>
            <label class="flex items-center gap-2">
              <input type="checkbox" [(ngModel)]="form.enabled">
              <span>{{ 'adminQuests.form.enabled' | translate }}</span>
            </label>

            <div class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 space-y-2">
              <div class="flex items-center justify-between">
                <p class="font-medium">{{ 'adminQuests.form.items' | translate }}</p>
                <button type="button" (click)="addItem()" class="text-xs px-2 py-1 rounded bg-brand-500 text-white flex items-center gap-1">
                  <span class="mi text-sm">add</span> {{ 'adminQuests.form.addItem' | translate }}
                </button>
              </div>
              <div *ngFor="let row of items; let i = index" class="flex items-center gap-2">
                <input type="number" [(ngModel)]="row.item_id" placeholder="item_id"
                       class="w-32 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 text-xs">
                <span class="text-xs text-slate-500">×</span>
                <input type="number" [(ngModel)]="row.qty_required" min="1" placeholder="qty"
                       class="w-24 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 text-xs">
                <button type="button" (click)="removeItem(i)" class="p-1 rounded hover:bg-rose-100 text-rose-500">
                  <span class="mi text-sm">close</span>
                </button>
              </div>
              <p *ngIf="items.length === 0" class="text-xs text-slate-400 text-center py-2">{{ 'adminQuests.form.noItems' | translate }}</p>
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

      <div *ngIf="deleting" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
          <span class="mi xl text-rose-500">warning</span>
          <h3 class="text-lg font-bold mt-2">{{ 'adminQuests.deleteConfirm' | translate }}</h3>
          <p class="text-sm text-slate-500 mt-1">{{ deleting.name }} (#{{ deleting.id }})</p>
          <div class="flex gap-2 mt-5">
            <button (click)="deleting = null" class="flex-1 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg">{{ 'common.cancel' | translate }}</button>
            <button (click)="confirmDelete()" class="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg">{{ 'adminQuests.delete' | translate }}</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminQuestsComponent implements OnInit {
  loading = true;
  saving = false;
  error: string | null = null;
  quests: AdminQuest[] = [];

  editing: AdminQuest | null = null;
  isNew = false;
  deleting: AdminQuest | null = null;

  form: {
    name: string;
    description: string;
    reward_coins: number;
    reset_type: QuestResetType;
    enabled: boolean;
    start_at: string;
    end_at: string;
  } = this.emptyForm();
  items: ItemRow[] = [];

  constructor(private svc: QuestsService) {}

  ngOnInit() { this.reload(); }

  reload() {
    this.loading = true;
    this.svc.adminList().subscribe({
      next: q => { this.quests = q; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  emptyForm() {
    return {
      name: '', description: '', reward_coins: 100, reset_type: 'daily' as QuestResetType,
      enabled: true, start_at: '', end_at: '',
    };
  }

  openNew() {
    this.editing = { id: 0, name: '', description: '', reward_coins: 100, reset_type: 'daily', enabled: 1, start_at: null, end_at: null, items: [] };
    this.isNew = true;
    this.form = this.emptyForm();
    this.items = [];
    this.error = null;
  }

  openEdit(q: AdminQuest) {
    this.editing = q;
    this.isNew = false;
    this.form = {
      name: q.name, description: q.description || '',
      reward_coins: q.reward_coins, reset_type: q.reset_type, enabled: !!q.enabled,
      start_at: this.toLocalInput(q.start_at), end_at: this.toLocalInput(q.end_at),
    };
    this.items = (q.items || []).map(i => ({ item_id: i.item_id, qty_required: i.qty_required }));
    this.error = null;
  }

  toLocalInput(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  addItem() { this.items.push({ item_id: null, qty_required: 1 }); }
  removeItem(i: number) { this.items.splice(i, 1); }

  save() {
    const name = this.form.name.trim();
    if (!name) { this.error = 'Name required'; return; }
    const cleanItems = this.items
      .filter(r => r.item_id !== null && r.item_id !== undefined && r.qty_required > 0)
      .map(r => ({ item_id: Number(r.item_id), qty_required: Number(r.qty_required) }));
    if (cleanItems.length === 0) { this.error = 'At least one item required'; return; }

    const payload: AdminQuestPayload = {
      name,
      description: this.form.description.trim() || null,
      reward_coins: Number(this.form.reward_coins) || 0,
      reset_type: this.form.reset_type,
      enabled: this.form.enabled,
      start_at: this.form.start_at ? new Date(this.form.start_at).toISOString() : null,
      end_at: this.form.end_at ? new Date(this.form.end_at).toISOString() : null,
      items: cleanItems,
    };

    this.saving = true;
    const obs = this.isNew ? this.svc.adminCreate(payload) : this.svc.adminUpdate(this.editing!.id, payload);
    obs.subscribe({
      next: () => { this.saving = false; this.editing = null; this.reload(); },
      error: e => { this.saving = false; this.error = e?.error?.message || 'Save failed'; },
    });
  }

  confirmDelete() {
    if (!this.deleting) return;
    const id = this.deleting.id;
    this.svc.adminDelete(id).subscribe(() => {
      this.quests = this.quests.filter(x => x.id !== id);
      this.deleting = null;
    });
  }
}
