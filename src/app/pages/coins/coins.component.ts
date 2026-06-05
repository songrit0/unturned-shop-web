import { Component, OnInit } from '@angular/core';
import { ActivityLog, CoinsMe, CoinsService, MarketLog, Paginated } from '../../services/coins.service';

@Component({
  selector: 'app-coins',
  template: `
    <div class="page">
      <div class="page-header">
        <h1><span class="h-icon"><span class="mi fill">paid</span></span>{{ 'coins.title' | translate }}</h1>
      </div>

      <section class="card tactical mb-4">
        <div class="row gap-4 wrap">
          <div class="grow">
            <span class="stat-label">CURRENT BALANCE</span>
            <div class="coin-amt xl mt-2">{{ me ? (me.balance | number) : '...' }} <img class="coin-img xl" src="assets/coins/coin.png" alt=""></div>
            <p *ngIf="me && !me.linked" class="text-rose text-sm row gap-1 mt-2">
              <span class="mi sm">warning</span>{{ 'coins.needLink' | translate }}
            </p>
          </div>
          <div class="row gap-2">
            <a routerLink="/quests" class="btn primary"><span class="mi">flag</span>{{ 'nav.quests' | translate }}</a>
            <a routerLink="/shop" class="btn secondary"><span class="mi">shopping_bag</span>{{ 'nav.shop' | translate }}</a>
          </div>
        </div>
      </section>

      <div class="grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 16px;">
        <div class="card flush">
          <div class="card-title" style="padding:16px 18px 0;"><span class="mi">receipt_long</span>{{ 'coins.marketHistory' | translate }}</div>
          <div *ngIf="marketPage && marketPage.items.length === 0" class="empty" style="padding:32px;">{{ 'coins.empty' | translate }}</div>
          <div *ngIf="marketPage">
            <div *ngFor="let m of marketPage.items" class="activity-row">
              <div class="ico" [class.rose]="m.kind === 'buy'"><span class="mi sm">{{ m.kind === 'sell' ? 'sell' : 'shopping_bag' }}</span></div>
              <div class="grow" style="min-width:0;">
                <div class="a-name">{{ m.name || ('#' + m.item_id) }} × {{ m.amount }}</div>
                <div class="a-src">
                  <span class="badge" [class.emerald]="m.kind === 'sell'" [class.rose]="m.kind === 'buy'">{{ m.kind }}</span>
                </div>
              </div>
              <span class="a-amount" [class.down]="m.kind === 'buy'">
                {{ m.kind === 'sell' ? '+' : '−' }}{{ m.coins | number }}
              </span>
            </div>
          </div>
          <div style="padding:12px 18px;" *ngIf="marketPage">
            <app-pager [page]="marketPage.page" [pages]="marketPage.pages" [total]="marketPage.total" [limit]="marketPage.limit"
              (pageChange)="loadMarket($event, marketPage.limit)" (limitChange)="loadMarket(1, $event)"></app-pager>
          </div>
        </div>

        <div class="card flush">
          <div class="card-title" style="padding:16px 18px 0;"><span class="mi">military_tech</span>{{ 'coins.rewardLog' | translate }}</div>
          <div *ngIf="activityPage && activityPage.items.length === 0" class="empty" style="padding:32px;">{{ 'coins.empty' | translate }}</div>
          <div *ngIf="activityPage">
            <div *ngFor="let a of activityPage.items" class="activity-row">
              <div class="ico amber"><span class="mi sm">add</span></div>
              <div class="grow" style="min-width:0;">
                <div class="a-name mono text-xs">{{ a.kind }}</div>
              </div>
              <span class="a-amount">+{{ a.coins | number }}</span>
            </div>
          </div>
          <div style="padding:12px 18px;" *ngIf="activityPage">
            <app-pager [page]="activityPage.page" [pages]="activityPage.pages" [total]="activityPage.total" [limit]="activityPage.limit"
              (pageChange)="loadActivity($event, activityPage.limit)" (limitChange)="loadActivity(1, $event)"></app-pager>
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
  loadMarket(page: number, limit: number) { this.coins.marketHistory(page, limit).subscribe(p => this.marketPage = p); }
  loadActivity(page: number, limit: number) { this.coins.activityHistory(page, limit).subscribe(p => this.activityPage = p); }
}
