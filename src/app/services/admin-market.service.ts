import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { buildPagedParams, normalizePaginated } from './paged-http';

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
  // Create a buy-only catalog stub when the item isn't in Master Items.
  create_if_missing?: boolean;
  name?: string;
  image_url?: string;
}

export interface MarketExportRow {
  item_id: number;
  base_price: number;
  target_stock: number;
  elasticity: number;
  amount: number;
  enabled: boolean;
}

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  failed: { item_id: number; error: string }[];
}

@Injectable({ providedIn: 'root' })
export class AdminMarketService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  list(page = 1, limit = 20): Observable<Paginated<AdminMarketItem>> {
    const params = buildPagedParams(page, limit);
    return this.http.get<unknown>(`${this.apiUrl.get()}/admin/market`, { params })
      .pipe(map(r => normalizePaginated<AdminMarketItem>(r, limit)));
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

  /** Every market row in import-ready shape (for the Export button). */
  exportAll(): Observable<MarketExportRow[]> {
    return this.http.get<MarketExportRow[]>(`${this.apiUrl.get()}/admin/market/export`);
  }

  /** Bulk upsert from an imported JSON file. */
  import(items: MarketExportRow[]): Observable<ImportResult> {
    return this.http.post<ImportResult>(`${this.apiUrl.get()}/admin/market/import`, { items });
  }

  /** Set items to buy-only (enabled=0); same sv_market table, existing prices kept. */
  enableBuyOnly(itemIds: number[]): Observable<{ ok: boolean; created: number; updated: number; failed: { item_id: number; error: string }[] }> {
    return this.http.post<{ ok: boolean; created: number; updated: number; failed: { item_id: number; error: string }[] }>(
      `${this.apiUrl.get()}/admin/market/buy-only`, { item_ids: itemIds });
  }
}
