import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import {
  DonateProgress,
  DonateTier,
  ThunderVerifyReason,
  TopupCreated,
  TopupProvider,
  TopupProviderOption,
  TopupRow,
  TopupService,
  TopupState,
} from '../../services/topup.service';

type Phase = 'form' | 'pay' | 'success' | 'expired';

// Client-side slip cap (bytes). The API may enforce its own limit too.
const MAX_SLIP_BYTES = 4 * 1024 * 1024;
const ALLOWED_SLIP_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

@Component({
  selector: 'app-topup',
  template: `
    <div class="page">
      <div class="page-header">
        <h1><span class="h-icon meow"><span class="mi fill">volunteer_activism</span></span>{{ 'topup.title' | translate }}</h1>
        <div class="page-actions" *ngIf="hasAccess">
          <div class="meow-pill" [title]="'topup.meowcoinsTip' | translate">
            <img class="coin-img meow" src="assets/coins/meowcoin.png" alt="">
            <div class="col" style="gap:0;line-height:1">
              <span class="mono" style="font-weight:700;font-size:15px">{{ (topup.balance$ | async) ?? '—' }}</span>
              <span class="muted" style="font-size:10px;letter-spacing:.06em">{{ 'topup.meowcoins' | translate | uppercase }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- "Closed" notice: donations are open to all now, so the only blocking state left is
           "no payment providers enabled" (providers: []). -->
      <div *ngIf="notice" class="card tactical notice">
        <span class="mi xxl" style="color:var(--muted)">pause_circle</span>
        <h2>{{ 'topup.closedTitle' | translate }}</h2>
        <p class="muted">{{ 'topup.closedBody' | translate }}</p>
        <a routerLink="/" class="btn primary"><span class="mi sm">home</span>{{ 'topup.adminOnlyHome' | translate }}</a>
      </div>

      <ng-container *ngIf="!notice">
      <p class="muted" style="margin:-4px 0 16px 0;font-size:13px;max-width:560px">{{ 'topup.intro' | translate }}</p>

      <!-- ==== Community fundraising progress ==== -->
      <div *ngIf="progress" class="card tactical community" style="margin-bottom:16px">
        <div class="row between wrap" style="align-items:flex-end;gap:8px">
          <div class="card-title" style="margin:0"><span class="mi">groups</span>{{ 'donate.communityTitle' | translate }}</div>
          <div class="mono" style="font-size:13px;color:var(--meowcoin);font-weight:700">
            <img class="coin-img meow" src="assets/coins/meowcoin.png" alt="" style="width:16px;height:16px;vertical-align:-3px">
            {{ progress.community_total | number }} / {{ progress.community_goal | number }} {{ 'topup.baht' | translate }}
          </div>
        </div>
        <div class="bar" style="margin-top:10px"><div class="bar-fill" [style.width.%]="communityPct"></div></div>
        <div class="muted" style="font-size:12px;margin-top:6px">
          {{ 'donate.userDonated' | translate:{ donated: (progress.user_donated | number), cap: (progress.user_cap | number) } }}
        </div>
      </div>

      <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px;align-items:start">
        <!-- ==== Left: form / QR / result ==== -->
        <div class="card tactical">
          <!-- Phase: amount form -->
          <ng-container *ngIf="phase === 'form'">
            <div class="card-title"><span class="mi">payments</span>{{ 'topup.formTitle' | translate }}</div>

            <!-- Provider picker: only shown when more than one provider is enabled. -->
            <div *ngIf="providers.length > 1" style="margin-top:12px">
              <span class="muted" style="font-size:12px">{{ 'topup.providerLabel' | translate }}</span>
              <div class="seg" style="margin-top:4px">
                <button *ngFor="let p of providers" type="button" class="seg-btn"
                        [class.active]="provider === p.key" (click)="provider = p.key">
                  <span class="mi sm">{{ providerIcon(p.key) }}</span> {{ p.label }}
                </button>
              </div>
            </div>

            <!-- Cap reached: monthly per-user limit hit; block input + the create button. -->
            <div *ngIf="capReached" class="cap-note">
              <span class="mi sm">block</span> {{ 'donate.capReached' | translate }}
            </div>

            <label style="display:block;margin-top:12px">
              <span class="muted" style="font-size:12px">{{ 'topup.amountLabel' | translate }}</span>
              <input type="number" min="1" step="1" [max]="maxAllowed" class="input mono" style="margin-top:4px"
                     [disabled]="capReached"
                     [(ngModel)]="baht" (ngModelChange)="onAmountChange()" [placeholder]="'topup.amountPlaceholder' | translate">
            </label>
            <div *ngIf="!capReached && remaining !== null" class="muted" style="font-size:11px;margin-top:4px">
              {{ 'donate.remainingHint' | translate:{ remaining: (remaining | number) } }}
            </div>
            <div class="convert mono">
              <span class="mi sm">swap_horiz</span>
              <span>= {{ meowcoinPreview | number }} {{ 'topup.meowcoins' | translate }}</span>
            </div>
            <p *ngIf="amountError" style="color:var(--rose);font-size:13px;margin:8px 0 0 0">{{ amountError | translate }}</p>
            <p *ngIf="createError" style="color:var(--rose);font-size:13px;margin:8px 0 0 0">{{ createError | translate }}</p>
            <button class="btn primary" style="width:100%;margin-top:16px" [disabled]="!canCreate || creating" (click)="create()">
              <span class="mi sm">qr_code_2</span>
              {{ (creating ? 'common.saving' : 'topup.createBtn') | translate }}
            </button>
          </ng-container>

          <!-- Phase: pay — PlernPay (QR + exact amount + countdown + polling) -->
          <ng-container *ngIf="phase === 'pay' && created && created.provider === 'plernpay'">
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
              <div><span class="muted">{{ 'topup.credits' | translate }}:</span> {{ created.meowcoins | number }} {{ 'topup.meowcoins' | translate }}</div>
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

          <!-- Phase: pay — Thunder (QR + transfer, then upload slip to verify) -->
          <ng-container *ngIf="phase === 'pay' && created && created.provider === 'thunder'">
            <div class="card-title"><span class="mi">qr_code_2</span>{{ 'topup.payTitle' | translate }}</div>

            <div class="qr-wrap">
              <qrcode [qrdata]="created.qr_code" [width]="220" [margin]="2" [errorCorrectionLevel]="'M'"
                      [alt]="'topup.payTitle' | translate"></qrcode>
            </div>

            <div class="exact">
              <div class="muted" style="font-size:12px">{{ 'topup.amountToTransfer' | translate }}</div>
              <div class="exact-amt mono">{{ created.amount | number:'1.2-2' }} <span class="cur">{{ 'topup.baht' | translate }}</span></div>
            </div>

            <div class="metarow mono">
              <div><span class="muted">{{ 'topup.receiver' | translate }}:</span> {{ created.receiver_name }}</div>
              <div><span class="muted">{{ 'topup.promptpayId' | translate }}:</span> {{ created.promptpay_id }}</div>
              <div><span class="muted">{{ 'topup.ref' | translate }}:</span> {{ created.ref }}</div>
              <div><span class="muted">{{ 'topup.credits' | translate }}:</span> {{ created.meowcoins | number }} {{ 'topup.meowcoins' | translate }}</div>
            </div>

            <!-- Steps -->
            <ol class="steps">
              <li>{{ 'topup.thunder.step1' | translate }}</li>
              <li>{{ 'topup.thunder.step2' | translate }}</li>
            </ol>

            <!-- Slip upload -->
            <div class="slip">
              <input #slipInput type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden (change)="onSlipSelected($event)">
              <button type="button" class="btn secondary" style="width:100%" [disabled]="verifying" (click)="slipInput.click()">
                <span class="mi sm">upload_file</span> {{ (slipName ? 'topup.thunder.changeSlip' : 'topup.thunder.chooseSlip') | translate }}
              </button>
              <div *ngIf="slipName" class="slip-name mono">
                <span class="mi sm">image</span> {{ slipName }}
              </div>
            </div>

            <p *ngIf="slipError" style="color:var(--rose);font-size:13px;margin:8px 0 0 0">{{ slipError | translate }}</p>

            <button class="btn primary" style="width:100%;margin-top:12px" [disabled]="!slipBase64 || verifying" (click)="verifyThunder()">
              <span *ngIf="!verifying" class="mi sm">verified</span>
              <span *ngIf="verifying" class="spinner sm" style="margin-right:6px"></span>
              {{ (verifying ? 'topup.thunder.verifying' : 'topup.thunder.verifyBtn') | translate }}
            </button>

            <button class="btn ghost" style="width:100%;margin-top:8px" [disabled]="verifying" (click)="reset()">
              {{ 'topup.cancelBtn' | translate }}
            </button>
          </ng-container>

          <!-- Phase: success -->
          <ng-container *ngIf="phase === 'success'">
            <div class="result emerald">
              <span class="mi xxl">check_circle</span>
              <h2>{{ 'topup.successTitle' | translate }}</h2>
              <p class="muted">{{ 'topup.successBody' | translate:{ meowcoins: (creditedMeowcoins | number) } }}</p>
              <div class="balance-box">
                <span class="muted" style="font-size:12px">{{ 'topup.newBalance' | translate }}</span>
                <div class="mono balance-amt" style="font-size:28px;font-weight:700">
                  {{ (topup.balance$ | async) ?? '—' }} <span class="muted" style="font-size:14px">{{ 'topup.meowcoins' | translate }}</span>
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
                <div class="a-name">{{ h.meowcoins | number }} {{ 'topup.meowcoins' | translate }} <span class="muted mono" style="font-size:11px">· {{ h.unique_amount | number:'1.2-2' }} {{ 'topup.baht' | translate }}</span></div>
                <div class="a-src mono" style="font-size:11px">
                  <span class="badge" [class.emerald]="h.status === 'credited'" [class.rose]="h.status === 'expired' || h.status === 'cancelled'">{{ ('topup.status.' + h.status) | translate }}</span>
                  <span class="muted">{{ (h.credited_at || h.created_at || h.expires_at) | date:'short' }}</span>
                </div>
              </div>
            </div>
          </ng-container>
        </div>
      </div>

      <!-- ==== Battlepass tier track ==== -->
      <div *ngIf="progress && progress.tiers.length > 0" class="card flush" style="margin-top:16px">
        <div class="card-title" style="padding:16px 18px 0"><span class="mi">military_tech</span>{{ 'donate.battlepassTitle' | translate }}</div>
        <div class="tier-track">
          <div *ngFor="let tier of progress.tiers" class="tier"
               [class.locked]="!tier.unlocked" [class.claimed]="tier.claimed">
            <div class="tier-head">
              <div class="tier-thr mono">
                <img class="coin-img meow" src="assets/coins/meowcoin.png" alt="" style="width:16px;height:16px;vertical-align:-3px">
                {{ tier.threshold_baht | number }} {{ 'topup.baht' | translate }}
              </div>
              <span class="tier-state badge"
                    [class.emerald]="tier.unlocked && tier.claimed"
                    [class.slate]="!tier.unlocked">
                <span class="mi sm">{{ tier.claimed ? 'check_circle' : (tier.unlocked ? 'lock_open' : 'lock') }}</span>
                {{ (tier.claimed ? 'donate.tier.claimed' : (tier.unlocked ? 'donate.tier.unlocked' : 'donate.tier.locked')) | translate }}
              </span>
            </div>
            <div class="tier-name">{{ tier.name }}</div>

            <div class="tier-rewards">
              <div *ngFor="let r of tier.rewards" class="reward-chip" [title]="(r.name || ('#' + r.item_id)) + ' ×' + r.amount">
                <div class="reward-img">
                  <img *ngIf="r.image_url; else noRewImg" [src]="r.image_url" alt="">
                  <ng-template #noRewImg><span class="mi sm faint">{{ r.kind === 'vehicle' ? 'directions_car' : 'inventory_2' }}</span></ng-template>
                </div>
                <span class="reward-name">{{ r.name || ('#' + r.item_id) }}</span>
                <span class="mono faint" style="font-size:11px">×{{ r.amount }}</span>
              </div>
            </div>

            <!-- State actions -->
            <div class="tier-action">
              <div *ngIf="!tier.unlocked" class="muted" style="font-size:12px">
                {{ 'donate.tier.needMore' | translate:{ threshold: (tier.threshold_baht | number) } }}
              </div>
              <button *ngIf="tier.unlocked && !tier.claimed" class="btn primary sm" style="width:100%"
                      [disabled]="claimingTierId === tier.id" (click)="claim(tier)">
                <span *ngIf="claimingTierId !== tier.id" class="mi sm">redeem</span>
                <span *ngIf="claimingTierId === tier.id" class="spinner sm" style="margin-right:6px"></span>
                {{ (claimingTierId === tier.id ? 'common.saving' : 'donate.tier.claim') | translate }}
              </button>
              <button *ngIf="tier.claimed" class="btn secondary sm" style="width:100%" (click)="revealCode(tier)">
                <span class="mi sm">qr_code_2</span>{{ 'donate.tier.viewCode' | translate }}
              </button>
            </div>
            <p *ngIf="claimError && claimErrorTierId === tier.id" style="color:var(--rose);font-size:12px;margin:6px 0 0 0">{{ claimError | translate }}</p>
          </div>
        </div>
      </div>
      </ng-container>

      <!-- Tier reward code-reveal modal (reuses the header/inventory code-reveal pattern). -->
      <div *ngIf="revealedCode" class="modal-backdrop" (click)="closeCode()">
        <div class="modal-card tactical" style="max-width:480px;text-align:center" (click)="$event.stopPropagation()">
          <h3 style="display:flex;align-items:center;justify-content:center;gap:8px;margin:0 0 12px 0;font-size:18px;font-weight:700">
            <span class="mi" style="color:var(--emerald)">military_tech</span>{{ 'donate.claimSuccessTitle' | translate }}
          </h3>
          <p *ngIf="revealedTierName" class="muted" style="font-size:13px;margin:0 0 12px 0">{{ revealedTierName }}</p>
          <div class="code-box mono">{{ revealedCode }}</div>
          <button class="btn ghost sm" (click)="copyCode(revealedCode)" style="margin-top:8px">
            <span class="mi sm">{{ codeCopied ? 'check' : 'content_copy' }}</span>
            {{ (codeCopied ? 'notifications.code.copied' : 'notifications.code.copy') | translate }}
          </button>
          <p class="muted" style="font-size:12px;margin-top:10px">
            {{ 'notifications.code.instruction' | translate:{ code: revealedCode } }}
          </p>
          <button class="btn primary" style="margin-top:16px;width:100%" (click)="closeCode()">{{ 'common.ok' | translate }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notice { max-width:520px; text-align:center; padding:32px 24px; }
    .notice h2 { margin:8px 0 4px; font-size:18px; font-weight:700; }
    .notice p { margin:0; }
    .notice .btn { margin-top:16px; }
    .h-icon.meow { color:var(--meowcoin); background:rgb(59 130 246 / 0.14); border-color:rgb(59 130 246 / 0.3); }
    .balance-amt { color:var(--meowcoin); }
    .meow-pill { display:inline-flex; align-items:center; gap:8px; padding:6px 12px;
      background:var(--surface-2); border:1px solid var(--meowcoin); border-radius:999px; color:var(--meowcoin); }
    .meow-pill .mi { color:var(--meowcoin); }
    .convert { display:flex; align-items:center; gap:6px; margin-top:10px; font-size:16px; font-weight:700; color:var(--meowcoin); }
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
    .seg { display:flex; gap:6px; flex-wrap:wrap; }
    .seg-btn { flex:1; min-width:120px; display:inline-flex; align-items:center; justify-content:center; gap:6px;
      padding:8px 10px; font-size:13px; font-weight:600; cursor:pointer; color:var(--text);
      background:var(--surface-2); border:1px solid var(--border); border-radius:8px; }
    .seg-btn.active { border-color:var(--meowcoin); color:var(--meowcoin); background:rgb(59 130 246 / 0.12); }
    .steps { margin:14px 0 0 0; padding-left:20px; font-size:13px; line-height:1.7; color:var(--text); }
    .slip { margin-top:14px; }
    .slip-name { display:flex; align-items:center; gap:6px; margin-top:6px; font-size:12px; color:var(--muted); word-break:break-all; }

    /* Community progress bar */
    .community .bar { height:12px; border-radius:999px; background:var(--surface-2); border:1px solid var(--border); overflow:hidden; }
    .community .bar-fill { height:100%; background:linear-gradient(90deg, var(--meowcoin), var(--emerald)); border-radius:999px; transition:width .4s ease; }

    /* Cap-reached note */
    .cap-note { display:flex; align-items:center; gap:6px; margin-top:12px; padding:10px 12px; font-size:13px; font-weight:600;
      color:var(--amber); background:rgb(245 158 11 / 0.10); border:1px solid rgb(245 158 11 / 0.3); border-radius:8px; }

    /* Battlepass tier track */
    .tier-track { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px; padding:16px 18px 18px; }
    .tier { background:var(--surface-2); border:1px solid var(--border); border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px; }
    .tier.locked { opacity:.55; filter:grayscale(.4); }
    .tier.claimed { border-color:var(--emerald); }
    .tier-head { display:flex; align-items:center; justify-content:space-between; gap:6px; }
    .tier-thr { font-weight:700; font-size:14px; color:var(--meowcoin); }
    .tier-state { display:inline-flex; align-items:center; gap:3px; font-size:10px; }
    .tier-name { font-weight:600; font-size:14px; }
    .tier-rewards { display:flex; flex-direction:column; gap:6px; }
    .reward-chip { display:flex; align-items:center; gap:8px; background:var(--surface-3); border-radius:999px; padding:3px 10px 3px 3px; }
    .reward-img { width:26px; height:26px; flex:0 0 26px; background:var(--surface); border-radius:50%; display:flex; align-items:center; justify-content:center; overflow:hidden; }
    .reward-img img { width:80%; height:80%; object-fit:contain; }
    .reward-name { flex:1; min-width:0; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .tier-action { margin-top:auto; }
    .code-box { display:inline-block; padding:12px 20px; background:var(--surface-2); border:1px dashed var(--accent); border-radius:8px;
      font-size:22px; font-weight:700; letter-spacing:2px; user-select:all; }
  `],
})
export class TopupComponent implements OnInit, OnDestroy {
  // 1 baht = 1 Meowcoin display rate; the authoritative figure comes back as `meowcoins` on create.
  private static readonly RATE = 1;

  // Soft-launch access backstop. True until the config + admin check say otherwise; the route
  // guard normally prevents non-admins from reaching this page while admin_only is on.
  hasAccess = true;

  /**
   * Donations are open to everyone now, so the only "can't show the form" state left is
   * "closed" — access but every provider disabled (providers: []).
   */
  get notice(): boolean {
    return this.hasAccess && this.providers.length === 0;
  }

  phase: Phase = 'form';
  baht: number | null = null;
  meowcoinPreview = 0;
  creating = false;
  createError: string | null = null;
  amountError: string | null = null;

  // ---- Donate / battlepass state ----
  progress: DonateProgress | null = null;
  maxBaht = 100000;                         // from config (max single donation)
  claimingTierId: number | null = null;
  claimError: string | null = null;
  claimErrorTierId: number | null = null;

  // Tier code-reveal modal.
  revealedCode: string | null = null;
  revealedTierName: string | null = null;
  codeCopied = false;

  // Providers (enabled, from /config/topup). `provider` is the selected one.
  providers: TopupProviderOption[] = [];
  provider: TopupProvider = 'plernpay';

  // Thunder slip-upload state.
  slipName: string | null = null;
  slipBase64: string | null = null;
  slipError: string | null = null;
  verifying = false;

  created: TopupCreated | null = null;
  currentStatus: TopupState['status'] = 'pending';
  creditedMeowcoins = 0;

  secondsLeft = 0;
  countdownText = '';

  history: TopupRow[] = [];
  historyLoading = true;

  private pollSub?: Subscription;
  private tickSub?: Subscription;

  constructor(public topup: TopupService, private auth: AuthService) {}

  ngOnInit() {
    // Resolve access from the soft-launch gate + admin status (same rule as topupGuard).
    const me = this.auth.current;
    this.topup.getTopupConfig().subscribe({
      next: cfg => {
        this.hasAccess = !!me && (me.is_admin || !cfg.admin_only);
        this.providers = cfg.providers;
        this.maxBaht = cfg.max_baht;
        // Auto-select: single provider -> use it; multiple -> default to the first enabled one.
        if (this.providers.length > 0) this.provider = this.providers[0].key;
        if (this.hasAccess) {
          this.topup.meowcoinsMe().subscribe({ next: () => {}, error: () => {} });
          this.loadProgress();
          this.loadHistory();
        } else {
          this.historyLoading = false;
        }
      },
      error: () => { this.historyLoading = false; },
    });
  }

  ngOnDestroy() {
    this.stopTimers();
  }

  // ---- Form ----
  /** This month's remaining per-user cap (baht), or null if progress hasn't loaded. */
  get remaining(): number | null {
    return this.progress ? Math.max(0, this.progress.user_remaining) : null;
  }

  /** True when the user has hit their monthly donation cap. */
  get capReached(): boolean {
    return this.remaining !== null && this.remaining <= 0;
  }

  /** Max baht the user may donate now = min(config max, remaining cap). */
  get maxAllowed(): number {
    return this.remaining === null ? this.maxBaht : Math.min(this.maxBaht, this.remaining);
  }

  get canCreate(): boolean {
    if (this.capReached) return false;
    if (!this.baht || !Number.isFinite(this.baht) || this.baht < 1) return false;
    return Math.floor(this.baht) <= this.maxAllowed;
  }

  onAmountChange() {
    const v = Math.floor(Number(this.baht) || 0);
    this.meowcoinPreview = v >= 1 ? v * TopupComponent.RATE : 0;
    // Validate the typed amount against the remaining monthly cap.
    this.amountError = (v >= 1 && this.remaining !== null && v > this.maxAllowed)
      ? 'donate.errors.donate_cap_exceeded'
      : null;
  }

  providerIcon(key: TopupProvider): string {
    return key === 'thunder' ? 'bolt' : 'qr_code_2';
  }

  create() {
    if (!this.canCreate) return;
    this.creating = true;
    this.createError = null;
    this.resetSlip();
    const amount = Math.floor(Number(this.baht));
    this.topup.create(amount, this.provider).subscribe({
      next: c => {
        this.creating = false;
        this.created = c;
        this.currentStatus = c.status;
        this.phase = 'pay';
        this.startCountdown();
        // PlernPay credits via webhook -> poll status. Thunder credits via slip upload -> no poll.
        if (c.provider === 'plernpay') this.startPolling();
      },
      error: e => {
        this.creating = false;
        const code = e?.error?.message;
        if (code === 'donate_cap_exceeded') {
          this.createError = 'donate.errors.donate_cap_exceeded';
          // Refresh so the cap/remaining reflects reality.
          this.loadProgress();
        } else {
          this.createError = e?.error?.message || 'topup.errors.createFail';
        }
      },
    });
  }

  // ---- Thunder slip upload + verify ----
  /** Read the chosen image as a data URL (slip_base64). Rejects wrong type / >4MB client-side. */
  onSlipSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow re-selecting the same file
    if (!file) return;
    this.slipError = null;
    this.slipName = null;
    this.slipBase64 = null;
    if (!ALLOWED_SLIP_TYPES.includes(file.type)) {
      this.slipError = 'topup.thunder.errors.badType';
      return;
    }
    if (file.size > MAX_SLIP_BYTES) {
      this.slipError = 'topup.thunder.errors.tooLarge';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.slipBase64 = String(reader.result); // data URL: "data:image/...;base64,...."
      this.slipName = file.name;
    };
    reader.onerror = () => { this.slipError = 'topup.thunder.errors.readFail'; };
    reader.readAsDataURL(file);
  }

  verifyThunder() {
    if (!this.created || !this.slipBase64 || this.verifying) return;
    this.verifying = true;
    this.slipError = null;
    this.topup.verifyThunder(this.created.ref, this.slipBase64).subscribe({
      next: r => {
        this.verifying = false;
        this.creditedMeowcoins = r.meowcoins;
        this.phase = 'success';
        this.stopTimers();
        // Refresh shared balance (header + page); fall back to the returned balance.
        this.topup.meowcoinsMe().subscribe({ next: () => {}, error: () => {} });
        this.loadProgress();
        this.loadHistory();
      },
      error: e => {
        this.verifying = false;
        // Map the API reason to a friendly i18n key; keep the QR so the user can re-upload.
        const reason = e?.error?.reason as ThunderVerifyReason | undefined;
        this.slipError = reason ? `topup.thunder.errors.${reason}` : 'topup.thunder.errors.generic';
      },
    });
  }

  private resetSlip() {
    this.slipName = null;
    this.slipBase64 = null;
    this.slipError = null;
    this.verifying = false;
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
      this.creditedMeowcoins = s.meowcoins;
      this.phase = 'success';
      this.stopTimers();
      // Refresh the shared balance so the header + this page update.
      this.topup.meowcoinsMe().subscribe({ next: () => {}, error: () => {} });
      this.loadProgress();
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

  // ---- Donate progress + battlepass ----
  get communityPct(): number {
    if (!this.progress || this.progress.community_goal <= 0) return 0;
    return Math.min(100, (this.progress.community_total / this.progress.community_goal) * 100);
  }

  private loadProgress() {
    this.topup.donateProgress().subscribe({
      next: p => {
        this.progress = p;
        // Re-validate the typed amount against the freshly loaded cap.
        this.onAmountChange();
      },
      error: () => {},
    });
  }

  /** Claim an unlocked tier -> mint/return a redeem code -> reveal it; refresh progress. */
  claim(tier: DonateTier) {
    if (!tier.unlocked || tier.claimed || this.claimingTierId === tier.id) return;
    this.claimingTierId = tier.id;
    this.claimError = null;
    this.claimErrorTierId = null;
    this.topup.claimTier(tier.id).subscribe({
      next: res => {
        this.claimingTierId = null;
        this.openCode(res.code, tier.name);
        this.loadProgress();
      },
      error: e => {
        this.claimingTierId = null;
        const code = e?.error?.message;
        this.claimErrorTierId = tier.id;
        this.claimError = (code === 'tier_locked' || code === 'tier_not_found')
          ? `donate.errors.${code}`
          : 'topup.errors.createFail';
        // A locked/not-found error likely means our view is stale — refresh.
        this.loadProgress();
      },
    });
  }

  /** Re-reveal a previously claimed tier's stored code. */
  revealCode(tier: DonateTier) {
    if (tier.code) this.openCode(tier.code, tier.name);
  }

  private openCode(code: string, tierName: string) {
    this.revealedCode = code;
    this.revealedTierName = tierName;
    this.codeCopied = false;
  }

  closeCode() {
    this.revealedCode = null;
    this.revealedTierName = null;
    this.codeCopied = false;
  }

  copyCode(code: string) {
    if (!code) return;
    const text = `/code ${code}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => { this.codeCopied = true; }, () => {});
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); this.codeCopied = true; } catch {}
      document.body.removeChild(ta);
    }
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
    this.creditedMeowcoins = 0;
    this.createError = null;
    this.amountError = null;
    this.baht = null;
    this.meowcoinPreview = 0;
    this.resetSlip();
  }
}
