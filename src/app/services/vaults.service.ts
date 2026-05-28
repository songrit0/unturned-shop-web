import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import {
  DEFAULT_VAULT_GRID,
  EnrichedVaultItem,
  VaultDetail,
  VaultItem,
  VaultSummary,
} from '../models/vault';
import { buildPagedParams, normalizePaginated } from './paged-http';

export type AdminVaultSearchMode = 'steam_id' | 'discord_id' | 'q';

// API contract (unturned-shop-api vaults.controller.ts):
//   GET    /vaults/me                       -> VaultSummary[]
//   GET    /vaults/me/:name                 -> VaultDetail (no `grid`; we inject DEFAULT_VAULT_GRID client-side)
//   PUT    /vaults/me/:name                 body: { items: VaultItem[] } -> VaultDetail
//   GET    /vaults             (admin)      query: steam_id?, discord_id?, q?, name?, page, limit -> Paginated<VaultSummary>
//                                            `steam_id`/`discord_id` are exact; `q` is OwnerName substring + OwnerId prefix
//   GET    /vaults/:steamId/:name (admin)   -> VaultDetail
//   PUT    /vaults/:steamId/:name (admin)   body: { items: VaultItem[] } -> VaultDetail
//
// Server returns items with sv_items metadata already joined. The plugin-format keys
// (Id, X, Y, Rot, Amount, Quality, State) MUST round-trip verbatim on PUT — `toPlainItems`
// strips the joined display fields so we send only the seven raw keys the api DTO accepts.

function toPlainItems(items: EnrichedVaultItem[]): VaultItem[] {
  return items.map(it => ({
    Id: it.Id, X: it.X, Y: it.Y, Rot: it.Rot,
    Amount: it.Amount, Quality: it.Quality, State: it.State,
  }));
}

function withGrid(detail: VaultDetail): VaultDetail {
  return { ...detail, grid: detail.grid ?? DEFAULT_VAULT_GRID };
}

@Injectable({ providedIn: 'root' })
export class VaultsService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  // ---- Player self-service ----
  getMine(): Observable<VaultSummary[]> {
    return this.http.get<VaultSummary[]>(`${this.apiUrl.get()}/vaults/me`);
  }

  getMineByName(name: string): Observable<VaultDetail> {
    return this.http.get<VaultDetail>(`${this.apiUrl.get()}/vaults/me/${encodeURIComponent(name)}`).pipe(map(withGrid));
  }

  updateMine(name: string, items: EnrichedVaultItem[]): Observable<VaultDetail> {
    return this.http.put<VaultDetail>(
      `${this.apiUrl.get()}/vaults/me/${encodeURIComponent(name)}`,
      { items: toPlainItems(items) },
    ).pipe(map(withGrid));
  }

  // ---- Admin ----
  adminList(mode: AdminVaultSearchMode, value: string, page = 1, limit = 20): Observable<Paginated<VaultSummary>> {
    const trimmed = value.trim();
    const extra: Record<string, string | null> = { steam_id: null, discord_id: null, q: null };
    if (trimmed) extra[mode] = trimmed;
    const params = buildPagedParams(page, limit, extra);
    return this.http.get<unknown>(`${this.apiUrl.get()}/vaults`, { params })
      .pipe(map(r => normalizePaginated<VaultSummary>(r, limit)));
  }

  adminGet(steamId: string, name: string): Observable<VaultDetail> {
    return this.http.get<VaultDetail>(
      `${this.apiUrl.get()}/vaults/${encodeURIComponent(steamId)}/${encodeURIComponent(name)}`,
    ).pipe(map(withGrid));
  }

  adminUpdate(steamId: string, name: string, items: EnrichedVaultItem[]): Observable<VaultDetail> {
    return this.http.put<VaultDetail>(
      `${this.apiUrl.get()}/vaults/${encodeURIComponent(steamId)}/${encodeURIComponent(name)}`,
      { items: toPlainItems(items) },
    ).pipe(map(withGrid));
  }
}
