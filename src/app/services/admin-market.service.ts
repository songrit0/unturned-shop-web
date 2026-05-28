import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { buildPagedParams } from './paged-http';

export { Paginated };

export interface AdminMarketItem {
  item_id: number;
  name: string;            // from JOIN
  price: number;           // live computed
  amount: number;
  base_price: number;
  target_stock: number;
  elasticity: number;
  image_url: string | null; // from JOIN
  enabled: number;
  type_id?: number | null;  // from JOIN
  type_name?: string | null;// from JOIN
}

export interface UpsertPayload {
  item_id: number;
  base_price: number;
  target_stock: number;
  elasticity: number;
  amount: number;
  enabled?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminMarketService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  list(page = 1, limit = 20): Observable<Paginated<AdminMarketItem>> {
    const params = buildPagedParams(page, limit);
    return this.http.get<Paginated<AdminMarketItem>>(`${this.apiUrl.get()}/admin/market`, { params });
  }
  upsert(p: UpsertPayload): Observable<AdminMarketItem> {
    return this.http.post<AdminMarketItem>(`${this.apiUrl.get()}/admin/market`, p);
  }
  toggle(item_id: number, enabled: boolean): Observable<AdminMarketItem> {
    return this.http.put<AdminMarketItem>(`${this.apiUrl.get()}/admin/market/${item_id}/enabled`, { enabled });
  }
  remove(item_id: number) {
    return this.http.delete<{ ok: boolean; deleted: number }>(`${this.apiUrl.get()}/admin/market/${item_id}`);
  }
}
