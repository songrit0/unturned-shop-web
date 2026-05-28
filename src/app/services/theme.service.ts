import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

type Theme = 'light' | 'dark';
const KEY = 'shop_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _theme$ = new BehaviorSubject<Theme>(this.detect());
  theme$ = this._theme$.asObservable();

  constructor() { this.apply(this._theme$.value); }

  toggle() {
    const next: Theme = this._theme$.value === 'dark' ? 'light' : 'dark';
    this._theme$.next(next);
    localStorage.setItem(KEY, next);
    this.apply(next);
  }

  get current(): Theme { return this._theme$.value; }

  private detect(): Theme {
    const saved = localStorage.getItem(KEY) as Theme | null;
    if (saved === 'dark' || saved === 'light') return saved;
    return 'dark';
  }

  private apply(t: Theme) {
    const body = document.body;
    body.classList.remove('theme-dark', 'theme-light');
    body.classList.add(t === 'dark' ? 'theme-dark' : 'theme-light');
    const root = document.documentElement;
    if (t === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
  }
}
