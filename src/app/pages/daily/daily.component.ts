import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { DailyService, DailyStatus, DailyClaimResult, DailyReward } from '../../services/daily.service';
import { CoinsService } from '../../services/coins.service';

@Component({
  selector: 'app-daily',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon amber"><span class="mi lg">redeem</span></div>
        <h1>{{ 'daily.title' | translate }}</h1>
      </div>

      <div *ngIf="loading" class="card" style="text-align:center;padding:48px"><span class="spinner"></span></div>

      <ng-container *ngIf="!loading && status">
        <!-- Feature off -->
        <div *ngIf="!status.enabled" class="card empty-card">
          <span class="mi xl muted">hourglass_empty</span>
          <p class="muted" style="margin-top:8px">{{ 'daily.disabled' | translate }}</p>
        </div>

        <!-- Steam not linked -->
        <div *ngIf="status.enabled && notLinked" class="card empty-card">
          <span class="mi xl muted">link_off</span>
          <p style="margin-top:8px;font-weight:600">{{ 'daily.notLinkedTitle' | translate }}</p>
          <p class="muted text-sm" style="margin-top:4px">{{ 'daily.notLinkedHint' | translate }}</p>
          <button class="btn primary" style="margin-top:16px" (click)="goLink()">
            <span class="mi sm">link</span>{{ 'daily.linkSteam' | translate }}
          </button>
        </div>

        <ng-container *ngIf="status.enabled && !notLinked">
          <section class="card daily-panel" [class.vip]="status.tier === 'vip'">
            <!-- Tier badge -->
            <div class="tier-badge" [class.vip]="status.tier === 'vip'">
              <span class="mi sm">{{ status.tier === 'vip' ? 'workspace_premium' : 'person' }}</span>
              {{ (status.tier === 'vip' ? 'daily.tierVip' : 'daily.tierNormal') | translate }}
            </div>

            <h2 class="panel-title">{{ 'daily.todaysReward' | translate }}</h2>

            <!-- Reward preview -->
            <div class="rewards">
              <div class="reward-chip coins" *ngIf="status.reward.coins > 0">
                <img class="coin-img" src="assets/coins/coin.png" alt="">
                <span class="fw-7">{{ status.reward.coins | number }}</span>
                <span class="muted text-xs">{{ 'daily.coins' | translate }}</span>
              </div>
              <div class="reward-chip" *ngFor="let r of allRewards(status.reward)">
                <div class="reward-thumb">
                  <img *ngIf="r.imageUrl; else ri" [src]="r.imageUrl" [alt]="r.label">
                  <ng-template #ri><span class="mi">{{ r.kind === 1 ? 'directions_car' : 'inventory_2' }}</span></ng-template>
                  <span *ngIf="r.amount > 1" class="qty">×{{ r.amount }}</span>
                </div>
                <span class="reward-label">{{ r.label }}</span>
              </div>
              <div *ngIf="status.reward.coins <= 0 && allRewards(status.reward).length === 0" class="muted text-sm">
                {{ 'daily.noReward' | translate }}
              </div>
            </div>

            <!-- Claim / claimed state -->
            <ng-container *ngIf="!status.alreadyClaimedToday">
              <button class="btn primary lg claim-btn" (click)="claim()" [disabled]="claiming || !status.canClaim">
                <span *ngIf="claiming" class="spinner sm"></span>
                <span *ngIf="!claiming" class="mi">redeem</span>
                {{ 'daily.claimBtn' | translate }}
              </button>
              <p *ngIf="claimError" class="text-rose text-xs" style="text-align:center;margin-top:8px">{{ claimError }}</p>
            </ng-container>

            <div *ngIf="status.alreadyClaimedToday" class="claimed-state">
              <span class="mi" style="color:var(--emerald, #10b981)">check_circle</span>
              <span>{{ 'daily.claimedToday' | translate }}</span>
            </div>

            <div class="reset-row muted text-sm">
              <span class="mi sm">restart_alt</span>{{ 'daily.nextIn' | translate }} {{ resetCountdown }}
            </div>

            <!-- Upsell for normal tier -->
            <div *ngIf="status.tier === 'normal'" class="upsell">
              <span class="mi sm">workspace_premium</span>{{ 'daily.vipUpsell' | translate }}
            </div>
          </section>
        </ng-container>
      </ng-container>

      <!-- Claim result modal -->
      <div class="modal-backdrop" *ngIf="result" (click)="closeResult()">
        <div class="modal claim-result" (click)="$event.stopPropagation()">
          <div class="result-burst"><span class="mi xl">redeem</span></div>
          <h2 class="result-title">{{ 'daily.claimedTitle' | translate }}</h2>

          <div class="granted">
            <div class="reward-chip coins" *ngIf="result.granted.coins > 0">
              <img class="coin-img" src="assets/coins/coin.png" alt="">
              <span class="fw-7">+{{ result.granted.coins | number }}</span>
            </div>
            <div class="reward-chip" *ngFor="let r of allRewards(result.granted)">
              <div class="reward-thumb">
                <img *ngIf="r.imageUrl; else gi" [src]="r.imageUrl" [alt]="r.label">
                <ng-template #gi><span class="mi">{{ r.kind === 1 ? 'directions_car' : 'inventory_2' }}</span></ng-template>
                <span *ngIf="r.amount > 1" class="qty">×{{ r.amount }}</span>
              </div>
              <span class="reward-label">{{ r.label }}</span>
            </div>
          </div>

          <!-- Redeem code for items/vehicles -->
          <div *ngIf="result.redeemCode" class="result-code">
            <span class="muted text-xs">{{ 'daily.redeemCode' | translate }}</span>
            <div class="code-row">
              <code class="mono">{{ result.redeemCode }}</code>
              <button class="btn secondary sm" (click)="copyCode('/code ' + result.redeemCode!)">
                <span class="mi sm">{{ copied ? 'check' : 'content_copy' }}</span>
              </button>
            </div>
            <p class="muted text-xs" style="margin-top:6px">
              {{ 'daily.useInGame' | translate }} <code class="mono">/code {{ result.redeemCode }}</code>
            </p>
          </div>

          <button class="btn primary full" style="margin-top:16px" (click)="closeResult()">{{ 'daily.ok' | translate }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .empty-card { text-align:center; padding:48px 24px; max-width:520px; margin:24px auto; }
    .daily-panel { display:flex; flex-direction:column; align-items:center; gap:14px; padding:28px 16px; text-align:center; position:relative; }
    .daily-panel.vip { border-color:var(--amber, #f5c518); box-shadow:0 0 32px rgb(245 197 24 / .15); }
    .tier-badge { display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:700; letter-spacing:.04em;
      padding:4px 10px; border-radius:999px; background:var(--surface-2); border:1px solid var(--border); color:var(--muted); }
    .tier-badge.vip { color:var(--amber, #f5c518); border-color:var(--amber, #f5c518); background:color-mix(in srgb, var(--amber, #f5c518) 12%, var(--surface-2)); }
    .panel-title { font-size:18px; font-weight:800; margin:2px 0; }
    .rewards { display:flex; flex-wrap:wrap; gap:12px; justify-content:center; align-items:flex-start; min-height:40px; }
    .reward-chip { display:flex; flex-direction:column; align-items:center; gap:5px; max-width:96px; }
    .reward-chip.coins { flex-direction:row; align-items:center; gap:6px; padding:8px 14px; border-radius:10px;
      background:var(--surface-2); border:1px solid var(--border); max-width:none; }
    .reward-thumb { position:relative; width:64px; height:64px; border-radius:10px; background:var(--surface-2);
      border:1px solid var(--border); display:flex; align-items:center; justify-content:center; overflow:hidden; }
    .reward-thumb img { max-width:100%; max-height:100%; object-fit:contain; padding:4px; }
    .reward-thumb .mi { font-size:32px; color:var(--text-faint); }
    .reward-thumb .qty { position:absolute; right:3px; bottom:3px; font-size:11px; font-weight:700; line-height:1;
      padding:2px 5px; border-radius:6px; background:rgb(0 0 0 / .65); color:#fff; }
    .reward-label { font-size:11px; font-weight:600; text-align:center; overflow:hidden; text-overflow:ellipsis;
      display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
    .coin-img { width:18px; height:18px; vertical-align:middle; }
    .claim-btn { min-width:240px; margin-top:4px; }
    .claimed-state { display:inline-flex; align-items:center; gap:8px; font-weight:600; padding:10px 18px;
      border-radius:10px; background:var(--surface-2); border:1px solid var(--border); }
    .reset-row { display:inline-flex; align-items:center; gap:4px; }
    .upsell { display:inline-flex; align-items:center; gap:6px; font-size:12px; color:var(--amber, #f5c518);
      margin-top:2px; padding:6px 12px; border-radius:8px; border:1px dashed var(--amber, #f5c518);
      background:color-mix(in srgb, var(--amber, #f5c518) 8%, transparent); }

    .modal-backdrop { position:fixed; inset:0; background:rgb(0 0 0 / .6); display:flex; align-items:center; justify-content:center; z-index:60; padding:16px; }
    .claim-result { background:var(--surface); border:1px solid var(--border); border-radius:18px; padding:28px 24px; max-width:400px; width:100%; text-align:center; }
    .result-burst { width:80px; height:80px; margin:0 auto 10px; border-radius:50%; display:flex; align-items:center; justify-content:center;
      background:color-mix(in srgb, var(--accent) 16%, var(--surface-2)); color:var(--accent); animation:pop .4s ease; }
    .result-burst .mi { font-size:44px; }
    @keyframes pop { from { transform:scale(.4); opacity:0; } to { transform:scale(1); opacity:1; } }
    .result-title { font-size:20px; font-weight:800; margin-top:4px; }
    .granted { display:flex; flex-wrap:wrap; gap:12px; justify-content:center; margin:14px 0; }
    .result-code { margin-top:14px; padding-top:14px; border-top:1px solid var(--border); }
    .code-row { display:flex; align-items:center; gap:8px; justify-content:center; margin-top:4px; }
    .code-row code { font-size:18px; font-weight:700; letter-spacing:.05em; }
  `],
})
export class DailyComponent implements OnInit, OnDestroy {
  loading = true;
  status: DailyStatus | null = null;
  claiming = false;
  claimError: string | null = null;
  notLinked = false;
  result: DailyClaimResult | null = null;
  copied = false;
  resetCountdown = '';
  private resetTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private daily: DailyService,
    private coins: CoinsService,
    private router: Router,
    private t: TranslateService,
  ) {}

  ngOnInit() {
    this.refresh();
    this.resetTimer = setInterval(() => this.tickReset(), 1000);
  }

  ngOnDestroy() {
    if (this.resetTimer) { clearInterval(this.resetTimer); this.resetTimer = null; }
  }

  private refresh() {
    this.daily.status().subscribe({
      next: s => {
        this.status = s;
        this.notLinked = false;
        this.loading = false;
        this.tickReset();
      },
      error: e => {
        this.loading = false;
        // 403 not_linked surfaces on /status too — show the link prompt instead of a hard error.
        if (e?.status === 403 && this.errCode(e) === 'not_linked') {
          this.status = { enabled: true } as DailyStatus;
          this.notLinked = true;
        }
      },
    });
  }

  claim() {
    if (!this.status || this.claiming || !this.status.canClaim) return;
    this.claiming = true;
    this.claimError = null;
    this.daily.claim().subscribe({
      next: res => {
        this.claiming = false;
        this.result = res;
        // Reflect the new claimed state + balances without waiting for a manual reload.
        this.refresh();
        this.coins.refreshMe().subscribe({ next: () => {}, error: () => {} });
      },
      error: e => {
        this.claiming = false;
        const code = this.errCode(e);
        if (code === 'already_claimed_today') {
          // Not a real error — someone already claimed today (e.g. another tab). Just re-sync.
          this.refresh();
          return;
        }
        if (code === 'not_linked') {
          this.notLinked = true;
          return;
        }
        // daily_disabled, delivery_failed (retryable), or anything else → inline message.
        const key = 'daily.errors.' + code;
        const translated = this.t.instant(key);
        this.claimError = translated !== key ? translated : this.t.instant('daily.errors.generic');
      },
    });
  }

  /** Items first, then vehicles — single flat list for the thumbnail grid. */
  allRewards(r: { items: DailyReward[]; vehicles: DailyReward[] }): DailyReward[] {
    return [...(r.items || []), ...(r.vehicles || [])];
  }

  goLink() { this.router.navigate(['/home']); }

  closeResult() { this.result = null; this.copied = false; }

  copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      this.copied = true; setTimeout(() => this.copied = false, 2000);
    });
  }

  private errCode(e: any): string {
    return e?.error?.message || e?.error?.error || '';
  }

  private tickReset() {
    if (!this.status?.nextResetAt) { this.resetCountdown = ''; return; }
    const diff = new Date(this.status.nextResetAt).getTime() - Date.now();
    const s = Math.max(0, Math.floor(diff / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    this.resetCountdown = `${h}h ${m}m ${sec}s`;
  }
}
