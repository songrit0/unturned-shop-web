import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { EnrichedVaultItem, VaultGridSize, DEFAULT_VAULT_GRID } from '../../models/vault';

// Reusable grid editor for player and admin vault views.
// v1: treats every item as 1x1 (see plan §"Still-open" — sv_items has no width/height yet).
// Drag-drop uses native HTML5; rotate via R key while a tile is selected.
// `State` strings flow through untouched — the editor never reads or writes them.
@Component({
  selector: 'app-vault-grid',
  template: `
    <div class="grid-wrap">
      <div class="banner" *ngIf="!readonly">
        <span class="mi sm">info</span>
        {{ 'vaultGrid.banner' | translate }}
      </div>

      <div
        class="grid"
        [style.gridTemplateColumns]="'repeat(' + grid.width + ', var(--cell))'"
        [style.gridTemplateRows]="'repeat(' + grid.height + ', var(--cell))'"
      >
        <ng-container *ngFor="let cell of cells; let i = index">
          <div
            class="cell"
            [class.drop-target]="dragOverIndex === i"
            (dragover)="readonly ? null : onDragOver($event, i)"
            (dragleave)="dragOverIndex = null"
            (drop)="readonly ? null : onDrop($event, i)"
          >
            <ng-container *ngIf="cellMap[i] != null">
              <app-vault-item-tile
                [item]="items[cellMap[i]!]"
                [selected]="selectedIndex === cellMap[i]"
                [readonly]="readonly"
                (select)="onSelect(cellMap[i]!)"
                (dragstart)="readonly ? null : onDragStart($event, cellMap[i]!)"
                (contextmenu)="readonly ? null : onContext($event, cellMap[i]!)"
              ></app-vault-item-tile>
            </ng-container>
          </div>
        </ng-container>
      </div>

      <div class="hint" *ngIf="!readonly">
        <span><kbd>R</kbd> {{ 'vaultGrid.hint.rotate' | translate }}</span>
        <span><kbd>Del</kbd> {{ 'vaultGrid.hint.delete' | translate }}</span>
        <span><kbd>M</kbd> {{ 'vaultGrid.hint.list' | translate }}</span>
      </div>

      <!-- Context menu -->
      <div *ngIf="ctx" class="ctx" [style.left.px]="ctx.x" [style.top.px]="ctx.y">
        <button class="ctx-item" (click)="rotateSelected(); closeCtx()">
          <span class="mi sm">rotate_right</span> {{ 'vaultGrid.ctx.rotate' | translate }}
        </button>
        <button class="ctx-item" (click)="listSelected(); closeCtx()">
          <span class="mi sm">storefront</span> {{ 'vaultGrid.ctx.list' | translate }}
        </button>
        <button class="ctx-item danger" (click)="deleteSelected(); closeCtx()">
          <span class="mi sm">delete</span> {{ 'vaultGrid.ctx.delete' | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { --cell: 56px; display: block; }
    .grid-wrap { position: relative; }
    .banner {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 10px; margin-bottom: 8px;
      font-size: 12px; color: var(--muted);
      background: var(--surface-2); border-radius: 6px;
    }
    .grid {
      display: grid;
      gap: 4px;
      padding: 6px;
      background: var(--surface-1);
      border: 1px solid var(--border);
      border-radius: 8px;
      width: fit-content;
    }
    .cell {
      width: var(--cell); height: var(--cell);
      background: var(--surface-3);
      border-radius: 4px;
      transition: background .1s ease;
    }
    .cell.drop-target { background: var(--accent-soft); outline: 2px dashed var(--accent); }
    .hint {
      margin-top: 8px; display: flex; gap: 12px;
      font-size: 11px; color: var(--muted);
    }
    .hint kbd {
      background: var(--surface-3); border: 1px solid var(--border);
      border-radius: 3px; padding: 1px 5px; font-family: var(--font-mono);
    }
    .ctx {
      position: fixed; z-index: 1000;
      background: var(--surface-1); border: 1px solid var(--border);
      border-radius: 6px; box-shadow: 0 6px 24px rgba(0,0,0,.4);
      padding: 4px; min-width: 160px;
    }
    .ctx-item {
      display: flex; align-items: center; gap: 8px;
      width: 100%; padding: 6px 10px; background: transparent; border: 0;
      border-radius: 4px; color: var(--text); text-align: left; cursor: pointer;
      font-size: 13px;
    }
    .ctx-item:hover { background: var(--surface-2); }
    .ctx-item.danger { color: var(--rose); }
  `],
})
export class VaultGridComponent {
  @Input() grid: VaultGridSize = DEFAULT_VAULT_GRID;
  @Input() items: EnrichedVaultItem[] = [];
  @Input() readonly = false;

  @Output() itemsChange = new EventEmitter<EnrichedVaultItem[]>();
  /** Emitted when user requests "List on market" for an item (by index in `items`). */
  @Output() listItem = new EventEmitter<number>();

  selectedIndex: number | null = null;
  dragOverIndex: number | null = null;
  ctx: { x: number; y: number } | null = null;

  get cells(): number[] {
    return Array.from({ length: this.grid.width * this.grid.height }, (_, i) => i);
  }

  /** Map of cell-index → items[] index for O(1) render lookup. */
  get cellMap(): Record<number, number | null> {
    const map: Record<number, number | null> = {};
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      const cell = it.Y * this.grid.width + it.X;
      map[cell] = i;
    }
    return map;
  }

  onSelect(index: number) {
    this.selectedIndex = index;
  }

  onDragStart(e: DragEvent, index: number) {
    if (!e.dataTransfer) return;
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    this.selectedIndex = index;
  }

  onDragOver(e: DragEvent, cellIndex: number) {
    e.preventDefault();
    this.dragOverIndex = cellIndex;
  }

  onDrop(e: DragEvent, cellIndex: number) {
    e.preventDefault();
    this.dragOverIndex = null;
    const raw = e.dataTransfer?.getData('text/plain');
    if (!raw) return;
    const fromIdx = Number(raw);
    if (!Number.isFinite(fromIdx) || !this.items[fromIdx]) return;

    const targetX = cellIndex % this.grid.width;
    const targetY = Math.floor(cellIndex / this.grid.width);
    const next = this.items.slice();
    const occupant = next.findIndex((it, i) => i !== fromIdx && it.X === targetX && it.Y === targetY);
    const moving = { ...next[fromIdx], X: targetX, Y: targetY };

    if (occupant >= 0) {
      // swap positions
      next[occupant] = { ...next[occupant], X: next[fromIdx].X, Y: next[fromIdx].Y };
    }
    next[fromIdx] = moving;
    this.items = next;
    this.itemsChange.emit(next);
  }

  onContext(e: MouseEvent, index: number) {
    e.preventDefault();
    this.selectedIndex = index;
    this.ctx = { x: e.clientX, y: e.clientY };
  }

  closeCtx() { this.ctx = null; }

  @HostListener('document:click')
  onDocClick() { this.ctx = null; }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (this.readonly || this.selectedIndex == null) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.key === 'r' || e.key === 'R') { this.rotateSelected(); e.preventDefault(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { this.deleteSelected(); e.preventDefault(); }
    else if (e.key === 'm' || e.key === 'M') { this.listSelected(); e.preventDefault(); }
  }

  rotateSelected() {
    if (this.selectedIndex == null) return;
    const next = this.items.slice();
    // v1: only 0/1 (horizontal vs 90° rotated). Multi-cell items will require 0-3.
    next[this.selectedIndex] = { ...next[this.selectedIndex], Rot: next[this.selectedIndex].Rot ? 0 : 1 };
    this.items = next;
    this.itemsChange.emit(next);
  }

  deleteSelected() {
    if (this.selectedIndex == null) return;
    const next = this.items.filter((_, i) => i !== this.selectedIndex);
    this.selectedIndex = null;
    this.items = next;
    this.itemsChange.emit(next);
  }

  listSelected() {
    if (this.selectedIndex == null) return;
    this.listItem.emit(this.selectedIndex);
  }
}
