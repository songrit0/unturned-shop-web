import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { buildPagedParams, normalizePaginated } from './paged-http';

export { Paginated };

// API contract (unturned-shop-api topup/vcoins controllers; JWT via authInterceptor):
//   POST /topup/create  body { baht } -> TopupCreated (status 'pending', PromptPay QR payload)
//   GET  /topup/:ref               -> TopupStatus
//   GET  /topup/me                 -> paginated TopupRow history
//   GET  /vcoins/me                -> VcoinsMe
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

@Injectable({ providedIn: 'root' })
export class TopupService {
  // Shared Vcoin balance so the header and the top-up page stay in sync.
  private _balance$ = new BehaviorSubject<number | null>(null);
  balance$: Observable<number | null> = this._balance$.asObservable();

  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

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
