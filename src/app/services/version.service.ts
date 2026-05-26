import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';
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

  constructor(private http: HttpClient, private apiUrl: ApiUrlService) {}

  fetchApi(): Observable<ApiVersion | null> {
    return this.http.get<ApiVersion>(`${this.apiUrl.get()}/version`).pipe(
      tap(v => this._api$.next(v)),
      catchError(() => { this._api$.next(null); return of(null); }),
    );
  }
}
