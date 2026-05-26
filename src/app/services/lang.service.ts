import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

type Lang = 'th' | 'en';
const KEY = 'shop_lang';

@Injectable({ providedIn: 'root' })
export class LangService {
  private _lang$ = new BehaviorSubject<Lang>('th');
  lang$ = this._lang$.asObservable();

  constructor(private t: TranslateService) {
    t.addLangs(['th', 'en']);
    t.setDefaultLang('th');
    const saved = localStorage.getItem(KEY) as Lang | null;
    this.set(saved === 'en' ? 'en' : 'th');
  }

  set(l: Lang) {
    this._lang$.next(l);
    this.t.use(l);
    localStorage.setItem(KEY, l);
  }

  toggle() { this.set(this._lang$.value === 'th' ? 'en' : 'th'); }

  get current(): Lang { return this._lang$.value; }
}
