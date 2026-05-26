import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from './api-url.service';

export type WelcomeResult =
  | { alreadyLinked: true; steamId: string }
  | { alreadyLinked: false; code: string };

@Injectable({ providedIn: 'root' })
export class LinkService {
  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  createWelcomeCode(): Observable<WelcomeResult> {
    return this.http.post<WelcomeResult>(`${this.apiUrl.get()}/link/welcome`, {});
  }
}
