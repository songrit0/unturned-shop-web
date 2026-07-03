import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { KillRow, KillsService } from '../../services/kills.service';

/**
 * หน้าแผนที่ + kill feed ย้อนหลัง
 * - ผู้เล่นปกติ: เห็นเฉพาะ kill ของตัวเอง (API ดีเลย์ 30 นาทีให้แล้ว)
 * - admin: เห็นทุกคนแบบสด + กรองด้วย Steam ID ได้
 * - คลิกรายการ kill → วาดจุดคนยิง (เขียว) / คนโดน (แดง) + เส้นเชื่อม บนแผนที่แบบระดับ 3
 */
@Component({
  selector: 'app-kill-map',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon amber"><span class="mi lg">map</span></div>
        <h1>แผนที่ Kill</h1>
      </div>

      <div *ngIf="!(auth.me$ | async)?.is_admin" class="welcome-alert" style="margin-bottom:12px">
        <span class="alert-icon mi">schedule</span>
        <div>แสดงเฉพาะ kill ที่คุณเป็นคนยิงหรือคนโดน และดีเลย์ 30 นาที (กันส่องตำแหน่งสด)</div>
      </div>

      <div *ngIf="notLinked" class="welcome-alert" style="margin-bottom:12px">
        <span class="alert-icon mi">link_off</span>
        <div>ยังไม่ได้เชื่อมบัญชี Steam ↔ Discord — ใช้คำสั่ง /link ใน Discord ก่อนถึงจะดู kill ของตัวเองได้</div>
      </div>

      <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">

        <!-- ===== map viewer ===== -->
        <div #viewport class="card"
             style="flex:1 1 480px;min-width:320px;height:72vh;padding:0;overflow:hidden;position:relative;touch-action:none;cursor:grab"
             (wheel)="onWheel($event)"
             (pointerdown)="onPointerDown($event)"
             (pointermove)="onPointerMove($event)"
             (pointerup)="onPointerUp($event)"
             (pointercancel)="onPointerUp($event)">
          <div [style.transform]="'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')'"
               style="transform-origin:0 0;position:absolute;top:0;left:0;will-change:transform">
            <img src="assets/map/chart.webp" [width]="MAP_W" [height]="MAP_H" draggable="false" alt="map"
                 style="display:block;max-width:none">
            <svg *ngIf="selected as s" [attr.viewBox]="'0 0 ' + MAP_W + ' ' + MAP_H"
                 [attr.width]="MAP_W" [attr.height]="MAP_H"
                 style="position:absolute;top:0;left:0;pointer-events:none">
              <ng-container *ngIf="s.is_pvp && s.killer_x != null">
                <line [attr.x1]="px(s.killer_x)" [attr.y1]="py(s.killer_z!)"
                      [attr.x2]="px(s.victim_x)" [attr.y2]="py(s.victim_z)"
                      stroke="#ef4444" [attr.stroke-width]="5 / scale"/>
                <circle [attr.cx]="px(s.killer_x)" [attr.cy]="py(s.killer_z!)" [attr.r]="12 / scale"
                        fill="#22c55e" stroke="#fff" [attr.stroke-width]="3 / scale"/>
              </ng-container>
              <circle [attr.cx]="px(s.victim_x)" [attr.cy]="py(s.victim_z)" [attr.r]="12 / scale"
                      fill="#ef4444" stroke="#fff" [attr.stroke-width]="3 / scale"/>
            </svg>
          </div>

          <div style="position:absolute;right:10px;top:10px;display:flex;flex-direction:column;gap:6px">
            <button class="btn secondary" style="padding:6px 8px" (click)="zoomBy(1.4)" title="ซูมเข้า"><span class="mi sm">add</span></button>
            <button class="btn secondary" style="padding:6px 8px" (click)="zoomBy(1 / 1.4)" title="ซูมออก"><span class="mi sm">remove</span></button>
            <button class="btn secondary" style="padding:6px 8px" (click)="fit()" title="ดูทั้งแผนที่"><span class="mi sm">fit_screen</span></button>
          </div>

          <div class="card" style="position:absolute;left:10px;bottom:10px;padding:6px 10px;font-size:12px;display:flex;gap:12px;align-items:center">
            <span style="display:inline-flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:50%;background:#22c55e"></span>คนยิง</span>
            <span style="display:inline-flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:50%;background:#ef4444"></span>คนโดน</span>
          </div>
        </div>

        <!-- ===== feed panel ===== -->
        <div style="flex:0 1 400px;min-width:300px;display:flex;flex-direction:column;gap:12px">
          <div class="card" style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end">
            <label class="muted" style="font-size:12px;display:flex;flex-direction:column;gap:4px">จากวันที่
              <input type="date" [(ngModel)]="from" class="mono" style="background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:6px 8px;color:inherit">
            </label>
            <label class="muted" style="font-size:12px;display:flex;flex-direction:column;gap:4px">ถึงวันที่
              <input type="date" [(ngModel)]="to" class="mono" style="background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:6px 8px;color:inherit">
            </label>
            <label *ngIf="(auth.me$ | async)?.is_admin" class="muted" style="font-size:12px;display:flex;flex-direction:column;gap:4px">Steam ID (เว้นว่าง = ทุกคน)
              <input type="text" [(ngModel)]="steamFilter" placeholder="7656119..." maxlength="17" class="mono"
                     style="background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:6px 8px;color:inherit;width:170px">
            </label>
            <button class="btn emerald" (click)="load(1)" [disabled]="loading">
              <span class="mi sm">search</span>ค้นหา
            </button>
          </div>

          <div class="card" style="padding:8px;max-height:56vh;overflow:auto;display:flex;flex-direction:column;gap:6px">
            <ng-container *ngIf="!loading; else loadingTpl">
              <div *ngIf="kills.length === 0" class="empty" style="padding:24px 0">
                <span class="mi xxl">location_off</span>
                <div class="empty-title">ไม่พบ kill ในช่วงที่เลือก</div>
              </div>

              <div *ngFor="let k of kills" (click)="select(k)"
                   [style.outline]="selected?.id === k.id ? '2px solid var(--accent-hi)' : 'none'"
                   style="display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:10px;background:var(--surface-2);cursor:pointer">
                <img *ngIf="k.weapon_image" [src]="k.weapon_image" alt="" style="width:38px;height:38px;object-fit:contain;flex:none">
                <span *ngIf="!k.weapon_image" class="mi lg" style="flex:none;opacity:.7">{{ k.is_pvp ? 'skull' : 'coronavirus' }}</span>
                <div style="flex:1;min-width:0">
                  <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                    <span style="color:var(--emerald)">{{ k.killer_name || k.cause }}</span>
                    <span class="muted"> ➜ </span>
                    <span style="color:var(--rose)">{{ k.victim_name }}</span>
                  </div>
                  <div class="muted" style="font-size:11px">
                    {{ k.weapon || k.cause }}<ng-container *ngIf="k.distance"> · {{ k.distance | number:'1.0-0' }}m</ng-container><ng-container *ngIf="k.headshot"> · 🎯</ng-container>
                    · {{ k.created_at | date:'d MMM HH:mm' }}
                  </div>
                </div>
                <span *ngIf="!k.is_pvp" class="badge amber" style="flex:none">PvE</span>
              </div>
            </ng-container>
            <ng-template #loadingTpl>
              <div style="text-align:center;padding:32px 0"><div class="spinner"></div></div>
            </ng-template>
          </div>

          <div *ngIf="pages > 1" class="card" style="display:flex;gap:8px;align-items:center;justify-content:center;padding:8px">
            <button class="btn secondary" style="padding:4px 10px" [disabled]="page <= 1 || loading" (click)="load(page - 1)"><span class="mi sm">chevron_left</span></button>
            <span class="mono muted" style="font-size:13px">{{ page }} / {{ pages }} ({{ total | number }} รายการ)</span>
            <button class="btn secondary" style="padding:4px 10px" [disabled]="page >= pages || loading" (click)="load(page + 1)"><span class="mi sm">chevron_right</span></button>
          </div>

          <p *ngIf="error" style="color:var(--rose);margin:0">{{ error }}</p>
        </div>
      </div>
    </div>
  `,
})
export class KillMapComponent implements OnInit, AfterViewInit {
  // ขนาดรูป chart.webp (px) และพิกัดโลกของขอบรูป — ค่าเดียวกับ config ปลั๊กอิน KillFeed
  readonly MAP_W = 3905;
  readonly MAP_H = 5441;
  private readonly LEFT = -1432.8;
  private readonly RIGHT = 2463.35;
  private readonly TOP = 4095.0;
  private readonly BOTTOM = -1343.25;

  @ViewChild('viewport') viewport!: ElementRef<HTMLDivElement>;

  // pan/zoom state
  tx = 0; ty = 0; scale = 0.1;
  private fitScale = 0.1;
  private dragging = false;
  private lastX = 0; private lastY = 0;

  // filters + data
  from = '';
  to = '';
  steamFilter = '';
  kills: KillRow[] = [];
  selected: KillRow | null = null;
  page = 1; pages = 1; total = 0;
  loading = true;
  notLinked = false;
  error: string | null = null;

  constructor(public auth: AuthService, private killsApi: KillsService) {}

  ngOnInit() {
    const today = new Date();
    const weekAgo = new Date(Date.now() - 7 * 86400_000);
    this.to = today.toISOString().slice(0, 10);
    this.from = weekAgo.toISOString().slice(0, 10);
    this.load(1);
  }

  ngAfterViewInit() {
    setTimeout(() => this.fit());
  }

  load(page: number) {
    this.loading = true;
    this.error = null;
    this.notLinked = false;
    this.killsApi.list({
      from: this.from || undefined,
      to: this.to || undefined,
      steam_id: this.steamFilter.trim() || undefined,
      page,
      limit: 50,
    }).subscribe({
      next: r => {
        this.kills = r.items; this.page = r.page; this.pages = r.pages; this.total = r.total;
        this.loading = false;
      },
      error: e => {
        this.loading = false;
        this.kills = [];
        if (e?.status === 403) this.notLinked = true;
        else this.error = e?.error?.message || 'โหลดข้อมูลไม่สำเร็จ';
      },
    });
  }

  select(k: KillRow) {
    if (this.selected?.id === k.id) { // คลิกซ้ำ = ยกเลิกการเลือก
      this.selected = null;
      return;
    }
    this.selected = k;
    this.centerOn(k.victim_x, k.victim_z);
  }

  // ---- world -> map px (สูตรเดียวกับปลั๊กอิน) ----
  px(x: number) { return (x - this.LEFT) / (this.RIGHT - this.LEFT) * this.MAP_W; }
  py(z: number) { return (this.TOP - z) / (this.TOP - this.BOTTOM) * this.MAP_H; }

  // ---- pan / zoom ----
  fit() {
    const el = this.viewport?.nativeElement;
    if (!el) return;
    this.fitScale = Math.min(el.clientWidth / this.MAP_W, el.clientHeight / this.MAP_H);
    this.scale = this.fitScale;
    this.tx = (el.clientWidth - this.MAP_W * this.scale) / 2;
    this.ty = (el.clientHeight - this.MAP_H * this.scale) / 2;
  }

  private centerOn(x: number, z: number) {
    const el = this.viewport?.nativeElement;
    if (!el) return;
    if (this.scale < this.fitScale * 3) this.scale = this.fitScale * 3;
    this.tx = el.clientWidth / 2 - this.px(x) * this.scale;
    this.ty = el.clientHeight / 2 - this.py(z) * this.scale;
  }

  zoomBy(factor: number) {
    const el = this.viewport?.nativeElement;
    if (!el) return;
    this.zoomAt(el.clientWidth / 2, el.clientHeight / 2, factor);
  }

  onWheel(e: WheelEvent) {
    e.preventDefault();
    const rect = this.viewport.nativeElement.getBoundingClientRect();
    this.zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.25 : 1 / 1.25);
  }

  private zoomAt(vx: number, vy: number, factor: number) {
    const next = Math.min(8, Math.max(this.fitScale * 0.5, this.scale * factor));
    const wx = (vx - this.tx) / this.scale;
    const wy = (vy - this.ty) / this.scale;
    this.scale = next;
    this.tx = vx - wx * next;
    this.ty = vy - wy * next;
  }

  onPointerDown(e: PointerEvent) {
    // อย่าเริ่มลากถ้ากดบนปุ่ม - setPointerCapture จะดัก pointerup ทำให้ปุ่มไม่ได้รับ click
    if ((e.target as HTMLElement).closest('button')) return;
    this.dragging = true;
    this.lastX = e.clientX; this.lastY = e.clientY;
    this.viewport.nativeElement.setPointerCapture(e.pointerId);
  }

  onPointerMove(e: PointerEvent) {
    if (!this.dragging) return;
    this.tx += e.clientX - this.lastX;
    this.ty += e.clientY - this.lastY;
    this.lastX = e.clientX; this.lastY = e.clientY;
  }

  onPointerUp(_e: PointerEvent) {
    this.dragging = false;
  }
}
