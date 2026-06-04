import { Component, Input } from '@angular/core';
import { GunAttachment, GunInfo } from '../../models/vault';

interface SlotChip {
  icon: string;
  label: string; // attachment name, or "#id" fallback
}

/**
 * Renders a gun's attachment chips (sight / tactical / grip / barrel / magazine),
 * an ammo chip when a magazine is present, or a muted "bare gun" tag when the gun
 * carries no attachments. Renders nothing when [gun] is null (item isn't a gun).
 * Reused on the P2P market card/detail and the vault item view.
 */
@Component({
  selector: 'app-gun-chips',
  template: `
    <div *ngIf="gun" class="gun-chips">
      <ng-container *ngIf="gun.hasAttachments; else bare">
        <span *ngFor="let c of slots" class="chip">
          <span class="mi sm">{{ c.icon }}</span>{{ c.label }}
        </span>
        <span *ngIf="gun.magazine" class="chip ammo">
          <span class="mi sm">view_agenda</span>{{ attachLabel(gun.magazine) }} {{ gun.ammo | number }} {{ 'p2p.gun.rounds' | translate }}
        </span>
      </ng-container>
      <ng-template #bare>
        <span class="chip muted">{{ 'p2p.gun.bare' | translate }}</span>
      </ng-template>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .gun-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
    .chip {
      display: inline-flex; align-items: center; gap: 3px;
      padding: 2px 7px; font-size: 11px; font-weight: 600; line-height: 1.4;
      background: var(--surface-2); border: 1px solid var(--border); border-radius: 999px;
      color: var(--text);
    }
    .chip .mi { font-size: 13px; opacity: .8; }
    .chip.ammo { color: var(--amber); border-color: var(--amber); }
    .chip.muted { color: var(--muted); font-weight: 500; }
  `],
})
export class GunChipsComponent {
  @Input() gun: GunInfo | null = null;

  /** Non-null attachment slots in display order, each with an icon + resolved label. */
  get slots(): SlotChip[] {
    if (!this.gun) return [];
    const out: SlotChip[] = [];
    const push = (a: GunAttachment | null, icon: string) => {
      if (a) out.push({ icon, label: this.attachLabel(a) });
    };
    push(this.gun.sight, 'visibility');
    push(this.gun.tactical, 'flashlight_on');
    push(this.gun.grip, 'sports_handball');
    push(this.gun.barrel, 'straighten');
    push(this.gun.magazine, 'view_agenda');
    return out;
  }

  attachLabel(a: GunAttachment): string {
    return a.name ?? `#${a.id}`;
  }
}
