import { Component, OnInit } from '@angular/core';
import {
  BackpackService, BackpackConfig, BackpackPlayerRow,
} from '../../services/backpack.service';

/**
 * แอดมิน: ตั้งราคาอัพเกรด backpack (Coins / Meowcoins ต่อระดับ) + แก้ขนาด backpack รายคน
 * ราคา = base × ระดับปัจจุบัน; จ่ายผสม = ครึ่งหนึ่งของแต่ละสกุล (ส่วนลดค่าเฉลี่ย)
 */
@Component({
  selector: 'app-admin-backpack',
  template: `
    <div class="page">
      <div class="page-header">
        <span class="h-icon"><span class="mi">backpack</span></span>
        <h1>Backpack Upgrade</h1>
        <span class="badge rose">ADMIN</span>
      </div>

      <!-- config -->
      <section class="card" style="padding:16px 18px; margin-bottom:16px;">
        <h3 class="mb-3 row gap-2"><span class="mi">tune</span>ตั้งค่าราคาอัพเกรด</h3>
        <div *ngIf="!cfg" class="empty"><span class="spinner"></span></div>
        <ng-container *ngIf="cfg">
          <div class="cfg-grid">
            <label class="cfg-field chk">
              <input type="checkbox" [(ngModel)]="cfg.enabled"> เปิดระบบอัพเกรดผ่านเว็บ
            </label>
            <label class="cfg-field chk">
              <input type="checkbox" [(ngModel)]="cfg.vip_only"> เฉพาะ VIP เท่านั้น
            </label>
            <label class="cfg-field chk">
              <input type="checkbox" [(ngModel)]="cfg.mixed_enabled"> เปิดจ่ายผสม (ครึ่ง Coins + ครึ่ง Meowcoins)
            </label>
            <label class="cfg-field">
              <span>Coins ต่อระดับ <img class="coin-img" src="assets/coins/coin.png" alt=""></span>
              <input class="input" type="number" min="0" [(ngModel)]="cfg.base_coins">
            </label>
            <label class="cfg-field">
              <span>Meowcoins ต่อระดับ <img class="coin-img meow" src="assets/coins/meowcoin.png" alt=""> (0 = ปิด)</span>
              <input class="input" type="number" min="0" [(ngModel)]="cfg.base_meowcoins">
            </label>
            <label class="cfg-field">
              <span>ความสูงเริ่มต้น (ต้องตรงกับ plugin)</span>
              <input class="input" type="number" min="1" [(ngModel)]="cfg.default_height">
            </label>
            <label class="cfg-field">
              <span>ความสูงสูงสุด</span>
              <input class="input" type="number" min="1" [(ngModel)]="cfg.max_height">
            </label>
          </div>
          <p class="muted text-xs mt-2">
            ราคาอัพเกรดจากระดับ N = base × N — เช่น base 500: เลเวล 1→2 = 500, 2→3 = 1000 |
            จ่ายผสม = เพดานครึ่งหนึ่งของแต่ละฝั่ง
          </p>
          <div class="row gap-2 mt-3">
            <button class="btn primary" [disabled]="saving" (click)="saveConfig()">
              <span class="spinner sm" *ngIf="saving"></span><span class="mi" *ngIf="!saving">save</span>บันทึก
            </button>
            <span *ngIf="cfgMsg" class="text-sm" style="color:var(--emerald)">{{ cfgMsg }}</span>
            <span *ngIf="cfgErr" class="text-rose text-sm">{{ cfgErr }}</span>
          </div>
        </ng-container>
      </section>

      <!-- players -->
      <section class="card flush">
        <div class="row gap-2" style="padding:14px 16px; justify-content:space-between; flex-wrap:wrap;">
          <h3 class="row gap-2"><span class="mi">group</span>ขนาด Backpack รายผู้เล่น</h3>
          <input class="input" style="max-width:260px" placeholder="ค้นหา steam id…"
                 [(ngModel)]="search" (ngModelChange)="onSearch()">
        </div>
        <div class="table-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>Steam ID</th><th>Discord</th>
                <th class="r">กว้าง</th><th class="r">สูง</th><th class="r">เลเวล</th>
                <th>อัพเดตล่าสุด</th><th class="r"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of rows">
                <td class="mono">{{ p.steam_id }}</td>
                <td>{{ p.discord_name || '—' }}</td>
                <td class="r mono">{{ p.width }}</td>
                <td class="r mono">{{ p.height }}</td>
                <td class="r mono">{{ p.level }}</td>
                <td class="muted text-xs">{{ p.updated_at | date:'short' }}</td>
                <td class="r">
                  <button class="btn ghost sm" (click)="openEdit(p)"><span class="mi sm">edit</span>แก้ไข</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div *ngIf="!loading && rows.length === 0" class="empty">
            <span class="mi xxl">backpack</span>
            <div class="empty-title">ยังไม่มีข้อมูล backpack</div>
          </div>
          <div *ngIf="loading" class="empty"><span class="spinner"></span></div>
        </div>
        <app-pager [page]="page" [pages]="pages" [total]="total" [limit]="limit"
                   (pageChange)="go($event)" (limitChange)="setLimit($event)"></app-pager>
      </section>

      <!-- edit modal -->
      <div *ngIf="editing" class="modal-backdrop" (click)="editing = null">
        <div class="modal-card tactical" (click)="$event.stopPropagation()">
          <h3 class="mb-3">แก้ขนาด backpack — <span class="mono">{{ editing.steam_id }}</span></h3>
          <div class="row gap-2">
            <label class="cfg-field grow">
              <span>กว้าง (1–10)</span>
              <input class="input" type="number" min="1" max="10" [(ngModel)]="editW">
            </label>
            <label class="cfg-field grow">
              <span>สูง (1–200)</span>
              <input class="input" type="number" min="1" max="200" [(ngModel)]="editH">
            </label>
          </div>
          <p *ngIf="editErr" class="text-rose text-sm mt-2">{{ editErr }}</p>
          <div class="row gap-2 mt-3" style="justify-content:flex-end;">
            <button class="btn ghost" (click)="editing = null">ยกเลิก</button>
            <button class="btn primary" [disabled]="savingEdit" (click)="saveEdit()">
              <span class="spinner sm" *ngIf="savingEdit"></span>บันทึก
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cfg-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:12px; }
    .cfg-field { display:flex; flex-direction:column; gap:6px; font-size:13px; }
    .cfg-field > span { display:inline-flex; align-items:center; gap:5px; color:var(--muted); font-weight:600; }
    .cfg-field.chk { flex-direction:row; align-items:center; gap:8px; font-weight:600; }
    .cfg-field .coin-img { width:14px; height:14px; }
  `],
})
export class AdminBackpackComponent implements OnInit {
  cfg: BackpackConfig | null = null;
  saving = false;
  cfgMsg: string | null = null;
  cfgErr: string | null = null;

  rows: BackpackPlayerRow[] = [];
  loading = true;
  page = 1; pages = 0; total = 0; limit = 20;
  search = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  editing: BackpackPlayerRow | null = null;
  editW = 5; editH = 5;
  savingEdit = false;
  editErr: string | null = null;

  constructor(private backpack: BackpackService) {}

  ngOnInit() {
    this.backpack.getConfig().subscribe({
      next: c => { this.cfg = c; },
      error: () => { this.cfgErr = 'โหลด config ไม่สำเร็จ'; },
    });
    this.load();
  }

  load() {
    this.loading = true;
    this.backpack.players(this.page, this.limit, this.search.trim() || undefined).subscribe({
      next: r => { this.rows = r.items; this.total = r.total; this.pages = r.pages; this.loading = false; },
      error: () => { this.rows = []; this.loading = false; },
    });
  }

  onSearch() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page = 1; this.load(); }, 350);
  }

  go(p: number) { this.page = p; this.load(); }
  setLimit(l: number) { this.limit = l; this.page = 1; this.load(); }

  saveConfig() {
    if (!this.cfg) return;
    this.saving = true; this.cfgMsg = null; this.cfgErr = null;
    this.backpack.updateConfig(this.cfg).subscribe({
      next: c => { this.cfg = c; this.saving = false; this.cfgMsg = 'บันทึกแล้ว'; setTimeout(() => this.cfgMsg = null, 2500); },
      error: e => { this.saving = false; this.cfgErr = e?.error?.message || 'บันทึกไม่สำเร็จ'; },
    });
  }

  openEdit(p: BackpackPlayerRow) {
    this.editing = p; this.editW = p.width; this.editH = p.height; this.editErr = null;
  }

  saveEdit() {
    if (!this.editing) return;
    this.savingEdit = true; this.editErr = null;
    this.backpack.setPlayerSize(this.editing.steam_id, this.editW, this.editH).subscribe({
      next: () => { this.savingEdit = false; this.editing = null; this.load(); },
      error: e => { this.savingEdit = false; this.editErr = e?.error?.message || 'บันทึกไม่สำเร็จ'; },
    });
  }
}
