import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { buildPagedParams, normalizePaginated } from './paged-http';

export { Paginated };

export interface VehicleMarketItem {
  vehicle_id: number;
  name: string;
  price: number;           // fixed price (no supply/demand)
  amount: number;
  image_url: string | null;
  type_id?: number | null;
  type_name?: string | null;
}

export interface AdminVehicleMarketItem extends VehicleMarketItem {
  enabled: number;         // 1 = enabled (shows in vehicles shop)
}

export interface VehicleUpsertPayload {
  vehicle_id: number;
  price: number;
  amount: number;
  enabled?: boolean;
}

@Injectable({ providedIn: 'root' })
export class VehicleMarketService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  // ---- Public ----
  list(q = '', typeId: number | null = null, page = 1, limit = 20): Observable<Paginated<VehicleMarketItem>> {
    const params = buildPagedParams(page, limit, { q, type_id: typeId });
    return this.http.get<unknown>(`${this.apiUrl.get()}/vehicle-market`, { params })
      .pipe(map(r => normalizePaginated<VehicleMarketItem>(r, limit)));
  }
  getOne(id: number): Observable<VehicleMarketItem> {
    return this.http.get<VehicleMarketItem>(`${this.apiUrl.get()}/vehicle-market/${id}`);
  }

  // ---- Admin ----
  adminList(page = 1, limit = 20): Observable<Paginated<AdminVehicleMarketItem>> {
    const params = buildPagedParams(page, limit);
    return this.http.get<unknown>(`${this.apiUrl.get()}/admin/vehicle-market`, { params })
      .pipe(map(r => normalizePaginated<AdminVehicleMarketItem>(r, limit)));
  }
  adminGet(id: number): Observable<AdminVehicleMarketItem> {
    return this.http.get<AdminVehicleMarketItem>(`${this.apiUrl.get()}/admin/vehicle-market/${id}`);
  }
  upsert(p: VehicleUpsertPayload): Observable<AdminVehicleMarketItem> {
    return this.http.post<AdminVehicleMarketItem>(`${this.apiUrl.get()}/admin/vehicle-market`, p);
  }
  toggleEnabled(vehicle_id: number, enabled: boolean): Observable<AdminVehicleMarketItem> {
    return this.http.put<AdminVehicleMarketItem>(`${this.apiUrl.get()}/admin/vehicle-market/${vehicle_id}/enabled`, { enabled });
  }
  remove(vehicle_id: number) {
    return this.http.delete<{ ok: boolean; deleted: number }>(`${this.apiUrl.get()}/admin/vehicle-market/${vehicle_id}`);
  }
}
