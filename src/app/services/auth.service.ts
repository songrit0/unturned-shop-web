import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ApiUrlService } from './api-url.service';

export interface Me {
  discord_id: string;
  username: string;
  avatar: string | null;
  steam_id: string | null;
  linked: boolean;
  is_admin: boolean;
}

const TOKEN_KEY = 'shop_jwt';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _me$ = new BehaviorSubject<Me | null>(null);
  me$: Observable<Me | null> = this._me$.asObservable();

  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  get token(): string | null { return localStorage.getItem(TOKEN_KEY); }
  setToken(t: string) { localStorage.setItem(TOKEN_KEY, t); }
  clear() { localStorage.removeItem(TOKEN_KEY); this._me$.next(null); }

  /** Send the user to the backend's Discord OAuth entry. */
  startLogin() {
    window.location.href = `${this.apiUrl.get()}/auth/discord`;
  }

  /** Fetch /auth/me with current token; updates the cached observable. */
  refreshMe(): Observable<Me | null> {
    if (!this.token) { this._me$.next(null); return of(null); }
    return this.http.get<Me>(`${this.apiUrl.get()}/auth/me`).pipe(
      tap(me => this._me$.next(me)),
      catchError(() => { this.clear(); return of(null); }),
    );
  }

  get current(): Me | null { return this._me$.value; }
}
