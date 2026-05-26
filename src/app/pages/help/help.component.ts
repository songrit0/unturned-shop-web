import { Component } from '@angular/core';

@Component({
  selector: 'app-help',
  template: `
    <div class="max-w-4xl mx-auto p-4 space-y-6">
      <header>
        <h1 class="text-3xl font-bold flex items-center gap-2">
          <span class="mi lg text-brand-500">help</span> {{ 'help.title' | translate }}
        </h1>
        <p class="text-slate-500 mt-1">{{ 'help.subtitle' | translate }}</p>
      </header>

      <section class="bg-white dark:bg-slate-800 rounded-2xl shadow p-5">
        <h2 class="font-semibold text-lg flex items-center gap-2 mb-3">
          <span class="mi text-emerald-500">rocket_launch</span> {{ 'help.firstUse' | translate }}
        </h2>
        <ol class="space-y-3 text-sm">
          <li class="flex gap-3">
            <span class="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold shrink-0">1</span>
            <div>
              <p class="font-medium">{{ 'help.step1Title' | translate }}</p>
              <p class="text-slate-500">{{ 'help.step1Desc' | translate }}</p>
            </div>
          </li>
          <li class="flex gap-3">
            <span class="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold shrink-0">2</span>
            <div>
              <p class="font-medium">{{ 'help.step2Title' | translate }}</p>
              <p class="text-slate-500">{{ 'help.step2Desc' | translate }}</p>
            </div>
          </li>
          <li class="flex gap-3">
            <span class="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold shrink-0">3</span>
            <div>
              <p class="font-medium">{{ 'help.step3Title' | translate }}</p>
              <p class="text-slate-500">{{ 'help.step3Desc' | translate }}</p>
            </div>
          </li>
        </ol>
      </section>

      <section class="bg-white dark:bg-slate-800 rounded-2xl shadow p-5">
        <h2 class="font-semibold text-lg flex items-center gap-2 mb-3">
          <span class="mi text-brand-500">shopping_bag</span> {{ 'help.howToBuy' | translate }}
        </h2>
        <div class="text-sm space-y-2">
          <p>1. {{ 'help.buy1' | translate }}</p>
          <p>2. {{ 'help.buy2' | translate }}</p>
          <p>3. {{ 'help.buy3' | translate }}</p>
          <p>4. {{ 'help.buy4' | translate }}</p>
          <p>5. {{ 'help.buy5' | translate }}</p>
          <p class="text-xs text-slate-500">{{ 'help.buyForget' | translate }}</p>
        </div>
      </section>

      <section class="bg-white dark:bg-slate-800 rounded-2xl shadow p-5">
        <h2 class="font-semibold text-lg flex items-center gap-2 mb-3">
          <span class="mi text-emerald-500">sell</span> {{ 'help.howToSell' | translate }}
        </h2>
        <div class="text-sm space-y-3">
          <div>
            <p class="font-medium">{{ 'help.sell1Title' | translate }}</p>
            <p class="text-slate-500 mt-1">{{ 'help.sell1Desc' | translate }}</p>
          </div>
          <div>
            <p class="font-medium">{{ 'help.sell2Title' | translate }}</p>
            <p class="text-slate-500 mt-1">{{ 'help.sell2Desc' | translate }}</p>
          </div>
          <div class="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p class="text-amber-700 dark:text-amber-300 text-xs font-medium flex items-center gap-1">
              <span class="mi">info</span> {{ 'help.sellNote' | translate }}
            </p>
          </div>
        </div>
      </section>

      <section class="bg-white dark:bg-slate-800 rounded-2xl shadow p-5">
        <h2 class="font-semibold text-lg flex items-center gap-2 mb-3">
          <span class="mi text-amber-500">payments</span> {{ 'help.economy' | translate }}
        </h2>

        <div class="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 class="font-medium mb-2 flex items-center gap-1">
              <span class="mi text-emerald-500">trending_up</span> {{ 'help.earnTitle' | translate }}
            </h3>
            <ul class="space-y-1 text-slate-600 dark:text-slate-300">
              <li>{{ 'help.earn1' | translate }}</li>
              <li>{{ 'help.earn2' | translate }}</li>
              <li>{{ 'help.earn3' | translate }}</li>
              <li>{{ 'help.earn4' | translate }}</li>
              <li>{{ 'help.earn5' | translate }}</li>
              <li>{{ 'help.earn6' | translate }}</li>
              <li>{{ 'help.earn7' | translate }}</li>
              <li>{{ 'help.earn8' | translate }}</li>
              <li>{{ 'help.earn9' | translate }}</li>
            </ul>
          </div>

          <div>
            <h3 class="font-medium mb-2 flex items-center gap-1">
              <span class="mi text-rose-500">trending_down</span> {{ 'help.loseTitle' | translate }}
            </h3>
            <ul class="space-y-1 text-slate-600 dark:text-slate-300">
              <li>{{ 'help.lose1' | translate }}</li>
              <li>{{ 'help.lose2' | translate }}</li>
              <li>{{ 'help.lose3' | translate }}</li>
            </ul>
          </div>
        </div>

        <div class="mt-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-xs text-slate-600 dark:text-slate-300">
          <p class="font-medium mb-1">{{ 'help.exampleTitle' | translate }}</p>
          <p>{{ 'help.exampleDesc' | translate }}</p>
        </div>
      </section>

      <section class="bg-white dark:bg-slate-800 rounded-2xl shadow p-5">
        <h2 class="font-semibold text-lg flex items-center gap-2 mb-3">
          <span class="mi text-emerald-500">payments</span> {{ 'help.billsTitle' | translate }}
        </h2>
        <div class="text-sm space-y-2">
          <p>{{ 'help.billsDesc' | translate }}</p>
          <ul class="space-y-1 text-slate-600 dark:text-slate-300">
            <li>{{ 'help.billsList' | translate }}</li>
          </ul>
          <p class="text-xs text-slate-500">{{ 'help.billsNote' | translate }}</p>
        </div>
      </section>

      <section class="bg-white dark:bg-slate-800 rounded-2xl shadow p-5">
        <h2 class="font-semibold text-lg flex items-center gap-2 mb-3">
          <span class="mi text-slate-500">terminal</span> {{ 'help.commandsTitle' | translate }}
        </h2>
        <div class="grid sm:grid-cols-2 gap-2 text-sm font-mono">
          <div class="bg-slate-50 dark:bg-slate-700 rounded p-2">
            <code class="text-brand-600">/link &lt;code&gt;</code>
            <p class="text-xs text-slate-500 font-sans mt-1">{{ 'help.cmdLinkDesc' | translate }}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-700 rounded p-2">
            <code class="text-brand-600">/code &lt;code&gt;</code>
            <p class="text-xs text-slate-500 font-sans mt-1">{{ 'help.cmdCodeDesc' | translate }}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-700 rounded p-2">
            <code class="text-brand-600">/sell</code>
            <p class="text-xs text-slate-500 font-sans mt-1">{{ 'help.cmdSellDesc' | translate }}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-700 rounded p-2">
            <code class="text-brand-600">/coins</code>
            <p class="text-xs text-slate-500 font-sans mt-1">{{ 'help.cmdCoinsDesc' | translate }}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-700 rounded p-2">
            <code class="text-brand-600">/itemid</code>
            <p class="text-xs text-slate-500 font-sans mt-1">{{ 'help.cmdItemIdDesc' | translate }}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-700 rounded p-2">
            <code class="text-brand-600">/decay</code>
            <p class="text-xs text-slate-500 font-sans mt-1">{{ 'help.cmdDecayDesc' | translate }}</p>
          </div>
        </div>
      </section>

      <section class="bg-white dark:bg-slate-800 rounded-2xl shadow p-5">
        <h2 class="font-semibold text-lg flex items-center gap-2 mb-3">
          <span class="mi text-violet-500">contact_support</span> {{ 'help.faqTitle' | translate }}
        </h2>
        <div class="space-y-3 text-sm">
          <details class="group">
            <summary class="cursor-pointer font-medium flex items-center gap-1">
              <span class="mi group-open:rotate-90 transition">chevron_right</span>
              {{ 'help.faq1Q' | translate }}
            </summary>
            <p class="text-slate-500 mt-2 pl-6">{{ 'help.faq1A' | translate }}</p>
          </details>
          <details class="group">
            <summary class="cursor-pointer font-medium flex items-center gap-1">
              <span class="mi group-open:rotate-90 transition">chevron_right</span>
              {{ 'help.faq2Q' | translate }}
            </summary>
            <p class="text-slate-500 mt-2 pl-6">{{ 'help.faq2A' | translate }}</p>
          </details>
          <details class="group">
            <summary class="cursor-pointer font-medium flex items-center gap-1">
              <span class="mi group-open:rotate-90 transition">chevron_right</span>
              {{ 'help.faq3Q' | translate }}
            </summary>
            <p class="text-slate-500 mt-2 pl-6">{{ 'help.faq3A' | translate }}</p>
          </details>
          <details class="group">
            <summary class="cursor-pointer font-medium flex items-center gap-1">
              <span class="mi group-open:rotate-90 transition">chevron_right</span>
              {{ 'help.faq4Q' | translate }}
            </summary>
            <p class="text-slate-500 mt-2 pl-6">{{ 'help.faq4A' | translate }}</p>
          </details>
          <details class="group">
            <summary class="cursor-pointer font-medium flex items-center gap-1">
              <span class="mi group-open:rotate-90 transition">chevron_right</span>
              {{ 'help.faq5Q' | translate }}
            </summary>
            <p class="text-slate-500 mt-2 pl-6">{{ 'help.faq5A' | translate }}</p>
          </details>
        </div>
      </section>
    </div>
  `,
})
export class HelpComponent {}
