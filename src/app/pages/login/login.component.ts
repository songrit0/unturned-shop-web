import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { VersionService } from '../../services/version.service';
import { LangService } from '../../services/lang.service';
import { PublicService, ServerStatus, P2pLatestEntry, DonateTotal } from '../../services/public.service';
import { PlayerStatEntry } from '../../services/player-stats.service';

/**
 * Static server details shown on the landing/login page. EDIT THESE to match your server —
 * they are display-only (the live player count / status come from the API's /public endpoints).
 */
const SERVER_INFO = {
  // NOTE: name / connect / map are NOT in Config.txt (they live in Commands.dat @Name/@Map and
  // your host's IP). Edit the three placeholders below to match your server.
  name: 'Meowpow Unturned',                 // <-- EDIT: server name (Commands.dat @Name)
  connect: '169.254.189.53:62512',       // <-- EDIT: real IP / DNS : port
  map: 'California 2',                        // <-- EDIT: map name (Commands.dat @Map)
  // The rest are pulled from Config.txt (Browser block).
  tagline: 'Generator Base Protection · Virtual Garage · Survival x3 · EN/TH',
  mode: 'Survival x3',
  discord: 'https://discord.gg/45c4XChMWN',
  icon: 'https://i.postimg.cc/DfSktnJY/64.png',
};

/** One in-game command row. `name`/`alias`/`args` are verbatim from the plugin source (not translated);
 *  `descKey` points at an i18n key under commandRef.desc.*. */
interface PluginCommand {
  name: string;
  alias?: string;
  args?: string;
  descKey: string;
  /** Verbatim example usage shown under the description (not translated), e.g. "/home bed1 · /home bed2". */
  example?: string;
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
    <div class="landing">
      <!-- ===== Sign-in card, pinned to the top-right corner ===== -->
      <aside class="login-corner">
        <div class="lang-toggle mono">
          <button type="button" [class.active]="(lang.lang$ | async) === 'th'" (click)="lang.set('th')">TH</button>
          <span class="lang-sep">|</span>
          <button type="button" [class.active]="(lang.lang$ | async) === 'en'" (click)="lang.set('en')">EN</button>
        </div>

        <div class="corner-logo"><span class="mi fill">storefront</span></div>

        <!-- PIN login (?id=<steamId> present, or after entering a Steam ID below) -->
        <ng-container *ngIf="steamId; else signinChoices">
          <h2 class="corner-title">{{ 'pinLogin.title' | translate }}</h2>
          <p class="muted text-xs" style="text-align:center; margin-top:4px;">
            <span class="mono">#{{ steamId }}</span>
            <button class="link-btn" type="button" (click)="clearSteamId()">{{ 'pinLogin.useDiscord' | translate }}</button>
          </p>

          <form (ngSubmit)="submitPin()" style="margin-top:14px;">
            <input #pinInput
              class="input mono pin-input"
              type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6"
              [(ngModel)]="pin" name="pin"
              (ngModelChange)="onPinChange($event)"
              [disabled]="pinBusy || lockSeconds > 0"
              [placeholder]="'pinLogin.pinLabel' | translate"
              autofocus>
            <p class="pin-hint faint text-xs">
              <span class="mi sm">sports_esports</span>{{ 'pinLogin.noPinHint' | translate }}
            </p>
            <button class="btn primary full" type="submit" style="margin-top:10px;" [disabled]="!canSubmit">
              <span *ngIf="pinBusy" class="spinner sm"></span>
              {{ (pinBusy ? 'pinLogin.submitting' : 'pinLogin.submit') | translate }}
            </button>
            <p *ngIf="pinError" class="text-rose text-sm" style="text-align:center; margin:8px 0 0;">{{ pinError }}</p>
          </form>
        </ng-container>

        <ng-template #signinChoices>
          <h2 class="corner-title">{{ 'login.title' | translate }}</h2>
          <p class="muted text-xs" style="text-align:center; margin-top:4px;">{{ 'login.subtitle' | translate }}</p>

          <button class="btn discord full" (click)="login()" style="margin-top:14px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 71 55" fill="currentColor">
              <path d="M60.1 4.9A58.5 58.5 0 0 0 45.6.5l-.7 1.4a52.7 52.7 0 0 1 12.1 4.1c-7.2-3.5-15.3-5.3-23.3-5.3S17.7 2.5 10.6 6a52.5 52.5 0 0 1 12.1-4L22 .5A58.5 58.5 0 0 0 7.5 4.9C-2.5 21.2-2.5 37 .5 53l.9 1.1a59 59 0 0 0 17.6 9l3.6-5a39.7 39.7 0 0 1-9.4-4.6c.8.6 1.7 1.1 2.6 1.6 8 4.3 17 6.6 26.4 6.6 9.4 0 18.3-2.3 26.4-6.6.9-.5 1.8-1 2.6-1.6a39.7 39.7 0 0 1-9.4 4.6l3.6 5a59 59 0 0 0 17.6-9l.9-1.1c3-16 3-31.8-7-48.1ZM23.7 37.2c-3.5 0-6.4-3.2-6.4-7.2 0-4 2.8-7.3 6.4-7.3 3.5 0 6.4 3.2 6.4 7.3 0 4-2.9 7.2-6.4 7.2Zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2 0-4 2.8-7.3 6.4-7.3s6.4 3.2 6.4 7.3c0 4-2.9 7.2-6.4 7.2Z"/>
            </svg>
            {{ 'login.button' | translate }}
          </button>

          <div class="corner-or"><span>{{ 'login.orSteam' | translate }}</span></div>

          <form (ngSubmit)="goToPin()">
            <input
              class="input mono"
              type="text" inputmode="numeric" maxlength="17"
              [(ngModel)]="steamIdInput" name="steamIdInput"
              (ngModelChange)="onSteamIdChange($event)"
              placeholder="Steam ID (17 digits)">
            <button class="btn secondary full" type="submit" style="margin-top:8px;" [disabled]="!steamIdValid">
              <span class="mi sm">vpn_key</span>{{ 'login.continueSteam' | translate }}
            </button>
            <p *ngIf="steamIdError" class="text-rose text-xs" style="text-align:center; margin:6px 0 0;">{{ steamIdError }}</p>
          </form>
        </ng-template>
      </aside>

      <!-- ===== Main landing content ===== -->
      <main class="landing-main">
        <!-- Server hero + live status -->
        <section class="srv-hero card">
          <div class="srv-id">
            <div class="srv-logo">
              <img *ngIf="srv.icon" [src]="srv.icon" alt="" (error)="srv.icon = ''">
              <span *ngIf="!srv.icon" class="mi fill">dns</span>
            </div>
            <div class="grow">
              <h1 class="srv-name">{{ srv.name }}</h1>
              <p class="srv-tag muted">{{ srv.tagline }}</p>
              <a *ngIf="srv.discord" class="srv-discord" [href]="srv.discord" target="_blank" rel="noopener">
                <span class="mi sm">forum</span>{{ srv.discord.replace('https://', '') }}
              </a>
            </div>
            <span class="srv-pill" [class.on]="server?.online" [class.off]="!server?.online">
              <span class="dot"></span>{{ server?.online ? ('landing.online' | translate) : ('landing.offline' | translate) }}
            </span>
          </div>

          <div class="srv-stats">
            <div class="srv-stat">
              <span class="srv-stat-icon"><span class="mi">group</span></span>
              <div>
                <div class="srv-stat-val">{{ server ? server.players : 0 }}<span class="muted">/{{ server ? server.maxPlayers : 0 }}</span></div>
                <div class="srv-stat-lbl">{{ 'landing.playersOnline' | translate }}</div>
              </div>
            </div>
            <div class="srv-stat">
              <span class="srv-stat-icon"><span class="mi">dns</span></span>
              <div>
                <div class="srv-stat-val mono sm">{{ srv.connect }}</div>
                <div class="srv-stat-lbl">{{ 'landing.connect' | translate }}</div>
              </div>
            </div>
            <div class="srv-stat">
              <span class="srv-stat-icon"><span class="mi">map</span></span>
              <div>
                <div class="srv-stat-val">{{ srv.map }}</div>
                <div class="srv-stat-lbl">{{ srv.mode }}</div>
              </div>
            </div>
            <div class="srv-stat">
              <span class="srv-stat-icon"><span class="mi">restart_alt</span></span>
              <div>
                <div class="srv-stat-val">{{ nextRestartCountdown }}</div>
                <div class="srv-stat-lbl">{{ 'landing.nextRestart' | translate }} · 06:00</div>
              </div>
            </div>
          </div>
        </section>

        <div class="landing-grid">
          <!-- Donation total -->
          <section class="card donate-card">
            <div class="card-head">
              <span class="mi" style="color:var(--amber)">volunteer_activism</span>
              <span class="fw-7">{{ 'landing.donateTitle' | translate }}</span>
            </div>
            <div class="donate-amount">
              {{ (donate?.communityTotal ?? 0) | number }} <span class="muted">/ {{ (donate?.communityGoal ?? 0) | number }} ฿</span>
            </div>
            <div class="donate-bar"><div class="donate-fill" [style.width.%]="donatePct"></div></div>
            <p class="muted text-xs" style="margin-top:6px;">{{ 'landing.donateThisMonth' | translate }} · {{ donate?.period }}</p>
          </section>

          <!-- Top players -->
          <section class="card top-card">
            <div class="card-head">
              <span class="mi" style="color:var(--accent)">leaderboard</span>
              <span class="fw-7">{{ 'landing.topPlayers' | translate }}</span>
            </div>
            <div *ngIf="loading" class="card-empty"><span class="spinner"></span></div>
            <div *ngIf="!loading && topPlayers.length === 0" class="card-empty muted text-sm">{{ 'landing.noData' | translate }}</div>
            <ol class="top-list" *ngIf="topPlayers.length">
              <li *ngFor="let p of topPlayers; let i = index">
                <span class="top-rank" [class.gold]="i===0" [class.silver]="i===1" [class.bronze]="i===2">{{ i + 1 }}</span>
                <span class="top-name">{{ p.name }}</span>
                <span class="top-kills mono">{{ p.kills | number }} <span class="muted">k</span></span>
                <span class="top-kd mono" [class.good]="p.kdRatio >= 1">{{ p.kdRatio | number:'1.2-2' }}</span>
              </li>
            </ol>
          </section>
        </div>

        <!-- Latest P2P market -->
        <section class="card market-card">
          <div class="card-head">
            <span class="mi" style="color:var(--violet, #a78bfa)">storefront</span>
            <span class="fw-7">{{ 'landing.latestMarket' | translate }}</span>
          </div>
          <div *ngIf="loading" class="card-empty"><span class="spinner"></span></div>
          <div *ngIf="!loading && p2pLatest.length === 0" class="card-empty muted text-sm">{{ 'landing.noListings' | translate }}</div>
          <div class="market-grid" *ngIf="p2pLatest.length">
            <div class="market-mini" *ngFor="let l of p2pLatest">
              <div class="market-thumb">
                <img *ngIf="l.imageUrl; else noImg" [src]="l.imageUrl" alt="">
                <ng-template #noImg><span class="mi xl">inventory_2</span></ng-template>
              </div>
              <div class="market-name">{{ l.itemName || ('#' + l.itemId) }}</div>
              <div class="market-price mono">{{ l.price | number }} <span class="muted">coins</span></div>
            </div>
          </div>
        </section>
      </main>
    </div>

    <!-- ===== In-game command reference (kept below the fold) ===== -->
    <div class="login-shell cmdref" style="padding-top:24px;">
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
              <div *ngIf="c.example" class="cmdref-example mono text-xs">
                <span class="muted">{{ 'commandRef.exampleLabel' | translate }}</span> <code>{{ c.example }}</code>
              </div>
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
    /* ===== Landing layout ===== */
    .landing { position: relative; max-width: 1100px; margin: 0 auto; padding: 28px 16px 8px; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px; }
    .card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; font-size: 15px; }
    .card-empty { display: flex; align-items: center; justify-content: center; padding: 24px 0; }

    /* Sign-in card pinned to the corner */
    .login-corner { position: fixed; top: 16px; right: 16px; z-index: 30; width: 300px;
      background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
      padding: 20px 18px 18px; box-shadow: 0 12px 40px rgb(0 0 0 / 0.28); }
    .corner-logo { width: 46px; height: 46px; margin: 0 auto 8px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center; background: var(--surface-2);
      color: var(--accent); }
    .corner-logo .mi { font-size: 26px; }
    .corner-title { text-align: center; font-size: 17px; font-weight: 700; }
    .corner-or { display: flex; align-items: center; gap: 10px; margin: 14px 0 10px; color: var(--text-faint); font-size: 11px; }
    .corner-or::before, .corner-or::after { content: ''; flex: 1; height: 1px; background: var(--border); }
    .btn.full { width: 100%; justify-content: center; }
    .link-btn { background: none; border: 0; padding: 0 0 0 6px; color: var(--accent); cursor: pointer; font: inherit; font-size: 11px; }
    .pin-input { width: 100%; text-align: center; font-size: 22px; font-weight: 700; letter-spacing: 0.35em; padding: 10px; }
    .pin-hint { display: flex; align-items: center; justify-content: center; gap: 5px; margin: 8px 0 0; text-align: center; }
    .pin-hint .mi { font-size: 14px; }

    /* keep main content clear of the corner card on wide screens */
    .landing-main { display: flex; flex-direction: column; gap: 16px; padding-top: 4px; }
    @media (min-width: 760px) { .landing-main { padding-right: 324px; } }

    /* Server hero */
    .srv-hero { padding: 22px; }
    .srv-id { display: flex; align-items: center; gap: 14px; }
    .srv-logo { width: 52px; height: 52px; border-radius: 14px; flex: 0 0 auto;
      display: flex; align-items: center; justify-content: center;
      background: color-mix(in srgb, var(--accent) 14%, var(--surface-2)); color: var(--accent); }
    .srv-logo .mi { font-size: 30px; }
    .srv-logo img { width: 100%; height: 100%; object-fit: cover; border-radius: 14px; }
    .srv-name { font-size: 24px; font-weight: 800; line-height: 1.1; }
    .srv-tag { font-size: 13px; margin-top: 2px; }
    .srv-discord { display: inline-flex; align-items: center; gap: 5px; margin-top: 6px;
      font-size: 12px; font-weight: 600; color: #5865f2; text-decoration: none; }
    .srv-discord:hover { text-decoration: underline; }
    .srv-pill { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; flex: 0 0 auto;
      font-size: 12px; font-weight: 700; padding: 5px 12px; border-radius: 999px; }
    .srv-pill .dot { width: 8px; height: 8px; border-radius: 50%; }
    .srv-pill.on { color: var(--emerald); background: color-mix(in srgb, var(--emerald) 14%, transparent); }
    .srv-pill.on .dot { background: var(--emerald); box-shadow: 0 0 0 3px color-mix(in srgb, var(--emerald) 30%, transparent); }
    .srv-pill.off { color: var(--rose); background: color-mix(in srgb, var(--rose) 14%, transparent); }
    .srv-pill.off .dot { background: var(--rose); }
    .srv-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-top: 18px; }
    .srv-stat { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 10px; background: var(--surface-2); }
    .srv-stat-icon { width: 34px; height: 34px; border-radius: 8px; flex: 0 0 auto;
      display: flex; align-items: center; justify-content: center; background: var(--surface); color: var(--accent); }
    .srv-stat-val { font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .srv-stat-val.sm { font-size: 13px; }
    .srv-stat-lbl { font-size: 11px; color: var(--muted); }

    .landing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 640px) { .landing-grid { grid-template-columns: 1fr; } }

    /* Donate */
    .donate-amount { font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; }
    .donate-bar { height: 8px; border-radius: 999px; background: var(--surface-2); overflow: hidden; margin-top: 10px; }
    .donate-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--amber), #f59e0b); transition: width .4s ease; }

    /* Top players */
    .top-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
    .top-list li { display: grid; grid-template-columns: 28px 1fr auto auto; gap: 10px; align-items: center;
      padding: 7px 8px; border-radius: 8px; font-size: 13px; }
    .top-list li:hover { background: var(--surface-2); }
    .top-rank { font-weight: 700; text-align: center; }
    .top-rank.gold { color: #f5c518; } .top-rank.silver { color: #aaa; } .top-rank.bronze { color: #cd7f32; }
    .top-name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .top-kd { color: var(--muted); } .top-kd.good { color: var(--emerald); }

    /* Market */
    .market-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; }
    .market-mini { background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
    .market-thumb { aspect-ratio: 1; background: var(--surface); border-radius: 8px; display: flex;
      align-items: center; justify-content: center; overflow: hidden; margin-bottom: 8px; color: var(--text-faint); }
    .market-thumb img { width: 100%; height: 100%; object-fit: contain; padding: 8px; }
    .market-name { font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .market-price { font-weight: 700; margin-top: 2px; font-size: 13px; }

    @media (max-width: 760px) {
      .login-corner { position: static; width: auto; margin: 0 auto 18px; max-width: 360px; box-shadow: none; }
      .landing { padding-top: 16px; }
    }

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
    .cmdref-example { margin-top: 5px; color: var(--text-faint); }
    .cmdref-example code { background: var(--surface-2); border-radius: 4px; padding: 1px 6px; color: var(--accent); }
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
        { name: '/home', args: '[name]', descKey: 'home', example: '/home bed1 · /home bed2' },
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

  /** Static, editable server details (see SERVER_INFO at top of file). */
  srv = SERVER_INFO;

  // --- Landing data (public, no auth) ---
  server: ServerStatus | null = null;
  p2pLatest: P2pLatestEntry[] = [];
  donate: DonateTotal | null = null;
  topPlayers: PlayerStatEntry[] = [];
  loading = true;

  /** Countdown to the next daily restart — fixed at 06:00 Thailand time (UTC+7). */
  nextRestartCountdown = '';
  private restartTimer: ReturnType<typeof setInterval> | null = null;

  // --- Steam + PIN login (active only when ?id=<steamid> is present or entered) ---
  steamId: string | null = null;
  steamIdInput = '';
  steamIdError: string | null = null;
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
    private pub: PublicService,
  ) {}

  ngOnInit() {
    // Second login path: meowpow.shop/login?id=<SteamID64>. Only a 17-digit numeric id flips
    // the page into PIN-entry mode; anything else falls through to the normal Discord login.
    const id = this.route.snapshot.queryParamMap.get('id');
    if (id && /^\d{17}$/.test(id)) this.steamId = id;

    // Fixed daily restart at 06:00 Thai time — tick the countdown once a minute.
    this.updateNextRestart();
    this.restartTimer = setInterval(() => this.updateNextRestart(), 60_000);

    // Public landing data — degrade silently if the API is unreachable (login still works).
    this.pub.landing(8, 10).subscribe({
      next: d => {
        this.server = d.server;
        this.p2pLatest = d.p2pLatest;
        this.donate = d.donateTotal;
        this.topPlayers = d.topPlayers;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  ngOnDestroy() {
    this.clearLockTimer();
    if (this.restartTimer) { clearInterval(this.restartTimer); this.restartTimer = null; }
  }

  login() { this.auth.startLogin(); }

  /** Real UTC instant of the next 06:00 Asia/Bangkok (UTC+7), regardless of the viewer's timezone. */
  private nextRestartThai(): Date {
    const THAI_MS = 7 * 60 * 60 * 1000;
    const now = Date.now();
    const thaiNow = new Date(now + THAI_MS); // shift so UTC getters read Thai wall-clock
    let targetThai = Date.UTC(
      thaiNow.getUTCFullYear(), thaiNow.getUTCMonth(), thaiNow.getUTCDate(), 6, 0, 0,
    );
    if (targetThai <= thaiNow.getTime()) targetThai += 86_400_000; // already past 06:00 → tomorrow
    return new Date(targetThai - THAI_MS); // back to real UTC
  }

  /** Recompute the "Xh Ym" countdown to the next 06:00 Thai restart. */
  private updateNextRestart() {
    const diffMs = this.nextRestartThai().getTime() - Date.now();
    const totalMin = Math.max(0, Math.floor(diffMs / 60_000));
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    this.nextRestartCountdown = h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  /** Donation progress as a clamped percentage for the bar width. */
  get donatePct(): number {
    if (!this.donate || this.donate.communityGoal <= 0) return 0;
    return Math.min(100, (this.donate.communityTotal / this.donate.communityGoal) * 100);
  }

  /** Format an ISO timestamp to the user's local time (HH:mm). */
  formatTime(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // --- Steam ID entry → PIN mode ---
  onSteamIdChange(v: string) {
    const digits = (v || '').replace(/\D/g, '').slice(0, 17);
    if (digits !== this.steamIdInput) this.steamIdInput = digits;
    if (this.steamIdError) this.steamIdError = null;
  }

  get steamIdValid(): boolean { return /^\d{17}$/.test(this.steamIdInput); }

  /** Flip into PIN-entry mode for the typed Steam ID (mirrors the ?id= deep-link path). */
  goToPin() {
    if (!this.steamIdValid) {
      this.steamIdError = this.t.instant('login.steamIdInvalid');
      return;
    }
    this.steamId = this.steamIdInput;
    this.pin = '';
    this.pinError = null;
  }

  /** Back out of PIN mode to the sign-in choices. */
  clearSteamId() {
    this.steamId = null;
    this.pin = '';
    this.pinError = null;
    this.clearLockTimer();
    this.lockSeconds = 0;
  }

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
        this.auth.refreshMe().subscribe(() => this.router.navigate(['/home']));
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
