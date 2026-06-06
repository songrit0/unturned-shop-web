import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from './api-url.service';

export type GachaPrizeType = 'coins' | 'meowcoins' | 'item' | 'vehicle' | 'vip';

export interface GachaPrize {
  id: number;
  type: GachaPrizeType;
  ref_id: number | null;
  amount: number;
  quality: number;
  weight: number;
  label: string | null;
  image_url: string | null;
  rarity: string | null;
  enabled: boolean;
  sort: number;
}

export interface GachaConfig {
  enabled: boolean;
  base_free_spins: number;
  rank_bonus: Record<string, number>;
  price_coins: number | null;
  price_meowcoins: number | null;
  code_ttl_days: number;
}

export interface GachaState {
  enabled: boolean;
  rank: number | null;
  freeEntitlement: number;
  freeUsed: number;
  freeRemaining: number;
  paidSpins: number;
  totalRemaining: number;
  priceCoins: number | null;
  priceMeowcoins: number | null;
  nextResetAt: string;
}

export interface GachaSpinResult {
  prize: {
    type: GachaPrizeType;
    label: string;
    amount: number;
    imageUrl: string | null;
    rarity: string | null;
    code: string | null;
  };
  remaining: number;
}

export interface GachaTodayEntry {
  name: string;
  prizeType: GachaPrizeType;
  prizeLabel: string;
  prizeAmount: number;
  imageUrl: string | null;
  rarity: string | null;
  at: string;
}

@Injectable({ providedIn: 'root' })
export class GachaService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  private base() { return `${this.apiUrl.get()}/gacha`; }
  private admin() { return `${this.apiUrl.get()}/admin/gacha`; }

  // ---- player ----
  state(): Observable<GachaState> {
    return this.http.get<GachaState>(`${this.base()}/state`);
  }
  spin(): Observable<GachaSpinResult> {
    return this.http.post<GachaSpinResult>(`${this.base()}/spin`, {});
  }
  buy(count: number, currency: 'coins' | 'meowcoins'): Observable<{ paidSpins: number; charged: number; currency: string }> {
    return this.http.post<{ paidSpins: number; charged: number; currency: string }>(`${this.base()}/buy`, { count, currency });
  }
  today(limit = 20): Observable<{ entries: GachaTodayEntry[] }> {
    return this.http.get<{ entries: GachaTodayEntry[] }>(`${this.base()}/today?limit=${limit}`);
  }

  // ---- admin ----
  listPrizes(): Observable<GachaPrize[]> {
    return this.http.get<GachaPrize[]>(`${this.admin()}/prizes`);
  }
  createPrize(p: Partial<GachaPrize>): Observable<GachaPrize> {
    return this.http.post<GachaPrize>(`${this.admin()}/prizes`, p);
  }
  updatePrize(id: number, p: Partial<GachaPrize>): Observable<GachaPrize> {
    return this.http.put<GachaPrize>(`${this.admin()}/prizes/${id}`, p);
  }
  deletePrize(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.admin()}/prizes/${id}`);
  }
  getConfig(): Observable<GachaConfig> {
    return this.http.get<GachaConfig>(`${this.admin()}/config`);
  }
  setConfig(c: Partial<GachaConfig>): Observable<GachaConfig> {
    return this.http.put<GachaConfig>(`${this.admin()}/config`, c);
  }
}
