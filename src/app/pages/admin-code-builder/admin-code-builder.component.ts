import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Item, ItemsService } from '../../services/items.service';
import { Vehicle, VehiclesService } from '../../services/vehicles.service';
import { AdminCodesService, CreateCodePayload, CodeRewardPayload, AdminCode } from '../../services/admin-codes.service';
import { bangkokInputToIso } from '../../services/thai-time';

type Kind = 'item' | 'vehicle';

/** One reward chosen for the code (left/cart panel). */
interface BuiltReward {
  kind: Kind;
  id: number;
  name: string;
  image_url: string | null;
  amount: number;
  quality: number; // items only
}

/** A catalog entry the user can drag (right panel). */
interface CatalogEntry {
  kind: Kind;
  id: number;
  name: string;
  image_url: string | null;
}

@Component({
  selector: 'app-admin-code-builder',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon violet"><span class="mi lg">confirmation_number</span></div>
        <h1>Create Code</h1>
        <span class="badge rose"><span class="mi sm">shield</span>ADMIN</span>
        <div class="page-actions">
          <a routerLink="/admin/codes" class="btn ghost"><span class="mi sm">list</span> All codes</a>
        </div>
      </div>

      <!-- Created result -->
      <div *ngIf="created" class="card created-banner">
        <span class="mi" style="color:var(--emerald);font-size:26px">check_circle</span>
        <div class="grow">
          <div class="muted text-xs">Code created</div>
          <div class="code-big mono">{{ created.code }}</div>
        </div>
        <button class="btn secondary sm" (click)="copy(created.code)"><span class="mi sm">{{ copied ? 'check' : 'content_copy' }}</span>Copy</button>
        <button class="btn ghost sm" (click)="created = null">New</button>
      </div>

      <div class="builder">
        <!-- LEFT: the code being built (drop target) -->
        <section class="card build-panel" (dragover)="onDragOver($event)" (drop)="onDrop()" [class.drag-over]="dragOver">
          <div class="card-head"><span class="mi" style="color:var(--violet,#a78bfa)">redeem</span><span class="fw-7">Code contents ({{ rewards.length }})</span></div>

          <div *ngIf="rewards.length === 0" class="drop-hint">
            <span class="mi xl">drag_pan</span>
            <p class="muted text-sm">Drag items from the right, or click them, to add to this code.</p>
          </div>

          <div class="reward-list">
            <div class="reward-row" *ngFor="let r of rewards; let i = index">
              <span class="rw-thumb">
                <img *ngIf="r.image_url; else rwi" [src]="r.image_url" alt="">
                <ng-template #rwi><span class="mi">{{ r.kind === 'vehicle' ? 'directions_car' : 'inventory_2' }}</span></ng-template>
              </span>
              <div class="rw-main">
                <div class="rw-name">{{ r.name }} <span class="badge" [class]="r.kind === 'vehicle' ? 'b-veh' : 'b-item'">{{ r.kind }}</span></div>
                <div class="rw-id mono muted">#{{ r.id }}</div>
              </div>
              <label class="rw-field"><span>Qty</span>
                <input class="input sm" type="number" min="1" [(ngModel)]="r.amount" style="width:62px">
              </label>
              <label class="rw-field" *ngIf="r.kind === 'item'"><span>Qual</span>
                <input class="input sm" type="number" min="0" max="100" [(ngModel)]="r.quality" style="width:62px">
              </label>
              <button class="btn ghost sm" (click)="rewards.splice(i,1)" style="color:var(--rose)"><span class="mi sm">close</span></button>
            </div>
          </div>

          <!-- Settings -->
          <div class="settings">
            <div class="set-grid">
              <label class="set-field"><span>Custom code (optional)</span>
                <input class="input mono" [(ngModel)]="form.code" maxlength="64" placeholder="auto-generate">
              </label>
              <label class="set-field"><span>Max uses (0 = unlimited)</span>
                <input class="input" type="number" min="0" [(ngModel)]="form.max_uses">
              </label>
              <label class="set-field"><span>Expires (optional, Thai time)</span>
                <input class="input" type="datetime-local" [(ngModel)]="form.expires_at">
              </label>
              <label class="set-field row" style="align-items:center;gap:8px">
                <input type="checkbox" [(ngModel)]="form.enabled"><span>Enabled</span>
              </label>
            </div>
            <p *ngIf="error" class="text-rose text-sm" style="margin:8px 0 0">{{ error }}</p>
            <div class="row gap-2" style="margin-top:12px">
              <button class="btn primary lg" (click)="createCode()" [disabled]="saving || rewards.length === 0">
                <span *ngIf="saving" class="spinner sm"></span><span class="mi">bolt</span>Create code
              </button>
              <button class="btn ghost" (click)="rewards = []" [disabled]="rewards.length === 0">Clear</button>
            </div>
          </div>
        </section>

        <!-- RIGHT: catalog (draggable source) -->
        <section class="card catalog-panel">
          <div class="cat-tabs">
            <button class="tab-btn" [class.active]="tab === 'item'" (click)="switchTab('item')"><span class="mi sm">inventory_2</span>Items</button>
            <button class="tab-btn" [class.active]="tab === 'vehicle'" (click)="switchTab('vehicle')"><span class="mi sm">directions_car</span>Vehicles</button>
          </div>
          <div class="input-wrap" style="margin-bottom:10px">
            <span class="mi lead">search</span>
            <input type="search" class="input" [(ngModel)]="q" (ngModelChange)="onSearch($event)" placeholder="Search by name or id">
          </div>

          <div *ngIf="loading" class="cat-loading"><span class="spinner"></span></div>
          <div class="catalog-grid" *ngIf="!loading">
            <div class="cat-card" *ngFor="let c of catalog" draggable="true" (dragstart)="onDragStart(c)" (dragend)="dragging = null" (click)="addReward(c)" [title]="c.name + ' (#' + c.id + ')'">
              <div class="cat-thumb">
                <img *ngIf="c.image_url; else ci" [src]="c.image_url" alt="">
                <ng-template #ci><span class="mi">{{ c.kind === 'vehicle' ? 'directions_car' : 'inventory_2' }}</span></ng-template>
              </div>
              <div class="cat-name">{{ c.name }}</div>
              <div class="cat-id mono">#{{ c.id }}</div>
              <span class="cat-add mi">add_circle</span>
            </div>
            <div *ngIf="catalog.length === 0" class="muted text-sm" style="grid-column:1/-1;text-align:center;padding:20px">No results.</div>
          </div>
          <div *ngIf="!loading && hasMore" style="text-align:center;margin-top:12px">
            <button class="btn secondary sm" (click)="loadMore()" [disabled]="loadingMore">
              <span class="mi sm">expand_more</span>{{ loadingMore ? 'Loading…' : 'Load more' }}
            </button>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .card-head { display:flex; align-items:center; gap:8px; margin-bottom:12px; font-size:15px; }
    .builder { display:grid; grid-template-columns:1fr 1fr; gap:16px; align-items:start; }
    @media (max-width:900px){ .builder { grid-template-columns:1fr; } }

    .build-panel { min-height:300px; transition:border-color .12s, background .12s; }
    .build-panel.drag-over { border-color:var(--violet,#a78bfa); background:color-mix(in srgb, var(--violet,#a78bfa) 8%, var(--surface)); }
    .drop-hint { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; padding:32px 0; text-align:center; color:var(--text-faint); border:2px dashed var(--border); border-radius:12px; }
    .reward-list { display:flex; flex-direction:column; gap:6px; }
    .reward-row { display:flex; align-items:center; gap:10px; padding:8px; border-radius:10px; background:var(--surface-2); }
    .rw-thumb { width:42px; height:42px; flex:0 0 auto; border-radius:8px; background:var(--surface); display:flex; align-items:center; justify-content:center; overflow:hidden; color:var(--text-faint); }
    .rw-thumb img { width:100%; height:100%; object-fit:contain; padding:3px; }
    .rw-main { flex:1; min-width:0; }
    .rw-name { font-weight:600; font-size:13px; display:flex; align-items:center; gap:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .rw-id { font-size:11px; }
    .rw-field { display:flex; flex-direction:column; gap:2px; font-size:10px; color:var(--muted); }
    .input.sm { padding:4px 8px; }
    .b-item { background:color-mix(in srgb,var(--accent) 18%,transparent); color:var(--accent); }
    .b-veh { background:color-mix(in srgb,var(--emerald) 18%,transparent); color:var(--emerald); }

    .settings { margin-top:16px; border-top:1px solid var(--border); padding-top:14px; }
    .set-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    @media (max-width:560px){ .set-grid { grid-template-columns:1fr; } }
    .set-field { display:flex; flex-direction:column; gap:4px; font-size:12px; }
    .set-field > span { color:var(--muted); }

    .cat-tabs { display:flex; gap:4px; margin-bottom:10px; border-bottom:1px solid var(--border); }
    .tab-btn { display:flex; align-items:center; gap:6px; padding:8px 14px; background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-1px; cursor:pointer; color:var(--muted); font-size:13px; font-weight:600; }
    .tab-btn.active { color:var(--accent); border-bottom-color:var(--accent); }
    .cat-loading { display:flex; justify-content:center; padding:30px; }
    .catalog-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(110px,1fr)); gap:10px; }
    .cat-card { position:relative; background:var(--surface-2); border:1px solid var(--border); border-radius:10px; padding:10px 8px; text-align:center; cursor:grab; transition:transform .1s, border-color .1s; }
    .cat-card:hover { border-color:var(--violet,#a78bfa); transform:translateY(-2px); }
    .cat-card:active { cursor:grabbing; }
    .cat-thumb { aspect-ratio:1; background:var(--surface); border-radius:8px; display:flex; align-items:center; justify-content:center; overflow:hidden; margin-bottom:6px; color:var(--text-faint); }
    .cat-thumb img { width:100%; height:100%; object-fit:contain; padding:6px; pointer-events:none; }
    .cat-name { font-size:12px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .cat-id { font-size:10px; color:var(--text-faint); }
    .cat-add { position:absolute; top:4px; right:4px; font-size:18px; color:var(--violet,#a78bfa); opacity:0; transition:opacity .1s; }
    .cat-card:hover .cat-add { opacity:1; }

    .created-banner { display:flex; align-items:center; gap:14px; margin-bottom:16px; padding:14px 18px; border-color:var(--emerald); }
    .code-big { font-size:22px; font-weight:800; letter-spacing:.05em; }
  `],
})
export class AdminCodeBuilderComponent implements OnInit, OnDestroy {
  tab: Kind = 'item';
  q = '';
  loading = true;
  loadingMore = false;
  catalog: CatalogEntry[] = [];
  pageNum = 1;
  pageLimit = 24;
  total = 0;

  rewards: BuiltReward[] = [];
  form = { code: '', max_uses: 0, expires_at: '', enabled: true };
  saving = false;
  error: string | null = null;
  created: AdminCode | null = null;
  copied = false;

  dragging: CatalogEntry | null = null;
  dragOver = false;

  private search$ = new Subject<string>();
  private sub?: Subscription;

  constructor(
    private items: ItemsService,
    private vehicles: VehiclesService,
    private svc: AdminCodesService,
  ) {}

  ngOnInit() {
    this.sub = this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => this.reload());
    this.reload();
  }
  ngOnDestroy() { this.sub?.unsubscribe(); }

  switchTab(k: Kind) { if (k === this.tab) return; this.tab = k; this.q = ''; this.reload(); }
  onSearch(v: string) { this.search$.next(v ?? ''); }

  get hasMore(): boolean { return this.catalog.length < this.total; }

  private fetch(page: number) {
    const src = this.tab === 'item'
      ? this.items.list(this.q.trim(), null, page, this.pageLimit)
      : this.vehicles.list(this.q.trim(), null, page, this.pageLimit);
    return src;
  }

  reload() {
    this.loading = true;
    this.pageNum = 1;
    this.fetch(1).subscribe({
      next: p => {
        this.total = p.total;
        this.catalog = (p.items as Array<Item | Vehicle>).map(e => this.toEntry(e));
        this.loading = false;
      },
      error: () => { this.loading = false; this.catalog = []; },
    });
  }

  loadMore() {
    if (!this.hasMore || this.loadingMore) return;
    this.loadingMore = true;
    const next = this.pageNum + 1;
    this.fetch(next).subscribe({
      next: p => {
        this.pageNum = next;
        this.total = p.total;
        this.catalog = [...this.catalog, ...(p.items as Array<Item | Vehicle>).map(e => this.toEntry(e))];
        this.loadingMore = false;
      },
      error: () => { this.loadingMore = false; },
    });
  }

  private toEntry(e: Item | Vehicle): CatalogEntry {
    return { kind: this.tab, id: e.id, name: e.name, image_url: e.image_url ?? null };
  }

  // ---- drag & drop ----
  onDragStart(c: CatalogEntry) { this.dragging = c; }
  onDragOver(ev: DragEvent) { ev.preventDefault(); this.dragOver = true; }
  onDrop() {
    this.dragOver = false;
    if (this.dragging) { this.addReward(this.dragging); this.dragging = null; }
  }

  /** Add (or bump qty of) a catalog entry in the code. */
  addReward(c: CatalogEntry) {
    const existing = this.rewards.find(r => r.kind === c.kind && r.id === c.id);
    if (existing) { existing.amount += 1; return; }
    this.rewards.push({ kind: c.kind, id: c.id, name: c.name, image_url: c.image_url, amount: 1, quality: 100 });
  }

  createCode() {
    if (this.rewards.length === 0 || this.saving) return;
    this.saving = true;
    this.error = null;
    const rewards: CodeRewardPayload[] = this.rewards.map(r => {
      const rw: CodeRewardPayload = { kind: r.kind, id: r.id, amount: Math.max(1, Number(r.amount) || 1) };
      if (r.kind === 'item') rw.quality = Math.min(100, Math.max(0, Number(r.quality) || 0));
      return rw;
    });
    const payload: CreateCodePayload = {
      max_uses: Math.max(0, Number(this.form.max_uses) || 0),
      enabled: this.form.enabled !== false,
      expires_at: bangkokInputToIso(this.form.expires_at),
      rewards,
    };
    const code = this.form.code.trim();
    if (code) payload.code = code;

    this.svc.create(payload).subscribe({
      next: c => {
        this.saving = false;
        this.created = c;
        this.rewards = [];
        this.form = { code: '', max_uses: 0, expires_at: '', enabled: true };
      },
      error: e => { this.saving = false; this.error = e?.error?.message || 'Create failed'; },
    });
  }

  copy(code: string) {
    navigator.clipboard.writeText(code).then(() => { this.copied = true; setTimeout(() => this.copied = false, 2000); });
  }
}
