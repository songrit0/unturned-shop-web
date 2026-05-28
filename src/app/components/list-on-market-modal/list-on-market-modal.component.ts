import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { EnrichedVaultItem, P2pConfig } from '../../models/vault';
import { P2pService } from '../../services/p2p.service';

@Component({
  selector: 'app-list-on-market-modal',
  template: `
    <div class="modal-backdrop" (click)="cancel.emit()">
      <div class="modal-card tactical" style="max-width:420px" (click)="$event.stopPropagation()">
        <h3 style="display:flex;align-items:center;gap:8px;margin:0 0 12px 0;font-size:18px;font-weight:700">
          <span class="mi">storefront</span>
          {{ 'p2p.list.title' | translate }}
        </h3>

        <div class="row gap-3" style="align-items:center;margin-bottom:12px">
          <div style="width:56px;height:56px;background:var(--surface-2);border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden">
            <img *ngIf="item.image_url; else noImg" [src]="item.image_url" style="width:100%;height:100%;object-fit:contain;padding:4px">
            <ng-template #noImg><span class="mi">inventory_2</span></ng-template>
          </div>
          <div>
            <div style="font-weight:600">{{ item.name }}</div>
            <div class="muted" style="font-size:12px">
              Q{{ item.Quality }} ·
              <ng-container *ngIf="item.Amount > 1">×{{ item.Amount }} · </ng-container>
              <span class="mono">#{{ item.Id }}</span>
            </div>
          </div>
        </div>

        <label style="display:block;margin-bottom:8px">
          <span class="muted" style="font-size:12px">{{ 'p2p.list.price' | translate }}</span>
          <input type="number" min="1" step="1" class="input mono" [(ngModel)]="price" style="margin-top:4px">
        </label>

        <div class="preview" *ngIf="config && price > 0">
          <div class="row" style="justify-content:space-between"><span class="muted">{{ 'p2p.list.commission' | translate }}</span><span class="mono">{{ (config.commission * 100) | number:'1.0-1' }}%</span></div>
          <div class="row" style="justify-content:space-between"><span class="muted">{{ 'p2p.list.youReceive' | translate }}</span><span class="mono"><b>{{ payout | number:'1.0-2' }}</b></span></div>
        </div>

        <p *ngIf="error" style="color:var(--rose);font-size:13px;margin:8px 0 0 0">{{ error | translate }}</p>

        <div class="row gap-2" style="margin-top:16px">
          <button class="btn secondary" style="flex:1" (click)="cancel.emit()">{{ 'common.cancel' | translate }}</button>
          <button class="btn primary" style="flex:1" [disabled]="busy || !canSubmit" (click)="onConfirm()">
            {{ (busy ? 'common.saving' : 'p2p.list.confirm') | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .preview { background: var(--surface-2); border-radius: 6px; padding: 8px 10px; font-size: 13px; display: flex; flex-direction: column; gap: 4px; }
  `],
})
export class ListOnMarketModalComponent implements OnInit {
  @Input({ required: true }) item!: EnrichedVaultItem;
  @Input() busy = false;
  @Input() error: string | null = null;

  @Output() confirm = new EventEmitter<number>();
  @Output() cancel = new EventEmitter<void>();

  price = 0;
  config: P2pConfig | null = null;

  constructor(private p2p: P2pService) {}

  ngOnInit() {
    this.p2p.getConfig().subscribe({
      next: c => (this.config = c),
      error: () => (this.config = { commission: 0, ttl_days: 7 }),
    });
  }

  get canSubmit(): boolean { return this.price > 0; }

  get payout(): number {
    if (!this.config) return this.price;
    return this.price * (1 - this.config.commission);
  }

  onConfirm() {
    if (!this.canSubmit) return;
    this.confirm.emit(this.price);
  }
}
