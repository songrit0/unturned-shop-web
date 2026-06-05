import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  AdminDonateReward,
  AdminDonateService,
  AdminDonateTier,
  AdminDonateTierPayload,
} from '../../services/admin-donate.service';
import { Item, ItemsService } from '../../services/items.service';
import { Vehicle, VehiclesService } from '../../services/vehicles.service';

/** One editable reward row in the tier form (same pattern as admin-codes). */
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
  selector: 'app-admin-donate-tiers',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon rose"><span class="mi lg">military_tech</span></div>
        <h1>{{ 'adminDonate.title' | translate }}</h1>
        <span class="badge rose"><span class="mi sm">shield</span>ADMIN</span>
        <div class="page-actions">
          <button (click)="openNew()" class="btn primary">
            <span class="mi sm">add</span> {{ 'adminDonate.create' | translate }}
          </button>
        </div>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div class="col gap-3">
          <div *ngFor="let t of tiers" class="card" style="padding:18px;">
            <div class="row gap-3 wrap between">
              <div class="row gap-3">
                <div style="width:56px; height:56px; background: rgb(59 130 246 / 0.12); border:1px solid rgb(59 130 246 / 0.3); border-radius: var(--radius); display:flex; align-items:center; justify-content:center; gap:2px;">
                  <img class="coin-img meow" src="assets/coins/meowcoin.png" alt="" style="width:20px;height:20px">
                </div>
                <div>
                  <div class="row gap-2" style="align-items:baseline">
                    <span class="mono fw-7" style="font-size:20px; color:var(--meowcoin)">{{ t.threshold_baht | number }}</span>
                    <span class="muted">{{ 'topup.baht' | translate }}</span>
                    <span class="fw-7">{{ t.name }}</span>
                  </div>
                  <div class="row gap-2 mt-1 wrap">
                    <span class="badge" [class.emerald]="t.enabled" [class.slate]="!t.enabled">
                      {{ (t.enabled ? 'adminDonate.on' : 'adminDonate.off') | translate }}
                    </span>
                    <span class="mono faint text-xs row gap-1"><span class="mi sm">sort</span>{{ t.sort }}</span>
                    <span class="mono faint text-xs row gap-1"><span class="mi sm">redeem</span>{{ t.rewards.length }} {{ 'adminDonate.rewardsCount' | translate }}</span>
                  </div>
                </div>
              </div>
              <div class="row gap-2">
                <button (click)="openEdit(t)" class="btn secondary sm"><span class="mi sm">edit</span> {{ 'adminDonate.edit' | translate }}</button>
                <button (click)="deleting = t" class="btn ghost sm" style="color:var(--rose)"><span class="mi sm">delete</span></button>
              </div>
            </div>
          </div>

          <div *ngIf="tiers.length === 0" class="empty">
            <span class="mi xxl">military_tech</span>
            <div class="empty-title">{{ 'adminDonate.empty' | translate }}</div>
          </div>
        </div>
      </ng-container>
      <ng-template #loadingTpl>
        <div style="text-align:center;padding:48px 0"><div class="spinner"></div></div>
      </ng-template>

      <!-- Create / edit modal -->
      <div *ngIf="editing" class="modal-backdrop">
        <div class="modal-card tactical" style="max-width:620px">
          <h3 style="display:flex;align-items:center;gap:8px;margin:0 0 16px 0;font-size:18px;font-weight:700">
            <span class="mi">{{ editId ? 'edit' : 'add_circle' }}</span>
            {{ (editId ? 'adminDonate.editTitle' : 'adminDonate.createTitle') | translate }}
          </h3>
          <div style="display:flex;flex-direction:column;gap:12px">
            <div class="row gap-3" style="align-items:stretch">
              <label style="flex:1;display:block">
                <span class="muted" style="font-size:12px">{{ 'adminDonate.form.threshold' | translate }}</span>
                <input type="number" class="input mono" [(ngModel)]="form.threshold_baht" min="1" style="margin-top:4px">
              </label>
              <label style="flex:1;display:block">
                <span class="muted" style="font-size:12px">{{ 'adminDonate.form.sort' | translate }}</span>
                <input type="number" class="input mono" [(ngModel)]="form.sort" min="0" style="margin-top:4px">
              </label>
            </div>

            <div class="row gap-3" style="align-items:stretch">
              <label style="flex:2;display:block">
                <span class="muted" style="font-size:12px">{{ 'adminDonate.form.name' | translate }}</span>
                <input type="text" class="input" [(ngModel)]="form.name" maxlength="80" style="margin-top:4px" [placeholder]="'adminDonate.form.nameHint' | translate">
              </label>
              <label style="flex:1;display:flex;align-items:center;gap:8px;padding-top:18px">
                <input type="checkbox" [(ngModel)]="form.enabled">
                <span>{{ 'adminDonate.form.enabled' | translate }}</span>
              </label>
            </div>

            <div>
              <div class="row between" style="align-items:center;margin-bottom:6px">
                <span class="muted" style="font-size:12px">{{ 'adminDonate.form.rewards' | translate }}</span>
                <button type="button" (click)="addRow()" class="btn ghost sm"><span class="mi sm">add</span> {{ 'adminDonate.form.addReward' | translate }}</button>
              </div>

              <div *ngFor="let r of rewards; let i = index" style="background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px">
                <div class="row gap-2" style="align-items:flex-start">
                  <select class="select" [ngModel]="r.type" (ngModelChange)="onTypeChange(r, $event)" style="width:110px;flex-shrink:0">
                    <option value="item">{{ 'adminDonate.form.item' | translate }}</option>
                    <option value="vehicle">{{ 'adminDonate.form.vehicle' | translate }}</option>
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
                               [placeholder]="(r.type === 'vehicle' ? 'adminDonate.form.pickVehicle' : 'adminDonate.form.pickItem') | translate">
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
                    <span class="muted" style="font-size:11px">{{ 'adminDonate.form.amount' | translate }}</span>
                    <input type="number" class="input mono" [(ngModel)]="r.amount" min="1" style="margin-top:2px">
                  </label>
                  <label *ngIf="r.type === 'item'" style="width:78px;flex-shrink:0">
                    <span class="muted" style="font-size:11px">{{ 'adminDonate.form.quality' | translate }}</span>
                    <input type="number" class="input mono" [(ngModel)]="r.quality" min="0" max="100" style="margin-top:2px">
                  </label>

                  <button type="button" (click)="removeRow(i)" class="btn ghost sm" style="color:var(--rose);margin-top:2px"><span class="mi sm">delete</span></button>
                </div>
              </div>
            </div>
          </div>

          <p *ngIf="error" style="color:var(--rose);font-size:13px;margin:12px 0 0 0">{{ error }}</p>
          <div class="row gap-2" style="margin-top:20px">
            <button (click)="editing = false" class="btn secondary" style="flex:1">{{ 'common.cancel' | translate }}</button>
            <button (click)="save()" [disabled]="saving" class="btn primary" style="flex:1">
              {{ (saving ? 'common.saving' : (editId ? 'adminDonate.save' : 'adminDonate.create')) | translate }}
            </button>
          </div>
        </div>
      </div>

      <!-- Delete confirm -->
      <div *ngIf="deleting" class="modal-backdrop">
        <div class="modal-card tactical" style="max-width:380px;text-align:center">
          <span class="mi xl" style="color:var(--rose)">warning</span>
          <h3 style="margin:8px 0 0 0;font-size:16px;font-weight:700">{{ 'adminDonate.deleteConfirm' | translate }}</h3>
          <p class="muted" style="font-size:13px;margin:4px 0 0 0">{{ deleting.name }} · {{ deleting.threshold_baht | number }} {{ 'topup.baht' | translate }}</p>
          <p *ngIf="deleteError" style="color:var(--rose);font-size:13px;margin:8px 0 0 0">{{ deleteError }}</p>
          <div class="row gap-2" style="margin-top:20px">
            <button (click)="deleting = null; deleteError = null" class="btn secondary" style="flex:1">{{ 'common.cancel' | translate }}</button>
            <button (click)="confirmDelete()" [disabled]="deletingBusy" class="btn danger" style="flex:1">{{ 'adminDonate.delete' | translate }}</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminDonateTiersComponent implements OnInit {
  loading = true;
  saving = false;
  error: string | null = null;
  tiers: AdminDonateTier[] = [];

  editing = false;
  editId: number | null = null;
  form: { threshold_baht: number; name: string; enabled: boolean; sort: number } = this.emptyForm();
  rewards: RewardRow[] = [];

  deleting: AdminDonateTier | null = null;
  deletingBusy = false;
  deleteError: string | null = null;

  constructor(
    private svc: AdminDonateService,
    private t: TranslateService,
    private itemsSvc: ItemsService,
    private vehiclesSvc: VehiclesService,
  ) {}

  ngOnInit() { this.reload(); }

  reload() {
    this.loading = true;
    this.svc.listTiers().subscribe({
      next: list => { this.tiers = (list || []).slice().sort((a, b) => a.sort - b.sort || a.threshold_baht - b.threshold_baht); this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  // ---- Create / edit modal ----
  emptyForm() {
    return { threshold_baht: 100, name: '', enabled: true, sort: 0 };
  }

  emptyRow(type: 'item' | 'vehicle' = 'item'): RewardRow {
    return { type, id: null, name: null, image_url: null, amount: 1, quality: 100, pickerQ: '', pickerResults: [], pickerTimer: null };
  }

  openNew() {
    this.editing = true;
    this.editId = null;
    this.form = this.emptyForm();
    this.rewards = [this.emptyRow()];
    this.error = null;
  }

  openEdit(t: AdminDonateTier) {
    this.editing = true;
    this.editId = t.id;
    this.form = { threshold_baht: t.threshold_baht, name: t.name, enabled: t.enabled, sort: t.sort };
    // Map existing rewards into editable rows; resolve their name/image lazily.
    this.rewards = (t.rewards && t.rewards.length > 0)
      ? t.rewards.map(r => this.rowFromReward(r))
      : [this.emptyRow()];
    this.error = null;
  }

  /** Build an editable row from a stored reward; fetch its name/image so the chip renders. */
  private rowFromReward(r: AdminDonateReward): RewardRow {
    const type: 'item' | 'vehicle' = r.kind === 'vehicle' ? 'vehicle' : 'item';
    const row: RewardRow = {
      type, id: r.item_id, name: '#' + r.item_id, image_url: null,
      amount: r.amount || 1, quality: r.quality ?? 100,
      pickerQ: '', pickerResults: [], pickerTimer: null,
    };
    const obs = type === 'vehicle' ? this.vehiclesSvc.getOne(r.item_id) : this.itemsSvc.adminGet(r.item_id);
    obs.subscribe({
      next: (e: Item | Vehicle) => { row.name = e.name; row.image_url = e.image_url; },
      error: () => {},
    });
    return row;
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
      this.error = this.t.instant('adminDonate.errors.noRewards');
      return;
    }
    if (!this.form.name.trim()) {
      this.error = this.t.instant('adminDonate.errors.noName');
      return;
    }
    const rewards: AdminDonateReward[] = filled.map(r => ({
      kind: r.type,
      item_id: Number(r.id),
      amount: Math.max(1, Number(r.amount) || 1),
      quality: r.type === 'item' ? Math.min(100, Math.max(0, Number(r.quality) || 0)) : 0,
    }));

    const payload: AdminDonateTierPayload = {
      threshold_baht: Math.max(1, Number(this.form.threshold_baht) || 1),
      name: this.form.name.trim(),
      enabled: this.form.enabled !== false,
      sort: Math.max(0, Number(this.form.sort) || 0),
      rewards,
    };

    this.saving = true;
    this.error = null;
    const obs = this.editId
      ? this.svc.updateTier(this.editId, payload)
      : this.svc.createTier(payload);
    obs.subscribe({
      next: () => {
        this.saving = false;
        this.editing = false;
        this.reload();
      },
      error: e => {
        this.saving = false;
        this.error = e?.error?.message?.join?.(', ') || e?.error?.message || this.t.instant('adminDonate.errors.saveFail');
      },
    });
  }

  // ---- Delete ----
  confirmDelete() {
    if (!this.deleting) return;
    const id = this.deleting.id;
    this.deletingBusy = true;
    this.deleteError = null;
    this.svc.deleteTier(id).subscribe({
      next: () => {
        this.deleting = null;
        this.deletingBusy = false;
        this.reload();
      },
      error: e => {
        this.deletingBusy = false;
        this.deleteError = e?.error?.message || this.t.instant('adminDonate.errors.deleteFail');
      },
    });
  }
}
