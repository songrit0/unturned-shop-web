import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { buildPagedParams, normalizePaginated } from './paged-http';

export { Paginated };

export interface MarketItem {
  item_id: number;
  name: string;
  price: number;           // live effective
  base_price: number;      // anchor for comparison
  amount: number;
  target_stock: number;
  image_url: string | null;
  type_id?: number | null;
  type_name?: string | null;
  meowcoin_price?: number | null; // null = not Meowcoin-buyable (display only)
}

export interface MarketTypeOption {
  id: number;
  name: string;
}

export type MarketKind = 'normal' | 'bills' | 'all';

export interface SellPriceItem {
  item_id: number;
  name: string;
  image_url: string | null;
  type_id: number | null;
  type_name: string | null;
  buy_price: number;
  base_price: number;
  sell_price: number;
  trend: number; // -1 down, 0 flat, 1 up (vs anchor)
  is_for_sale: boolean; // false = shop buys but doesn't sell (buy-only)
}

export interface SellPriceBoard {
  commission_percent: number;
  items: SellPriceItem[];
}

@Injectable({ providedIn: 'root' })
export class MarketService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  list(kind: MarketKind = 'normal', typeId: number | null = null, page = 1, limit = 20): Observable<Paginated<MarketItem>> {
    const params = buildPagedParams(page, limit, { type: kind, type_id: typeId });
    return this.http.get<unknown>(`${this.apiUrl.get()}/market`, { params })
      .pipe(map(r => normalizePaginated<MarketItem>(r, limit)));
  }

  /**
   * Fetch a single market row.
   * By default the API 404s on buy-only items (enabled_isforsell=0) so the Shop page
   * doesn't show them; pass includeUnlisted=true to get the price/stock anyway.
   */
  get(id: number, includeUnlisted = false): Observable<MarketItem> {
    const url = `${this.apiUrl.get()}/market/${id}${includeUnlisted ? '?include_unlisted=1' : ''}`;
    return this.http.get<MarketItem>(url);
  }

  types(): Observable<MarketTypeOption[]> {
    return this.http.get<MarketTypeOption[]>(`${this.apiUrl.get()}/market/types`)
      .pipe(map(r => Array.isArray(r) ? r : []));
  }

  sellPrices(typeId: number | null = null): Observable<SellPriceBoard> {
    const url = `${this.apiUrl.get()}/market/sell-prices${typeId != null ? `?type_id=${typeId}` : ''}`;
    return this.http.get<SellPriceBoard>(url);
  }
}
