import { Component, OnInit } from '@angular/core';
import { VersionService } from '../../services/version.service';

@Component({
  selector: 'app-footer',
  template: `
    <footer class="mt-12 border-t border-slate-200 dark:border-slate-700 py-4 px-3 text-xs text-slate-500 dark:text-slate-400">
      <div class="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-3">
          <span class="flex items-center gap-1">
            <span class="mi text-brand-500">web</span>
            <span class="font-mono">web v{{ ver.web.version }}</span>
          </span>
          <span *ngIf="ver.api$ | async as api" class="flex items-center gap-1">
            <span class="mi text-emerald-500">dns</span>
            <span class="font-mono" [title]="apiTitle(api)">
              api v{{ api.version }}
              <span *ngIf="api.commit" class="text-slate-400">· {{ api.commit }}</span>
            </span>
          </span>
          <span *ngIf="(ver.api$ | async) === null" class="flex items-center gap-1 text-rose-500">
            <span class="mi">cloud_off</span> api offline
          </span>
        </div>
        <a routerLink="/help" class="hover:text-brand-600 flex items-center gap-1">
          <span class="mi">help</span> {{ 'nav.help' | translate }}
        </a>
      </div>
    </footer>
  `,
})
export class FooterComponent implements OnInit {
  constructor(public ver: VersionService) {}

  ngOnInit() {
    this.ver.fetchApi().subscribe();
  }

  apiTitle(api: any): string {
    const parts = [`branch: ${api.branch ?? '?'}`, `node: ${api.node}`, `uptime: ${api.uptimeSeconds}s`];
    return parts.join(' · ');
  }
}
