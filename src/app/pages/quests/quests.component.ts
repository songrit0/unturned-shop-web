import { Component, OnInit } from '@angular/core';
import { PlayerQuest, QuestsService } from '../../services/quests.service';

@Component({
  selector: 'app-quests',
  template: `
    <div class="page">
      <div class="page-header">
        <h1><span class="h-icon"><span class="mi fill">flag</span></span>{{ 'quests.title' | translate }}</h1>
      </div>

      <div class="tabs">
        <button [class.active]="tab === 'active'" (click)="tab = 'active'">
          <span class="mi sm">flag</span>{{ 'quests.active' | translate }}
        </button>
        <button [class.active]="tab === 'history'" (click)="tab = 'history'; loadHistory()">
          <span class="mi sm">history</span>{{ 'quests.history' | translate }}
        </button>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <ng-container *ngIf="tab === 'active'">
          <div *ngIf="active.length === 0" class="empty">
            <span class="mi xxl">flag</span>
            <div class="empty-title">{{ 'quests.emptyActive' | translate }}</div>
          </div>
          <div class="grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap:16px;">
            <article *ngFor="let q of active" class="card">
              <div class="row gap-2 mb-2">
                <span class="badge slate">{{ q.reset_type }}</span>
                <span *ngIf="q.status === 'completed'" class="badge emerald"><span class="mi sm">check</span>{{ 'quests.completed' | translate }}</span>
                <div class="grow"></div>
                <div class="col" style="align-items:flex-end; gap:0;">
                  <span class="stat-label">REWARD</span>
                  <span class="coin-amt lg" style="color:var(--accent-hi);">+{{ q.reward_coins | number }} <span class="mi fill">paid</span></span>
                </div>
              </div>
              <h3>{{ q.name }}</h3>
              <p *ngIf="q.description" class="muted text-sm mt-1">{{ q.description }}</p>

              <div class="divider"></div>

              <div class="col gap-3">
                <div *ngFor="let it of q.items">
                  <div class="row between text-sm mb-2">
                    <span class="fw-6">{{ it.name || ('#' + it.item_id) }}</span>
                    <span class="mono muted">{{ it.sold_qty }} / {{ it.qty_required }}</span>
                  </div>
                  <div class="progress">
                    <div class="progress-bar" [class.complete]="it.sold_qty >= it.qty_required" [style.width.%]="pct(it.sold_qty, it.qty_required)"></div>
                  </div>
                </div>
              </div>

              <button *ngIf="q.status === 'completed'" class="btn primary full mt-4">
                <span class="mi">redeem</span>Claim {{ q.reward_coins | number }} coins
              </button>
            </article>
          </div>
        </ng-container>

        <ng-container *ngIf="tab === 'history'">
          <div *ngIf="history.length === 0" class="empty">
            <span class="mi xxl">history</span>
            <div class="empty-title">{{ 'quests.emptyHistory' | translate }}</div>
          </div>
          <div *ngIf="history.length > 0" class="card flush">
            <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>{{ 'quests.col.name' | translate }}</th>
                  <th>{{ 'quests.col.reset' | translate }}</th>
                  <th class="r">{{ 'quests.col.reward' | translate }}</th>
                  <th>{{ 'quests.col.completedAt' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let q of history">
                  <td class="fw-6">{{ q.name }}</td>
                  <td><span class="badge slate">{{ q.reset_type }}</span></td>
                  <td class="r mono fw-7" style="color:var(--accent-hi);">+{{ q.reward_coins | number }}</td>
                  <td class="muted mono text-xs">{{ q.completed_at | date:'short' }}</td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>
        </ng-container>
      </ng-container>
      <ng-template #loadingTpl><div class="empty"><div class="spinner"></div></div></ng-template>
    </div>
  `,
})
export class QuestsComponent implements OnInit {
  loading = true;
  tab: 'active' | 'history' = 'active';
  active: PlayerQuest[] = [];
  history: PlayerQuest[] = [];
  private historyLoaded = false;
  constructor(private svc: QuestsService) {}
  ngOnInit() {
    this.svc.list().subscribe({ next: q => { this.active = q; this.loading = false; }, error: () => this.loading = false });
  }
  loadHistory() {
    if (this.historyLoaded) return;
    this.loading = true;
    this.svc.history().subscribe({ next: q => { this.history = q; this.historyLoaded = true; this.loading = false; }, error: () => this.loading = false });
  }
  pct(cur: number, req: number) { if (!req) return 0; return Math.min(100, Math.round((cur / req) * 100)); }
}
