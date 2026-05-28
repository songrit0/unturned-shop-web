import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { BasketService } from '../../services/basket.service';
import { VersionService } from '../../services/version.service';

@Component({
  selector: 'app-sidebar',
  template: `
    <aside class="sidebar">
      <a routerLink="/" class="brand">
        <div class="brand-mark"><span class="mi fill">storefront</span></div>
        <div>
          <div class="brand-name">SellVault</div>
          <div class="brand-tag">SHOP · UNTURNED</div>
        </div>
      </a>

      <div class="nav-section-label">{{ 'nav.section.main' | translate }}</div>
      <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}" class="nav-item">
        <span class="mi">home</span>{{ 'nav.home' | translate }}
      </a>
      <a routerLink="/shop" routerLinkActive="active" class="nav-item">
        <span class="mi">shopping_bag</span>{{ 'nav.shop' | translate }}
      </a>
      <a routerLink="/bills" routerLinkActive="active" class="nav-item">
        <span class="mi">payments</span>{{ 'nav.bills' | translate }}
      </a>
      <a routerLink="/market/history" routerLinkActive="active" class="nav-item">
        <span class="mi">receipt_long</span>{{ 'nav.marketHistory' | translate }}
      </a>

      <ng-container *ngIf="auth.me$ | async as me">
        <div class="nav-section-label">{{ 'nav.section.account' | translate }}</div>
        <a routerLink="/coins" routerLinkActive="active" class="nav-item">
          <span class="mi">paid</span>{{ 'coins.title' | translate }}
        </a>
        <a routerLink="/codes" routerLinkActive="active" class="nav-item">
          <span class="mi">qr_code_2</span>{{ 'nav.codes' | translate }}
        </a>
        <a routerLink="/quests" routerLinkActive="active" class="nav-item">
          <span class="mi">flag</span>{{ 'nav.quests' | translate }}
        </a>
        <a routerLink="/help" routerLinkActive="active" class="nav-item">
          <span class="mi">help</span>{{ 'nav.help' | translate }}
        </a>

        <ng-container *ngIf="me.is_admin">
          <div class="nav-section-label">{{ 'nav.section.admin' | translate }}</div>
          <a routerLink="/admin/market" routerLinkActive="active" class="nav-item admin">
            <span class="mi">build</span>{{ 'nav.adminMarket' | translate }}
          </a>
          <a routerLink="/admin/items" routerLinkActive="active" class="nav-item admin">
            <span class="mi">inventory_2</span>Items
          </a>
          <a routerLink="/admin/item-types" routerLinkActive="active" class="nav-item admin">
            <span class="mi">category</span>Types
          </a>
          <a routerLink="/admin/coins" routerLinkActive="active" class="nav-item admin">
            <span class="mi">account_balance_wallet</span>{{ 'nav.adminCoins' | translate }}
          </a>
          <a routerLink="/admin/quests" routerLinkActive="active" class="nav-item admin">
            <span class="mi">flag</span>Quests
          </a>
        </ng-container>
      </ng-container>

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
  constructor(public auth: AuthService, public basket: BasketService, public version: VersionService) {}
  ngOnInit() {
    this.version.fetchApi().subscribe(v => {
      this.apiStatus = v ? `api v${v.version} · online` : 'api · offline';
    });
  }
}
