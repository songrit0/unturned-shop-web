import { Component, OnInit } from '@angular/core';
import { filter, switchMap } from 'rxjs/operators';
import { AuthService, Me } from '../../services/auth.service';
import { BasketService } from '../../services/basket.service';
import { VersionService } from '../../services/version.service';
import { ItemSubmissionsService } from '../../services/item-submissions.service';
import { TopupService } from '../../services/topup.service';

@Component({
  selector: 'app-sidebar',
  template: `
    <aside class="sidebar">
      <a routerLink="/" class="brand">
        <div class="brand-mark"><span class="mi fill">handshake</span></div>
        <div>
          <div class="brand-name">meowpow</div>
          <div class="brand-tag">MARKETPLACE · UNTURNED</div>
        </div>
      </a>

      <!-- P2P — the headline feature, sits at the very top. Market is public;
           the personal items are auth only. -->
      <div class="nav-section-label"><span class="mi">handshake</span>{{ 'nav.section.p2p' | translate }}</div>
      <a routerLink="/p2p-market" routerLinkActive="active" class="nav-item">
        <span class="mi">storefront</span>{{ 'nav.p2pMarket' | translate }}
      </a>
      <ng-container *ngIf="auth.me$ | async as me">
        <a routerLink="/p2p-garage" routerLinkActive="active" class="nav-item">
          <span class="mi">directions_car</span>{{ 'nav.p2pGarage' | translate }}
        </a>
        <a routerLink="/my-listings" routerLinkActive="active" class="nav-item">
          <span class="mi">sell</span>{{ 'nav.myListings' | translate }}
        </a>
        <a routerLink="/vaults" routerLinkActive="active" class="nav-item">
          <span class="mi">inventory</span>{{ 'nav.vaults' | translate }}
        </a>
      </ng-container>

      <!-- ACCOUNT — auth only -->
      <ng-container *ngIf="auth.me$ | async as me">
        <div class="nav-section-label"><span class="mi">person</span>{{ 'nav.section.account' | translate }}</div>
        <a routerLink="/home" routerLinkActive="active" class="nav-item">
          <span class="mi">dashboard</span>{{ 'nav.dashboard' | translate }}
        </a>
        <a routerLink="/coins" routerLinkActive="active" class="nav-item">
          <span class="mi">paid</span>{{ 'coins.title' | translate }}
        </a>
        <a  routerLink="/topup" routerLinkActive="active" class="nav-item">
          <span class="mi">account_balance_wallet</span>{{ 'topup.title' | translate }}
        </a>
        <a routerLink="/codes" routerLinkActive="active" class="nav-item">
          <span class="mi">qr_code_2</span>{{ 'nav.codes' | translate }}
        </a>
        <a routerLink="/inventory" routerLinkActive="active" class="nav-item">
          <span class="mi">redeem</span>{{ 'nav.inventory' | translate }}
        </a>
        <a routerLink="/quests" routerLinkActive="active" class="nav-item">
          <span class="mi">flag</span>{{ 'nav.quests' | translate }}
        </a>
        <a routerLink="/draw" routerLinkActive="active" class="nav-item">
          <span class="mi">casino</span>{{ 'nav.draw' | translate }}
        </a>
        <a routerLink="/daily" routerLinkActive="active" class="nav-item">
          <span class="mi">redeem</span>{{ 'nav.daily' | translate }}
        </a>
        <a routerLink="/vip" routerLinkActive="active" class="nav-item">
          <span class="mi">workspace_premium</span>VIP
        </a>
      </ng-container>

      <!-- SHOP — demoted below P2P + Account; still public (visible logged-out) -->
      <div class="nav-section-label"><span class="mi">shopping_cart</span>{{ 'nav.section.shop' | translate }}</div>
      <a routerLink="/shop" routerLinkActive="active" class="nav-item">
        <span class="mi">shopping_bag</span>{{ 'nav.shop' | translate }}
      </a>
      <a routerLink="/vehicles" routerLinkActive="active" class="nav-item">
        <span class="mi">directions_car</span>{{ 'nav.vehicles' | translate }}
      </a>
      <a routerLink="/sell-prices" routerLinkActive="active" class="nav-item">
        <span class="mi">sell</span>{{ 'nav.sellPrices' | translate }}
      </a>
      <a routerLink="/bills" routerLinkActive="active" class="nav-item">
        <span class="mi">payments</span>{{ 'nav.bills' | translate }}
      </a>
      <a routerLink="/market/history" routerLinkActive="active" class="nav-item">
        <span class="mi">receipt_long</span>{{ 'nav.marketHistory' | translate }}
      </a>

      <!-- ADMIN — admins only -->
      <ng-container *ngIf="(auth.me$ | async)?.is_admin">
        <div class="nav-section-label"><span class="mi">admin_panel_settings</span>{{ 'nav.section.admin' | translate }}</div>
        <a routerLink="/admin/market" routerLinkActive="active" class="nav-item admin">
          <span class="mi">build</span>{{ 'nav.adminMarket' | translate }}
        </a>
        <a routerLink="/admin/items" routerLinkActive="active" class="nav-item admin">
          <span class="mi">inventory_2</span>{{ 'nav.adminItems' | translate }}
        </a>
        <a routerLink="/admin/vehicles" routerLinkActive="active" class="nav-item admin">
          <span class="mi">directions_car</span>{{ 'nav.adminVehicles' | translate }}
        </a>
        <a routerLink="/admin/vehicle-market" routerLinkActive="active" class="nav-item admin">
          <span class="mi">two_wheeler</span>{{ 'nav.adminVehicleMarket' | translate }}
        </a>
        <a routerLink="/admin/codes" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" class="nav-item admin">
          <span class="mi">confirmation_number</span>{{ 'nav.adminCodes' | translate }}
        </a>
        <a routerLink="/admin/codes/new" routerLinkActive="active" class="nav-item admin">
          <span class="mi">bolt</span>{{ 'nav.adminCreateCode' | translate }}
        </a>
        <a routerLink="/admin/item-types" routerLinkActive="active" class="nav-item admin">
          <span class="mi">category</span>{{ 'nav.adminItemTypes' | translate }}
        </a>
        <a routerLink="/admin/coins" routerLinkActive="active" class="nav-item admin">
          <span class="mi">account_balance_wallet</span>{{ 'nav.adminCoins' | translate }}
        </a>
        <a routerLink="/admin/notifications" routerLinkActive="active" class="nav-item admin">
          <span class="mi">notifications</span>Notifications
        </a>
        <a routerLink="/admin/help" routerLinkActive="active" class="nav-item admin">
          <span class="mi">help</span>Help / Guide
        </a>
        <a routerLink="/admin/meowcoins" routerLinkActive="active" class="nav-item admin">
          <img class="coin-img meow nav-coin" src="assets/coins/meowcoin.png" alt="">{{ 'nav.adminMeowcoins' | translate }}
        </a>
        <a routerLink="/admin/donate-tiers" routerLinkActive="active" class="nav-item admin">
          <img class="coin-img meow nav-coin" src="assets/coins/meowcoin.png" alt="">{{ 'nav.adminDonate' | translate }}
        </a>
        <a routerLink="/admin/vip" routerLinkActive="active" class="nav-item admin">
          <span class="mi">workspace_premium</span>VIP
        </a>
        <a routerLink="/admin/gacha" routerLinkActive="active" class="nav-item admin">
          <span class="mi">casino</span>{{ 'nav.adminGacha' | translate }}
        </a>
        <a routerLink="/admin/daily" routerLinkActive="active" class="nav-item admin">
          <span class="mi">redeem</span>{{ 'nav.adminDaily' | translate }}
        </a>
        <a routerLink="/admin/quests" routerLinkActive="active" class="nav-item admin">
          <span class="mi">flag</span>{{ 'nav.adminQuests' | translate }}
        </a>
        <a routerLink="/admin/vaults" routerLinkActive="active" class="nav-item admin">
          <span class="mi">inventory</span>{{ 'nav.adminVaults' | translate }}
        </a>
        <a routerLink="/admin/submissions" routerLinkActive="active" class="nav-item admin">
          <span class="mi">edit_note</span>{{ 'nav.adminSubmissions' | translate }}
          <span *ngIf="pendingSubmissions > 0" class="badge rose" style="margin-left:auto;font-size:10px">{{ pendingSubmissions }}</span>
        </a>
      </ng-container>

      <!-- Help — ungrouped, near footer -->
      <a routerLink="/help" routerLinkActive="active" class="nav-item">
        <span class="mi">help</span>{{ 'nav.help' | translate }}
      </a>

      <div class="sidebar-footer">
        <div class="status-row">
          <span class="status-dot"></span>
          <span>{{ apiStatus }}</span>
        </div>
        <div>web v{{ version.web.version }}</div>
      </div>
    </aside>
  `,
})
export class SidebarComponent implements OnInit {
  apiStatus = 'online';
  pendingSubmissions = 0;
  // Soft-launch gate: while admin_only, only admins see the Top-up entry. Opened to all when false.
  topupAdminOnly = true;

  constructor(
    public auth: AuthService,
    public basket: BasketService,
    public version: VersionService,
    private submissions: ItemSubmissionsService,
    private topup: TopupService,
  ) { }

  /** Show the Top-up nav item when the user can actually reach the page (matches topupGuard). */


  ngOnInit() {
    this.topup.getTopupConfig().subscribe({ next: c => this.topupAdminOnly = c.admin_only, error: () => { } });
    this.version.fetchApi().subscribe(v => {
      this.apiStatus = v ? `api v${v.version} · online` : 'api · offline';
    });
    // Fetch pending submissions count whenever an admin logs in. Single page=1&limit=1 hit
    // gives us `total` from the paginator envelope.
    this.auth.me$.pipe(
      filter(me => !!me?.is_admin),
      switchMap(() => this.submissions.adminList('pending', null, 1, 1)),
    ).subscribe({
      next: p => { this.pendingSubmissions = p.total; },
      error: () => { },
    });
  }
}
