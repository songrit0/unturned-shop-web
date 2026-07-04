import { Component, OnDestroy, OnInit } from '@angular/core';
import { filter, take } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { LinkService, WelcomeResult } from '../../services/link.service';
import { CoinsService } from '../../services/coins.service';
import { BasketService } from '../../services/basket.service';
import { P2pService } from '../../services/p2p.service';
import { PlayerStatsService, PlayerStatEntry } from '../../services/player-stats.service';
import { GachaService, GachaState, RankRewards } from '../../services/gacha.service';
import { DailyService, DailyStatus, DailyReward, DailyTiersPreview, DailyTierPreview } from '../../services/daily.service';
import { BackpackService, BackpackMe, BackpackPayMethod } from '../../services/backpack.service';
import { VipService } from '../../services/vip.service';
import { TopupService } from '../../services/topup.service';
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

      <a *ngIf="drawState?.enabled" routerLink="/draw" class="draw-banner">
        <div class="draw-banner-icon"><span class="mi fill">casino</span></div>
        <div class="grow">
          <div class="draw-banner-title">{{ 'draw.title' | translate }}</div>
          <div class="draw-banner-sub muted text-sm">
            <span *ngIf="drawState && drawState.totalRemaining > 0">{{ 'draw.youHave' | translate }} <b>{{ drawState.totalRemaining }}</b> {{ 'draw.spinsLeft' | translate }}</span>
            <span *ngIf="drawState && drawState.totalRemaining <= 0">{{ 'draw.noSpins' | translate }}</span>
          </div>
        </div>
        <span class="draw-banner-cta btn primary sm"><span class="mi sm">casino</span>{{ 'draw.spin' | translate }}</span>
      </a>

      <!-- Daily reward — mirrors the draw banner, enriched with the full claimable reward set -->
      <a *ngIf="dailyStatus?.enabled" routerLink="/daily" class="draw-banner daily-banner">
        <div class="draw-banner-icon daily"><span class="mi fill">redeem</span></div>
        <div class="grow">
          <div class="draw-banner-title">{{ 'daily.title' | translate }}</div>

          <!-- All claimable items + vehicles + coins -->
          <div class="daily-rewards" *ngIf="dailyStatus as ds">
            <span class="daily-coins" *ngIf="ds.reward.coins > 0">
              <img class="coin-img" src="assets/coins/coin.png" alt=""><b>{{ ds.reward.coins | number }}</b>
            </span>
            <span class="daily-thumb" *ngFor="let r of dailyRewards(ds)" [title]="r.label">
              <img *ngIf="r.imageUrl; else dti" [src]="r.imageUrl" [alt]="r.label">
              <ng-template #dti><span class="mi sm">{{ r.kind === 1 ? 'directions_car' : 'inventory_2' }}</span></ng-template>
              <span *ngIf="r.amount > 1" class="daily-qty">×{{ r.amount }}</span>
            </span>
            <span *ngIf="ds.reward.coins <= 0 && dailyRewards(ds).length === 0" class="muted text-xs">{{ 'daily.noReward' | translate }}</span>
          </div>

          <div class="draw-banner-sub muted text-xs">
            <span *ngIf="dailyStatus?.alreadyClaimedToday"><span class="mi sm">restart_alt</span>{{ 'daily.nextIn' | translate }} {{ dailyCountdown }}</span>
            <span *ngIf="!dailyStatus?.alreadyClaimedToday && dailyStatus?.tier === 'normal'" class="daily-upsell">{{ 'daily.vipUpsell' | translate }}</span>
          </div>
        </div>
        <span class="draw-banner-cta btn sm" [class.primary]="dailyStatus?.canClaim" [class.secondary]="!dailyStatus?.canClaim">
          <span class="mi sm">{{ dailyStatus?.canClaim ? 'redeem' : 'check' }}</span>
          {{ (dailyStatus?.canClaim ? 'daily.claimBtn' : 'daily.claimedShort') | translate }}
        </span>
      </a>

      <!-- VIP benefits: daily reward compare + vault sizes + backpack upgrade -->
      <section class="card vip-card">
        <div class="vb-head">
          <span class="row gap-2">
            <span class="mi fill" style="color:var(--amber)">workspace_premium</span>
            <span class="fw-7">{{ 'vipBenefits.title' | translate }}</span>
            <span *ngIf="isVip" class="badge amber">VIP</span>
          </span>
          <a routerLink="/vip" class="btn ghost sm">
            {{ (isVip ? 'vipBenefits.extend' : 'vipBenefits.getVip') | translate }} <span class="mi sm">arrow_forward</span>
          </a>
        </div>

        <div class="vb-grid">
          <!-- 1) Daily reward: normal vs VIP (from DB) -->
          <div class="vb-block" *ngIf="dailyPreview as dp">
            <div class="vb-title"><span class="mi sm">redeem</span>{{ 'vipBenefits.daily' | translate }}</div>
            <div class="vb-compare">
              <div class="vb-col">
                <div class="vb-tag">{{ 'vipBenefits.normal' | translate }}</div>
                <div class="vb-goods">
                  <span class="daily-coins" *ngIf="dp.normal.reward.coins > 0">
                    <img class="coin-img" src="assets/coins/coin.png" alt=""><b>{{ dp.normal.reward.coins | number }}</b>
                  </span>
                  <span class="daily-thumb" *ngFor="let r of previewGoods(dp.normal)" [title]="r.label">
                    <img *ngIf="r.imageUrl; else pn" [src]="r.imageUrl" [alt]="r.label">
                    <ng-template #pn><span class="mi sm">{{ r.kind === 1 ? 'directions_car' : 'inventory_2' }}</span></ng-template>
                    <span *ngIf="r.amount > 1" class="daily-qty">×{{ r.amount }}</span>
                  </span>
                  <span *ngIf="dp.normal.reward.coins <= 0 && previewGoods(dp.normal).length === 0" class="muted text-xs">—</span>
                </div>
              </div>
              <span class="mi vb-arrow">arrow_forward</span>
              <div class="vb-col vip">
                <div class="vb-tag vip">VIP</div>
                <div class="vb-goods">
                  <span class="daily-coins" *ngIf="dp.vip.reward.coins > 0">
                    <img class="coin-img" src="assets/coins/coin.png" alt=""><b>{{ dp.vip.reward.coins | number }}</b>
                  </span>
                  <span class="daily-thumb" *ngFor="let r of previewGoods(dp.vip)" [title]="r.label">
                    <img *ngIf="r.imageUrl; else pv" [src]="r.imageUrl" [alt]="r.label">
                    <ng-template #pv><span class="mi sm">{{ r.kind === 1 ? 'directions_car' : 'inventory_2' }}</span></ng-template>
                    <span *ngIf="r.amount > 1" class="daily-qty">×{{ r.amount }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 2) Vault sizes -->
          <div class="vb-block">
            <div class="vb-title"><span class="mi sm">inventory</span>{{ 'vipBenefits.vaults' | translate }}</div>
            <div class="vb-compare">
              <div class="vb-col">
                <div class="vb-tag">{{ 'vipBenefits.normal' | translate }}</div>
                <div class="vb-size mono">6×3</div>
              </div>
              <span class="mi vb-arrow">arrow_forward</span>
              <div class="vb-col vip">
                <div class="vb-tag vip">VIP</div>
                <div class="vb-size mono">6×8</div>
              </div>
            </div>
          </div>

          <!-- 3) Backpack upgrade (coins / meowcoins / mixed) -->
          <div class="vb-block wide" *ngIf="bp?.enabled">
            <div class="vb-title">
              <span class="mi sm">backpack</span>{{ 'vipBenefits.backpack' | translate }}
              <span class="badge amber" *ngIf="bp!.vip_only">VIP</span>
            </div>
            <div class="bp-row">
              <div class="bp-stat">
                <span class="bp-label">{{ 'vipBenefits.bpLevel' | translate }}</span>
                <span class="bp-value mono">{{ bp!.level }}<span class="muted">/{{ bp!.max_level }}</span></span>
              </div>
              <div class="bp-stat">
                <span class="bp-label">{{ 'vipBenefits.bpSize' | translate }}</span>
                <span class="bp-value mono">{{ bp!.width }}×{{ bp!.height }}</span>
              </div>
              <span *ngIf="bp!.at_max" class="badge emerald">MAX</span>
            </div>

            <ng-container *ngIf="!bp!.at_max && bp!.next as nx">
              <div class="bp-btns" *ngIf="bp!.can_upgrade; else bpLocked">
                <button class="btn primary sm" (click)="openBpModal()">
                  <span class="mi sm">upgrade</span>
                  {{ 'vipBenefits.upgrade' | translate }} — {{ nx.coins | number }}
                  <img class="coin-img" src="assets/coins/coin.png" alt="">
                  <ng-container *ngIf="nx.meowcoins != null">
                    <span class="muted">/</span> {{ nx.meowcoins | number }}
                    <img class="coin-img meow" src="assets/coins/meowcoin.png" alt="">
                  </ng-container>
                </button>
              </div>
              <ng-template #bpLocked>
                <div class="bp-locked muted text-sm">
                  <span class="mi sm">lock</span>{{ 'vipBenefits.bpVipOnly' | translate }}
                </div>
              </ng-template>
            </ng-container>

            <p *ngIf="bpMsg" class="text-sm mt-2" style="color:var(--emerald)">{{ bpMsg }}</p>
          </div>
        </div>
      </section>

      <!-- Backpack upgrade modal -->
      <div *ngIf="bpModal && bp?.next as nx" class="modal-backdrop" (click)="bpModal = false">
        <div class="modal-card tactical" (click)="$event.stopPropagation()">
          <h3 class="row gap-2 mb-3">
            <span class="mi" style="color:var(--amber)">backpack</span>
            {{ 'vipBenefits.bpModalTitle' | translate:{ level: bp!.level + 1 } }}
          </h3>

          <div class="bpm-balances muted text-xs mb-3">
            <span>{{ 'vipBenefits.balance' | translate }}:</span>
            <span class="mono">{{ (coins.balance$ | async) ?? '—' | number }} <img class="coin-img" src="assets/coins/coin.png" alt=""></span>
            <span class="mono" *ngIf="nx.meowcoins != null">{{ (topup.balance$ | async) ?? '—' | number }} <img class="coin-img meow" src="assets/coins/meowcoin.png" alt=""></span>
          </div>

          <!-- Meow discount: player picks the amount (only when mixed is allowed) -->
          <ng-container *ngIf="bp!.mixed_allowed && nx.meowcoins != null">
            <label class="bpm-label">{{ 'vipBenefits.useMeow' | translate }} (0–{{ nx.meowcoins | number }})</label>
            <div class="row gap-2" style="align-items:center;">
              <input type="range" class="grow" min="0" [max]="nx.meowcoins" step="1" [(ngModel)]="meowUse">
              <input class="input bpm-num" type="number" min="0" [max]="nx.meowcoins" [(ngModel)]="meowUse">
              <img class="coin-img meow" src="assets/coins/meowcoin.png" alt="">
            </div>
          </ng-container>

          <!-- No mixed: plain currency choice -->
          <ng-container *ngIf="!bp!.mixed_allowed && nx.meowcoins != null">
            <label class="bpm-label">{{ 'vipBenefits.payWith' | translate }}</label>
            <div class="row gap-2">
              <label class="bpm-radio"><input type="radio" name="bpcur" value="coins" [(ngModel)]="payCurrency">
                {{ nx.coins | number }} <img class="coin-img" src="assets/coins/coin.png" alt=""></label>
              <label class="bpm-radio"><input type="radio" name="bpcur" value="meowcoins" [(ngModel)]="payCurrency">
                {{ nx.meowcoins | number }} <img class="coin-img meow" src="assets/coins/meowcoin.png" alt=""></label>
            </div>
          </ng-container>

          <!-- Live total -->
          <div class="bpm-total">
            <span class="muted text-sm">{{ 'vipBenefits.youPay' | translate }}</span>
            <span class="bpm-price mono">
              <ng-container *ngIf="bpCoinsDue > 0">{{ bpCoinsDue | number }} <img class="coin-img" src="assets/coins/coin.png" alt=""></ng-container>
              <ng-container *ngIf="bpCoinsDue > 0 && bpMeowDue > 0"> + </ng-container>
              <ng-container *ngIf="bpMeowDue > 0">{{ bpMeowDue | number }} <img class="coin-img meow" src="assets/coins/meowcoin.png" alt=""></ng-container>
              <ng-container *ngIf="bpCoinsDue <= 0 && bpMeowDue <= 0">—</ng-container>
            </span>
          </div>

          <p *ngIf="bpErr" class="text-rose text-sm mt-2">{{ bpErr }}</p>

          <div class="row gap-2 mt-3" style="justify-content:flex-end;">
            <button class="btn ghost" [disabled]="bpBusy" (click)="bpModal = false">{{ 'vipBenefits.cancel' | translate }}</button>
            <button class="btn primary" [disabled]="bpBusy" (click)="confirmBp()">
              <span class="spinner sm" *ngIf="bpBusy"></span><span class="mi" *ngIf="!bpBusy">upgrade</span>
              {{ 'vipBenefits.confirm' | translate }}
            </button>
          </div>
        </div>
      </div>

      <!-- Free spins by rank -->
      <section *ngIf="rankRewards?.enabled && rankRewards!.entries.length" class="card rank-reward-card">
        <div class="rr-head">
          <span class="row gap-2"><span class="mi" style="color:var(--amber)">emoji_events</span><span class="fw-7">{{ 'draw.rankRewardsTitle' | translate }}</span></span>
          <span class="rr-reset muted text-xs"><span class="mi sm">restart_alt</span>{{ 'draw.resetIn' | translate }} {{ rankResetCountdown }}</span>
        </div>
        <div class="rr-list">
          <div class="rr-row" *ngFor="let e of rankRewards!.entries">
            <span class="rr-rank" [class.gold]="e.rank===1" [class.silver]="e.rank===2" [class.bronze]="e.rank===3">{{ e.rank }}</span>
            <span class="rr-name">{{ e.name }}</span>
            <span class="rr-kills muted text-xs">{{ e.kills | number }} {{ 'draw.killsShort' | translate }}</span>
            <span class="rr-spins"><span class="mi sm">casino</span>{{ e.spins }} {{ 'draw.freeShort' | translate }}</span>
          </div>
        </div>
        <p class="muted text-xs rr-foot">{{ 'draw.rankRewardsHint' | translate }}</p>
      </section>

      <!-- <div class="tile-grid">
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
      </div> -->
<section class="hero" style="padding: 0px 28px 32px 28px;">
      <div class="mt-6">
        <div class="tab-bar">
          <button class="tab-btn" [class.active]="statsTab === 'my'" (click)="statsTab = 'my'">
            <span class="mi">person</span>My Stats
          </button>
          <button class="tab-btn" [class.active]="statsTab === 'top'" (click)="statsTab = 'top'">
            <span class="mi">leaderboard</span>Top Players
          </button>
        </div>

        <!-- My Stats -->
        <ng-container *ngIf="statsTab === 'my'">
          <ng-container *ngIf="!me.linked">
            <div class="tab-empty">
              <span class="mi xl muted">link_off</span>
              <p class="muted text-sm mt-2">Link your Steam account to see your stats.</p>
            </div>
          </ng-container>
          <ng-container *ngIf="me.linked">
            <div *ngIf="myStatsLoading" class="tab-empty"><span class="spinner"></span></div>
            <div *ngIf="!myStatsLoading && !myStats" class="tab-empty">
              <span class="mi xl muted">sports_score</span>
              <p class="muted text-sm mt-2">No stats found. Play on the server to start tracking.</p>
            </div>
            <div *ngIf="myStats" class="my-stats-grid">
              <div class="my-stat-card accent">
                <span class="my-stat-label">KILLS</span>
                <span class="my-stat-value">{{ myStats.kills | number }}</span>
              </div>
              <div class="my-stat-card" [class.kd-good-card]="myStats.kdRatio >= 1">
                <span class="my-stat-label">K/D</span>
                <span class="my-stat-value">{{ myStats.kdRatio | number:'1.2-2' }}</span>
              </div>
              <div class="my-stat-card">
                <span class="my-stat-label">HEADSHOTS</span>
                <span class="my-stat-value">{{ myStats.headshots | number }}</span>
              </div>
              <div class="my-stat-card">
                <span class="my-stat-label">PLAYTIME</span>
                <span class="my-stat-value">{{ formatPlaytime(myStats.playtime) }}</span>
              </div>
              <div class="my-stat-card rose">
                <span class="my-stat-label">PvP DEATHS</span>
                <span class="my-stat-value">{{ myStats.pvpDeaths | number }}</span>
              </div>
              <div class="my-stat-card">
                <span class="my-stat-label">PvE DEATHS</span>
                <span class="my-stat-value">{{ myStats.pveDeaths | number }}</span>
              </div>
              <div class="my-stat-card">
                <span class="my-stat-label">ZOMBIES</span>
                <span class="my-stat-value">{{ myStats.zombies | number }}</span>
              </div>
              <div class="my-stat-card">
                <span class="my-stat-label">MEGA ZOMBIES</span>
                <span class="my-stat-value">{{ myStats.megaZombies | number }}</span>
              </div>
              <div class="my-stat-card">
                <span class="my-stat-label">ANIMALS</span>
                <span class="my-stat-value">{{ myStats.animals | number }}</span>
              </div>
              <div class="my-stat-card">
                <span class="my-stat-label">RESOURCES</span>
                <span class="my-stat-value">{{ myStats.resources | number }}</span>
              </div>
              <div class="my-stat-card">
                <span class="my-stat-label">STRUCTURES</span>
                <span class="my-stat-value">{{ myStats.structures | number }}</span>
              </div>
              <div class="my-stat-card">
                <span class="my-stat-label">BARRICADES</span>
                <span class="my-stat-value">{{ myStats.barricades | number }}</span>
              </div>
            </div>
          </ng-container>
        </ng-container>

        <!-- Top Players -->
        <ng-container *ngIf="statsTab === 'top'">
          <div *ngIf="statsLoading" class="tab-empty"><span class="spinner"></span></div>
          <div *ngIf="!statsLoading && leaderboard.length === 0" class="tab-empty muted text-sm">No data yet.</div>
          <div *ngIf="leaderboard.length > 0" class="stats-table">
            <div class="stats-row stats-header">
              <span>#</span><span>Name</span><span>Kills</span><span>K/D</span><span>HS</span><span>Playtime</span>
            </div>
            <div class="stats-row" *ngFor="let p of leaderboard; let i = index">
              <span class="rank" [class.gold]="i===0" [class.silver]="i===1" [class.bronze]="i===2">{{ i + 1 }}</span>
              <span class="player-name">{{ p.name }}</span>
              <span class="mono">{{ p.kills | number }}</span>
              <span class="mono" [class.kd-good]="p.kdRatio >= 1">{{ p.kdRatio | number:'1.2-2' }}</span>
              <span class="mono">{{ p.headshots | number }}</span>
              <span class="mono muted">{{ formatPlaytime(p.playtime) }}</span>
            </div>
          </div>
        </ng-container>
      </div>

  </section>
      <div *ngIf="p2pListings.length > 0" class="mt-6">
        <h2 class="mb-3 row gap-2" style="justify-content:space-between">
          <span class="row gap-2"><span class="mi" style="color:var(--accent)">storefront</span>{{ 'home.p2pLatest' | translate }}</span>
          <a routerLink="/p2p-market" class="btn ghost sm">{{ 'home.viewAll' | translate }} <span class="mi sm">arrow_forward</span></a>
        </h2>
        <div class="p2p-strip">
          <a routerLink="/p2p-market" class="p2p-mini" *ngFor="let l of p2pListings">
            <div class="p2p-thumb">
              <img *ngIf="bundleThumb(l); else noImg" [src]="bundleThumb(l)">
              <ng-template #noImg><span class="mi xl">{{ l.is_bundle ? 'package_2' : 'inventory_2' }}</span></ng-template>
            </div>
            <div class="p2p-name">{{ l.is_bundle ? ('p2p.bundle' | translate:{ n: l.bundleItems?.length || l.amount }) : (l.item_name || ('#' + l.item_id)) }}</div>
            <div class="p2p-price mono">{{ l.price | number }} <span class="muted">coins</span></div>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .draw-banner { display:flex; align-items:center; gap:14px; margin:16px 0; padding:16px 18px; text-decoration:none;
      color:var(--text); border-radius:14px; border:1px solid var(--border);
      background:linear-gradient(100deg, color-mix(in srgb, var(--violet,#a78bfa) 16%, var(--surface)), var(--surface)); transition:transform .12s ease, border-color .12s ease; }
    .draw-banner:hover { transform:translateY(-2px); border-color:var(--violet,#a78bfa); }
    .draw-banner-icon { width:46px; height:46px; border-radius:12px; flex:0 0 auto; display:flex; align-items:center; justify-content:center;
      background:color-mix(in srgb, var(--violet,#a78bfa) 22%, var(--surface-2)); color:var(--violet,#a78bfa); }
    .draw-banner-icon .mi { font-size:26px; }
    .draw-banner-title { font-weight:800; font-size:16px; }
    .draw-banner-cta { flex:0 0 auto; }
    /* Daily reward banner — amber accent to distinguish from the violet draw banner */
    .daily-banner { background:linear-gradient(100deg, color-mix(in srgb, var(--amber,#f5c518) 14%, var(--surface)), var(--surface)); }
    .daily-banner:hover { border-color:var(--amber,#f5c518); }
    .draw-banner-icon.daily { background:color-mix(in srgb, var(--amber,#f5c518) 22%, var(--surface-2)); color:var(--amber,#f5c518); }
    .daily-rewards { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin:6px 0 4px; }
    .daily-coins { display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:8px;
      background:var(--surface-2); border:1px solid var(--border); font-size:13px; }
    .daily-coins .coin-img { width:15px; height:15px; }
    .daily-thumb { position:relative; width:34px; height:34px; border-radius:8px; background:var(--surface-2);
      border:1px solid var(--border); display:flex; align-items:center; justify-content:center; overflow:hidden; }
    .daily-thumb img { max-width:100%; max-height:100%; object-fit:contain; padding:2px; }
    .daily-thumb .mi { color:var(--text-faint); }
    .daily-qty { position:absolute; right:1px; bottom:1px; font-size:9px; font-weight:700; line-height:1;
      padding:1px 3px; border-radius:4px; background:rgb(0 0 0 / .65); color:#fff; }
    .daily-upsell { color:var(--amber,#f5c518); }
    /* VIP benefits card */
    .vip-card { margin:16px 0; padding:16px 18px; border-color:color-mix(in srgb, var(--amber,#f5c518) 35%, var(--border)); }
    .vb-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:12px; flex-wrap:wrap; }
    .vb-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px; }
    .vb-block { background:var(--surface-2); border:1px solid var(--border); border-radius:12px; padding:12px 14px; }
    .vb-block.wide { grid-column:1 / -1; }
    .vb-title { display:flex; align-items:center; gap:6px; font-weight:700; font-size:13px; margin-bottom:10px; }
    .vb-compare { display:flex; align-items:stretch; gap:10px; }
    .vb-arrow { align-self:center; color:var(--text-faint); }
    .vb-col { flex:1; border:1px solid var(--border); border-radius:10px; padding:8px 10px; background:var(--surface); }
    .vb-col.vip { border-color:color-mix(in srgb, var(--amber,#f5c518) 55%, var(--border)); }
    .vb-tag { font-size:10px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; color:var(--muted); margin-bottom:6px; }
    .vb-tag.vip { color:var(--amber,#f5c518); }
    .vb-goods { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
    .vb-size { font-size:20px; font-weight:800; }
    .bp-row { display:flex; align-items:center; gap:18px; margin-bottom:10px; flex-wrap:wrap; }
    .bp-stat { display:flex; flex-direction:column; gap:2px; }
    .bp-label { font-size:10px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; color:var(--muted); }
    .bp-value { font-size:18px; font-weight:800; }
    .bp-btns { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .bp-btns .coin-img { width:14px; height:14px; }
    .bp-locked { display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:8px;
      background:var(--surface); border:1px dashed var(--border); }
    .bpm-balances { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .bpm-balances .coin-img { width:13px; height:13px; }
    .bpm-label { display:block; font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase;
      color:var(--muted); margin-bottom:6px; }
    .bpm-num { max-width:110px; }
    .bpm-radio { display:inline-flex; align-items:center; gap:6px; padding:8px 12px; border-radius:10px;
      border:1px solid var(--border); background:var(--surface-2); cursor:pointer; font-weight:600; font-size:13px; }
    .bpm-radio .coin-img { width:14px; height:14px; }
    .bpm-total { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:14px;
      padding:10px 12px; border-radius:10px; background:var(--surface-2); border:1px solid var(--border); }
    .bpm-price { font-size:17px; font-weight:800; display:inline-flex; align-items:center; gap:5px; }
    .bpm-price .coin-img { width:15px; height:15px; }
    .rank-reward-card { margin:16px 0; padding:16px 18px; }
    .rr-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:12px; flex-wrap:wrap; }
    .rr-reset { display:inline-flex; align-items:center; gap:4px; }
    .rr-list { display:flex; flex-direction:column; gap:6px; }
    .rr-row { display:grid; grid-template-columns:30px 1fr auto auto; gap:10px; align-items:center;
      padding:8px 10px; border-radius:10px; background:var(--surface-2); }
    .rr-rank { width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center;
      font-weight:800; font-size:13px; background:var(--surface); color:var(--muted); }
    .rr-rank.gold { background:#f5c518; color:#3a2e00; } .rr-rank.silver { background:#c4c8cc; color:#26292b; } .rr-rank.bronze { background:#cd7f32; color:#2a1600; }
    .rr-name { font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .rr-spins { display:inline-flex; align-items:center; gap:4px; font-weight:700; font-size:13px; color:var(--violet,#a78bfa); }
    .rr-foot { margin-top:10px; }
    .tab-bar { display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 1px solid var(--border); }
    .tab-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: none; border: none;
               border-bottom: 2px solid transparent; margin-bottom: -1px; cursor: pointer;
               color: var(--muted); font-size: 13px; font-weight: 600; transition: color .12s, border-color .12s; }
    .tab-btn:hover { color: var(--text); }
    .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
    .tab-empty { display: flex; flex-direction: column; align-items: center; justify-content: center;
                 padding: 40px 0; text-align: center; }
    .my-stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
    .my-stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
                    padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; }
    .my-stat-card.accent { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, var(--surface)); }
    .my-stat-card.rose   { border-color: var(--rose);   background: color-mix(in srgb, var(--rose)   8%, var(--surface)); }
    .my-stat-card.kd-good-card { border-color: var(--emerald); background: color-mix(in srgb, var(--emerald) 8%, var(--surface)); }
    .my-stat-label { font-size: 10px; font-weight: 700; letter-spacing: .07em; color: var(--muted); text-transform: uppercase; }
    .my-stat-value { font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .stats-table { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    .stats-row { display: grid; grid-template-columns: 36px 1fr 80px 70px 70px 90px; gap: 0; align-items: center;
                 padding: 8px 14px; border-bottom: 1px solid var(--border); font-size: 13px; }
    .stats-row:last-child { border-bottom: none; }
    .stats-header { background: var(--surface-2); font-size: 11px; font-weight: 700; text-transform: uppercase;
                    letter-spacing: .06em; color: var(--muted); }
    .stats-row:not(.stats-header):hover { background: var(--surface-2); }
    .rank { font-weight: 700; font-size: 13px; text-align: center; }
    .rank.gold   { color: #f5c518; }
    .rank.silver { color: #aaa; }
    .rank.bronze { color: #cd7f32; }
    /* ธีมสว่าง: ทอง/เงินสว่างเกินอ่านไม่ออกบนพื้นขาว - ใช้โทนเข้มลง */
    :host-context(.theme-light) .rank.gold   { color: #b45309; }
    :host-context(.theme-light) .rank.silver { color: #6b7280; }
    :host-context(.theme-light) .rank.bronze { color: #92400e; }
    .player-name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .kd-good { color: var(--emerald); }
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
export class HomeComponent implements OnInit, OnDestroy {
  loading = false;
  error: string | null = null;
  code: string | null = null;
  copied = false;
  recentGain = 0;
  p2pListings: P2pListing[] = [];
  // Bundle listings have no own image (item_id=0) — fall back to the first child item's.
  bundleThumb = (l: P2pListing) => l.image_url || l.bundleItems?.find(b => b.image_url)?.image_url || null;
  leaderboard: PlayerStatEntry[] = [];
  statsLoading = true;
  myStats: PlayerStatEntry | null = null;
  myStatsLoading = true;
  statsTab: 'my' | 'top' = 'my';
  drawState: GachaState | null = null;
  rankRewards: RankRewards | null = null;
  rankResetCountdown = '';
  dailyStatus: DailyStatus | null = null;
  dailyCountdown = '';
  dailyPreview: DailyTiersPreview | null = null;
  bp: BackpackMe | null = null;
  isVip = false;
  bpBusy = false;
  bpMsg: string | null = null;
  bpErr: string | null = null;
  bpModal = false;
  meowUse = 0;                                   // player-chosen Meowcoin discount
  payCurrency: 'coins' | 'meowcoins' = 'coins';  // when mixed is not allowed
  private rankTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    public auth: AuthService,
    public coins: CoinsService,
    public basket: BasketService,
    private link: LinkService,
    private p2p: P2pService,
    private playerStats: PlayerStatsService,
    private gacha: GachaService,
    private daily: DailyService,
    private backpack: BackpackService,
    private vip: VipService,
    public topup: TopupService,
    private t: TranslateService,
  ) { }

  ngOnInit() {
    this.gacha.state().subscribe({
      next: s => { this.drawState = s; },
      error: () => { this.drawState = null; },
    });
    this.gacha.rankRewards().subscribe({
      next: r => { this.rankRewards = r; this.tickRankReset(); },
      error: () => { this.rankRewards = null; },
    });
    // Daily reward banner. On 403 (not linked / disabled) we simply hide the banner.
    this.daily.status().subscribe({
      next: s => { this.dailyStatus = s; this.tickDailyReset(); },
      error: () => { this.dailyStatus = null; },
    });
    // VIP benefits card: daily compare + backpack level + own VIP status.
    this.daily.preview().subscribe({
      next: p => { this.dailyPreview = p; },
      error: () => { this.dailyPreview = null; },
    });
    this.backpack.me().subscribe({
      next: b => { this.bp = b; },
      error: () => { this.bp = null; },
    });
    this.vip.mine().subscribe({
      next: m => { this.isVip = (m.grants || []).length > 0; },
      error: () => { this.isVip = false; },
    });
    this.rankTimer = setInterval(() => { this.tickRankReset(); this.tickDailyReset(); }, 1000);
    this.p2p.listActive({ page: 1, limit: 6 }).subscribe({
      next: p => { this.p2pListings = p.items.slice(0, 6); },
      error: () => this.p2pListings = [],
    });
    this.coins.stats().subscribe({
      next: s => { this.recentGain = s.net_change; },
      error: () => { this.recentGain = 0; },
    });
    this.playerStats.leaderboard(10).subscribe({
      next: res => { this.leaderboard = res.players; this.statsLoading = false; },
      error: () => { this.statsLoading = false; },
    });
    this.auth.me$.pipe(filter(me => me !== null), take(1)).subscribe(me => {
      if (me?.steam_id) {
        this.playerStats.getById(me.steam_id).subscribe({
          next: entry => { this.myStats = entry; this.myStatsLoading = false; },
          error: () => { this.myStatsLoading = false; },
        });
      } else {
        this.myStatsLoading = false;
      }
    });
  }

  ngOnDestroy() {
    if (this.rankTimer) { clearInterval(this.rankTimer); this.rankTimer = null; }
  }

  private tickRankReset() {
    if (!this.rankRewards) return;
    const diff = new Date(this.rankRewards.nextResetAt).getTime() - Date.now();
    const s = Math.max(0, Math.floor(diff / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    this.rankResetCountdown = `${h}h ${m}m ${s % 60}s`;
  }

  private tickDailyReset() {
    if (!this.dailyStatus?.nextResetAt) { this.dailyCountdown = ''; return; }
    const diff = new Date(this.dailyStatus.nextResetAt).getTime() - Date.now();
    const s = Math.max(0, Math.floor(diff / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    this.dailyCountdown = `${h}h ${m}m ${s % 60}s`;
  }

  /** Flat list of all claimable items (kind 0) + vehicles (kind 1) for the banner thumbnails. */
  dailyRewards(s: DailyStatus): DailyReward[] {
    return [...(s.reward.items || []), ...(s.reward.vehicles || [])];
  }

  previewGoods(t: DailyTierPreview): DailyReward[] {
    return [...(t.reward.items || []), ...(t.reward.vehicles || [])];
  }

  openBpModal() {
    this.meowUse = 0;
    this.payCurrency = 'coins';
    this.bpMsg = null; this.bpErr = null;
    this.bpModal = true;
    // fresh Meowcoin balance for the modal
    this.topup.meowcoinsMe().subscribe({ error: () => {} });
  }

  private clampMeow(): number {
    const max = this.bp?.next?.meowcoins ?? 0;
    return Math.min(max, Math.max(0, Math.trunc(Number(this.meowUse) || 0)));
  }

  /** Coins due after the chosen Meowcoin discount (pro-rata, same formula as the API). */
  get bpCoinsDue(): number {
    const nx = this.bp?.next;
    if (!nx) return 0;
    if (!this.bp!.mixed_allowed || nx.meowcoins == null) {
      return this.payCurrency === 'meowcoins' && nx.meowcoins != null ? 0 : nx.coins;
    }
    const m = this.clampMeow();
    if (m <= 0) return nx.coins;
    if (m >= nx.meowcoins) return 0;
    return Math.ceil((nx.coins * (nx.meowcoins - m)) / nx.meowcoins);
  }

  get bpMeowDue(): number {
    const nx = this.bp?.next;
    if (!nx || nx.meowcoins == null) return 0;
    if (!this.bp!.mixed_allowed) return this.payCurrency === 'meowcoins' ? nx.meowcoins : 0;
    return this.clampMeow();
  }

  confirmBp() {
    const nx = this.bp?.next;
    if (!nx || this.bpBusy) return;
    let method: BackpackPayMethod = 'coins';
    let meow: number | undefined;
    if (this.bp!.mixed_allowed && nx.meowcoins != null) {
      const m = this.clampMeow();
      if (m >= nx.meowcoins) method = 'meowcoins';
      else if (m > 0) { method = 'mixed'; meow = m; }
    } else if (nx.meowcoins != null && this.payCurrency === 'meowcoins') {
      method = 'meowcoins';
    }
    this.bpBusy = true; this.bpErr = null;
    this.backpack.upgrade(method, meow).subscribe({
      next: r => {
        this.bpBusy = false;
        this.bpModal = false;
        this.bp = r;
        this.bpMsg = this.t.instant('vipBenefits.upgraded', { level: r.level, size: `${r.width}×${r.height}` });
        this.coins.refreshMe().subscribe({ error: () => {} });
        if (r.paid.meowcoins > 0) this.topup.meowcoinsMe().subscribe({ error: () => {} });
      },
      error: e => {
        this.bpBusy = false;
        const code = e?.error?.message;
        const known: Record<string, string> = {
          insufficient_coins: 'vipBenefits.errCoins',
          insufficient_meowcoin: 'vipBenefits.errMeow',
          vip_required: 'vipBenefits.bpVipOnly',
          max_level: 'vipBenefits.errMax',
        };
        this.bpErr = known[code] ? this.t.instant(known[code]) : (code || 'Error');
      },
    });
  }

  formatPlaytime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
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
