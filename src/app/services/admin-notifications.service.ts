import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { buildPagedParams, normalizePaginated } from './paged-http';

export interface NotifRow {
  id: number;
  title: string;
  body: string;
  accent: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class AdminNotificationsService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  list(page = 1, limit = 20): Observable<Paginated<NotifRow>> {
    const params = buildPagedParams(page, limit);
    return this.http.get<unknown>(`${this.apiUrl.get()}/admin/notifications`, { params })
      .pipe(map(r => normalizePaginated<NotifRow>(r, limit)));
  }

  create(title: string, body: string, accent: string): Observable<NotifRow> {
    return this.http.post<NotifRow>(`${this.apiUrl.get()}/admin/notifications`, { title, body, accent });
  }

  remove(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.apiUrl.get()}/admin/notifications/${id}`);
  }
}
