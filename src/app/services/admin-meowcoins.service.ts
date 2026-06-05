import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { buildPagedParams, normalizePaginated } from './paged-http';

export { Paginated };

// Admin Meowcoin tooling (unturned-shop-api, JWT + AdminGuard server-side; JWT via authInterceptor).
//   GET  /admin/meowcoins/topups?status=&q=&page=&limit=  -> Paginated<AdminTopupRow>
//   GET  /admin/meowcoins/wallet/:steamId                 -> AdminMeowcoinWallet (balance + latest 50 log)
//   POST /admin/meowcoins/adjust  { steam_id, delta, reason? }   -> AdjustResult (delta may be negative)
//   POST /admin/meowcoins/set     { steam_id, balance, reason? } -> AdjustResult (absolute set)
//   GET  /admin/meowcoins/providers               -> AdminProviderRow[] (all providers incl. disabled)
//   POST /admin/meowcoins/providers { key, enabled } -> on/off toggle (disabling hides it from players)
//
// IMPORTANT: baht / unique_amount / meowcoins / balance / delta arrive as STRINGS (DECIMAL/BIGINT).
// Coerce with Number() before display/math.

export type AdminTopupStatus =
  | 'pending' | 'confirmed' | 'credited' | 'expired' | 'cancelled' | 'failed';

export interface AdminTopupRow {
  id: number;
  ref: string;
  steam_id: string;
  discord_name: string | null;
  baht: string | number;
  unique_amount: string | number;
  meowcoins: string | number;
  status: AdminTopupStatus;
  created_at: string;
  confirmed_at: string | null;
  credited_at: string | null;
}

export interface AdminMeowcoinLogRow {
  delta: string | number;
  reason: string | null;
  ref: string | null;
  actor: string | null;
  at: string;
}

export interface AdminMeowcoinWallet {
  steam_id: string;
  discord_name: string | null;
  balance: string | number;
  log: AdminMeowcoinLogRow[];
}

export interface AdjustResult {
  steam_id: string;
  balance: string | number;
}

export interface AdminProviderRow {
  key: string;
  label: string;
  enabled: boolean;
  sort: number;
}

@Injectable({ providedIn: 'root' })
export class AdminMeowcoinsService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  /** Paginated top-up list. `status` of '' / 'all' returns every status. */
  listTopups(page = 1, limit = 20, status = '', q = ''): Observable<Paginated<AdminTopupRow>> {
    const params = buildPagedParams(page, limit, {
      status: status && status !== 'all' ? status : '',
      q,
    });
    return this.http.get<unknown>(`${this.apiUrl.get()}/admin/meowcoins/topups`, { params })
      .pipe(map(r => normalizePaginated<AdminTopupRow>(r, limit)));
  }

  /** A player's Meowcoin wallet: current balance + latest 50 log entries (newest first). */
  wallet(steamId: string): Observable<AdminMeowcoinWallet> {
    return this.http.get<AdminMeowcoinWallet>(`${this.apiUrl.get()}/admin/meowcoins/wallet/${encodeURIComponent(steamId)}`);
  }

  /** Relative change (delta may be negative; balance may go negative — intended). */
  adjust(steam_id: string, delta: number, reason?: string): Observable<AdjustResult> {
    return this.http.post<AdjustResult>(`${this.apiUrl.get()}/admin/meowcoins/adjust`, { steam_id, delta, reason });
  }

  /** Absolute set (balance may be negative — intended). */
  set(steam_id: string, balance: number, reason?: string): Observable<AdjustResult> {
    return this.http.post<AdjustResult>(`${this.apiUrl.get()}/admin/meowcoins/set`, { steam_id, balance, reason });
  }

  // ---- Payment providers ----
  /** All providers (including disabled), ordered by sort. */
  listProviders(): Observable<AdminProviderRow[]> {
    return this.http.get<AdminProviderRow[]>(`${this.apiUrl.get()}/admin/meowcoins/providers`)
      .pipe(map(r => Array.isArray(r) ? r : []));
  }

  /** Enable/disable a provider. Disabling hides it from the players' top-up page. */
  setProvider(key: string, enabled: boolean): Observable<unknown> {
    return this.http.post(`${this.apiUrl.get()}/admin/meowcoins/providers`, { key, enabled });
  }
}
