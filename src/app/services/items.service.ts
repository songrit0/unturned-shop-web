import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { buildPagedParams } from './paged-http';

export { Paginated };

export interface Item {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  type_id: number | null;
  type_name?: string | null;
}

export interface ItemPayload {
  id?: number;
  name: string;
  description?: string | null;
  image_url?: string | null;
  type_id?: number | null;
}

@Injectable({ providedIn: 'root' })
export class ItemsService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  // ---- Admin ----
  adminList(q = '', typeId: number | null = null, page = 1, limit = 20): Observable<Paginated<Item>> {
    const params = buildPagedParams(page, limit, { q, type_id: typeId });
    return this.http.get<Paginated<Item>>(`${this.apiUrl.get()}/admin/items`, { params });
  }
  adminGet(id: number): Observable<Item> {
    return this.http.get<Item>(`${this.apiUrl.get()}/admin/items/${id}`);
  }
  adminCreate(p: ItemPayload): Observable<Item> {
    return this.http.post<Item>(`${this.apiUrl.get()}/admin/items`, p);
  }
  adminUpdate(id: number, p: ItemPayload): Observable<Item> {
    return this.http.put<Item>(`${this.apiUrl.get()}/admin/items/${id}`, p);
  }
  adminDelete(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.apiUrl.get()}/admin/items/${id}`);
  }

  // ---- Public ----
  list(q = '', typeId: number | null = null, page = 1, limit = 20): Observable<Paginated<Item>> {
    const params = buildPagedParams(page, limit, { q, type_id: typeId });
    return this.http.get<Paginated<Item>>(`${this.apiUrl.get()}/items`, { params });
  }
}
