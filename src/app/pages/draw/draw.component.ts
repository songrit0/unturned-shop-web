import { Component, OnDestroy, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { GachaService, GachaState, GachaSpinResult, GachaTodayEntry } from '../../services/gacha.service';
import { CoinsService } from '../../services/coins.service';
import { TopupService } from '../../services/topup.service';

@Component({
  selector: 'app-draw',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon violet"><span class="mi lg">casino</span></div>
        <h1>{{ 'draw.title' | translate }}</h1>
      </div>

      <div *ngIf="loading" class="card" style="text-align:center;padding:48px"><span class="spinner"></span></div>

      <ng-container *ngIf="!loading && state">
        <div *ngIf="!state.enabled" class="card" style="text-align:center;padding:48px 24px;max-width:520px;margin:24px auto">
          <span class="mi xl muted">hourglass_empty</span>
          <p class="muted" style="margin-top:8px">{{ 'draw.disabled' | translate }}</p>
        </div>

        <ng-container *ngIf="state.enabled">
          <!-- Spin panel -->
          <section class="card draw-panel">
            <div class="draw-wheel" [class.spinning]="spinning">
              <span class="mi">{{ spinning ? 'autorenew' : 'redeem' }}</span>
            </div>

            <div class="draw-counts">
              <div class="draw-big">{{ state.totalRemaining }}</div>
              <div class="muted text-sm">{{ 'draw.spinsLeft' | translate }}</div>
              <div class="draw-breakdown muted text-xs">
                {{ 'draw.free' | translate }}: {{ state.freeRemaining }}/{{ state.freeEntitlement }}
                · {{ 'draw.bought' | translate }}: {{ state.paidSpins }}
                <span *ngIf="state.rank"> · {{ 'draw.rank' | translate }} #{{ state.rank }}</span>
              </div>
              <div class="muted text-xs" style="margin-top:4px">
                <span class="mi sm">restart_alt</span>{{ 'draw.resetIn' | translate }} {{ resetCountdown }}
              </div>
            </div>

            <button class="btn primary lg draw-spin-btn" (click)="spin()" [disabled]="spinning || state.totalRemaining <= 0">
              <span *ngIf="spinning" class="spinner sm"></span>
              <span *ngIf="!spinning" class="mi">casino</span>
              {{ (state.totalRemaining > 0 ? 'draw.spin' : 'draw.noSpins') | translate }}
            </button>

            <!-- Buy spins -->
            <div class="draw-buy" *ngIf="state.priceCoins || state.priceMeowcoins">
              <span class="muted text-xs">{{ 'draw.buyMore' | translate }}</span>
              <div class="row gap-2" style="justify-content:center;flex-wrap:wrap;margin-top:6px">
                <button class="btn secondary sm" *ngIf="state.priceCoins" (click)="buy('coins')" [disabled]="buying">
                  <img class="coin-img" src="assets/coins/coin.png" alt="">{{ state.priceCoins | number }} / {{ 'draw.spinOne' | translate }}
                </button>
                <button class="btn secondary sm" *ngIf="state.priceMeowcoins" (click)="buy('meowcoins')" [disabled]="buying">
                  <img class="coin-img" src="assets/coins/meowcoin.png" alt="">{{ state.priceMeowcoins | number }} / {{ 'draw.spinOne' | translate }}
                </button>
              </div>
              <p *ngIf="buyError" class="text-rose text-xs" style="text-align:center;margin-top:6px">{{ buyError }}</p>
            </div>
          </section>

          <!-- Top Today -->
          <section class="card" style="margin-top:16px">
            <div class="card-head"><span class="mi" style="color:var(--amber)">emoji_events</span><span class="fw-7">{{ 'draw.topToday' | translate }}</span></div>
            <div *ngIf="today.length === 0" class="muted text-sm" style="padding:16px 0;text-align:center">{{ 'draw.noDraws' | translate }}</div>
            <ul class="feed" *ngIf="today.length">
              <li *ngFor="let e of today" [class]="'rar-' + (e.rarity || 'common')">
                <span class="feed-thumb">
                  <img *ngIf="e.imageUrl; else fi" [src]="e.imageUrl" alt="">
                  <ng-template #fi><span class="mi">{{ typeIcon(e.prizeType) }}</span></ng-template>
                </span>
                <span class="feed-name">{{ e.name }}</span>
                <span class="feed-prize">{{ e.prizeLabel }}</span>
                <span class="feed-time muted text-xs">{{ ago(e.at) }}</span>
              </li>
            </ul>
          </section>
        </ng-container>
      </ng-container>

      <!-- Result modal -->
      <div class="modal-backdrop" *ngIf="result" (click)="closeResult()">
        <div class="modal draw-result" [class]="'rar-' + (result.prize.rarity || 'common')" (click)="$event.stopPropagation()">
          <div class="result-burst"><span class="mi xl">{{ typeIcon(result.prize.type) }}</span></div>
          <div class="result-rarity">{{ (result.prize.rarity || 'common') | uppercase }}</div>
          <img *ngIf="result.prize.imageUrl" class="result-img" [src]="result.prize.imageUrl" alt="">
          <h2 class="result-label">{{ result.prize.label }}</h2>
          <div *ngIf="result.prize.code" class="result-code">
            <span class="muted text-xs">{{ 'draw.redeemCode' | translate }}</span>
            <div class="code-row">
              <code class="mono">{{ result.prize.code }}</code>
              <button class="btn secondary sm" (click)="copyCode(result.prize.code!)">
                <span class="mi sm">{{ copied ? 'check' : 'content_copy' }}</span>
              </button>
            </div>
            <p class="muted text-xs" style="margin-top:6px">{{ 'draw.useInGame' | translate }} <code class="mono">/code {{ result.prize.code }}</code></p>
          </div>
          <button class="btn primary full" style="margin-top:16px" (click)="closeResult()">{{ 'draw.ok' | translate }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card-head { display:flex; align-items:center; gap:8px; margin-bottom:12px; font-size:15px; }
    .draw-panel { display:flex; flex-direction:column; align-items:center; gap:16px; padding:32px 20px; text-align:center; }
    .draw-wheel { width:120px; height:120px; border-radius:50%; display:flex; align-items:center; justify-content:center;
      background: conic-gradient(from 0deg, var(--accent), var(--violet,#a78bfa), var(--amber), var(--emerald), var(--accent));
      box-shadow: 0 8px 30px rgb(0 0 0 / .25); }
    .draw-wheel .mi { font-size:54px; color:#fff; }
    .draw-wheel.spinning { animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .draw-counts { display:flex; flex-direction:column; align-items:center; }
    .draw-big { font-size:44px; font-weight:800; line-height:1; }
    .draw-breakdown { margin-top:6px; }
    .draw-spin-btn { min-width:220px; }
    .draw-buy { width:100%; border-top:1px solid var(--border); padding-top:14px; margin-top:4px; }
    .coin-img { width:16px; height:16px; vertical-align:middle; margin-right:4px; }

    .feed { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:4px; }
    .feed li { display:grid; grid-template-columns:38px 1fr auto auto; gap:10px; align-items:center;
      padding:7px 10px; border-radius:8px; border-left:3px solid var(--border); background:var(--surface-2); }
    .feed-thumb { width:34px; height:34px; border-radius:7px; background:var(--surface); display:flex; align-items:center; justify-content:center; overflow:hidden; }
    .feed-thumb img { width:100%; height:100%; object-fit:contain; padding:3px; }
    .feed-name { font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .feed-prize { font-weight:700; font-size:13px; }
    .feed-time { white-space:nowrap; }

    /* rarity accents */
    .rar-common { border-left-color:#9ca3af; } .rar-common .feed-prize { color:#9ca3af; }
    .rar-rare { border-left-color:#3b82f6; } .rar-rare .feed-prize { color:#3b82f6; }
    .rar-epic { border-left-color:#a855f7; } .rar-epic .feed-prize { color:#a855f7; }
    .rar-legendary { border-left-color:#f5c518; } .rar-legendary .feed-prize { color:#f5c518; }

    .modal-backdrop { position:fixed; inset:0; background:rgb(0 0 0 / .6); display:flex; align-items:center; justify-content:center; z-index:60; padding:16px; }
    .draw-result { background:var(--surface); border:1px solid var(--border); border-radius:18px; padding:28px 24px; max-width:380px; width:100%; text-align:center; }
    .draw-result.rar-rare { border-color:#3b82f6; box-shadow:0 0 40px rgb(59 130 246 / .3); }
    .draw-result.rar-epic { border-color:#a855f7; box-shadow:0 0 40px rgb(168 85 247 / .35); }
    .draw-result.rar-legendary { border-color:#f5c518; box-shadow:0 0 50px rgb(245 197 24 / .4); }
    .result-burst { width:80px; height:80px; margin:0 auto 10px; border-radius:50%; display:flex; align-items:center; justify-content:center;
      background:color-mix(in srgb, var(--accent) 16%, var(--surface-2)); color:var(--accent); animation:pop .4s ease; }
    .result-burst .mi { font-size:44px; }
    @keyframes pop { from { transform:scale(.4); opacity:0; } to { transform:scale(1); opacity:1; } }
    .result-rarity { font-size:11px; font-weight:800; letter-spacing:.15em; color:var(--muted); }
    .result-img { max-width:120px; max-height:120px; object-fit:contain; margin:8px auto; display:block; }
    .result-label { font-size:22px; font-weight:800; margin-top:4px; }
    .result-code { margin-top:14px; padding-top:14px; border-top:1px solid var(--border); }
    .code-row { display:flex; align-items:center; gap:8px; justify-content:center; margin-top:4px; }
    .code-row code { font-size:18px; font-weight:700; letter-spacing:.05em; }
  `],
})
export class DrawComponent implements OnInit, OnDestroy {
  loading = true;
  state: GachaState | null = null;
  today: GachaTodayEntry[] = [];
  spinning = false;
  buying = false;
  buyError: string | null = null;
  result: GachaSpinResult | null = null;
  copied = false;
  resetCountdown = '';
  private resetTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private gacha: GachaService,
    private coins: CoinsService,
    private topup: TopupService,
    private t: TranslateService,
  ) {}

  ngOnInit() {
    this.refresh();
    this.loadToday();
    this.resetTimer = setInterval(() => this.tickReset(), 1000);
  }

  ngOnDestroy() {
    if (this.resetTimer) { clearInterval(this.resetTimer); this.resetTimer = null; }
  }

  private refresh() {
    this.gacha.state().subscribe({
      next: s => { this.state = s; this.loading = false; this.tickReset(); },
      error: () => { this.loading = false; },
    });
  }

  private loadToday() {
    this.gacha.today(20).subscribe({
      next: r => { this.today = r.entries; },
      error: () => { this.today = []; },
    });
  }

  spin() {
    if (!this.state || this.spinning || this.state.totalRemaining <= 0) return;
    this.spinning = true;
    this.buyError = null;
    this.gacha.spin().subscribe({
      next: res => {
        // brief spin animation before revealing
        setTimeout(() => {
          this.spinning = false;
          this.result = res;
          if (this.state) this.state.totalRemaining = res.remaining;
          this.refresh();
          this.loadToday();
        }, 700);
      },
      error: e => {
        this.spinning = false;
        this.buyError = e?.error?.message || this.t.instant('draw.spinError');
      },
    });
  }

  buy(currency: 'coins' | 'meowcoins') {
    if (this.buying) return;
    this.buying = true;
    this.buyError = null;
    this.gacha.buy(1, currency).subscribe({
      next: () => {
        this.buying = false;
        this.refresh();
        // keep header balances in sync
        this.coins.refreshMe().subscribe({ next: () => {}, error: () => {} });
        this.topup.meowcoinsMe().subscribe({ next: () => {}, error: () => {} });
      },
      error: e => {
        this.buying = false;
        const code = e?.error?.message || e?.error?.error;
        this.buyError = this.t.instant('draw.buyErrors.' + code) !== 'draw.buyErrors.' + code
          ? this.t.instant('draw.buyErrors.' + code)
          : (this.t.instant('draw.buyError'));
      },
    });
  }

  closeResult() { this.result = null; this.copied = false; }

  copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      this.copied = true; setTimeout(() => this.copied = false, 2000);
    });
  }

  typeIcon(type: string): string {
    switch (type) {
      case 'coins': return 'paid';
      case 'meowcoins': return 'savings';
      case 'vehicle': return 'directions_car';
      case 'vip': return 'workspace_premium';
      default: return 'inventory_2';
    }
  }

  ago(iso: string): string {
    if (!iso) return '';
    const diff = Math.max(0, Date.now() - new Date(iso).getTime());
    const m = Math.floor(diff / 60000);
    if (m < 1) return this.t.instant('draw.justNow');
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h`;
  }

  private tickReset() {
    if (!this.state) return;
    const diff = new Date(this.state.nextResetAt).getTime() - Date.now();
    const s = Math.max(0, Math.floor(diff / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    this.resetCountdown = `${h}h ${m}m ${sec}s`;
  }
}
