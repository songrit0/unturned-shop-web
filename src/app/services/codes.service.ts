import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from './api-url.service';

export interface CodeItem { item_id: number; amount: number; name: string | null; image_url: string | null; }
export interface MyCode {
  code_id: number;
  code: string;
  max_uses: number;
  uses: number;
  enabled: number;
  expires_at: string | null;
  created_at: string;
  status: 'available' | 'used' | 'expired' | 'disabled';
  items: CodeItem[];
}

@Injectable({ providedIn: 'root' })
export class CodesService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  listMine(limit = 50): Observable<MyCode[]> {
    return this.http.get<MyCode[]>(`${this.apiUrl.get()}/codes`, { params: { limit } });
  }
}
