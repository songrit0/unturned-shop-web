import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { P2pConfig, P2pCreatePayload, P2pListing, P2pListingStatus } from '../models/vault';
import { buildPagedParams, normalizePaginated } from './paged-http';

// API contract (unturned-shop-api p2p.controller.ts):
//   GET    /p2p/listings                       query: item_id?, type_id?, seller?, status?, min_price?, max_price?, page, limit
//   GET    /p2p/listings/me                    query: page, limit (server filters to caller's steam_id)
//   GET    /p2p/listings/:id
//   POST   /p2p/listings                       body: { vault_name, item_index, price }
//   DELETE /p2p/listings/:id                   seller cancel
//   POST   /p2p/listings/:id/buy
//   POST   /admin/p2p/listings/:id/force-close (admin)
//   GET    /config/p2p                         -> { commission, ttl_days } (no auth; commission is 0-1 fraction)
//
// Status filter at /p2p/listings defaults to 'active' server-side; pass `status` to query others.

export interface P2pFilters {
  q?: string;             // local search hint; not yet honored by api
  item_id?: number | null;
  type_id?: number | null;
  seller?: string | null;
  status?: P2pListingStatus | null;
  min_price?: number | null;
  max_price?: number | null;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class P2pService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  listActive(filters: P2pFilters = {}): Observable<Paginated<P2pListing>> {
    const params = buildPagedParams(filters.page ?? 1, filters.limit ?? 20, {
      item_id: filters.item_id,
      type_id: filters.type_id,
      seller: filters.seller,
      status: filters.status,
      min_price: filters.min_price,
      max_price: filters.max_price,
    });
    return this.http.get<unknown>(`${this.apiUrl.get()}/p2p/listings`, { params })
      .pipe(map(r => normalizePaginated<P2pListing>(r, filters.limit ?? 20)));
  }

  get(id: number): Observable<P2pListing> {
    return this.http.get<P2pListing>(`${this.apiUrl.get()}/p2p/listings/${id}`);
  }

  create(payload: P2pCreatePayload): Observable<P2pListing> {
    return this.http.post<P2pListing>(`${this.apiUrl.get()}/p2p/listings`, payload);
  }

  cancel(id: number): Observable<P2pListing> {
    return this.http.delete<P2pListing>(`${this.apiUrl.get()}/p2p/listings/${id}`);
  }

  buy(id: number): Observable<P2pListing> {
    return this.http.post<P2pListing>(`${this.apiUrl.get()}/p2p/listings/${id}/buy`, {});
  }

  // Server returns all statuses; client filters via tab. Pagination is server-side.
  myListings(page = 1, limit = 50): Observable<Paginated<P2pListing>> {
    const params = buildPagedParams(page, limit);
    return this.http.get<unknown>(`${this.apiUrl.get()}/p2p/listings/me`, { params })
      .pipe(map(r => normalizePaginated<P2pListing>(r, limit)));
  }

  adminForceClose(id: number): Observable<P2pListing> {
    return this.http.post<P2pListing>(`${this.apiUrl.get()}/admin/p2p/listings/${id}/force-close`, {});
  }

  getConfig(): Observable<P2pConfig> {
    return this.http.get<P2pConfig>(`${this.apiUrl.get()}/config/p2p`);
  }
}
