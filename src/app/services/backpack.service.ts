import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';

// In-game VaultBackpack upgrades bought on the web. Level = height-based
// (see API BackpackService); costs scale with the CURRENT level.

export type BackpackPayMethod = 'coins' | 'meowcoins' | 'mixed';

export interface BackpackNextCost {
  coins: number;
  meowcoins: number | null;   // full price in Meowcoins; null = meow payment disabled
}

export interface BackpackMe {
  enabled: boolean;
  vip_only: boolean;
  is_vip: boolean;
  can_upgrade: boolean;
  mixed_allowed: boolean;     // player may spend Meowcoins as a pro-rata discount
  width: number;
  height: number;
  level: number;
  max_level: number;
  at_max: boolean;
  next: BackpackNextCost | null;
}

export interface BackpackUpgradeResult extends BackpackMe {
  ok: true;
  method: BackpackPayMethod;
  paid: { coins: number; meowcoins: number };
}

export interface BackpackConfig {
  enabled: boolean;
  vip_only: boolean;
  base_coins: number;
  base_meowcoins: number;
  mixed_enabled: boolean;
  default_height: number;
  max_height: number;
}

export interface BackpackPlayerRow {
  steam_id: string;
  discord_name: string | null;
  width: number;
  height: number;
  level: number;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class BackpackService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  private base() { return `${this.apiUrl.get()}/backpack`; }
  private admin() { return `${this.apiUrl.get()}/admin/backpack`; }

  // ---- player ----
  me(): Observable<BackpackMe> {
    return this.http.get<BackpackMe>(`${this.base()}/me`);
  }

  /** meowcoins = player-chosen Meowcoin spend for method 'mixed' (pro-rata coin discount). */
  upgrade(method: BackpackPayMethod, meowcoins?: number): Observable<BackpackUpgradeResult> {
    return this.http.post<BackpackUpgradeResult>(`${this.base()}/upgrade`, { method, meowcoins });
  }

  // ---- admin ----
  getConfig(): Observable<BackpackConfig> {
    return this.http.get<BackpackConfig>(`${this.admin()}/config`);
  }
  updateConfig(p: Partial<BackpackConfig>): Observable<BackpackConfig> {
    return this.http.patch<BackpackConfig>(`${this.admin()}/config`, p);
  }
  players(page: number, limit: number, search?: string): Observable<Paginated<BackpackPlayerRow>> {
    const params: any = { page, limit };
    if (search) params.search = search;
    return this.http.get<Paginated<BackpackPlayerRow>>(`${this.admin()}/players`, { params });
  }
  setPlayerSize(steamId: string, width: number, height: number): Observable<BackpackPlayerRow> {
    return this.http.patch<BackpackPlayerRow>(`${this.admin()}/players/${steamId}`, { width, height });
  }
}
