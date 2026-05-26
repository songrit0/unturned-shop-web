import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { LinkService, WelcomeResult } from '../../services/link.service';

@Component({
  selector: 'app-home',
  template: `
    <div class="max-w-4xl mx-auto p-6">
      <ng-container *ngIf="auth.me$ | async as me">
        <div class="bg-gradient-to-br from-brand-500 to-brand-700 text-white rounded-2xl p-6 shadow-lg mb-6">
          <h2 class="text-2xl font-bold flex items-center gap-2">
            <span class="mi lg">waving_hand</span> สวัสดี {{ me.username }}
          </h2>
          <p class="text-white/80 mt-1 flex items-center gap-2">
            <span class="mi">{{ me.linked ? 'verified' : 'link_off' }}</span>
            {{ me.linked ? 'บัญชี Steam: ' + me.steam_id : 'ยังไม่ผูกบัญชี Steam' }}
          </p>
        </div>

        <div *ngIf="!me.linked" class="mb-6 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/30 p-5">
          <div class="flex items-start gap-3">
            <span class="mi xl text-amber-600">redeem</span>
            <div class="flex-1">
              <p class="font-semibold text-amber-700 dark:text-amber-300">Welcome Pack</p>
              <p class="text-sm mt-1 text-amber-700/80 dark:text-amber-200/80">
                สร้าง code → เข้าเกม → พิมพ์ <code class="bg-amber-100 dark:bg-amber-800 px-1 rounded">/link &lt;code&gt;</code> → ผูกบัญชี + รับ Welcome Pack
              </p>

              <ng-container *ngIf="!code; else codeBox">
                <button (click)="generate()" [disabled]="loading"
                        class="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-50">
                  <span *ngIf="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span *ngIf="!loading" class="mi">card_giftcard</span>
                  {{ loading ? 'กำลังสร้าง...' : 'สร้าง Welcome Code' }}
                </button>
                <p *ngIf="error" class="text-sm text-rose-600 mt-2">{{ error }}</p>
              </ng-container>

              <ng-template #codeBox>
                <div class="mt-3 bg-white dark:bg-slate-800 rounded-lg p-4 border border-amber-200">
                  <p class="text-xs text-slate-500">Code ของคุณ (ใช้ได้ครั้งเดียว):</p>
                  <div class="flex items-center gap-2 mt-1">
                    <code class="text-2xl font-mono font-bold tracking-widest text-amber-600">{{ code }}</code>
                    <button (click)="copy()" class="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200 flex items-center gap-1">
                      <span class="mi">{{ copied ? 'check' : 'content_copy' }}</span>
                      {{ copied ? 'คัดลอกแล้ว' : 'คัดลอก' }}
                    </button>
                  </div>
                  <p class="text-sm mt-3">
                    เข้าเกม Unturned → พิมพ์:
                    <code class="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded font-mono">/link {{ code }}</code>
                  </p>
                </div>
              </ng-template>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <a routerLink="/shop" class="block bg-white dark:bg-slate-800 rounded-xl shadow hover:shadow-lg p-5 transition">
            <span class="mi xl text-brand-500">shopping_bag</span>
            <p class="font-semibold mt-2">Shop</p>
            <p class="text-xs text-slate-500">ของในร้าน</p>
          </a>
          <a routerLink="/bills" class="block bg-white dark:bg-slate-800 rounded-xl shadow hover:shadow-lg p-5 transition">
            <span class="mi xl text-emerald-500">payments</span>
            <p class="font-semibold mt-2">Bills</p>
            <p class="text-xs text-slate-500">ธนบัตรในเกม</p>
          </a>
          <a routerLink="/coins" class="block bg-white dark:bg-slate-800 rounded-xl shadow hover:shadow-lg p-5 transition">
            <span class="mi xl text-amber-500">paid</span>
            <p class="font-semibold mt-2">Coins</p>
            <p class="text-xs text-slate-500">ยอด + ประวัติ</p>
          </a>
          <a routerLink="/codes" class="block bg-white dark:bg-slate-800 rounded-xl shadow hover:shadow-lg p-5 transition">
            <span class="mi xl text-rose-500">history</span>
            <p class="font-semibold mt-2">โค้ด</p>
            <p class="text-xs text-slate-500">ประวัติ + ใช้ซ้ำ</p>
          </a>
        </div>

        <div *ngIf="me.is_admin" class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <a routerLink="/admin/market" class="block bg-rose-50 dark:bg-rose-900/20 rounded-xl shadow hover:shadow-lg p-5 transition border border-rose-200 dark:border-rose-900">
            <span class="mi xl text-rose-500">build</span>
            <p class="font-semibold mt-2 text-rose-700 dark:text-rose-300">จัดการร้านค้า</p>
            <p class="text-xs text-rose-600/70 dark:text-rose-300/70">Admin · Market</p>
          </a>
          <a routerLink="/admin/coins" class="block bg-rose-50 dark:bg-rose-900/20 rounded-xl shadow hover:shadow-lg p-5 transition border border-rose-200 dark:border-rose-900">
            <span class="mi xl text-amber-500">account_balance_wallet</span>
            <p class="font-semibold mt-2 text-rose-700 dark:text-rose-300">จัดการ Coin</p>
            <p class="text-xs text-rose-600/70 dark:text-rose-300/70">Admin · Coins</p>
          </a>
        </div>

        <div class="mt-6 text-center">
          <a routerLink="/help" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
            <span class="mi">help</span> วิธีใช้งานระบบ + ระบบเศรษฐกิจ
          </a>
        </div>
      </ng-container>
    </div>
  `,
})
export class HomeComponent {
  loading = false;
  error: string | null = null;
  code: string | null = null;
  copied = false;

  constructor(public auth: AuthService, private link: LinkService) {}

  generate() {
    this.loading = true; this.error = null;
    this.link.createWelcomeCode().subscribe({
      next: (res: WelcomeResult) => {
        this.loading = false;
        if (res.alreadyLinked) {
          this.error = 'บัญชีนี้ผูกแล้ว (steam ' + res.steamId + ')';
          this.auth.refreshMe().subscribe();
        } else this.code = res.code;
      },
      error: e => { this.loading = false; this.error = e?.error?.message || 'เกิดข้อผิดพลาด ลองใหม่'; },
    });
  }

  copy() {
    if (!this.code) return;
    navigator.clipboard.writeText(this.code).then(() => {
      this.copied = true;
      setTimeout(() => this.copied = false, 2000);
    });
  }
}
