import { Component, OnInit } from '@angular/core';
import { AdjustResult, AdminCoinsService, ActivityRow, CoinUserRow, CoinUsersPage } from '../../services/admin-coins.service';

@Component({
  selector: 'app-admin-coins',
  template: `
    <div class="max-w-6xl mx-auto p-4 space-y-4">
      <header class="flex items-center justify-between gap-2">
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <span class="mi lg text-amber-500">account_balance_wallet</span> จัดการ Coin
        </h1>
      </header>

      <div class="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-sm flex gap-2">
        <span class="mi text-amber-500">info</span>
        <div>การ <strong>+ Grant</strong> และ <strong>− Take</strong> จะถูกบันทึกใน activity_log (kind=<code>admin_grant</code>/<code>admin_take</code>)</div>
      </div>

      <div class="relative max-w-sm">
        <span class="mi absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
        <input type="search" [(ngModel)]="q" (ngModelChange)="onSearch()" placeholder="ค้นหา steam_id / discord_id..."
               class="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800">
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div class="overflow-x-auto bg-white dark:bg-slate-800 rounded-xl shadow">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-700/50 text-left">
              <tr>
                <th class="p-3">Steam ID</th>
                <th class="p-3">Discord ID</th>
                <th class="p-3">ผูกเมื่อ</th>
                <th class="p-3 text-right">Balance</th>
                <th class="p-3"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of page?.items" class="border-t border-slate-100 dark:border-slate-700">
                <td class="p-3 font-mono text-xs">{{ u.steam_id }}</td>
                <td class="p-3 font-mono text-xs text-slate-500">{{ u.discord_id || '—' }}</td>
                <td class="p-3 text-xs text-slate-500">{{ u.linked_at ? (u.linked_at | date:'short') : '—' }}</td>
                <td class="p-3 text-right font-bold text-amber-500">{{ u.balance | number }}</td>
                <td class="p-3 text-right whitespace-nowrap">
                  <button (click)="openAdjust(u, 1)" class="text-xs px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded flex-inline items-center gap-1">
                    <span class="mi">add</span> Grant
                  </button>
                  <button (click)="openAdjust(u, -1)" class="text-xs px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded ml-1">
                    <span class="mi">remove</span> Take
                  </button>
                  <button (click)="openHistory(u)" class="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 rounded ml-1">
                    <span class="mi">history</span>
                  </button>
                </td>
              </tr>
              <tr *ngIf="page && page.items.length === 0">
                <td colspan="5" class="p-12 text-center text-slate-400">ไม่พบ user</td>
              </tr>
            </tbody>
          </table>
        </div>

        <app-pager *ngIf="page"
          [page]="page.page" [pages]="page.pages"
          [total]="page.total" [limit]="page.limit"
          (pageChange)="load($event, page.limit)"
          (limitChange)="load(1, $event)"></app-pager>
      </ng-container>

      <ng-template #loadingTpl>
        <div class="text-center py-12">
          <div class="inline-block w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </ng-template>

      <!-- Adjust modal -->
      <div *ngIf="adjusting" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6">
          <h3 class="text-xl font-bold mb-2 flex items-center gap-2">
            <span class="mi" [class.text-emerald-500]="sign>0" [class.text-rose-500]="sign<0">
              {{ sign > 0 ? 'add_circle' : 'remove_circle' }}
            </span>
            {{ sign > 0 ? 'Grant Coin' : 'Take Coin' }}
          </h3>
          <p class="text-xs text-slate-500 mb-3 font-mono">{{ adjusting.steam_id }}</p>
          <p class="text-sm">Balance ปัจจุบัน: <strong class="text-amber-500">{{ adjusting.balance | number }}</strong></p>

          <div class="space-y-3 text-sm mt-4">
            <label class="block">
              <span class="text-slate-500">จำนวน</span>
              <input type="number" [(ngModel)]="amount" min="1"
                     class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700">
            </label>
            <label class="block">
              <span class="text-slate-500">เหตุผล (optional)</span>
              <input type="text" [(ngModel)]="reason" maxlength="80" placeholder="เช่น: shop refund"
                     class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700">
            </label>
          </div>

          <p *ngIf="error" class="text-sm text-rose-500 mt-3">{{ error }}</p>
          <div class="flex gap-2 mt-5">
            <button (click)="adjusting = null" class="flex-1 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg">ยกเลิก</button>
            <button (click)="confirmAdjust()" [disabled]="saving"
                    class="flex-1 py-2 text-white rounded-lg disabled:opacity-50"
                    [class.bg-emerald-500]="sign>0" [class.hover:bg-emerald-600]="sign>0"
                    [class.bg-rose-500]="sign<0" [class.hover:bg-rose-600]="sign<0">
              {{ saving ? 'กำลังบันทึก...' : (sign > 0 ? 'Grant' : 'Take') }}
            </button>
          </div>
        </div>
      </div>

      <!-- History modal -->
      <div *ngIf="showHistory" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-bold flex items-center gap-2">
              <span class="mi">history</span> ประวัติ
            </h3>
            <button (click)="showHistory = null" class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
              <span class="mi">close</span>
            </button>
          </div>
          <p class="text-xs text-slate-500 font-mono mb-3">{{ showHistory.steam_id }}</p>
          <div class="max-h-80 overflow-y-auto">
            <p *ngIf="history.length === 0" class="text-center text-slate-400 py-8">ยังไม่มีประวัติ</p>
            <ul class="space-y-1 text-sm">
              <li *ngFor="let h of history" class="flex justify-between border-b border-slate-100 dark:border-slate-700 py-1.5">
                <span>
                  <span class="font-mono text-xs">{{ h.kind }}</span>
                  <span class="text-slate-400 text-xs ml-2">{{ h.at | date:'short' }}</span>
                </span>
                <span [class.text-emerald-600]="h.coins > 0" [class.text-rose-600]="h.coins < 0">
                  {{ h.coins > 0 ? '+' : '' }}{{ h.coins | number }}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminCoinsComponent implements OnInit {
  loading = true;
  page: CoinUsersPage | null = null;
  q = '';
  qDebounce: any;

  adjusting: CoinUserRow | null = null;
  sign: 1 | -1 = 1;
  amount = 0;
  reason = '';
  saving = false;
  error: string | null = null;

  showHistory: CoinUserRow | null = null;
  history: ActivityRow[] = [];

  constructor(private svc: AdminCoinsService) {}

  ngOnInit() { this.load(1, 20); }

  load(page: number, limit: number) {
    this.loading = true;
    this.svc.listUsers(page, limit, this.q).subscribe({
      next: p => { this.page = p; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  onSearch() {
    clearTimeout(this.qDebounce);
    this.qDebounce = setTimeout(() => this.load(1, this.page?.limit || 20), 300);
  }

  openAdjust(u: CoinUserRow, sign: 1 | -1) {
    this.adjusting = u; this.sign = sign;
    this.amount = 0; this.reason = ''; this.error = null;
  }

  confirmAdjust() {
    if (!this.adjusting) return;
    const n = Number(this.amount);
    if (!n || n <= 0) { this.error = 'ใส่จำนวน > 0'; return; }
    const delta = this.sign * n;
    this.saving = true;
    this.svc.adjust(this.adjusting.steam_id, delta, this.reason.trim()).subscribe({
      next: (r: AdjustResult) => {
        this.saving = false;
        // update row balance
        if (this.page) {
          const row = this.page.items.find(x => x.steam_id === r.steam_id);
          if (row) row.balance = r.balance;
        }
        this.adjusting = null;
      },
      error: e => { this.saving = false; this.error = e?.error?.message || 'บันทึกไม่สำเร็จ'; },
    });
  }

  openHistory(u: CoinUserRow) {
    this.showHistory = u; this.history = [];
    this.svc.history(u.steam_id, 50).subscribe(h => this.history = h);
  }
}
