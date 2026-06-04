import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { buildPagedParams, normalizePaginated } from './paged-http';

export { Paginated };

// Admin Vcoin tooling (unturned-shop-api, JWT + AdminGuard server-side; JWT via authInterceptor).
//   GET  /admin/vcoins/topups?status=&q=&page=&limit=  -> Paginated<AdminTopupRow>
//   GET  /admin/vcoins/wallet/:steamId                 -> AdminVcoinWallet (balance + latest 50 log)
//   POST /admin/vcoins/adjust  { steam_id, delta, reason? }   -> AdjustResult (delta may be negative)
//   POST /admin/vcoins/set     { steam_id, balance, reason? } -> AdjustResult (absolute set)
//
// IMPORTANT: baht / unique_amount / vcoins / balance / delta arrive as STRINGS (DECIMAL/BIGINT).
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
  vcoins: string | number;
  status: AdminTopupStatus;
  created_at: string;
  confirmed_at: string | null;
  credited_at: string | null;
}

export interface AdminVcoinLogRow {
  delta: string | number;
  reason: string | null;
  ref: string | null;
  actor: string | null;
  at: string;
}

export interface AdminVcoinWallet {
  steam_id: string;
  discord_name: string | null;
  balance: string | number;
  log: AdminVcoinLogRow[];
}

export interface AdjustResult {
  steam_id: string;
  balance: string | number;
}

@Injectable({ providedIn: 'root' })
export class AdminVcoinsService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  /** Paginated top-up list. `status` of '' / 'all' returns every status. */
  listTopups(page = 1, limit = 20, status = '', q = ''): Observable<Paginated<AdminTopupRow>> {
    const params = buildPagedParams(page, limit, {
      status: status && status !== 'all' ? status : '',
      q,
    });
    return this.http.get<unknown>(`${this.apiUrl.get()}/admin/vcoins/topups`, { params })
      .pipe(map(r => normalizePaginated<AdminTopupRow>(r, limit)));
  }

  /** A player's Vcoin wallet: current balance + latest 50 log entries (newest first). */
  wallet(steamId: string): Observable<AdminVcoinWallet> {
    return this.http.get<AdminVcoinWallet>(`${this.apiUrl.get()}/admin/vcoins/wallet/${encodeURIComponent(steamId)}`);
  }

  /** Relative change (delta may be negative; balance may go negative — intended). */
  adjust(steam_id: string, delta: number, reason?: string): Observable<AdjustResult> {
    return this.http.post<AdjustResult>(`${this.apiUrl.get()}/admin/vcoins/adjust`, { steam_id, delta, reason });
  }

  /** Absolute set (balance may be negative — intended). */
  set(steam_id: string, balance: number, reason?: string): Observable<AdjustResult> {
    return this.http.post<AdjustResult>(`${this.apiUrl.get()}/admin/vcoins/set`, { steam_id, balance, reason });
  }
}
