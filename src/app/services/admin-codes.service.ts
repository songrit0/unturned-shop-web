import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { buildPagedParams, normalizePaginated } from './paged-http';

export { Paginated };

export interface AdminCodeItem {
  item_id: number;
  kind: number;            // 0 = item, 1 = vehicle
  amount: number;
  name: string | null;
  image_url: string | null;
}

export interface AdminCode {
  code_id: number;
  code: string;
  max_uses: number;        // 0 = unlimited
  uses: number;
  enabled: number;         // 1 = enabled
  expires_at: string | null;
  created_at: string;
  status: 'available' | 'used' | 'expired' | 'disabled';
  items: AdminCodeItem[];
}

export interface CodeRewardPayload {
  kind: 'item' | 'vehicle';
  id: number;
  amount: number;
  quality?: number;
}

export interface CreateCodePayload {
  code?: string;
  max_uses: number;
  expires_at?: string | null;
  enabled?: boolean;
  rewards: CodeRewardPayload[];
}

// GET /admin/codes/export — unowned, still-usable codes only (camelCase, server-shaped).
export interface ExportCodeReward {
  itemId: number;
  kind: 0 | 1;            // 0 = item, 1 = vehicle
  amount: number;
  name: string | null;
}

export interface ExportCode {
  code: string;
  maxUses: number;
  uses: number;
  expiresAt: string | null;
  rewards: ExportCodeReward[];
}

export interface ExportCodesResponse {
  count: number;
  codes: ExportCode[];
}

@Injectable({ providedIn: 'root' })
export class AdminCodesService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  list(q = '', page = 1, limit = 20): Observable<Paginated<AdminCode>> {
    const params = buildPagedParams(page, limit, { q });
    return this.http.get<unknown>(`${this.apiUrl.get()}/admin/codes`, { params })
      .pipe(map(r => normalizePaginated<AdminCode>(r, limit)));
  }

  create(payload: CreateCodePayload): Observable<AdminCode> {
    return this.http.post<AdminCode>(`${this.apiUrl.get()}/admin/codes`, payload);
  }

  toggleEnabled(id: number, enabled: boolean): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`${this.apiUrl.get()}/admin/codes/${id}/enabled`, { enabled });
  }

  remove(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.apiUrl.get()}/admin/codes/${id}`);
  }

  /** Unowned, still-usable codes for a Discord-ready text dump. */
  exportText(): Observable<ExportCodesResponse> {
    return this.http.get<ExportCodesResponse>(`${this.apiUrl.get()}/admin/codes/export`);
  }
}
