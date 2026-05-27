import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from './api-url.service';

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
  adminList(q = '', typeId: number | null = null): Observable<Item[]> {
    let params = new HttpParams();
    if (q) params = params.set('q', q);
    if (typeId != null) params = params.set('type_id', String(typeId));
    return this.http.get<Item[]>(`${this.apiUrl.get()}/admin/items`, { params });
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
  list(q = '', typeId: number | null = null): Observable<Item[]> {
    let params = new HttpParams();
    if (q) params = params.set('q', q);
    if (typeId != null) params = params.set('type_id', String(typeId));
    return this.http.get<Item[]>(`${this.apiUrl.get()}/items`, { params });
  }
}
