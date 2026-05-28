import { Component, OnInit } from '@angular/core';
import { ClaimAllResult, PurchaseFilter, PurchaseView } from '../../models/purchase';
import { PurchasesService } from '../../services/purchases.service';
import { mapVaultP2pErrorKey } from '../../services/vault-errors';

@Component({
  selector: 'app-inventory',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon emerald"><span class="mi lg">redeem</span></div>
        <h1>{{ 'inventory.title' | translate }}</h1>
        <div class="page-actions">
          <button *ngIf="hasUnclaimed()" class="btn primary" [disabled]="claimingAll" (click)="onClaimAll()">
            <span class="mi sm">redeem</span> {{ (claimingAll ? 'common.saving' : 'inventory.claimAll') | translate }}
          </button>
        </div>
      </div>

      <div class="tabs">
        <button *ngFor="let t of tabs"
                class="tab"
                [class.active]="tab === t"
                (click)="select(t)">
          {{ ('inventory.tab.' + t) | translate }}
        </button>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div class="card flush">
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th style="width:56px"></th>
                  <th>{{ 'inventory.col.item' | translate }}</th>
                  <th style="width:80px">{{ 'inventory.col.amount' | translate }}</th>
                  <th style="width:140px">{{ 'inventory.col.quality' | translate }}</th>
                  <th style="width:120px">{{ 'inventory.col.status' | translate }}</th>
                  <th style="width:160px">{{ 'inventory.col.purchased' | translate }}</th>
                  <th style="width:140px">{{ 'inventory.col.action' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let p of items">
                  <td>
                    <div style="width:40px;height:40px;background:var(--surface-2);border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden">
                      <img *ngIf="p.image_url; else noImg" [src]="p.image_url" style="width:100%;height:100%;object-fit:contain;padding:2px">
                      <ng-template #noImg><span class="mi faint">inventory_2</span></ng-template>
                    </div>
                  </td>
                  <td><div style="font-weight:600">{{ p.item_name || ('#' + p.item_id) }}</div></td>
                  <td class="mono">×{{ p.amount }}</td>
                  <td><app-quality-bar [value]="p.quality" [showPercent]="true"></app-quality-bar></td>
                  <td>
                    <span class="badge" [class.amber]="!p.claimed_at" [class.emerald]="!!p.claimed_at">
                      {{ (p.claimed_at ? 'inventory.status.claimed' : 'inventory.status.unclaimed') | translate }}
                    </span>
                  </td>
                  <td class="muted mono" style="font-size:12px">{{ p.purchased_at | date:'short' }}</td>
                  <td>
                    <button *ngIf="!p.claimed_at" class="btn primary sm" [disabled]="busyId === p.id" (click)="onClaim(p)">
                      <span class="mi sm">redeem</span> {{ (busyId === p.id ? 'common.saving' : 'inventory.claim') | translate }}
                    </button>
                    <button *ngIf="p.claimed_at && p.redeem_code" class="btn ghost sm" (click)="showCode(p)">
                      <span class="mi sm">qr_code_2</span> {{ 'inventory.showCode' | translate }}
                    </button>
                  </td>
                </tr>
                <tr *ngIf="items.length === 0">
                  <td colspan="7">
                    <div class="empty">
                      <span class="mi xxl">redeem</span>
                      <div class="empty-title">{{ 'inventory.empty' | translate }}</div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>
      <ng-template #loadingTpl>
        <div style="text-align:center;padding:48px 0"><div class="spinner"></div></div>
      </ng-template>

      <!-- Code modal — handles both a single claimed purchase and the bulk "claim all" result -->
      <div *ngIf="codeFor || bulkResult" class="modal-backdrop" (click)="closeCode()">
        <div class="modal-card tactical" style="max-width:480px;text-align:center" (click)="$event.stopPropagation()">
          <h3 style="display:flex;align-items:center;justify-content:center;gap:8px;margin:0 0 12px 0;font-size:18px;font-weight:700">
            <span class="mi">qr_code_2</span>
            {{ (bulkResult ? 'inventory.codeReady.titleAll' : 'inventory.codeReady.title') | translate }}
          </h3>

          <!-- Single purchase summary -->
          <p *ngIf="codeFor" class="muted" style="font-size:13px;margin:0 0 12px 0">
            {{ codeFor.item_name || ('#' + codeFor.item_id) }}
            <ng-container *ngIf="codeFor.amount > 1"> · ×{{ codeFor.amount }}</ng-container>
          </p>

          <!-- Bulk summary: one code covering N items -->
          <ng-container *ngIf="bulkResult">
            <p class="muted" style="font-size:13px;margin:0 0 10px 0">
              {{ 'inventory.claimAllCount' | translate:{ count: bulkResult.count } }}
            </p>
            <ul *ngIf="bulkResult.items.length" class="claim-all-list">
              <li *ngFor="let it of bulkResult.items">
                <span style="font-weight:600">{{ it.item_name || ('#' + it.item_id) }}</span>
                <span class="muted mono"> ×{{ it.amount }}</span>
              </li>
            </ul>
          </ng-container>

          <ng-container *ngIf="activeCode() as code">
            <div class="code-box mono">{{ code }}</div>
            <button class="btn ghost sm" (click)="copy(code)" style="margin-top:8px">
              <span class="mi sm">{{ copied ? 'check' : 'content_copy' }}</span>
              {{ (copied ? 'inventory.codeCopied' : 'inventory.copyCode') | translate }}
            </button>
            <p class="muted" style="font-size:12px;margin-top:14px">
              {{ 'inventory.codeReady.instruction' | translate:{ code: code } }}
            </p>
          </ng-container>

          <p *ngIf="claimError" style="color:var(--rose);font-size:13px;margin:8px 0 0 0">{{ claimError | translate }}</p>
          <button class="btn primary" style="margin-top:16px;width:100%" (click)="closeCode()">{{ 'common.ok' | translate }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tabs { display: flex; gap: 4px; margin-bottom: 12px; border-bottom: 1px solid var(--border); }
    .tab { padding: 8px 14px; background: transparent; border: 0; color: var(--muted); cursor: pointer; border-bottom: 2px solid transparent; font-weight: 600; }
    .tab.active { color: var(--text); border-bottom-color: var(--accent); }
    .code-box {
      display: inline-block;
      padding: 12px 20px;
      background: var(--surface-2);
      border: 1px dashed var(--accent);
      border-radius: 8px;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 2px;
      user-select: all;
    }
    .claim-all-list {
      list-style: none;
      margin: 0 0 14px 0;
      padding: 8px 12px;
      max-height: 160px;
      overflow-y: auto;
      text-align: left;
      background: var(--surface-2);
      border-radius: 8px;
      font-size: 13px;
    }
    .claim-all-list li { display: flex; justify-content: space-between; gap: 8px; padding: 3px 0; }
  `],
})
export class InventoryComponent implements OnInit {
  loading = true;
  tab: PurchaseFilter = 'unclaimed';
  tabs: PurchaseFilter[] = ['unclaimed', 'claimed', 'all'];
  items: PurchaseView[] = [];

  busyId: number | null = null;
  claimingAll = false;
  codeFor: PurchaseView | null = null;
  bulkResult: ClaimAllResult | null = null;
  claimError: string | null = null;
  copied = false;

  constructor(private svc: PurchasesService) {}

  ngOnInit() { this.reload(); }

  hasUnclaimed(): boolean { return this.items.some(i => !i.claimed_at); }

  /** The redeem code currently shown by the modal, from whichever path is active. */
  activeCode(): string | null {
    return this.bulkResult ? this.bulkResult.redeem_code : (this.codeFor?.redeem_code ?? null);
  }

  select(t: PurchaseFilter) {
    if (this.tab === t) return;
    this.tab = t;
    this.reload();
  }

  reload() {
    this.loading = true;
    this.svc.listMine(this.tab, 1, 100).subscribe({
      next: p => { this.items = p.items; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  onClaim(p: PurchaseView) {
    this.busyId = p.id;
    this.claimError = null;
    this.svc.claim(p.id).subscribe({
      next: updated => {
        this.busyId = null;
        // Reflect locally so the row flips status without a refetch
        const idx = this.items.findIndex(i => i.id === p.id);
        if (idx >= 0) this.items[idx] = updated;
        this.showCode(updated);
      },
      error: e => {
        this.busyId = null;
        this.claimError = mapVaultP2pErrorKey(e);
        this.codeFor = p; // show the modal so the error has somewhere to render
      },
    });
  }

  onClaimAll() {
    this.claimingAll = true;
    this.claimError = null;
    this.svc.claimAll().subscribe({
      next: res => {
        this.claimingAll = false;
        // Only show the code modal when there was actually something to claim.
        if (res.redeem_code && res.count > 0) {
          this.codeFor = null;
          this.bulkResult = res;
          this.copied = false;
        }
        // Refetch so every claimed row flips status (and respects the active tab filter).
        this.reload();
      },
      error: e => {
        this.claimingAll = false;
        this.claimError = mapVaultP2pErrorKey(e);
        this.bulkResult = { redeem_code: null, count: 0, items: [] }; // open the modal so the error has somewhere to render
      },
    });
  }

  showCode(p: PurchaseView) {
    this.bulkResult = null;
    this.codeFor = p;
    this.copied = false;
    this.claimError = null;
  }

  closeCode() {
    this.codeFor = null;
    this.bulkResult = null;
    this.copied = false;
    this.claimError = null;
  }

  copy(code: string) {
    if (!code) return;
    const text = `/code ${code}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => { this.copied = true; }, () => {});
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); this.copied = true; } catch {}
      document.body.removeChild(ta);
    }
  }
}
