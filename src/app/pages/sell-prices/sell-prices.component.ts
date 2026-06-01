import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import html2canvas from 'html2canvas';
import { MarketService, MarketTypeOption, SellPriceItem } from '../../services/market.service';

@Component({
  selector: 'app-sell-prices',
  template: `
    <div class="page">
      <div class="page-header">
        <div class="h-icon emerald"><span class="mi lg">sell</span></div>
        <h1>{{ 'sellPrices.title' | translate }}</h1>
        <div class="page-actions">
          <div class="input-wrap" style="width:220px">
            <span class="mi lead">search</span>
            <input type="search" class="input" [(ngModel)]="q" [placeholder]="'sellPrices.search' | translate">
          </div>
          <select class="select" [(ngModel)]="typeId" (ngModelChange)="reload()">
            <option [ngValue]="null">{{ 'sellPrices.allTypes' | translate }}</option>
            <option *ngFor="let t of types" [ngValue]="t.id">{{ t.name }}</option>
          </select>
          <button (click)="exportImage()" [disabled]="exporting || loading" class="btn primary">
            <span class="mi sm">{{ exporting ? 'hourglass_empty' : 'image' }}</span> {{ 'sellPrices.exportImage' | translate }}
          </button>
        </div>
      </div>

      <div class="welcome-alert" style="margin-bottom:16px">
        <span class="alert-icon mi">info</span>
        <div [innerHTML]="'sellPrices.intro' | translate:{ commission: '<strong>' + commission + '%</strong>' }"></div>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <!-- #board is what gets rasterized to PNG on export -->
        <div #board class="card flush board">
          <div class="board-head">
            <span class="mi">storefront</span>
            <span>meowpow · {{ 'sellPrices.boardTitle' | translate }}</span>
            <span class="board-date mono">{{ today }}</span>
          </div>
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th style="width:56px">{{ 'sellPrices.col.image' | translate }}</th>
                  <th>{{ 'sellPrices.col.name' | translate }}</th>
                  <th class="r">{{ 'sellPrices.col.sell' | translate }}</th>
                  <th class="r">{{ 'sellPrices.col.market' | translate }}</th>
                  <th style="width:64px" class="r">{{ 'sellPrices.col.trend' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let it of filtered()">
                  <td>
                    <div class="thumb-sm">
                      <img *ngIf="it.image_url; else noImg" [src]="it.image_url">
                      <ng-template #noImg><span class="mi faint">inventory_2</span></ng-template>
                    </div>
                  </td>
                  <td>
                    <span style="font-weight:600">{{ it.name || ('#' + it.item_id) }}</span>
                    <span *ngIf="it.type_name" class="badge violet" style="margin-left:6px">{{ it.type_name }}</span>
                    <span *ngIf="!it.is_for_sale" class="badge amber" style="margin-left:6px" [title]="'sellPrices.buyOnlyHint' | translate">
                      <span class="mi sm">sell</span>{{ 'sellPrices.buyOnly' | translate }}
                    </span>
                  </td>
                  <td class="r mono" style="font-weight:700;color:var(--emerald);font-size:15px">{{ it.sell_price | number }}</td>
                  <td class="r mono muted">{{ it.buy_price | number }}</td>
                  <td class="r">
                    <span *ngIf="it.trend > 0" class="mi" style="color:var(--emerald)" title="up">trending_up</span>
                    <span *ngIf="it.trend < 0" class="mi" style="color:var(--rose)" title="down">trending_down</span>
                    <span *ngIf="it.trend === 0" class="mi faint" title="flat">trending_flat</span>
                  </td>
                </tr>
                <tr *ngIf="filtered().length === 0">
                  <td colspan="5">
                    <div class="empty">
                      <span class="mi xxl">sell</span>
                      <div class="empty-title">{{ 'sellPrices.empty' | translate }}</div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="board-foot muted">{{ 'sellPrices.boardFoot' | translate:{ commission: commission } }}</div>
        </div>
      </ng-container>
      <ng-template #loadingTpl>
        <div style="text-align:center;padding:48px 0"><div class="spinner"></div></div>
      </ng-template>
    </div>
  `,
  styles: [`
    .board { padding: 0; overflow: hidden; }
    .board-head { display:flex; align-items:center; gap:8px; padding:12px 16px; font-weight:700;
                  background: var(--surface-2); border-bottom:1px solid var(--border); }
    .board-head .board-date { margin-left:auto; font-weight:400; color: var(--muted); font-size:12px; }
    .board-foot { padding:10px 16px; font-size:12px; border-top:1px solid var(--border); }
    .thumb-sm { width:40px; height:40px; background:var(--surface-2); border-radius:6px; display:flex;
                align-items:center; justify-content:center; overflow:hidden; }
    .thumb-sm img { width:100%; height:100%; object-fit:contain; padding:2px; }
  `],
})
export class SellPricesComponent implements OnInit {
  @ViewChild('board') board?: ElementRef<HTMLElement>;

  loading = true;
  exporting = false;
  items: SellPriceItem[] = [];
  commission = 0;
  types: MarketTypeOption[] = [];
  typeId: number | null = null;
  q = '';
  today = new Date().toISOString().slice(0, 10);

  constructor(private svc: MarketService) {}

  ngOnInit() {
    this.svc.types().subscribe({ next: t => this.types = t, error: () => {} });
    this.reload();
  }

  reload() {
    this.loading = true;
    this.svc.sellPrices(this.typeId).subscribe({
      next: b => { this.items = b.items; this.commission = b.commission_percent; this.loading = false; },
      error: () => { this.items = []; this.loading = false; },
    });
  }

  filtered(): SellPriceItem[] {
    const s = this.q.trim().toLowerCase();
    if (!s) return this.items;
    return this.items.filter(i => (i.name || '').toLowerCase().includes(s) || String(i.item_id).includes(s));
  }

  async exportImage() {
    if (!this.board) return;
    this.exporting = true;
    try {
      const el = this.board.nativeElement;
      const bg = getComputedStyle(document.body).backgroundColor || '#0b0f17';
      const canvas = await html2canvas(el, { backgroundColor: bg, scale: 2, useCORS: true });
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `sell-prices-${this.today}.png`;
      a.click();
    } catch {
      // swallow — export is best-effort
    } finally {
      this.exporting = false;
    }
  }
}
