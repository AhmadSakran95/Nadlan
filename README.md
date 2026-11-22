# Nadlantours - جاهز على Railway مع قاعدة بيانات SQL وذكاء اصطناعي حقيقي (Gemini API)

## تفعيل الذكاء الاصطناعي على Railway
1. احصل على مفتاح `GEMINI_API_KEY` من Google AI Studio.
2. في لوحة تحكم **Railway**، اختر خدمتك ➔ تبويب **Variables**.
3. أضف المتغير:
   - `GEMINI_API_KEY` = مفتاح الـ API الخاص بك
   - (اختياري) `GEMINI_MODEL` = `gemini-2.5-flash`
4. أعد النشر (Redeploy) وسيجيب المساعد الذكي على أي سؤال يتعلق بالسفر والرحلات والخطط اليومية وتفاصيل الحجز.

## قاعدة البيانات ومجلد `public/`
- قاعدة البيانات **SQL** (`schema.sql` + SQLite عبر `server.js`) تعمل تلقائياً، ويُنصح بربط **Volume** على `/data` مع `RAILWAY_VOLUME_MOUNT_PATH=/data`.
- مجلد `public/` موجود في الجذر الرئيسي (`public/index.html`, `public/app.js`, `public/styles.css`).
