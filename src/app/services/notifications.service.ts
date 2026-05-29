import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, timer } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { buildPagedParams, normalizePaginated } from './paged-http';

export { Paginated };

// API contract (unturned-shop-api notifications module — A5):
//   GET  /notifications/me              query: page, limit -> Paginated<ShopNotification>
//   GET  /notifications/me/unread-count -> { count: number }
//   POST /notifications/:id/read        -> ShopNotification (read_at populated) | 204
//
// `kind` is an open string; the only kind handled specially in the UI today is 'p2p_expired'
// (a P2P listing expired and a refund redeem code was minted). `payload` carries the data
// needed to render the notification and reveal the code without a second fetch.

export type NotificationKind = 'p2p_expired' | string;

export interface NotificationPayload {
  listing_id?: number;
  item_id?: number;
  item_name?: string | null;
  image_url?: string | null;
  amount?: number;
  quality?: number;
  code?: string | null;
  code_expires_at?: string | null;
}

export interface ShopNotification {
  id: number;
  kind: NotificationKind;
  payload: NotificationPayload;
  read_at: string | null;
  created_at: string;
}

/** Tolerate a missing/partial payload so templates never crash on payload.code etc. */
function normalizeNotification(n: Partial<ShopNotification> | null | undefined): ShopNotification {
  const r = (n ?? {}) as Partial<ShopNotification>;
  return {
    id: Number(r.id) || 0,
    kind: r.kind ?? '',
    payload: (r.payload ?? {}) as NotificationPayload,
    read_at: r.read_at ?? null,
    created_at: r.created_at ?? '',
  };
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private _unread$ = new BehaviorSubject<number>(0);
  /** Unread badge count. Driven by startPolling() and refreshed on markRead(). */
  unread$: Observable<number> = this._unread$.asObservable();

  private polling = false;

  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  /** Page through the caller's notifications (newest first, server-ordered). */
  list(page = 1, limit = 20): Observable<Paginated<ShopNotification>> {
    const params = buildPagedParams(page, limit);
    return this.http.get<unknown>(`${this.apiUrl.get()}/notifications/me`, { params })
      .pipe(map(r => {
        const p = normalizePaginated<ShopNotification>(r, limit);
        return { ...p, items: p.items.map(normalizeNotification) };
      }));
  }

  /** One-shot unread-count fetch; also pushes the value into unread$. */
  unreadCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.apiUrl.get()}/notifications/me/unread-count`).pipe(
      map(r => Number(r?.count) || 0),
      tap(c => this._unread$.next(c)),
    );
  }

  /** Mark one notification read, then refresh the badge count. Tolerates 204 (no body). */
  markRead(id: number): Observable<unknown> {
    return this.http.post<unknown>(`${this.apiUrl.get()}/notifications/${id}/read`, {}).pipe(
      tap(() => this.unreadCount().subscribe()),
    );
  }

  /**
   * Start polling unread-count every 30s (immediate first tick). Idempotent — a second call is a
   * no-op so the singleton only polls once even if multiple components subscribe. Errors are
   * swallowed (offline / backend down) so the timer keeps ticking.
   */
  startPolling(): void {
    if (this.polling) return;
    this.polling = true;
    timer(0, 30000).pipe(
      switchMap(() => this.unreadCount().pipe(catchError(() => []))),
    ).subscribe();
  }
}
