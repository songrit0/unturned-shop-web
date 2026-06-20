import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { buildPagedParams, normalizePaginated } from './paged-http';

export { Paginated };

// API contract (unturned-shop-api topup/meowcoins controllers; JWT via authInterceptor):
//   POST /topup/create  body { baht, provider } -> TopupCreated (status 'pending')
//                                        (403 topup_admin_only for non-admins while admin_only is on)
//   POST /topup/thunder/verify { ref, slip_base64 } -> ThunderVerifyResult | 400 { reason }
//   GET  /topup/:ref               -> TopupStatus (plernpay polling only)
//   GET  /topup/me                 -> paginated TopupRow history
//   GET  /meowcoins/me             -> MeowcoinsMe
//   GET  /config/topup             -> TopupConfig (PUBLIC, no auth) — gate flag + enabled providers
//
// Meowcoins are a SEPARATE currency from in-game coins. unique_amount is the EXACT baht the
// user must transfer (the cents are a per-ref discriminator the backend reconciles on).

export type TopupProvider = 'plernpay' | 'thunder';

export type TopupStatus =
  | 'pending'    // QR shown, waiting for payment
  | 'confirmed'  // payment seen, crediting in progress
  | 'credited'   // meowcoins credited to the account (terminal success)
  | 'expired'    // QR window elapsed without payment (terminal)
  | 'cancelled'; // cancelled (terminal)

// create() response. Shape depends on `provider`:
//   plernpay -> unique_amount (exact baht to transfer, cents are the discriminator), polled via /topup/:ref.
//   thunder  -> amount (baht) + receiver_name; credited by uploading a slip to /topup/thunder/verify.
// Both carry qr_code (PromptPay EMVCo payload), promptpay_id, expires_at, meowcoins.
export interface TopupCreated {
  ref: string;
  provider: TopupProvider;
  qr_code: string;             // PromptPay EMVCo payload to render as a QR
  promptpay_id: string;
  expires_at: string;          // ISO
  meowcoins: number;           // meowcoins this top-up will credit
  status: TopupStatus;
  // plernpay only:
  unique_amount?: number;      // exact baht to transfer
  // thunder only:
  amount?: number;             // baht to transfer
  receiver_name?: string;      // account holder name to verify against
}

// Thunder slip-verify reasons (HTTP 400 body `{ reason }`).
export type ThunderVerifyReason =
  | 'slip_not_matched' | 'amount_mismatch' | 'duplicate_slip' | 'slip_already_used'
  | 'slip_not_found' | 'slip_pending' | 'quota_exceeded';

export interface ThunderVerifyResult {
  ref: string;
  status: 'credited';
  meowcoins: number;
  balance: number;
}

export interface TopupState {
  ref: string;
  status: TopupStatus;
  unique_amount: number;
  meowcoins: number;
  expires_at: string;
  credited_at: string | null;
}

export interface TopupRow {
  ref: string;
  status: TopupStatus;
  unique_amount: number;
  meowcoins: number;
  expires_at: string;
  credited_at: string | null;
  created_at?: string;
}

export interface MeowcoinsMe {
  steam_id: string | null;
  balance: number;
}

// One ENABLED provider option from GET /config/topup (already filtered + ordered server-side).
export interface TopupProviderOption {
  key: TopupProvider;
  label: string;
}

// Soft-launch gate + rate/limits + enabled providers from GET /config/topup (public).
// While `admin_only` is true, only admins may create top-ups (API enforces with 403
// topup_admin_only). Flip TOPUP_ADMIN_ONLY=false on the API to open it to everyone — the UI
// reacts automatically, no web redeploy needed.
export interface TopupConfig {
  admin_only: boolean;
  meowcoin_per_baht: number;
  min_baht: number;
  max_baht: number;
  providers: TopupProviderOption[];   // enabled providers, ordered
  monthly_cap_baht: number;           // per-user donation cap per month (baht)
  monthly_goal_baht: number;          // community fundraising goal per month (baht)
  // BuyMeACoffee donate link — null when the admin hasn't set BMC_PAGE_URL. Unlike the providers
  // above this is NOT a create-intent flow: it's a plain external link. The donor must put their
  // steamID64 in the BMC supporter message; the API's webhook credits that account automatically.
  bmc_page_url: string | null;
}

export type BmcClaimStatus = 'pending' | 'approved' | 'rejected';

/** GET /topup/bmc/claims item — the donor's own view of a manual-claim ticket. */
export interface BmcClaim {
  id: number;
  status: BmcClaimStatus;
  note: string | null;
  credited_meowcoins: number | null;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

// ---- Donate / Battlepass (GET /donate/progress) ----
// One reward bundled inside a tier (item or vehicle), resolved with display name + image.
export interface DonateReward {
  kind: 'item' | 'vehicle';
  item_id: number;
  amount: number;
  quality: number;
  name: string | null;
  image_url: string | null;
}

// One battlepass tier. `unlocked` is server-derived from this month's cumulative donation;
// `claimed`/`code` reflect whether the user has already claimed the reward code.
export interface DonateTier {
  id: number;
  threshold_baht: number;
  name: string;
  sort: number;
  rewards: DonateReward[];
  unlocked: boolean;
  claimed: boolean;
  code: string | null;
}

// GET /donate/progress (auth): this month's user + community totals and the tier track.
export interface DonateProgress {
  period: string;                 // 'YYYY-MM'
  user_donated: number;
  user_cap: number;
  user_remaining: number;
  community_total: number;
  community_goal: number;
  tiers: DonateTier[];
}

// POST /donate/claim response: the minted redeem code + (informational) the rewards granted.
export interface DonateClaimResult {
  code: string;
  code_expires_at: string | null;
  rewards: DonateReward[];
}

// Conservative fallback if /config/topup is unreachable: stay locked (admin_only true) so a
// failed fetch can never accidentally expose a feature that's meant to be gated.
const TOPUP_CONFIG_FALLBACK: TopupConfig = {
  admin_only: true,
  meowcoin_per_baht: 1,
  min_baht: 1,
  max_baht: 100000,
  providers: [],
  monthly_cap_baht: 150,
  monthly_goal_baht: 1200,
  bmc_page_url: null,
};

@Injectable({ providedIn: 'root' })
export class TopupService {
  // Shared Meowcoin balance so the header and the top-up page stay in sync.
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
          meowcoin_per_baht: Number(r?.meowcoin_per_baht) > 0 ? Number(r!.meowcoin_per_baht) : 1,
          min_baht: Number(r?.min_baht) > 0 ? Number(r!.min_baht) : 1,
          max_baht: Number(r?.max_baht) > 0 ? Number(r!.max_baht) : TOPUP_CONFIG_FALLBACK.max_baht,
          // Keep only well-formed provider options; preserve server order.
          providers: Array.isArray(r?.providers)
            ? r!.providers!.filter((p): p is TopupProviderOption => !!p && !!p.key).map(p => ({ key: p.key, label: p.label || p.key }))
            : [],
          monthly_cap_baht: Number(r?.monthly_cap_baht) > 0 ? Number(r!.monthly_cap_baht) : TOPUP_CONFIG_FALLBACK.monthly_cap_baht,
          monthly_goal_baht: Number(r?.monthly_goal_baht) > 0 ? Number(r!.monthly_goal_baht) : TOPUP_CONFIG_FALLBACK.monthly_goal_baht,
        } as TopupConfig)),
        catchError(() => of(TOPUP_CONFIG_FALLBACK)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.config$;
  }

  // ---- Meowcoins ----
  meowcoinsMe(): Observable<MeowcoinsMe> {
    return this.http.get<MeowcoinsMe>(`${this.apiUrl.get()}/meowcoins/me`).pipe(
      tap(me => this._balance$.next(me.balance)),
    );
  }

  // ---- Top-up ----
  create(baht: number, provider: TopupProvider): Observable<TopupCreated> {
    return this.http.post<TopupCreated>(`${this.apiUrl.get()}/topup/create`, { baht, provider });
  }

  status(ref: string): Observable<TopupState> {
    return this.http.get<TopupState>(`${this.apiUrl.get()}/topup/${encodeURIComponent(ref)}`);
  }

  /** Thunder: verify an uploaded payment slip. slip_base64 is a data URL from FileReader. */
  verifyThunder(ref: string, slip_base64: string): Observable<ThunderVerifyResult> {
    return this.http.post<ThunderVerifyResult>(`${this.apiUrl.get()}/topup/thunder/verify`, { ref, slip_base64 });
  }

  history(page = 1, limit = 20): Observable<Paginated<TopupRow>> {
    const params = buildPagedParams(page, limit);
    return this.http.get<unknown>(`${this.apiUrl.get()}/topup/me`, { params })
      .pipe(map(r => normalizePaginated<TopupRow>(r, limit)));
  }

  // ---- Donate / Battlepass ----
  /** This month's user + community donation totals and the battlepass tier track. */
  donateProgress(): Observable<DonateProgress> {
    return this.http.get<DonateProgress>(`${this.apiUrl.get()}/donate/progress`);
  }

  /** Claim an unlocked tier's reward — mints (or returns the existing) redeem code. Idempotent. */
  claimTier(tierId: number): Observable<DonateClaimResult> {
    return this.http.post<DonateClaimResult>(`${this.apiUrl.get()}/donate/claim`, { tier_id: tierId });
  }

  // ---- BuyMeACoffee manual claim (fallback when the webhook couldn't auto-attribute) ----
  /** screenshot_base64 is a data URL from FileReader, same convention as Thunder's slip upload. */
  reportBmcClaim(screenshot_base64: string, note?: string): Observable<BmcClaim> {
    return this.http.post<BmcClaim>(`${this.apiUrl.get()}/topup/bmc/claim`, { screenshot_base64, note });
  }

  /** The current user's own BMC claims, newest first (no screenshot payload in this list). */
  myBmcClaims(): Observable<BmcClaim[]> {
    return this.http.get<BmcClaim[]>(`${this.apiUrl.get()}/topup/bmc/claims`)
      .pipe(map(r => Array.isArray(r) ? r : []));
  }
}
