import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { buildPagedParams } from './paged-http';

export { Paginated };

export interface CoinsMe { steam_id: string | null; linked: boolean; balance: number; }
export interface MarketLog { id: number; item_id: number; amount: number; coins: number; kind: string; at: string; name?: string; }
export interface ActivityLog { id: number; kind: string; coins: number; at: string; }

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

  marketHistory(page = 1, limit = 20): Observable<Paginated<MarketLog>> {
    const params = buildPagedParams(page, limit);
    return this.http.get<Paginated<MarketLog>>(`${this.apiUrl.get()}/coins/history/market`, { params });
  }

  activityHistory(page = 1, limit = 20): Observable<Paginated<ActivityLog>> {
    const params = buildPagedParams(page, limit);
    return this.http.get<Paginated<ActivityLog>>(`${this.apiUrl.get()}/coins/history/activity`, { params });
  }
}
