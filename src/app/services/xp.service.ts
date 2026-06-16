import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from './api-url.service';

export interface XpMe {
  steam_id: string | null;
  linked: boolean;
  online: boolean;
  xp: number;
  rate: number;
  fee_percent: number;
  min: number;
  preview_coins: number;
  updated_at: string | null;
}

export interface XpConfig { rate: number; fee_percent: number; min: number; }

export type XpStatus = 'pending' | 'processing' | 'done' | 'insufficient' | 'offline' | 'error';

export interface XpRequestStatus {
  id: number;
  status: XpStatus;
  requested_xp: number;
  coins_granted: number | null;
  xp_spent: number | null;
  created_at: string;
  processed_at: string | null;
}

/**
 * XP -> Coins (web). Reads the plugin's live XP mirror and queues conversion requests the plugin
 * executes in-game. Conversion is online-only — convert() is rejected unless the player is online.
 */
@Injectable({ providedIn: 'root' })
export class XpService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  me(): Observable<XpMe> {
    return this.http.get<XpMe>(`${this.apiUrl.get()}/xp/me`);
  }

  config(): Observable<XpConfig> {
    return this.http.get<XpConfig>(`${this.apiUrl.get()}/xp/config`);
  }

  convert(amount: number): Observable<{ request_id: number; status: 'pending' }> {
    return this.http.post<{ request_id: number; status: 'pending' }>(`${this.apiUrl.get()}/xp/convert`, { amount });
  }

  requestStatus(id: number): Observable<XpRequestStatus> {
    return this.http.get<XpRequestStatus>(`${this.apiUrl.get()}/xp/request/${id}`);
  }
}
