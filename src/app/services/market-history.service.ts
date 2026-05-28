import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { buildPagedParams } from './paged-http';

export { Paginated };

export type CandleInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface Candle {
  time: number;   // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  stock: number;
}

export interface Forecast {
  current_price: number;
  ma_7d: number | null;
  ma_30d: number | null;
  projected_price: number;
  trend: 'up' | 'down' | 'stable';
  base_price: number;
  target_stock: number;
  elasticity: number;
  current_stock: number;
}

export interface MarketTxn {
  at: string;
  steam_id: string;
  discord_id?: string | null;
  kind: 'buy' | 'sell';
  amount: number;
  coins: number;
  price_per_unit: number;
  item_id?: number;
  item_name?: string;
  image_url?: string | null;
}

export type TxnPage = Paginated<MarketTxn>;

@Injectable({ providedIn: 'root' })
export class MarketHistoryService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  candles(itemId: number, interval: CandleInterval, from?: string, to?: string): Observable<Candle[]> {
    let params = new HttpParams().set('interval', interval);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<Candle[]>(`${this.apiUrl.get()}/market/${itemId}/candles`, { params });
  }

  forecast(itemId: number): Observable<Forecast> {
    return this.http.get<Forecast>(`${this.apiUrl.get()}/market/${itemId}/forecast`);
  }

  itemTxns(itemId: number, page = 1, limit = 50): Observable<Paginated<MarketTxn>> {
    const params = buildPagedParams(page, limit);
    return this.http.get<Paginated<MarketTxn>>(`${this.apiUrl.get()}/market/${itemId}/transactions`, { params });
  }

  globalTxns(page = 1, limit = 50, kind: 'buy' | 'sell' | 'all' = 'all'): Observable<Paginated<MarketTxn>> {
    const params = buildPagedParams(page, limit, { kind });
    return this.http.get<Paginated<MarketTxn>>(`${this.apiUrl.get()}/market/transactions`, { params });
  }
}
