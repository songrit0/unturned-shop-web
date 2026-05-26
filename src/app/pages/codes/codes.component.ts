import { Component, OnInit } from '@angular/core';
import { CodesService, MyCode } from '../../services/codes.service';

@Component({
  selector: 'app-codes',
  template: `
    <div class="max-w-4xl mx-auto p-4 space-y-4">
      <h1 class="text-2xl font-bold flex items-center gap-2">
        <span class="mi lg text-brand-500">history</span> ประวัติโค้ด
      </h1>
      <p class="text-sm text-slate-500">โค้ดทั้งหมดที่คุณสั่งซื้อ — กด คัดลอก ไปใช้ในเกมได้</p>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div *ngIf="codes.length === 0" class="text-center py-12 text-slate-400">
          <span class="mi xl block mb-2">receipt_long</span>
          ยังไม่เคยซื้อโค้ด
        </div>

        <div *ngFor="let c of codes" class="bg-white dark:bg-slate-800 rounded-xl shadow p-4">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-3">
              <code class="font-mono text-xl font-bold tracking-widest"
                    [class.text-emerald-600]="c.status === 'available'"
                    [class.text-slate-400]="c.status !== 'available'"
                    [class.line-through]="c.status === 'used' || c.status === 'expired'">
                {{ c.code }}
              </code>
              <span class="text-xs px-2 py-0.5 rounded-full"
                    [class.bg-emerald-100]="c.status === 'available'"
                    [class.text-emerald-700]="c.status === 'available'"
                    [class.bg-slate-200]="c.status === 'used'"
                    [class.text-slate-600]="c.status === 'used'"
                    [class.bg-rose-100]="c.status === 'expired' || c.status === 'disabled'"
                    [class.text-rose-700]="c.status === 'expired' || c.status === 'disabled'">
                {{ statusText(c.status) }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-500">{{ c.created_at | date:'short' }}</span>
              <button (click)="copy(c.code)" [disabled]="c.status !== 'available'"
                      class="text-sm px-3 py-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 disabled:opacity-40 flex items-center gap-1">
                <span class="mi">{{ copiedCode === c.code ? 'check' : 'content_copy' }}</span>
                {{ copiedCode === c.code ? 'คัดลอกแล้ว' : 'คัดลอก' }}
              </button>
            </div>
          </div>

          <div class="mt-3 flex flex-wrap gap-2">
            <div *ngFor="let it of c.items" class="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-sm">
              <img *ngIf="it.image_url; else noImg" [src]="it.image_url" class="w-6 h-6 object-contain">
              <ng-template #noImg><span class="mi text-slate-400">inventory_2</span></ng-template>
              <span>{{ it.name || ('#' + it.item_id) }}</span>
              <span class="text-xs text-slate-500">x{{ it.amount }}</span>
            </div>
          </div>

          <p *ngIf="c.status === 'available'" class="text-xs text-slate-500 mt-3">
            เข้าเกมแล้วพิมพ์: <code class="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded font-mono">/code {{ c.code }}</code>
          </p>
        </div>
      </ng-container>

      <ng-template #loadingTpl>
        <div class="text-center py-12">
          <div class="inline-block w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </ng-template>
    </div>
  `,
})
export class CodesComponent implements OnInit {
  loading = true;
  codes: MyCode[] = [];
  copiedCode: string | null = null;

  constructor(private svc: CodesService) {}

  ngOnInit() {
    this.svc.listMine(100).subscribe({
      next: c => { this.codes = c; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  copy(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      this.copiedCode = code;
      setTimeout(() => this.copiedCode = null, 2000);
    });
  }

  statusText(s: MyCode['status']): string {
    switch (s) {
      case 'available': return 'พร้อมใช้';
      case 'used': return 'ใช้แล้ว';
      case 'expired': return 'หมดอายุ';
      case 'disabled': return 'ปิด';
    }
  }
}
