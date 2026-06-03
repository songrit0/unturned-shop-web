import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { buildPagedParams, normalizePaginated } from './paged-http';

export { Paginated };

export interface Vehicle {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  type_id: number | null;
  type_name?: string | null;
}

export interface VehiclePayload {
  id?: number;
  name: string;
  description?: string | null;
  image_url?: string | null;
  type_id?: number | null;
}

@Injectable({ providedIn: 'root' })
export class VehiclesService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  // ---- Admin ----
  adminList(q = '', typeId: number | null = null, page = 1, limit = 20): Observable<Paginated<Vehicle>> {
    const params = buildPagedParams(page, limit, { q, type_id: typeId });
    return this.http.get<unknown>(`${this.apiUrl.get()}/admin/vehicles`, { params })
      .pipe(map(r => normalizePaginated<Vehicle>(r, limit)));
  }
  adminGet(id: number): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.apiUrl.get()}/admin/vehicles/${id}`);
  }
  adminCreate(p: VehiclePayload): Observable<Vehicle> {
    return this.http.post<Vehicle>(`${this.apiUrl.get()}/admin/vehicles`, p);
  }
  adminUpdate(id: number, p: VehiclePayload): Observable<Vehicle> {
    return this.http.put<Vehicle>(`${this.apiUrl.get()}/admin/vehicles/${id}`, p);
  }
  adminDelete(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.apiUrl.get()}/admin/vehicles/${id}`);
  }

  // ---- Public ----
  list(q = '', typeId: number | null = null, page = 1, limit = 20): Observable<Paginated<Vehicle>> {
    const params = buildPagedParams(page, limit, { q, type_id: typeId });
    return this.http.get<unknown>(`${this.apiUrl.get()}/vehicles`, { params })
      .pipe(map(r => normalizePaginated<Vehicle>(r, limit)));
  }
  getOne(id: number): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.apiUrl.get()}/vehicles/${id}`);
  }
}
