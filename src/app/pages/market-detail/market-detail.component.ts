import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CandlestickSeries, createChart, HistogramSeries, IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { MarketItem, MarketService } from '../../services/market.service';
import { Candle, CandleInterval, Forecast, MarketHistoryService, MarketTxn } from '../../services/market-history.service';

const INTERVALS: CandleInterval[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

@Component({
  selector: 'app-market-detail',
  template: `
    <div class="max-w-6xl mx-auto p-4 space-y-4">
      <a routerLink="/shop" class="text-sm text-brand-600 hover:underline flex items-center gap-1 w-fit">
        <span class="mi text-sm">arrow_back</span> {{ 'marketDetail.back' | translate }}
      </a>

      <ng-container *ngIf="item; else loadingTpl">
        <header class="bg-white dark:bg-slate-800 rounded-xl shadow p-4 flex items-center gap-4">
          <div class="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
            <img *ngIf="item.image_url; else noImg" [src]="item.image_url" class="w-full h-full object-contain p-1">
            <ng-template #noImg><span class="mi xl text-slate-400">inventory_2</span></ng-template>
          </div>
          <div class="flex-1 min-w-0">
            <h1 class="text-2xl font-bold flex items-center gap-2">
              {{ item.name }}
              <span *ngIf="item.type_name"
                    class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                {{ item.type_name }}
              </span>
            </h1>
            <p class="text-xs text-slate-500 font-mono">#{{ item.item_id }}</p>
            <div class="mt-2 flex gap-4 text-sm">
              <div>
                <span class="text-slate-500">{{ 'marketDetail.price' | translate }}:</span>
                <span class="font-bold ml-1 flex items-center gap-1 inline-flex">
                  {{ item.price | number }} <span class="mi text-amber-500 text-sm">paid</span>
                </span>
              </div>
              <div>
                <span class="text-slate-500">{{ 'marketDetail.stock' | translate }}:</span>
                <span class="font-medium ml-1">{{ item.amount | number }}</span>
              </div>
            </div>
          </div>
        </header>

        <!-- Chart -->
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow p-4 space-y-3">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <h2 class="font-semibold flex items-center gap-2">
              <span class="mi text-brand-500">candlestick_chart</span>
              {{ 'marketDetail.chart' | translate }}
            </h2>
            <div class="flex gap-1">
              <button *ngFor="let iv of intervals" (click)="changeInterval(iv)"
                      class="text-xs px-2 py-1 rounded font-mono"
                      [class.bg-brand-500]="interval === iv" [class.text-white]="interval === iv"
                      [class.bg-slate-100]="interval !== iv" [class.dark:bg-slate-700]="interval !== iv">
                {{ iv }}
              </button>
            </div>
          </div>
          <div class="relative">
            <div #chartHost class="w-full h-80 min-h-[320px]"></div>
            <div *ngIf="!chartLoading && candles.length === 0"
                 class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span class="mi xl text-slate-300 dark:text-slate-600">candlestick_chart</span>
              <p class="text-slate-400 text-sm mt-2">{{ 'marketDetail.noCandles' | translate }}</p>
            </div>
            <div *ngIf="chartLoading"
                 class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div class="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        </div>

        <!-- Forecast -->
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <h2 class="font-semibold mb-3 flex items-center gap-2">
            <span class="mi text-emerald-500">insights</span>
            {{ 'marketDetail.forecast' | translate }}
          </h2>
          <ng-container *ngIf="forecast; else fcLoading">
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
              <div>
                <p class="text-xs text-slate-500">{{ 'marketDetail.fc.current' | translate }}</p>
                <p class="font-bold text-lg">{{ forecast.current_price | number }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500">{{ 'marketDetail.fc.ma7' | translate }}</p>
                <p class="font-semibold">{{ (forecast.ma_7d | number) || '—' }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500">{{ 'marketDetail.fc.ma30' | translate }}</p>
                <p class="font-semibold">{{ (forecast.ma_30d | number) || '—' }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500">{{ 'marketDetail.fc.projected' | translate }}</p>
                <p class="font-semibold">{{ forecast.projected_price | number }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500">{{ 'marketDetail.fc.trend' | translate }}</p>
                <p class="font-bold flex items-center gap-1"
                   [class.text-emerald-600]="forecast.trend === 'up'"
                   [class.text-rose-600]="forecast.trend === 'down'"
                   [class.text-slate-500]="forecast.trend === 'stable'">
                  <span class="mi">{{ trendIcon(forecast.trend) }}</span>
                  {{ ('marketDetail.fc.' + forecast.trend) | translate }}
                </p>
              </div>
            </div>
          </ng-container>
          <ng-template #fcLoading>
            <p class="text-center text-slate-400 text-sm py-2">{{ 'common.loading' | translate }}</p>
          </ng-template>
        </div>

        <!-- Transactions -->
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden">
          <div class="p-4 flex items-center justify-between">
            <h2 class="font-semibold flex items-center gap-2">
              <span class="mi text-slate-500">receipt_long</span>
              {{ 'marketDetail.transactions' | translate }}
            </h2>
            <span class="text-xs text-slate-500">{{ txnTotal | number }} {{ 'marketDetail.total' | translate }}</span>
          </div>
          <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-700/50 text-left">
              <tr>
                <th class="p-3">{{ 'marketDetail.col.at' | translate }}</th>
                <th class="p-3">{{ 'marketDetail.col.user' | translate }}</th>
                <th class="p-3">{{ 'marketDetail.col.kind' | translate }}</th>
                <th class="p-3 text-right">{{ 'marketDetail.col.qty' | translate }}</th>
                <th class="p-3 text-right">{{ 'marketDetail.col.unit' | translate }}</th>
                <th class="p-3 text-right">{{ 'marketDetail.col.total' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let t of txns" class="border-t border-slate-100 dark:border-slate-700">
                <td class="p-3 text-xs text-slate-500">{{ t.at | date:'short' }}</td>
                <td class="p-3 text-xs font-mono" [title]="t.discord_id || t.steam_id">{{ shortId(t.discord_id || t.steam_id) }}</td>
                <td class="p-3">
                  <span class="text-xs px-2 py-0.5 rounded"
                        [class.bg-emerald-100]="t.kind === 'sell'" [class.text-emerald-700]="t.kind === 'sell'"
                        [class.bg-rose-100]="t.kind === 'buy'" [class.text-rose-700]="t.kind === 'buy'">
                    {{ t.kind }}
                  </span>
                </td>
                <td class="p-3 text-right">{{ t.amount | number }}</td>
                <td class="p-3 text-right text-slate-500">{{ t.price_per_unit | number }}</td>
                <td class="p-3 text-right font-medium">{{ t.coins | number }}</td>
              </tr>
              <tr *ngIf="txns.length === 0 && !txnLoading">
                <td colspan="6" class="p-8 text-center text-slate-400">{{ 'marketDetail.noTxns' | translate }}</td>
              </tr>
            </tbody>
          </table>
          <div *ngIf="txnPages > 1" class="p-3 flex items-center justify-center gap-2 text-sm">
            <button (click)="goPage(txnPage - 1)" [disabled]="txnPage <= 1"
                    class="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 disabled:opacity-50">←</button>
            <span class="text-slate-500">{{ txnPage }} / {{ txnPages }}</span>
            <button (click)="goPage(txnPage + 1)" [disabled]="txnPage >= txnPages"
                    class="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 disabled:opacity-50">→</button>
          </div>
        </div>
      </ng-container>
      <ng-template #loadingTpl>
        <div class="text-center py-12">
          <div class="inline-block w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
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
  ) {}

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
    const dark = document.documentElement.classList.contains('dark');
    this.chart = createChart(host, {
      width: host.clientWidth,
      height: 320,
      layout: {
        background: { color: 'transparent' },
        textColor: dark ? '#cbd5e1' : '#334155',
      },
      grid: {
        vertLines: { color: dark ? '#1e293b' : '#f1f5f9' },
        horzLines: { color: dark ? '#1e293b' : '#f1f5f9' },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
    });
    this.candleSeries = this.chart.addSeries(CandlestickSeries, {
      upColor: '#10b981', downColor: '#ef4444',
      borderUpColor: '#10b981', borderDownColor: '#ef4444',
      wickUpColor: '#10b981', wickDownColor: '#ef4444',
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
