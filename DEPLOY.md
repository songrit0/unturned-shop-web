# 🚀 Deploy to Firebase Hosting

ขั้นตอนตั้งค่า GitHub Actions auto-deploy

## 1. Firebase project setup

1. ไป https://console.firebase.google.com → เลือก project (ตัวเดียวกับที่บอท/API ใช้)
2. ซ้ายมือ → **Hosting** → กด **Get Started** ถ้ายังไม่เคยทำ
3. ทำตาม wizard (กด Next ตลอด — ยังไม่ต้อง deploy ผ่าน CLI)

## 2. ลง project id ลงไฟล์

แก้ `.firebaserc`:
```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

## 3. สร้าง service account สำหรับ CI

1. Firebase Console → ⚙️ **Project settings** → tab **Service accounts**
2. หา section **Firebase Admin SDK** (ภาษา: Node.js)
3. กด **Generate new private key** → จะ download ไฟล์ JSON มา
4. **เก็บไฟล์ไว้ปลอดภัย** — อย่า commit ลง git

## 4. ตั้ง GitHub secrets

ไป repo settings → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret name | ค่า |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | paste **ทั้งก้อน JSON** จาก step 3 (รวม `{ ... }`) |
| `FIREBASE_PROJECT_ID` | project id (เช่น `unturned-shop-1234`) |

## 5. Push → auto-deploy

```bash
git push origin main
```

ไป **Actions tab** ใน GitHub → ดู workflow รัน → เมื่อ ✅ ผ่านจะได้ URL:
```
https://<project-id>.web.app
https://<project-id>.firebaseapp.com
```

## 6. ตั้ง Firestore (ครั้งเดียว)

ให้ backend (`unturned-shop-api`) เขียน `config/apiUrl` ได้ — frontend อ่าน

1. Firebase Console → **Firestore Database** → **Create database**
2. Region: `asia-southeast1` (Singapore) — ใกล้ที่สุด
3. Mode: Production
4. Rules: ปล่อย public read ของ `config/apiUrl` (frontend อ่านไม่ต้อง auth):

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /config/{doc} {
      allow read: if true;
      allow write: if false;   // only admin SDK from backend can write
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## 7. กรอก Firebase config ใน frontend env

`src/environments/environment.ts` และ `environment.development.ts`:

```ts
firebase: {
  apiKey: '...',
  authDomain: 'YOUR-PROJECT.firebaseapp.com',
  projectId: 'YOUR-PROJECT',
  storageBucket: 'YOUR-PROJECT.appspot.com',
  messagingSenderId: '...',
  appId: '...',
},
```

(ค่าหาได้จาก Firebase Console → ⚙️ Project settings → General → "Your apps" → Web app config)

## 8. ตั้ง backend ให้เขียน Firestore

`unturned-shop-api/secrets/firebase-admin.json` ← ก๊อปไฟล์เดียวกับที่ใช้ใน step 3

หลัง backend start: ดู log
```
[FirebaseService] Firebase initialized (project: your-project-id)
[NgrokService] Published API URL to Firestore config/apiUrl: https://....ngrok-free.dev
```

แล้ว frontend ที่ deploy ขึ้น Firebase จะรู้ ngrok URL อัตโนมัติ ไม่ต้อง hardcode

## ตรวจสอบหลัง deploy

1. เปิด `https://<project-id>.web.app` → ควรขึ้นหน้า login
2. กด Sign in → ถูก redirect ไป ngrok backend → Discord login → กลับมาเว็บ
3. Header แสดง avatar + coin balance
4. ปุ่ม 🌙/☀️ toggle dark mode
5. ปุ่ม 🇹🇭/🇺🇸 toggle ภาษา (Header เป็น i18n; หน้าอื่นค่อยๆ ทยอยทำ)
