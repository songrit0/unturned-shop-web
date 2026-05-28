import { Component, OnInit } from '@angular/core';
import { PlayerQuest, Paginated, QuestsService } from '../../services/quests.service';
import { CoinsService } from '../../services/coins.service';

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

              <button *ngIf="q.status === 'completed'" class="btn primary full mt-4" [disabled]="claimingId === q.id" (click)="claim(q)">
                <ng-container *ngIf="claimingId === q.id; else claimLabel">
                  <span class="spinner sm"></span>{{ 'quests.claim' | translate:{ n: (q.reward_coins | number) } }}
                </ng-container>
                <ng-template #claimLabel>
                  <ng-container *ngIf="claimedId === q.id; else claimReady">
                    <span class="mi">check</span>{{ 'quests.claimed' | translate }}
                  </ng-container>
                  <ng-template #claimReady>
                    <span class="mi">redeem</span>{{ 'quests.claim' | translate:{ n: (q.reward_coins | number) } }}
                  </ng-template>
                </ng-template>
              </button>
            </article>
          </div>
        </ng-container>

        <ng-container *ngIf="tab === 'history'">
          <div *ngIf="historyPage && historyPage.items.length === 0" class="empty">
            <span class="mi xxl">history</span>
            <div class="empty-title">{{ 'quests.emptyHistory' | translate }}</div>
          </div>
          <div *ngIf="historyPage && historyPage.items.length > 0" class="card flush">
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
                <tr *ngFor="let q of historyPage.items">
                  <td class="fw-6">{{ q.name }}</td>
                  <td><span class="badge slate">{{ q.reset_type }}</span></td>
                  <td class="r mono fw-7" style="color:var(--accent-hi);">+{{ q.reward_coins | number }}</td>
                  <td class="muted mono text-xs">{{ q.completed_at | date:'short' }}</td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>

          <app-pager *ngIf="historyPage"
            [page]="historyPage.page" [pages]="historyPage.pages"
            [total]="historyPage.total" [limit]="historyPage.limit"
            (pageChange)="loadHistory($event, historyPage.limit)"
            (limitChange)="loadHistory(1, $event)"></app-pager>
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
  historyPage: Paginated<PlayerQuest> | null = null;
  claimingId: number | null = null;
  claimedId: number | null = null;
  constructor(private svc: QuestsService, private coins: CoinsService) {}
  ngOnInit() {
    this.svc.list().subscribe({ next: q => { this.active = q; this.loading = false; }, error: () => this.loading = false });
  }
  loadHistory(page = 1, limit = 20) {
    if (this.historyPage && page === this.historyPage.page && limit === this.historyPage.limit) return;
    this.loading = true;
    this.svc.history(page, limit).subscribe({
      next: p => { this.historyPage = p; this.loading = false; },
      error: () => this.loading = false,
    });
  }
  claim(q: PlayerQuest) {
    if (this.claimingId != null || this.claimedId === q.id) return;
    this.claimingId = q.id;
    this.svc.claim(q.id).subscribe({
      next: res => {
        this.claimingId = null;
        if (res.ok) {
          this.claimedId = q.id;
          this.coins.refreshMe().subscribe();
          this.svc.list().subscribe({ next: list => this.active = list });
        }
      },
      error: () => { this.claimingId = null; },
    });
  }
  pct(cur: number, req: number) { if (!req) return 0; return Math.min(100, Math.round((cur / req) * 100)); }
}
