import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { GachaService, GachaState, GachaSpinResult, GachaTodayEntry, PoolPrize } from '../../services/gacha.service';
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
            <div class="reel-viewport" #reel>
              <div class="reel-fade left"></div>
              <div class="reel-fade right"></div>
              <div class="reel-pointer"></div>
              <div class="reel-strip" [class.animating]="reelAnimating" [style.transform]="reelTransform">
                <div class="reel-card" *ngFor="let it of reelItems" [class]="'rar-' + (it.rarity || 'common')">
                  <div class="reel-thumb">
                    <img *ngIf="it.imageUrl; else ri" [src]="it.imageUrl" alt="">
                    <ng-template #ri><span class="mi">{{ typeIcon(it.type) }}</span></ng-template>
                  </div>
                  <div class="reel-label">{{ it.label }}</div>
                </div>
                <div *ngIf="reelItems.length === 0" class="reel-empty muted text-sm">{{ 'draw.spin' | translate }}</div>
              </div>
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

            <div class="draw-spin-row">
              <button class="btn primary lg draw-spin-btn" (click)="spin()" [disabled]="spinning || state.totalRemaining <= 0">
                <span *ngIf="spinning" class="spinner sm"></span>
                <span *ngIf="!spinning" class="mi">casino</span>
                {{ (state.totalRemaining > 0 ? 'draw.spin' : 'draw.noSpins') | translate }}
              </button>
              <button class="btn secondary draw-spinall-btn" *ngIf="state.totalRemaining > 1" (click)="spinAll()" [disabled]="spinning">
                <span class="mi sm">fast_forward</span>
                {{ 'draw.spinAll' | translate:{ n: state.totalRemaining } }}
              </button>
            </div>

            <!-- Spin history chips (multi-spin) -->
            <div class="spin-history" *ngIf="spinHistory.length > 0">
              <div class="spin-chip" *ngFor="let r of spinHistory; let i = index" [class]="'rar-' + (r.prize.rarity || 'common')">
                <div class="chip-thumb">
                  <img *ngIf="r.prize.imageUrl; else ci" [src]="r.prize.imageUrl" alt="">
                  <ng-template #ci><span class="mi sm">{{ typeIcon(r.prize.type) }}</span></ng-template>
                </div>
                <span class="chip-label">{{ r.prize.label }}</span>
                <span class="chip-idx muted text-xs">#{{ i + 1 }}</span>
              </div>
            </div>

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

      <!-- Summary modal (multi-spin) -->
      <div class="modal-backdrop" *ngIf="showSummary" (click)="closeSummary()">
        <div class="modal draw-summary" (click)="$event.stopPropagation()">
          <h2 style="margin:0 0 4px">{{ 'draw.summaryTitle' | translate }}</h2>
          <p class="muted text-sm" style="margin:0 0 14px">{{ spinHistory.length }} {{ 'draw.spinCount' | translate }}</p>
          <div class="summary-list">
            <div class="spin-chip" *ngFor="let r of spinHistory; let i = index" [class]="'rar-' + (r.prize.rarity || 'common')">
              <div class="chip-thumb">
                <img *ngIf="r.prize.imageUrl; else si" [src]="r.prize.imageUrl" alt="">
                <ng-template #si><span class="mi sm">{{ typeIcon(r.prize.type) }}</span></ng-template>
              </div>
              <span class="chip-label">{{ r.prize.label }}</span>
              <code *ngIf="r.prize.code" class="mono chip-code">{{ r.prize.code }}</code>
              <span class="chip-idx muted text-xs">#{{ i + 1 }}</span>
            </div>
          </div>
          <button class="btn primary full" style="margin-top:16px" (click)="closeSummary()">{{ 'draw.ok' | translate }}</button>
        </div>
      </div>

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
              <button class="btn secondary sm" (click)="copyCode('/code ' + result.prize.code!)">
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
    .draw-panel { display:flex; flex-direction:column; align-items:center; gap:16px; padding:28px 16px; text-align:center; }
    .reel-viewport { position:relative; width:100%; max-width:520px; height:124px; overflow:hidden;
      border-radius:14px; border:1px solid var(--border); background:var(--surface-2); }
    .reel-pointer { position:absolute; left:50%; top:0; bottom:0; width:3px; transform:translateX(-50%); z-index:3;
      background:var(--accent); box-shadow:0 0 12px var(--accent); }
    .reel-pointer::before, .reel-pointer::after { content:''; position:absolute; left:50%; transform:translateX(-50%);
      border-left:7px solid transparent; border-right:7px solid transparent; }
    .reel-pointer::before { top:0; border-top:9px solid var(--accent); }
    .reel-pointer::after { bottom:0; border-bottom:9px solid var(--accent); }
    .reel-fade { position:absolute; top:0; bottom:0; width:60px; z-index:2; pointer-events:none; }
    .reel-fade.left { left:0; background:linear-gradient(90deg, var(--surface-2), transparent); }
    .reel-fade.right { right:0; background:linear-gradient(270deg, var(--surface-2), transparent); }
    .reel-strip { display:flex; gap:6px; height:100%; align-items:center; padding:0 6px; will-change:transform; }
    .reel-strip.animating { transition: transform 3.2s cubic-bezier(.10,.72,.16,1); }
    .reel-card { flex:0 0 80px; width:80px; height:96px; border-radius:10px; background:var(--surface);
      border:1px solid var(--border); border-bottom-width:3px; display:flex; flex-direction:column;
      align-items:center; justify-content:center; gap:5px; padding:6px; }
    .reel-thumb { width:46px; height:46px; display:flex; align-items:center; justify-content:center; color:var(--text-faint); }
    .reel-thumb img { max-width:100%; max-height:100%; object-fit:contain; }
    .reel-thumb .mi { font-size:34px; }
    .reel-label { font-size:10px; text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%; font-weight:600; }
    .reel-empty { display:flex; align-items:center; justify-content:center; width:100%; height:100%; }
    .reel-card.rar-common { border-bottom-color:#9ca3af; }
    .reel-card.rar-rare { border-bottom-color:#3b82f6; }
    .reel-card.rar-epic { border-bottom-color:#a855f7; }
    .reel-card.rar-legendary { border-bottom-color:#f5c518; }
    .draw-counts { display:flex; flex-direction:column; align-items:center; }
    .draw-big { font-size:44px; font-weight:800; line-height:1; }
    .draw-breakdown { margin-top:6px; }
    .draw-spin-row { display:flex; flex-direction:column; align-items:center; gap:8px; width:100%; }
    .draw-spin-btn { min-width:220px; }
    .draw-spinall-btn { min-width:180px; }
    .spin-history { width:100%; max-height:200px; overflow-y:auto; display:flex; flex-direction:column; gap:4px; padding-top:12px; border-top:1px solid var(--border); }
    .spin-chip { display:flex; align-items:center; gap:8px; padding:6px 10px; border-radius:8px; background:var(--surface-2); border-left:3px solid var(--border); animation:slideIn .25s ease; font-size:13px; }
    .spin-chip.rar-common { border-left-color:#9ca3af; } .spin-chip.rar-rare { border-left-color:#3b82f6; }
    .spin-chip.rar-epic { border-left-color:#a855f7; } .spin-chip.rar-legendary { border-left-color:#f5c518; }
    @keyframes slideIn { from { opacity:0; transform:translateX(-10px); } to { opacity:1; transform:translateX(0); } }
    .chip-thumb { flex:0 0 28px; width:28px; height:28px; border-radius:6px; background:var(--surface); display:flex; align-items:center; justify-content:center; overflow:hidden; }
    .chip-thumb img { width:100%; height:100%; object-fit:contain; }
    .chip-thumb .mi { font-size:18px; color:var(--text-faint); }
    .chip-label { flex:1; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .chip-code { font-size:11px; color:var(--muted); letter-spacing:.04em; }
    .chip-idx { white-space:nowrap; }
    .draw-summary { background:var(--surface); border:1px solid var(--border); border-radius:18px; padding:24px; max-width:420px; width:100%; text-align:center; }
    .summary-list { max-height:320px; overflow-y:auto; display:flex; flex-direction:column; gap:4px; text-align:left; }
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
  spinQueue: GachaSpinResult[] = [];
  spinHistory: GachaSpinResult[] = [];
  showSummary = false;
  resetCountdown = '';
  private resetTimer: ReturnType<typeof setInterval> | null = null;

  // ---- reel ----
  @ViewChild('reel') reelEl?: ElementRef<HTMLElement>;
  pool: PoolPrize[] = [];
  reelItems: PoolPrize[] = [];
  reelTransform = 'translateX(0px)';
  reelAnimating = false;
  private readonly ITEM_W = 86; // 80px card + 6px gap
  private readonly REEL_LEN = 48;
  private readonly LANDING = 42;

  constructor(
    private gacha: GachaService,
    private coins: CoinsService,
    private topup: TopupService,
    private t: TranslateService,
  ) {}

  ngOnInit() {
    this.refresh();
    this.loadToday();
    this.loadPool();
    this.resetTimer = setInterval(() => this.tickReset(), 1000);
  }

  private loadPool() {
    this.gacha.pool().subscribe({
      next: r => {
        this.pool = r.prizes || [];
        // Idle strip so the reel isn't empty before the first spin.
        if (this.pool.length) this.reelItems = this.buildStrip(12, null);
      },
      error: () => { this.pool = []; },
    });
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

  spin() { this.startSpins(1); }
  spinAll() { this.startSpins(this.state?.totalRemaining ?? 0); }

  private startSpins(count: number) {
    if (!this.state || this.spinning || count <= 0) return;
    this.spinning = true;
    this.buyError = null;
    this.spinHistory = [];
    this.showSummary = false;
    this.result = null;
    this.gacha.spin(count).subscribe({
      next: r => {
        this.spinQueue = r.results.slice(1);
        this.runReel(r.results[0], r.results.length > 1);
      },
      error: e => {
        this.spinning = false;
        this.buyError = e?.error?.message || this.t.instant('draw.spinError');
      },
    });
  }

  /** Build a strip of `n` random pool items; if `won` is given, place it at LANDING. */
  private buildStrip(n: number, won: PoolPrize | null): PoolPrize[] {
    const src = this.pool.length ? this.pool : (won ? [won] : []);
    const items: PoolPrize[] = [];
    for (let i = 0; i < n; i++) {
      items.push(src[Math.floor(Math.random() * src.length)] ?? src[0]);
    }
    if (won) items[this.LANDING] = won;
    return items;
  }

  /** Animate the reel to land on the API's actual result, then reveal it. */
  private runReel(res: GachaSpinResult, isMulti = false) {
    const won: PoolPrize = {
      type: res.prize.type, label: res.prize.label, amount: res.prize.amount,
      imageUrl: res.prize.imageUrl, rarity: res.prize.rarity,
    };
    this.reelItems = this.buildStrip(this.REEL_LEN, won);
    // reset to start with no animation
    this.reelAnimating = false;
    this.reelTransform = 'translateX(0px)';
    setTimeout(() => {
      const vw = this.reelEl?.nativeElement.clientWidth ?? 520;
      const center = this.LANDING * this.ITEM_W + this.ITEM_W / 2; // center of the winning card
      const jitter = Math.floor(Math.random() * 40) - 20;          // land slightly off dead-center
      const tx = vw / 2 - center + jitter;
      this.reelAnimating = true;
      this.reelTransform = `translateX(${tx}px)`;
    }, 50);
    setTimeout(() => {
      if (this.state) this.state.totalRemaining = res.remaining;
      if (this.spinQueue.length > 0) {
        this.spinHistory = [...this.spinHistory, res];
        const next = this.spinQueue.shift()!;
        setTimeout(() => this.runReel(next, true), 500);
      } else if (isMulti) {
        this.spinning = false;
        this.spinHistory = [...this.spinHistory, res];
        this.showSummary = true;
        this.refresh();
        this.loadToday();
      } else {
        this.spinning = false;
        this.result = res;
        this.refresh();
        this.loadToday();
      }
    }, 3400);
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
  closeSummary() { this.showSummary = false; this.spinHistory = []; }

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
    // Backend ส่ง timestamp เป็น UTC แต่บางครั้งไม่มี timezone designator (Z/offset)
    // ถ้าไม่มี ให้ถือว่าเป็น UTC เพื่อกัน JS ตีความเป็นเวลา local
    const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso);
    const normalized = hasTz ? iso : iso.replace(' ', 'T') + 'Z';
    return new Date(normalized).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
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
