import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MarketHistoryService, MarketTxn } from '../../services/market-history.service';

@Component({
  selector: 'app-market-history',
  template: `
    <div class="page">
      <div class="page-header">
        <h1><span class="h-icon"><span class="mi">receipt_long</span></span>{{ 'marketHistory.title' | translate }}</h1>
        <div class="page-actions">
          <div class="input-wrap" style="width:240px;">
            <span class="mi lead">search</span>
            <input class="input" type="search" [(ngModel)]="q" [placeholder]="'marketHistory.searchItem' | translate">
          </div>
          <div class="segmented">
            <button [class.active]="kind === 'all'" (click)="kind='all'; onKindChange()">{{ 'marketHistory.kindAll' | translate }}</button>
            <button [class.active]="kind === 'buy'" (click)="kind='buy'; onKindChange()"><span class="mi sm">shopping_cart</span>{{ 'marketHistory.kindBuy' | translate }}</button>
            <button [class.active]="kind === 'sell'" (click)="kind='sell'; onKindChange()"><span class="mi sm">sell</span>{{ 'marketHistory.kindSell' | translate }}</button>
          </div>
        </div>
      </div>

      <div class="card flush">
        <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>{{ 'marketHistory.col.at' | translate }}</th>
              <th>{{ 'marketHistory.col.item' | translate }}</th>
              <th>{{ 'marketHistory.col.user' | translate }}</th>
              <th>{{ 'marketHistory.col.kind' | translate }}</th>
              <th class="r">{{ 'marketHistory.col.qty' | translate }}</th>
              <th class="r">{{ 'marketHistory.col.unit' | translate }}</th>
              <th class="r">{{ 'marketHistory.col.total' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let t of filtered()" class="clickable" (click)="goItem(t)">
              <td class="mono muted text-xs" style="white-space:nowrap;">{{ t.at | date:'short' }}</td>
              <td>
                <div class="row gap-2">
                  <div style="width:30px; height:30px; background: var(--surface-2); border:1px solid var(--border); border-radius:var(--radius-sm); display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0;">
                    <img *ngIf="t.image_url; else noImg" [src]="t.image_url" style="width:80%; height:80%; object-fit:contain;">
                    <ng-template #noImg><span class="mi sm faint">inventory_2</span></ng-template>
                  </div>
                  <span class="fw-6 text-xs">{{ t.item_name || ('#' + t.item_id) }}</span>
                </div>
              </td>
              <td class="mono text-xs" [title]="t.discord_id || t.steam_id">{{ shortId(t.discord_id || t.steam_id) }}</td>
              <td><span class="badge" [class.emerald]="t.kind === 'sell'" [class.rose]="t.kind === 'buy'">{{ t.kind }}</span></td>
              <td class="r mono">{{ t.amount | number }}</td>
              <td class="r mono muted">{{ t.price_per_unit | number }}</td>
              <td class="r mono fw-6">{{ t.coins | number }}</td>
            </tr>
            <tr *ngIf="!loading && filtered().length === 0">
              <td colspan="7" style="text-align:center; padding:48px;" class="muted">{{ 'marketHistory.empty' | translate }}</td>
            </tr>
          </tbody>
        </table>
        </div>
        <div *ngIf="loading" class="empty" style="padding:24px;"><div class="spinner"></div></div>
      </div>

      <app-pager *ngIf="total > 0"
        [page]="page" [pages]="pages"
        [total]="total" [limit]="limit"
        (pageChange)="goPage($event)"
        (limitChange)="changeLimit($event)"></app-pager>
    </div>
  `,
})
export class MarketHistoryComponent implements OnInit {
  loading = false;
  txns: MarketTxn[] = [];
  page = 1; limit = 20; total = 0; pages = 1;
  kind: 'buy' | 'sell' | 'all' = 'all';
  q = '';

  constructor(private hist: MarketHistoryService, private router: Router) {}
  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.hist.globalTxns(this.page, this.limit, this.kind).subscribe({
      next: p => {
        this.txns = p.items;
        this.total = p.total;
        this.pages = p.pages;
        this.loading = false;
      },
      error: () => { this.txns = []; this.loading = false; },
    });
  }

  filtered(): MarketTxn[] {
    const s = this.q.trim().toLowerCase();
    if (!s) return this.txns;
    return this.txns.filter(t => (t.item_name || '').toLowerCase().includes(s) || String(t.item_id || '').includes(s));
  }

  onKindChange() { this.page = 1; this.load(); }
  goPage(p: number) { this.page = p; this.load(); }
  changeLimit(l: number) { this.limit = l; this.page = 1; this.load(); }
  goItem(t: MarketTxn) { if (t.item_id) this.router.navigate(['/market', t.item_id]); }
  shortId(id: string | null | undefined) { if (!id) return ''; return id.length > 8 ? '…' + id.slice(-6) : id; }
}
