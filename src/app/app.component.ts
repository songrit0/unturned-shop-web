import { Component } from '@angular/core';

// ponytail: site is shut down (July 20, 2026) — whole app replaced by this static
// notice. No router, no auth, no API. Restore from git history if it ever comes back.
@Component({
  selector: 'app-root',
  template: `
    <div class="shutdown-page">
      <div class="shutdown-card">
        <div class="shutdown-icon"><span class="mi fill">warning</span></div>
        <div class="shutdown-title">{{ 'shutdown.title' | translate }}</div>
        <div class="shutdown-sub">{{ 'shutdown.sub' | translate }}</div>
        <div class="shutdown-body" [innerHTML]="'shutdown.body' | translate"></div>
        <div class="shutdown-closed">{{ 'shutdown.vote.closed' | translate }}</div>
      </div>
    </div>
  `,
  styles: [`
    .shutdown-page {
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
    }
    .shutdown-card {
      width: 620px; max-width: 100%;
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 16px;
      background: linear-gradient(100deg, color-mix(in srgb, #b3261e 16%, var(--surface)), var(--surface));
      box-shadow: 0 12px 32px rgb(0 0 0 / 0.35);
      padding: 32px 28px;
      text-align: center;
    }
    .shutdown-icon {
      width: 64px; height: 64px; border-radius: 16px; margin: 0 auto 16px;
      display: flex; align-items: center; justify-content: center;
      background: color-mix(in srgb, #b3261e 22%, var(--surface-2));
      color: #e2574f;
    }
    .shutdown-icon .mi { font-size: 36px; }
    .shutdown-title { font-weight: 800; font-size: 22px; }
    .shutdown-sub { font-size: 13.5px; color: var(--text-muted, #9aa3b2); margin-top: 6px; }
    .shutdown-body {
      margin-top: 20px; font-size: 14px; line-height: 1.7;
      white-space: pre-line; text-align: left;
    }
    .shutdown-closed {
      margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border);
      font-size: 12.5px; color: var(--text-muted, #9aa3b2);
    }
  `],
})
export class AppComponent {}
