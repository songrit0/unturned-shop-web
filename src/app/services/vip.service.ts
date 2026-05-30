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
}

export interface VipGrant {
  group_id: string;
  expires_at: string;
}

export interface VipMine {
  linked: boolean;
  steam_id: string | null;
  grants: VipGrant[];
}

export interface VipBuyResult {
  ok: true;
  tier: string;
  group_id: string;
  days: number;
  price: number;
  balance: number;
  expires_at: string;
}

@Injectable({ providedIn: 'root' })
export class VipService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  private base() { return `${this.apiUrl.get()}/vip`; }

  packages(): Observable<VipPackage[]> {
    return this.http.get<VipPackage[]>(`${this.base()}/packages`);
  }
  mine(): Observable<VipMine> {
    return this.http.get<VipMine>(`${this.base()}/mine`);
  }
  buy(packageId: number): Observable<VipBuyResult> {
    return this.http.post<VipBuyResult>(`${this.base()}/buy`, { package_id: packageId });
  }
}
