import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from './api-url.service';

// Admin view of a battlepass tier (GET /admin/donate/tiers). Rewards are raw refs (no
// resolved name/image — the picker resolves those client-side when editing).
export interface AdminDonateReward {
  kind: 'item' | 'vehicle';
  item_id: number;
  amount: number;
  quality: number;
}

export interface AdminDonateTier {
  id: number;
  threshold_baht: number;
  name: string;
  enabled: boolean;
  sort: number;
  rewards: AdminDonateReward[];
}

// Create/update payload. PUT replaces the full rewards array.
export interface AdminDonateTierPayload {
  threshold_baht: number;
  name: string;
  enabled: boolean;
  sort: number;
  rewards: AdminDonateReward[];
}

@Injectable({ providedIn: 'root' })
export class AdminDonateService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  listTiers(): Observable<AdminDonateTier[]> {
    return this.http.get<AdminDonateTier[]>(`${this.apiUrl.get()}/admin/donate/tiers`);
  }

  createTier(payload: AdminDonateTierPayload): Observable<AdminDonateTier> {
    return this.http.post<AdminDonateTier>(`${this.apiUrl.get()}/admin/donate/tiers`, payload);
  }

  updateTier(id: number, payload: AdminDonateTierPayload): Observable<AdminDonateTier> {
    return this.http.put<AdminDonateTier>(`${this.apiUrl.get()}/admin/donate/tiers/${id}`, payload);
  }

  deleteTier(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.apiUrl.get()}/admin/donate/tiers/${id}`);
  }
}
