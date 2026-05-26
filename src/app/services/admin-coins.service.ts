import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from './api-url.service';

export interface CoinUserRow {
  steam_id: string;
  balance: number;
  discord_id: string | null;
  linked_at: string | null;
}
export interface CoinUsersPage {
  items: CoinUserRow[];
  total: number; page: number; limit: number; pages: number;
}
export interface AdjustResult { steam_id: string; balance: number; }
export interface ActivityRow { id: number; kind: string; coins: number; at: string; }

@Injectable({ providedIn: 'root' })
export class AdminCoinsService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  listUsers(page = 1, limit = 20, q = ''): Observable<CoinUsersPage> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (q) params = params.set('q', q);
    return this.http.get<CoinUsersPage>(`${this.apiUrl.get()}/admin/coins/users`, { params });
  }

  adjust(steamId: string, delta: number, reason?: string): Observable<AdjustResult> {
    return this.http.post<AdjustResult>(`${this.apiUrl.get()}/admin/coins/${steamId}/adjust`, { delta, reason });
  }

  history(steamId: string, limit = 30): Observable<ActivityRow[]> {
    return this.http.get<ActivityRow[]>(`${this.apiUrl.get()}/admin/coins/${steamId}/history`, { params: { limit } });
  }
}
