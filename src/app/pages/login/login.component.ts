import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { VersionService } from '../../services/version.service';

@Component({
  selector: 'app-login',
  template: `
    <div class="login-shell">
      <div class="login-watermark"><span class="mi">storefront</span></div>

      <div class="login-card">
        <div class="login-logo"><span class="mi fill">storefront</span></div>
        <h1 style="text-align:center;">{{ 'login.title' | translate }}</h1>
        <p class="muted text-sm" style="text-align:center; margin-top:6px;">{{ 'login.subtitle' | translate }}</p>

        <button class="btn discord" (click)="login()" style="margin-top:24px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 71 55" fill="currentColor">
            <path d="M60.1 4.9A58.5 58.5 0 0 0 45.6.5l-.7 1.4a52.7 52.7 0 0 1 12.1 4.1c-7.2-3.5-15.3-5.3-23.3-5.3S17.7 2.5 10.6 6a52.5 52.5 0 0 1 12.1-4L22 .5A58.5 58.5 0 0 0 7.5 4.9C-2.5 21.2-2.5 37 .5 53l.9 1.1a59 59 0 0 0 17.6 9l3.6-5a39.7 39.7 0 0 1-9.4-4.6c.8.6 1.7 1.1 2.6 1.6 8 4.3 17 6.6 26.4 6.6 9.4 0 18.3-2.3 26.4-6.6.9-.5 1.8-1 2.6-1.6a39.7 39.7 0 0 1-9.4 4.6l3.6 5a59 59 0 0 0 17.6-9l.9-1.1c3-16 3-31.8-7-48.1ZM23.7 37.2c-3.5 0-6.4-3.2-6.4-7.2 0-4 2.8-7.3 6.4-7.3 3.5 0 6.4 3.2 6.4 7.3 0 4-2.9 7.2-6.4 7.2Zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2 0-4 2.8-7.3 6.4-7.3s6.4 3.2 6.4 7.3c0 4-2.9 7.2-6.4 7.2Z"/>
          </svg>
          {{ 'login.button' | translate }}
        </button>

        <div class="row gap-2 mt-4" style="justify-content:center;">
          <span class="status-dot"></span>
          <span class="mono text-xs muted">api · online</span>
        </div>
        <p class="faint text-xs" style="text-align:center; margin-top:8px;">{{ 'login.hint' | translate }}</p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  constructor(private auth: AuthService, public version: VersionService) {}
  login() { this.auth.startLogin(); }
}
