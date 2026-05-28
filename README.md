# 🛒 unturned-shop-web

Angular 17 frontend for meowpow — Discord login, shop, coins, admin.

> Phase 2 = skeleton + login flow + Firestore-driven API URL

## Quick start

```bash
npm install
npm start          # http://localhost:4200
```

## Setup checklist

1. **Firebase web config** (`src/environments/environment*.ts`)
   - Firebase Console → Project settings → General → **Your apps** → Web app → copy the `firebaseConfig` object into both `environment.ts` and `environment.development.ts`
   - The frontend reads `config/apiUrl` from Firestore on bootstrap to know which backend URL to use
2. **Fallback API URL** for local dev (`environment.development.ts`)
   - `apiUrlFallback: 'http://localhost:3000'` — used when Firestore can't be reached
3. **Firebase project** for `.firebaserc`
   - `firebase use --add` → ใส่ project id ลงไป
   - หรือแก้ `default` ใน `.firebaserc`

## CI/CD

- Push to `main` → `.github/workflows/deploy.yml` build + deploy ขึ้น Firebase Hosting
- ต้องตั้ง GitHub secrets:
  - `FIREBASE_SERVICE_ACCOUNT` — JSON ของ Firebase service account (paste ทั้งก้อน)
  - `FIREBASE_PROJECT_ID` — project id

## Routes (Phase 2)

| Path | Auth | Notes |
|---|---|---|
| `/login` | – | ปุ่ม Discord login (เด้งไป `${API}/auth/discord`) |
| `/auth/callback` | – | รับ `?token=` จาก backend → เก็บ localStorage → ไปหน้า home |
| `/` | JWT | หน้า home แสดงโปรไฟล์ + สถานะ link Steam |

## Test the full login

1. รัน `unturned-shop-api` (Phase 1) — แสดง ngrok URL + เขียนลง Firestore
2. รัน `npm start` ที่ project นี้
3. เปิด `http://localhost:4200` → กดปุ่ม Discord
4. หลัง callback กลับมา → เห็นโปรไฟล์ + sticker "Admin" ถ้า discord_id อยู่ใน `ADMIN_DISCORD_IDS` ของ backend

## โครงสร้าง

```
src/
├── index.html, main.ts, styles.scss
├── environments/             # firebase config + fallback API URL
└── app/
    ├── app.module.ts         # APP_INITIALIZER → ApiUrlService.load()
    ├── app-routing.module.ts
    ├── app.component.ts
    ├── components/header/    # global topbar
    ├── pages/
    │   ├── login/            # Discord login button
    │   ├── auth-callback/    # parses ?token=
    │   └── home/             # profile + steam link status
    ├── services/
    │   ├── api-url.service.ts    # reads Firestore config/apiUrl
    │   ├── auth.service.ts       # JWT storage + /auth/me
    │   └── auth.interceptor.ts   # attaches Bearer token
    └── guards/auth.guard.ts      # protect /
```

## Phase ต่อไป

3. ดู shop + bills + coin balance + history (read-only)
4. ตะกร้า + checkout + welcome pack flow
5. หน้า admin (market manage / coin / log)
