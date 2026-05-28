import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { buildPagedParams, normalizePaginated } from './paged-http';

export { Paginated };

export type QuestResetType = 'once' | 'daily' | 'weekly';

export interface QuestItem {
  item_id: number;
  qty_required: number;
  name?: string;
}

export interface QuestItemProgress extends QuestItem {
  sold_qty: number;
}

export interface AdminQuest {
  id: number;
  name: string;
  description: string | null;
  reward_coins: number;
  reset_type: QuestResetType;
  enabled: number;
  start_at: string | null;
  end_at: string | null;
  items: QuestItem[];
}

export interface AdminQuestPayload {
  name: string;
  description?: string | null;
  reward_coins: number;
  reset_type: QuestResetType;
  enabled: boolean;
  start_at?: string | null;
  end_at?: string | null;
  items: QuestItem[];
}

export interface PlayerQuest {
  id: number;
  name: string;
  description: string | null;
  reward_coins: number;
  reset_type: QuestResetType;
  status: 'in_progress' | 'completed';
  items: QuestItemProgress[];
  completed_at?: string | null;
  period_start?: string | null;
  period_end?: string | null;
}

@Injectable({ providedIn: 'root' })
export class QuestsService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  // ---- Admin ----
  adminList(page = 1, limit = 20): Observable<Paginated<AdminQuest>> {
    const params = buildPagedParams(page, limit);
    return this.http.get<unknown>(`${this.apiUrl.get()}/admin/quests`, { params })
      .pipe(map(r => normalizePaginated<AdminQuest>(r, limit)));
  }
  adminCreate(p: AdminQuestPayload): Observable<AdminQuest> {
    return this.http.post<AdminQuest>(`${this.apiUrl.get()}/admin/quests`, p);
  }
  adminUpdate(id: number, p: AdminQuestPayload): Observable<AdminQuest> {
    return this.http.put<AdminQuest>(`${this.apiUrl.get()}/admin/quests/${id}`, p);
  }
  adminDelete(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.apiUrl.get()}/admin/quests/${id}`);
  }

  // ---- Player ----
  list(): Observable<PlayerQuest[]> {
    return this.http.get<PlayerQuest[]>(`${this.apiUrl.get()}/quests`)
      .pipe(map(r => Array.isArray(r) ? r : []));
  }
  get(id: number): Observable<PlayerQuest> {
    return this.http.get<PlayerQuest>(`${this.apiUrl.get()}/quests/${id}`);
  }
  history(page = 1, limit = 20): Observable<Paginated<PlayerQuest>> {
    const params = buildPagedParams(page, limit);
    return this.http.get<unknown>(`${this.apiUrl.get()}/quests/history`, { params })
      .pipe(map(r => normalizePaginated<PlayerQuest>(r, limit)));
  }
  claim(questId: number): Observable<{ ok: boolean; coins_claimed?: number; new_balance?: number; reason?: string }> {
    return this.http.post<{ ok: boolean; coins_claimed?: number; new_balance?: number; reason?: string }>(
      `${this.apiUrl.get()}/quests/${questId}/claim`,
      {}
    );
  }
}
