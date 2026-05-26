import { Component, OnInit } from '@angular/core';
import { ActivityLog, CoinsMe, CoinsService, MarketLog, Paginated } from '../../services/coins.service';

@Component({
  selector: 'app-coins',
  template: `
    <div class="max-w-5xl mx-auto p-4 space-y-4">
      <h1 class="text-2xl font-bold flex items-center gap-2">
        <span class="mi lg text-amber-500">paid</span> Coins
      </h1>

      <div class="bg-white dark:bg-slate-800 rounded-xl shadow p-5">
        <p class="text-slate-500 text-sm">ยอดคงเหลือ</p>
        <p class="text-4xl font-bold text-amber-500 flex items-baseline gap-2">
          {{ me ? (me.balance | number) : '...' }}
          <span class="text-lg text-slate-400 font-normal">Coin</span>
        </p>
        <p *ngIf="me && !me.linked" class="text-xs text-amber-600 mt-2 flex items-center gap-1">
          <span class="mi">warning</span>
          ยังไม่ผูก Steam — เข้าเกมแล้วพิมพ์ /link &lt;code&gt; ก่อน
        </p>
      </div>

      <div class="grid lg:grid-cols-2 gap-4">
        <!-- market history -->
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow p-5">
          <h2 class="font-semibold mb-3 flex items-center gap-2">
            <span class="mi">receipt_long</span> ประวัติตลาด
          </h2>
          <p *ngIf="marketPage && marketPage.items.length === 0" class="text-slate-400 text-sm py-4">ยังไม่มีรายการ</p>
          <ul class="space-y-2 text-sm" *ngIf="marketPage">
            <li *ngFor="let m of marketPage.items" class="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1">
              <span>
                <span class="font-mono text-xs px-1.5 py-0.5 rounded"
                      [class.bg-emerald-100]="m.kind === 'sell'"
                      [class.text-emerald-700]="m.kind === 'sell'"
                      [class.bg-rose-100]="m.kind === 'buy'"
                      [class.text-rose-700]="m.kind === 'buy'">{{ m.kind }}</span>
                {{ m.name || ('#' + m.item_id) }} x{{ m.amount }}
              </span>
              <span [class.text-emerald-600]="m.kind === 'sell'"
                    [class.text-rose-600]="m.kind === 'buy'">
                {{ m.kind === 'sell' ? '+' : '-' }}{{ m.coins | number }}
              </span>
            </li>
          </ul>
          <div class="mt-3">
            <app-pager *ngIf="marketPage"
              [page]="marketPage.page" [pages]="marketPage.pages"
              [total]="marketPage.total" [limit]="marketPage.limit"
              (pageChange)="loadMarket($event, marketPage.limit)"
              (limitChange)="loadMarket(1, $event)"></app-pager>
          </div>
        </div>

        <!-- activity history -->
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow p-5">
          <h2 class="font-semibold mb-3 flex items-center gap-2">
            <span class="mi">military_tech</span> Reward Log
          </h2>
          <p *ngIf="activityPage && activityPage.items.length === 0" class="text-slate-400 text-sm py-4">ยังไม่มีรายการ</p>
          <ul class="space-y-2 text-sm" *ngIf="activityPage">
            <li *ngFor="let a of activityPage.items" class="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1">
              <span class="font-mono text-xs">{{ a.kind }}</span>
              <span class="text-emerald-600">+{{ a.coins | number }}</span>
            </li>
          </ul>
          <div class="mt-3">
            <app-pager *ngIf="activityPage"
              [page]="activityPage.page" [pages]="activityPage.pages"
              [total]="activityPage.total" [limit]="activityPage.limit"
              (pageChange)="loadActivity($event, activityPage.limit)"
              (limitChange)="loadActivity(1, $event)"></app-pager>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class CoinsComponent implements OnInit {
  me: CoinsMe | null = null;
  marketPage: Paginated<MarketLog> | null = null;
  activityPage: Paginated<ActivityLog> | null = null;

  constructor(private coins: CoinsService) {}

  ngOnInit() {
    this.coins.refreshMe().subscribe(me => this.me = me);
    this.loadMarket(1, 20);
    this.loadActivity(1, 20);
  }

  loadMarket(page: number, limit: number) {
    this.coins.marketHistory(page, limit).subscribe(p => this.marketPage = p);
  }

  loadActivity(page: number, limit: number) {
    this.coins.activityHistory(page, limit).subscribe(p => this.activityPage = p);
  }
}
