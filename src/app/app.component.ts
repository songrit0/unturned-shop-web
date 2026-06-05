import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  template: `
    <ng-container *ngIf="fullscreen$ | async; else withShell">
      <router-outlet></router-outlet>
    </ng-container>
    <ng-template #withShell>
      <div class="app-shell">
        <app-sidebar></app-sidebar>
        <app-header></app-header>
        <main class="app-main">
          <router-outlet></router-outlet>
        </main>

        <!-- Floating decorative mascots (purely cosmetic, click-through) -->
        <img class="float-mascot coin" src="assets/coins/coin.png" alt="" aria-hidden="true">
        <img class="float-mascot meow" src="assets/coins/meowcoin.png" alt="" aria-hidden="true">
      </div>
      <app-basket-drawer></app-basket-drawer>
    </ng-template>
  `,
})
export class AppComponent implements OnInit {
  fullscreen$ = this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    map(() => this.isFullscreen(this.router.url)),
    startWith(this.isFullscreen(this.router.url)),
  );

  constructor(private auth: AuthService, private router: Router) {}
  ngOnInit() { this.auth.refreshMe().subscribe(); }

  private isFullscreen(url: string): boolean {
    return url.startsWith('/login') || url.startsWith('/auth/callback');
  }
}
