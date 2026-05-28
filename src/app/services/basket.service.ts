import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ApiUrlService } from './api-url.service';

function normalizeBasket(raw: unknown): BasketView {
  const r = (raw ?? {}) as Partial<BasketView>;
  return {
    items: Array.isArray(r.items) ? r.items : [],
    total: Number.isFinite(r.total as number) ? Number(r.total) : 0,
  };
}

export interface BasketItem { item_id: number; name: string; price: number; amount_avail: number; qty: number; image_url: string | null; }
export interface BasketView { items: BasketItem[]; total: number; }

export type CheckoutResult =
  | { ok: true; code: string; total: number; items: { item_id: number; name: string; qty: number }[] }
  | { ok: false; reason: 'not_linked' | 'empty' | 'no_item' | 'out_of_stock' | 'insufficient'; detail?: any };

@Injectable({ providedIn: 'root' })
export class BasketService {
  private _basket$ = new BehaviorSubject<BasketView>({ items: [], total: 0 });
  basket$: Observable<BasketView> = this._basket$.asObservable();
  private _open$ = new BehaviorSubject<boolean>(false);
  open$: Observable<boolean> = this._open$.asObservable();

  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  view(): Observable<BasketView> {
    return this.http.get<unknown>(`${this.apiUrl.get()}/basket`)
      .pipe(map(normalizeBasket), tap(v => this._basket$.next(v)));
  }
  add(item_id: number, qty = 1) {
    return this.http.post<unknown>(`${this.apiUrl.get()}/basket/add`, { item_id, qty })
      .pipe(map(normalizeBasket), tap(v => this._basket$.next(v)));
  }
  setQty(item_id: number, qty: number) {
    return this.http.post<unknown>(`${this.apiUrl.get()}/basket/set`, { item_id, qty })
      .pipe(map(normalizeBasket), tap(v => this._basket$.next(v)));
  }
  remove(item_id: number) {
    return this.http.post<unknown>(`${this.apiUrl.get()}/basket/remove`, { item_id })
      .pipe(map(normalizeBasket), tap(v => this._basket$.next(v)));
  }
  clear() {
    return this.http.delete<unknown>(`${this.apiUrl.get()}/basket`)
      .pipe(map(normalizeBasket), tap(v => this._basket$.next(v)));
  }
  checkout(): Observable<CheckoutResult> {
    return this.http.post<CheckoutResult>(`${this.apiUrl.get()}/basket/checkout`, {})
      .pipe(tap(r => { if (r.ok) this._basket$.next({ items: [], total: 0 }); }));
  }

  setOpen(b: boolean) { this._open$.next(b); }
  toggle() { this._open$.next(!this._open$.value); }
  get count(): number { return this._basket$.value.items.reduce((s, i) => s + i.qty, 0); }
}
