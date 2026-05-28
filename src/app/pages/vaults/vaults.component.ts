import { Component, OnInit } from '@angular/core';
import { EnrichedVaultItem, VaultDetail, VaultSummary } from '../../models/vault';
import { ItemSubmission, SubmissionPatch, SubmissionStatus } from '../../models/item-submission';
import { effectiveDisplayName, effectiveImageUrl, resolveVerifyStatus, VerifyStatus } from '../../models/verify-status';
import { Router } from '@angular/router';
import { VaultsService } from '../../services/vaults.service';
import { P2pService } from '../../services/p2p.service';
import { ItemSubmissionsService } from '../../services/item-submissions.service';
import { mapVaultP2pErrorKey } from '../../services/vault-errors';

@Component({
  selector: 'app-vaults',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon emerald"><span class="mi lg">inventory</span></div>
        <h1>{{ 'vaults.title' | translate }}</h1>
      </div>

      <ng-container *ngIf="!loadingList; else loadingTpl">
        <div class="vault-tabs">
          <button *ngFor="let v of summaries"
                  class="vault-tab"
                  [class.active]="active?.name === v.name"
                  (click)="open(v)">
            <span class="mi sm">archive</span>
            {{ v.name }}
            <span class="badge faint">{{ v.item_count }}</span>
          </button>
        </div>

        <ng-container *ngIf="active && !loadingDetail; else detailLoading">
          <div class="card flush">
            <div class="table-wrap">
              <table class="tbl">
                <thead>
                  <tr>
                    <th style="width:56px"></th>
                    <th>{{ 'vaults.col.item' | translate }}</th>
                    <th style="width:80px">{{ 'vaults.col.amount' | translate }}</th>
                    <th style="width:160px">{{ 'vaults.col.quality' | translate }}</th>
                    <th style="width:200px">{{ 'vaults.col.actions' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let it of active.items; let i = index" [class.row-dim]="verifyStatus(it).dimmed">
                    <td>
                      <div style="width:40px;height:40px;background:var(--surface-2);border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden">
                        <img *ngIf="thumbUrl(it) as url; else noImg" [src]="url" style="width:100%;height:100%;object-fit:contain;padding:2px">
                        <ng-template #noImg><span class="mi faint">inventory_2</span></ng-template>
                      </div>
                    </td>
                    <td>
                      <div style="display:flex;align-items:center;gap:6px">
                        <span style="font-weight:600">{{ displayName(it) }}</span>
                        <ng-container *ngIf="verifyStatus(it) as vs">
                          <span *ngIf="vs.kind !== 'verified'"
                                class="verify-icon clickable"
                                [title]="(vs.tooltipKey | translate:vs.tooltipParams)"
                                (click)="onVerifyClick(i, vs)">
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
                      <div class="row gap-1">
                        <button class="btn ghost sm" (click)="onRequestList(i)">
                          <span class="mi sm">storefront</span> {{ 'vaults.listOnMarket' | translate }}
                        </button>
                        <ng-container [ngSwitch]="submissionStatus(it)">
                          <span *ngSwitchCase="'pending'" class="badge amber" [title]="'suggestEdit.statusPending' | translate"><span class="mi sm">hourglass_empty</span> {{ 'submissions.status.pending' | translate }}</span>
                          <span *ngSwitchCase="'approved'" class="badge emerald" [title]="'suggestEdit.statusApproved' | translate"><span class="mi sm">check</span> {{ 'submissions.status.approved' | translate }}</span>
                          <span *ngSwitchCase="'rejected'" class="badge rose" [title]="'suggestEdit.statusRejected' | translate"><span class="mi sm">close</span> {{ 'submissions.status.rejected' | translate }}</span>
                          <button *ngSwitchDefault class="btn ghost sm" (click)="onRequestSuggest(i)">
                            <span class="mi sm">edit_note</span> {{ 'vaults.suggestEdit' | translate }}
                          </button>
                        </ng-container>
                        <button class="btn ghost sm" style="color:var(--rose)" (click)="onDelete(i)">
                          <span class="mi sm">delete</span> {{ 'vaults.delete' | translate }}
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="active.items.length === 0">
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
          </div>

          <div class="row gap-2" style="margin-top:16px;justify-content:flex-end">
            <button class="btn secondary" [disabled]="!dirty || saving" (click)="reload()">
              {{ 'common.discard' | translate }}
            </button>
            <button class="btn primary" [disabled]="!dirty || saving" (click)="save()">
              {{ (saving ? 'common.saving' : 'common.save') | translate }}
            </button>
          </div>
          <p *ngIf="saveError" style="color:var(--rose);font-size:13px;margin:8px 0 0 0">{{ saveError | translate }}</p>
        </ng-container>
        <ng-template #detailLoading>
          <div *ngIf="active" style="text-align:center;padding:48px 0"><div class="spinner"></div></div>
        </ng-template>
      </ng-container>
      <ng-template #loadingTpl>
        <div style="text-align:center;padding:48px 0"><div class="spinner"></div></div>
      </ng-template>

      <app-list-on-market-modal
        *ngIf="listing"
        [item]="listing"
        [busy]="listingBusy"
        [error]="listingError"
        (confirm)="confirmList($event)"
        (cancel)="cancelList()"
      ></app-list-on-market-modal>

      <app-suggest-edit-modal
        *ngIf="suggesting"
        [item]="suggesting"
        [busy]="suggestBusy"
        [error]="suggestError"
        (confirm)="confirmSuggest($event)"
        (cancel)="cancelSuggest()"
      ></app-suggest-edit-modal>
    </div>
  `,
  styles: [`
    .qbar { width: 100%; height: 6px; background: var(--surface-2); border-radius: 3px; overflow: hidden; }
    .qfill { height: 100%; transition: width .2s ease; }
    .qfill.q-hi { background: var(--emerald); }
    .qfill.q-mid { background: var(--amber); }
    .qfill.q-lo { background: var(--rose); }
    tr.row-dim { opacity: 0.55; }
    .verify-icon { display: inline-flex; align-items: center; color: var(--rose); }
    .verify-icon.clickable { cursor: pointer; }
    .verify-icon.clickable:hover { color: var(--rose-hi, var(--rose)); filter: brightness(1.2); }
  `],
})
export class VaultsComponent implements OnInit {
  loadingList = true;
  loadingDetail = false;
  saving = false;
  saveError: string | null = null;

  summaries: VaultSummary[] = [];
  active: VaultDetail | null = null;
  dirty = false;

  listing: EnrichedVaultItem | null = null;
  listingIndex: number | null = null;
  listingBusy = false;
  listingError: string | null = null;

  suggesting: EnrichedVaultItem | null = null;
  suggestingIndex: number | null = null;
  suggestBusy = false;
  suggestError: string | null = null;

  // Map of item_id → user's most recent submission (any status). Used to drive:
  //  - the action column (badge for pending/approved, button for unverified/rejected)
  //  - the row's verify-status icon + dimming
  //  - the display name override when a pending submission proposed a new name
  // Rejected submissions DON'T block re-submit (api UNIQUE only against pending/approved) — but we
  // still hold onto the rejected row so the rose-tooltip "Rejected: <admin_note>" can render.
  private submissionByItemId = new Map<number, ItemSubmission>();

  constructor(
    private svc: VaultsService,
    private p2p: P2pService,
    private submissions: ItemSubmissionsService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.svc.getMine().subscribe({
      next: list => {
        this.summaries = list;
        this.loadingList = false;
        if (list.length) this.open(list[0]);
      },
      error: () => { this.loadingList = false; },
    });
    this.loadMySubmissions();
  }

  private loadMySubmissions() {
    this.submissions.listMine(1, 200).subscribe({
      next: p => {
        const map = new Map<number, ItemSubmission>();
        // api returns rows sorted by submitted_at DESC, so the first row we see per item_id is the newest.
        // Prefer pending > approved > rejected for action-column semantics (pending button stays a badge
        // even if an older approved row exists). For the verify-status icon we want the *most recent*
        // outcome — and a pending entry IS the most recent, so this priority happens to do both jobs.
        for (const s of p.items) {
          const prev = map.get(s.item_id);
          if (!prev) { map.set(s.item_id, s); continue; }
          const rank = (st: SubmissionStatus) => st === 'pending' ? 3 : st === 'approved' ? 2 : 1;
          if (rank(s.status) > rank(prev.status)) map.set(s.item_id, s);
        }
        this.submissionByItemId = map;
      },
      error: () => {},
    });
  }

  submissionFor(it: EnrichedVaultItem): ItemSubmission | null {
    return this.submissionByItemId.get(it.Id) ?? null;
  }

  submissionStatus(it: EnrichedVaultItem): SubmissionStatus | null {
    const s = this.submissionFor(it);
    // Drive the action column the same way as before, but treat rejected as "no badge" so the
    // Suggest-edit button is offered again (api UNIQUE doesn't block re-submit after rejection).
    if (!s || s.status === 'rejected') return null;
    return s.status;
  }

  verifyStatus(it: EnrichedVaultItem): VerifyStatus {
    return resolveVerifyStatus(
      { name: it.name, image_url: it.image_url, type_id: it.type_id },
      this.submissionFor(it),
    );
  }

  displayName(it: EnrichedVaultItem): string {
    return effectiveDisplayName(it.Id, { name: it.name }, this.submissionFor(it));
  }

  thumbUrl(it: EnrichedVaultItem): string | null {
    return effectiveImageUrl({ name: it.name, image_url: it.image_url }, this.submissionFor(it));
  }

  // Unverified → suggest-edit modal. Pending/Rejected → /my-submissions for full status + admin_note.
  onVerifyClick(index: number, vs: VerifyStatus) {
    if (vs.clickable) { this.onRequestSuggest(index); return; }
    if (vs.kind === 'pending' || vs.kind === 'rejected') {
      this.router.navigateByUrl('/my-submissions');
    }
  }

  open(v: VaultSummary) {
    if (this.active?.name === v.name) return;
    this.loadingDetail = true;
    this.dirty = false;
    this.svc.getMineByName(v.name).subscribe({
      next: detail => { this.active = detail; this.loadingDetail = false; },
      error: () => { this.loadingDetail = false; },
    });
  }

  reload() {
    if (!this.active) return;
    const cur = this.active;
    this.active = null;
    this.loadingDetail = true;
    this.svc.getMineByName(cur.name).subscribe({
      next: detail => { this.active = detail; this.loadingDetail = false; this.dirty = false; },
      error: () => { this.loadingDetail = false; },
    });
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
    this.svc.updateMine(this.active.name, this.active.items).subscribe({
      next: () => { this.saving = false; this.dirty = false; },
      error: e => { this.saving = false; this.saveError = mapVaultP2pErrorKey(e); },
    });
  }

  onRequestList(index: number) {
    if (!this.active) return;
    this.listingIndex = index;
    this.listing = this.active.items[index];
    this.listingBusy = false;
    this.listingError = null;
  }

  confirmList(price: number) {
    if (!this.active || this.listingIndex == null) return;
    this.listingBusy = true;
    this.listingError = null;
    this.p2p.create({ vault_name: this.active.name, item_index: this.listingIndex, price }).subscribe({
      next: () => {
        if (this.active && this.listingIndex != null) {
          const items = this.active.items.filter((_, i) => i !== this.listingIndex);
          this.active = { ...this.active, items };
        }
        this.listingBusy = false;
        this.cancelList();
        this.dirty = false;
      },
      error: e => {
        this.listingBusy = false;
        this.listingError = mapVaultP2pErrorKey(e);
      },
    });
  }

  cancelList() {
    this.listing = null;
    this.listingIndex = null;
    this.listingBusy = false;
    this.listingError = null;
  }

  onRequestSuggest(index: number) {
    if (!this.active) return;
    this.suggestingIndex = index;
    this.suggesting = this.active.items[index];
    this.suggestBusy = false;
    this.suggestError = null;
  }

  confirmSuggest(patch: SubmissionPatch) {
    if (!this.suggesting) return;
    const itemId = this.suggesting.Id;
    this.suggestBusy = true;
    this.suggestError = null;
    this.submissions.create(itemId, patch).subscribe({
      next: sub => {
        this.submissionByItemId.set(itemId, sub);
        this.suggestBusy = false;
        this.cancelSuggest();
      },
      error: e => {
        this.suggestBusy = false;
        this.suggestError = mapVaultP2pErrorKey(e);
      },
    });
  }

  cancelSuggest() {
    this.suggesting = null;
    this.suggestingIndex = null;
    this.suggestBusy = false;
    this.suggestError = null;
  }
}
