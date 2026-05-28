import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CandlestickSeries, createChart, HistogramSeries, IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { MarketItem, MarketService } from '../../services/market.service';
import { Candle, CandleInterval, Forecast, MarketHistoryService, MarketTxn } from '../../services/market-history.service';
import { BasketService } from '../../services/basket.service';

const INTERVALS: CandleInterval[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

@Component({
  selector: 'app-market-detail',
  template: `
    <div class="page">
      <a routerLink="/shop" class="btn ghost sm mb-4">
        <span class="mi sm">arrow_back</span>{{ 'marketDetail.back' | translate }}
      </a>

      <ng-container *ngIf="item; else loadingTpl">
        <div class="card tactical mb-4">
          <div class="row gap-4 wrap">
            <div style="width:120px; height:120px; background: linear-gradient(135deg, var(--surface-2), var(--surface-3)); border:1px solid var(--border); border-radius: var(--radius); display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0;">
              <img *ngIf="item.image_url; else noImg" [src]="item.image_url" style="max-width:90%; max-height:90%; object-fit:contain;">
              <ng-template #noImg><span class="mi xxl faint">inventory_2</span></ng-template>
            </div>
            <div class="grow" style="min-width:0;">
              <div class="row gap-2 mb-2">
                <span *ngIf="item.type_name" class="badge violet">{{ item.type_name }}</span>
                <span class="mono faint text-xs">#{{ item.item_id }}</span>
              </div>
              <h1>{{ item.name }}</h1>
              <div class="row gap-4 mt-3 wrap">
                <div class="col gap-1">
                  <span class="stat-label">{{ 'marketDetail.price' | translate }}</span>
                  <span class="coin-amt lg">{{ item.price | number }} <span class="mi fill">paid</span></span>
                </div>
                <div class="col gap-1">
                  <span class="stat-label">{{ 'marketDetail.stock' | translate }}</span>
                  <span class="mono fw-7" style="font-size:22px;">{{ item.amount | number }}</span>
                </div>
              </div>
            </div>
            <button class="btn primary lg" (click)="addToCart()" [disabled]="item.amount <= 0">
              <span class="mi">add_shopping_cart</span>{{ 'shop.addToCart' | translate }}
            </button>
          </div>
        </div>

        <div class="card mb-4">
          <div class="card-title">
            <span class="mi">candlestick_chart</span>{{ 'marketDetail.chart' | translate }}
            <div class="segmented right">
              <button *ngFor="let iv of intervals" [class.active]="interval === iv" (click)="changeInterval(iv)" class="mono">{{ iv }}</button>
            </div>
          </div>
          <div style="position:relative;">
            <div #chartHost style="width:100%; height:320px;"></div>
            <div *ngIf="!chartLoading && candles.length === 0" class="empty" style="position:absolute; inset:0; padding:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none;">
              <span class="mi xxl">candlestick_chart</span>
              <div class="muted text-sm mt-2">{{ 'marketDetail.noCandles' | translate }}</div>
            </div>
            <div *ngIf="chartLoading" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center;">
              <div class="spinner"></div>
            </div>
          </div>
        </div>

        <div class="card mb-4">
          <div class="card-title"><span class="mi">insights</span>{{ 'marketDetail.forecast' | translate }}</div>
          <ng-container *ngIf="forecast; else fcLoading">
            <div class="stats-strip" style="grid-template-columns: repeat(5, 1fr); margin-top:0;">
              <div class="stat">
                <span class="stat-label">{{ 'marketDetail.fc.current' | translate }}</span>
                <span class="stat-value mono">{{ forecast.current_price | number }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">{{ 'marketDetail.fc.ma7' | translate }}</span>
                <span class="stat-value mono">{{ (forecast.ma_7d | number) || '—' }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">{{ 'marketDetail.fc.ma30' | translate }}</span>
                <span class="stat-value mono">{{ (forecast.ma_30d | number) || '—' }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">{{ 'marketDetail.fc.projected' | translate }}</span>
                <span class="stat-value mono" style="color:var(--accent-hi);">{{ forecast.projected_price | number }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">{{ 'marketDetail.fc.trend' | translate }}</span>
                <span class="stat-value mono"
                      [style.color]="forecast.trend === 'up' ? 'var(--emerald)' : forecast.trend === 'down' ? 'var(--rose)' : 'var(--text-muted)'">
                  <span class="mi">{{ trendIcon(forecast.trend) }}</span>
                  {{ ('marketDetail.fc.' + forecast.trend) | translate }}
                </span>
              </div>
            </div>
          </ng-container>
          <ng-template #fcLoading>
            <p class="muted text-sm" style="text-align:center;">{{ 'common.loading' | translate }}</p>
          </ng-template>
        </div>

        <div class="card flush">
          <div class="row between" style="padding:14px 20px;">
            <div class="card-title" style="margin:0;"><span class="mi">receipt_long</span>{{ 'marketDetail.transactions' | translate }}</div>
            <span class="badge slate mono">{{ txnTotal | number }} {{ 'marketDetail.total' | translate }}</span>
          </div>
          <div class="table-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>{{ 'marketDetail.col.at' | translate }}</th>
                <th>{{ 'marketDetail.col.user' | translate }}</th>
                <th>{{ 'marketDetail.col.kind' | translate }}</th>
                <th class="r">{{ 'marketDetail.col.qty' | translate }}</th>
                <th class="r">{{ 'marketDetail.col.unit' | translate }}</th>
                <th class="r">{{ 'marketDetail.col.total' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let t of txns">
                <td class="mono muted text-xs">{{ t.at | date:'short' }}</td>
                <td class="mono text-xs" [title]="t.discord_id || t.steam_id">{{ shortId(t.discord_id || t.steam_id) }}</td>
                <td><span class="badge" [class.emerald]="t.kind === 'sell'" [class.rose]="t.kind === 'buy'">{{ t.kind }}</span></td>
                <td class="r mono">{{ t.amount | number }}</td>
                <td class="r mono muted">{{ t.price_per_unit | number }}</td>
                <td class="r mono fw-6">{{ t.coins | number }}</td>
              </tr>
              <tr *ngIf="txns.length === 0 && !txnLoading">
                <td colspan="6" style="text-align:center; padding:32px;" class="muted">{{ 'marketDetail.noTxns' | translate }}</td>
              </tr>
            </tbody>
          </table>
          </div>
          <div *ngIf="txnPages > 1" class="row gap-2" style="justify-content:center; padding:12px;">
            <button class="btn ghost sm" (click)="goPage(txnPage - 1)" [disabled]="txnPage <= 1">←</button>
            <span class="muted mono">{{ txnPage }} / {{ txnPages }}</span>
            <button class="btn ghost sm" (click)="goPage(txnPage + 1)" [disabled]="txnPage >= txnPages">→</button>
          </div>
        </div>
      </ng-container>
      <ng-template #loadingTpl>
        <div class="empty"><div class="spinner"></div></div>
      </ng-template>
    </div>
  `,
})
export class MarketDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartHost') chartHost?: ElementRef<HTMLDivElement>;

  itemId!: number;
  item: MarketItem | null = null;
  intervals = INTERVALS;
  interval: CandleInterval = '1h';

  candles: Candle[] = [];
  chartLoading = false;
  forecast: Forecast | null = null;

  txns: MarketTxn[] = [];
  txnPage = 1;
  txnLimit = 25;
  txnTotal = 0;
  txnPages = 1;
  txnLoading = false;

  private chart: IChartApi | null = null;
  private candleSeries: ISeriesApi<'Candlestick'> | null = null;
  private volumeSeries: ISeriesApi<'Histogram'> | null = null;
  private resizeObs?: ResizeObserver;

  constructor(
    private route: ActivatedRoute,
    private market: MarketService,
    private hist: MarketHistoryService,
    private basket: BasketService,
  ) {}

  addToCart() { if (this.item) this.basket.add(this.item.item_id).subscribe(() => this.basket.setOpen(true)); }

  ngOnInit() {
    this.itemId = Number(this.route.snapshot.paramMap.get('id'));
    this.market.get(this.itemId).subscribe({
      next: it => {
        this.item = it;
        // Item drives *ngIf="item" — chart host renders on next CD.
        setTimeout(() => this.tryInitChart(), 0);
      },
      error: () => { this.item = null; },
    });
    this.loadCandles();
    this.loadForecast();
    this.loadTxns();
  }

  ngAfterViewInit() { setTimeout(() => this.tryInitChart(), 0); }

  ngOnDestroy() {
    this.resizeObs?.disconnect();
    this.chart?.remove();
    this.chart = null;
  }

  private tryInitChart() {
    if (this.chart || !this.chartHost || !this.item) return;
    const host = this.chartHost.nativeElement;
    const dark = document.body.classList.contains('theme-dark');
    this.chart = createChart(host, {
      width: host.clientWidth,
      height: 320,
      layout: {
        background: { color: 'transparent' },
        textColor: dark ? '#94a3b8' : '#6b7280',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: dark ? '#1f2c47' : '#e6e2d4', style: 1 },
        horzLines: { color: dark ? '#1f2c47' : '#e6e2d4', style: 1 },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
    });
    this.candleSeries = this.chart.addSeries(CandlestickSeries, {
      upColor: '#10b981', downColor: '#f43f5e',
      borderUpColor: '#10b981', borderDownColor: '#f43f5e',
      wickUpColor: '#10b981', wickDownColor: '#f43f5e',
    });
    this.volumeSeries = this.chart.addSeries(HistogramSeries, {
      color: '#6366f1',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    this.volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    this.resizeObs = new ResizeObserver(() => {
      if (this.chart && host.clientWidth > 0) {
        this.chart.applyOptions({ width: host.clientWidth });
        if (this.candles.length > 0) this.chart.timeScale().fitContent();
      }
    });
    this.resizeObs.observe(host);

    // Apply any candles that loaded before the chart was ready.
    if (this.candles.length > 0) this.applyCandles();
  }

  changeInterval(iv: CandleInterval) {
    if (this.interval === iv) return;
    this.interval = iv;
    this.loadCandles();
  }

  private loadCandles() {
    this.chartLoading = true;
    this.hist.candles(this.itemId, this.interval).subscribe({
      next: data => {
        const arr = Array.isArray(data) ? data : [];
        // eslint-disable-next-line no-console
        console.log('[chart] received', arr.length, 'candles, first:', arr[0], 'chartReady:', !!this.candleSeries);
        this.candles = arr;
        this.chartLoading = false;
        this.applyCandles();
      },
      error: err => {
        // eslint-disable-next-line no-console
        console.warn('[chart] candles fetch failed', err);
        this.candles = []; this.chartLoading = false; this.applyCandles();
      },
    });
  }

  private applyCandles() {
    if (!this.candleSeries || !this.volumeSeries) {
      // eslint-disable-next-line no-console
      console.log('[chart] applyCandles skipped — series not ready yet, candles:', this.candles.length);
      return;
    }
    // Defensive: dedupe by time (lightweight-charts throws on duplicates) + sort ASC.
    const seen = new Set<number>();
    const sorted = [...this.candles]
      .map(c => ({ ...c, time: Number(c.time) }))
      .filter(c => Number.isFinite(c.time) && !seen.has(c.time) && seen.add(c.time))
      .sort((a, b) => a.time - b.time);

    this.candleSeries.setData(sorted.map(c => ({
      time: c.time as Time,
      open: Number(c.open), high: Number(c.high), low: Number(c.low), close: Number(c.close),
    })));
    this.volumeSeries.setData(sorted.map(c => ({
      time: c.time as Time,
      value: Number(c.volume) || 0,
      color: c.close >= c.open ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)',
    })));
    this.chart?.timeScale().fitContent();
    // eslint-disable-next-line no-console
    console.log('[chart] setData done with', sorted.length, 'candles');
  }

  private loadForecast() {
    this.hist.forecast(this.itemId).subscribe({
      next: f => this.forecast = f,
      error: () => this.forecast = null,
    });
  }

  private loadTxns() {
    this.txnLoading = true;
    this.hist.itemTxns(this.itemId, this.txnPage, this.txnLimit).subscribe({
      next: p => {
        this.txns = p.items;
        this.txnTotal = p.total;
        this.txnPages = Math.max(1, Math.ceil(p.total / this.txnLimit));
        this.txnLoading = false;
      },
      error: () => { this.txns = []; this.txnLoading = false; },
    });
  }

  goPage(p: number) {
    if (p < 1 || p > this.txnPages || p === this.txnPage) return;
    this.txnPage = p;
    this.loadTxns();
  }

  trendIcon(t: 'up' | 'down' | 'stable'): string {
    return t === 'up' ? 'trending_up' : t === 'down' ? 'trending_down' : 'trending_flat';
  }

  shortId(id: string | null | undefined): string {
    if (!id) return '';
    return id.length > 8 ? '…' + id.slice(-6) : id;
  }
}
