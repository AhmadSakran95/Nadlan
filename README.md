# Nadlantours - جاهز للرفع على Railway مع قاعدة بيانات SQL

هذا الملف يحتوي على المشروع الكامل مع مجلد `public/` وقاعدة بيانات **SQL** (`schema.sql` + `server.js` عبر SQLite).

## مكان مجلد `public/`
مجلد `public/` موجود مباشرة في الجذر الرئيسي للمشروع:
- `public/index.html`
- `public/app.js`
- `public/styles.css`

## خطوات الرفع على Railway
1. فك ضغط ملف الـ ZIP على جهازك.
2. ارفع المجلد إلى مستودع **GitHub** (أو استخدم Railway CLI).
3. في **Railway** اضغط **New Project** ➔ **Deploy from GitHub repo** واختر المستودع.
4. سيقوم Railway تلقائياً بتثبيت الحزم (`npm install`) وتشغيل السيرفر (`npm start`) وإنشاء قاعدة البيانات `nadlantours.db` تلقائياً.
5. **نصيحة مهمة في Railway:** لإبقاء بيانات SQL محفوظة حتى عند إعادة النشر (Redeploy)، أضف **Volume** في إعدادات الخدمة واربطه بالمسار `/data` ثم أضف متغير البيئة `RAILWAY_VOLUME_MOUNT_PATH=/data`.
