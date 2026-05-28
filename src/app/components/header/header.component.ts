import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CoinsService } from '../../services/coins.service';
import { ThemeService } from '../../services/theme.service';
import { LangService } from '../../services/lang.service';
import { BasketService } from '../../services/basket.service';

@Component({
  selector: 'app-header',
  template: `
    <header class="app-header">
      <!-- <div class="app-header-search">
        <span class="mi lead">search</span>
        <input type="search" [(ngModel)]="q" (keydown.enter)="search()" [placeholder]="'header.search' | translate">
        <kbd>⌘K</kbd>
      </div> -->

      <div class="header-actions">
        <ng-container *ngIf="auth.me$ | async as me; else loginBtn">
          <button class="coin-pill" (click)="goCoins()" title="Coins">
            <span class="mi fill">paid</span>
            <div class="col" style="gap:0; line-height:1;">
              <span class="coin-amount">{{ (coins.balance$ | async) ?? '—' }}</span>
              <span class="coin-label">BALANCE</span>
            </div>
          </button>

          <button class="icon-btn" (click)="basket.toggle()" [title]="'basket.title' | translate">
            <span class="mi">shopping_cart</span>
            <span *ngIf="basketCount() > 0" class="badge-dot">{{ basketCount() }}</span>
          </button>

          <button class="icon-btn" (click)="lang.toggle()" title="Language" style="width:auto; padding: 0 10px; font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing:0.08em;">
            {{ (lang.lang$ | async) === 'th' ? 'TH' : 'EN' }}
          </button>

          <button class="icon-btn" (click)="theme.toggle()" title="Theme">
            <span class="mi">{{ (theme.theme$ | async) === 'dark' ? 'light_mode' : 'dark_mode' }}</span>
          </button>

          <!-- <button class="icon-btn" title="Notifications">
            <span class="mi">notifications</span>
            <span class="dot-amber"></span>
          </button> -->

          <div class="h-divider"></div>

          <div class="user-block" [title]="me.username">
            <div class="avatar">
              <img *ngIf="me.avatar; else initials"
                [src]="'https://cdn.discordapp.com/avatars/' + me.discord_id + '/' + me.avatar + '.png'" [alt]="me.username">
              <ng-template #initials>{{ initial(me.username) }}</ng-template>
            </div>
            <div class="col" style="gap:0;">
              <span class="user-name">{{ me.username }}</span>
              <span class="user-id">{{ me.discord_id | slice:0:10 }}…</span>
            </div>
            <button class="icon-btn" (click)="logout()" [title]="'nav.logout' | translate" style="width:32px;height:32px;">
              <span class="mi sm">logout</span>
            </button>
          </div>
        </ng-container>
        <ng-template #loginBtn>
          <button class="icon-btn" (click)="lang.toggle()" style="width:auto; padding: 0 10px; font-family: var(--font-mono); font-size: 11px; font-weight: 700;">
            {{ (lang.lang$ | async) === 'th' ? 'TH' : 'EN' }}
          </button>
          <button class="icon-btn" (click)="theme.toggle()">
            <span class="mi">{{ (theme.theme$ | async) === 'dark' ? 'light_mode' : 'dark_mode' }}</span>
          </button>
          <a routerLink="/login" class="btn primary">{{ 'nav.login' | translate }}</a>
        </ng-template>
      </div>
    </header>
  `,
})
export class HeaderComponent implements OnInit {
  q = '';
  constructor(
    public auth: AuthService,
    public coins: CoinsService,
    public theme: ThemeService,
    public lang: LangService,
    public basket: BasketService,
    private router: Router,
  ) { }

  ngOnInit() {
    this.auth.me$.subscribe(me => {
      if (me) {
        this.coins.refreshMe().subscribe();
        this.basket.view().subscribe();
      }
    });
  }

  basketCount(): number { return this.basket.count; }
  initial(name: string): string { return (name?.[0] || '?').toUpperCase(); }
  goCoins() { this.router.navigate(['/coins']); }
  search() {
    const s = this.q.trim();
    if (!s) return;
    this.router.navigate(['/shop'], { queryParams: { q: s } });
  }
  logout() { this.auth.clear(); this.router.navigate(['/login']); }
}
