import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from './api-url.service';

export interface HelpTopic {
  id: number;
  title: string;
  body: string;
  category: string | null;
  icon: string | null;
  sort_order: number;
  enabled: boolean;
  updated_at?: string;
}

export interface HelpInput {
  title: string;
  body: string;
  category?: string | null;
  icon?: string | null;
  sort_order?: number;
  enabled?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminHelpService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  list(): Observable<HelpTopic[]> {
    return this.http.get<HelpTopic[]>(`${this.apiUrl.get()}/admin/help`);
  }
  create(input: HelpInput): Observable<HelpTopic> {
    return this.http.post<HelpTopic>(`${this.apiUrl.get()}/admin/help`, input);
  }
  update(id: number, input: HelpInput): Observable<HelpTopic> {
    return this.http.put<HelpTopic>(`${this.apiUrl.get()}/admin/help/${id}`, input);
  }
  remove(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.apiUrl.get()}/admin/help/${id}`);
  }
}
