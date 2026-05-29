import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { CoinsService } from '../../services/coins.service';
import { ThemeService } from '../../services/theme.service';
import { LangService } from '../../services/lang.service';
import { BasketService } from '../../services/basket.service';
import { NotificationsService, ShopNotification } from '../../services/notifications.service';
import { daysUntil } from '../../services/expiry';

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

          <!-- Notifications bell + inbox dropdown -->
          <div class="notif-wrap" (click)="$event.stopPropagation()">
            <button class="icon-btn" (click)="toggleInbox()" [title]="'notifications.title' | translate">
              <span class="mi">notifications</span>
              <span *ngIf="(notifs.unread$ | async) as n">
                <span *ngIf="n > 0" class="dot-amber"></span>
              </span>
            </button>

            <div *ngIf="inboxOpen" class="notif-dropdown">
              <div class="notif-head">
                <span class="fw-7">{{ 'notifications.title' | translate }}</span>
                <a routerLink="/codes" class="notif-link" (click)="closeInbox()">{{ 'notifications.viewAll' | translate }}</a>
              </div>

              <div *ngIf="notifLoading" class="notif-empty"><div class="spinner sm"></div></div>

              <ng-container *ngIf="!notifLoading">
                <div *ngIf="notifications.length === 0" class="notif-empty muted">
                  {{ 'notifications.empty' | translate }}
                </div>

                <button *ngFor="let n of notifications" class="notif-item"
                        [class.unread]="!n.read_at" (click)="openNotification(n)">
                  <div class="notif-thumb">
                    <img *ngIf="n.payload.image_url; else noImg" [src]="n.payload.image_url">
                    <ng-template #noImg><span class="mi sm faint">{{ iconFor(n) }}</span></ng-template>
                  </div>
                  <div class="notif-body">
                    <div class="notif-title">{{ titleFor(n) }}</div>
                    <div class="notif-text muted">{{ bodyFor(n) }}</div>
                    <div class="notif-when muted mono">{{ n.created_at | date:'short' }}</div>
                  </div>
                  <span *ngIf="!n.read_at" class="dot-amber notif-unread-dot"></span>
                </button>
              </ng-container>
            </div>
          </div>

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

    <!-- Refund code modal — reuses the inventory code-reveal pattern -->
    <div *ngIf="codeFor" class="modal-backdrop" (click)="closeCode()">
      <div class="modal-card tactical" style="max-width:480px;text-align:center" (click)="$event.stopPropagation()">
        <h3 style="display:flex;align-items:center;justify-content:center;gap:8px;margin:0 0 12px 0;font-size:18px;font-weight:700">
          <span class="mi">qr_code_2</span>{{ 'notifications.code.title' | translate }}
        </h3>
        <p class="muted" style="font-size:13px;margin:0 0 12px 0">
          {{ codeFor.payload.item_name || ('#' + codeFor.payload.item_id) }}
          <ng-container *ngIf="(codeFor.payload.amount ?? 1) > 1"> · ×{{ codeFor.payload.amount }}</ng-container>
        </p>
        <div class="code-box mono">{{ codeFor.payload.code }}</div>
        <button class="btn ghost sm" (click)="copy(codeFor.payload.code!)" style="margin-top:8px">
          <span class="mi sm">{{ copied ? 'check' : 'content_copy' }}</span>
          {{ (copied ? 'notifications.code.copied' : 'notifications.code.copy') | translate }}
        </button>
        <p *ngIf="codeExpiryText(codeFor) as ex" class="muted" style="font-size:12px;margin-top:10px">
          <span class="mi sm">schedule</span> {{ ex }}
        </p>
        <p class="muted" style="font-size:12px;margin-top:8px">
          {{ 'notifications.code.instruction' | translate:{ code: codeFor.payload.code } }}
        </p>
        <button class="btn primary" style="margin-top:16px;width:100%" (click)="closeCode()">{{ 'common.ok' | translate }}</button>
      </div>
    </div>
  `,
  styles: [`
    .notif-wrap { position: relative; display: inline-flex; }
    .notif-dropdown {
      position: absolute; top: calc(100% + 8px); right: 0; z-index: 50;
      width: 340px; max-height: 420px; overflow-y: auto;
      background: var(--surface-1); border: 1px solid var(--border);
      border-radius: 10px; box-shadow: 0 12px 32px rgb(0 0 0 / 0.35);
    }
    .notif-head { display: flex; align-items: center; justify-content: space-between;
      padding: 12px 14px; border-bottom: 1px solid var(--border); font-size: 13px; }
    .notif-link { color: var(--accent); font-size: 12px; cursor: pointer; }
    .notif-empty { padding: 28px 14px; text-align: center; font-size: 13px; }
    .notif-item { display: flex; gap: 10px; width: 100%; text-align: left;
      padding: 10px 14px; background: transparent; border: 0; border-bottom: 1px solid var(--border);
      cursor: pointer; align-items: flex-start; }
    .notif-item:hover { background: var(--surface-2); }
    .notif-item.unread { background: rgb(245 158 11 / 0.06); }
    .notif-thumb { width: 36px; height: 36px; flex: 0 0 36px; background: var(--surface-2);
      border-radius: 6px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .notif-thumb img { width: 100%; height: 100%; object-fit: contain; padding: 2px; }
    .notif-body { min-width: 0; flex: 1; }
    .notif-title { font-weight: 600; font-size: 13px; }
    .notif-text { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .notif-when { font-size: 11px; margin-top: 2px; }
    .notif-unread-dot { position: static; align-self: center; }
    .code-box { display: inline-block; padding: 12px 20px; background: var(--surface-2);
      border: 1px dashed var(--accent); border-radius: 8px; font-size: 22px; font-weight: 700;
      letter-spacing: 2px; user-select: all; }
  `],
})
export class HeaderComponent implements OnInit {
  q = '';

  inboxOpen = false;
  notifLoading = false;
  notifications: ShopNotification[] = [];
  codeFor: ShopNotification | null = null;
  copied = false;

  constructor(
    public auth: AuthService,
    public coins: CoinsService,
    public theme: ThemeService,
    public lang: LangService,
    public basket: BasketService,
    public notifs: NotificationsService,
    private t: TranslateService,
    private router: Router,
  ) { }

  ngOnInit() {
    this.auth.me$.subscribe(me => {
      if (me) {
        this.coins.refreshMe().subscribe();
        this.basket.view().subscribe();
        this.notifs.startPolling();
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

  // ---- Notifications inbox ----

  /** Close the dropdown when clicking anywhere outside it (wrapper stops propagation). */
  @HostListener('document:click')
  onDocClick() { if (this.inboxOpen) this.inboxOpen = false; }

  toggleInbox() {
    this.inboxOpen = !this.inboxOpen;
    if (this.inboxOpen) this.loadInbox();
  }
  closeInbox() { this.inboxOpen = false; }

  private loadInbox() {
    this.notifLoading = true;
    this.notifs.list(1, 20).subscribe({
      next: p => { this.notifications = p.items; this.notifLoading = false; },
      error: () => { this.notifLoading = false; },
    });
  }

  /**
   * The three P2P close kinds all mint a refund code and share the same code-reveal UI.
   * Maps a notification kind to its i18n key suffix; null means no dedicated copy (generic fallback).
   */
  private kindKey(kind: string): string | null {
    switch (kind) {
      case 'p2p_expired':      return 'p2pExpired';
      case 'p2p_cancelled':    return 'p2pCancelled';
      case 'p2p_force_closed': return 'p2pForceClosed';
      default:                 return null;
    }
  }

  /** True for kinds that carry a redeem code we can reveal in the modal. */
  private isCodeKind(n: ShopNotification): boolean {
    return this.kindKey(n.kind) !== null && !!n.payload.code;
  }

  /** Open the relevant detail for a notification and mark it read. */
  openNotification(n: ShopNotification) {
    if (!n.read_at) {
      this.notifs.markRead(n.id).subscribe({ next: () => { n.read_at = new Date().toISOString(); }, error: () => {} });
    }
    if (this.isCodeKind(n)) {
      this.codeFor = n;
      this.copied = false;
      this.inboxOpen = false;
    } else {
      // No special surface for this kind — drop the user on the codes page.
      this.inboxOpen = false;
      this.router.navigate(['/codes']);
    }
  }

  iconFor(n: ShopNotification): string {
    return this.kindKey(n.kind) ? 'qr_code_2' : 'notifications';
  }

  titleFor(n: ShopNotification): string {
    const key = this.kindKey(n.kind);
    return this.t.instant(key ? `notifications.kind.${key}.title` : 'notifications.kind.generic.title');
  }

  bodyFor(n: ShopNotification): string {
    const key = this.kindKey(n.kind);
    if (!key) return '';
    const item = n.payload.item_name || ('#' + (n.payload.item_id ?? ''));
    return this.t.instant(`notifications.kind.${key}.body`, { item });
  }

  // ---- Code modal ----

  copy(code: string) {
    if (!code) return;
    const text = `/code ${code}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => { this.copied = true; }, () => {});
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); this.copied = true; } catch {}
      document.body.removeChild(ta);
    }
  }

  closeCode() { this.codeFor = null; this.copied = false; }

  /** Countdown label for the refund code's expiry, shown in the modal. */
  codeExpiryText(n: ShopNotification): string | null {
    const d = daysUntil(n.payload.code_expires_at);
    if (d === null || d < 0) return null;
    return d === 0
      ? this.t.instant('notifications.expiresToday')
      : this.t.instant('notifications.expiresIn', { days: d });
  }
}
