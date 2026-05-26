import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from './api-url.service';

export interface MarketItem {
  item_id: number;
  name: string;
  price: number;           // live effective
  base_price: number;      // anchor for comparison
  amount: number;
  target_stock: number;
  image_url: string | null;
}

export type MarketKind = 'normal' | 'bills' | 'all';

@Injectable({ providedIn: 'root' })
export class MarketService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  list(kind: MarketKind = 'normal'): Observable<MarketItem[]> {
    return this.http.get<MarketItem[]>(`${this.apiUrl.get()}/market`, { params: { type: kind } });
  }

  get(id: number): Observable<MarketItem> {
    return this.http.get<MarketItem>(`${this.apiUrl.get()}/market/${id}`);
  }
}
