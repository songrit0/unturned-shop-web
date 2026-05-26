import { Component } from '@angular/core';

@Component({
  selector: 'app-help',
  template: `
    <div class="max-w-4xl mx-auto p-4 space-y-6">
      <header>
        <h1 class="text-3xl font-bold flex items-center gap-2">
          <span class="mi lg text-brand-500">help</span> วิธีใช้งานระบบ
        </h1>
        <p class="text-slate-500 mt-1">เว็บนี้ทำงานคู่กับ Discord bot + ปลั๊กอินในเกม Unturned</p>
      </header>

      <!-- Quick flow -->
      <section class="bg-white dark:bg-slate-800 rounded-2xl shadow p-5">
        <h2 class="font-semibold text-lg flex items-center gap-2 mb-3">
          <span class="mi text-emerald-500">rocket_launch</span> เริ่มใช้งานครั้งแรก
        </h2>
        <ol class="space-y-3 text-sm">
          <li class="flex gap-3">
            <span class="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold shrink-0">1</span>
            <div>
              <p class="font-medium">เข้าสู่ระบบด้วย Discord</p>
              <p class="text-slate-500">กดปุ่ม "เข้าสู่ระบบด้วย Discord" ที่หน้า login</p>
            </div>
          </li>
          <li class="flex gap-3">
            <span class="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold shrink-0">2</span>
            <div>
              <p class="font-medium">ผูกบัญชี Steam (รับ Welcome Pack)</p>
              <p class="text-slate-500">หน้าแรก → กล่อง <span class="text-amber-600">Welcome Pack</span> → สร้าง code → เข้าเกม → พิมพ์
                <code class="bg-slate-100 dark:bg-slate-700 px-1 rounded">/link &lt;code&gt;</code>
                → ผูกบัญชี + รับของแถม + 100 Coin
              </p>
            </div>
          </li>
          <li class="flex gap-3">
            <span class="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold shrink-0">3</span>
            <div>
              <p class="font-medium">ซื้อของ / ขายของ / ดูยอด</p>
              <p class="text-slate-500">ใช้เมนูด้านบน</p>
            </div>
          </li>
        </ol>
      </section>

      <!-- How to buy -->
      <section class="bg-white dark:bg-slate-800 rounded-2xl shadow p-5">
        <h2 class="font-semibold text-lg flex items-center gap-2 mb-3">
          <span class="mi text-brand-500">shopping_bag</span> วิธีซื้อของ
        </h2>
        <div class="text-sm space-y-2">
          <p>1. เปิดหน้า <a routerLink="/shop" class="text-brand-600 hover:underline">Shop</a> หรือ
             <a routerLink="/bills" class="text-brand-600 hover:underline">Bills</a></p>
          <p>2. กด <span class="inline-flex items-center gap-1 bg-brand-500 text-white px-2 py-0.5 rounded text-xs"><span class="mi">add_shopping_cart</span> ใส่</span> ที่ของแต่ละชิ้น</p>
          <p>3. กดไอคอน <span class="mi">shopping_cart</span> มุมขวาบน → ดูตะกร้า → ปรับจำนวน → <strong>ยืนยันการสั่งซื้อ</strong></p>
          <p>4. ระบบหัก Coin → ได้ <strong>redeem code</strong></p>
          <p>5. เข้าเกม → พิมพ์ <code class="bg-slate-100 dark:bg-slate-700 px-1 rounded">/code &lt;code&gt;</code> → รับของในเกม</p>
          <p class="text-xs text-slate-500">ลืมโค้ด? ดูใน <a routerLink="/codes" class="text-brand-600 hover:underline">ประวัติโค้ด</a></p>
        </div>
      </section>

      <!-- How to sell -->
      <section class="bg-white dark:bg-slate-800 rounded-2xl shadow p-5">
        <h2 class="font-semibold text-lg flex items-center gap-2 mb-3">
          <span class="mi text-emerald-500">sell</span> วิธีขายของ
        </h2>
        <div class="text-sm space-y-3">
          <div>
            <p class="font-medium">วิธีที่ 1: <code class="bg-slate-100 dark:bg-slate-700 px-1 rounded">/sell</code> ใน Safe Zone (แนะนำ)</p>
            <p class="text-slate-500 mt-1">เข้าไปใน Safe Zone → พิมพ์ <code class="bg-slate-100 dark:bg-slate-700 px-1 rounded">/sell</code> → กล่องเปิด → วางของลง → ปิดกล่อง → ได้ Coin</p>
          </div>
          <div>
            <p class="font-medium">วิธีที่ 2: กล่อง Sell Box ที่แอดมินตั้งไว้</p>
            <p class="text-slate-500 mt-1">เดินไปที่กล่อง → เปิด → วางของ → ปิด → ได้ Coin</p>
          </div>
          <div class="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p class="text-amber-700 dark:text-amber-300 text-xs font-medium flex items-center gap-1">
              <span class="mi">info</span> ของที่อยู่ใน <a routerLink="/shop" class="underline">Shop</a> เท่านั้นที่ขายได้ — ของอื่นจะถูกคืน
            </p>
          </div>
        </div>
      </section>

      <!-- Economy -->
      <section class="bg-white dark:bg-slate-800 rounded-2xl shadow p-5">
        <h2 class="font-semibold text-lg flex items-center gap-2 mb-3">
          <span class="mi text-amber-500">payments</span> ระบบเศรษฐกิจ
        </h2>

        <div class="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 class="font-medium mb-2 flex items-center gap-1">
              <span class="mi text-emerald-500">trending_up</span> ทาง <strong>ได้</strong> Coin
            </h3>
            <ul class="space-y-1 text-slate-600 dark:text-slate-300">
              <li>🎁 Welcome Pack <span class="text-xs text-slate-400">(ครั้งเดียว)</span></li>
              <li>⏱ ออนไลน์ในเกม +10/5 นาที <span class="text-xs text-slate-400">(ต้องไม่ AFK + ยังเป็น)</span></li>
              <li>🧟 ฆ่า zombie +1, Mega +5</li>
              <li>🦌 ฆ่าสัตว์ +2</li>
              <li>⚔️ ฆ่าผู้เล่น (PvP) +5 <span class="text-xs text-slate-400">(cooldown 120s ต่อเหยื่อ)</span></li>
              <li>🔨 สร้าง barricade/structure +2</li>
              <li>🌳 เก็บทรัพยากร +1</li>
              <li>💰 ขายของในตลาด (60% ของราคา)</li>
              <li>💵 ขาย Bills (100% เต็มราคา ไม่หัก)</li>
            </ul>
          </div>

          <div>
            <h3 class="font-medium mb-2 flex items-center gap-1">
              <span class="mi text-rose-500">trending_down</span> ทาง <strong>เสีย</strong> Coin
            </h3>
            <ul class="space-y-1 text-slate-600 dark:text-slate-300">
              <li>🛒 ซื้อของจากร้าน (เต็มราคา)</li>
              <li>📉 Commission 40% เมื่อขาย <span class="text-xs text-slate-400">(ราคาขาย = ราคา × 0.6)</span></li>
              <li>🏛 Wealth Tax 2% ทุกวัน 03:00 <span class="text-xs text-slate-400">(เฉพาะคนที่มี > 10,000)</span></li>
            </ul>
          </div>
        </div>

        <div class="mt-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-xs text-slate-600 dark:text-slate-300">
          <p class="font-medium mb-1">📐 ตัวอย่างคำนวณ:</p>
          <p>Sentinel ราคา 50 → ซื้อ 1 ชิ้น = <strong>−50 coin</strong>, ขายคืน 1 ชิ้น = <strong>+30 coin</strong> (50 × 60%)</p>
        </div>
      </section>

      <!-- Bills -->
      <section class="bg-white dark:bg-slate-800 rounded-2xl shadow p-5">
        <h2 class="font-semibold text-lg flex items-center gap-2 mb-3">
          <span class="mi text-emerald-500">payments</span> Bills (ธนบัตร)
        </h2>
        <div class="text-sm space-y-2">
          <p>ธนบัตรเหมือน Cash item — ขายได้ <strong>เต็มราคา</strong> ไม่หัก commission</p>
          <ul class="space-y-1 text-slate-600 dark:text-slate-300">
            <li>$5 Bill, $10, $50, $100, $500</li>
          </ul>
          <p class="text-xs text-slate-500">ใช้สำหรับโอนเงินระหว่างผู้เล่น — drop ในเกม → คนเก็บไปขายได้เต็ม</p>
        </div>
      </section>

      <!-- Commands -->
      <section class="bg-white dark:bg-slate-800 rounded-2xl shadow p-5">
        <h2 class="font-semibold text-lg flex items-center gap-2 mb-3">
          <span class="mi text-slate-500">terminal</span> คำสั่งในเกม
        </h2>
        <div class="grid sm:grid-cols-2 gap-2 text-sm font-mono">
          <div class="bg-slate-50 dark:bg-slate-700 rounded p-2">
            <code class="text-brand-600">/link &lt;code&gt;</code>
            <p class="text-xs text-slate-500 font-sans mt-1">ผูกบัญชี Discord + รับ Welcome Pack</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-700 rounded p-2">
            <code class="text-brand-600">/code &lt;code&gt;</code>
            <p class="text-xs text-slate-500 font-sans mt-1">ใช้โค้ดจากเว็บรับของ</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-700 rounded p-2">
            <code class="text-brand-600">/sell</code>
            <p class="text-xs text-slate-500 font-sans mt-1">เปิดกล่องขาย (Safe Zone เท่านั้น)</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-700 rounded p-2">
            <code class="text-brand-600">/coins</code>
            <p class="text-xs text-slate-500 font-sans mt-1">เช็คยอด Coin</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-700 rounded p-2">
            <code class="text-brand-600">/itemid</code>
            <p class="text-xs text-slate-500 font-sans mt-1">ดู item id ของไอเทมที่ถืออยู่</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-700 rounded p-2">
            <code class="text-brand-600">/decay</code>
            <p class="text-xs text-slate-500 font-sans mt-1">เช็คการป้องกันฐาน (ToolCupboard)</p>
          </div>
        </div>
      </section>

      <!-- FAQ -->
      <section class="bg-white dark:bg-slate-800 rounded-2xl shadow p-5">
        <h2 class="font-semibold text-lg flex items-center gap-2 mb-3">
          <span class="mi text-violet-500">contact_support</span> คำถามที่พบบ่อย
        </h2>
        <div class="space-y-3 text-sm">
          <details class="group">
            <summary class="cursor-pointer font-medium flex items-center gap-1">
              <span class="mi group-open:rotate-90 transition">chevron_right</span>
              ลืม code ที่ซื้อ ทำยังไง?
            </summary>
            <p class="text-slate-500 mt-2 pl-6">เข้า <a routerLink="/codes" class="text-brand-600 hover:underline">ประวัติโค้ด</a> — โค้ดทั้งหมดที่เคยซื้อจะอยู่ที่นี่ พร้อมสถานะ (พร้อมใช้ / ใช้แล้ว / หมดอายุ)</p>
          </details>
          <details class="group">
            <summary class="cursor-pointer font-medium flex items-center gap-1">
              <span class="mi group-open:rotate-90 transition">chevron_right</span>
              ทำไมขายแล้วได้ Coin น้อยกว่าราคา?
            </summary>
            <p class="text-slate-500 mt-2 pl-6">ระบบหัก commission 40% เพื่อความสมดุลของเศรษฐกิจ — ราคาขาย = ราคาตลาด × 0.6 ยกเว้น Bills ที่ได้เต็มราคา</p>
          </details>
          <details class="group">
            <summary class="cursor-pointer font-medium flex items-center gap-1">
              <span class="mi group-open:rotate-90 transition">chevron_right</span>
              AFK แล้วได้ Coin ไหม?
            </summary>
            <p class="text-slate-500 mt-2 pl-6">ไม่ได้ — ระบบเช็คการขยับ ถ้าไม่ขยับเกิน 10 นาทีถือเป็น AFK และตายอยู่ในเกมก็ไม่นับ</p>
          </details>
          <details class="group">
            <summary class="cursor-pointer font-medium flex items-center gap-1">
              <span class="mi group-open:rotate-90 transition">chevron_right</span>
              Wealth Tax คืออะไร?
            </summary>
            <p class="text-slate-500 mt-2 pl-6">ภาษีทรัพย์สิน — หัก 2% ของยอดทุกวัน 03:00 เฉพาะคนที่มี Coin > 10,000 — เพื่อรักษาสมดุลเศรษฐกิจไม่ให้คน hoard นาน</p>
          </details>
          <details class="group">
            <summary class="cursor-pointer font-medium flex items-center gap-1">
              <span class="mi group-open:rotate-90 transition">chevron_right</span>
              สต๊อกของในร้านหมดทำยังไง?
            </summary>
            <p class="text-slate-500 mt-2 pl-6">ของจะกลับมามีเมื่อมีคนนำมาขายใส่กล่อง /sell — ระบบ supply-demand แท้ๆ</p>
          </details>
        </div>
      </section>
    </div>
  `,
})
export class HelpComponent {}
