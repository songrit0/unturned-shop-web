import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, firstValueFrom, of, tap } from 'rxjs';
import pkg from '../../../package.json';
import { ApiUrlService } from './api-url.service';

export interface ApiVersion {
  name: string;
  version: string;
  commit: string | null;
  branch: string | null;
  builtAt: string;
  node: string;
  uptimeSeconds: number;
}

@Injectable({ providedIn: 'root' })
export class VersionService {
  /** Web version from package.json (build-time). */
  readonly web = { name: (pkg as any).name as string, version: (pkg as any).version as string };

  private _api$ = new BehaviorSubject<ApiVersion | null>(null);
  api$: Observable<ApiVersion | null> = this._api$.asObservable();

  /** Whether the last `/version` probe reached the API. Defaults to true until proven otherwise. */
  private _online = true;
  get online(): boolean { return this._online; }

  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  fetchApi(): Observable<ApiVersion | null> {
    return this.http.get<ApiVersion>(`${this.apiUrl.get()}/version`).pipe(
      tap(v => { this._api$.next(v); this._online = true; }),
      catchError(() => { this._api$.next(null); this._online = false; return of(null); }),
    );
  }

  /**
   * Probe the API `/version` endpoint and record connectivity. Never throws.
   * Returns true if the API responded. Used at app startup and by the offline retry button.
   */
  async probe(): Promise<boolean> {
    const v = await firstValueFrom(this.fetchApi());
    return v !== null;
  }
}
