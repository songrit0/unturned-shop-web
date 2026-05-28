import { Component, OnInit } from '@angular/core';
import { ItemSubmission, SubmissionStatus } from '../../models/item-submission';
import { formatActorLabel, isDeletedActor } from '../../models/vault';
import { Paginated } from '../../models/paginated';
import { ItemSubmissionsService } from '../../services/item-submissions.service';
import { mapVaultP2pErrorKey } from '../../services/vault-errors';

interface DiffRow { field: string; current: string | null; proposed: string | null; changed: boolean }

@Component({
  selector: 'app-admin-item-submissions',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon rose"><span class="mi lg">edit_note</span></div>
        <h1>{{ 'adminSubmissions.title' | translate }}</h1>
        <span class="badge rose"><span class="mi sm">shield</span>ADMIN</span>
        <div class="page-actions">
          <select class="select" [(ngModel)]="statusFilter" (ngModelChange)="reload()" style="width:140px">
            <option [ngValue]="'pending'">{{ 'submissions.status.pending' | translate }}</option>
            <option [ngValue]="'approved'">{{ 'submissions.status.approved' | translate }}</option>
            <option [ngValue]="'rejected'">{{ 'submissions.status.rejected' | translate }}</option>
            <option [ngValue]="null">{{ 'adminSubmissions.all' | translate }}</option>
          </select>
        </div>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div *ngFor="let s of items" class="sub-card">
          <div class="sub-head" (click)="toggle(s.id)">
            <div style="width:40px;height:40px;background:var(--surface-2);border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden">
              <img *ngIf="s.current_item?.image_url" [src]="s.current_item!.image_url!" style="width:100%;height:100%;object-fit:contain;padding:2px">
              <span *ngIf="!s.current_item?.image_url" class="mi faint">inventory_2</span>
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600">{{ s.current_item?.name || ('#' + s.item_id) }}</div>
              <div class="mono" style="font-size:11px" [class.deleted-actor]="isSubmitterDeleted(s)">{{ submitterLabel(s) }} · <span class="muted">{{ s.submitted_at | date:'short' }}</span></div>
            </div>
            <span class="badge"
                  [class.amber]="s.status === 'pending'"
                  [class.emerald]="s.status === 'approved'"
                  [class.rose]="s.status === 'rejected'">
              {{ ('submissions.status.' + s.status) | translate }}
            </span>
            <span class="mi sm" style="color:var(--muted)">{{ expanded === s.id ? 'expand_less' : 'expand_more' }}</span>
          </div>

          <div *ngIf="expanded === s.id" class="sub-body">
            <table class="diff-tbl">
              <thead>
                <tr>
                  <th style="width:120px">{{ 'adminSubmissions.diff.field' | translate }}</th>
                  <th>{{ 'adminSubmissions.diff.current' | translate }}</th>
                  <th>{{ 'adminSubmissions.diff.proposed' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let r of diff(s)" [class.changed]="r.changed">
                  <td class="muted mono" style="font-size:12px">{{ r.field }}</td>
                  <td>{{ r.current ?? '—' }}</td>
                  <td>{{ r.proposed ?? '—' }}</td>
                </tr>
              </tbody>
            </table>

            <div *ngIf="s.admin_note" class="note">
              <span class="mi sm">sticky_note_2</span> <b>Note:</b> {{ s.admin_note }}
              <span *ngIf="s.reviewer_discord_name" class="muted">· {{ reviewerLabel(s) }}</span>
            </div>

            <div *ngIf="s.status === 'pending'" class="row gap-2" style="margin-top:12px;justify-content:flex-end">
              <button class="btn ghost sm" style="color:var(--rose)" [disabled]="busy === s.id" (click)="askReject(s)">
                <span class="mi sm">close</span> {{ 'adminSubmissions.reject' | translate }}
              </button>
              <button class="btn primary sm" [disabled]="busy === s.id" (click)="approve(s)">
                <span class="mi sm">check</span> {{ busy === s.id ? ('common.saving' | translate) : ('adminSubmissions.approve' | translate) }}
              </button>
            </div>
            <p *ngIf="rowError[s.id] as err" style="color:var(--rose);font-size:13px;margin:8px 0 0 0">{{ err | translate }}</p>
          </div>
        </div>

        <div *ngIf="items.length === 0" class="empty">
          <span class="mi xxl">edit_note</span>
          <div class="empty-title">{{ 'adminSubmissions.empty' | translate }}</div>
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

      <!-- Reject modal -->
      <div *ngIf="rejecting" class="modal-backdrop" (click)="cancelReject()">
        <div class="modal-card tactical" style="max-width:480px" (click)="$event.stopPropagation()">
          <h3 style="margin:0 0 12px 0;font-size:18px;font-weight:700">{{ 'adminSubmissions.rejectTitle' | translate }}</h3>
          <p class="muted" style="font-size:13px;margin:0 0 8px 0">
            {{ rejecting.current_item?.name || ('#' + rejecting.item_id) }} <span class="mono">(submission #{{ rejecting.id }})</span>
          </p>
          <label style="display:block;margin-bottom:8px">
            <span class="muted" style="font-size:12px">{{ 'adminSubmissions.adminNote' | translate }}</span>
            <textarea [(ngModel)]="rejectNote" maxlength="2048" rows="3" class="input" style="margin-top:4px;height:auto;padding:8px 12px;font-family:inherit"></textarea>
          </label>
          <p *ngIf="rejectError" style="color:var(--rose);font-size:13px;margin:8px 0 0 0">{{ rejectError | translate }}</p>
          <div class="row gap-2" style="margin-top:16px">
            <button class="btn secondary" style="flex:1" (click)="cancelReject()">{{ 'common.cancel' | translate }}</button>
            <button class="btn danger" style="flex:1" [disabled]="rejectBusy" (click)="confirmReject()">
              {{ (rejectBusy ? 'common.saving' : 'adminSubmissions.reject') | translate }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sub-card { background: var(--surface-1); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 8px; }
    .sub-head { display: flex; align-items: center; gap: 12px; padding: 12px; cursor: pointer; }
    .sub-head:hover { background: var(--surface-2); }
    .sub-body { padding: 12px; border-top: 1px solid var(--border); }
    .diff-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .diff-tbl th { text-align: left; padding: 6px 8px; color: var(--muted); font-weight: 600; font-size: 11px; }
    .diff-tbl td { padding: 6px 8px; vertical-align: top; border-top: 1px solid var(--border); word-break: break-word; }
    .diff-tbl tr.changed td { background: var(--amber-soft, rgba(255,180,0,.08)); }
    .note { margin-top: 12px; padding: 8px 10px; background: var(--surface-2); border-radius: 6px; font-size: 13px; }
  `],
})
export class AdminItemSubmissionsComponent implements OnInit {
  loading = true;
  items: ItemSubmission[] = [];
  page: Paginated<ItemSubmission> | null = null;
  pageNum = 1;
  pageLimit = 20;
  statusFilter: SubmissionStatus | null = 'pending';
  expanded: number | null = null;

  busy: number | null = null;
  rowError: Record<number, string | null> = {};

  rejecting: ItemSubmission | null = null;
  rejectNote = '';
  rejectBusy = false;
  rejectError: string | null = null;

  submitterLabel = (s: ItemSubmission) => formatActorLabel(s.submitter_discord_name, s.submitter_steam);
  isSubmitterDeleted = (s: ItemSubmission) => isDeletedActor(s.submitter_discord_name);
  reviewerLabel = (s: ItemSubmission) => formatActorLabel(s.reviewer_discord_name, s.reviewed_by);

  constructor(private svc: ItemSubmissionsService) {}

  ngOnInit() { this.reload(); }

  reload() {
    this.loading = true;
    this.svc.adminList(this.statusFilter, null, this.pageNum, this.pageLimit).subscribe({
      next: p => { this.page = p; this.items = p.items; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  goPage(page: number, limit: number) {
    this.pageNum = page;
    this.pageLimit = limit;
    this.reload();
  }

  toggle(id: number) {
    this.expanded = this.expanded === id ? null : id;
  }

  diff(s: ItemSubmission): DiffRow[] {
    const cur = s.current_item ?? { name: null, description: null, image_url: null, type_id: null, type_name: null };
    const rows: DiffRow[] = [
      { field: 'name',        current: cur.name,                                 proposed: s.name,                                 changed: s.name !== null && s.name !== cur.name },
      { field: 'description', current: cur.description,                          proposed: s.description,                          changed: s.description !== null && s.description !== cur.description },
      { field: 'image_url',   current: cur.image_url,                            proposed: s.image_url,                            changed: s.image_url !== null && s.image_url !== cur.image_url },
      { field: 'type',        current: cur.type_name ?? (cur.type_id?.toString() ?? null), proposed: s.type_id != null ? String(s.type_id) : null, changed: s.type_id !== null && s.type_id !== cur.type_id },
    ];
    return rows;
  }

  approve(s: ItemSubmission) {
    this.busy = s.id;
    this.rowError[s.id] = null;
    this.svc.approve(s.id).subscribe({
      next: updated => {
        this.busy = null;
        // replace in place so the row reflects new status without re-fetching
        const idx = this.items.findIndex(i => i.id === s.id);
        if (idx >= 0) this.items[idx] = updated;
      },
      error: e => {
        this.busy = null;
        this.rowError[s.id] = mapVaultP2pErrorKey(e);
      },
    });
  }

  askReject(s: ItemSubmission) {
    this.rejecting = s;
    this.rejectNote = '';
    this.rejectBusy = false;
    this.rejectError = null;
  }

  cancelReject() {
    this.rejecting = null;
    this.rejectNote = '';
    this.rejectBusy = false;
    this.rejectError = null;
  }

  confirmReject() {
    if (!this.rejecting) return;
    const target = this.rejecting;
    this.rejectBusy = true;
    this.rejectError = null;
    const note = this.rejectNote.trim() || null;
    this.svc.reject(target.id, note).subscribe({
      next: updated => {
        this.rejectBusy = false;
        this.rejecting = null;
        const idx = this.items.findIndex(i => i.id === target.id);
        if (idx >= 0) this.items[idx] = updated;
      },
      error: e => {
        this.rejectBusy = false;
        this.rejectError = mapVaultP2pErrorKey(e);
      },
    });
  }
}
