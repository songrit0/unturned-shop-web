import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { AuthService } from './services/auth.service';
import { VersionService } from './services/version.service';

@Component({
  selector: 'app-root',
  template: `
    <ng-container *ngIf="fullscreen$ | async; else withShell">
      <router-outlet></router-outlet>
    </ng-container>
    <ng-template #withShell>
      <div class="app-shell" [class.header-collapsed]="headerCollapsed">
        <app-sidebar></app-sidebar>
        <app-header (toggleCollapse)="headerCollapsed = !headerCollapsed"></app-header>
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
  headerCollapsed = false;
  fullscreen$ = this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    map(() => this.isFullscreen(this.router.url)),
    startWith(this.isFullscreen(this.router.url)),
  );

  constructor(private auth: AuthService, private router: Router, private version: VersionService) {}

  ngOnInit() {
    // The startup probe (APP_INITIALIZER) has already run; if the API is unreachable, send the
    // user to the offline page instead of letting every request fail silently.
    if (!this.version.online) {
      this.router.navigate(['/api-error']);
      return;
    }
    this.auth.refreshMe().subscribe();
  }

  private isFullscreen(url: string): boolean {
    return url.startsWith('/login') || url.startsWith('/auth/callback') || url.startsWith('/api-error');
  }
}
