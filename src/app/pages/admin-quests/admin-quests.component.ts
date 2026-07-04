import { Component, OnInit } from '@angular/core';
import { AdminQuest, AdminQuestPayload, Paginated, QuestResetType, QuestsService } from '../../services/quests.service';
import { localInputToIso, isoToLocalInput } from '../../services/thai-time';

interface ItemRow { item_id: number | null; qty_required: number; }

@Component({
  selector: 'app-admin-quests',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon rose"><span class="mi lg">flag</span></div>
        <h1>{{ 'adminQuests.title' | translate }}</h1>
        <span class="badge rose"><span class="mi sm">shield</span>ADMIN</span>
        <div class="page-actions">
          <button (click)="openNew()" class="btn primary">
            <span class="mi sm">add</span> {{ 'adminQuests.add' | translate }}
          </button>
        </div>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div class="card flush">
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th style="width:56px">ID</th>
                  <th>{{ 'adminQuests.col.name' | translate }}</th>
                  <th>{{ 'adminQuests.col.reset' | translate }}</th>
                  <th class="r">{{ 'adminQuests.col.reward' | translate }}</th>
                  <th class="r">{{ 'adminQuests.col.items' | translate }}</th>
                  <th>{{ 'adminQuests.col.enabled' | translate }}</th>
                  <th style="width:100px"></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let q of quests">
                  <td class="mono faint">{{ q.id }}</td>
                  <td style="font-weight:600">{{ q.name }}</td>
                  <td><span class="badge slate">{{ q.reset_type }}</span></td>
                  <td class="r">
                    <span class="mono" style="color:var(--accent-hi);font-weight:600;display:inline-flex;align-items:center;gap:4px;justify-content:flex-end">
                      {{ q.reward_coins | number }} <img class="coin-img" src="assets/coins/coin.png" alt="">
                    </span>
                  </td>
                  <td class="r"><span class="badge slate">{{ q.items?.length || 0 }}</span></td>
                  <td>
                    <span class="badge" [class.emerald]="q.enabled" [class.slate]="!q.enabled">
                      {{ q.enabled ? 'ON' : 'OFF' }}
                    </span>
                  </td>
                  <td>
                    <div class="row gap-1">
                      <button (click)="openEdit(q)" class="btn ghost sm"><span class="mi sm">edit</span></button>
                      <button (click)="deleting = q" class="btn ghost sm" style="color:var(--rose)"><span class="mi sm">delete</span></button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="quests.length === 0">
                  <td colspan="7">
                    <div class="empty">
                      <span class="mi xxl">flag</span>
                      <div class="empty-title">{{ 'adminQuests.empty' | translate }}</div>
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
        <div class="modal-card tactical" style="max-width:680px">
          <h3 style="display:flex;align-items:center;gap:8px;margin:0 0 16px 0;font-size:18px;font-weight:700">
            <span class="mi">{{ isNew ? 'add_circle' : 'edit' }}</span>
            {{ (isNew ? 'adminQuests.addTitle' : 'adminQuests.editTitle') | translate }}
          </h3>
          <div style="display:flex;flex-direction:column;gap:12px">
            <label style="display:block">
              <span class="muted" style="font-size:12px">{{ 'adminQuests.form.name' | translate }}</span>
              <input type="text" class="input" [(ngModel)]="form.name" maxlength="128" style="margin-top:4px">
            </label>
            <label style="display:block">
              <span class="muted" style="font-size:12px">{{ 'adminQuests.form.description' | translate }}</span>
              <textarea [(ngModel)]="form.description" maxlength="512" rows="2" class="input" style="margin-top:4px;height:auto;padding:8px 12px;font-family:inherit"></textarea>
            </label>
            <div class="row gap-3" style="align-items:stretch">
              <label style="flex:1;display:block">
                <span class="muted" style="font-size:12px">{{ 'adminQuests.form.reward' | translate }}</span>
                <input type="number" class="input mono" [(ngModel)]="form.reward_coins" min="0" style="margin-top:4px">
              </label>
              <label style="flex:1;display:block">
                <span class="muted" style="font-size:12px">{{ 'adminQuests.form.reset' | translate }}</span>
                <select class="select" [(ngModel)]="form.reset_type" style="margin-top:4px;width:100%">
                  <option value="once">once</option>
                  <option value="daily">daily</option>
                  <option value="weekly">weekly</option>
                </select>
              </label>
            </div>
            <div class="row gap-3" style="align-items:stretch">
              <label style="flex:1;display:block">
                <span class="muted" style="font-size:12px">{{ 'adminQuests.form.startAt' | translate }}</span>
                <input type="datetime-local" class="input" [(ngModel)]="form.start_at" style="margin-top:4px">
              </label>
              <label style="flex:1;display:block">
                <span class="muted" style="font-size:12px">{{ 'adminQuests.form.endAt' | translate }}</span>
                <input type="datetime-local" class="input" [(ngModel)]="form.end_at" style="margin-top:4px">
              </label>
            </div>
            <label style="display:flex;align-items:center;gap:8px">
              <input type="checkbox" [(ngModel)]="form.enabled">
              <span>{{ 'adminQuests.form.enabled' | translate }}</span>
            </label>

            <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:8px">
              <div style="display:flex;align-items:center;justify-content:space-between">
                <div style="font-weight:600">{{ 'adminQuests.form.items' | translate }}</div>
                <button type="button" (click)="addItem()" class="btn secondary sm">
                  <span class="mi sm">add</span> {{ 'adminQuests.form.addItem' | translate }}
                </button>
              </div>
              <div *ngFor="let row of items; let i = index" class="row gap-2">
                <input type="number" class="input mono" [(ngModel)]="row.item_id" placeholder="item_id" style="width:140px;height:32px;font-size:12px">
                <span class="muted" style="font-size:12px">×</span>
                <input type="number" class="input mono" [(ngModel)]="row.qty_required" min="1" placeholder="qty" style="width:100px;height:32px;font-size:12px">
                <button type="button" (click)="removeItem(i)" class="btn ghost sm" style="color:var(--rose)">
                  <span class="mi sm">close</span>
                </button>
              </div>
              <p *ngIf="items.length === 0" class="faint" style="font-size:11px;text-align:center;padding:8px 0;margin:0">{{ 'adminQuests.form.noItems' | translate }}</p>
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

      <div *ngIf="deleting" class="modal-backdrop">
        <div class="modal-card tactical" style="max-width:380px;text-align:center">
          <span class="mi xl" style="color:var(--rose)">warning</span>
          <h3 style="margin:8px 0 0 0;font-size:16px;font-weight:700">{{ 'adminQuests.deleteConfirm' | translate }}</h3>
          <p class="muted" style="font-size:13px;margin:4px 0 0 0">{{ deleting.name }} <span class="mono">(#{{ deleting.id }})</span></p>
          <div class="row gap-2" style="margin-top:20px">
            <button (click)="deleting = null" class="btn secondary" style="flex:1">{{ 'common.cancel' | translate }}</button>
            <button (click)="confirmDelete()" class="btn danger" style="flex:1">{{ 'adminQuests.delete' | translate }}</button>
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
  page: Paginated<AdminQuest> | null = null;
  pageNum = 1;
  pageLimit = 20;

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
    this.svc.adminList(this.pageNum, this.pageLimit).subscribe({
      next: p => { this.page = p; this.quests = p.items; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  goPage(page: number, limit: number) {
    this.pageNum = page;
    this.pageLimit = limit;
    this.reload();
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

  // datetime-local round-trips in the viewer's local time.
  toLocalInput(iso: string | null): string {
    return isoToLocalInput(iso);
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
      start_at: localInputToIso(this.form.start_at),
      end_at: localInputToIso(this.form.end_at),
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
      this.deleting = null;
      this.reload();
    });
  }
}
