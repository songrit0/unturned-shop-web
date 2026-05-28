import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { PurchaseFilter, PurchaseView } from '../models/purchase';
import { buildPagedParams, normalizePaginated } from './paged-http';

// API contract (unturned-shop-api purchases.controller.ts):
//   GET    /purchases/me   query: page, limit, status? -> Paginated<PurchaseView>
//   POST   /purchases/:id/claim                        -> PurchaseView (redeem_code populated)

@Injectable({ providedIn: 'root' })
export class PurchasesService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  listMine(status: PurchaseFilter = 'unclaimed', page = 1, limit = 50): Observable<Paginated<PurchaseView>> {
    const params = buildPagedParams(page, limit, { status });
    return this.http.get<unknown>(`${this.apiUrl.get()}/purchases/me`, { params })
      .pipe(map(r => normalizePaginated<PurchaseView>(r, limit)));
  }

  claim(id: number): Observable<PurchaseView> {
    return this.http.post<PurchaseView>(`${this.apiUrl.get()}/purchases/${id}/claim`, {});
  }
}
