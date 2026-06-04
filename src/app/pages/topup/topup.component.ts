import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { TopupCreated, TopupRow, TopupService, TopupState } from '../../services/topup.service';

type Phase = 'form' | 'pay' | 'success' | 'expired';

@Component({
  selector: 'app-topup',
  template: `
    <div class="page">
      <div class="page-header">
        <h1><span class="h-icon amber"><span class="mi fill">account_balance_wallet</span></span>{{ 'topup.title' | translate }}</h1>
        <div class="page-actions">
          <div class="vcoin-pill" [title]="'topup.vcoinsTip' | translate">
            <span class="mi fill">toll</span>
            <div class="col" style="gap:0;line-height:1">
              <span class="mono" style="font-weight:700;font-size:15px">{{ (topup.balance$ | async) ?? '—' }}</span>
              <span class="muted" style="font-size:10px;letter-spacing:.06em">{{ 'topup.vcoins' | translate | uppercase }}</span>
            </div>
          </div>
        </div>
      </div>

      <p class="muted" style="margin:-4px 0 16px 0;font-size:13px;max-width:560px">{{ 'topup.intro' | translate }}</p>

      <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px;align-items:start">
        <!-- ==== Left: form / QR / result ==== -->
        <div class="card tactical">
          <!-- Phase: amount form -->
          <ng-container *ngIf="phase === 'form'">
            <div class="card-title"><span class="mi">payments</span>{{ 'topup.formTitle' | translate }}</div>
            <label style="display:block;margin-top:12px">
              <span class="muted" style="font-size:12px">{{ 'topup.amountLabel' | translate }}</span>
              <input type="number" min="1" step="1" class="input mono" style="margin-top:4px"
                     [(ngModel)]="baht" (ngModelChange)="onAmountChange()" [placeholder]="'topup.amountPlaceholder' | translate">
            </label>
            <div class="convert mono">
              <span class="mi sm">swap_horiz</span>
              <span>= {{ vcoinPreview | number }} {{ 'topup.vcoins' | translate }}</span>
            </div>
            <p *ngIf="createError" style="color:var(--rose);font-size:13px;margin:8px 0 0 0">{{ createError | translate }}</p>
            <button class="btn primary" style="width:100%;margin-top:16px" [disabled]="!canCreate || creating" (click)="create()">
              <span class="mi sm">qr_code_2</span>
              {{ (creating ? 'common.saving' : 'topup.createBtn') | translate }}
            </button>
          </ng-container>

          <!-- Phase: pay (QR + exact amount + countdown) -->
          <ng-container *ngIf="phase === 'pay' && created">
            <div class="card-title"><span class="mi">qr_code_2</span>{{ 'topup.payTitle' | translate }}</div>

            <div class="qr-wrap">
              <qrcode [qrdata]="created.qr_code" [width]="220" [margin]="2" [errorCorrectionLevel]="'M'"
                      [alt]="'topup.payTitle' | translate"></qrcode>
            </div>

            <div class="exact">
              <div class="muted" style="font-size:12px">{{ 'topup.exactAmountLabel' | translate }}</div>
              <div class="exact-amt mono">{{ created.unique_amount | number:'1.2-2' }} <span class="cur">{{ 'topup.baht' | translate }}</span></div>
              <div class="exact-warn">
                <span class="mi sm">warning</span>
                <span>{{ 'topup.exactWarn' | translate }}</span>
              </div>
            </div>

            <div class="metarow mono">
              <div><span class="muted">{{ 'topup.promptpayId' | translate }}:</span> {{ created.promptpay_id }}</div>
              <div><span class="muted">{{ 'topup.ref' | translate }}:</span> {{ created.ref }}</div>
              <div><span class="muted">{{ 'topup.credits' | translate }}:</span> {{ created.vcoins | number }} {{ 'topup.vcoins' | translate }}</div>
            </div>

            <div class="countdown" [class.danger]="secondsLeft <= 60">
              <span class="mi sm">schedule</span>
              <ng-container *ngIf="secondsLeft > 0; else expiringSoon">
                {{ 'topup.expiresIn' | translate }} <span class="mono" style="font-weight:700">{{ countdownText }}</span>
              </ng-container>
              <ng-template #expiringSoon>{{ 'topup.expiring' | translate }}</ng-template>
            </div>

            <div class="poll-status muted">
              <span class="spinner sm"></span>
              {{ (currentStatus === 'confirmed' ? 'topup.statusConfirmed' : 'topup.statusWaiting') | translate }}
            </div>

            <button class="btn secondary" style="width:100%;margin-top:12px" (click)="reset()">
              {{ 'topup.cancelBtn' | translate }}
            </button>
          </ng-container>

          <!-- Phase: success -->
          <ng-container *ngIf="phase === 'success'">
            <div class="result emerald">
              <span class="mi xxl">check_circle</span>
              <h2>{{ 'topup.successTitle' | translate }}</h2>
              <p class="muted">{{ 'topup.successBody' | translate:{ vcoins: (creditedVcoins | number) } }}</p>
              <div class="balance-box">
                <span class="muted" style="font-size:12px">{{ 'topup.newBalance' | translate }}</span>
                <div class="mono" style="font-size:28px;font-weight:700">
                  {{ (topup.balance$ | async) ?? '—' }} <span class="muted" style="font-size:14px">{{ 'topup.vcoins' | translate }}</span>
                </div>
              </div>
            </div>
            <button class="btn primary" style="width:100%;margin-top:8px" (click)="reset()">{{ 'topup.again' | translate }}</button>
          </ng-container>

          <!-- Phase: expired / cancelled -->
          <ng-container *ngIf="phase === 'expired'">
            <div class="result rose">
              <span class="mi xxl">timer_off</span>
              <h2>{{ 'topup.expiredTitle' | translate }}</h2>
              <p class="muted">{{ 'topup.expiredBody' | translate }}</p>
            </div>
            <button class="btn primary" style="width:100%;margin-top:8px" (click)="reset()">{{ 'topup.tryAgain' | translate }}</button>
          </ng-container>
        </div>

        <!-- ==== Right: history ==== -->
        <div class="card flush">
          <div class="card-title" style="padding:16px 18px 0"><span class="mi">history</span>{{ 'topup.historyTitle' | translate }}</div>
          <div *ngIf="historyLoading" style="text-align:center;padding:32px 0"><div class="spinner"></div></div>
          <ng-container *ngIf="!historyLoading">
            <div *ngIf="history.length === 0" class="empty" style="padding:32px">{{ 'topup.historyEmpty' | translate }}</div>
            <div *ngFor="let h of history" class="activity-row">
              <div class="ico" [class.emerald]="h.status === 'credited'" [class.rose]="h.status === 'expired' || h.status === 'cancelled'">
                <span class="mi sm">{{ statusIcon(h.status) }}</span>
              </div>
              <div class="grow" style="min-width:0">
                <div class="a-name">{{ h.vcoins | number }} {{ 'topup.vcoins' | translate }} <span class="muted mono" style="font-size:11px">· {{ h.unique_amount | number:'1.2-2' }} {{ 'topup.baht' | translate }}</span></div>
                <div class="a-src mono" style="font-size:11px">
                  <span class="badge" [class.emerald]="h.status === 'credited'" [class.rose]="h.status === 'expired' || h.status === 'cancelled'">{{ ('topup.status.' + h.status) | translate }}</span>
                  <span class="muted">{{ (h.credited_at || h.created_at || h.expires_at) | date:'short' }}</span>
                </div>
              </div>
            </div>
          </ng-container>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .vcoin-pill { display:inline-flex; align-items:center; gap:8px; padding:6px 12px;
      background:var(--surface-2); border:1px solid var(--amber); border-radius:999px; color:var(--amber); }
    .vcoin-pill .mi { color:var(--amber); }
    .convert { display:flex; align-items:center; gap:6px; margin-top:10px; font-size:16px; font-weight:700; color:var(--amber); }
    .qr-wrap { display:flex; justify-content:center; padding:16px; margin-top:12px;
      background:#fff; border-radius:10px; }
    .qr-wrap ::ng-deep img, .qr-wrap ::ng-deep canvas { display:block; }
    .exact { text-align:center; margin-top:16px; }
    .exact-amt { font-size:34px; font-weight:800; line-height:1.1; }
    .exact-amt .cur { font-size:16px; font-weight:600; color:var(--muted); }
    .exact-warn { display:flex; align-items:center; justify-content:center; gap:6px; margin-top:6px;
      font-size:12px; font-weight:600; color:var(--amber); }
    .metarow { margin-top:14px; display:flex; flex-direction:column; gap:3px; font-size:12px;
      padding:10px 12px; background:var(--surface-2); border-radius:8px; word-break:break-all; }
    .countdown { display:flex; align-items:center; gap:6px; justify-content:center; margin-top:14px;
      font-size:13px; color:var(--text); }
    .countdown.danger { color:var(--rose); }
    .poll-status { display:flex; align-items:center; gap:8px; justify-content:center; margin-top:10px; font-size:12px; }
    .result { text-align:center; padding:16px 8px; }
    .result .mi { display:block; margin:0 auto; }
    .result.emerald .mi { color:var(--emerald); }
    .result.rose .mi { color:var(--rose); }
    .result h2 { margin:8px 0 4px; font-size:18px; font-weight:700; }
    .balance-box { margin-top:14px; padding:12px; background:var(--surface-2); border-radius:8px; }
    .spinner.sm { width:14px; height:14px; border-width:2px; }
  `],
})
export class TopupComponent implements OnInit, OnDestroy {
  // 1 baht = 1 Vcoin display rate; the authoritative figure comes back as `vcoins` on create.
  private static readonly RATE = 1;

  phase: Phase = 'form';
  baht: number | null = null;
  vcoinPreview = 0;
  creating = false;
  createError: string | null = null;

  created: TopupCreated | null = null;
  currentStatus: TopupState['status'] = 'pending';
  creditedVcoins = 0;

  secondsLeft = 0;
  countdownText = '';

  history: TopupRow[] = [];
  historyLoading = true;

  private pollSub?: Subscription;
  private tickSub?: Subscription;

  constructor(public topup: TopupService) {}

  ngOnInit() {
    this.topup.vcoinsMe().subscribe({ next: () => {}, error: () => {} });
    this.loadHistory();
  }

  ngOnDestroy() {
    this.stopTimers();
  }

  // ---- Form ----
  get canCreate(): boolean {
    return !!this.baht && Number.isFinite(this.baht) && this.baht >= 1;
  }

  onAmountChange() {
    const v = Math.floor(Number(this.baht) || 0);
    this.vcoinPreview = v >= 1 ? v * TopupComponent.RATE : 0;
  }

  create() {
    if (!this.canCreate) return;
    this.creating = true;
    this.createError = null;
    const amount = Math.floor(Number(this.baht));
    this.topup.create(amount).subscribe({
      next: c => {
        this.creating = false;
        this.created = c;
        this.currentStatus = c.status;
        this.phase = 'pay';
        this.startCountdown();
        this.startPolling();
      },
      error: e => {
        this.creating = false;
        this.createError = e?.error?.message || 'topup.errors.createFail';
      },
    });
  }

  // ---- Polling ----
  private startPolling() {
    this.pollSub?.unsubscribe();
    // Poll every 3s while pending/confirmed; stop on any terminal status.
    this.pollSub = interval(3000).subscribe(() => {
      if (!this.created) return;
      this.topup.status(this.created.ref).subscribe({
        next: s => this.applyStatus(s),
        error: () => {},
      });
    });
  }

  private applyStatus(s: TopupState) {
    this.currentStatus = s.status;
    if (s.status === 'credited') {
      this.creditedVcoins = s.vcoins;
      this.phase = 'success';
      this.stopTimers();
      // Refresh the shared balance so the header + this page update.
      this.topup.vcoinsMe().subscribe({ next: () => {}, error: () => {} });
      this.loadHistory();
    } else if (s.status === 'expired' || s.status === 'cancelled') {
      this.phase = 'expired';
      this.stopTimers();
      this.loadHistory();
    }
    // pending / confirmed -> keep polling
  }

  // ---- Countdown ----
  private startCountdown() {
    this.tickSub?.unsubscribe();
    this.tick();
    this.tickSub = interval(1000).subscribe(() => this.tick());
  }

  private tick() {
    if (!this.created) return;
    const ms = Date.parse(this.created.expires_at) - Date.now();
    this.secondsLeft = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(this.secondsLeft / 60);
    const sec = this.secondsLeft % 60;
    this.countdownText = `${m}:${String(sec).padStart(2, '0')}`;
    // When the client-side window elapses, flip to expired even if a poll hasn't landed yet.
    if (this.secondsLeft <= 0 && this.phase === 'pay') {
      this.phase = 'expired';
      this.stopTimers();
    }
  }

  private stopTimers() {
    this.pollSub?.unsubscribe();
    this.tickSub?.unsubscribe();
    this.pollSub = undefined;
    this.tickSub = undefined;
  }

  // ---- History ----
  private loadHistory() {
    this.historyLoading = true;
    this.topup.history(1, 10).subscribe({
      next: p => { this.history = p.items; this.historyLoading = false; },
      error: () => { this.historyLoading = false; },
    });
  }

  statusIcon(s: TopupState['status']): string {
    switch (s) {
      case 'credited':  return 'check_circle';
      case 'expired':   return 'timer_off';
      case 'cancelled': return 'cancel';
      case 'confirmed': return 'hourglass_top';
      default:          return 'schedule';
    }
  }

  // ---- Reset ----
  reset() {
    this.stopTimers();
    this.phase = 'form';
    this.created = null;
    this.currentStatus = 'pending';
    this.creditedVcoins = 0;
    this.createError = null;
    this.baht = null;
    this.vcoinPreview = 0;
  }
}
