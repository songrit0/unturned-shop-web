import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { EnrichedVaultItem, formatActorLabel, isDeletedActor, P2pListing, VaultDetail, VaultSummary } from '../../models/vault';
import { effectiveDisplayName, resolveVerifyStatus, VerifyStatus } from '../../models/verify-status';
import { Paginated } from '../../models/paginated';
import { AdminVaultSearchMode, VaultsService } from '../../services/vaults.service';
import { P2pService } from '../../services/p2p.service';
import { mapVaultP2pErrorKey } from '../../services/vault-errors';

@Component({
  selector: 'app-admin-vaults',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon rose"><span class="mi lg">inventory</span></div>
        <h1>{{ 'adminVaults.title' | translate }}</h1>
        <span class="badge rose"><span class="mi sm">shield</span>ADMIN</span>
        <div class="page-actions">
          <select class="select" [(ngModel)]="mode" (ngModelChange)="onModeChange()" style="width:140px">
            <option value="steam_id">{{ 'adminVaults.mode.steam_id' | translate }}</option>
            <option value="discord_id">{{ 'adminVaults.mode.discord_id' | translate }}</option>
            <option value="q">{{ 'adminVaults.mode.q' | translate }}</option>
          </select>
          <div class="input-wrap" style="width:280px">
            <span class="mi lead">search</span>
            <input type="search" class="input" [(ngModel)]="q" (ngModelChange)="onSearch($event)" [placeholder]="('adminVaults.searchPlaceholder.' + mode) | translate">
          </div>
        </div>
      </div>

      <div class="layout">
        <div class="list">
          <ng-container *ngIf="!loading; else loadingTpl">
            <button *ngFor="let v of summaries"
                    class="vault-row"
                    [class.active]="active?.owner_steam === v.owner_steam && active?.name === v.name"
                    (click)="open(v)">
              <div>
                <div style="font-weight:600">{{ v.owner_name || v.owner_steam }}</div>
                <div class="muted mono" style="font-size:11px">{{ v.owner_steam }} · {{ v.name }}</div>
              </div>
              <span class="badge faint">{{ v.item_count }}</span>
            </button>
            <div *ngIf="summaries.length === 0" class="empty">
              <span class="mi xxl">inventory_2</span>
              <div class="empty-title">{{ 'adminVaults.empty' | translate }}</div>
            </div>
          </ng-container>
          <ng-template #loadingTpl>
            <div style="text-align:center;padding:48px 0"><div class="spinner"></div></div>
          </ng-template>
        </div>

        <div class="detail">
          <ng-container *ngIf="active && !loadingDetail; else detailEmpty">
            <div class="table-wrap">
              <table class="tbl">
                <thead>
                  <tr>
                    <th style="width:56px"></th>
                    <th>{{ 'vaults.col.item' | translate }}</th>
                    <th style="width:80px">{{ 'vaults.col.amount' | translate }}</th>
                    <th style="width:160px">{{ 'vaults.col.quality' | translate }}</th>
                    <th style="width:120px">{{ 'vaults.col.actions' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let it of active!.items; let i = index">
                    <td>
                      <div style="width:40px;height:40px;background:var(--surface-2);border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden">
                        <img *ngIf="it.image_url; else noImg" [src]="it.image_url" style="width:100%;height:100%;object-fit:contain;padding:2px">
                        <ng-template #noImg><span class="mi faint">inventory_2</span></ng-template>
                      </div>
                    </td>
                    <td>
                      <div style="display:flex;align-items:center;gap:6px">
                        <span style="font-weight:600">{{ displayName(it) }}</span>
                        <ng-container *ngIf="verifyStatus(it) as vs">
                          <span *ngIf="vs.kind !== 'verified'" class="verify-icon" [title]="(vs.tooltipKey | translate:vs.tooltipParams)">
                            <span class="mi sm">info</span>
                          </span>
                        </ng-container>
                      </div>
                    </td>
                    <td class="mono">×{{ it.Amount }}</td>
                    <td>
                      <div class="qbar"><div class="qfill" [style.width.%]="it.Quality" [class.q-hi]="it.Quality >= 80" [class.q-mid]="it.Quality >= 40 && it.Quality < 80" [class.q-lo]="it.Quality < 40"></div></div>
                      <div class="muted mono" style="font-size:11px;margin-top:2px">Q{{ it.Quality }}</div>
                    </td>
                    <td>
                      <button class="btn ghost sm" style="color:var(--rose)" (click)="onDelete(i)">
                        <span class="mi sm">delete</span> {{ 'vaults.delete' | translate }}
                      </button>
                    </td>
                  </tr>
                  <tr *ngIf="active!.items.length === 0">
                    <td colspan="5">
                      <div class="empty">
                        <span class="mi xxl">inventory_2</span>
                        <div class="empty-title">{{ 'vaults.empty' | translate }}</div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="row gap-2" style="margin-top:16px;justify-content:flex-end">
              <button class="btn secondary" [disabled]="!dirty || saving" (click)="reloadDetail()">
                {{ 'common.discard' | translate }}
              </button>
              <button class="btn primary" [disabled]="!dirty || saving" (click)="save()">
                {{ (saving ? 'common.saving' : 'common.save') | translate }}
              </button>
            </div>
            <p *ngIf="saveError" style="color:var(--rose);font-size:13px;margin:8px 0 0 0">{{ saveError | translate }}</p>

            <div class="stuck">
              <h3 class="stuck-title">
                <span class="mi sm">warning</span>
                {{ 'adminVaults.stuckListings.title' | translate }}
              </h3>
              <ng-container *ngIf="!loadingStuck; else stuckLoading">
                <div *ngFor="let l of stuck" class="stuck-row">
                  <div style="width:36px;height:36px;background:var(--surface-2);border-radius:4px;display:flex;align-items:center;justify-content:center;overflow:hidden">
                    <img *ngIf="l.image_url" [src]="l.image_url" style="width:100%;height:100%;object-fit:contain;padding:2px">
                    <span *ngIf="!l.image_url" class="mi sm faint">inventory_2</span>
                  </div>
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ l.item_name || ('#' + l.item_id) }}</div>
                    <div class="mono" style="font-size:11px" [class.deleted-actor]="isSellerDeleted(l)">{{ sellerLabel(l) }}</div>
                    <div class="muted mono" style="font-size:11px">#{{ l.id }} · {{ l.price | number }} · Q{{ l.quality }}% · {{ l.created_at | date:'short' }}</div>
                  </div>
                  <button class="btn ghost sm" style="color:var(--rose)" (click)="askForceClose(l)">
                    <span class="mi sm">gpp_bad</span> {{ 'adminVaults.stuckListings.forceClose' | translate }}
                  </button>
                </div>
                <div *ngIf="stuck.length === 0" class="muted" style="font-size:12px;padding:8px 0">
                  {{ 'adminVaults.stuckListings.empty' | translate }}
                </div>
              </ng-container>
              <ng-template #stuckLoading>
                <div style="text-align:center;padding:16px 0"><div class="spinner"></div></div>
              </ng-template>
            </div>
          </ng-container>
          <ng-template #detailEmpty>
            <div *ngIf="loadingDetail" style="text-align:center;padding:48px 0"><div class="spinner"></div></div>
            <div *ngIf="!loadingDetail && !active" class="empty">
              <span class="mi xxl">touch_app</span>
              <div class="empty-title">{{ 'adminVaults.pickHint' | translate }}</div>
            </div>
          </ng-template>
        </div>
      </div>

      <!-- Force-close confirm -->
      <div *ngIf="closing" class="modal-backdrop" (click)="cancelForceClose()">
        <div class="modal-card tactical" style="max-width:380px;text-align:center" (click)="$event.stopPropagation()">
          <span class="mi xl" style="color:var(--rose)">gpp_bad</span>
          <h3 style="margin:8px 0 0 0;font-size:16px;font-weight:700">{{ 'adminVaults.stuckListings.confirm' | translate }}</h3>
          <p class="muted" style="font-size:13px;margin:6px 0 0 0">
            {{ closing.item_name || ('#' + closing.item_id) }} <span class="mono">(listing #{{ closing.id }})</span>
          </p>
          <p *ngIf="closeError" style="color:var(--rose);font-size:13px;margin:8px 0 0 0">{{ closeError | translate }}</p>
          <div class="row gap-2" style="margin-top:20px">
            <button class="btn secondary" style="flex:1" (click)="cancelForceClose()">{{ 'common.cancel' | translate }}</button>
            <button class="btn danger" style="flex:1" [disabled]="closeBusy" (click)="confirmForceClose()">
              {{ (closeBusy ? 'common.saving' : 'adminVaults.stuckListings.forceClose') | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .layout { display: grid; grid-template-columns: 320px 1fr; gap: 16px; }
    .list { display: flex; flex-direction: column; gap: 6px; }
    .vault-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; text-align: left; cursor: pointer; color: var(--text); }
    .vault-row:hover { border-color: var(--accent); }
    .vault-row.active { border-color: var(--rose); background: var(--surface-2); }
    .detail { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px; min-height: 480px; }
    .stuck { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border); }
    .stuck-title { display: flex; align-items: center; gap: 6px; margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: var(--rose); }
    .stuck-row { display: flex; align-items: center; gap: 10px; padding: 8px; background: var(--surface-2); border-radius: 6px; margin-bottom: 6px; }
    .qbar { width: 100%; height: 6px; background: var(--surface-2); border-radius: 3px; overflow: hidden; }
    .qfill { height: 100%; transition: width .2s ease; }
    .qfill.q-hi { background: var(--emerald); }
    .qfill.q-mid { background: var(--amber); }
    .qfill.q-lo { background: var(--rose); }
    .verify-icon { display: inline-flex; align-items: center; color: var(--rose); }
  `],
})
export class AdminVaultsComponent implements OnInit, OnDestroy {
  loading = true;
  loadingDetail = false;
  loadingStuck = false;
  saving = false;
  saveError: string | null = null;
  q = '';
  mode: AdminVaultSearchMode = 'steam_id';

  page: Paginated<VaultSummary> | null = null;
  summaries: VaultSummary[] = [];
  active: VaultDetail | null = null;
  dirty = false;

  stuck: P2pListing[] = [];
  sellerLabel = (l: P2pListing) => formatActorLabel(l.seller_discord_name, l.seller_steam);
  isSellerDeleted = (l: P2pListing) => isDeletedActor(l.seller_discord_name);
  closing: P2pListing | null = null;
  closeBusy = false;
  closeError: string | null = null;

  private search$ = new Subject<string>();
  private sub?: Subscription;

  constructor(private svc: VaultsService, private p2p: P2pService) {}

  ngOnInit() {
    this.sub = this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => this.reload());
    this.reload();
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  onSearch(v: string) { this.search$.next(v ?? ''); }

  onModeChange() {
    // Re-issue immediately on mode change so the user sees results match the new field semantics.
    this.reload();
  }

  reload() {
    this.loading = true;
    this.svc.adminList(this.mode, this.q, 1, 50).subscribe({
      next: p => { this.page = p; this.summaries = p.items; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  open(v: VaultSummary) {
    this.loadingDetail = true;
    this.dirty = false;
    this.svc.adminGet(v.owner_steam, v.name).subscribe({
      next: d => { this.active = d; this.loadingDetail = false; this.loadStuck(v.owner_steam); },
      error: () => { this.loadingDetail = false; },
    });
  }

  reloadDetail() {
    if (!this.active) return;
    this.open({
      owner_steam: this.active.owner_steam,
      owner_name: this.active.owner_name,
      name: this.active.name,
      item_count: this.active.items.length,
      last_update: this.active.last_update,
    });
  }

  // Admins don't have a per-user submission stream tied to the seller they're viewing — so we
  // pass `null` and the helper only flags `unverified` (sv_items.name null). No clickable suggest-edit
  // for admins; the icon is info-only.
  verifyStatus(it: EnrichedVaultItem): VerifyStatus {
    return resolveVerifyStatus({ name: it.name }, null);
  }

  displayName(it: EnrichedVaultItem): string {
    return effectiveDisplayName(it.Id, { name: it.name }, null);
  }

  onDelete(index: number) {
    if (!this.active) return;
    const items = this.active.items.filter((_, i) => i !== index);
    this.active = { ...this.active, items };
    this.dirty = true;
  }

  save() {
    if (!this.active) return;
    this.saving = true;
    this.saveError = null;
    this.svc.adminUpdate(this.active.owner_steam, this.active.name, this.active.items).subscribe({
      next: () => { this.saving = false; this.dirty = false; },
      error: e => { this.saving = false; this.saveError = mapVaultP2pErrorKey(e); },
    });
  }

  private loadStuck(sellerSteam: string) {
    this.loadingStuck = true;
    this.stuck = [];
    this.p2p.listActive({ seller: sellerSteam, status: 'active', limit: 50 }).subscribe({
      next: p => { this.stuck = p.items; this.loadingStuck = false; },
      error: () => { this.loadingStuck = false; },
    });
  }

  askForceClose(l: P2pListing) {
    this.closing = l;
    this.closeBusy = false;
    this.closeError = null;
  }

  cancelForceClose() {
    this.closing = null;
    this.closeBusy = false;
    this.closeError = null;
  }

  confirmForceClose() {
    if (!this.closing) return;
    const target = this.closing;
    this.closeBusy = true;
    this.closeError = null;
    this.p2p.adminForceClose(target.id).subscribe({
      next: () => {
        this.closeBusy = false;
        this.closing = null;
        if (this.active) this.loadStuck(this.active.owner_steam);
      },
      error: e => {
        this.closeBusy = false;
        this.closeError = mapVaultP2pErrorKey(e);
      },
    });
  }
}
