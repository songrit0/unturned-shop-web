import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { LinkService, WelcomeResult } from '../../services/link.service';
import { CoinsService } from '../../services/coins.service';
import { BasketService } from '../../services/basket.service';
import { MarketItem, MarketService } from '../../services/market.service';

@Component({
  selector: 'app-home',
  template: `
    <div class="page" *ngIf="auth.me$ | async as me">
      <section class="hero">
        <div class="hero-row">
          <div class="grow">
            <div class="hero-greet">HELLO, {{ me.username }}</div>
            <h1>Ready to dive in, {{ me.username }}?</h1>
            <p class="row gap-2">
              <span class="mi fill" [style.color]="me.linked ? 'var(--emerald)' : 'var(--rose)'">{{ me.linked ? 'verified' : 'link_off' }}</span>
              {{ me.linked ? ('home.linked' | translate:{ id: me.steam_id }) : ('home.notLinked' | translate) }}
            </p>
          </div>
          <div class="row gap-2">
            <a routerLink="/shop" class="btn primary lg"><span class="mi">shopping_bag</span>{{ 'nav.shop' | translate }}</a>
            <a routerLink="/quests" class="btn secondary lg"><span class="mi">flag</span>{{ 'nav.quests' | translate }}</a>
          </div>
        </div>

        <div class="stats-strip">
          <div class="stat">
            <span class="stat-label">BALANCE</span>
            <span class="stat-value">{{ (coins.balance$ | async) ?? '—' }} <span class="mi fill">paid</span></span>
            <span class="delta" [class.up]="recentGain >= 0" [class.down]="recentGain < 0">{{ recentGain >= 0 ? '+' : '' }}{{ recentGain | number }} / 7d</span>
          </div>
          <div class="stat">
            <span class="stat-label">CART</span>
            <span class="stat-value">{{ basket.count }} <span class="mi">shopping_cart</span></span>
            <span class="delta flat">items</span>
          </div>
          <div class="stat">
            <span class="stat-label">LINKED</span>
            <span class="stat-value">{{ me.linked ? 'YES' : 'NO' }} <span class="mi">link</span></span>
            <span class="delta flat">{{ me.linked ? 'steam ' + (me.steam_id | slice:0:8) : '—' }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">ROLE</span>
            <span class="stat-value">{{ me.is_admin ? 'ADMIN' : 'PLAYER' }} <span class="mi">badge</span></span>
            <span class="delta flat">discord</span>
          </div>
        </div>
      </section>

      <section *ngIf="!me.linked" class="welcome-alert">
        <div class="alert-icon"><span class="mi">redeem</span></div>
        <div class="grow">
          <h3 style="margin-bottom:4px;">{{ 'welcome.title' | translate }}</h3>
          <p class="muted text-sm">{{ 'welcome.descPrefix' | translate }}
            <code class="mono" style="background:var(--surface-2); padding:1px 5px; border-radius:4px;">/link &lt;code&gt;</code>
            {{ 'welcome.descSuffix' | translate }}</p>
          <ng-container *ngIf="!code; else codeBox">
            <button class="btn primary mt-3" (click)="generate()" [disabled]="loading">
              <span class="mi" *ngIf="!loading">card_giftcard</span>
              <span class="spinner sm" *ngIf="loading"></span>
              {{ (loading ? 'welcome.generating' : 'welcome.generate') | translate }}
            </button>
            <p *ngIf="error" class="text-rose text-sm mt-2">{{ error }}</p>
          </ng-container>
          <ng-template #codeBox>
            <div class="code-display">
              <code>{{ code }}</code>
              <button class="btn secondary sm" (click)="copy()">
                <span class="mi">{{ copied ? 'check' : 'content_copy' }}</span>
                {{ (copied ? 'welcome.copied' : 'welcome.copy') | translate }}
              </button>
            </div>
            <p class="muted text-sm mt-2">{{ 'welcome.useInGame' | translate }}
              <code class="mono" style="background:var(--surface-2); padding:1px 6px; border-radius:4px;">/link {{ code }}</code>
            </p>
          </ng-template>
        </div>
      </section>

      <div class="tile-grid">
        <a routerLink="/shop" class="tile amber">
          <span class="mi arrow">arrow_outward</span>
          <div class="tile-icon"><span class="mi fill">shopping_bag</span></div>
          <div class="tile-title">{{ 'nav.shop' | translate }}</div>
          <div class="tile-desc">{{ 'home.shopDesc' | translate }}</div>
        </a>
        <a routerLink="/bills" class="tile emerald">
          <span class="mi arrow">arrow_outward</span>
          <div class="tile-icon"><span class="mi fill">payments</span></div>
          <div class="tile-title">{{ 'nav.bills' | translate }}</div>
          <div class="tile-desc">{{ 'home.billsDesc' | translate }}</div>
        </a>
        <a routerLink="/coins" class="tile amber">
          <span class="mi arrow">arrow_outward</span>
          <div class="tile-icon"><span class="mi fill">paid</span></div>
          <div class="tile-title">{{ 'coins.title' | translate }}</div>
          <div class="tile-desc">{{ 'home.coinsDesc' | translate }}</div>
        </a>
        <a routerLink="/codes" class="tile violet">
          <span class="mi arrow">arrow_outward</span>
          <div class="tile-icon"><span class="mi fill">qr_code_2</span></div>
          <div class="tile-title">{{ 'nav.codes' | translate }}</div>
          <div class="tile-desc">{{ 'home.codesDesc' | translate }}</div>
        </a>
        <a routerLink="/quests" class="tile indigo">
          <span class="mi arrow">arrow_outward</span>
          <div class="tile-icon"><span class="mi fill">flag</span></div>
          <div class="tile-title">{{ 'nav.quests' | translate }}</div>
          <div class="tile-desc">Active &amp; rewards</div>
        </a>
        <a routerLink="/help" class="tile rose">
          <span class="mi arrow">arrow_outward</span>
          <div class="tile-icon"><span class="mi fill">help</span></div>
          <div class="tile-title">{{ 'nav.help' | translate }}</div>
          <div class="tile-desc">{{ 'home.helpLink' | translate }}</div>
        </a>
      </div>

      <div *ngIf="topItems.length > 0" class="mt-6">
        <h2 class="mb-3 row gap-2"><span class="mi" style="color:var(--accent)">local_fire_department</span>Top items</h2>
        <div class="item-grid">
          <app-item-card *ngFor="let it of topItems" [item]="it"></app-item-card>
        </div>
      </div>
    </div>
  `,
})
export class HomeComponent implements OnInit {
  loading = false;
  error: string | null = null;
  code: string | null = null;
  copied = false;
  recentGain = 0;
  topItems: MarketItem[] = [];

  constructor(
    public auth: AuthService,
    public coins: CoinsService,
    public basket: BasketService,
    private link: LinkService,
    private market: MarketService,
    private t: TranslateService,
  ) {}

  ngOnInit() {
    this.market.list('normal', null, 1, 4).subscribe({
      next: p => { this.topItems = [...p.items].sort((a, b) => b.price - a.price).slice(0, 4); },
      error: () => this.topItems = [],
    });
    this.coins.stats().subscribe({
      next: s => { this.recentGain = s.net_change; },
      error: () => { this.recentGain = 0; },
    });
  }

  generate() {
    this.loading = true; this.error = null;
    this.link.createWelcomeCode().subscribe({
      next: (res: WelcomeResult) => {
        this.loading = false;
        if (res.alreadyLinked) {
          this.error = this.t.instant('welcome.alreadyLinked', { id: res.steamId });
          this.auth.refreshMe().subscribe();
        } else this.code = res.code;
      },
      error: e => { this.loading = false; this.error = e?.error?.message || this.t.instant('welcome.error'); },
    });
  }

  copy() {
    if (!this.code) return;
    navigator.clipboard.writeText(this.code).then(() => {
      this.copied = true; setTimeout(() => this.copied = false, 2000);
    });
  }
}
