import { Component, OnInit } from '@angular/core';
import { VipBuyResult, VipMine, VipPackage, VipService } from '../../services/vip.service';
import { TopupService } from '../../services/topup.service';

@Component({
  selector: 'app-vip',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon amber"><span class="mi lg">workspace_premium</span></div>
        <h1>VIP</h1>
      </div>

      <!-- maintenance notice: set the maintenance field to false to reopen the user VIP page -->
      <div *ngIf="maintenance" class="card" style="text-align:center;padding:48px 24px;max-width:520px;margin:24px auto">
        <span class="mi xxl" style="color:var(--accent-hi)">construction</span>
        <h2 style="margin:12px 0 6px">🔧 กำลังแก้ไขระบบ VIP</h2>
        <p class="muted" style="margin:0">
          ขออภัยในความไม่สะดวก หน้านี้ปิดปรับปรุงชั่วคราว เปิดให้บริการเร็ว ๆ นี้<br>
          The VIP page is under maintenance — please check back soon.
        </p>
      </div>

      <ng-container *ngIf="!maintenance">
      <!-- not linked -->
      <div *ngIf="mine && !mine.linked" class="welcome-alert" style="margin-bottom:16px">
        <span class="alert-icon mi">link_off</span>
        <div>ยังไม่ได้เชื่อมบัญชี Steam ↔ Discord — เชื่อมก่อนถึงจะซื้อ VIP ได้</div>
      </div>

      <!-- my current VIP -->
      <div *ngIf="mine?.grants?.length" class="card" style="margin-bottom:16px">
        <h3 style="margin:0 0 8px 0;font-size:15px;font-weight:700">⭐ VIP ของคุณ</h3>
        <ul style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px">
          <li *ngFor="let g of mine?.grants" class="row" style="justify-content:space-between;font-size:13px">
            <span class="badge amber">{{ g.group_id }}</span>
            <span class="mono muted">หมดอายุ {{ g.expires_at | date:'medium' }}</span>
          </li>
        </ul>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div *ngIf="packages.length === 0" class="empty">
          <span class="mi xxl">inventory_2</span>
          <div class="empty-title">ยังไม่มีแพ็กเกจ VIP เปิดขาย</div>
        </div>

        <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px">
          <div *ngFor="let p of packages" class="card" style="display:flex;flex-direction:column;gap:8px">
            <div class="row" style="justify-content:space-between;align-items:center">
              <span class="badge amber"><span class="mi sm">workspace_premium</span>{{ p.tier }}</span>
              <span class="mono muted" style="font-size:12px">{{ p.days }} วัน</span>
            </div>
            <div style="font-weight:700;font-size:15px">{{ p.label || (p.tier + ' ' + p.days + ' วัน') }}</div>
            <div *ngIf="p.price_coins > 0" class="coin-amt lg" style="color:var(--accent-hi)"><img class="coin-img lg" src="assets/coins/coin.png" alt="">{{ p.price_coins | number }}</div>
            <div *ngIf="p.price_meowcoins && p.price_meowcoins > 0" class="coin-amt" style="color:var(--accent-hi)"><img class="coin-img meow" src="assets/coins/meowcoin.png" alt="">{{ p.price_meowcoins | number }}</div>
            <button *ngIf="p.price_coins > 0" (click)="buy(p)" [disabled]="!mine?.linked || buyingId === p.id"
                    class="btn emerald" style="margin-top:auto">
              <span class="mi sm">shopping_cart</span>
              {{ buyingId === p.id ? 'กำลังซื้อ…' : 'จ่ายด้วย Coin' }}
            </button>
            <button *ngIf="p.price_meowcoins && p.price_meowcoins > 0" (click)="buyMeow(p)" [disabled]="!mine?.linked || buyingId === p.id"
                    class="btn secondary">
              <img class="coin-img meow" src="assets/coins/meowcoin.png" alt="">
              {{ buyingId === p.id ? 'กำลังซื้อ…' : 'จ่ายด้วย Meowcoin' }}
            </button>
          </div>
        </div>
      </ng-container>

      <ng-template #loadingTpl>
        <div style="text-align:center;padding:48px 0"><div class="spinner"></div></div>
      </ng-template>

      <p *ngIf="error" style="color:var(--rose);margin-top:16px">{{ error }}</p>
      <div *ngIf="okMsg" class="welcome-alert" style="margin-top:16px;border-color:var(--emerald)">
        <span class="alert-icon mi" style="color:var(--emerald)">check_circle</span>
        <div>{{ okMsg }}</div>
      </div>
      </ng-container>
    </div>
  `,
})
export class VipComponent implements OnInit {
  /** Temporary: show a "VIP under maintenance" notice on the user page. Set to false to reopen. */
  maintenance = false;
  loading = true;
  packages: VipPackage[] = [];
  mine: VipMine | null = null;
  buyingId: number | null = null;
  error: string | null = null;
  okMsg: string | null = null;

  constructor(private vip: VipService, private topup: TopupService) {}

  ngOnInit() {
    if (this.maintenance) { this.loading = false; return; }
    this.vip.packages().subscribe({
      next: p => { this.packages = p; this.loading = false; },
      error: e => { this.loading = false; this.error = e?.error?.message || 'โหลดแพ็กเกจไม่สำเร็จ'; },
    });
    this.loadMine();
  }

  loadMine() {
    this.vip.mine().subscribe({ next: m => this.mine = m, error: () => {} });
  }

  buy(p: VipPackage) {
    if (!this.mine?.linked) return;
    if (!confirm(`ซื้อ ${p.label || p.tier} (${p.days} วัน) ราคา ${p.price_coins} Coin ?`)) return;
    this.error = null; this.okMsg = null; this.buyingId = p.id;
    this.vip.buy(p.id).subscribe({
      next: (r: VipBuyResult) => {
        this.buyingId = null;
        this.okMsg = `ซื้อ ${r.tier} สำเร็จ (+${r.days} วัน) · คงเหลือ ${r.balance} Coin · สิทธิ์เข้าเกมภายใน ~1 นาที`;
        this.loadMine();
      },
      error: e => { this.buyingId = null; this.error = e?.error?.message || 'ซื้อไม่สำเร็จ'; },
    });
  }

  buyMeow(p: VipPackage) {
    if (!this.mine?.linked || p.price_meowcoins == null) return;
    if (!confirm(`ซื้อ ${p.label || p.tier} (${p.days} วัน) ราคา ${p.price_meowcoins} Meowcoin ?`)) return;
    this.error = null; this.okMsg = null; this.buyingId = p.id;
    this.vip.buy(p.id, 'meowcoin').subscribe({
      next: (r: VipBuyResult) => {
        this.buyingId = null;
        this.okMsg = `ซื้อ ${r.tier} สำเร็จ (+${r.days} วัน) · คงเหลือ ${r.balance} Meowcoin · สิทธิ์เข้าเกมภายใน ~1 นาที`;
        this.loadMine();
        this.topup.meowcoinsMe().subscribe({ error: () => {} });
      },
      error: e => { this.buyingId = null; this.error = e?.error?.message || 'ซื้อไม่สำเร็จ'; },
    });
  }
}
