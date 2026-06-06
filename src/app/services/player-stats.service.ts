import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from './api-url.service';

export interface PlayerStatEntry {
  steamId: string;
  name: string;
  kills: number;
  headshots: number;
  pvpDeaths: number;
  pveDeaths: number;
  zombies: number;
  playtime: number;
  kdRatio: number;
}

@Injectable({ providedIn: 'root' })
export class PlayerStatsService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  leaderboard(limit = 10): Observable<{ players: PlayerStatEntry[] }> {
    return this.http.get<{ players: PlayerStatEntry[] }>(
      `${this.apiUrl.get()}/player-stats/leaderboard?limit=${limit}`,
    );
  }
}
