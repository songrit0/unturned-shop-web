import { Component, OnInit } from '@angular/core';
import { AdminMarketItem, AdminMarketService, UpsertPayload } from '../../services/admin-market.service';

@Component({
  selector: 'app-admin-market',
  template: `
    <div class="max-w-7xl mx-auto p-4 space-y-4">
      <header class="flex items-center justify-between gap-2">
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <span class="mi lg text-rose-500">build</span> จัดการร้านค้า
        </h1>
        <button (click)="openNew()" class="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg flex items-center gap-1">
          <span class="mi">add</span> เพิ่มสินค้า
        </button>
      </header>

      <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-sm flex gap-2">
        <span class="mi text-blue-500">info</span>
        <div>
          <strong>Supply/Demand:</strong> ราคาจริง (price) คำนวณจาก
          <code>base × (target ÷ stock)^elasticity</code> — อัปเดตอัตโนมัติทุก 30 วินาที
        </div>
      </div>

      <input type="search" [(ngModel)]="q" placeholder="ค้นหา id/ชื่อ..."
             class="w-full sm:w-80 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800">

      <ng-container *ngIf="!loading; else loadingTpl">
        <div class="overflow-x-auto bg-white dark:bg-slate-800 rounded-xl shadow">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 dark:bg-slate-700/50 text-left">
              <tr>
                <th class="p-3">รูป</th>
                <th class="p-3">ID</th>
                <th class="p-3">ชื่อ</th>
                <th class="p-3 text-right" title="ราคาจริง (auto)">ราคา</th>
                <th class="p-3 text-right" title="ราคาฐาน (anchor)">Base</th>
                <th class="p-3 text-right">Stock</th>
                <th class="p-3 text-right" title="stock เป้าหมาย">Target</th>
                <th class="p-3 text-right" title="ความยืดหยุ่น">Elas.</th>
                <th class="p-3 text-center">เปิด</th>
                <th class="p-3"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let it of filtered()" class="border-t border-slate-100 dark:border-slate-700">
                <td class="p-3">
                  <div class="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center overflow-hidden">
                    <img *ngIf="it.image_url; else noImg" [src]="it.image_url" class="w-full h-full object-contain p-1">
                    <ng-template #noImg><span class="mi text-slate-400">inventory_2</span></ng-template>
                  </div>
                </td>
                <td class="p-3 font-mono text-xs">{{ it.item_id }}</td>
                <td class="p-3 font-medium">{{ it.name }}</td>
                <td class="p-3 text-right font-semibold"
                    [class.text-emerald-600]="it.price < it.base_price"
                    [class.text-rose-600]="it.price > it.base_price">
                  {{ it.price | number }}
                  <span *ngIf="it.price < it.base_price" class="mi text-xs">trending_down</span>
                  <span *ngIf="it.price > it.base_price" class="mi text-xs">trending_up</span>
                </td>
                <td class="p-3 text-right text-slate-500">{{ it.base_price | number }}</td>
                <td class="p-3 text-right">{{ it.amount | number }}</td>
                <td class="p-3 text-right text-slate-500">{{ it.target_stock | number }}</td>
                <td class="p-3 text-right text-slate-500">{{ it.elasticity | number:'1.0-2' }}</td>
                <td class="p-3 text-center">
                  <button (click)="toggle(it)" class="px-2 py-1 rounded text-xs"
                          [class.bg-emerald-100]="it.enabled" [class.text-emerald-700]="it.enabled"
                          [class.bg-slate-200]="!it.enabled" [class.text-slate-500]="!it.enabled">
                    {{ it.enabled ? 'เปิด' : 'ปิด' }}
                  </button>
                </td>
                <td class="p-3 text-right whitespace-nowrap">
                  <button (click)="openEdit(it)" class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                    <span class="mi">edit</span>
                  </button>
                  <button (click)="confirmDel(it)" class="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500">
                    <span class="mi">delete</span>
                  </button>
                </td>
              </tr>
              <tr *ngIf="filtered().length === 0">
                <td colspan="10" class="p-12 text-center text-slate-400">ไม่พบรายการ</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ng-container>
      <ng-template #loadingTpl>
        <div class="text-center py-12">
          <div class="inline-block w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </ng-template>

      <!-- Edit/Create modal -->
      <div *ngIf="editing" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 my-8">
          <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
            <span class="mi">{{ isNew ? 'add_circle' : 'edit' }}</span>
            {{ isNew ? 'เพิ่มสินค้า' : 'แก้ไขสินค้า' }}
          </h3>
          <div class="space-y-3 text-sm">
            <div class="grid grid-cols-2 gap-3">
              <label class="block">
                <span class="text-slate-500">Item ID</span>
                <input type="number" [(ngModel)]="form.item_id" [disabled]="!isNew"
                       class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 disabled:opacity-50">
              </label>
              <label class="block">
                <span class="text-slate-500">ชื่อ</span>
                <input type="text" [(ngModel)]="form.name" maxlength="64"
                       class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700">
              </label>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <label class="block">
                <span class="text-slate-500">Base price (anchor)</span>
                <input type="number" [(ngModel)]="form.base_price" min="0" step="0.1"
                       class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700">
              </label>
              <label class="block">
                <span class="text-slate-500">Stock ปัจจุบัน</span>
                <input type="number" [(ngModel)]="form.amount" min="0"
                       class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700">
              </label>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <label class="block">
                <span class="text-slate-500">Target stock <span class="text-xs">(ที่ราคา = base)</span></span>
                <input type="number" [(ngModel)]="form.target_stock" min="1"
                       class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700">
              </label>
              <label class="block">
                <span class="text-slate-500">Elasticity <span class="text-xs">(0=คงที่ • 0.5=กลาง • 1=เต็ม)</span></span>
                <input type="number" [(ngModel)]="form.elasticity" min="0" max="2" step="0.1"
                       class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700">
              </label>
            </div>

            <div class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-xs space-y-1">
              <p class="font-medium">ตัวอย่างคำนวณ:</p>
              <p>stock = {{ form.amount }} → ราคา ≈ <strong>{{ preview() | number }}</strong></p>
              <p class="text-slate-500">stock = {{ form.target_stock }} (target) → {{ form.base_price | number }} | stock น้อย → แพง | stock เยอะ → ถูก</p>
            </div>

            <label class="block">
              <span class="text-slate-500">Image URL (optional)</span>
              <input type="url" [(ngModel)]="form.image_url" maxlength="512"
                     class="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700">
            </label>
            <label class="flex items-center gap-2">
              <input type="checkbox" [(ngModel)]="form.enabled">
              <span>เปิดขาย</span>
            </label>
          </div>
          <p *ngIf="error" class="text-sm text-rose-500 mt-3">{{ error }}</p>
          <div class="flex gap-2 mt-5">
            <button (click)="editing = null" class="flex-1 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg">ยกเลิก</button>
            <button (click)="save()" [disabled]="saving"
                    class="flex-1 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg">
              {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Delete confirm -->
      <div *ngIf="deleting" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
          <span class="mi xl text-rose-500">warning</span>
          <h3 class="text-lg font-bold mt-2">ลบสินค้านี้?</h3>
          <p class="text-sm text-slate-500 mt-1">{{ deleting.name }} (#{{ deleting.item_id }})</p>
          <div class="flex gap-2 mt-5">
            <button (click)="deleting = null" class="flex-1 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg">ยกเลิก</button>
            <button (click)="confirmDelete()" class="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg">ลบ</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminMarketComponent implements OnInit {
  loading = true;
  saving = false;
  error: string | null = null;
  items: AdminMarketItem[] = [];
  q = '';

  editing: AdminMarketItem | null = null;
  isNew = false;
  form: UpsertPayload = this.emptyForm();
  deleting: AdminMarketItem | null = null;

  constructor(private svc: AdminMarketService) {}

  ngOnInit() { this.reload(); }

  reload() {
    this.loading = true;
    this.svc.list().subscribe({
      next: it => { this.items = it; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  filtered(): AdminMarketItem[] {
    const s = this.q.trim().toLowerCase();
    if (!s) return this.items;
    return this.items.filter(i => i.name.toLowerCase().includes(s) || String(i.item_id).includes(s));
  }

  emptyForm(): UpsertPayload {
    return { item_id: 0, name: '', base_price: 100, target_stock: 10, elasticity: 0.5, amount: 10, image_url: '', enabled: true };
  }

  openNew() {
    this.editing = { item_id: 0, name: '', price: 0, amount: 10, base_price: 100, target_stock: 10, elasticity: 0.5, image_url: null, enabled: 1 };
    this.isNew = true;
    this.form = this.emptyForm();
    this.error = null;
  }

  openEdit(it: AdminMarketItem) {
    this.editing = it;
    this.isNew = false;
    this.form = {
      item_id: it.item_id, name: it.name,
      base_price: it.base_price, target_stock: it.target_stock, elasticity: it.elasticity,
      amount: it.amount, image_url: it.image_url || '', enabled: !!it.enabled,
    };
    this.error = null;
  }

  /** Local preview of the supply/demand formula (matches backend PricingService.compute). */
  preview(): number {
    const base = Number(this.form.base_price) || 0;
    if (base <= 0) return 0;
    const e = Math.max(0, Math.min(Number(this.form.elasticity) || 0, 2));
    const tgt = Math.max(1, Number(this.form.target_stock) || 1);
    const cur = Math.max(1, Number(this.form.amount) || 1);
    const raw = base * Math.pow(tgt / cur, e);
    return Math.round(Math.max(base * 0.1, Math.min(raw, base * 10)));
  }

  save() {
    if (!this.form.item_id || !this.form.name?.trim()) {
      this.error = 'กรอก item_id และ ชื่อ';
      return;
    }
    this.saving = true;
    this.svc.upsert({
      item_id: Number(this.form.item_id),
      name: this.form.name.trim(),
      base_price: Number(this.form.base_price) || 0,
      target_stock: Number(this.form.target_stock) || 1,
      elasticity: Number(this.form.elasticity) || 0,
      amount: Number(this.form.amount) || 0,
      image_url: this.form.image_url?.trim() || undefined,
      enabled: this.form.enabled !== false,
    }).subscribe({
      next: () => { this.saving = false; this.editing = null; this.reload(); },
      error: e => { this.saving = false; this.error = e?.error?.message?.join?.(', ') || e?.error?.message || 'บันทึกไม่สำเร็จ'; },
    });
  }

  toggle(it: AdminMarketItem) {
    this.svc.toggle(it.item_id, !it.enabled).subscribe(updated => {
      const i = this.items.findIndex(x => x.item_id === it.item_id);
      if (i >= 0) this.items[i] = updated;
    });
  }

  confirmDel(it: AdminMarketItem) { this.deleting = it; }
  confirmDelete() {
    if (!this.deleting) return;
    const id = this.deleting.item_id;
    this.svc.remove(id).subscribe(() => {
      this.items = this.items.filter(x => x.item_id !== id);
      this.deleting = null;
    });
  }
}
