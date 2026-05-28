import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CodesService, MyCode, Paginated } from '../../services/codes.service';

@Component({
  selector: 'app-codes',
  template: `
    <div class="page">
      <div class="page-header">
        <h1><span class="h-icon"><span class="mi fill">qr_code_2</span></span>{{ 'codes.title' | translate }}</h1>
        <span class="h-sub">{{ 'codes.desc' | translate }}</span>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div *ngIf="page && page.items.length === 0" class="empty">
          <span class="mi xxl">receipt_long</span>
          <div class="empty-title">{{ 'codes.empty' | translate }}</div>
        </div>

        <div class="col gap-3">
          <div *ngFor="let c of page?.items" class="card" style="padding:18px;">
            <div class="row gap-3 wrap between">
              <div class="row gap-3">
                <div style="width:56px; height:56px; background: rgb(245 158 11 / 0.12); border:1px solid rgb(245 158 11 / 0.3); border-radius: var(--radius); display:flex; align-items:center; justify-content:center;">
                  <span class="mi md" style="color:var(--accent-hi);">qr_code_2</span>
                </div>
                <div>
                  <code class="mono fw-7" style="font-size:22px; letter-spacing:0.18em;"
                    [style.color]="c.status === 'available' ? 'var(--accent)' : 'var(--text-faint)'"
                    [style.text-decoration]="(c.status === 'used' || c.status === 'expired') ? 'line-through' : 'none'">
                    {{ c.code }}
                  </code>
                  <div class="row gap-2 mt-1">
                    <span class="badge"
                      [class.emerald]="c.status === 'available'"
                      [class.slate]="c.status === 'used'"
                      [class.rose]="c.status === 'expired' || c.status === 'disabled'">{{ statusText(c.status) }}</span>
                    <span class="mono faint text-xs">{{ c.created_at | date:'short' }}</span>
                  </div>
                </div>
              </div>
              <button class="btn secondary sm" (click)="copy(c.code)" [disabled]="c.status !== 'available'">
                <span class="mi sm">{{ copiedCode === c.code ? 'check' : 'content_copy' }}</span>
                {{ (copiedCode === c.code ? 'welcome.copied' : 'welcome.copy') | translate }}
              </button>
            </div>

            <div class="row gap-2 wrap mt-3">
              <div *ngFor="let it of c.items" class="row gap-2" style="background:var(--surface-2); border:1px solid var(--border); border-radius:999px; padding: 4px 12px 4px 4px;">
                <div style="width:24px; height:24px; background:var(--surface-3); border-radius:50%; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                  <img *ngIf="it.image_url; else noImg" [src]="it.image_url" style="width:80%; height:80%; object-fit:contain;">
                  <ng-template #noImg><span class="mi sm faint">inventory_2</span></ng-template>
                </div>
                <span class="text-xs">{{ it.name || ('#' + it.item_id) }}</span>
                <span class="mono faint text-xs">×{{ it.amount }}</span>
              </div>
            </div>

            <p *ngIf="c.status === 'available'" class="muted text-xs mt-3">
              {{ 'codes.useInGame' | translate }}
              <code class="mono" style="background:var(--surface-2); padding:2px 6px; border-radius:4px;">/code {{ c.code }}</code>
            </p>
          </div>
        </div>

        <app-pager *ngIf="page"
          [page]="page.page" [pages]="page.pages"
          [total]="page.total" [limit]="page.limit"
          (pageChange)="load($event, page.limit)"
          (limitChange)="load(1, $event)"></app-pager>
      </ng-container>
      <ng-template #loadingTpl>
        <div class="empty"><div class="spinner"></div></div>
      </ng-template>
    </div>
  `,
})
export class CodesComponent implements OnInit {
  loading = true;
  page: Paginated<MyCode> | null = null;
  copiedCode: string | null = null;

  constructor(private svc: CodesService, private t: TranslateService) {}

  ngOnInit() { this.load(1, 20); }

  load(page: number, limit: number) {
    this.loading = true;
    this.svc.listMine(page, limit).subscribe({
      next: p => { this.page = p; this.loading = false; },
      error: () => this.loading = false,
    });
  }

  copy(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      this.copiedCode = code; setTimeout(() => this.copiedCode = null, 2000);
    });
  }

  statusText(s: MyCode['status']): string { return this.t.instant('codes.status.' + s); }
}
