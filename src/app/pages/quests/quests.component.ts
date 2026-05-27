import { Component, OnInit } from '@angular/core';
import { PlayerQuest, QuestsService } from '../../services/quests.service';

@Component({
  selector: 'app-quests',
  template: `
    <div class="max-w-4xl mx-auto p-4 space-y-4">
      <header class="flex items-center justify-between gap-2">
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <span class="mi lg text-amber-500">flag</span> {{ 'quests.title' | translate }}
        </h1>
      </header>

      <div class="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button (click)="tab = 'active'" class="px-3 py-2 text-sm font-medium border-b-2"
                [class.border-brand-500]="tab === 'active'" [class.text-brand-600]="tab === 'active'"
                [class.border-transparent]="tab !== 'active'" [class.text-slate-500]="tab !== 'active'">
          {{ 'quests.active' | translate }}
        </button>
        <button (click)="tab = 'history'; loadHistory()" class="px-3 py-2 text-sm font-medium border-b-2"
                [class.border-brand-500]="tab === 'history'" [class.text-brand-600]="tab === 'history'"
                [class.border-transparent]="tab !== 'history'" [class.text-slate-500]="tab !== 'history'">
          {{ 'quests.history' | translate }}
        </button>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <ng-container *ngIf="tab === 'active'">
          <p *ngIf="active.length === 0" class="text-slate-500 text-center py-12">
            <span class="mi xl block mb-2">flag</span>
            {{ 'quests.emptyActive' | translate }}
          </p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <article *ngFor="let q of active" class="bg-white dark:bg-slate-800 rounded-xl shadow p-4 space-y-3"
                     [class.ring-2]="q.status === 'completed'" [class.ring-emerald-400]="q.status === 'completed'">
              <header class="flex items-start justify-between gap-2">
                <div>
                  <h3 class="font-semibold flex items-center gap-2">
                    {{ q.name }}
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">{{ q.reset_type }}</span>
                  </h3>
                  <p *ngIf="q.description" class="text-xs text-slate-500 mt-0.5">{{ q.description }}</p>
                </div>
                <div class="text-right">
                  <p class="font-bold text-amber-600 flex items-center gap-1">
                    +{{ q.reward_coins | number }} <span class="mi text-amber-500">paid</span>
                  </p>
                  <span *ngIf="q.status === 'completed'"
                        class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                    {{ 'quests.completed' | translate }}
                  </span>
                </div>
              </header>
              <div class="space-y-2">
                <div *ngFor="let it of q.items" class="space-y-1">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-medium">{{ it.name || ('#' + it.item_id) }}</span>
                    <span class="text-slate-500 font-mono">{{ it.sold_qty }} / {{ it.qty_required }}</span>
                  </div>
                  <div class="h-2 bg-slate-100 dark:bg-slate-700 rounded overflow-hidden">
                    <div class="h-full transition-all"
                         [class.bg-emerald-500]="it.sold_qty >= it.qty_required"
                         [class.bg-brand-500]="it.sold_qty < it.qty_required"
                         [style.width.%]="pct(it.sold_qty, it.qty_required)"></div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </ng-container>

        <ng-container *ngIf="tab === 'history'">
          <p *ngIf="history.length === 0" class="text-slate-500 text-center py-12">
            <span class="mi xl block mb-2">history</span>
            {{ 'quests.emptyHistory' | translate }}
          </p>
          <div class="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-slate-50 dark:bg-slate-700/50 text-left">
                <tr>
                  <th class="p-3">{{ 'quests.col.name' | translate }}</th>
                  <th class="p-3">{{ 'quests.col.reset' | translate }}</th>
                  <th class="p-3 text-right">{{ 'quests.col.reward' | translate }}</th>
                  <th class="p-3">{{ 'quests.col.completedAt' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let q of history" class="border-t border-slate-100 dark:border-slate-700">
                  <td class="p-3 font-medium">{{ q.name }}</td>
                  <td class="p-3">
                    <span class="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700">{{ q.reset_type }}</span>
                  </td>
                  <td class="p-3 text-right font-semibold text-amber-600">+{{ q.reward_coins | number }}</td>
                  <td class="p-3 text-slate-500 text-xs">{{ q.completed_at | date:'short' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </ng-container>
      </ng-container>

      <ng-template #loadingTpl>
        <div class="text-center py-12">
          <div class="inline-block w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </ng-template>
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
    this.svc.list().subscribe({
      next: q => { this.active = q; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  loadHistory() {
    if (this.historyLoaded) return;
    this.loading = true;
    this.svc.history().subscribe({
      next: q => { this.history = q; this.historyLoaded = true; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  pct(cur: number, req: number): number {
    if (!req || req <= 0) return 0;
    return Math.min(100, Math.round((cur / req) * 100));
  }
}
