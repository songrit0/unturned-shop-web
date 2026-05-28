import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { buildPagedParams } from './paged-http';

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

@Injectable({ providedIn: 'root' })
export class MarketService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  list(kind: MarketKind = 'normal', typeId: number | null = null, page = 1, limit = 20): Observable<Paginated<MarketItem>> {
    const params = buildPagedParams(page, limit, { type: kind, type_id: typeId });
    return this.http.get<Paginated<MarketItem>>(`${this.apiUrl.get()}/market`, { params });
  }

  get(id: number): Observable<MarketItem> {
    return this.http.get<MarketItem>(`${this.apiUrl.get()}/market/${id}`);
  }

  types(): Observable<MarketTypeOption[]> {
    return this.http.get<MarketTypeOption[]>(`${this.apiUrl.get()}/market/types`);
  }
}
