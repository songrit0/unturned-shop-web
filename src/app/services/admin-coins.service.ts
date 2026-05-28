import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { buildPagedParams, normalizePaginated } from './paged-http';

export { Paginated };

export interface CoinUserRow {
  steam_id: string;
  balance: number;
  discord_id: string | null;
  linked_at: string | null;
}
export type CoinUsersPage = Paginated<CoinUserRow>;
export interface AdjustResult { steam_id: string; balance: number; }
export interface ActivityRow { id: number; kind: string; coins: number; at: string; }

@Injectable({ providedIn: 'root' })
export class AdminCoinsService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  listUsers(page = 1, limit = 20, q = ''): Observable<Paginated<CoinUserRow>> {
    const params = buildPagedParams(page, limit, { q });
    return this.http.get<unknown>(`${this.apiUrl.get()}/admin/coins/users`, { params })
      .pipe(map(r => normalizePaginated<CoinUserRow>(r, limit)));
  }

  adjust(steamId: string, delta: number, reason?: string): Observable<AdjustResult> {
    return this.http.post<AdjustResult>(`${this.apiUrl.get()}/admin/coins/${steamId}/adjust`, { delta, reason });
  }

  history(steamId: string, page = 1, limit = 20): Observable<Paginated<ActivityRow>> {
    const params = buildPagedParams(page, limit);
    return this.http.get<unknown>(`${this.apiUrl.get()}/admin/coins/${steamId}/history`, { params })
      .pipe(map(r => normalizePaginated<ActivityRow>(r, limit)));
  }
}
