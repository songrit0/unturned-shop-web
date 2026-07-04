import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from './api-url.service';
import { PlayerStatEntry } from './player-stats.service';

// Public (no-auth) landing data — served by the API's PublicController (GET /public/landing).

export interface ServerStatus {
  online: boolean;
  players: number;
  maxPlayers: number;
  nextRestart: string | null; // ISO UTC
  state: string;
}

export interface P2pLatestEntry {
  id: number;
  itemId: number;
  itemName: string | null;
  imageUrl: string | null;
  price: number;
  amount: number;
  isBundle?: boolean;
  createdAt: string;
}

/** One online player for the header widget. `hours` = lifetime playtime in hours. */
export interface OnlinePlayerEntry {
  steamId: string;
  name: string;
  hours: number;
}

export interface OnlinePlayersResult {
  count: number;
  players: OnlinePlayerEntry[];
}

export interface DonateTotal {
  communityTotal: number;
  communityGoal: number;
  period: string;
}

export interface LandingData {
  server: ServerStatus;
  p2pLatest: P2pLatestEntry[];
  donateTotal: DonateTotal;
  topPlayers: PlayerStatEntry[];
}

@Injectable({ providedIn: 'root' })
export class PublicService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  landing(p2pLimit = 8, topLimit = 10): Observable<LandingData> {
    return this.http.get<LandingData>(
      `${this.apiUrl.get()}/public/landing?p2pLimit=${p2pLimit}&topLimit=${topLimit}`,
    );
  }

  onlinePlayers(): Observable<OnlinePlayersResult> {
    return this.http.get<OnlinePlayersResult>(`${this.apiUrl.get()}/public/online-players`);
  }

  serverStatus(): Observable<ServerStatus> {
    return this.http.get<ServerStatus>(`${this.apiUrl.get()}/public/server-status`);
  }
}
