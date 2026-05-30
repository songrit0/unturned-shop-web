import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { VersionService } from '../../services/version.service';
import { LangService } from '../../services/lang.service';

/** One in-game command row. `name`/`alias`/`args` are verbatim from the plugin source (not translated);
 *  `descKey` points at an i18n key under commandRef.desc.*. */
interface PluginCommand {
  name: string;
  alias?: string;
  args?: string;
  descKey: string;
}

/** A plugin grouping. `icon` is the emoji shown beside the group; `titleKey` -> commandRef.plugin.*.
 *  Optional `noteKey` -> commandRef.note.* renders a small mechanic/limits note under the commands. */
interface PluginGroup {
  icon: string;
  titleKey: string;
  commands: PluginCommand[];
  noteKey?: string;
}

/** A server-behavior notice (no player command). `ns` is the i18n namespace: `${ns}.title` + `${ns}.points.${key}`. */
interface InfoCard {
  icon: string;
  bulletIcon: string;
  ns: string;
  points: string[];
}

@Component({
  selector: 'app-login',
  template: `
    <div class="login-shell cmdref">
      <div class="login-watermark"><span class="mi">storefront</span></div>

      <!-- Hero / CTA — Discord login preserved -->
      <div class="login-card">
        <!-- Language toggle (reuses the same LangService the header uses → persists to shop_lang) -->
        <div class="lang-toggle mono">
          <button type="button" [class.active]="(lang.lang$ | async) === 'th'" (click)="lang.set('th')">TH</button>
          <span class="lang-sep">|</span>
          <button type="button" [class.active]="(lang.lang$ | async) === 'en'" (click)="lang.set('en')">EN</button>
        </div>

        <div class="login-logo"><span class="mi fill">storefront</span></div>

        <!-- PIN login (when ?id=<steamId> present) — primary CTA, Discord stays as a fallback link -->
        <ng-container *ngIf="steamId; else discordHero">
          <h1 style="text-align:center;">{{ 'pinLogin.title' | translate }}</h1>
          <p class="muted text-sm" style="text-align:center; margin-top:6px;">
            {{ 'pinLogin.subtitle' | translate }} <span class="mono">#{{ steamId }}</span>
          </p>

          <form (ngSubmit)="submitPin()" style="margin-top:24px;">
            <label class="pin-label muted text-xs">{{ 'pinLogin.pinLabel' | translate }}</label>
            <input #pinInput
              class="input mono pin-input"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              [(ngModel)]="pin"
              name="pin"
              (ngModelChange)="onPinChange($event)"
              [disabled]="pinBusy || lockSeconds > 0"
              autofocus>

            <p class="pin-hint faint text-xs">
              <span class="mi sm">sports_esports</span>{{ 'pinLogin.noPinHint' | translate }}
            </p>

            <button class="btn primary full" type="submit"
              style="margin-top:14px;"
              [disabled]="!canSubmit">
              <span *ngIf="pinBusy" class="spinner sm"></span>
              {{ (pinBusy ? 'pinLogin.submitting' : 'pinLogin.submit') | translate }}
            </button>

            <p *ngIf="pinError" class="text-rose text-sm" style="text-align:center; margin:10px 0 0;">{{ pinError }}</p>
          </form>

          <button class="btn ghost full" (click)="login()" style="margin-top:12px;">
            <span class="mi sm">discord</span>{{ 'pinLogin.useDiscord' | translate }}
          </button>
        </ng-container>

        <ng-template #discordHero>
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
        </ng-template>
      </div>

      <!-- In-game command reference (player commands) -->
      <section class="cmdref-section">
        <div class="cmdref-head">
          <h2>{{ 'commandRef.title' | translate }}</h2>
          <p class="muted text-sm">{{ 'commandRef.subtitle' | translate }}</p>
        </div>

        <div class="cmdref-grid">
          <div *ngFor="let g of groups" class="card cmdref-card">
            <div class="cmdref-card-head">
              <span class="cmdref-icon">{{ g.icon }}</span>
              <span class="fw-7">{{ ('commandRef.plugin.' + g.titleKey) | translate }}</span>
            </div>

            <div class="cmdref-cmd" *ngFor="let c of g.commands">
              <div class="cmdref-cmd-line">
                <code class="mono cmdref-name">{{ c.name }}<span *ngIf="c.args" class="cmdref-args"> {{ c.args }}</span></code>
                <span *ngIf="c.alias" class="cmdref-alias mono">
                  {{ 'commandRef.aliasLabel' | translate }} <code>{{ c.alias }}</code>
                </span>
              </div>
              <div class="cmdref-desc muted text-sm">{{ ('commandRef.desc.' + c.descKey) | translate }}</div>
            </div>

            <p *ngIf="g.noteKey" class="cmdref-note">
              <span class="mi sm">info</span>{{ ('commandRef.note.' + g.noteKey) | translate }}
            </p>
          </div>
        </div>

        <!-- Server-behavior notices (no player command) — rendered as INFO cards, not command pills -->
        <div *ngFor="let info of infoCards" class="cmdref-info">
          <div class="cmdref-info-head">
            <span class="cmdref-icon">{{ info.icon }}</span>
            <span class="fw-7">{{ (info.ns + '.title') | translate }}</span>
            <span class="cmdref-info-tag mono">INFO</span>
          </div>
          <ul class="cmdref-info-list">
            <li *ngFor="let p of info.points">
              <span class="mi sm">{{ info.bulletIcon }}</span>{{ (info.ns + '.points.' + p) | translate }}
            </li>
          </ul>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .login-shell.cmdref { overflow-y: auto; align-items: flex-start; padding: 48px 16px 64px; }
    .login-card { position: relative; }
    .lang-toggle { position: absolute; top: 12px; right: 14px; display: flex; align-items: center;
      gap: 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; }
    .lang-toggle button { background: transparent; border: 0; padding: 2px 4px; cursor: pointer;
      color: var(--text-faint); font: inherit; }
    .lang-toggle button.active { color: var(--accent); }
    .lang-toggle button:hover { color: var(--text); }
    .lang-sep { color: var(--border); }
    .pin-label { display: block; margin-bottom: 6px; letter-spacing: 0.04em; }
    .pin-input { width: 100%; text-align: center; font-size: 28px; font-weight: 700;
      letter-spacing: 0.4em; padding: 12px; }
    .pin-hint { display: flex; align-items: center; justify-content: center; gap: 5px;
      margin: 8px 0 0; text-align: center; }
    .pin-hint .mi { font-size: 14px; }
    .cmdref-section { width: 100%; max-width: 900px; margin: 40px auto 0; }
    .cmdref-head { text-align: center; margin-bottom: 20px; }
    .cmdref-head h2 { font-size: 20px; font-weight: 700; }
    .cmdref-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .cmdref-card { padding: 18px; }
    .cmdref-card-head { display: flex; align-items: center; gap: 10px; padding-bottom: 12px;
      margin-bottom: 12px; border-bottom: 1px solid var(--border); font-size: 15px; }
    .cmdref-icon { font-size: 20px; line-height: 1; }
    .cmdref-cmd { padding: 8px 0; border-bottom: 1px dashed var(--border); }
    .cmdref-cmd:last-child { border-bottom: 0; padding-bottom: 0; }
    .cmdref-cmd-line { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .cmdref-name { background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px;
      padding: 4px 10px; font-size: 14px; font-weight: 700; color: var(--accent); }
    .cmdref-args { color: var(--text-faint); font-weight: 400; }
    .cmdref-alias { font-size: 12px; color: var(--text-faint); }
    .cmdref-alias code { background: var(--surface-2); border-radius: 4px; padding: 1px 6px; }
    .cmdref-desc { margin-top: 6px; }
    .cmdref-note { display: flex; align-items: flex-start; gap: 6px; margin: 12px 0 0;
      padding-top: 10px; border-top: 1px solid var(--border); font-size: 12px; color: var(--text-faint); }
    .cmdref-note .mi { margin-top: 1px; }
    .cmdref-info { margin-top: 16px; padding: 18px; border-radius: var(--radius);
      background: rgb(56 189 248 / 0.06); border: 1px dashed var(--info, #38bdf8); }
    .cmdref-info-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; font-size: 15px; }
    .cmdref-info-tag { margin-left: auto; font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
      color: var(--info, #38bdf8); border: 1px solid var(--info, #38bdf8); border-radius: 999px; padding: 1px 8px; }
    .cmdref-info-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .cmdref-info-list li { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: var(--muted); }
    .cmdref-info-list .mi { color: var(--info, #38bdf8); margin-top: 1px; }
  `],
})
export class LoginComponent implements OnInit, OnDestroy {
  groups: PluginGroup[] = [
    {
      icon: '🚗',
      titleKey: 'garage',
      commands: [
        { name: '/garage', descKey: 'garage' },
        { name: '/gadd', args: '<name>', alias: '/ga', descKey: 'gadd' },
        { name: '/gretrieve', args: '<name>', alias: '/gr', descKey: 'gretrieve' },
        { name: '/garagedelete', args: '<name>', descKey: 'garagedelete' },
      ],
    },
    {
      icon: '💰',
      titleKey: 'sellvault',
      commands: [
        { name: '/sell', descKey: 'sell' },
        { name: '/coins', alias: '/balance', descKey: 'coins' },
        { name: '/link', args: '<code>', descKey: 'link' },
      ],
    },
    {
      icon: '🛡️',
      titleKey: 'toolcupboard',
      commands: [
        { name: '/decay', descKey: 'decay' },
      ],
    },
    {
      icon: '🎟️',
      titleKey: 'redeemcode',
      commands: [
        { name: '/code', args: '<code>', alias: '/redeem', descKey: 'code' },
      ],
    },
    {
      icon: '🏠',
      titleKey: 'morehomes',
      commands: [
        { name: '/home', args: '[name]', descKey: 'home' },
        { name: '/homes', descKey: 'homes' },
        { name: '/renamehome', args: '<name> <new_name>', descKey: 'renamehome' },
        { name: '/destroyhome', args: '<name>', descKey: 'destroyhome' },
      ],
      noteKey: 'morehomes',
    },
    {
      icon: '🎒',
      titleKey: 'kits',
      commands: [
        { name: '/kits', descKey: 'kits' },
        { name: '/kit', args: '<name>', descKey: 'kit' },
      ],
      noteKey: 'kits',
    },
    {
      icon: '🧰',
      titleKey: 'vault',
      commands: [
        { name: '/vault', args: '[name]', descKey: 'vault' },
        { name: '/vaults', descKey: 'vaults' },
        { name: '/trash', descKey: 'trash' },
        { name: '/fixvault', descKey: 'fixvault' },
      ],
    },
    {
      icon: '🧭',
      titleKey: 'tpa',
      commands: [
        { name: '/tpa', args: '<player>', descKey: 'tpa' },
        { name: '/tpa a', descKey: 'tpaAccept' },
        { name: '/tpa d', descKey: 'tpaDeny' },
        { name: '/tpa c', descKey: 'tpaCancel' },
      ],
      noteKey: 'tpa',
    },
  ];

  /** Server-behavior notices (no player command), rendered as INFO cards below the command grid. */
  infoCards: InfoCard[] = [
    { icon: '🧹', bulletIcon: 'schedule', ns: 'autoCleanup', points: ['playerItems', 'zombieLoot', 'interval', 'mapLoot'] },
    { icon: '🩹', bulletIcon: 'healing', ns: 'knockdown', points: ['downed', 'bleedout', 'immunity', 'revive', 'revived'] },
  ];

  // --- Steam + PIN login (active only when ?id=<steamid> is present) ---
  steamId: string | null = null;
  pin = '';
  pinBusy = false;
  pinError: string | null = null;
  /** Seconds remaining in a lockout; >0 disables submit and drives the countdown. */
  lockSeconds = 0;
  private lockTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private auth: AuthService,
    public version: VersionService,
    public lang: LangService,
    private route: ActivatedRoute,
    private router: Router,
    private t: TranslateService,
  ) {}

  ngOnInit() {
    // Second login path: meowpow.shop/login?id=<SteamID64>. Only a 17-digit numeric id flips
    // the page into PIN-entry mode; anything else falls through to the normal Discord login.
    const id = this.route.snapshot.queryParamMap.get('id');
    if (id && /^\d{17}$/.test(id)) this.steamId = id;
  }

  ngOnDestroy() { this.clearLockTimer(); }

  login() { this.auth.startLogin(); }

  get canSubmit(): boolean {
    return !this.pinBusy && this.lockSeconds === 0 && /^\d{6}$/.test(this.pin);
  }

  /** Keep only digits, cap at 6, and clear a stale error as the user re-types. */
  onPinChange(v: string) {
    const digits = (v || '').replace(/\D/g, '').slice(0, 6);
    if (digits !== this.pin) this.pin = digits;
    if (this.pinError && this.lockSeconds === 0) this.pinError = null;
  }

  submitPin() {
    if (!this.steamId || !this.canSubmit) return;
    this.pinBusy = true;
    this.pinError = null;
    this.auth.loginWithPin(this.steamId, this.pin).subscribe({
      next: res => {
        // Same tail as the Discord callback: store JWT, load profile, enter the app.
        this.auth.setToken(res.token);
        this.auth.refreshMe().subscribe(() => this.router.navigate(['/']));
      },
      error: (e: HttpErrorResponse) => {
        this.pinBusy = false;
        this.pin = '';
        if (e.status === 429) {
          const retry = Number(e.error?.retry_after);
          if (Number.isFinite(retry) && retry > 0) this.startLockout(retry);
          else this.pinError = this.t.instant('pinLogin.errors.lockedGeneric');
        } else if (e.status === 401) {
          // 401 {error:'invalid'} covers BOTH wrong-pin and no-pin (anti-enumeration) — one message.
          this.pinError = this.t.instant('pinLogin.errors.invalid');
        } else {
          this.pinError = this.t.instant('pinLogin.errors.generic');
        }
      },
    });
  }

  private startLockout(seconds: number) {
    this.clearLockTimer();
    this.lockSeconds = Math.ceil(seconds);
    this.pinError = this.t.instant('pinLogin.errors.locked', { seconds: this.lockSeconds });
    this.lockTimer = setInterval(() => {
      this.lockSeconds--;
      if (this.lockSeconds <= 0) {
        this.clearLockTimer();
        this.pinError = null;
      } else {
        this.pinError = this.t.instant('pinLogin.errors.locked', { seconds: this.lockSeconds });
      }
    }, 1000);
  }

  private clearLockTimer() {
    if (this.lockTimer) { clearInterval(this.lockTimer); this.lockTimer = null; }
  }
}
