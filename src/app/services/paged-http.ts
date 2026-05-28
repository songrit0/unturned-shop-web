import { HttpParams } from '@angular/common/http';

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
