import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiUrlService } from '../../services/api-url.service';
import { VersionService } from '../../services/version.service';

/**
 * Fullscreen fallback shown when the API `/version` probe fails at startup.
 * Offers a retry that re-probes the API and returns to the app once it's reachable.
 */
@Component({
  selector: 'app-api-error',
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200">
      <div class="max-w-md w-full text-center bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
        <div class="mx-auto mb-4 w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
          <span class="mi text-rose-500 text-4xl">cloud_off</span>
        </div>

        <h1 class="text-xl font-bold mb-2">ไม่สามารถเชื่อมต่อ API</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-1">
          ขณะนี้ระบบไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้งในภายหลัง
        </p>
        <p class="text-xs text-slate-400 dark:text-slate-500 font-mono break-all mb-6">
          {{ apiUrl.get() }}/version
        </p>

        <button
          (click)="retry()"
          [disabled]="busy"
          class="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-medium py-2.5 transition-colors">
          <span class="mi" [class.animate-spin]="busy">{{ busy ? 'progress_activity' : 'refresh' }}</span>
          {{ busy ? 'กำลังตรวจสอบ...' : 'ลองเชื่อมต่อใหม่' }}
        </button>

        <p *ngIf="failed" class="mt-3 text-xs text-rose-500">
          ยังไม่สามารถเชื่อมต่อได้ กรุณาลองอีกครั้ง
        </p>

        <p class="mt-6 text-xs text-slate-400 dark:text-slate-500 font-mono">
          web v{{ version.web.version }}
        </p>
      </div>
    </div>
  `,
})
export class ApiErrorComponent {
  busy = false;
  failed = false;

  constructor(
    public apiUrl: ApiUrlService,
    public version: VersionService,
    private router: Router,
  ) {}

  async retry() {
    if (this.busy) return;
    this.busy = true;
    this.failed = false;
    const ok = await this.version.probe();
    this.busy = false;
    if (ok) {
      this.router.navigate(['/']);
    } else {
      this.failed = true;
    }
  }
}
