import { Component, OnDestroy, OnInit } from '@angular/core';
import { forkJoin, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Item, ItemPayload, ItemsService, Paginated } from '../../services/items.service';
import { ItemType, ItemTypesService } from '../../services/item-types.service';
import { AdminMarketService } from '../../services/admin-market.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-admin-items',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon rose"><span class="mi lg">inventory_2</span></div>
        <h1>{{ 'adminItems.title' | translate }}</h1>
        <span class="badge rose"><span class="mi sm">shield</span>ADMIN</span>
        <div class="page-actions">
          <div class="input-wrap" style="width:240px">
            <span class="mi lead">search</span>
            <input type="search" class="input" [(ngModel)]="q" (ngModelChange)="onSearch($event)" [placeholder]="'adminItems.search' | translate">
          </div>
          <select class="select" [(ngModel)]="typeFilter" (ngModelChange)="onTypeChange()">
            <option [ngValue]="null">{{ 'adminItems.allTypes' | translate }}</option>
            <option *ngFor="let t of types" [ngValue]="t.id">{{ t.name }}</option>
          </select>
          <button (click)="openNew()" class="btn primary">
            <span class="mi sm">add</span> {{ 'adminItems.add' | translate }}
          </button>
        </div>
      </div>

      <!-- Bulk action bar -->
      <div *ngIf="selected.size > 0" class="card flush" style="padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span class="badge violet"><span class="mi sm">check_box</span>{{ 'adminItems.bulk.selected' | translate:{ n: selected.size } }}</span>
        <span class="muted" style="font-size:13px">{{ 'adminItems.bulk.setTypeTo' | translate }}</span>
        <select class="select" [(ngModel)]="bulkTypeId" style="min-width:160px">
          <option [ngValue]="null">{{ 'adminItems.bulk.noType' | translate }}</option>
          <option *ngFor="let t of types" [ngValue]="t.id">{{ t.name }}</option>
        </select>
        <button (click)="applyBulkType()" [disabled]="bulkBusy" class="btn primary sm">
          <span class="mi sm">{{ bulkBusy ? 'hourglass_empty' : 'done_all' }}</span>
          {{ (bulkBusy ? 'common.saving' : 'adminItems.bulk.apply') | translate }}
        </button>
        <button (click)="buyOnlyBulk()" [disabled]="bulkBusy" class="btn ghost sm" [title]="'adminItems.buyOnlyHint' | translate">
          <span class="mi sm">sell</span> {{ 'adminItems.buyOnly' | translate }}
        </button>
        <button (click)="clearSelection()" class="btn ghost sm">{{ 'adminItems.bulk.clear' | translate }}</button>
        <span *ngIf="bulkError" style="color:var(--rose);font-size:13px">{{ bulkError }}</span>
      </div>

      <div *ngIf="buyOnlyMsg" class="welcome-alert" style="margin-bottom:12px">
        <span class="alert-icon mi">sell</span>
        <div>{{ buyOnlyMsg }}</div>
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
                  <th style="width:64px">{{ 'adminItems.col.image' | translate }}</th>
                  <th style="width:80px">ID</th>
                  <th>{{ 'adminItems.col.name' | translate }}</th>
                  <th>{{ 'adminItems.col.type' | translate }}</th>
                  <th style="width:100px"></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let it of items" [class.row-selected]="selected.has(it.id)">
                  <td style="text-align:center">
                    <input type="checkbox" [checked]="selected.has(it.id)" (change)="toggleSelect(it.id)">
                  </td>
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
                      <button (click)="buyOnlyRow(it)" [disabled]="bulkBusy" class="btn ghost sm" [title]="'adminItems.buyOnlyHint' | translate">
                        <span class="mi sm">sell</span>
                      </button>
                      <button (click)="openEdit(it)" class="btn ghost sm"><span class="mi sm">edit</span></button>
                      <button (click)="deleting = it" class="btn ghost sm" style="color:var(--rose)"><span class="mi sm">delete</span></button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="items.length === 0">
                  <td colspan="6">
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

        <div *ngIf="page" class="row" style="justify-content:center;align-items:center;gap:12px;margin-top:16px">
          <button *ngIf="hasMore" (click)="loadMore()" [disabled]="loadingMore" class="btn secondary">
            <span class="mi sm">{{ loadingMore ? 'hourglass_empty' : 'expand_more' }}</span>
            {{ (loadingMore ? 'adminItems.loadingMore' : 'adminItems.loadMore') | translate }}
          </button>
          <span class="muted" style="font-size:13px">{{ 'adminItems.loadedCount' | translate:{ shown: items.length, total: page.total } }}</span>
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
  styles: [`
    tr.row-selected td { background: color-mix(in srgb, var(--violet) 12%, transparent); }
    input[type=checkbox] { width:16px; height:16px; cursor:pointer; accent-color: var(--violet); }
  `],
})
export class AdminItemsComponent implements OnInit, OnDestroy {
  loading = true;
  loadingMore = false;
  saving = false;
  error: string | null = null;
  items: Item[] = [];
  page: Paginated<Item> | null = null;
  pageNum = 1;
  pageLimit = 20;
  types: ItemType[] = [];
  q = '';
  typeFilter: number | null = null;

  // Bulk selection
  selected = new Set<number>();
  bulkTypeId: number | null = null;
  bulkBusy = false;
  bulkError: string | null = null;
  buyOnlyMsg: string | null = null;

  private search$ = new Subject<string>();
  private searchSub?: Subscription;

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

  constructor(
    private svc: ItemsService,
    private typesSvc: ItemTypesService,
    private market: AdminMarketService,
    private t: TranslateService,
  ) { }

  ngOnInit() {
    this.searchSub = this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.pageNum = 1;
      this.reload();
    });
    this.reload();
    this.typesSvc.list().subscribe({ next: p => this.types = p.items, error: () => { } });
  }

  ngOnDestroy() { this.searchSub?.unsubscribe(); }

  reload() {
    this.loading = true;
    this.pageNum = 1;
    this.clearSelection();
    this.svc.adminList(this.q.trim(), this.typeFilter, this.pageNum, this.pageLimit).subscribe({
      next: p => { this.page = p; this.items = p.items; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  /** True while there is a next page to fetch. */
  get hasMore(): boolean {
    return !!this.page && this.items.length < this.page.total;
  }

  /** Fetch the next page and append it to the current list (stops when no more data). */
  loadMore() {
    if (!this.hasMore || this.loadingMore) return;
    this.loadingMore = true;
    const next = this.pageNum + 1;
    this.svc.adminList(this.q.trim(), this.typeFilter, next, this.pageLimit).subscribe({
      next: p => {
        this.pageNum = next;
        this.page = p;
        this.items = [...this.items, ...p.items];
        this.loadingMore = false;
      },
      error: () => { this.loadingMore = false; },
    });
  }

  onSearch(v: string) { this.search$.next(v ?? ''); }
  onTypeChange() { this.reload(); }

  // ---- Selection ----
  get allSelected(): boolean {
    return this.items.length > 0 && this.items.every(it => this.selected.has(it.id));
  }
  get someSelected(): boolean {
    return this.items.some(it => this.selected.has(it.id));
  }
  toggleSelect(id: number) {
    if (this.selected.has(id)) this.selected.delete(id);
    else this.selected.add(id);
  }
  toggleSelectAll(ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    if (checked) this.items.forEach(it => this.selected.add(it.id));
    else this.items.forEach(it => this.selected.delete(it.id));
  }
  clearSelection() {
    this.selected.clear();
    this.bulkError = null;
  }

  // ---- Buy-only (add to shop's purchase board without selling) ----
  /** One-click: make a single catalog item buy-only in the market. */
  buyOnlyRow(it: Item) {
    this.runBuyOnly([it.id]);
  }
  /** Bulk: make every selected catalog item buy-only. */
  buyOnlyBulk() {
    const ids = this.items.filter(i => this.selected.has(i.id)).map(i => i.id);
    if (ids.length === 0) return;
    this.runBuyOnly(ids);
  }
  private runBuyOnly(ids: number[]) {
    this.bulkBusy = true;
    this.bulkError = null;
    this.buyOnlyMsg = null;
    this.market.enableBuyOnly(ids).subscribe({
      next: res => {
        this.bulkBusy = false;
        this.buyOnlyMsg = this.t.instant('adminItems.buyOnlyDone', { created: res.created, updated: res.updated });
        this.clearSelection();
        setTimeout(() => this.buyOnlyMsg = null, 6000);
      },
      error: e => {
        this.bulkBusy = false;
        this.bulkError = e?.error?.message || 'Buy-only failed';
      },
    });
  }

  /** Apply the chosen type to every selected item in one batch. */
  applyBulkType() {
    const targets = this.items.filter(it => this.selected.has(it.id));
    if (targets.length === 0) return;
    this.bulkBusy = true;
    this.bulkError = null;
    const typeId = this.bulkTypeId ?? null;
    const typeName = typeId == null ? null : (this.types.find(t => t.id === typeId)?.name ?? null);
    const calls = targets.map(it => this.svc.adminUpdate(it.id, {
      name: it.name,
      description: it.description ?? null,
      image_url: it.image_url ?? null,
      type_id: typeId,
    }));
    forkJoin(calls).subscribe({
      next: () => {
        targets.forEach(it => { it.type_id = typeId; it.type_name = typeName; });
        this.bulkBusy = false;
        this.clearSelection();
      },
      error: e => {
        this.bulkBusy = false;
        this.bulkError = e?.error?.message || 'Bulk update failed';
      },
    });
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
        this.deleting = null;
        this.deletingBusy = false;
        this.reload();
      },
      error: e => {
        this.deletingBusy = false;
        this.deleteError = e?.error?.message || 'Delete failed — item may still be referenced.';
      },
    });
  }
}
