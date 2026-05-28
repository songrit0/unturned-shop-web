import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { ItemSubmission, SubmissionPatch, SubmissionStatus } from '../models/item-submission';
import { buildPagedParams, normalizePaginated } from './paged-http';

// API contract (unturned-shop-api items-submissions.controller.ts):
//   POST   /items/:id/submissions           body: SubmissionPatch -> ItemSubmission
//   GET    /items/submissions/me            query: page, limit    -> Paginated<ItemSubmission>
//   GET    /admin/items/submissions         query: status?, item_id?, page, limit -> Paginated<ItemSubmission>
//   POST   /admin/items/submissions/:id/approve                  -> ItemSubmission
//   POST   /admin/items/submissions/:id/reject body: { admin_note? } -> ItemSubmission

@Injectable({ providedIn: 'root' })
export class ItemSubmissionsService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  // ---- Player ----
  create(itemId: number, patch: SubmissionPatch): Observable<ItemSubmission> {
    return this.http.post<ItemSubmission>(
      `${this.apiUrl.get()}/items/${itemId}/submissions`,
      patch,
    );
  }

  listMine(page = 1, limit = 50): Observable<Paginated<ItemSubmission>> {
    const params = buildPagedParams(page, limit);
    return this.http.get<unknown>(`${this.apiUrl.get()}/items/submissions/me`, { params })
      .pipe(map(r => normalizePaginated<ItemSubmission>(r, limit)));
  }

  // ---- Admin ----
  adminList(status?: SubmissionStatus | null, itemId?: number | null, page = 1, limit = 20): Observable<Paginated<ItemSubmission>> {
    const params = buildPagedParams(page, limit, { status: status ?? null, item_id: itemId ?? null });
    return this.http.get<unknown>(`${this.apiUrl.get()}/admin/items/submissions`, { params })
      .pipe(map(r => normalizePaginated<ItemSubmission>(r, limit)));
  }

  approve(id: number): Observable<ItemSubmission> {
    return this.http.post<ItemSubmission>(`${this.apiUrl.get()}/admin/items/submissions/${id}/approve`, {});
  }

  reject(id: number, adminNote: string | null): Observable<ItemSubmission> {
    return this.http.post<ItemSubmission>(`${this.apiUrl.get()}/admin/items/submissions/${id}/reject`, { admin_note: adminNote });
  }
}
