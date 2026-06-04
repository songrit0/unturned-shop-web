import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import {
  AdminCode,
  AdminCodesService,
  CodeRewardPayload,
  CreateCodePayload,
  Paginated,
} from '../../services/admin-codes.service';
import { Item, ItemsService } from '../../services/items.service';
import { bangkokInputToIso } from '../../services/thai-time';
import { Vehicle, VehiclesService } from '../../services/vehicles.service';

/** One editable reward row in the create modal. */
interface RewardRow {
  type: 'item' | 'vehicle';
  id: number | null;
  name: string | null;
  image_url: string | null;
  amount: number;
  quality: number;        // only meaningful for items (0-100)
  pickerQ: string;
  pickerResults: Array<Item | Vehicle>;
  pickerTimer: ReturnType<typeof setTimeout> | null;
}

@Component({
  selector: 'app-admin-codes',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon rose"><span class="mi lg">confirmation_number</span></div>
        <h1>{{ 'adminCodes.title' | translate }}</h1>
        <span class="badge rose"><span class="mi sm">shield</span>ADMIN</span>
        <div class="page-actions">
          <div class="input-wrap" style="width:240px">
            <span class="mi lead">search</span>
            <input type="search" class="input" [(ngModel)]="q" (ngModelChange)="onSearch($event)" [placeholder]="'adminCodes.search' | translate">
          </div>
          <button (click)="openNew()" class="btn primary">
            <span class="mi sm">add</span> {{ 'adminCodes.create' | translate }}
          </button>
        </div>
      </div>

      <div *ngIf="created" class="card" style="padding:14px 16px;margin-bottom:16px;border-color:var(--emerald);background:rgb(16 185 129 / 0.08)">
        <div class="row gap-2 between wrap">
          <div class="row gap-2">
            <span class="mi" style="color:var(--emerald)">check_circle</span>
            <span>{{ 'adminCodes.createdMsg' | translate }}</span>
            <code class="mono fw-7" style="font-size:18px;letter-spacing:0.12em;color:var(--accent)">{{ created.code }}</code>
          </div>
          <div class="row gap-2">
            <button class="btn secondary sm" (click)="copy(created.code)">
              <span class="mi sm">{{ copiedCode === created.code ? 'check' : 'content_copy' }}</span>
              {{ (copiedCode === created.code ? 'welcome.copied' : 'welcome.copy') | translate }}
            </button>
            <button class="btn ghost sm" (click)="created = null"><span class="mi sm">close</span></button>
          </div>
        </div>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div class="col gap-3">
          <div *ngFor="let c of items" class="card" style="padding:18px;">
            <div class="row gap-3 wrap between">
              <div class="row gap-3">
                <div style="width:56px; height:56px; background: rgb(245 158 11 / 0.12); border:1px solid rgb(245 158 11 / 0.3); border-radius: var(--radius); display:flex; align-items:center; justify-content:center;">
                  <span class="mi md" style="color:var(--accent-hi);">confirmation_number</span>
                </div>
                <div>
                  <code class="mono fw-7" style="font-size:22px; letter-spacing:0.18em;"
                    [style.color]="c.status === 'available' ? 'var(--accent)' : 'var(--text-faint)'"
                    [style.text-decoration]="(c.status === 'used' || c.status === 'expired') ? 'line-through' : 'none'">
                    {{ c.code }}
                  </code>
                  <div class="row gap-2 mt-1 wrap">
                    <span class="badge"
                      [class.emerald]="c.status === 'available'"
                      [class.slate]="c.status === 'used'"
                      [class.rose]="c.status === 'expired' || c.status === 'disabled'">{{ statusText(c.status) }}</span>
                    <span class="mono faint text-xs">{{ c.created_at | date:'short' }}</span>
                    <span class="mono faint text-xs row gap-1">
                      <span class="mi sm">group</span>{{ usesText(c) }}
                    </span>
                    <span *ngIf="c.expires_at" class="mono faint text-xs row gap-1">
                      <span class="mi sm">schedule</span>{{ c.expires_at | date:'short' }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="row gap-2">
                <button class="btn secondary sm" (click)="copy(c.code)">
                  <span class="mi sm">{{ copiedCode === c.code ? 'check' : 'content_copy' }}</span>
                  {{ (copiedCode === c.code ? 'welcome.copied' : 'welcome.copy') | translate }}
                </button>
                <button (click)="toggle(c)" class="badge" [class.emerald]="c.enabled" [class.slate]="!c.enabled" style="cursor:pointer;border:none">
                  {{ (c.enabled ? 'adminCodes.on' : 'adminCodes.off') | translate }}
                </button>
                <button (click)="deleting = c" class="btn ghost sm" style="color:var(--rose)"><span class="mi sm">delete</span></button>
              </div>
            </div>

            <div class="row gap-2 wrap mt-3">
              <div *ngFor="let it of c.items" class="row gap-2" style="background:var(--surface-2); border:1px solid var(--border); border-radius:999px; padding: 4px 12px 4px 4px;">
                <div style="width:24px; height:24px; background:var(--surface-3); border-radius:50%; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                  <img *ngIf="it.image_url; else noImg" [src]="it.image_url" style="width:80%; height:80%; object-fit:contain;">
                  <ng-template #noImg><span class="mi sm faint">{{ it.kind === 1 ? 'directions_car' : 'inventory_2' }}</span></ng-template>
                </div>
                <span class="mi sm faint" [title]="(it.kind === 1 ? 'adminCodes.form.vehicle' : 'adminCodes.form.item') | translate">{{ it.kind === 1 ? 'directions_car' : 'inventory_2' }}</span>
                <span class="text-xs">{{ it.name || ('#' + it.item_id) }}</span>
                <span class="mono faint text-xs">×{{ it.amount }}</span>
              </div>
            </div>
          </div>

          <div *ngIf="items.length === 0" class="empty">
            <span class="mi xxl">confirmation_number</span>
            <div class="empty-title">{{ 'adminCodes.empty' | translate }}</div>
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

      <!-- Create modal -->
      <div *ngIf="creating" class="modal-backdrop">
        <div class="modal-card tactical" style="max-width:620px">
          <h3 style="display:flex;align-items:center;gap:8px;margin:0 0 16px 0;font-size:18px;font-weight:700">
            <span class="mi">add_circle</span>
            {{ 'adminCodes.createTitle' | translate }}
          </h3>
          <div style="display:flex;flex-direction:column;gap:12px">
            <div class="row gap-3" style="align-items:stretch">
              <label style="flex:2;display:block">
                <span class="muted" style="font-size:12px">{{ 'adminCodes.form.code' | translate }}</span>
                <input type="text" class="input mono" [(ngModel)]="form.code" maxlength="64" style="margin-top:4px" [placeholder]="'adminCodes.form.codeHint' | translate">
              </label>
              <label style="flex:1;display:block">
                <span class="muted" style="font-size:12px">{{ 'adminCodes.form.maxUses' | translate }}</span>
                <input type="number" class="input mono" [(ngModel)]="form.max_uses" min="0" style="margin-top:4px">
                <span class="muted" style="font-size:11px">{{ 'adminCodes.form.maxUsesHint' | translate }}</span>
              </label>
            </div>

            <div class="row gap-3" style="align-items:stretch">
              <label style="flex:2;display:block">
                <span class="muted" style="font-size:12px">{{ 'adminCodes.form.expiresAt' | translate }}</span>
                <input type="datetime-local" class="input" [(ngModel)]="form.expires_at" style="margin-top:4px">
              </label>
              <label style="flex:1;display:flex;align-items:center;gap:8px;padding-top:18px">
                <input type="checkbox" [(ngModel)]="form.enabled">
                <span>{{ 'adminCodes.form.enabled' | translate }}</span>
              </label>
            </div>

            <div>
              <div class="row between" style="align-items:center;margin-bottom:6px">
                <span class="muted" style="font-size:12px">{{ 'adminCodes.form.rewards' | translate }}</span>
                <button type="button" (click)="addRow()" class="btn ghost sm"><span class="mi sm">add</span> {{ 'adminCodes.form.addReward' | translate }}</button>
              </div>

              <div *ngFor="let r of rewards; let i = index" style="background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px">
                <div class="row gap-2" style="align-items:flex-start">
                  <select class="select" [ngModel]="r.type" (ngModelChange)="onTypeChange(r, $event)" style="width:110px;flex-shrink:0">
                    <option value="item">{{ 'adminCodes.form.item' | translate }}</option>
                    <option value="vehicle">{{ 'adminCodes.form.vehicle' | translate }}</option>
                  </select>

                  <div style="flex:1;min-width:0">
                    <div *ngIf="r.id; else pickTpl" style="display:flex;align-items:center;gap:8px;background:var(--surface-3);border-radius:6px;padding:6px 8px">
                      <div style="width:32px;height:32px;background:var(--surface);border-radius:4px;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
                        <img *ngIf="r.image_url; else noSel" [src]="r.image_url" style="width:100%;height:100%;object-fit:contain">
                        <ng-template #noSel><span class="mi sm faint">{{ r.type === 'vehicle' ? 'directions_car' : 'inventory_2' }}</span></ng-template>
                      </div>
                      <div style="flex:1;min-width:0">
                        <div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ r.name }}</div>
                        <div class="muted" style="font-size:11px">#{{ r.id }}</div>
                      </div>
                      <button type="button" (click)="clearPick(r)" class="btn ghost sm"><span class="mi sm">close</span></button>
                    </div>
                    <ng-template #pickTpl>
                      <div style="position:relative">
                        <input type="search" class="input" [(ngModel)]="r.pickerQ" (ngModelChange)="onPickerSearch(r)"
                               [placeholder]="(r.type === 'vehicle' ? 'adminCodes.form.pickVehicle' : 'adminCodes.form.pickItem') | translate">
                        <div *ngIf="r.pickerResults.length > 0"
                             style="position:absolute;z-index:10;margin-top:4px;width:100%;max-height:240px;overflow-y:auto;background:var(--surface);border:1px solid var(--border);border-radius:8px;box-shadow:var(--shadow-lg)">
                          <button *ngFor="let res of r.pickerResults" type="button" (click)="pick(r, res)"
                                  style="width:100%;text-align:left;padding:8px 12px;background:transparent;border:none;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;cursor:pointer;color:var(--text)">
                            <div style="width:32px;height:32px;background:var(--surface-2);border-radius:4px;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
                              <img *ngIf="res.image_url; else noResImg" [src]="res.image_url" style="width:100%;height:100%;object-fit:contain">
                              <ng-template #noResImg><span class="mi sm faint">{{ r.type === 'vehicle' ? 'directions_car' : 'inventory_2' }}</span></ng-template>
                            </div>
                            <div style="flex:1;min-width:0">
                              <div style="font-weight:600">{{ res.name }}</div>
                              <div class="muted" style="font-size:11px">#{{ res.id }}<span *ngIf="res.type_name"> · {{ res.type_name }}</span></div>
                            </div>
                          </button>
                        </div>
                      </div>
                    </ng-template>
                  </div>

                  <label style="width:78px;flex-shrink:0">
                    <span class="muted" style="font-size:11px">{{ 'adminCodes.form.amount' | translate }}</span>
                    <input type="number" class="input mono" [(ngModel)]="r.amount" min="1" style="margin-top:2px">
                  </label>
                  <label *ngIf="r.type === 'item'" style="width:78px;flex-shrink:0">
                    <span class="muted" style="font-size:11px">{{ 'adminCodes.form.quality' | translate }}</span>
                    <input type="number" class="input mono" [(ngModel)]="r.quality" min="0" max="100" style="margin-top:2px">
                  </label>

                  <button type="button" (click)="removeRow(i)" class="btn ghost sm" style="color:var(--rose);margin-top:2px"><span class="mi sm">delete</span></button>
                </div>
              </div>
            </div>
          </div>

          <p *ngIf="error" style="color:var(--rose);font-size:13px;margin:12px 0 0 0">{{ error }}</p>
          <div class="row gap-2" style="margin-top:20px">
            <button (click)="creating = false" class="btn secondary" style="flex:1">{{ 'common.cancel' | translate }}</button>
            <button (click)="save()" [disabled]="saving" class="btn primary" style="flex:1">
              {{ (saving ? 'common.saving' : 'adminCodes.create') | translate }}
            </button>
          </div>
        </div>
      </div>

      <!-- Delete confirm -->
      <div *ngIf="deleting" class="modal-backdrop">
        <div class="modal-card tactical" style="max-width:380px;text-align:center">
          <span class="mi xl" style="color:var(--rose)">warning</span>
          <h3 style="margin:8px 0 0 0;font-size:16px;font-weight:700">{{ 'adminCodes.deleteConfirm' | translate }}</h3>
          <p class="muted" style="font-size:13px;margin:4px 0 0 0"><span class="mono">{{ deleting.code }}</span></p>
          <p *ngIf="deleteError" style="color:var(--rose);font-size:13px;margin:8px 0 0 0">{{ deleteError }}</p>
          <div class="row gap-2" style="margin-top:20px">
            <button (click)="deleting = null; deleteError = null" class="btn secondary" style="flex:1">{{ 'common.cancel' | translate }}</button>
            <button (click)="confirmDelete()" [disabled]="deletingBusy" class="btn danger" style="flex:1">{{ 'adminCodes.delete' | translate }}</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminCodesComponent implements OnInit, OnDestroy {
  loading = true;
  saving = false;
  error: string | null = null;
  items: AdminCode[] = [];
  page: Paginated<AdminCode> | null = null;
  pageNum = 1;
  pageLimit = 20;
  q = '';
  copiedCode: string | null = null;
  created: AdminCode | null = null;

  private search$ = new Subject<string>();
  private searchSub?: Subscription;

  creating = false;
  form: { code: string; max_uses: number; expires_at: string; enabled: boolean } = this.emptyForm();
  rewards: RewardRow[] = [];

  deleting: AdminCode | null = null;
  deletingBusy = false;
  deleteError: string | null = null;

  constructor(
    private svc: AdminCodesService,
    private t: TranslateService,
    private itemsSvc: ItemsService,
    private vehiclesSvc: VehiclesService,
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
    this.svc.list(this.q.trim(), this.pageNum, this.pageLimit).subscribe({
      next: p => { this.page = p; this.items = p.items; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  onSearch(v: string) { this.search$.next(v ?? ''); }
  goPage(page: number, limit: number) {
    this.pageNum = page;
    this.pageLimit = limit;
    this.reload();
  }

  statusText(s: AdminCode['status']): string { return this.t.instant('codes.status.' + s); }

  usesText(c: AdminCode): string {
    return c.max_uses === 0
      ? this.t.instant('adminCodes.usesUnlimited', { uses: c.uses })
      : this.t.instant('adminCodes.usesOf', { uses: c.uses, max: c.max_uses });
  }

  copy(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      this.copiedCode = code; setTimeout(() => this.copiedCode = null, 2000);
    });
  }

  // ---- Create modal ----
  emptyForm() {
    return { code: '', max_uses: 0, expires_at: '', enabled: true };
  }

  emptyRow(type: 'item' | 'vehicle' = 'item'): RewardRow {
    return { type, id: null, name: null, image_url: null, amount: 1, quality: 100, pickerQ: '', pickerResults: [], pickerTimer: null };
  }

  openNew() {
    this.creating = true;
    this.form = this.emptyForm();
    this.rewards = [this.emptyRow()];
    this.error = null;
  }

  addRow() { this.rewards.push(this.emptyRow()); }
  removeRow(i: number) { this.rewards.splice(i, 1); }

  onTypeChange(r: RewardRow, type: 'item' | 'vehicle') {
    r.type = type;
    this.clearPick(r);
  }

  onPickerSearch(r: RewardRow) {
    if (r.pickerTimer) clearTimeout(r.pickerTimer);
    const q = r.pickerQ.trim();
    if (!q) { r.pickerResults = []; return; }
    r.pickerTimer = setTimeout(() => {
      const obs = r.type === 'vehicle'
        ? this.vehiclesSvc.list(q, null, 1, 20)
        : this.itemsSvc.list(q, null, 1, 20);
      obs.subscribe({
        next: p => r.pickerResults = p.items,
        error: () => r.pickerResults = [],
      });
    }, 300);
  }

  pick(r: RewardRow, res: Item | Vehicle) {
    r.id = res.id;
    r.name = res.name;
    r.image_url = res.image_url;
    r.pickerResults = [];
    r.pickerQ = '';
  }

  clearPick(r: RewardRow) {
    r.id = null;
    r.name = null;
    r.image_url = null;
    r.pickerQ = '';
    r.pickerResults = [];
  }

  save() {
    const filled = this.rewards.filter(r => r.id != null);
    if (filled.length === 0) {
      this.error = this.t.instant('adminCodes.errors.noRewards');
      return;
    }
    const rewards: CodeRewardPayload[] = filled.map(r => {
      const reward: CodeRewardPayload = {
        kind: r.type,
        id: Number(r.id),
        amount: Math.max(1, Number(r.amount) || 1),
      };
      if (r.type === 'item') reward.quality = Math.min(100, Math.max(0, Number(r.quality) || 0));
      return reward;
    });

    const payload: CreateCodePayload = {
      max_uses: Math.max(0, Number(this.form.max_uses) || 0),
      enabled: this.form.enabled !== false,
      expires_at: bangkokInputToIso(this.form.expires_at),
      rewards,
    };
    const code = this.form.code.trim();
    if (code) payload.code = code;

    this.saving = true;
    this.error = null;
    this.svc.create(payload).subscribe({
      next: c => {
        this.saving = false;
        this.creating = false;
        this.created = c;
        this.reload();
      },
      error: e => {
        this.saving = false;
        this.error = e?.error?.message?.join?.(', ') || e?.error?.message || this.t.instant('adminCodes.errors.saveFail');
      },
    });
  }

  // ---- Toggle / delete ----
  toggle(c: AdminCode) {
    const next = !c.enabled;
    this.svc.toggleEnabled(c.code_id, next).subscribe({
      next: () => this.reload(),
      error: () => {},
    });
  }

  confirmDelete() {
    if (!this.deleting) return;
    const id = this.deleting.code_id;
    this.deletingBusy = true;
    this.deleteError = null;
    this.svc.remove(id).subscribe({
      next: () => {
        this.deleting = null;
        this.deletingBusy = false;
        this.reload();
      },
      error: e => {
        this.deletingBusy = false;
        this.deleteError = e?.error?.message || this.t.instant('adminCodes.errors.deleteFail');
      },
    });
  }
}
