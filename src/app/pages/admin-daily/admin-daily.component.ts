import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  DailyService, DailyAdminConfig, DailyTierView, DailyItemRow, DailyTier,
  DailyTierConfigPayload, DailyItemPayload,
} from '../../services/daily.service';

// Per-tier local copy of the editable config fields so the form is decoupled from the
// last-saved server view until the admin presses Save.
interface TierForm {
  enabled: boolean;
  coins: number;
  codeTtlDays: number;
  saving: boolean;
  msg: string;
}

@Component({
  selector: 'app-admin-daily',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon amber"><span class="mi lg">redeem</span></div>
        <h1>{{ 'adminDaily.title' | translate }}</h1>
        <span class="badge rose"><span class="mi sm">shield</span>ADMIN</span>
      </div>

      <div *ngIf="loading" class="card" style="text-align:center;padding:40px"><span class="spinner"></span></div>

      <ng-container *ngIf="!loading && config">
        <!-- One panel per tier -->
        <section class="card tier-card" *ngFor="let tier of tiers" [class.vip]="tier === 'vip'">
          <div class="card-head">
            <span class="mi" [style.color]="tier === 'vip' ? 'var(--amber, #f5c518)' : 'var(--accent)'">
              {{ tier === 'vip' ? 'workspace_premium' : 'person' }}
            </span>
            <span class="fw-7">{{ (tier === 'vip' ? 'adminDaily.tierVip' : 'adminDaily.tierNormal') | translate }}</span>
          </div>

          <!-- Config -->
          <div class="cfg-grid">
            <label class="cfg-field">
              <span>{{ 'adminDaily.enabled' | translate }}</span>
              <input type="checkbox" [(ngModel)]="forms[tier].enabled">
            </label>
            <label class="cfg-field">
              <span>{{ 'adminDaily.coins' | translate }}</span>
              <input class="input" type="number" min="0" [(ngModel)]="forms[tier].coins">
            </label>
            <label class="cfg-field">
              <span>{{ 'adminDaily.codeTtlDays' | translate }}</span>
              <input class="input" type="number" min="1" max="365" [(ngModel)]="forms[tier].codeTtlDays">
            </label>
          </div>
          <div class="row gap-2" style="margin-top:12px">
            <button class="btn primary" (click)="saveConfig(tier)" [disabled]="forms[tier].saving">
              <span *ngIf="forms[tier].saving" class="spinner sm"></span>{{ 'adminDaily.saveConfig' | translate }}
            </button>
            <span *ngIf="forms[tier].msg" class="text-emerald text-sm" style="align-self:center">{{ forms[tier].msg }}</span>
          </div>

          <!-- Reward rows (items + vehicles combined) -->
          <div class="card-head row" style="justify-content:space-between;margin-top:18px">
            <span class="row gap-2"><span class="mi" style="color:var(--amber)">inventory_2</span>
              <span class="fw-7">{{ 'adminDaily.rewards' | translate }} ({{ rows(tier).length }})</span></span>
            <button class="btn primary sm" (click)="openNew(tier)"><span class="mi sm">add</span>{{ 'adminDaily.addRow' | translate }}</button>
          </div>

          <div class="row-table">
            <div class="row-line row-head">
              <span>{{ 'adminDaily.kind' | translate }}</span>
              <span>{{ 'adminDaily.reward' | translate }}</span>
              <span>{{ 'adminDaily.itemId' | translate }}</span>
              <span>{{ 'adminDaily.amount' | translate }}</span>
              <span>{{ 'adminDaily.quality' | translate }}</span>
              <span>{{ 'adminDaily.sort' | translate }}</span>
              <span>{{ 'adminDaily.on' | translate }}</span>
              <span></span>
            </div>
            <div class="row-line" *ngFor="let r of rows(tier)">
              <span class="badge" [class]="r.kind === 1 ? 'b-vehicle' : 'b-item'">
                {{ (r.kind === 1 ? 'adminDaily.vehicle' : 'adminDaily.item') | translate }}
              </span>
              <span class="row-label">
                <img *ngIf="r.imageUrl" [src]="r.imageUrl" class="row-thumb" alt="">
                {{ r.label || ('#' + r.itemId) }}
              </span>
              <span class="mono">{{ r.itemId }}</span>
              <span class="mono">{{ r.amount | number }}</span>
              <span class="mono">{{ r.quality }}</span>
              <span class="mono">{{ r.sort }}</span>
              <span><span class="mi sm" [style.color]="r.enabled ? 'var(--emerald)' : 'var(--muted)'">{{ r.enabled ? 'check_circle' : 'cancel' }}</span></span>
              <span class="row gap-1">
                <button class="btn ghost sm" (click)="edit(r)"><span class="mi sm">edit</span></button>
                <button class="btn ghost sm" (click)="remove(r)"><span class="mi sm">delete</span></button>
              </span>
            </div>
            <div *ngIf="rows(tier).length === 0" class="muted text-sm" style="padding:14px;text-align:center">
              {{ 'adminDaily.noRows' | translate }}
            </div>
          </div>
        </section>
      </ng-container>

      <!-- Row editor modal -->
      <div class="modal-backdrop" *ngIf="editing" (click)="cancelEdit()">
        <div class="modal" (click)="$event.stopPropagation()" style="max-width:440px;width:100%">
          <h2 style="margin-bottom:14px">
            {{ (editing.id ? 'adminDaily.editRow' : 'adminDaily.newRow') | translate }}
            · {{ (editTier === 'vip' ? 'adminDaily.tierVip' : 'adminDaily.tierNormal') | translate }}
          </h2>
          <div class="form-grid">
            <!-- item vs vehicle toggle: id spaces overlap, kind disambiguates -->
            <label class="cfg-field full"><span>{{ 'adminDaily.kind' | translate }}</span>
              <div class="kind-toggle">
                <button type="button" class="kind-btn" [class.on]="editing.kind === 0" (click)="editing.kind = 0">
                  <span class="mi sm">inventory_2</span>{{ 'adminDaily.item' | translate }}
                </button>
                <button type="button" class="kind-btn" [class.on]="editing.kind === 1" (click)="editing.kind = 1">
                  <span class="mi sm">directions_car</span>{{ 'adminDaily.vehicle' | translate }}
                </button>
              </div>
            </label>
            <label class="cfg-field"><span>{{ 'adminDaily.itemId' | translate }}</span>
              <input class="input" type="number" min="1" [(ngModel)]="editing.itemId">
            </label>
            <label class="cfg-field"><span>{{ 'adminDaily.amount' | translate }}</span>
              <input class="input" type="number" min="1" [(ngModel)]="editing.amount">
            </label>
            <label class="cfg-field"><span>{{ 'adminDaily.quality' | translate }} (0-100)</span>
              <input class="input" type="number" min="0" max="100" [(ngModel)]="editing.quality">
            </label>
            <label class="cfg-field"><span>{{ 'adminDaily.sort' | translate }}</span>
              <input class="input" type="number" [(ngModel)]="editing.sort">
            </label>
            <label class="cfg-field full"><span>{{ 'adminDaily.label' | translate }}</span>
              <input class="input" [(ngModel)]="editing.label" [placeholder]="'adminDaily.labelHint' | translate">
            </label>
            <label class="cfg-field full"><span>{{ 'adminDaily.imageUrl' | translate }}</span>
              <input class="input" [(ngModel)]="editing.imageUrl">
            </label>
            <label class="cfg-field"><span>{{ 'adminDaily.enabled' | translate }}</span>
              <input type="checkbox" [(ngModel)]="editing.enabled">
            </label>
          </div>
          <p *ngIf="editError" class="text-rose text-sm" style="margin-top:8px">{{ editError }}</p>
          <div class="row gap-2" style="margin-top:14px;justify-content:flex-end">
            <button class="btn ghost" (click)="cancelEdit()">{{ 'adminDaily.cancel' | translate }}</button>
            <button class="btn primary" (click)="save()" [disabled]="saving">
              <span *ngIf="saving" class="spinner sm"></span>{{ 'adminDaily.save' | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card-head { display:flex; align-items:center; gap:8px; margin-bottom:12px; font-size:15px; }
    .tier-card { padding:18px; margin-bottom:16px; }
    .tier-card.vip { border-color:var(--amber, #f5c518); }
    .cfg-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px; }
    .cfg-field { display:flex; flex-direction:column; gap:4px; font-size:13px; }
    .cfg-field.full { grid-column:1/-1; }
    .cfg-field > span { color:var(--muted); font-size:12px; }
    .row-table { display:flex; flex-direction:column; }
    .row-line { display:grid; grid-template-columns:84px 1fr 80px 80px 60px 60px 44px 88px; gap:8px; align-items:center;
      padding:8px 6px; border-bottom:1px solid var(--border); font-size:13px; }
    .row-head { font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); font-weight:700; }
    .row-label { display:flex; align-items:center; gap:6px; overflow:hidden; }
    .row-thumb { width:24px; height:24px; object-fit:contain; border-radius:4px; background:var(--surface-2); }
    .badge.b-item{background:color-mix(in srgb,var(--accent) 18%,transparent);color:var(--accent);}
    .badge.b-vehicle{background:color-mix(in srgb,var(--emerald) 18%,transparent);color:var(--emerald);}
    .kind-toggle { display:flex; gap:0; border:1px solid var(--border); border-radius:10px; overflow:hidden; }
    .kind-btn { flex:1; display:inline-flex; align-items:center; justify-content:center; gap:5px; padding:8px;
      background:var(--surface-2); border:none; color:var(--muted); font-weight:600; cursor:pointer; font-size:13px; }
    .kind-btn.on { background:var(--accent); color:#fff; }
    .modal-backdrop { position:fixed; inset:0; background:rgb(0 0 0 / .6); display:flex; align-items:center; justify-content:center; z-index:60; padding:16px; }
    .modal { background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:22px; }
    .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .form-grid .full { grid-column:1/-1; }
  `],
})
export class AdminDailyComponent implements OnInit {
  loading = true;
  config: DailyAdminConfig | null = null;
  tiers: DailyTier[] = ['normal', 'vip'];
  forms: Record<DailyTier, TierForm> = {
    normal: { enabled: false, coins: 0, codeTtlDays: 7, saving: false, msg: '' },
    vip: { enabled: false, coins: 0, codeTtlDays: 7, saving: false, msg: '' },
  };

  editing: DailyItemPayload & { id?: number } | null = null;
  editTier: DailyTier = 'normal';
  saving = false;
  editError: string | null = null;

  constructor(private daily: DailyService, private t: TranslateService) {}

  ngOnInit() { this.load(); }

  private load() {
    this.loading = true;
    this.daily.getConfig().subscribe({
      next: c => {
        this.config = c;
        for (const tier of this.tiers) this.syncForm(tier, c.tiers[tier]);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  private syncForm(tier: DailyTier, v: DailyTierView) {
    const f = this.forms[tier];
    f.enabled = v.enabled;
    f.coins = v.coins;
    f.codeTtlDays = v.codeTtlDays;
  }

  /** Combined item (kind 0) + vehicle (kind 1) rows for a tier, as returned by the API. */
  rows(tier: DailyTier): DailyItemRow[] {
    const v = this.config?.tiers[tier];
    if (!v) return [];
    return [...(v.items || []), ...(v.vehicles || [])];
  }

  saveConfig(tier: DailyTier) {
    const f = this.forms[tier];
    f.saving = true;
    f.msg = '';
    const payload: DailyTierConfigPayload = {
      enabled: f.enabled,
      coins: Math.max(0, Number(f.coins) || 0),
      codeTtlDays: Math.min(365, Math.max(1, Number(f.codeTtlDays) || 1)),
    };
    this.daily.setTierConfig(tier, payload).subscribe({
      next: v => {
        if (this.config) this.config.tiers[tier] = v;
        this.syncForm(tier, v);
        f.saving = false;
        f.msg = this.t.instant('adminDaily.saved');
        setTimeout(() => f.msg = '', 2000);
      },
      error: () => { f.saving = false; },
    });
  }

  // ---- row CRUD ----
  openNew(tier: DailyTier) {
    this.editTier = tier;
    this.editing = { tier, itemId: undefined, amount: 1, quality: 100, kind: 0, label: null, imageUrl: null, sort: 0, enabled: true };
    this.editError = null;
  }
  edit(r: DailyItemRow) {
    this.editTier = r.tier;
    this.editing = {
      id: r.id, tier: r.tier, itemId: r.itemId, amount: r.amount, quality: r.quality,
      kind: r.kind, label: r.label, imageUrl: r.imageUrl, sort: r.sort, enabled: r.enabled,
    };
    this.editError = null;
  }
  cancelEdit() { this.editing = null; }

  save() {
    if (!this.editing) return;
    const e = this.editing;
    if (!e.itemId || Number(e.itemId) < 1) { this.editError = this.t.instant('adminDaily.errItemId'); return; }
    if (!e.amount || Number(e.amount) < 1) { this.editError = this.t.instant('adminDaily.errAmount'); return; }
    this.saving = true;
    this.editError = null;
    const payload: DailyItemPayload = {
      tier: e.tier,
      itemId: Number(e.itemId),
      amount: Number(e.amount),
      quality: Math.min(100, Math.max(0, Number(e.quality ?? 100))),
      kind: (e.kind === 1 ? 1 : 0),
      label: e.label ? String(e.label) : null,
      imageUrl: e.imageUrl ? String(e.imageUrl) : null,
      sort: Number(e.sort) || 0,
      enabled: e.enabled !== false,
    };
    const obs = e.id ? this.daily.updateItem(e.id, payload) : this.daily.createItem(payload);
    obs.subscribe({
      next: () => { this.saving = false; this.editing = null; this.load(); },
      error: err => { this.saving = false; this.editError = err?.error?.message || this.t.instant('adminDaily.saveFailed'); },
    });
  }

  remove(r: DailyItemRow) {
    if (!confirm(this.t.instant('adminDaily.confirmDelete', { label: r.label || ('#' + r.itemId) }))) return;
    this.daily.deleteItem(r.id).subscribe({ next: () => this.load(), error: () => {} });
  }
}
