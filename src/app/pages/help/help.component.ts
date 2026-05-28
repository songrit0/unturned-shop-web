import { Component } from '@angular/core';

@Component({
  selector: 'app-help',
  template: `
    <div class="page">
      <div class="page-header">
        <h1><span class="h-icon"><span class="mi fill">help</span></span>{{ 'help.title' | translate }}</h1>
        <span class="h-sub">{{ 'help.subtitle' | translate }}</span>
      </div>

      <section class="card tactical mb-4">
        <div class="card-title"><span class="mi">rocket_launch</span>{{ 'help.firstUse' | translate }}</div>
        <div class="col gap-3">
          <div class="row gap-3" *ngFor="let s of steps">
            <div style="width:36px; height:36px; background:var(--accent); color:#18130a; border-radius:var(--radius); display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-weight:700; flex-shrink:0;">{{ s.n }}</div>
            <div>
              <div class="fw-6">{{ s.titleKey | translate }}</div>
              <div class="muted text-sm mt-1">{{ s.descKey | translate }}</div>
            </div>
          </div>
        </div>
      </section>

      <div class="grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:16px; margin-bottom: 16px;">
        <section class="card">
          <div class="card-title"><span class="mi">shopping_bag</span>{{ 'help.howToBuy' | translate }}</div>
          <ol class="col gap-2 text-sm" style="padding-left:18px;">
            <li>{{ 'help.buy1' | translate }}</li>
            <li>{{ 'help.buy2' | translate }}</li>
            <li>{{ 'help.buy3' | translate }}</li>
            <li>{{ 'help.buy4' | translate }}</li>
            <li>{{ 'help.buy5' | translate }}</li>
          </ol>
          <p class="muted text-xs mt-3">{{ 'help.buyForget' | translate }}</p>
        </section>

        <section class="card">
          <div class="card-title"><span class="mi" style="color:var(--emerald);">sell</span>{{ 'help.howToSell' | translate }}</div>
          <div class="col gap-3 text-sm">
            <div>
              <div class="fw-6">{{ 'help.sell1Title' | translate }}</div>
              <p class="muted mt-1">{{ 'help.sell1Desc' | translate }}</p>
            </div>
            <div>
              <div class="fw-6">{{ 'help.sell2Title' | translate }}</div>
              <p class="muted mt-1">{{ 'help.sell2Desc' | translate }}</p>
            </div>
            <div class="welcome-alert" style="margin:0; padding:12px;">
              <span class="mi" style="color:var(--accent-hi);">info</span>
              <span class="text-xs fw-6" style="color:var(--accent-hi);">{{ 'help.sellNote' | translate }}</span>
            </div>
          </div>
        </section>
      </div>

      <section class="card mb-4">
        <div class="card-title"><span class="mi fill">paid</span>{{ 'help.economy' | translate }}</div>
        <div class="grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
          <div>
            <h3 class="row gap-2 mb-2"><span class="mi" style="color:var(--emerald);">trending_up</span>{{ 'help.earnTitle' | translate }}</h3>
            <ul class="col gap-1 text-sm muted" style="padding-left:0; list-style:none;">
              <li *ngFor="let e of earns" class="row gap-2" style="align-items:flex-start;">
                <span class="mi sm" style="color:var(--emerald); flex-shrink:0; margin-top:2px;">{{ e.icon }}</span>
                <span>{{ e.key | translate }}</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 class="row gap-2 mb-2"><span class="mi" style="color:var(--rose);">trending_down</span>{{ 'help.loseTitle' | translate }}</h3>
            <ul class="col gap-1 text-sm muted" style="padding-left:0; list-style:none;">
              <li *ngFor="let l of loses" class="row gap-2" style="align-items:flex-start;">
                <span class="mi sm" style="color:var(--rose); flex-shrink:0; margin-top:2px;">{{ l.icon }}</span>
                <span>{{ l.key | translate }}</span>
              </li>
            </ul>
          </div>
        </div>
        <div class="welcome-alert mt-4" style="margin-bottom:0;">
          <span class="mi">calculate</span>
          <div>
            <div class="fw-6">{{ 'help.exampleTitle' | translate }}</div>
            <p class="muted text-sm mt-1">{{ 'help.exampleDesc' | translate }}</p>
          </div>
        </div>
      </section>

      <section class="card mb-4">
        <div class="card-title"><span class="mi">terminal</span>{{ 'help.commandsTitle' | translate }}</div>
        <div class="grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:8px;">
          <div *ngFor="let c of commands" style="background:var(--surface-2); border:1px solid var(--border); border-radius:var(--radius); padding:10px 12px;">
            <code class="mono fw-7" style="color:var(--accent);">{{ c.cmd }}</code>
            <p class="muted text-xs mt-1">{{ c.descKey | translate }}</p>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-title"><span class="mi">contact_support</span>{{ 'help.faqTitle' | translate }}</div>
        <div class="col gap-2">
          <details *ngFor="let f of faqs" class="group" style="border-bottom: 1px solid var(--border); padding: 8px 0;">
            <summary style="cursor:pointer; font-weight:600; display:flex; align-items:center; gap:6px; list-style:none;">
              <span class="mi sm">chevron_right</span>{{ f.q | translate }}
            </summary>
            <p class="muted text-sm mt-2" style="padding-left:24px;">{{ f.a | translate }}</p>
          </details>
        </div>
      </section>
    </div>
  `,
  styles: [`details[open] summary .mi { transform: rotate(90deg); transition: transform 0.15s; }`],
})
export class HelpComponent {
  steps = [
    { n: 1, titleKey: 'help.step1Title', descKey: 'help.step1Desc' },
    { n: 2, titleKey: 'help.step2Title', descKey: 'help.step2Desc' },
    { n: 3, titleKey: 'help.step3Title', descKey: 'help.step3Desc' },
  ];
  earns = [
    { icon: 'card_giftcard', key: 'help.earn1' },
    { icon: 'schedule', key: 'help.earn2' },
    { icon: 'coronavirus', key: 'help.earn3' },
    { icon: 'pets', key: 'help.earn4' },
    { icon: 'sports_martial_arts', key: 'help.earn5' },
    { icon: 'construction', key: 'help.earn6' },
    { icon: 'park', key: 'help.earn7' },
    { icon: 'sell', key: 'help.earn8' },
    { icon: 'payments', key: 'help.earn9' },
  ];
  loses = [
    { icon: 'shopping_cart', key: 'help.lose1' },
    { icon: 'percent', key: 'help.lose2' },
    { icon: 'account_balance', key: 'help.lose3' },
  ];
  commands = [
    { cmd: '/link <code>', descKey: 'help.cmdLinkDesc' },
    { cmd: '/code <code>', descKey: 'help.cmdCodeDesc' },
    { cmd: '/sell', descKey: 'help.cmdSellDesc' },
    { cmd: '/coins', descKey: 'help.cmdCoinsDesc' },
    // { cmd: '/itemid', descKey: 'help.cmdItemIdDesc' },
    // { cmd: '/decay', descKey: 'help.cmdDecayDesc' },
  ];
  faqs = [
    { q: 'help.faq1Q', a: 'help.faq1A' },
    { q: 'help.faq2Q', a: 'help.faq2A' },
    { q: 'help.faq3Q', a: 'help.faq3A' },
    { q: 'help.faq4Q', a: 'help.faq4A' },
    { q: 'help.faq5Q', a: 'help.faq5A' },
  ];
}
