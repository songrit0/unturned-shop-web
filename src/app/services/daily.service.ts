import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from './api-url.service';

// Daily reward — player-facing. Contract is camelCase (server-side resolves the tier
// and whether the caller can claim today), unlike the snake_case quest/code services.
// kind: 0 = item, 1 = vehicle. Items/vehicles are delivered as a single 1-use redeem
// code the player runs in-game with /code.

export type DailyTier = 'normal' | 'vip';

export interface DailyReward {
  itemId: number;
  amount: number;
  quality: number;
  label: string;
  imageUrl: string | null;
  kind: 0 | 1;
}

export interface DailyStatus {
  enabled: boolean;
  tier: DailyTier;
  canClaim: boolean;
  alreadyClaimedToday: boolean;
  nextResetAt: string; // ISO-UTC
  reward: {
    coins: number;
    items: DailyReward[];
    vehicles: DailyReward[];
  };
}

export interface DailyTierPreview {
  enabled: boolean;
  reward: { coins: number; items: DailyReward[]; vehicles: DailyReward[] };
}

export interface DailyTiersPreview {
  normal: DailyTierPreview;
  vip: DailyTierPreview;
}

export interface DailyClaimResult {
  ok: true;
  tier: DailyTier;
  granted: {
    coins: number;
    items: DailyReward[];
    vehicles: DailyReward[];
  };
  redeemCode: string | null;
  nextResetAt: string;
}

// ---- Admin ----
// A reward row as the admin manages it. kind 0 = item, 1 = vehicle. item and vehicle id
// spaces overlap, so `kind` disambiguates `itemId`.
export interface DailyItemRow {
  id: number;
  tier: DailyTier;
  itemId: number;
  amount: number;
  quality: number;
  kind: 0 | 1;
  label: string | null;
  imageUrl: string | null;
  sort: number;
  enabled: boolean;
}

// Per-tier admin view: the config fields plus the combined item/vehicle rows.
export interface DailyTierView {
  enabled: boolean;
  coins: number;
  codeTtlDays: number;
  items: DailyItemRow[];    // kind 0
  vehicles: DailyItemRow[]; // kind 1
}

export interface DailyAdminConfig {
  tiers: {
    normal: DailyTierView;
    vip: DailyTierView;
  };
}

// Editable config fields for PUT /admin/daily/config/:tier (all optional server-side).
export interface DailyTierConfigPayload {
  enabled?: boolean;
  coins?: number;
  codeTtlDays?: number;
}

// Create/update payload for /admin/daily/items. On create, tier/itemId/amount are required;
// on update any subset is accepted (omitted keys keep their current value).
// label/imageUrl are NOT sent — the backend derives them from the Master Items catalog
// (live-reference) by (kind, itemId). The picker only resolves itemId.
export interface DailyItemPayload {
  tier?: DailyTier;
  itemId?: number;
  amount?: number;
  quality?: number;
  kind?: 0 | 1;
  sort?: number;
  enabled?: boolean;
}

@Injectable({ providedIn: 'root' })
export class DailyService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  private base() { return `${this.apiUrl.get()}/daily`; }
  private admin() { return `${this.apiUrl.get()}/admin/daily`; }

  // ---- player ----
  status(): Observable<DailyStatus> {
    return this.http.get<DailyStatus>(`${this.base()}/status`);
  }

  /** Per-tier preview (normal vs the combined bundle a VIP gets) — VIP-benefits UI. */
  preview(): Observable<DailyTiersPreview> {
    return this.http.get<DailyTiersPreview>(`${this.base()}/preview`);
  }

  claim(): Observable<DailyClaimResult> {
    return this.http.post<DailyClaimResult>(`${this.base()}/claim`, {});
  }

  // ---- admin ----
  getConfig(): Observable<DailyAdminConfig> {
    return this.http.get<DailyAdminConfig>(`${this.admin()}/config`);
  }
  setTierConfig(tier: DailyTier, p: DailyTierConfigPayload): Observable<DailyTierView> {
    return this.http.put<DailyTierView>(`${this.admin()}/config/${tier}`, p);
  }
  createItem(p: DailyItemPayload): Observable<DailyItemRow> {
    return this.http.post<DailyItemRow>(`${this.admin()}/items`, p);
  }
  updateItem(id: number, p: DailyItemPayload): Observable<DailyItemRow> {
    return this.http.put<DailyItemRow>(`${this.admin()}/items/${id}`, p);
  }
  deleteItem(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.admin()}/items/${id}`);
  }
}
