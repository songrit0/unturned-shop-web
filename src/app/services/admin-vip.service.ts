import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from './api-url.service';

export interface VipPackage {
  id: number;
  tier: string;
  group_id: string;
  days: number;
  price_coins: number;
  label: string | null;
  sort: number;
  enabled: number;
}

export interface VipGrant {
  id: number;
  steam_id: string;
  group_id: string;
  expires_at: string;
  active: number;
  updated_at: string;
}

export type VipPackageInput = Partial<Omit<VipPackage, 'id' | 'enabled'>> & { enabled?: boolean };

@Injectable({ providedIn: 'root' })
export class AdminVipService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  private base() { return `${this.apiUrl.get()}/admin/vip`; }

  // packages
  listPackages(): Observable<VipPackage[]> {
    return this.http.get<VipPackage[]>(`${this.base()}/packages`);
  }
  createPackage(body: VipPackageInput): Observable<VipPackage> {
    return this.http.post<VipPackage>(`${this.base()}/packages`, body);
  }
  updatePackage(id: number, body: VipPackageInput): Observable<VipPackage> {
    return this.http.patch<VipPackage>(`${this.base()}/packages/${id}`, body);
  }
  deletePackage(id: number): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.base()}/packages/${id}`);
  }

  // grants
  grantsForUser(steamId: string): Observable<VipGrant[]> {
    return this.http.get<VipGrant[]>(`${this.base()}/grants/${steamId}`);
  }
  extend(steamId: string, group_id: string, days: number): Observable<VipGrant> {
    return this.http.post<VipGrant>(`${this.base()}/grants/${steamId}/extend`, { group_id, days });
  }
  setExpiry(steamId: string, group_id: string, expires_at: string): Observable<VipGrant> {
    return this.http.post<VipGrant>(`${this.base()}/grants/${steamId}/set`, { group_id, expires_at });
  }
  revoke(steamId: string, group_id: string): Observable<{ revoked: boolean }> {
    return this.http.post<{ revoked: boolean }>(`${this.base()}/grants/${steamId}/revoke`, { group_id });
  }
}
