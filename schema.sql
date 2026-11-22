-- مخطط قاعدة بيانات تطبيق المرافق (SQLite)

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pnr TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  family_name TEXT NOT NULL,
  phone TEXT,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  trip_title TEXT NOT NULL,
  price TEXT NOT NULL,
  terms TEXT NOT NULL,
  departure_at TEXT NOT NULL,
  segments_json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- حجز تجريبي افتراضي (PNR: MRF842 | اسم العائلة: المنصور)
INSERT OR IGNORE INTO bookings (
  pnr, customer_name, family_name, phone, country, city, trip_title, price, terms, departure_at, segments_json
) VALUES (
  'MRF842',
  'أحمد المنصور',
  'المنصور',
  '+966500000000',
  'تركيا',
  'Istanbul',
  'برنامج إسطنبول العائلي المتكامل',
  '1,450 دولار أمريكي (شامل الضرائب)',
  '• الأسعار شاملة الطيران والفندق والتوصيل المذكور أعلاه.
• التعديل أو الإلغاء مجاني قبل 7 أيام من السفر.
• يرجى التأكد من صلاحية جواز السفر لمدة لا تقل عن 6 أشهر.',
  '2026-11-23T11:30',
  '[{"type":"flight","title":"طيران الذهاب — الخطوط الجوية التركية (TK 785)","dateTime":"حسب الموعد المحدد","location":"مطار المغادرة ➔ مطار إسطنبول الدولي (IST)","details":"الوزن المسموح: 30 كجم + 8 كجم حقيبة يد — الوصول قبل الإقلاع بـ 3 ساعات."},{"type":"transfer","title":"توصيل خاص VIP من المطار إلى الفندق","dateTime":"عند الوصول مباشرة","location":"بوابة الخروج رقم 9 — سائق يحمل لافتة باسم العائلة","details":"سيارة مرسيدس فيتو مكيفة شاملة رسوم الطرق والضرائب."},{"type":"hotel","title":"إقامة فندقية — فندق مرمرة تقسيم (5 نجوم)","dateTime":"4 ليالٍ / 5 أيام — شامل الإفطار","location":"ميدان تقسيم، إسطنبول","details":"غرفة عائلية مطلة مع خدمة الواي فاي المجانية."},{"type":"transfer","title":"توصيل العودة من الفندق إلى المطار","dateTime":"قبل موعد طيران العودة بـ 4 ساعات","location":"لوبي الفندق الرئيسي","details":"توصيل خاص مباشر إلى صالة المغادرة الدولية."},{"type":"flight","title":"طيران العودة — الخطوط الجوية التركية (TK 786)","dateTime":"اليوم الخامس — الساعة 18:45","location":"مطار إسطنبول الدولي (IST) ➔ مطار العودة","details":"يرجى إتمام الـ Check-in قبل 24 ساعة من موعد الإقلاع."}]'
);
