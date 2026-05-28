import { Component, OnInit } from '@angular/core';
import { Item, ItemPayload, ItemsService } from '../../services/items.service';
import { ItemType, ItemTypesService } from '../../services/item-types.service';

@Component({
  selector: 'app-admin-items',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon rose"><span class="mi lg">inventory_2</span></div>
        <h1>{{ 'adminItems.title' | translate }}</h1>
        <span class="badge rose"><span class="mi sm">shield</span>ADMIN</span>
        <div class="page-actions">
          <!-- <div class="input-wrap" style="width:240px">
            <span class="mi lead">search</span>
            <input type="search" class="input" [(ngModel)]="q" [placeholder]="'adminItems.search' | translate">
          </div> -->
          <select class="select" [(ngModel)]="typeFilter">
            <option [ngValue]="null">{{ 'adminItems.allTypes' | translate }}</option>
            <option *ngFor="let t of types" [ngValue]="t.id">{{ t.name }}</option>
          </select>
          <button (click)="openNew()" class="btn primary">
            <span class="mi sm">add</span> {{ 'adminItems.add' | translate }}
          </button>
        </div>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div class="card flush">
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th style="width:64px">{{ 'adminItems.col.image' | translate }}</th>
                  <th style="width:80px">ID</th>
                  <th>{{ 'adminItems.col.name' | translate }}</th>
                  <th>{{ 'adminItems.col.type' | translate }}</th>
                  <th style="width:100px"></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let it of filtered()">
                  <td>
                    <div style="width:40px;height:40px;background:var(--surface-2);border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden">
                      <img *ngIf="it.image_url; else noImg" [src]="it.image_url" style="width:100%;height:100%;object-fit:contain;padding:2px">
                      <ng-template #noImg><span class="mi faint">inventory_2</span></ng-template>
                    </div>
                  </td>
                  <td class="mono faint">{{ it.id }}</td>
                  <td>
                    <div style="font-weight:600">{{ it.name }}</div>
                    <div *ngIf="it.description" class="muted" style="font-size:11px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:360px" [title]="it.description">{{ it.description }}</div>
                  </td>
                  <td>
                    <span *ngIf="it.type_name; else noType" class="badge violet">{{ it.type_name }}</span>
                    <ng-template #noType><span class="faint">—</span></ng-template>
                  </td>
                  <td>
                    <div class="row gap-1">
                      <button (click)="openEdit(it)" class="btn ghost sm"><span class="mi sm">edit</span></button>
                      <button (click)="deleting = it" class="btn ghost sm" style="color:var(--rose)"><span class="mi sm">delete</span></button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="filtered().length === 0">
                  <td colspan="5">
                    <div class="empty">
                      <span class="mi xxl">inventory_2</span>
                      <div class="empty-title">{{ 'adminItems.empty' | translate }}</div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>
      <ng-template #loadingTpl>
        <div style="text-align:center;padding:48px 0"><div class="spinner"></div></div>
      </ng-template>

      <!-- Edit/Create modal -->
      <div *ngIf="editing" class="modal-backdrop">
        <div class="modal-card tactical" style="max-width:560px">
          <h3 style="display:flex;align-items:center;gap:8px;margin:0 0 16px 0;font-size:18px;font-weight:700">
            <span class="mi">{{ isNew ? 'add_circle' : 'edit' }}</span>
            {{ (isNew ? 'adminItems.addTitle' : 'adminItems.editTitle') | translate }}
          </h3>
          <div style="display:flex;flex-direction:column;gap:12px">
            <div class="row gap-3" style="align-items:stretch">
              <label style="flex:1;display:block">
                <span class="muted" style="font-size:12px">{{ 'adminItems.form.id' | translate }}</span>
                <input type="number" class="input mono" [(ngModel)]="form.id" [disabled]="!isNew" style="margin-top:4px">
              </label>
              <label style="flex:1;display:block">
                <span class="muted" style="font-size:12px">{{ 'adminItems.form.name' | translate }}</span>
                <input type="text" class="input" [(ngModel)]="form.name" maxlength="128" style="margin-top:4px">
              </label>
            </div>
            <label style="display:block">
              <span class="muted" style="font-size:12px">{{ 'adminItems.form.description' | translate }}</span>
              <textarea [(ngModel)]="form.description" maxlength="512" rows="2" class="input" style="margin-top:4px;height:auto;padding:8px 12px;font-family:inherit"></textarea>
            </label>
            <label style="display:block">
              <span class="muted" style="font-size:12px">{{ 'adminItems.form.imageUrl' | translate }}</span>
              <input type="url" class="input" [(ngModel)]="form.image_url" maxlength="512" style="margin-top:4px">
            </label>
            <label style="display:block">
              <span class="muted" style="font-size:12px">{{ 'adminItems.form.type' | translate }}</span>
              <select class="select" [(ngModel)]="form.type_id" style="margin-top:4px;width:100%">
                <option [ngValue]="null">—</option>
                <option *ngFor="let t of types" [ngValue]="t.id">{{ t.name }}</option>
              </select>
            </label>

            <div *ngIf="form.image_url" style="background:var(--surface-2);border-radius:8px;padding:8px;display:flex;align-items:center;gap:8px">
              <div style="width:64px;height:64px;background:var(--surface-3);border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden">
                <img [src]="form.image_url" style="width:100%;height:100%;object-fit:contain">
              </div>
              <span class="muted" style="font-size:11px">{{ 'adminItems.form.preview' | translate }}</span>
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
          <h3 style="margin:8px 0 0 0;font-size:16px;font-weight:700">{{ 'adminItems.deleteConfirm' | translate }}</h3>
          <p class="muted" style="font-size:13px;margin:4px 0 0 0">{{ deleting.name }} <span class="mono">(#{{ deleting.id }})</span></p>
          <p style="color:var(--accent-hi);font-size:11px;margin:8px 0 0 0">{{ 'adminItems.deleteWarn' | translate }}</p>
          <p *ngIf="deleteError" style="color:var(--rose);font-size:13px;margin:8px 0 0 0">{{ deleteError }}</p>
          <div class="row gap-2" style="margin-top:20px">
            <button (click)="deleting = null; deleteError = null" class="btn secondary" style="flex:1">{{ 'common.cancel' | translate }}</button>
            <button (click)="confirmDelete()" [disabled]="deletingBusy" class="btn danger" style="flex:1">{{ 'adminItems.delete' | translate }}</button>
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

  constructor(private svc: ItemsService, private typesSvc: ItemTypesService) { }

  ngOnInit() {
    this.reload();
    this.typesSvc.list().subscribe({ next: t => this.types = t, error: () => { } });
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
