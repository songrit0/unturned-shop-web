import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  template: `
    <div class="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
      <div class="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
        <div class="text-center mb-6">
          <span class="mi xl text-brand-500">storefront</span>
          <h1 class="text-3xl font-bold mt-2">SellVault Shop</h1>
          <p class="text-slate-500 dark:text-slate-400 mt-1">
            เข้าสู่ระบบเพื่อซื้อ-ขายของ จัดการ coin
          </p>
        </div>
        <button (click)="login()"
                class="w-full flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752c4] text-white font-semibold py-3 rounded-xl transition">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 71 55" fill="currentColor">
            <path d="M60.1 4.9A58.5 58.5 0 0 0 45.6.5l-.7 1.4a52.7 52.7 0 0 1 12.1 4.1c-7.2-3.5-15.3-5.3-23.3-5.3S17.7 2.5 10.6 6a52.5 52.5 0 0 1 12.1-4L22 .5A58.5 58.5 0 0 0 7.5 4.9C-2.5 21.2-2.5 37 .5 53l.9 1.1a59 59 0 0 0 17.6 9l3.6-5a39.7 39.7 0 0 1-9.4-4.6c.8.6 1.7 1.1 2.6 1.6 8 4.3 17 6.6 26.4 6.6 9.4 0 18.3-2.3 26.4-6.6.9-.5 1.8-1 2.6-1.6a39.7 39.7 0 0 1-9.4 4.6l3.6 5a59 59 0 0 0 17.6-9l.9-1.1c3-16 3-31.8-7-48.1ZM23.7 37.2c-3.5 0-6.4-3.2-6.4-7.2 0-4 2.8-7.3 6.4-7.3 3.5 0 6.4 3.2 6.4 7.3 0 4-2.9 7.2-6.4 7.2Zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2 0-4 2.8-7.3 6.4-7.3s6.4 3.2 6.4 7.3c0 4-2.9 7.2-6.4 7.2Z"/>
          </svg>
          เข้าสู่ระบบด้วย Discord
        </button>
        <p class="text-xs text-slate-400 text-center mt-6">
          ใช้ Discord เดียวกับที่ใช้กับบอท
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  constructor(private auth: AuthService) {}
  login() { this.auth.startLogin(); }
}
