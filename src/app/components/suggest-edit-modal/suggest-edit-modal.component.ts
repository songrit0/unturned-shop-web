import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { SubmissionPatch } from '../../models/item-submission';
import { EnrichedVaultItem } from '../../models/vault';
import { ItemType, ItemTypesService } from '../../services/item-types.service';

@Component({
  selector: 'app-suggest-edit-modal',
  template: `
    <div class="modal-backdrop" (click)="cancel.emit()">
      <div class="modal-card tactical" style="max-width:520px" (click)="$event.stopPropagation()">
        <h3 style="display:flex;align-items:center;gap:8px;margin:0 0 12px 0;font-size:18px;font-weight:700">
          <span class="mi">edit_note</span>
          {{ 'suggestEdit.title' | translate }}
        </h3>

        <div class="row gap-3" style="align-items:center;margin-bottom:12px">
          <div style="width:48px;height:48px;background:var(--surface-2);border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden">
            <img *ngIf="item.image_url; else noImg" [src]="item.image_url" style="width:100%;height:100%;object-fit:contain;padding:2px">
            <ng-template #noImg><span class="mi">inventory_2</span></ng-template>
          </div>
          <div>
            <div style="font-weight:600">{{ item.name || ('#' + item.Id) }}</div>
            <div class="muted mono" style="font-size:11px">#{{ item.Id }}</div>
          </div>
        </div>

        <p class="muted" style="font-size:12px;margin:0 0 12px 0">{{ 'suggestEdit.hint' | translate }}</p>

        <div style="display:flex;flex-direction:column;gap:10px">
          <label style="display:block">
            <span class="muted" style="font-size:12px">{{ 'suggestEdit.field.name' | translate }}</span>
            <input type="text" class="input" [(ngModel)]="form.name" maxlength="128" style="margin-top:4px" [placeholder]="item.name || ''">
          </label>
          <label style="display:block">
            <span class="muted" style="font-size:12px">{{ 'suggestEdit.field.description' | translate }}</span>
            <textarea [(ngModel)]="form.description" maxlength="2048" rows="2" class="input" style="margin-top:4px;height:auto;padding:8px 12px;font-family:inherit" [placeholder]="item.description || ''"></textarea>
          </label>
          <label style="display:block">
            <span class="muted" style="font-size:12px">{{ 'suggestEdit.field.imageUrl' | translate }}</span>
            <input type="url" class="input" [(ngModel)]="form.image_url" maxlength="2048" style="margin-top:4px" [placeholder]="item.image_url || ''">
          </label>
          <label style="display:block">
            <span class="muted" style="font-size:12px">{{ 'suggestEdit.field.type' | translate }}</span>
            <select class="select" [(ngModel)]="form.type_id" style="margin-top:4px;width:100%">
              <option [ngValue]="null">{{ 'suggestEdit.noChange' | translate }}</option>
              <option *ngFor="let t of types" [ngValue]="t.id">{{ t.name }}</option>
            </select>
          </label>
        </div>

        <p *ngIf="error" style="color:var(--rose);font-size:13px;margin:8px 0 0 0">{{ error | translate }}</p>

        <div class="row gap-2" style="margin-top:16px">
          <button class="btn secondary" style="flex:1" (click)="cancel.emit()">{{ 'common.cancel' | translate }}</button>
          <button class="btn primary" style="flex:1" [disabled]="busy || !canSubmit" (click)="onConfirm()">
            {{ (busy ? 'common.saving' : 'suggestEdit.submit') | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class SuggestEditModalComponent implements OnInit {
  @Input({ required: true }) item!: EnrichedVaultItem;
  @Input() busy = false;
  @Input() error: string | null = null;

  @Output() confirm = new EventEmitter<SubmissionPatch>();
  @Output() cancel = new EventEmitter<void>();

  form: { name: string; description: string; image_url: string; type_id: number | null } = {
    name: '', description: '', image_url: '', type_id: null,
  };
  types: ItemType[] = [];

  constructor(private typesSvc: ItemTypesService) {}

  ngOnInit() {
    this.typesSvc.list().subscribe({ next: p => (this.types = p.items), error: () => {} });
  }

  // Submit requires at least one field to differ from the current snapshot — but the api
  // re-checks via `nothing_to_submit`, so client-side we only require *some* field non-empty.
  get canSubmit(): boolean {
    return !!(this.form.name.trim() || this.form.description.trim() || this.form.image_url.trim() || this.form.type_id != null);
  }

  onConfirm() {
    if (!this.canSubmit) return;
    const patch: SubmissionPatch = {};
    if (this.form.name.trim()) patch.name = this.form.name.trim();
    if (this.form.description.trim()) patch.description = this.form.description.trim();
    if (this.form.image_url.trim()) patch.image_url = this.form.image_url.trim();
    if (this.form.type_id != null) patch.type_id = this.form.type_id;
    this.confirm.emit(patch);
  }
}
