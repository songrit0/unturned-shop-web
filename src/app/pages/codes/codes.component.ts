import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CodesService, MergeResult, MyCode, Paginated } from '../../services/codes.service';
import { daysUntil } from '../../services/expiry';
import { formatBangkok } from '../../services/thai-time';

@Component({
  selector: 'app-codes',
  template: `
    <div class="page">
      <div class="page-header">
        <h1><span class="h-icon"><span class="mi fill">qr_code_2</span></span>{{ 'codes.title' | translate }}</h1>
        <span class="h-sub">{{ 'codes.desc' | translate }}</span>
      </div>

      <!-- Merge result banner -->
      <div *ngIf="mergeResult" class="card" style="padding:18px; border:2px solid var(--accent); margin-bottom:16px;">
        <div class="row gap-3 between wrap">
          <div>
            <div class="row gap-2 mb-1">
              <span class="mi" style="color:var(--accent);">check_circle</span>
              <span class="fw-7">{{ 'codes.mergeSuccess' | translate: { n: mergeResult.merged_count } }}</span>
            </div>
            <code class="mono fw-7" style="font-size:24px; letter-spacing:0.2em; color:var(--accent);">{{ mergeResult.code }}</code>
            <div class="row gap-2 wrap mt-2">
              <div *ngFor="let it of mergeResult.items" class="row gap-2"
                style="background:var(--surface-2); border:1px solid var(--border); border-radius:999px; padding: 4px 12px 4px 4px;">
                <div style="width:24px; height:24px; background:var(--surface-3); border-radius:50%; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                  <img *ngIf="it.image_url; else noImgM" [src]="it.image_url" style="width:80%; height:80%; object-fit:contain;">
                  <ng-template #noImgM><span class="mi sm faint">inventory_2</span></ng-template>
                </div>
                <span class="text-xs">{{ it.name || ('#' + it.item_id) }}</span>
                <span class="mono faint text-xs">x{{ it.amount }}</span>
              </div>
            </div>
            <p class="muted text-xs mt-2">{{ 'codes.useInGame' | translate }}
              <code class="mono" style="background:var(--surface-2); padding:2px 6px; border-radius:4px;">/code {{ mergeResult.code }}</code>
            </p>
          </div>
          <div class="col gap-2">
            <button class="btn sm" style="background:var(--accent); color:#fff;" (click)="copyMerged()">
              <span class="mi sm">{{ mergedCopied ? 'check' : 'content_copy' }}</span>
              {{ (mergedCopied ? 'welcome.copied' : 'welcome.copy') | translate }}
            </button>
            <button class="btn secondary sm" (click)="mergeResult = null">
              <span class="mi sm">close</span>{{ 'codes.dismiss' | translate }}
            </button>
          </div>
        </div>
      </div>

      <ng-container *ngIf="!loading; else loadingTpl">
        <div *ngIf="page && page.items.length === 0" class="empty">
          <span class="mi xxl">receipt_long</span>
          <div class="empty-title">{{ 'codes.empty' | translate }}</div>
        </div>

        <!-- Bulk action bar -->
        <div *ngIf="availableCount > 0" class="row gap-2 wrap" style="margin-bottom:12px;">
          <button class="btn secondary sm" (click)="toggleSelectAll()">
            <span class="mi sm">{{ allAvailableSelected ? 'check_box' : 'check_box_outline_blank' }}</span>
            {{ (allAvailableSelected ? 'codes.deselectAll' : 'codes.selectAll') | translate }}
          </button>
          <button class="btn sm" style="background:var(--accent); color:#fff;"
            (click)="mergeSelected()"
            [disabled]="selected.size < 2 || merging">
            <span *ngIf="merging" class="spinner sm"></span>
            <span *ngIf="!merging" class="mi sm">merge</span>
            {{ 'codes.mergeSelected' | translate: { n: selected.size } }}
          </button>
          <button class="btn secondary sm"
            (click)="mergeAll()"
            [disabled]="availableCount < 2 || merging">
            <span *ngIf="merging" class="spinner sm"></span>
            <span *ngIf="!merging" class="mi sm">select_all</span>
            {{ 'codes.mergeAll' | translate }}
          </button>
          <span *ngIf="mergeError" class="text-xs" style="color:var(--rose); align-self:center;">{{ mergeError }}</span>
        </div>

        <div class="col gap-3">
          <div *ngFor="let c of page?.items" class="card" style="padding:18px;"
            [style.outline]="c.status === 'available' && selected.has(c.code_id) ? '2px solid var(--accent)' : 'none'"
            [style.outline-offset]="'-2px'">
            <div class="row gap-3 wrap between">
              <div class="row gap-3">
                <!-- Checkbox for available codes -->
                <div *ngIf="c.status === 'available'; else iconTpl"
                  style="width:56px; height:56px; background: rgb(245 158 11 / 0.12); border:1px solid rgb(245 158 11 / 0.3); border-radius: var(--radius); display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0;"
                  (click)="toggleSelect(c.code_id)">
                  <span class="mi md" style="color:var(--accent-hi);">{{ selected.has(c.code_id) ? 'check_box' : 'check_box_outline_blank' }}</span>
                </div>
                <ng-template #iconTpl>
                  <div style="width:56px; height:56px; background: var(--surface-2); border:1px solid var(--border); border-radius: var(--radius); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <span class="mi md faint">qr_code_2</span>
                  </div>
                </ng-template>

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
                    <span *ngIf="expiryText(c) as ex"
                      class="mono text-xs row gap-1"
                      [style.color]="isExpiringSoon(c) ? 'var(--accent-hi)' : 'var(--text-faint)'">
                      <span class="mi sm">schedule</span>{{ ex }}
                    </span>
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
                <span class="mono faint text-xs">x{{ it.amount }}</span>
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
  selected = new Set<number>();
  merging = false;
  mergeResult: MergeResult | null = null;
  mergeError: string | null = null;
  mergedCopied = false;

  constructor(private svc: CodesService, private t: TranslateService) {}

  ngOnInit() { this.load(1, 20); }

  load(page: number, limit: number) {
    this.loading = true;
    this.selected.clear();
    this.mergeResult = null;
    this.mergeError = null;
    this.svc.listMine(page, limit).subscribe({
      next: p => { this.page = p; this.loading = false; },
      error: () => this.loading = false,
    });
  }

  get availableCodes(): MyCode[] {
    return this.page?.items.filter(c => c.status === 'available') ?? [];
  }

  get availableCount(): number { return this.availableCodes.length; }

  get allAvailableSelected(): boolean {
    const avail = this.availableCodes;
    return avail.length > 0 && avail.every(c => this.selected.has(c.code_id));
  }

  toggleSelect(id: number) {
    if (this.selected.has(id)) this.selected.delete(id);
    else this.selected.add(id);
    this.selected = new Set(this.selected);
    this.mergeError = null;
  }

  toggleSelectAll() {
    if (this.allAvailableSelected) {
      this.selected.clear();
    } else {
      this.availableCodes.forEach(c => this.selected.add(c.code_id));
    }
    this.selected = new Set(this.selected);
    this.mergeError = null;
  }

  mergeSelected() {
    if (this.selected.size < 2) return;
    this.doMerge([...this.selected]);
  }

  mergeAll() {
    const ids = this.availableCodes.map(c => c.code_id);
    if (ids.length < 2) return;
    this.doMerge(ids);
  }

  private doMerge(ids: number[]) {
    this.merging = true;
    this.mergeResult = null;
    this.mergeError = null;
    this.svc.merge(ids).subscribe({
      next: result => {
        this.merging = false;
        this.mergeResult = result;
        this.selected.clear();
        this.selected = new Set(this.selected);
        // Reload the list so merged codes show as "used"
        const page = this.page;
        if (page) this.load(page.page, page.limit);
      },
      error: (err) => {
        this.merging = false;
        const reason = err?.error?.message ?? 'merge_failed';
        this.mergeError = this.t.instant('codes.mergeError', { reason });
      },
    });
  }

  copyMerged() {
    if (!this.mergeResult) return;
    navigator.clipboard.writeText(`/code ${this.mergeResult.code}`).then(() => {
      this.mergedCopied = true;
      setTimeout(() => this.mergedCopied = false, 2000);
    });
  }

  copy(code: string) {
    navigator.clipboard.writeText(`/code ${code}`).then(() => {
      this.copiedCode = code; setTimeout(() => this.copiedCode = null, 2000);
    });
  }

  statusText(s: MyCode['status']): string { return this.t.instant('codes.status.' + s); }

  private days(c: MyCode): number | null { return daysUntil(c.expires_at); }

  isExpiringSoon(c: MyCode): boolean {
    if (c.status !== 'available') return false;
    const d = this.days(c);
    return d !== null && d >= 0 && d <= 2;
  }

  expiryText(c: MyCode): string | null {
    if (!c.expires_at) return null;
    if (c.status === 'expired') {
      return this.t.instant('codes.expiredOn', { date: formatBangkok(c.expires_at, 'date') });
    }
    if (c.status !== 'available') return null;
    const d = this.days(c);
    if (d === null || d < 0) return null;
    return d === 0 ? this.t.instant('codes.expiresToday') : this.t.instant('codes.expiresIn', { days: d });
  }
}
