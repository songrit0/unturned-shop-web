import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pager',
  template: `
    <div class="flex items-center justify-between gap-2 text-sm" *ngIf="total > 0">
      <div class="text-slate-500">
        {{ from }}–{{ to }} / {{ total | number }}
      </div>
      <div class="flex items-center gap-1">
        <select [ngModel]="limit" (ngModelChange)="onLimit($event)"
                class="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800">
          <option *ngFor="let n of limits" [ngValue]="n">{{ 'pager.perPage' | translate:{ n: n } }}</option>
        </select>
        <button (click)="go(1)" [disabled]="page <= 1"
                class="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40">
          <span class="mi">first_page</span>
        </button>
        <button (click)="go(page - 1)" [disabled]="page <= 1"
                class="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40">
          <span class="mi">chevron_left</span>
        </button>
        <span class="px-2 font-mono">{{ page }} / {{ pages }}</span>
        <button (click)="go(page + 1)" [disabled]="page >= pages"
                class="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40">
          <span class="mi">chevron_right</span>
        </button>
        <button (click)="go(pages)" [disabled]="page >= pages"
                class="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40">
          <span class="mi">last_page</span>
        </button>
      </div>
    </div>
  `,
})
export class PagerComponent {
  @Input() page = 1;
  @Input() pages = 1;
  @Input() total = 0;
  @Input() limit = 20;
  @Input() limits: number[] = [10, 20, 50, 100];

  @Output() pageChange = new EventEmitter<number>();
  @Output() limitChange = new EventEmitter<number>();

  get from(): number { return this.total === 0 ? 0 : (this.page - 1) * this.limit + 1; }
  get to(): number { return Math.min(this.page * this.limit, this.total); }

  go(p: number) {
    if (p < 1 || p > this.pages || p === this.page) return;
    this.pageChange.emit(p);
  }
  onLimit(l: number) { this.limitChange.emit(Number(l)); }
}
