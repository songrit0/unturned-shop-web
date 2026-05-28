import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { buildPagedParams, normalizePaginated } from './paged-http';

export { Paginated };

export interface ItemType {
  id: number;
  name: string;
  description: string | null;
}

export interface ItemTypePayload {
  name: string;
  description?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ItemTypesService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  list(page = 1, limit = 20): Observable<Paginated<ItemType>> {
    const params = buildPagedParams(page, limit);
    return this.http.get<unknown>(`${this.apiUrl.get()}/admin/item-types`, { params })
      .pipe(map(r => normalizePaginated<ItemType>(r, limit)));
  }
  create(p: ItemTypePayload): Observable<ItemType> {
    return this.http.post<ItemType>(`${this.apiUrl.get()}/admin/item-types`, p);
  }
  update(id: number, p: ItemTypePayload): Observable<ItemType> {
    return this.http.put<ItemType>(`${this.apiUrl.get()}/admin/item-types/${id}`, p);
  }
  remove(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.apiUrl.get()}/admin/item-types/${id}`);
  }

  setMarketType(item_id: number, type_id: number | null): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`${this.apiUrl.get()}/admin/market/${item_id}/type`, { type_id });
  }
}
