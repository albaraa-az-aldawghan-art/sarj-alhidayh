# خطوات تشغيل مشروع سرج الهداية

## 1. إنشاء مشروع Firebase

1. اذهب إلى: https://console.firebase.google.com
2. سجّل دخولك بالإيميل: mshrf123789@gmail.com
3. اضغط "Add project" وسمّه: `sarj-alhidaya`
4. بعد الإنشاء، اضغط على "Firestore Database" → "Create database" → اختر "Start in test mode"
5. اختر أي موقع (يُنصح بـ `europe-west3` أو `us-east1`)
6. ثم اذهب إلى "Project settings" (أيقونة الترس) ← "Your apps" ← اضغط `</>`
7. اكتب أي اسم للتطبيق مثل "sarj-web" واضغط "Register"
8. انسخ الـ config الذي يظهر

## 2. إعداد ملف البيئة

انسخ الملف `.env.local.example` وسمّه `.env.local`، ثم ضع البيانات من Firebase:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=sarj-alhidaya.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sarj-alhidaya
VITE_FIREBASE_STORAGE_BUCKET=sarj-alhidaya.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

## 3. تشغيل المشروع محلياً

```bash
npm run dev
```

ثم افتح المتصفح على: http://localhost:3000

## 4. أول استخدام

- اختر "مشرف" من الصفحة الرئيسية
- أدخل الكود: `2001`
- سيتم إنشاء حساب المشرف الأول (علي) تلقائياً

## 5. رفع الموقع على Firebase Hosting

```bash
npm run build
npm install -g firebase-tools
firebase login
firebase deploy
```

## ملاحظات مهمة

- **المشرف الأول**: علي - الكود: 2001
- **إضافة مشرفين**: من قائمة "المشرفون" في لوحة تحكم المشرف
- **إضافة معلمين**: من قائمة "المعلمون"
- **إضافة طلاب**: من قائمة "الطلاب"
- **الباركود**: من صفحة "الباركود" - ارفع الموقع أولاً ثم استخدم الباركود الثابت
