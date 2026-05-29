import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { formatActorLabel, isDeletedActor, P2pListing } from '../../models/vault';
import { P2pService } from '../../services/p2p.service';
import { daysUntil } from '../../services/expiry';

type Tab = 'active' | 'sold' | 'expired' | 'cancelled';

@Component({
  selector: 'app-my-listings',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon amber"><span class="mi lg">sell</span></div>
        <h1>{{ 'myListings.title' | translate }}</h1>
      </div>

      <div class="tabs">
        <button *ngFor="let t of tabs"
                class="tab"
                [class.active]="tab === t"
                (click)="select(t)">
          {{ ('myListings.tab.' + t) | translate }}
        </button>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div class="card flush">
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th style="width:56px"></th>
                  <th>{{ 'myListings.col.item' | translate }}</th>
                  <th style="width:140px">{{ 'myListings.col.quality' | translate }}</th>
                  <th style="width:120px">{{ 'myListings.col.price' | translate }}</th>
                  <th *ngIf="tab === 'sold'" style="width:200px">{{ 'myListings.col.buyer' | translate }}</th>
                  <th style="width:160px">{{ 'myListings.col.created' | translate }}</th>
                  <th style="width:140px"></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let l of items">
                  <td>
                    <div style="width:40px;height:40px;background:var(--surface-2);border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden">
                      <img *ngIf="l.image_url" [src]="l.image_url" style="width:100%;height:100%;object-fit:contain;padding:2px">
                    </div>
                  </td>
                  <td><div style="font-weight:600">{{ l.item_name }}</div></td>
                  <td>
                    <app-quality-bar [value]="l.quality" [showPercent]="true"></app-quality-bar>
                    <div *ngIf="l.amount > 1" class="muted mono" style="font-size:11px;margin-top:2px">×{{ l.amount }}</div>
                  </td>
                  <td class="mono">{{ l.price | number }}</td>
                  <td *ngIf="tab === 'sold'" class="muted mono" style="font-size:12px" [class.deleted-actor]="isBuyerDeleted(l)">{{ buyerLabel(l) }}</td>
                  <td class="muted mono" style="font-size:12px">{{ l.created_at | date:'short' }}</td>
                  <td>
                    <button *ngIf="l.status === 'active'" class="btn ghost sm" style="color:var(--rose)" (click)="cancel(l)">
                      {{ 'myListings.cancel' | translate }}
                    </button>
                    <button *ngIf="l.status !== 'active' && l.redeem_code" class="btn ghost sm" (click)="showCode(l)">
                      <span class="mi sm">qr_code_2</span> {{ 'myListings.showCode' | translate }}
                    </button>
                    <span *ngIf="l.status !== 'active' && !l.redeem_code"
                          class="muted" style="font-size:12px">{{ ('p2p.status.' + l.status) | translate }}</span>
                  </td>
                </tr>
                <tr *ngIf="items.length === 0">
                  <td [attr.colspan]="tab === 'sold' ? 7 : 6">
                    <div class="empty">
                      <span class="mi xxl">sell</span>
                      <div class="empty-title">{{ ('myListings.empty.' + tab) | translate }}</div>
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

      <!-- Refund code modal — reuses the inventory code-reveal pattern -->
      <div *ngIf="codeFor" class="modal-backdrop" (click)="closeCode()">
        <div class="modal-card tactical" style="max-width:480px;text-align:center" (click)="$event.stopPropagation()">
          <h3 style="display:flex;align-items:center;justify-content:center;gap:8px;margin:0 0 12px 0;font-size:18px;font-weight:700">
            <span class="mi">qr_code_2</span>{{ 'notifications.code.title' | translate }}
          </h3>
          <p class="muted" style="font-size:13px;margin:0 0 12px 0">
            {{ codeFor.item_name || ('#' + codeFor.item_id) }}
            <ng-container *ngIf="codeFor.amount > 1"> · ×{{ codeFor.amount }}</ng-container>
          </p>
          <div class="code-box mono">{{ codeFor.redeem_code }}</div>
          <button class="btn ghost sm" (click)="copy(codeFor.redeem_code!)" style="margin-top:8px">
            <span class="mi sm">{{ copied ? 'check' : 'content_copy' }}</span>
            {{ (copied ? 'notifications.code.copied' : 'notifications.code.copy') | translate }}
          </button>
          <p *ngIf="codeExpiryText(codeFor) as ex" class="muted" style="font-size:12px;margin-top:10px">
            <span class="mi sm">schedule</span> {{ ex }}
          </p>
          <p class="muted" style="font-size:12px;margin-top:8px">
            {{ 'notifications.code.instruction' | translate:{ code: codeFor.redeem_code } }}
          </p>
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
  `],
})
export class MyListingsComponent implements OnInit {
  buyerLabel = (l: P2pListing) => formatActorLabel(l.buyer_discord_name, l.buyer_steam);
  isBuyerDeleted = (l: P2pListing) => isDeletedActor(l.buyer_discord_name);

  loading = true;
  tab: Tab = 'active';
  tabs: Tab[] = ['active', 'sold', 'expired', 'cancelled'];
  all: P2pListing[] = [];

  codeFor: P2pListing | null = null;
  copied = false;

  constructor(private svc: P2pService, private t: TranslateService) {}

  ngOnInit() { this.reload(); }

  get items(): P2pListing[] {
    return this.all.filter(l => l.status === this.tab);
  }

  select(t: Tab) {
    if (this.tab === t) return;
    this.tab = t;
  }

  reload() {
    this.loading = true;
    this.svc.myListings().subscribe({
      next: p => { this.all = p.items; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  cancel(l: P2pListing) {
    this.svc.cancel(l.id).subscribe({
      next: () => this.reload(),
      error: () => {},
    });
  }

  showCode(l: P2pListing) {
    this.codeFor = l;
    this.copied = false;
  }

  closeCode() {
    this.codeFor = null;
    this.copied = false;
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

  /** Countdown label for the refund code's own expiry, shown in the modal. */
  codeExpiryText(l: P2pListing): string | null {
    const d = daysUntil(l.code_expires_at);
    if (d === null || d < 0) return null;
    return d === 0
      ? this.t.instant('myListings.codeExpiresToday')
      : this.t.instant('myListings.codeExpiresIn', { days: d });
  }
}
