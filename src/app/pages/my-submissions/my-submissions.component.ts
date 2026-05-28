import { Component, OnInit } from '@angular/core';
import { ItemSubmission } from '../../models/item-submission';
import { ItemSubmissionsService } from '../../services/item-submissions.service';

@Component({
  selector: 'app-my-submissions',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon violet"><span class="mi lg">edit_note</span></div>
        <h1>{{ 'mySubmissions.title' | translate }}</h1>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div class="card flush">
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th style="width:56px"></th>
                  <th>{{ 'mySubmissions.col.item' | translate }}</th>
                  <th>{{ 'mySubmissions.col.proposed' | translate }}</th>
                  <th style="width:120px">{{ 'mySubmissions.col.status' | translate }}</th>
                  <th style="width:160px">{{ 'mySubmissions.col.submittedAt' | translate }}</th>
                  <th>{{ 'mySubmissions.col.adminNote' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of items">
                  <td>
                    <div style="width:40px;height:40px;background:var(--surface-2);border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden">
                      <img *ngIf="s.current_item?.image_url" [src]="s.current_item!.image_url!" style="width:100%;height:100%;object-fit:contain;padding:2px">
                    </div>
                  </td>
                  <td><div style="font-weight:600">{{ s.current_item?.name || ('#' + s.item_id) }}</div></td>
                  <td>
                    <div *ngIf="s.name" class="muted" style="font-size:12px"><b>name:</b> {{ s.name }}</div>
                    <div *ngIf="s.description" class="muted" style="font-size:12px;max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" [title]="s.description"><b>desc:</b> {{ s.description }}</div>
                    <div *ngIf="s.image_url" class="muted" style="font-size:12px;max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" [title]="s.image_url"><b>image:</b> {{ s.image_url }}</div>
                    <div *ngIf="s.type_id != null" class="muted" style="font-size:12px"><b>type_id:</b> {{ s.type_id }}</div>
                  </td>
                  <td>
                    <span class="badge"
                          [class.amber]="s.status === 'pending'"
                          [class.emerald]="s.status === 'approved'"
                          [class.rose]="s.status === 'rejected'">
                      {{ ('submissions.status.' + s.status) | translate }}
                    </span>
                  </td>
                  <td class="muted mono" style="font-size:12px">{{ s.submitted_at | date:'short' }}</td>
                  <td>
                    <span *ngIf="s.admin_note; else noNote" class="muted" style="font-size:12px">{{ s.admin_note }}</span>
                    <ng-template #noNote><span class="faint">—</span></ng-template>
                  </td>
                </tr>
                <tr *ngIf="items.length === 0">
                  <td colspan="6">
                    <div class="empty">
                      <span class="mi xxl">edit_note</span>
                      <div class="empty-title">{{ 'mySubmissions.empty' | translate }}</div>
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
    </div>
  `,
})
export class MySubmissionsComponent implements OnInit {
  loading = true;
  items: ItemSubmission[] = [];

  constructor(private svc: ItemSubmissionsService) {}

  ngOnInit() { this.reload(); }

  reload() {
    this.loading = true;
    this.svc.listMine(1, 100).subscribe({
      next: p => { this.items = p.items; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }
}
