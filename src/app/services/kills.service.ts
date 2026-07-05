import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiUrlService } from './api-url.service';
import { Paginated } from '../models/paginated';
import { buildPagedParams, normalizePaginated } from './paged-http';

export { Paginated };

/** แถว kill จาก API /kills (ตาราง sv_kills ที่ปลั๊กอิน KillFeed เขียน) */
export interface KillRow {
  id: number;
  is_pvp: number;
  cause: string;
  killer_steam_id: string | null;
  killer_name: string | null;
  victim_steam_id: string;
  victim_name: string;
  weapon: string | null;
  weapon_id: number | null;
  distance: number | null;
  headshot: number;
  killer_x: number | null;
  killer_y: number | null;
  killer_z: number | null;
  victim_x: number;
  victim_y: number;
  victim_z: number;
  created_at: string;
  weapon_image: string | null;
}

export interface KillsQuery {
  from?: string;      // YYYY-MM-DD
  to?: string;        // YYYY-MM-DD
  steam_id?: string;  // admin เท่านั้น
  is_pvp?: string;    // '1' = PvP, '0' = PvE, ไม่ส่ง = ทั้งหมด
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class KillsService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  list(q: KillsQuery): Observable<Paginated<KillRow>> {
    const limit = q.limit ?? 50;
    const params = buildPagedParams(q.page ?? 1, limit, {
      from: q.from,
      to: q.to,
      steam_id: q.steam_id,
      is_pvp: q.is_pvp,
    });
    return this.http.get<unknown>(`${this.apiUrl.get()}/kills`, { params })
      .pipe(map(r => normalizePaginated<KillRow>(r, limit)));
  }
}
