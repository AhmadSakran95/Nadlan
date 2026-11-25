# Nadlantours — Railway deployment

## تشغيل محلياً
1. ثبّت Node.js 18 أو أحدث.
2. نفّذ `npm install`.
3. انسخ `.env.example` إلى `.env` وضع مفتاح Gemini في `GEMINI_API_KEY`.
4. نفّذ `npm start` وافتح `http://localhost:3000`.

## النشر على Railway
1. ارفع محتويات هذا المجلد إلى GitHub.
2. في Railway اختر **New Project → Deploy from GitHub Repo** وحدد المستودع.
3. Railway سيستخدم أمر البدء `npm start` تلقائياً.
4. من **Variables** أضف `GEMINI_API_KEY` بقيمة مفتاح Google AI Studio.
5. افتح الدومين الذي ينشئه Railway.

## ملاحظات مهمة
- مفتاح Gemini محفوظ على الخادم وليس داخل ملفات المتصفح.
- الحجوزات حالياً تُحفظ في `localStorage` في متصفح كل مستخدم؛ هذا يعني أنها ليست قاعدة بيانات مشتركة بين الإدارة والزبائن، وقد تختفي عند مسح بيانات المتصفح. يلزم ربط قاعدة بيانات مثل PostgreSQL إذا أردت حجوزات مشتركة ودائمة.
- ميزة رفع ملفات PDF/الصور تعتمد على منطق المتصفح الموجود في التطبيق؛ راجعها واختبرها بعد النشر.
