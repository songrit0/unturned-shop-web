import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { buildPagedParams } from './paged-http';

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
    return this.http.get<Paginated<CoinUserRow>>(`${this.apiUrl.get()}/admin/coins/users`, { params });
  }

  adjust(steamId: string, delta: number, reason?: string): Observable<AdjustResult> {
    return this.http.post<AdjustResult>(`${this.apiUrl.get()}/admin/coins/${steamId}/adjust`, { delta, reason });
  }

  history(steamId: string, page = 1, limit = 20): Observable<Paginated<ActivityRow>> {
    const params = buildPagedParams(page, limit);
    return this.http.get<Paginated<ActivityRow>>(`${this.apiUrl.get()}/admin/coins/${steamId}/history`, { params });
  }
}
