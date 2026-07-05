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
const ACT_AS_USER_KEY = 'act_as_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _me$ = new BehaviorSubject<Me | null>(null);
  me$: Observable<Me | null> = this._me$.asObservable();

  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  get token(): string | null { return localStorage.getItem(TOKEN_KEY); }
  setToken(t: string) { localStorage.setItem(TOKEN_KEY, t); }
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ACT_AS_USER_KEY);
    this._me$.next(null);
  }

  /**
   * โหมดเทสสำหรับ admin: interceptor จะส่ง X-Act-As-User: 1 ให้ API ลดสิทธิ์เป็น user ทั้งระบบ
   * (API เช็ค is_admin จาก JWT ก่อน — user ธรรมดาส่ง header นี้ไปก็ไม่มีผล)
   */
  get actAsUser(): boolean { return localStorage.getItem(ACT_AS_USER_KEY) === '1'; }
  toggleActAsUser() {
    if (this.actAsUser) localStorage.removeItem(ACT_AS_USER_KEY);
    else localStorage.setItem(ACT_AS_USER_KEY, '1');
    // ponytail: reload ทั้งหน้า = ทุก service/เมนู refetch ใน role ใหม่พร้อมกัน ไม่ต้องไล่เคลียร์ state
    location.reload();
  }

  /** Send the user to the backend's Discord OAuth entry. */
  startLogin() {
    window.location.href = `${this.apiUrl.get()}/auth/discord`;
  }

  /**
   * Steam ID + PIN login (second auth path). POSTs {steam_id, pin} to /auth/steam-pin.
   * On 200 the backend returns a JWT identical in shape to the Discord one — caller stores it
   * via setToken() + refreshMe(), same tail as the Discord callback.
   * Errors are NOT swallowed here: the caller needs the HTTP status to distinguish
   * 401 {error:'invalid'} (wrong/no pin) from 429 {error:'too_many_attempts', retry_after} (locked).
   */
  loginWithPin(steam_id: string, pin: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.apiUrl.get()}/auth/steam-pin`, { steam_id, pin });
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
