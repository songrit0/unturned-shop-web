import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { ApiUrlService } from './services/api-url.service';
import { AuthService } from './services/auth.service';
import { VersionService } from './services/version.service';

@Component({
  selector: 'app-root',
  template: `
    <!-- ponytail: shutdown notice card, delete whole block after 2026-07-20 -->
    <div class="shutdown-card">
      <div class="shutdown-row">
        <div class="shutdown-icon"><span class="mi fill">warning</span></div>
        <div class="shutdown-headline">
          <div class="shutdown-title">{{ 'shutdown.title' | translate }}</div>
          <div class="shutdown-sub">{{ 'shutdown.sub' | translate }}</div>
        </div>
        <button class="shutdown-toggle" (click)="toggleShutdown()">
          <span class="mi">{{ shutdownExpanded ? 'expand_more' : 'expand_less' }}</span>
        </button>
      </div>
      <ng-container *ngIf="shutdownExpanded">
        <div class="shutdown-body" [innerHTML]="'shutdown.body' | translate"></div>
        <div class="shutdown-vote">
          <div class="vote-q">{{ 'shutdown.vote.q' | translate }}</div>
          <div class="vote-goal">{{ 'shutdown.vote.goalInfo' | translate:{ n: votes.goal } }}</div>
          <div class="vote-row">
            <button class="vote-btn close" [class.sel]="myVote === 'close'" [disabled]="!auth.token || voteClosed || !!myVote" (click)="castVote('close')">
              {{ 'shutdown.vote.close' | translate }} <span class="vote-count">{{ votes.close }}</span>
            </button>
            <button class="vote-btn keep" [class.sel]="myVote === 'keep'" [disabled]="!auth.token || voteClosed || !!myVote" (click)="castVote('keep')">
              {{ 'shutdown.vote.keep' | translate }} <span class="vote-count">{{ votes.keep }}/{{ votes.goal }}</span>
            </button>
          </div>
          <div class="vote-status" [class.reached]="votes.keep >= votes.goal">
            {{ (votes.keep >= votes.goal ? 'shutdown.vote.reached' : 'shutdown.vote.need')
               | translate:{ n: votes.keep >= votes.goal ? votes.goal : votes.goal - votes.keep } }}
          </div>
          <div class="vote-hint" *ngIf="voteClosed">{{ 'shutdown.vote.closed' | translate }}</div>
          <div class="vote-hint" *ngIf="!voteClosed && !auth.token">{{ 'shutdown.vote.login' | translate }}</div>
        </div>
      </ng-container>
    </div>
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
  styles: [`
    /* Floating hero card (draw-banner style, red accent), fixed like .float-mascot, no animation. */
    .shutdown-card {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 2000;
      width: 460px;
      max-width: calc(100vw - 48px);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 14px;
      background: linear-gradient(100deg, color-mix(in srgb, #b3261e 16%, var(--surface)), var(--surface));
      box-shadow: 0 12px 32px rgb(0 0 0 / 0.35);
    }
    .shutdown-row { display: flex; align-items: center; gap: 14px; padding: 14px 16px; }
    .shutdown-icon {
      width: 46px; height: 46px; border-radius: 12px; flex: 0 0 auto;
      display: flex; align-items: center; justify-content: center;
      background: color-mix(in srgb, #b3261e 22%, var(--surface-2));
      color: #e2574f;
    }
    .shutdown-icon .mi { font-size: 26px; }
    .shutdown-headline { min-width: 0; }
    .shutdown-title { font-weight: 800; font-size: 16px; }
    .shutdown-sub { font-size: 12.5px; color: var(--text-muted, #9aa3b2); }
    .shutdown-toggle {
      margin-left: auto; flex: 0 0 auto;
      width: 34px; height: 34px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      background: var(--surface-2); color: var(--text);
      border: 1px solid var(--border); cursor: pointer;
    }
    .shutdown-body { padding: 0 16px 16px; font-size: 13.5px; line-height: 1.6; white-space: pre-line; }
    .shutdown-vote { padding: 0 16px 16px; border-top: 1px solid var(--border); }
    .vote-q { font-weight: 700; font-size: 13.5px; padding: 12px 0 10px; }
    .vote-row { display: flex; gap: 10px; }
    .vote-btn {
      flex: 1; padding: 10px 12px; border-radius: 10px; cursor: pointer;
      font-weight: 700; font-size: 13.5px;
      background: var(--surface-2); color: var(--text); border: 1px solid var(--border);
    }
    .vote-btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .vote-btn.sel { opacity: 1; }
    .vote-btn.close.sel { border-color: #e2574f; background: color-mix(in srgb, #b3261e 22%, var(--surface-2)); }
    .vote-btn.keep.sel { border-color: #4caf7d; background: color-mix(in srgb, #2e7d52 22%, var(--surface-2)); }
    .vote-count { opacity: 0.75; font-weight: 800; margin-left: 4px; }
    .vote-hint { font-size: 12px; color: var(--text-muted, #9aa3b2); padding-top: 8px; }
    .vote-goal { font-size: 12px; color: var(--text-muted, #9aa3b2); padding-bottom: 10px; }
    .vote-status { font-size: 12.5px; font-weight: 700; padding-top: 8px; color: #e2574f; }
    .vote-status.reached { color: #4caf7d; }
    @media (max-width: 900px) {
      .shutdown-card { left: 12px; right: 12px; bottom: 12px; width: auto; max-width: none; }
    }
  `],
})
export class AppComponent implements OnInit {
  headerCollapsed = false;
  shutdownExpanded = false;
  votes = { close: 0, keep: 0, goal: 50 };
  myVote: 'close' | 'keep' | null = null;
  // Cosmetic only — the API enforces the same deadline (end of July 19, Thai time).
  voteClosed = Date.now() >= new Date('2026-07-20T00:00:00+07:00').getTime();
  private voteLoaded = false;
  fullscreen$ = this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    map(() => this.isFullscreen(this.router.url)),
    startWith(this.isFullscreen(this.router.url)),
  );

  private readonly noAuthPaths = ['/login', '/auth/callback', '/api-error'];

  constructor(
    public auth: AuthService,
    private router: Router,
    private version: VersionService,
    private http: HttpClient,
    private apiUrl: ApiUrlService,
  ) {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      const url = this.router.url.split('?')[0];
      if (!this.noAuthPaths.some(p => url.startsWith(p)) && !this.auth.token) {
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnInit() {
    if (!this.version.online) {
      this.router.navigate(['/api-error']);
      return;
    }
    // Don't eagerly redirect here: on /auth/callback the token still lives in the URL and hasn't
    // been stored yet, so an early !token check would hijack the callback and bounce to /login.
    // The NavigationEnd subscription (runs after each navigation resolves, respects noAuthPaths)
    // handles "no token on a protected route → /login". Here we only warm the profile if signed in.
    if (this.auth.token) {
      this.auth.refreshMe().subscribe();
    }
  }

  toggleShutdown() {
    this.shutdownExpanded = !this.shutdownExpanded;
    if (this.shutdownExpanded && !this.voteLoaded) {
      this.voteLoaded = true;
      const base = `${this.apiUrl.get()}/shutdown-vote`;
      this.http.get<{ close: number; keep: number; goal: number }>(`${base}/results`)
        .subscribe(r => (this.votes = r));
      if (this.auth.token) {
        this.http.get<{ vote: 'close' | 'keep' | null }>(`${base}/me`)
          .subscribe(r => (this.myVote = r.vote));
      }
    }
  }

  castVote(vote: 'close' | 'keep') {
    if (!this.auth.token || this.voteClosed || this.myVote) return; // one vote, final
    this.http.post(`${this.apiUrl.get()}/shutdown-vote`, { vote }).subscribe({
      next: () => {
        this.votes[vote]++;
        this.myVote = vote;
      },
      // API rejects voters with no in-game name (never played) — surface its Thai message.
      error: e => alert(e?.error?.message || 'Vote failed'),
    });
  }

  private isFullscreen(url: string): boolean {
    return url.startsWith('/login') || url.startsWith('/auth/callback') || url.startsWith('/api-error');
  }
}
