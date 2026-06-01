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

  get(id: number): Observable<MarketItem> {
    return this.http.get<MarketItem>(`${this.apiUrl.get()}/market/${id}`);
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
