import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-quality-bar',
  template: `
    <div class="wrap">
      <div class="bar"><div class="fill" [style.width.%]="clamped" [class.q-hi]="clamped >= 80" [class.q-mid]="clamped >= 40 && clamped < 80" [class.q-lo]="clamped < 40"></div></div>
      <div *ngIf="showLabel" class="cap muted mono">Q{{ clamped }}<span *ngIf="showPercent">%</span></div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .wrap { width: 100%; }
    .bar { width: 100%; height: 6px; background: var(--surface-2); border-radius: 3px; overflow: hidden; }
    .fill { height: 100%; transition: width .2s ease; }
    .fill.q-hi { background: var(--emerald); }
    .fill.q-mid { background: var(--amber); }
    .fill.q-lo { background: var(--rose); }
    .cap { font-size: 11px; margin-top: 2px; }
  `],
})
export class QualityBarComponent {
  @Input() value = 0;
  @Input() showLabel = true;
  @Input() showPercent = false;

  get clamped(): number {
    const v = Math.round(Number(this.value) || 0);
    return Math.max(0, Math.min(100, v));
  }
}
