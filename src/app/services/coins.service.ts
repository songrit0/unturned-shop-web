import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { buildPagedParams, normalizePaginated } from './paged-http';

export { Paginated };

export interface CoinsMe { steam_id: string | null; linked: boolean; balance: number; }
export interface MarketLog { id: number; item_id: number; amount: number; coins: number; kind: string; at: string; name?: string; }
export interface ActivityLog { id: number; kind: string; coins: number; at: string; }
export interface CoinStats { window_days: number; net_change: number; credits: number; debits: number; }

export type HistorySource = 'shop' | 'p2p' | 'admin' | 'tax' | 'transfer';
export type HistoryDirection = 'in' | 'out';
export interface HistoryRow {
  at: string;
  source: HistorySource;
  direction: HistoryDirection;
  coins: number;
  label: string;
  item_id: number | null;
  item_name: string | null;
  amount: number | null;
  counterparty: string | null;
}

export interface CoinConfig { transfer_fee: number; transfer_min: number; }
export type TransferTargetType = 'steam' | 'discord';
export interface TransferLookupResult { steam_id: string; discord_id: string | null; name: string; }
export interface TransferResult { balance: number; }

@Injectable({ providedIn: 'root' })
export class CoinsService {
  private _balance$ = new BehaviorSubject<number | null>(null);
  balance$: Observable<number | null> = this._balance$.asObservable();

  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  refreshMe(): Observable<CoinsMe> {
    return this.http.get<CoinsMe>(`${this.apiUrl.get()}/coins/me`).pipe(
      tap(me => this._balance$.next(me.balance)),
    );
  }

  stats(): Observable<CoinStats> {
    return this.http.get<CoinStats>(`${this.apiUrl.get()}/coins/stats`);
  }

  marketHistory(page = 1, limit = 20): Observable<Paginated<MarketLog>> {
    const params = buildPagedParams(page, limit);
    return this.http.get<unknown>(`${this.apiUrl.get()}/coins/history/market`, { params })
      .pipe(map(r => normalizePaginated<MarketLog>(r, limit)));
  }

  activityHistory(page = 1, limit = 20): Observable<Paginated<ActivityLog>> {
    const params = buildPagedParams(page, limit);
    return this.http.get<unknown>(`${this.apiUrl.get()}/coins/history/activity`, { params })
      .pipe(map(r => normalizePaginated<ActivityLog>(r, limit)));
  }

  historyAll(page = 1, limit = 20): Observable<Paginated<HistoryRow>> {
    const params = buildPagedParams(page, limit);
    return this.http.get<unknown>(`${this.apiUrl.get()}/coins/history/all`, { params })
      .pipe(map(r => normalizePaginated<HistoryRow>(r, limit)));
  }

  getCoinConfig(): Observable<CoinConfig> {
    return this.http.get<CoinConfig>(`${this.apiUrl.get()}/coins/config`);
  }

  transferLookup(targetType: TransferTargetType, targetId: string): Observable<TransferLookupResult> {
    return this.http.post<TransferLookupResult>(`${this.apiUrl.get()}/coins/transfer/lookup`, { target_type: targetType, target_id: targetId });
  }

  transfer(targetType: TransferTargetType, targetId: string, amount: number): Observable<TransferResult> {
    return this.http.post<TransferResult>(`${this.apiUrl.get()}/coins/transfer`, { target_type: targetType, target_id: targetId, amount });
  }
}
