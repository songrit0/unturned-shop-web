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
    <header class="sticky top-0 z-30 bg-white/80 dark:bg-slate-800/80 backdrop-blur border-b border-slate-200 dark:border-slate-700">
      <div class="max-w-6xl mx-auto flex items-center justify-between gap-3 p-3">
        <a routerLink="/" class="font-bold text-lg whitespace-nowrap flex items-center gap-2">
          <span class="mi lg text-brand-600">storefront</span>
          <span class="hidden sm:inline">{{ 'app.title' | translate }}</span>
        </a>

        <nav *ngIf="auth.me$ | async" class="flex items-center gap-1 text-sm">
          <a routerLink="/shop" routerLinkActive="text-brand-600"
             class="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1">
            <span class="mi">shopping_bag</span>
            <span class="hidden sm:inline">{{ 'nav.shop' | translate }}</span>
          </a>
          <a routerLink="/bills" routerLinkActive="text-brand-600"
             class="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1">
            <span class="mi">payments</span>
            <span class="hidden sm:inline">{{ 'nav.bills' | translate }}</span>
          </a>
          <a routerLink="/codes" routerLinkActive="text-brand-600"
             class="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1">
            <span class="mi">history</span>
            <span class="hidden sm:inline">โค้ด</span>
          </a>
          <a routerLink="/coins" routerLinkActive="text-brand-600"
             class="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1">
            <span class="mi text-amber-500">paid</span>
            <span class="font-mono">{{ (coins.balance$ | async) ?? '—' }}</span>
          </a>
          <ng-container *ngIf="(auth.me$ | async)?.is_admin">
            <a routerLink="/admin/market" routerLinkActive="text-rose-600"
               class="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 text-rose-500"
               title="จัดการร้านค้า">
              <span class="mi">build</span>
              <span class="hidden lg:inline">Market</span>
            </a>
            <a routerLink="/admin/coins" routerLinkActive="text-rose-600"
               class="px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 text-rose-500"
               title="จัดการ Coin">
              <span class="mi">account_balance_wallet</span>
              <span class="hidden lg:inline">Coins</span>
            </a>
          </ng-container>
        </nav>

        <div class="flex items-center gap-1">
          <button *ngIf="auth.me$ | async" (click)="basket.toggle()" title="Basket"
                  class="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <span class="mi lg">shopping_cart</span>
            <span *ngIf="(basket.basket$ | async)?.items?.length"
                  class="absolute -top-1 -right-1 bg-rose-500 text-white text-xs rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center">
              {{ basketCount() }}
            </span>
          </button>

          <a routerLink="/help" title="วิธีใช้"
             class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <span class="mi">help</span>
          </a>
          <button (click)="lang.toggle()" title="Language"
                  class="text-xs px-2 py-1 rounded font-mono uppercase hover:bg-slate-100 dark:hover:bg-slate-700">
            {{ (lang.lang$ | async) === 'th' ? 'TH' : 'EN' }}
          </button>
          <button (click)="theme.toggle()" title="Theme"
                  class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <span class="mi">{{ (theme.theme$ | async) === 'dark' ? 'light_mode' : 'dark_mode' }}</span>
          </button>

          <ng-container *ngIf="auth.me$ | async as me; else loginBtn">
            <img *ngIf="me.avatar" class="w-8 h-8 rounded-full hidden sm:block ml-1"
                 [src]="'https://cdn.discordapp.com/avatars/' + me.discord_id + '/' + me.avatar + '.png'" alt="">
            <button (click)="logout()" class="text-sm text-slate-500 hover:text-rose-500 px-2">
              <span class="mi sm:hidden">logout</span>
              <span class="hidden sm:inline">{{ 'nav.logout' | translate }}</span>
            </button>
          </ng-container>
          <ng-template #loginBtn>
            <a routerLink="/login" class="text-sm text-brand-600 hover:underline">{{ 'nav.login' | translate }}</a>
          </ng-template>
        </div>
      </div>
    </header>
  `,
})
export class HeaderComponent implements OnInit {
  constructor(
    public auth: AuthService,
    public coins: CoinsService,
    public theme: ThemeService,
    public lang: LangService,
    public basket: BasketService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.auth.me$.subscribe(me => {
      if (me) {
        this.coins.refreshMe().subscribe();
        this.basket.view().subscribe();
      }
    });
  }

  basketCount(): number {
    return this.basket.count;
  }

  logout() { this.auth.clear(); this.router.navigate(['/login']); }
}
