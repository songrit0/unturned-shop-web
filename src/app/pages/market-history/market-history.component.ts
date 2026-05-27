import { Component, OnInit } from '@angular/core';
import { MarketHistoryService, MarketTxn } from '../../services/market-history.service';

@Component({
  selector: 'app-market-history',
  template: `
    <div class="max-w-6xl mx-auto p-4 space-y-4">
      <header class="flex items-center justify-between gap-2 flex-wrap">
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <span class="mi lg text-slate-500">receipt_long</span>
          {{ 'marketHistory.title' | translate }}
        </h1>
        <div class="flex gap-2 items-center flex-wrap">
          <input type="search" [(ngModel)]="q" [placeholder]="'marketHistory.searchItem' | translate"
                 class="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 text-sm">
          <select [(ngModel)]="kind" (ngModelChange)="onKindChange()"
                  class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800">
            <option value="all">{{ 'marketHistory.kindAll' | translate }}</option>
            <option value="buy">{{ 'marketHistory.kindBuy' | translate }}</option>
            <option value="sell">{{ 'marketHistory.kindSell' | translate }}</option>
          </select>
        </div>
      </header>

      <div class="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 dark:bg-slate-700/50 text-left">
            <tr>
              <th class="p-3">{{ 'marketHistory.col.at' | translate }}</th>
              <th class="p-3">{{ 'marketHistory.col.item' | translate }}</th>
              <th class="p-3">{{ 'marketHistory.col.user' | translate }}</th>
              <th class="p-3">{{ 'marketHistory.col.kind' | translate }}</th>
              <th class="p-3 text-right">{{ 'marketHistory.col.qty' | translate }}</th>
              <th class="p-3 text-right">{{ 'marketHistory.col.unit' | translate }}</th>
              <th class="p-3 text-right">{{ 'marketHistory.col.total' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let t of filtered()" class="border-t border-slate-100 dark:border-slate-700">
              <td class="p-3 text-xs text-slate-500 whitespace-nowrap">{{ t.at | date:'short' }}</td>
              <td class="p-3">
                <a *ngIf="t.item_id" [routerLink]="['/market', t.item_id]" class="flex items-center gap-2 hover:underline">
                  <div class="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img *ngIf="t.image_url; else noImg" [src]="t.image_url" class="w-full h-full object-contain">
                    <ng-template #noImg><span class="mi text-slate-400 text-sm">inventory_2</span></ng-template>
                  </div>
                  <span class="font-medium text-xs">{{ t.item_name || ('#' + t.item_id) }}</span>
                </a>
              </td>
              <td class="p-3 text-xs">{{ t.discord_username || t.steam_id }}</td>
              <td class="p-3">
                <span class="text-xs px-2 py-0.5 rounded"
                      [class.bg-emerald-100]="t.kind === 'sell'" [class.text-emerald-700]="t.kind === 'sell'"
                      [class.bg-rose-100]="t.kind === 'buy'" [class.text-rose-700]="t.kind === 'buy'">
                  {{ t.kind }}
                </span>
              </td>
              <td class="p-3 text-right">{{ t.amount | number }}</td>
              <td class="p-3 text-right text-slate-500">{{ t.price_per_unit | number }}</td>
              <td class="p-3 text-right font-medium">{{ t.coins | number }}</td>
            </tr>
            <tr *ngIf="!loading && filtered().length === 0">
              <td colspan="7" class="p-12 text-center text-slate-400">{{ 'marketHistory.empty' | translate }}</td>
            </tr>
          </tbody>
        </table>
        <div *ngIf="loading" class="text-center py-6">
          <div class="inline-block w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div *ngIf="pages > 1" class="p-3 flex items-center justify-center gap-2 text-sm">
          <button (click)="goPage(page - 1)" [disabled]="page <= 1"
                  class="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 disabled:opacity-50">←</button>
          <span class="text-slate-500">{{ page }} / {{ pages }}</span>
          <button (click)="goPage(page + 1)" [disabled]="page >= pages"
                  class="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 disabled:opacity-50">→</button>
        </div>
      </div>
    </div>
  `,
})
export class MarketHistoryComponent implements OnInit {
  loading = false;
  txns: MarketTxn[] = [];
  page = 1;
  limit = 50;
  total = 0;
  pages = 1;
  kind: 'buy' | 'sell' | 'all' = 'all';
  q = '';

  constructor(private hist: MarketHistoryService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.hist.globalTxns(this.page, this.limit, this.kind).subscribe({
      next: p => {
        this.txns = p.items;
        this.total = p.total;
        this.pages = Math.max(1, Math.ceil(p.total / this.limit));
        this.loading = false;
      },
      error: () => { this.txns = []; this.loading = false; },
    });
  }

  filtered(): MarketTxn[] {
    const s = this.q.trim().toLowerCase();
    if (!s) return this.txns;
    return this.txns.filter(t =>
      (t.item_name || '').toLowerCase().includes(s) ||
      String(t.item_id || '').includes(s),
    );
  }

  onKindChange() { this.page = 1; this.load(); }

  goPage(p: number) {
    if (p < 1 || p > this.pages || p === this.page) return;
    this.page = p;
    this.load();
  }
}
