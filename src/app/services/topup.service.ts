import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { buildPagedParams, normalizePaginated } from './paged-http';

export { Paginated };

// API contract (unturned-shop-api topup/vcoins controllers; JWT via authInterceptor):
//   POST /topup/create  body { baht } -> TopupCreated (status 'pending', PromptPay QR payload)
//                                        (403 topup_admin_only for non-admins while admin_only is on)
//   GET  /topup/:ref               -> TopupStatus
//   GET  /topup/me                 -> paginated TopupRow history
//   GET  /vcoins/me                -> VcoinsMe
//   GET  /config/topup             -> TopupConfig (PUBLIC, no auth) — soft-launch gate flag
//
// Vcoins are a SEPARATE currency from in-game coins. unique_amount is the EXACT baht the
// user must transfer (the cents are a per-ref discriminator the backend reconciles on).

export type TopupStatus =
  | 'pending'    // QR shown, waiting for payment
  | 'confirmed'  // payment seen, crediting in progress
  | 'credited'   // vcoins credited to the account (terminal success)
  | 'expired'    // QR window elapsed without payment (terminal)
  | 'cancelled'; // cancelled (terminal)

export interface TopupCreated {
  ref: string;
  unique_amount: number;       // exact baht to transfer
  qr_code: string;             // PromptPay EMVCo payload to render as a QR
  promptpay_id: string;
  expires_at: string;          // ISO
  vcoins: number;              // vcoins this top-up will credit
  status: TopupStatus;
}

export interface TopupState {
  ref: string;
  status: TopupStatus;
  unique_amount: number;
  vcoins: number;
  expires_at: string;
  credited_at: string | null;
}

export interface TopupRow {
  ref: string;
  status: TopupStatus;
  unique_amount: number;
  vcoins: number;
  expires_at: string;
  credited_at: string | null;
  created_at?: string;
}

export interface VcoinsMe {
  steam_id: string | null;
  balance: number;
}

// Soft-launch gate + rate/limits from GET /config/topup (public).
// While `admin_only` is true, only admins may create top-ups (API enforces with 403
// topup_admin_only). Flip TOPUP_ADMIN_ONLY=false on the API to open it to everyone — the UI
// reacts automatically, no web redeploy needed.
export interface TopupConfig {
  admin_only: boolean;
  vcoin_per_baht: number;
  min_baht: number;
  max_baht: number;
}

// Conservative fallback if /config/topup is unreachable: stay locked (admin_only true) so a
// failed fetch can never accidentally expose a feature that's meant to be gated.
const TOPUP_CONFIG_FALLBACK: TopupConfig = {
  admin_only: true,
  vcoin_per_baht: 1,
  min_baht: 1,
  max_baht: 100000,
};

@Injectable({ providedIn: 'root' })
export class TopupService {
  // Shared Vcoin balance so the header and the top-up page stay in sync.
  private _balance$ = new BehaviorSubject<number | null>(null);
  balance$: Observable<number | null> = this._balance$.asObservable();

  // Cached, shared config stream — /config/topup is fetched at most once per session.
  private config$?: Observable<TopupConfig>;

  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  // ---- Config (soft-launch gate) ----
  /**
   * Fetch + cache the top-up config. Shared via shareReplay so guard, sidebar, header and the
   * page all hit the endpoint once. On error falls back to a locked config (admin_only: true).
   */
  getTopupConfig(): Observable<TopupConfig> {
    if (!this.config$) {
      this.config$ = this.http.get<Partial<TopupConfig>>(`${this.apiUrl.get()}/config/topup`).pipe(
        map(r => ({
          admin_only: r?.admin_only !== false,                          // default locked unless explicitly false
          vcoin_per_baht: Number(r?.vcoin_per_baht) > 0 ? Number(r!.vcoin_per_baht) : 1,
          min_baht: Number(r?.min_baht) > 0 ? Number(r!.min_baht) : 1,
          max_baht: Number(r?.max_baht) > 0 ? Number(r!.max_baht) : TOPUP_CONFIG_FALLBACK.max_baht,
        } as TopupConfig)),
        catchError(() => of(TOPUP_CONFIG_FALLBACK)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.config$;
  }

  // ---- Vcoins ----
  vcoinsMe(): Observable<VcoinsMe> {
    return this.http.get<VcoinsMe>(`${this.apiUrl.get()}/vcoins/me`).pipe(
      tap(me => this._balance$.next(me.balance)),
    );
  }

  // ---- Top-up ----
  create(baht: number): Observable<TopupCreated> {
    return this.http.post<TopupCreated>(`${this.apiUrl.get()}/topup/create`, { baht });
  }

  status(ref: string): Observable<TopupState> {
    return this.http.get<TopupState>(`${this.apiUrl.get()}/topup/${encodeURIComponent(ref)}`);
  }

  history(page = 1, limit = 20): Observable<Paginated<TopupRow>> {
    const params = buildPagedParams(page, limit);
    return this.http.get<unknown>(`${this.apiUrl.get()}/topup/me`, { params })
      .pipe(map(r => normalizePaginated<TopupRow>(r, limit)));
  }
}
