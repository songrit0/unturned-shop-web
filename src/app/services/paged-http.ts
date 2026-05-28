import { HttpParams } from '@angular/common/http';
import { Paginated } from '../models/paginated';

export type PagedExtra = Record<string, string | number | null | undefined>;

export function buildPagedParams(page = 1, limit = 20, extra?: PagedExtra): HttpParams {
  let params = new HttpParams().set('page', page).set('limit', limit);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v === null || v === undefined || v === '') continue;
      params = params.set(k, String(v));
    }
  }
  return params;
}

/**
 * Normalize a server response into a Paginated<T> envelope.
 * Tolerates: raw arrays (legacy), missing fields, null/undefined response.
 * Always returns a usable object with items: [] so callers never crash on .items.length.
 */
export function normalizePaginated<T>(raw: unknown, fallbackLimit = 20): Paginated<T> {
  if (Array.isArray(raw)) {
    const items = raw as T[];
    return { items, total: items.length, page: 1, limit: items.length || fallbackLimit, pages: 1 };
  }
  const r = (raw ?? {}) as Partial<Paginated<T>>;
  const items = Array.isArray(r.items) ? r.items : [];
  const total = Number.isFinite(r.total as number) ? Number(r.total) : items.length;
  const limit = Number.isFinite(r.limit as number) && Number(r.limit) > 0 ? Number(r.limit) : fallbackLimit;
  const page = Number.isFinite(r.page as number) && Number(r.page) > 0 ? Number(r.page) : 1;
  const pages = Number.isFinite(r.pages as number) && Number(r.pages) > 0
    ? Number(r.pages)
    : Math.max(1, Math.ceil(total / limit));
  return { items, total, page, limit, pages };
}
