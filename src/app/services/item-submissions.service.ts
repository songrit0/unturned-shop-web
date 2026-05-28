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
      cleanPatch(patch),
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

/**
 * Strip empty values from a submission patch before POST. NestJS validators reject
 * empty strings on numeric/optional fields (e.g. `type_id: ""` fails Number coercion).
 * Empty string / null / undefined → drop the key; NaN → drop the key (defensive).
 */
function cleanPatch(patch: SubmissionPatch): SubmissionPatch {
  const out: SubmissionPatch = {};
  for (const k of Object.keys(patch) as (keyof SubmissionPatch)[]) {
    const v = patch[k];
    if (v == null) continue;
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed) (out as Record<string, unknown>)[k] = trimmed;
      continue;
    }
    if (typeof v === 'number') {
      if (Number.isFinite(v)) (out as Record<string, unknown>)[k] = v;
      continue;
    }
    // Defensive: stringified numeric (e.g. from a <select> bound with value="">) — coerce.
    const n = Number(v);
    if (Number.isFinite(n)) (out as Record<string, unknown>)[k] = n;
  }
  return out;
}
