import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminNotificationsService, NotifRow } from '../../services/admin-notifications.service';

// Standalone admin page: post an in-game notification (-> sv_notifications) that the GameMenu
// plugin shows as a top-right toast + on the phone lock screen. Also lists/deletes recent posts.
@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-3xl mx-auto p-4 sm:p-6 text-gray-900 dark:text-gray-100">
      <h1 class="text-2xl font-bold mb-1">In-game Notifications</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Posts a notification to every online player (top-right toast + phone lock screen).
      </p>

      <!-- compose -->
      <div class="bg-white/70 dark:bg-gray-800/70 border border-gray-300 dark:border-gray-700 rounded-xl p-4 sm:p-5 mb-8">
        <label class="block text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400 mb-1">TITLE</label>
        <input [(ngModel)]="title" maxlength="64" placeholder="e.g. Server event"
               class="w-full mb-4 px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:border-yellow-500 outline-none" />

        <label class="block text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400 mb-1">MESSAGE</label>
        <textarea [(ngModel)]="body" maxlength="255" rows="2" placeholder="e.g. Double coins for the next hour!"
                  class="w-full mb-4 px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:border-yellow-500 outline-none"></textarea>

        <label class="block text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400 mb-1">ACCENT</label>
        <div class="flex gap-2 mb-5">
          <button *ngFor="let a of accents" (click)="accent = a"
                  [class]="'px-3 py-1.5 rounded-lg text-sm font-semibold border ' +
                           (accent === a ? dot(a) + ' border-current' : 'text-gray-500 dark:text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-700')">
            {{ a }}
          </button>
        </div>

        <div class="flex items-center gap-3">
          <button (click)="post()" [disabled]="!title.trim() || !body.trim() || sending"
                  class="px-5 py-2 rounded-lg font-semibold bg-yellow-500 text-gray-900 disabled:opacity-50">
            {{ sending ? 'Sending…' : 'Send notification' }}
          </button>
          <span *ngIf="msg" class="text-sm" [class.text-green-500]="!err" [class.text-red-500]="err">{{ msg }}</span>
        </div>
      </div>

      <!-- recent -->
      <h2 class="text-sm font-semibold tracking-wide text-gray-500 dark:text-gray-400 mb-3">RECENT</h2>
      <div class="space-y-2">
        <div *ngFor="let n of items"
             class="flex items-start gap-3 bg-white/60 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-lg p-3">
          <span class="mt-1 w-2.5 h-2.5 rounded-full flex-none" [class]="dotBg(n.accent)"></span>
          <div class="flex-1 min-w-0">
            <div class="font-semibold">{{ n.title }}</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">{{ n.body }}</div>
            <div class="text-xs text-gray-400 dark:text-gray-600 mt-0.5">{{ n.created_at }}</div>
          </div>
          <button (click)="remove(n)" class="text-red-500 dark:text-red-400 text-sm hover:underline flex-none">Delete</button>
        </div>
        <div *ngIf="!items.length" class="text-sm text-gray-500">No notifications yet.</div>
      </div>
    </div>
  `,
})
export class AdminNotificationsComponent implements OnInit {
  title = '';
  body = '';
  accent = 'gold';
  accents = ['gold', 'green', 'blue', 'red'];
  items: NotifRow[] = [];
  sending = false;
  msg = '';
  err = false;

  constructor(private svc: AdminNotificationsService) {}

  ngOnInit() { this.load(); }

  load() {
    this.svc.list(1, 20).subscribe({ next: p => (this.items = p.items), error: () => {} });
  }

  post() {
    if (!this.title.trim() || !this.body.trim()) return;
    this.sending = true; this.msg = ''; this.err = false;
    this.svc.create(this.title.trim(), this.body.trim(), this.accent).subscribe({
      next: () => { this.sending = false; this.msg = 'Sent!'; this.title = ''; this.body = ''; this.load(); },
      error: e => { this.sending = false; this.err = true; this.msg = e?.error?.message || 'Failed to send'; },
    });
  }

  remove(n: NotifRow) {
    this.svc.remove(n.id).subscribe({ next: () => this.load(), error: () => {} });
  }

  dot(a: string) {
    return { gold: 'text-yellow-400', green: 'text-green-400', blue: 'text-blue-400', red: 'text-red-400' }[a] || 'text-yellow-400';
  }
  dotBg(a: string) {
    return { gold: 'bg-yellow-400', green: 'bg-green-400', blue: 'bg-blue-400', red: 'bg-red-400' }[a] || 'bg-yellow-400';
  }
}
