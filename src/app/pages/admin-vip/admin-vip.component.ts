import { Component, OnInit } from '@angular/core';
import { AdminVipService, Paginated, VipGrant, VipPackage, VipPackageInput } from '../../services/admin-vip.service';
import { bangkokInputToIso, isoToBangkokInput } from '../../services/thai-time';

@Component({
  selector: 'app-admin-vip',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon rose"><span class="mi lg">workspace_premium</span></div>
        <h1>VIP</h1>
        <span class="badge rose"><span class="mi sm">shield</span>ADMIN</span>
      </div>

      <div class="welcome-alert" style="margin-bottom:16px">
        <span class="alert-icon mi">info</span>
        <div>จัดการแพ็กเกจ VIP (ขายด้วย Coin ใน Discord) และวันหมดอายุของผู้เล่น — ปลั๊กอินจะ sync กลุ่มในเกมภายใน ~1 นาที · กลุ่ม (group_id) ต้องมีใน Permissions.config.xml</div>
      </div>

      <!-- ===== Packages ===== -->
      <div class="card flush" style="margin-bottom:24px">
        <div class="row" style="justify-content:space-between;align-items:center;padding:12px 16px">
          <h3 style="margin:0;font-size:16px;font-weight:700">แพ็กเกจ VIP</h3>
          <button (click)="openNewPackage()" class="btn emerald sm"><span class="mi sm">add</span> เพิ่มแพ็กเกจ</button>
        </div>
        <div class="table-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>Tier</th><th>group_id</th><th class="r">วัน</th><th class="r">ราคา (Coin)</th>
                <th>Label</th><th class="r">Sort</th><th>เปิด</th><th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of packages">
                <td style="font-weight:600">{{ p.tier }}</td>
                <td class="mono" style="font-size:12px">{{ p.group_id }}</td>
                <td class="r mono">{{ p.days }}</td>
                <td class="r mono" style="color:var(--accent-hi)">{{ p.price_coins | number }}</td>
                <td class="muted">{{ p.label || '—' }}</td>
                <td class="r mono muted">{{ p.sort }}</td>
                <td><span class="mi" [style.color]="p.enabled ? 'var(--emerald)' : 'var(--rose)'">{{ p.enabled ? 'check_circle' : 'cancel' }}</span></td>
                <td>
                  <div class="row gap-1" style="justify-content:flex-end">
                    <button (click)="openEditPackage(p)" class="btn ghost sm"><span class="mi sm">edit</span></button>
                    <button (click)="removePackage(p)" class="btn danger sm"><span class="mi sm">delete</span></button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="packages && packages.length === 0">
                <td colspan="8"><div class="empty"><span class="mi xxl">inventory_2</span><div class="empty-title">ยังไม่มีแพ็กเกจ</div></div></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ===== All VIP holders ===== -->
      <div class="card flush" style="margin-bottom:24px">
        <div class="row" style="justify-content:space-between;align-items:center;padding:12px 16px;gap:12px;flex-wrap:wrap">
          <h3 style="margin:0;font-size:16px;font-weight:700">ผู้มี VIP ทั้งหมด</h3>
          <div class="row gap-2" style="align-items:center">
            <label class="row gap-1" style="align-items:center;font-size:13px"><input type="checkbox" [(ngModel)]="activeOnly" (ngModelChange)="loadAll(1, all?.limit || 20)"> เฉพาะที่ยังไม่หมดอายุ</label>
            <div class="input-wrap" style="width:240px">
              <span class="mi lead">search</span>
              <input class="input" [(ngModel)]="gq" (ngModelChange)="onSearchAll()" placeholder="ค้นหา steam id / discord / group">
            </div>
          </div>
        </div>
        <div class="table-wrap">
          <table class="tbl">
            <thead>
              <tr><th>ผู้เล่น</th><th>group_id</th><th>หมดอายุ (เวลาไทย)</th><th>สถานะ</th><th></th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let g of all?.items">
                <td>
                  <div style="display:flex;flex-direction:column">
                    <span class="mono" style="font-size:12px">{{ g.steam_id }}</span>
                    <span class="muted" style="font-size:11px">{{ g.discord_username || g.discord_id || '—' }}</span>
                  </div>
                </td>
                <td class="mono">{{ g.group_id }}</td>
                <td class="mono" style="font-size:12px">{{ g.expires_at | date:'medium':'+0700' }}</td>
                <td><span class="badge" [class.emerald]="isActive(g)" [class.rose]="!isActive(g)">{{ isActive(g) ? 'ACTIVE' : 'EXPIRED' }}</span></td>
                <td>
                  <div class="row gap-1" style="justify-content:flex-end">
                    <button (click)="openSet(g)" class="btn ghost sm"><span class="mi sm">edit_calendar</span> ตั้งวัน</button>
                    <button (click)="doRevoke(g)" class="btn danger sm"><span class="mi sm">block</span> ถอน</button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="all && all.items.length === 0">
                <td colspan="5"><div class="empty"><span class="mi xxl">person_off</span><div class="empty-title">ไม่มีผู้มี VIP</div></div></td>
              </tr>
            </tbody>
          </table>
        </div>
        <app-pager *ngIf="all"
          [page]="all.page" [pages]="all.pages" [total]="all.total" [limit]="all.limit"
          (pageChange)="loadAll($event, all.limit)" (limitChange)="loadAll(1, $event)"></app-pager>
      </div>

      <!-- ===== Player lookup / grant ===== -->
      <div class="card" style="margin-bottom:16px">
        <h3 style="margin:0 0 12px 0;font-size:16px;font-weight:700">ค้นหา / ให้ VIP รายคน</h3>
        <div class="row gap-2">
          <div class="input-wrap" style="flex:1;max-width:340px">
            <span class="mi lead">person_search</span>
            <input class="input mono" [(ngModel)]="steamId" placeholder="Steam ID (17 หลัก)">
          </div>
          <button (click)="loadGrants()" [disabled]="!steamId.trim()" class="btn primary"><span class="mi sm">search</span> ดู</button>
          <button (click)="openGrant()" [disabled]="!steamId.trim()" class="btn emerald"><span class="mi sm">add</span> ให้/ต่อ VIP</button>
        </div>

        <div *ngIf="grantsLoaded" style="margin-top:16px">
          <table class="tbl" *ngIf="grants.length">
            <thead><tr><th>group_id</th><th>หมดอายุ (เวลาไทย)</th><th>สถานะ</th><th></th></tr></thead>
            <tbody>
              <tr *ngFor="let g of grants">
                <td class="mono">{{ g.group_id }}</td>
                <td class="mono" style="font-size:12px">{{ g.expires_at | date:'medium':'+0700' }}</td>
                <td>
                  <span class="badge" [class.emerald]="isActive(g)" [class.rose]="!isActive(g)">
                    {{ isActive(g) ? 'ACTIVE' : 'EXPIRED' }}
                  </span>
                </td>
                <td>
                  <div class="row gap-1" style="justify-content:flex-end">
                    <button (click)="openSet(g)" class="btn ghost sm"><span class="mi sm">edit_calendar</span> ตั้งวัน</button>
                    <button (click)="doRevoke(g)" class="btn danger sm"><span class="mi sm">block</span> ถอน</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div *ngIf="!grants.length" class="empty"><span class="mi xxl">person_off</span><div class="empty-title">ผู้เล่นนี้ยังไม่มี VIP</div></div>
        </div>
      </div>

      <p *ngIf="error" style="color:var(--rose)">{{ error }}</p>

      <!-- Package modal -->
      <div *ngIf="editingPkg" class="modal-backdrop">
        <div class="modal-card tactical" style="max-width:460px">
          <h3 style="margin:0 0 16px 0;font-size:18px;font-weight:700">{{ editingPkg.id ? 'แก้แพ็กเกจ' : 'เพิ่มแพ็กเกจ' }}</h3>
          <div style="display:flex;flex-direction:column;gap:10px">
            <label><span class="muted" style="font-size:12px">Tier (ชื่อแสดง)</span><input class="input" [(ngModel)]="pkgForm.tier" maxlength="32" placeholder="VIP"></label>
            <label><span class="muted" style="font-size:12px">group_id (ใน Permissions.config.xml)</span><input class="input mono" [(ngModel)]="pkgForm.group_id" maxlength="64" placeholder="vip"></label>
            <div class="row gap-2">
              <label style="flex:1"><span class="muted" style="font-size:12px">วัน</span><input type="number" class="input mono" [(ngModel)]="pkgForm.days" min="1"></label>
              <label style="flex:1"><span class="muted" style="font-size:12px">ราคา (Coin)</span><input type="number" class="input mono" [(ngModel)]="pkgForm.price_coins" min="0"></label>
            </div>
            <label><span class="muted" style="font-size:12px">Label (ปุ่มในร้าน)</span><input class="input" [(ngModel)]="pkgForm.label" maxlength="64" placeholder="VIP 30 วัน"></label>
            <div class="row gap-2" style="align-items:center">
              <label style="flex:1"><span class="muted" style="font-size:12px">Sort</span><input type="number" class="input mono" [(ngModel)]="pkgForm.sort"></label>
              <label class="row gap-1" style="align-items:center;margin-top:18px"><input type="checkbox" [(ngModel)]="pkgForm.enabled"> <span>เปิดขาย</span></label>
            </div>
          </div>
          <div class="row gap-2" style="margin-top:20px">
            <button (click)="editingPkg = null" class="btn secondary" style="flex:1">ยกเลิก</button>
            <button (click)="savePackage()" [disabled]="saving" class="btn emerald" style="flex:1">{{ saving ? 'กำลังบันทึก…' : 'บันทึก' }}</button>
          </div>
        </div>
      </div>

      <!-- Grant/extend modal -->
      <div *ngIf="granting" class="modal-backdrop">
        <div class="modal-card tactical" style="max-width:420px">
          <h3 style="margin:0 0 4px 0;font-size:18px;font-weight:700">ให้ / ต่อ VIP</h3>
          <p class="mono muted" style="font-size:11px;margin:0 0 16px 0">{{ steamId }}</p>
          <div style="display:flex;flex-direction:column;gap:10px">
            <label><span class="muted" style="font-size:12px">group_id</span><input class="input mono" [(ngModel)]="grantForm.group_id" list="vip-groups" placeholder="vip"></label>
            <datalist id="vip-groups"><option *ngFor="let g of groupSuggestions" [value]="g"></option></datalist>
            <label><span class="muted" style="font-size:12px">จำนวนวันที่ต่อ</span><input type="number" class="input mono" [(ngModel)]="grantForm.days" min="1" placeholder="30"></label>
          </div>
          <p *ngIf="error" style="color:var(--rose);font-size:13px;margin:12px 0 0 0">{{ error }}</p>
          <div class="row gap-2" style="margin-top:20px">
            <button (click)="granting = false" class="btn secondary" style="flex:1">ยกเลิก</button>
            <button (click)="doExtend()" [disabled]="saving" class="btn emerald" style="flex:1">{{ saving ? '…' : 'ต่ออายุ' }}</button>
          </div>
        </div>
      </div>

      <!-- Set absolute expiry modal -->
      <div *ngIf="settingExpiry" class="modal-backdrop">
        <div class="modal-card tactical" style="max-width:420px">
          <h3 style="margin:0 0 4px 0;font-size:18px;font-weight:700">ตั้งวันหมดอายุ</h3>
          <p class="mono muted" style="font-size:11px;margin:0 0 16px 0">{{ settingExpiry.steam_id }} · {{ settingExpiry.group_id }}</p>
          <label><span class="muted" style="font-size:12px">วันหมดอายุ (เวลาไทย)</span>
            <input type="datetime-local" class="input mono" [(ngModel)]="expiryLocal"></label>
          <p *ngIf="error" style="color:var(--rose);font-size:13px;margin:12px 0 0 0">{{ error }}</p>
          <div class="row gap-2" style="margin-top:20px">
            <button (click)="settingExpiry = null" class="btn secondary" style="flex:1">ยกเลิก</button>
            <button (click)="doSet()" [disabled]="saving" class="btn emerald" style="flex:1">{{ saving ? '…' : 'บันทึก' }}</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminVipComponent implements OnInit {
  packages: VipPackage[] = [];
  error: string | null = null;
  saving = false;

  // all VIP holders
  all: Paginated<VipGrant> | null = null;
  gq = '';
  activeOnly = true;
  private qDebounce: any;

  // packages modal
  editingPkg: VipPackage | { id: 0 } | null = null;
  pkgForm: VipPackageInput = {};

  // grants
  steamId = '';
  grants: VipGrant[] = [];
  grantsLoaded = false;

  granting = false;
  grantForm: { group_id: string; days: number } = { group_id: '', days: 30 };

  settingExpiry: VipGrant | null = null;
  expiryLocal = '';

  constructor(private svc: AdminVipService) {}

  ngOnInit() { this.loadPackages(); this.loadAll(1, 20); }

  get groupSuggestions(): string[] {
    return Array.from(new Set(this.packages.map(p => p.group_id)));
  }

  loadAll(page: number, limit: number) {
    this.svc.listGrants(page, limit, this.gq, this.activeOnly).subscribe({
      next: p => this.all = p,
      error: e => this.error = e?.error?.message || 'โหลดรายชื่อ VIP ไม่สำเร็จ',
    });
  }

  onSearchAll() {
    clearTimeout(this.qDebounce);
    this.qDebounce = setTimeout(() => this.loadAll(1, this.all?.limit || 20), 300);
  }

  private refresh() {
    this.loadAll(this.all?.page || 1, this.all?.limit || 20);
    if (this.grantsLoaded && this.steamId.trim()) this.loadGrants();
  }

  isActive(g: VipGrant): boolean {
    return g.active === 1 && new Date(g.expires_at).getTime() > Date.now();
  }

  loadPackages() {
    this.svc.listPackages().subscribe({
      next: p => this.packages = p,
      error: e => this.error = e?.error?.message || 'โหลดแพ็กเกจไม่สำเร็จ',
    });
  }

  openNewPackage() {
    this.editingPkg = { id: 0 };
    this.pkgForm = { tier: 'VIP', group_id: 'vip', days: 30, price_coins: 1000, label: '', sort: 0, enabled: true };
    this.error = null;
  }

  openEditPackage(p: VipPackage) {
    this.editingPkg = p;
    this.pkgForm = { tier: p.tier, group_id: p.group_id, days: p.days, price_coins: p.price_coins, label: p.label || '', sort: p.sort, enabled: p.enabled === 1 };
    this.error = null;
  }

  savePackage() {
    if (!this.editingPkg) return;
    this.saving = true;
    const id = (this.editingPkg as VipPackage).id;
    const obs = id
      ? this.svc.updatePackage(id, this.pkgForm)
      : this.svc.createPackage(this.pkgForm);
    obs.subscribe({
      next: () => { this.saving = false; this.editingPkg = null; this.loadPackages(); },
      error: e => { this.saving = false; this.error = e?.error?.message || 'บันทึกไม่สำเร็จ'; },
    });
  }

  removePackage(p: VipPackage) {
    if (!confirm(`ลบแพ็กเกจ "${p.label || p.tier}" ?`)) return;
    this.svc.deletePackage(p.id).subscribe({
      next: () => this.loadPackages(),
      error: e => this.error = e?.error?.message || 'ลบไม่สำเร็จ',
    });
  }

  loadGrants() {
    const sid = this.steamId.trim();
    if (!sid) return;
    this.error = null;
    this.svc.grantsForUser(sid).subscribe({
      next: g => { this.grants = g; this.grantsLoaded = true; },
      error: e => { this.error = e?.error?.message || 'โหลดไม่สำเร็จ'; this.grantsLoaded = true; this.grants = []; },
    });
  }

  openGrant() {
    this.granting = true;
    this.grantForm = { group_id: this.groupSuggestions[0] || 'vip', days: 30 };
    this.error = null;
  }

  doExtend() {
    const sid = this.steamId.trim();
    if (!sid || !this.grantForm.group_id.trim() || !(this.grantForm.days > 0)) { this.error = 'กรอกข้อมูลให้ครบ'; return; }
    this.saving = true;
    this.svc.extend(sid, this.grantForm.group_id.trim(), Number(this.grantForm.days)).subscribe({
      next: () => { this.saving = false; this.granting = false; this.refresh(); },
      error: e => { this.saving = false; this.error = e?.error?.message || 'ไม่สำเร็จ'; },
    });
  }

  openSet(g: VipGrant) {
    this.settingExpiry = g;
    // prefill datetime-local with current expiry in Thai time (Asia/Bangkok)
    this.expiryLocal = isoToBangkokInput(g.expires_at);
    this.error = null;
  }

  doSet() {
    if (!this.settingExpiry || !this.expiryLocal) { this.error = 'เลือกวันก่อน'; return; }
    const iso = bangkokInputToIso(this.expiryLocal); // Thai wall-clock -> UTC ISO
    if (!iso) { this.error = 'รูปแบบวันไม่ถูกต้อง'; return; }
    this.saving = true;
    this.svc.setExpiry(this.settingExpiry.steam_id, this.settingExpiry.group_id, iso).subscribe({
      next: () => { this.saving = false; this.settingExpiry = null; this.refresh(); },
      error: e => { this.saving = false; this.error = e?.error?.message || 'ไม่สำเร็จ'; },
    });
  }

  doRevoke(g: VipGrant) {
    if (!confirm(`ถอน ${g.group_id} จาก ${g.steam_id} ?`)) return;
    this.svc.revoke(g.steam_id, g.group_id).subscribe({
      next: () => this.refresh(),
      error: e => this.error = e?.error?.message || 'ไม่สำเร็จ',
    });
  }
}
