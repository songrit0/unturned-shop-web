import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminHelpService, HelpTopic, HelpInput } from '../../services/admin-help.service';

// Standalone admin page: manage the in-game HELP topics (-> sv_help_topics). The GameMenu phone
// shows each as a popup "page" (HELP app). Add / edit / delete / enable here.
@Component({
  selector: 'app-admin-help',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-3xl mx-auto p-4 sm:p-6 text-gray-900 dark:text-gray-100">
      <h1 class="text-2xl font-bold mb-1">In-game Help / Command Guide</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Each topic shows in the GameMenu phone's <b>HELP</b> app as a popup page. Use blank lines in the
        body for paragraphs.
      </p>

      <!-- editor -->
      <div class="bg-white/70 dark:bg-gray-800/70 border border-gray-300 dark:border-gray-700 rounded-xl p-4 sm:p-5 mb-8">
        <div class="font-semibold mb-3">{{ editingId ? 'Edit topic #' + editingId : 'New topic' }}</div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div class="sm:col-span-2">
            <label class="block text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400 mb-1">TITLE</label>
            <input [(ngModel)]="form.title" maxlength="128" placeholder="e.g. How to sell items"
                   class="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:border-yellow-500 outline-none" />
          </div>
          <div>
            <label class="block text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400 mb-1">CATEGORY</label>
            <input [(ngModel)]="form.category" maxlength="64" placeholder="e.g. Commands"
                   class="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:border-yellow-500 outline-none" />
          </div>
        </div>

        <label class="block text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400 mb-1">BODY</label>
        <textarea [(ngModel)]="form.body" rows="6" placeholder="Explain the system / command here…"
                  class="w-full mb-3 px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:border-yellow-500 outline-none font-mono text-sm"></textarea>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 items-end">
          <div>
            <label class="block text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400 mb-1">ICON (1 char)</label>
            <input [(ngModel)]="form.icon" maxlength="4" placeholder="?"
                   class="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:border-yellow-500 outline-none text-center" />
          </div>
          <div>
            <label class="block text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400 mb-1">ORDER</label>
            <input type="number" [(ngModel)]="form.sort_order" step="1"
                   class="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:border-yellow-500 outline-none" />
          </div>
          <label class="flex items-center gap-2 text-sm select-none cursor-pointer">
            <input type="checkbox" [(ngModel)]="form.enabled" class="w-4 h-4 accent-yellow-500" />
            Enabled
          </label>
        </div>

        <div class="flex items-center gap-3">
          <button (click)="save()" [disabled]="!form.title.trim() || !form.body.trim() || saving"
                  class="px-5 py-2 rounded-lg font-semibold bg-yellow-500 text-gray-900 disabled:opacity-50">
            {{ saving ? 'Saving…' : (editingId ? 'Update topic' : 'Add topic') }}
          </button>
          <button *ngIf="editingId" (click)="cancelEdit()"
                  class="px-4 py-2 rounded-lg font-semibold border border-gray-400 dark:border-gray-600 text-gray-600 dark:text-gray-300">Cancel</button>
          <span *ngIf="msg" class="text-sm" [class.text-green-500]="!err" [class.text-red-500]="err">{{ msg }}</span>
        </div>
      </div>

      <!-- list -->
      <h2 class="text-sm font-semibold tracking-wide text-gray-500 dark:text-gray-400 mb-3">TOPICS</h2>
      <div class="space-y-2">
        <div *ngFor="let t of items"
             class="flex items-start gap-3 bg-white/60 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-lg p-3"
             [class.opacity-50]="!t.enabled">
          <span class="mt-0.5 w-7 h-7 flex-none rounded-lg bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 grid place-items-center text-yellow-600 dark:text-yellow-400 font-bold">{{ t.icon || '?' }}</span>
          <div class="flex-1 min-w-0">
            <div class="font-semibold">{{ t.title }}
              <span *ngIf="t.category" class="ml-2 text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{{ t.category }}</span>
              <span *ngIf="!t.enabled" class="ml-2 text-xs text-red-400">(hidden)</span>
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400 truncate">{{ t.body }}</div>
            <div class="text-xs text-gray-400 dark:text-gray-600 mt-0.5">order {{ t.sort_order }}</div>
          </div>
          <button (click)="edit(t)" class="text-yellow-600 dark:text-yellow-400 text-sm hover:underline flex-none">Edit</button>
          <button (click)="remove(t)" class="text-red-500 dark:text-red-400 text-sm hover:underline flex-none">Delete</button>
        </div>
        <div *ngIf="!items.length" class="text-sm text-gray-500">No topics yet — add one above.</div>
      </div>
    </div>
  `,
})
export class AdminHelpComponent implements OnInit {
  items: HelpTopic[] = [];
  editingId: number | null = null;
  form: HelpInput = this.blank();
  saving = false;
  msg = '';
  err = false;

  constructor(private svc: AdminHelpService) {}

  ngOnInit() { this.load(); }

  private blank(): HelpInput {
    return { title: '', body: '', category: '', icon: '', sort_order: 0, enabled: true };
  }

  load() {
    this.svc.list().subscribe({ next: (rows) => (this.items = rows), error: () => {} });
  }

  edit(t: HelpTopic) {
    this.editingId = t.id;
    this.form = { title: t.title, body: t.body, category: t.category || '', icon: t.icon || '', sort_order: t.sort_order, enabled: t.enabled };
    this.msg = '';
  }

  cancelEdit() {
    this.editingId = null;
    this.form = this.blank();
    this.msg = '';
  }

  save() {
    if (!this.form.title.trim() || !this.form.body.trim()) return;
    this.saving = true; this.msg = ''; this.err = false;
    const done = (verb: string) => {
      this.saving = false; this.msg = verb; this.cancelEdit(); this.load();
    };
    const fail = (e: any) => { this.saving = false; this.err = true; this.msg = e?.error?.message || 'Failed'; };
    if (this.editingId) {
      this.svc.update(this.editingId, this.form).subscribe({ next: () => done('Updated!'), error: fail });
    } else {
      this.svc.create(this.form).subscribe({ next: () => done('Added!'), error: fail });
    }
  }

  remove(t: HelpTopic) {
    this.svc.remove(t.id).subscribe({ next: () => this.load(), error: () => {} });
  }
}
