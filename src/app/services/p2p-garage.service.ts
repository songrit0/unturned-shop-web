import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { P2pListingStatus } from '../models/vault';
import { buildPagedParams, normalizePaginated } from './paged-http';

// API contract (unturned-shop-api p2p garage endpoints):
//   GET    /p2p/garage/mine-vehicles          -> MineVehicle[]  (caller's stored garage vehicles; NOT paginated)
//   POST   /p2p/garage                         body: { garage_id, price } -> GarageListing
//   GET    /p2p/garage                         query: status?, seller?, page, limit (default status active)
//   GET    /p2p/garage/me                      query: page, limit (server filters to caller's steam_id)
//   GET    /p2p/garage/:id                      -> GarageListing
//   POST   /p2p/garage/:id/buy                  -> GarageListing (transfers ownership; no redeem code)
//   DELETE /p2p/garage/:id                      seller cancel -> GarageListing
//
// Status filter at /p2p/garage defaults to 'active' server-side; pass `status` to query others.
// Buying TRANSFERS OWNERSHIP — the buyer must have an EMPTY garage to buy.

export interface GarageListing {
  id: number;
  seller_steam: string;
  garage_id: number;
  garage_name: string;
  legacy_id: number;
  price: number;
  status: P2pListingStatus;
  buyer_steam: string | null;
  created_at: string;
  closed_at: string | null;
  vehicle_name: string | null;
  image_url: string | null;
  seller_discord_name: string | null;
  buyer_discord_name: string | null;
}

export interface MineVehicle {
  garage_id: number;
  name: string;
  legacy_id: number;
  listed_for_sale: number;
  vehicle_name: string | null;
  image_url: string | null;
}

export interface GarageFilters {
  seller?: string | null;
  status?: P2pListingStatus | null;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class P2pGarageService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  listActive(filters: GarageFilters = {}): Observable<Paginated<GarageListing>> {
    const params = buildPagedParams(filters.page ?? 1, filters.limit ?? 20, {
      seller: filters.seller,
      status: filters.status,
    });
    return this.http.get<unknown>(`${this.apiUrl.get()}/p2p/garage`, { params })
      .pipe(map(r => normalizePaginated<GarageListing>(r, filters.limit ?? 20)));
  }

  listMine(page = 1, limit = 50): Observable<Paginated<GarageListing>> {
    const params = buildPagedParams(page, limit);
    return this.http.get<unknown>(`${this.apiUrl.get()}/p2p/garage/me`, { params })
      .pipe(map(r => normalizePaginated<GarageListing>(r, limit)));
  }

  getOne(id: number): Observable<GarageListing> {
    return this.http.get<GarageListing>(`${this.apiUrl.get()}/p2p/garage/${id}`);
  }

  mineVehicles(): Observable<MineVehicle[]> {
    return this.http.get<MineVehicle[]>(`${this.apiUrl.get()}/p2p/garage/mine-vehicles`);
  }

  createListing(garage_id: number, price: number): Observable<GarageListing> {
    return this.http.post<GarageListing>(`${this.apiUrl.get()}/p2p/garage`, { garage_id, price });
  }

  buy(id: number): Observable<GarageListing> {
    return this.http.post<GarageListing>(`${this.apiUrl.get()}/p2p/garage/${id}/buy`, {});
  }

  cancel(id: number): Observable<GarageListing> {
    return this.http.delete<GarageListing>(`${this.apiUrl.get()}/p2p/garage/${id}`);
  }
}
