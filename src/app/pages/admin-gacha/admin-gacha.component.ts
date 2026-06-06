import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GachaService, GachaPrize, GachaConfig, GachaPrizeType } from '../../services/gacha.service';

interface RankRow { rank: number; spins: number; }

@Component({
  selector: 'app-admin-gacha',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon violet"><span class="mi lg">casino</span></div>
        <h1>Daily Draw</h1>
        <span class="badge rose"><span class="mi sm">shield</span>ADMIN</span>
      </div>

      <div *ngIf="loading" class="card" style="text-align:center;padding:40px"><span class="spinner"></span></div>

      <ng-container *ngIf="!loading">
        <!-- ===== Config ===== -->
        <section class="card" style="padding:18px;margin-bottom:16px" *ngIf="config">
          <div class="card-head"><span class="mi" style="color:var(--accent)">tune</span><span class="fw-7">Rules</span></div>
          <div class="cfg-grid">
            <label class="cfg-field">
              <span>Enabled</span>
              <input type="checkbox" [(ngModel)]="config.enabled">
            </label>
            <label class="cfg-field">
              <span>Base free spins / day</span>
              <input class="input" type="number" min="0" [(ngModel)]="config.base_free_spins">
            </label>
            <label class="cfg-field">
              <span>Price per spin (Coins) — blank = off</span>
              <input class="input" type="number" min="0" [(ngModel)]="priceCoinsInput">
            </label>
            <label class="cfg-field">
              <span>Price per spin (Meowcoins) — blank = off</span>
              <input class="input" type="number" min="0" [(ngModel)]="priceMeowInput">
            </label>
            <label class="cfg-field">
              <span>Redeem code TTL (days)</span>
              <input class="input" type="number" min="1" max="365" [(ngModel)]="config.code_ttl_days">
            </label>
          </div>

          <div style="margin-top:14px">
            <div class="muted text-sm" style="margin-bottom:6px">Free spins by leaderboard rank</div>
            <div class="rank-rows">
              <div class="rank-row" *ngFor="let r of rankRows; let i = index">
                <span class="muted text-xs">Rank #</span>
                <input class="input sm" type="number" min="1" [(ngModel)]="r.rank" style="width:70px">
                <span class="muted text-xs">→</span>
                <input class="input sm" type="number" min="0" [(ngModel)]="r.spins" style="width:70px">
                <span class="muted text-xs">spins</span>
                <button class="btn ghost sm" (click)="rankRows.splice(i,1)"><span class="mi sm">delete</span></button>
              </div>
            </div>
            <button class="btn ghost sm" style="margin-top:6px" (click)="rankRows.push({rank: nextRank(), spins: 1})">
              <span class="mi sm">add</span>Add rank
            </button>
          </div>

          <div class="row gap-2" style="margin-top:14px">
            <button class="btn primary" (click)="saveConfig()" [disabled]="savingConfig">
              <span *ngIf="savingConfig" class="spinner sm"></span>Save rules
            </button>
            <span *ngIf="cfgMsg" class="text-emerald text-sm" style="align-self:center">{{ cfgMsg }}</span>
          </div>
        </section>

        <!-- ===== Prize pool ===== -->
        <section class="card" style="padding:18px">
          <div class="card-head row" style="justify-content:space-between">
            <span class="row gap-2"><span class="mi" style="color:var(--amber)">redeem</span><span class="fw-7">Prize pool ({{ prizes.length }})</span></span>
            <div class="row gap-2">
              <button class="btn ghost sm" (click)="exportPrizes()" [disabled]="prizes.length === 0"><span class="mi sm">download</span>Export</button>
              <button class="btn ghost sm" (click)="fileInput.click()" [disabled]="importing"><span class="mi sm">upload</span>Import</button>
              <input #fileInput type="file" accept="application/json,.json" (change)="onImportFile($event)" hidden>
              <button class="btn secondary sm" (click)="saveWeights()" [disabled]="!weightsDirty || savingWeights">
                <span *ngIf="savingWeights" class="spinner sm"></span><span class="mi sm">percent</span>Save chances
              </button>
              <button class="btn primary sm" (click)="openNew()"><span class="mi sm">add</span>Add prize</button>
            </div>
          </div>

          <p *ngIf="importMsg" class="text-emerald text-xs" style="margin:0 0 6px">{{ importMsg }}</p>
          <p *ngIf="importError" class="text-rose text-xs" style="margin:0 0 6px">{{ importError }}</p>

          <p class="muted text-xs" style="margin-bottom:10px">
            Edit the <b>Weight</b> column to tune drop chances. Chance = weight ÷ total.
            Total weight: <b>{{ totalWeight() }}</b><span *ngIf="totalWeight() === 100" class="text-emerald"> (weight = %)</span>.
            Tip: make weights sum to 100 so each weight equals its %. ref_id = item / vehicle / VIP-package id.
            <span *ngIf="weightsMsg" class="text-emerald">· {{ weightsMsg }}</span>
          </p>

          <!-- Bulk action bar -->
          <div *ngIf="selected.size > 0" class="bulk-bar">
            <span class="fw-7">{{ selected.size }} selected</span>
            <button class="btn ghost sm" (click)="bulkEnable(true)" [disabled]="bulkBusy"><span class="mi sm">check_circle</span>Enable</button>
            <button class="btn ghost sm" (click)="bulkEnable(false)" [disabled]="bulkBusy"><span class="mi sm">cancel</span>Disable</button>
            <button class="btn ghost sm" (click)="bulkDelete()" [disabled]="bulkBusy" style="color:var(--rose)"><span class="mi sm">delete</span>Delete</button>
            <button class="btn ghost sm" (click)="clearSel()">Clear</button>
            <span *ngIf="bulkBusy" class="spinner sm"></span>
          </div>

          <div class="prize-table">
            <div class="prize-row prize-head">
              <span><input type="checkbox" [checked]="allSelected" [indeterminate]="someSelected" (change)="toggleAll($event)"></span>
              <span>Type</span><span>Prize</span><span>ref_id</span><span>Amount</span><span>Qual</span><span>Weight</span><span>Chance</span><span>On</span><span></span>
            </div>
            <div class="prize-row" *ngFor="let p of prizes" [class.sel]="selected.has(p.id)">
              <span><input type="checkbox" [checked]="selected.has(p.id)" (change)="toggleSel(p.id)"></span>
              <span class="badge" [class]="badgeClass(p.type)">{{ p.type }}</span>
              <span class="prize-label">
                <img *ngIf="p.image_url" [src]="p.image_url" class="prize-thumb" alt="">
                {{ p.label || prizeName(p) }}
                <span *ngIf="p.rarity" class="rar-tag" [class]="'rar-'+p.rarity">{{ p.rarity }}</span>
              </span>
              <span class="mono">{{ p.ref_id ?? '—' }}</span>
              <span class="mono">{{ p.amount | number }}</span>
              <span class="mono">{{ p.type === 'item' || p.type === 'vehicle' ? p.quality : '—' }}</span>
              <span><input class="input sm" type="number" min="0" step="0.1" [(ngModel)]="p.weight" (ngModelChange)="weightsDirty = true" style="width:62px"></span>
              <span class="mono" [class.text-emerald]="chance(p) !== '0'">{{ chance(p) }}%</span>
              <span><span class="mi sm" [style.color]="p.enabled ? 'var(--emerald)' : 'var(--muted)'">{{ p.enabled ? 'check_circle' : 'cancel' }}</span></span>
              <span class="row gap-1">
                <button class="btn ghost sm" (click)="edit(p)"><span class="mi sm">edit</span></button>
                <button class="btn ghost sm" (click)="remove(p)"><span class="mi sm">delete</span></button>
              </span>
            </div>
            <div *ngIf="prizes.length === 0" class="muted text-sm" style="padding:16px;text-align:center">No prizes yet.</div>
          </div>
        </section>
      </ng-container>

      <!-- Prize editor modal -->
      <div class="modal-backdrop" *ngIf="editing" (click)="cancelEdit()">
        <div class="modal" (click)="$event.stopPropagation()" style="max-width:440px;width:100%">
          <h2 style="margin-bottom:14px">{{ editing.id ? 'Edit prize' : 'New prize' }}</h2>
          <div class="form-grid">
            <label class="cfg-field"><span>Type</span>
              <select class="input" [(ngModel)]="editing.type">
                <option value="coins">Coins</option>
                <option value="meowcoins">Meowcoins</option>
                <option value="item">Item</option>
                <option value="vehicle">Vehicle</option>
                <option value="vip">VIP</option>
              </select>
            </label>
            <label class="cfg-field" *ngIf="needsRef()"><span>ref_id ({{ refHint() }})</span>
              <input class="input" type="number" [(ngModel)]="editing.ref_id">
            </label>
            <label class="cfg-field"><span>{{ amountLabel() }}</span>
              <input class="input" type="number" min="0" [(ngModel)]="editing.amount">
            </label>
            <label class="cfg-field" *ngIf="editing.type === 'item' || editing.type === 'vehicle'"><span>Quality (0-100)</span>
              <input class="input" type="number" min="0" max="100" [(ngModel)]="editing.quality">
            </label>
            <label class="cfg-field"><span>Weight (drop)</span>
              <input class="input" type="number" min="0" [(ngModel)]="editing.weight">
            </label>
            <label class="cfg-field"><span>Rarity</span>
              <select class="input" [(ngModel)]="editing.rarity">
                <option [ngValue]="null">—</option>
                <option value="common">common</option>
                <option value="rare">rare</option>
                <option value="epic">epic</option>
                <option value="legendary">legendary</option>
              </select>
            </label>
            <label class="cfg-field full"><span>Label (display, optional)</span>
              <input class="input" [(ngModel)]="editing.label">
            </label>
            <label class="cfg-field full"><span>Image URL (optional)</span>
              <input class="input" [(ngModel)]="editing.image_url">
            </label>
            <label class="cfg-field"><span>Enabled</span>
              <input type="checkbox" [(ngModel)]="editing.enabled">
            </label>
            <label class="cfg-field"><span>Sort</span>
              <input class="input" type="number" [(ngModel)]="editing.sort">
            </label>
          </div>
          <p *ngIf="editError" class="text-rose text-sm" style="margin-top:8px">{{ editError }}</p>
          <div class="row gap-2" style="margin-top:14px;justify-content:flex-end">
            <button class="btn ghost" (click)="cancelEdit()">Cancel</button>
            <button class="btn primary" (click)="save()" [disabled]="saving"><span *ngIf="saving" class="spinner sm"></span>Save</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card-head { display:flex; align-items:center; gap:8px; margin-bottom:12px; font-size:15px; }
    .cfg-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; }
    .cfg-field { display:flex; flex-direction:column; gap:4px; font-size:13px; }
    .cfg-field.full { grid-column:1/-1; }
    .cfg-field > span { color:var(--muted); font-size:12px; }
    .input.sm { padding:4px 8px; }
    .rank-rows { display:flex; flex-direction:column; gap:6px; }
    .rank-row { display:flex; align-items:center; gap:6px; }
    .prize-table { display:flex; flex-direction:column; }
    .prize-row { display:grid; grid-template-columns:32px 90px 1fr 70px 80px 56px 64px 64px 44px 88px; gap:8px; align-items:center;
      padding:8px 6px; border-bottom:1px solid var(--border); font-size:13px; }
    .prize-row.sel { background:color-mix(in srgb, var(--accent) 8%, transparent); }
    .bulk-bar { display:flex; align-items:center; gap:10px; margin-bottom:10px; padding:8px 12px;
      border:1px solid var(--accent); border-radius:10px; background:color-mix(in srgb, var(--accent) 8%, var(--surface)); font-size:13px; }
    .prize-head { font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); font-weight:700; }
    .prize-label { display:flex; align-items:center; gap:6px; overflow:hidden; }
    .prize-thumb { width:24px; height:24px; object-fit:contain; border-radius:4px; background:var(--surface-2); }
    .rar-tag { font-size:10px; font-weight:700; padding:1px 5px; border-radius:4px; }
    .rar-tag.rar-common{color:#9ca3af;} .rar-tag.rar-rare{color:#3b82f6;} .rar-tag.rar-epic{color:#a855f7;} .rar-tag.rar-legendary{color:#f5c518;}
    .badge.b-coins{background:color-mix(in srgb,var(--amber) 18%,transparent);color:var(--amber);}
    .badge.b-meowcoins{background:color-mix(in srgb,#ec4899 18%,transparent);color:#ec4899;}
    .badge.b-item{background:color-mix(in srgb,var(--accent) 18%,transparent);color:var(--accent);}
    .badge.b-vehicle{background:color-mix(in srgb,var(--emerald) 18%,transparent);color:var(--emerald);}
    .badge.b-vip{background:color-mix(in srgb,#a855f7 18%,transparent);color:#a855f7;}
    .modal-backdrop { position:fixed; inset:0; background:rgb(0 0 0 / .6); display:flex; align-items:center; justify-content:center; z-index:60; padding:16px; }
    .modal { background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:22px; }
    .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .form-grid .full { grid-column:1/-1; }
  `],
})
export class AdminGachaComponent implements OnInit {
  loading = true;
  config: GachaConfig | null = null;
  prizes: GachaPrize[] = [];
  rankRows: RankRow[] = [];
  priceCoinsInput: number | null = null;
  priceMeowInput: number | null = null;
  savingConfig = false;
  cfgMsg = '';

  editing: Partial<GachaPrize> | null = null;
  saving = false;
  editError: string | null = null;

  weightsDirty = false;
  savingWeights = false;
  weightsMsg = '';

  importing = false;
  importMsg: string | null = null;
  importError: string | null = null;

  selected = new Set<number>();
  bulkBusy = false;

  constructor(private gacha: GachaService) {}

  // ---- bulk selection ----
  get allSelected(): boolean {
    return this.prizes.length > 0 && this.prizes.every(p => this.selected.has(p.id));
  }
  get someSelected(): boolean {
    return this.selected.size > 0 && !this.allSelected;
  }
  toggleSel(id: number) {
    if (this.selected.has(id)) this.selected.delete(id); else this.selected.add(id);
  }
  toggleAll(ev: Event) {
    const on = (ev.target as HTMLInputElement).checked;
    this.selected = on ? new Set(this.prizes.map(p => p.id)) : new Set();
  }
  clearSel() { this.selected = new Set(); }

  private selectedPrizes(): GachaPrize[] {
    return this.prizes.filter(p => this.selected.has(p.id));
  }

  bulkEnable(enabled: boolean) {
    const targets = this.selectedPrizes().filter(p => p.enabled !== enabled);
    if (targets.length === 0 || this.bulkBusy) { this.clearSel(); return; }
    this.bulkBusy = true;
    forkJoin(targets.map(p => this.gacha.updatePrize(p.id, { ...p, enabled }).pipe(catchError(() => of(null)))))
      .subscribe(() => { this.bulkBusy = false; this.clearSel(); this.loadPrizes(); });
  }

  bulkDelete() {
    const ids = [...this.selected];
    if (ids.length === 0 || this.bulkBusy) return;
    if (!confirm(`Delete ${ids.length} selected prize(s)?`)) return;
    this.bulkBusy = true;
    forkJoin(ids.map(id => this.gacha.deletePrize(id).pipe(catchError(() => of(null)))))
      .subscribe(() => { this.bulkBusy = false; this.clearSel(); this.loadPrizes(); });
  }

  // ---- export / import ----
  exportPrizes() {
    const rows = this.prizes.map(p => ({
      type: p.type, ref_id: p.ref_id, amount: p.amount, quality: p.quality,
      weight: p.weight, label: p.label, image_url: p.image_url, rarity: p.rarity,
      enabled: p.enabled, sort: p.sort,
    }));
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gacha-prizes.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  onImportFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    this.importMsg = null;
    this.importError = null;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!Array.isArray(data)) throw new Error('not an array');
        this.runImport(data);
      } catch {
        this.importError = 'Invalid JSON file.';
      }
      input.value = '';
    };
    reader.onerror = () => { this.importError = 'Could not read file.'; input.value = ''; };
    reader.readAsText(file);
  }

  private runImport(rows: any[]) {
    const types: GachaPrizeType[] = ['coins', 'meowcoins', 'item', 'vehicle', 'vip'];
    const payloads: Partial<GachaPrize>[] = rows.map(r => {
      const type = types.includes(r?.type) ? r.type as GachaPrizeType : null;
      if (!type) return null;
      const needsRef = type === 'item' || type === 'vehicle' || type === 'vip';
      const ref_id = r?.ref_id == null ? null : Number(r.ref_id);
      if (needsRef && !(ref_id && ref_id > 0)) return null;
      return {
        type,
        ref_id: needsRef ? ref_id : null,
        amount: Math.max(0, Number(r?.amount) || 0),
        quality: Math.min(100, Math.max(0, Number(r?.quality ?? 100))),
        weight: Math.max(0, Number(r?.weight ?? 1)),
        label: r?.label ? String(r.label) : null,
        image_url: r?.image_url ? String(r.image_url) : null,
        rarity: r?.rarity ? String(r.rarity) : null,
        enabled: r?.enabled !== false,
        sort: Math.max(0, Number(r?.sort) || 0),
      } as Partial<GachaPrize>;
    }).filter((p): p is Partial<GachaPrize> => p !== null);

    if (payloads.length === 0) {
      this.importError = 'No valid prizes found in the file.';
      return;
    }

    this.importing = true;
    forkJoin(payloads.map(p => this.gacha.createPrize(p).pipe(catchError(() => of(null))))).subscribe(results => {
      const ok = results.filter(Boolean).length;
      this.importing = false;
      this.importMsg = `Imported ${ok}/${payloads.length} prizes.`;
      this.loadPrizes();
    });
  }

  totalWeight(): number {
    return Math.round(this.prizes.filter(p => p.enabled).reduce((s, p) => s + (Number(p.weight) || 0), 0) * 10) / 10;
  }

  /** Persist all prize weights (the inline-edited drop chances). */
  saveWeights() {
    if (!this.weightsDirty || this.savingWeights || this.prizes.length === 0) return;
    this.savingWeights = true;
    this.weightsMsg = '';
    const calls = this.prizes.map(p => this.gacha.updatePrize(p.id, p));
    forkJoin(calls).subscribe({
      next: () => { this.savingWeights = false; this.weightsDirty = false; this.weightsMsg = 'Saved'; setTimeout(() => this.weightsMsg = '', 2000); },
      error: () => { this.savingWeights = false; },
    });
  }

  ngOnInit() { this.load(); }

  private load() {
    this.loading = true;
    this.gacha.getConfig().subscribe({
      next: c => {
        this.config = c;
        this.priceCoinsInput = c.price_coins;
        this.priceMeowInput = c.price_meowcoins;
        this.rankRows = Object.entries(c.rank_bonus || {})
          .map(([rank, spins]) => ({ rank: Number(rank), spins: Number(spins) }))
          .sort((a, b) => a.rank - b.rank);
        this.loadPrizes();
      },
      error: () => { this.loading = false; },
    });
  }

  private loadPrizes() {
    this.gacha.listPrizes().subscribe({
      next: p => { this.prizes = p; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  nextRank(): number {
    return this.rankRows.length ? Math.max(...this.rankRows.map(r => r.rank)) + 1 : 1;
  }

  saveConfig() {
    if (!this.config) return;
    this.savingConfig = true;
    this.cfgMsg = '';
    const rank_bonus: Record<string, number> = {};
    for (const r of this.rankRows) {
      if (r.rank > 0 && r.spins >= 0) rank_bonus[String(r.rank)] = Number(r.spins);
    }
    this.gacha.setConfig({
      enabled: this.config.enabled,
      base_free_spins: Number(this.config.base_free_spins),
      rank_bonus,
      price_coins: this.priceCoinsInput === null || this.priceCoinsInput === undefined || (this.priceCoinsInput as any) === '' ? null : Number(this.priceCoinsInput),
      price_meowcoins: this.priceMeowInput === null || this.priceMeowInput === undefined || (this.priceMeowInput as any) === '' ? null : Number(this.priceMeowInput),
      code_ttl_days: Number(this.config.code_ttl_days),
    }).subscribe({
      next: c => { this.config = c; this.priceCoinsInput = c.price_coins; this.priceMeowInput = c.price_meowcoins; this.savingConfig = false; this.cfgMsg = 'Saved'; setTimeout(() => this.cfgMsg = '', 2000); },
      error: () => { this.savingConfig = false; this.cfgMsg = ''; },
    });
  }

  // ---- prize CRUD ----
  openNew() {
    this.editing = { type: 'coins', ref_id: null, amount: 100, quality: 100, weight: 1, label: null, image_url: null, rarity: 'common', enabled: true, sort: 0 };
    this.editError = null;
  }
  edit(p: GachaPrize) { this.editing = { ...p }; this.editError = null; }
  cancelEdit() { this.editing = null; }

  needsRef(): boolean {
    return this.editing?.type === 'item' || this.editing?.type === 'vehicle' || this.editing?.type === 'vip';
  }
  refHint(): string {
    if (this.editing?.type === 'item') return 'item id';
    if (this.editing?.type === 'vehicle') return 'vehicle id';
    if (this.editing?.type === 'vip') return 'VIP package id';
    return '';
  }
  amountLabel(): string {
    const t = this.editing?.type;
    if (t === 'coins') return 'Coins amount';
    if (t === 'meowcoins') return 'Meowcoins amount';
    if (t === 'vip') return 'VIP days (0 = package default)';
    return 'Quantity';
  }

  save() {
    if (!this.editing) return;
    this.saving = true;
    this.editError = null;
    const body = this.editing;
    const obs = body.id
      ? this.gacha.updatePrize(body.id, body)
      : this.gacha.createPrize(body);
    obs.subscribe({
      next: () => { this.saving = false; this.editing = null; this.loadPrizes(); },
      error: e => { this.saving = false; this.editError = e?.error?.message || 'Save failed'; },
    });
  }

  remove(p: GachaPrize) {
    if (!confirm(`Delete prize "${p.label || this.prizeName(p)}"?`)) return;
    this.gacha.deletePrize(p.id).subscribe({ next: () => this.loadPrizes(), error: () => {} });
  }

  // ---- display helpers ----
  prizeName(p: GachaPrize): string {
    if (p.type === 'coins') return `${p.amount} Coins`;
    if (p.type === 'meowcoins') return `${p.amount} Meowcoins`;
    if (p.type === 'vip') return `VIP (pkg ${p.ref_id})`;
    return `#${p.ref_id} x${p.amount}`;
  }
  badgeClass(t: GachaPrizeType): string { return 'b-' + t; }
  chance(p: GachaPrize): string {
    const total = this.prizes.filter(x => x.enabled && x.weight > 0).reduce((s, x) => s + x.weight, 0);
    if (!p.enabled || p.weight <= 0 || total <= 0) return '0';
    return ((p.weight / total) * 100).toFixed(1);
  }
}
