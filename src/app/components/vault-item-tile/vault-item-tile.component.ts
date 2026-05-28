import { Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';
import { EnrichedVaultItem } from '../../models/vault';

@Component({
  selector: 'app-vault-item-tile',
  template: `
    <div class="tile" [class.selected]="selected" [class.rotated]="item.Rot % 2 === 1"
         [attr.draggable]="readonly ? null : 'true'"
         (click)="select.emit()">
      <div class="tile-image" [style.backgroundImage]="item.image_url ? 'url(' + item.image_url + ')' : null">
        <span *ngIf="!item.image_url" class="mi">inventory_2</span>
      </div>
      <span *ngIf="item.Amount > 1" class="badge-amount">×{{ item.Amount }}</span>
      <div class="quality" [style.width.%]="item.Quality" [class.q-hi]="item.Quality >= 80" [class.q-mid]="item.Quality >= 40 && item.Quality < 80" [class.q-lo]="item.Quality < 40"></div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .tile {
      position: relative;
      width: 100%;
      height: 100%;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
      cursor: grab;
      transition: transform .12s ease, border-color .12s ease;
    }
    .tile.selected { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-soft); }
    .tile.rotated .tile-image { transform: rotate(90deg); }
    .tile-image {
      width: 100%;
      height: 100%;
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--muted);
      transition: transform .12s ease;
    }
    .badge-amount {
      position: absolute;
      bottom: 8px;
      right: 4px;
      font-size: 11px;
      font-weight: 700;
      color: #fff;
      text-shadow: 0 1px 2px rgba(0,0,0,.8);
    }
    .quality {
      position: absolute; left: 0; bottom: 0;
      height: 3px; background: var(--emerald);
    }
    .quality.q-hi { background: var(--emerald); }
    .quality.q-mid { background: var(--amber); }
    .quality.q-lo { background: var(--rose); }
  `],
})
export class VaultItemTileComponent {
  @Input({ required: true }) item!: EnrichedVaultItem;
  @Input() selected = false;
  @Input() readonly = false;
  @Output() select = new EventEmitter<void>();

  @HostBinding('attr.title') get titleAttr() {
    return `${this.item.name} (Q${this.item.Quality})`;
  }
}
