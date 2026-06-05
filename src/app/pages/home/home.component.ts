import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { LinkService, WelcomeResult } from '../../services/link.service';
import { CoinsService } from '../../services/coins.service';
import { BasketService } from '../../services/basket.service';
import { P2pService } from '../../services/p2p.service';
import { P2pListing } from '../../models/vault';

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
            <a routerLink="/p2p-market" class="btn primary lg"><span class="mi">storefront</span>{{ 'nav.p2pMarket' | translate }}</a>
            <a routerLink="/sell-prices" class="btn secondary lg"><span class="mi">sell</span>{{ 'nav.sellPrices' | translate }}</a>
          </div>
        </div>

        <div class="stats-strip">
          <div class="stat">
            <span class="stat-label">BALANCE</span>
            <span class="stat-value">{{ (coins.balance$ | async) ?? '—' }} <img class="coin-img" src="assets/coins/coin.png" alt=""></span>
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
        <a routerLink="/p2p-market" class="tile violet">
          <span class="mi arrow">arrow_outward</span>
          <div class="tile-icon"><span class="mi fill">handshake</span></div>
          <div class="tile-title">{{ 'nav.p2pMarket' | translate }}</div>
          <div class="tile-desc">{{ 'home.p2pDesc' | translate }}</div>
        </a>
        <a routerLink="/my-listings" class="tile violet">
          <span class="mi arrow">arrow_outward</span>
          <div class="tile-icon"><span class="mi fill">sell</span></div>
          <div class="tile-title">{{ 'nav.myListings' | translate }}</div>
          <div class="tile-desc">{{ 'home.myListingsDesc' | translate }}</div>
        </a>
        <a routerLink="/vaults" class="tile emerald">
          <span class="mi arrow">arrow_outward</span>
          <div class="tile-icon"><span class="mi fill">inventory</span></div>
          <div class="tile-title">{{ 'nav.vaults' | translate }}</div>
          <div class="tile-desc">{{ 'home.vaultsDesc' | translate }}</div>
        </a>
        <a routerLink="/sell-prices" class="tile emerald">
          <span class="mi arrow">arrow_outward</span>
          <div class="tile-icon"><span class="mi fill">sell</span></div>
          <div class="tile-title">{{ 'nav.sellPrices' | translate }}</div>
          <div class="tile-desc">{{ 'home.sellPricesDesc' | translate }}</div>
        </a>
        <a routerLink="/shop" class="tile amber">
          <span class="mi arrow">arrow_outward</span>
          <div class="tile-icon"><span class="mi fill">shopping_bag</span></div>
          <div class="tile-title">{{ 'nav.shop' | translate }}</div>
          <div class="tile-desc">{{ 'home.shopDesc' | translate }}</div>
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
        <a routerLink="/inventory" class="tile emerald">
          <span class="mi arrow">arrow_outward</span>
          <div class="tile-icon"><span class="mi fill">redeem</span></div>
          <div class="tile-title">{{ 'nav.inventory' | translate }}</div>
          <div class="tile-desc">{{ 'home.inventoryDesc' | translate }}</div>
        </a>
        <a routerLink="/quests" class="tile indigo">
          <span class="mi arrow">arrow_outward</span>
          <div class="tile-icon"><span class="mi fill">flag</span></div>
          <div class="tile-title">{{ 'nav.quests' | translate }}</div>
          <div class="tile-desc">Active &amp; rewards</div>
        </a>
        <a routerLink="/vip" class="tile amber">
          <span class="mi arrow">arrow_outward</span>
          <div class="tile-icon"><span class="mi fill">workspace_premium</span></div>
          <div class="tile-title">VIP</div>
          <div class="tile-desc">{{ 'home.vipDesc' | translate }}</div>
        </a>
        <a routerLink="/bills" class="tile emerald">
          <span class="mi arrow">arrow_outward</span>
          <div class="tile-icon"><span class="mi fill">payments</span></div>
          <div class="tile-title">{{ 'nav.bills' | translate }}</div>
          <div class="tile-desc">{{ 'home.billsDesc' | translate }}</div>
        </a>
        <a routerLink="/help" class="tile rose">
          <span class="mi arrow">arrow_outward</span>
          <div class="tile-icon"><span class="mi fill">help</span></div>
          <div class="tile-title">{{ 'nav.help' | translate }}</div>
          <div class="tile-desc">{{ 'home.helpLink' | translate }}</div>
        </a>
      </div>

      <div *ngIf="p2pListings.length > 0" class="mt-6">
        <h2 class="mb-3 row gap-2" style="justify-content:space-between">
          <span class="row gap-2"><span class="mi" style="color:var(--accent)">storefront</span>{{ 'home.p2pLatest' | translate }}</span>
          <a routerLink="/p2p-market" class="btn ghost sm">{{ 'home.viewAll' | translate }} <span class="mi sm">arrow_forward</span></a>
        </h2>
        <div class="p2p-strip">
          <a routerLink="/p2p-market" class="p2p-mini" *ngFor="let l of p2pListings">
            <div class="p2p-thumb">
              <img *ngIf="l.image_url; else noImg" [src]="l.image_url">
              <ng-template #noImg><span class="mi xl">inventory_2</span></ng-template>
            </div>
            <div class="p2p-name">{{ l.item_name || ('#' + l.item_id) }}</div>
            <div class="p2p-price mono">{{ l.price | number }} <span class="muted">coins</span></div>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .p2p-strip { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
    .p2p-mini { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 10px;
                text-decoration: none; color: var(--text); transition: border-color .12s ease, transform .12s ease; }
    .p2p-mini:hover { border-color: var(--accent); transform: translateY(-2px); }
    .p2p-thumb { aspect-ratio: 1; background: var(--surface-2); border-radius: 6px; display: flex; align-items: center;
                 justify-content: center; overflow: hidden; margin-bottom: 8px; }
    .p2p-thumb img { width: 100%; height: 100%; object-fit: contain; padding: 8px; }
    .p2p-name { font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .p2p-price { font-weight: 700; margin-top: 2px; }
  `],
})
export class HomeComponent implements OnInit {
  loading = false;
  error: string | null = null;
  code: string | null = null;
  copied = false;
  recentGain = 0;
  p2pListings: P2pListing[] = [];

  constructor(
    public auth: AuthService,
    public coins: CoinsService,
    public basket: BasketService,
    private link: LinkService,
    private p2p: P2pService,
    private t: TranslateService,
  ) {}

  ngOnInit() {
    this.p2p.listActive({ page: 1, limit: 6 }).subscribe({
      next: p => { this.p2pListings = p.items.slice(0, 6); },
      error: () => this.p2pListings = [],
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
    navigator.clipboard.writeText(`/link ${this.code}`).then(() => {
      this.copied = true; setTimeout(() => this.copied = false, 2000);
    });
  }
}
