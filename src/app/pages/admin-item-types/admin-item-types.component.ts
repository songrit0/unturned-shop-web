import { Component, OnInit } from '@angular/core';
import { ItemType, ItemTypePayload, ItemTypesService, Paginated } from '../../services/item-types.service';

@Component({
  selector: 'app-admin-item-types',
  template: `
    <div class="page" style="max-width:880px">
      <div class="page-header">
        <div class="h-icon rose"><span class="mi lg">category</span></div>
        <h1>{{ 'adminItemTypes.title' | translate }}</h1>
        <span class="badge rose"><span class="mi sm">shield</span>ADMIN</span>
        <div class="page-actions">
          <button (click)="openNew()" class="btn primary">
            <span class="mi sm">add</span> {{ 'adminItemTypes.add' | translate }}
          </button>
        </div>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div class="card flush">
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th style="width:64px">ID</th>
                  <th>{{ 'adminItemTypes.col.name' | translate }}</th>
                  <th>{{ 'adminItemTypes.col.description' | translate }}</th>
                  <th style="width:100px"></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let t of types">
                  <td class="mono faint">{{ t.id }}</td>
                  <td style="font-weight:600">{{ t.name }}</td>
                  <td class="muted">{{ t.description || '—' }}</td>
                  <td>
                    <div class="row gap-1">
                      <button (click)="openEdit(t)" class="btn ghost sm"><span class="mi sm">edit</span></button>
                      <button (click)="deleting = t" class="btn ghost sm" style="color:var(--rose)"><span class="mi sm">delete</span></button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="types.length === 0">
                  <td colspan="4">
                    <div class="empty">
                      <span class="mi xxl">category</span>
                      <div class="empty-title">{{ 'adminItemTypes.empty' | translate }}</div>
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

      <div *ngIf="editing" class="modal-backdrop">
        <div class="modal-card tactical" style="max-width:480px">
          <h3 style="display:flex;align-items:center;gap:8px;margin:0 0 16px 0;font-size:18px;font-weight:700">
            <span class="mi">{{ isNew ? 'add_circle' : 'edit' }}</span>
            {{ (isNew ? 'adminItemTypes.addTitle' : 'adminItemTypes.editTitle') | translate }}
          </h3>
          <div style="display:flex;flex-direction:column;gap:12px">
            <label style="display:block">
              <span class="muted" style="font-size:12px">{{ 'adminItemTypes.form.name' | translate }}</span>
              <input type="text" class="input" [(ngModel)]="form.name" maxlength="64" style="margin-top:4px">
            </label>
            <label style="display:block">
              <span class="muted" style="font-size:12px">{{ 'adminItemTypes.form.description' | translate }}</span>
              <textarea [(ngModel)]="form.description" maxlength="255" rows="3" class="input" style="margin-top:4px;height:auto;padding:8px 12px;font-family:inherit"></textarea>
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

      <div *ngIf="deleting" class="modal-backdrop">
        <div class="modal-card tactical" style="max-width:380px;text-align:center">
          <span class="mi xl" style="color:var(--rose)">warning</span>
          <h3 style="margin:8px 0 0 0;font-size:16px;font-weight:700">{{ 'adminItemTypes.deleteConfirm' | translate }}</h3>
          <p class="muted" style="font-size:13px;margin:4px 0 0 0">{{ deleting.name }}</p>
          <div class="row gap-2" style="margin-top:20px">
            <button (click)="deleting = null" class="btn secondary" style="flex:1">{{ 'common.cancel' | translate }}</button>
            <button (click)="confirmDelete()" class="btn danger" style="flex:1">{{ 'adminItemTypes.delete' | translate }}</button>
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
  page: Paginated<ItemType> | null = null;
  pageNum = 1;
  pageLimit = 20;
  editing: ItemType | null = null;
  isNew = false;
  deleting: ItemType | null = null;
  form: ItemTypePayload = { name: '', description: '' };

  constructor(private svc: ItemTypesService) {}

  ngOnInit() { this.reload(); }

  reload() {
    this.loading = true;
    this.svc.list(this.pageNum, this.pageLimit).subscribe({
      next: p => { this.page = p; this.types = p.items; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  goPage(page: number, limit: number) {
    this.pageNum = page;
    this.pageLimit = limit;
    this.reload();
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
      this.deleting = null;
      this.reload();
    });
  }
}
