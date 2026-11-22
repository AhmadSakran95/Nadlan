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
  '2026-11-23T10:00',
  '[{"type":"flight","title":"طيران الذهاب — الخطوط الجوية التركية (TK 785)","dateTime":"حسب الموعد المحدد","location":"مطار المغادرة ➔ مطار إسطنبول الدولي (IST)","details":"الوزن المسموح: 30 كجم + 8 كجم حقيبة يد"},{"type":"transfer","title":"توصيل خاص VIP من المطار إلى الفندق","dateTime":"عند الوصول مباشرة","location":"مطار إسطنبول ➔ الفندق","details":"سيارة مريحة مكيفة"},{"type":"hotel","title":"إقامة فندقية — فندق مرمرة تقسيم","dateTime":"4 ليالٍ / 5 أيام","location":"تقسيم، إسطنبول","details":"شامل الإفطار"},{"type":"transfer","title":"توصيل العودة إلى المطار","dateTime":"قبل الإقلاع بـ 4 ساعات","location":"الفندق ➔ مطار إسطنبول","details":"توصيل خاص"},{"type":"flight","title":"طيران العودة — الخطوط الجوية التركية (TK 786)","dateTime":"يوم العودة","location":"مطار إسطنبول الدولي (IST) ➔ مطار العودة","details":"تذكير Check-in قبل 24 ساعة"}]'
);
