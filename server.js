const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'murafiq.db');
const db = new sqlite3.Database(dbPath);

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function generatePNR() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let prefix = '';
  for (let i = 0; i < 3; i++) {
    prefix += letters[Math.floor(Math.random() * letters.length)];
  }
  const num = Math.floor(100 + Math.random() * 900);
  return `${prefix}${num}`;
}

async function initDb() {
  const schemaFile = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaFile)) {
    const schemaSql = fs.readFileSync(schemaFile, 'utf8');
    const statements = schemaSql
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      await run(stmt);
    }
  } else {
    await run(`
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
      )
    `);
  }

  const demo = await get('SELECT id FROM bookings WHERE pnr = ?', ['MRF842']);
  if (!demo) {
    const dep = new Date(Date.now() + 23.5 * 3600 * 1000).toISOString().slice(0, 16);
    const defaultSegments = [
      {
        type: 'flight',
        title: 'طيران الذهاب — الخطوط الجوية التركية (TK 785)',
        dateTime: dep.replace('T', ' '),
        location: 'مطار المغادرة ➔ مطار إسطنبول الدولي (IST)',
        details: 'الوزن المسموح: 30 كجم + 8 كجم حقيبة يد — الوصول قبل الإقلاع بـ 3 ساعات.'
      },
      {
        type: 'transfer',
        title: 'توصيل خاص VIP من المطار إلى الفندق',
        dateTime: 'عند الوصول مباشرة',
        location: 'بوابة الخروج رقم 9 — سائق يحمل لافتة باسم العائلة',
        details: 'سيارة مرسيدس فيتو مكيفة شاملة رسوم الطرق والضرائب.'
      },
      {
        type: 'hotel',
        title: 'إقامة فندقية — فندق مرمرة تقسيم (5 نجوم)',
        dateTime: '4 ليالٍ / 5 أيام — شامل الإفطار',
        location: 'ميدان تقسيم، إسطنبول',
        details: 'غرفة عائلية مطلة مع خدمة الواي فاي المجانية.'
      },
      {
        type: 'transfer',
        title: 'توصيل العودة من الفندق إلى المطار',
        dateTime: 'قبل موعد طيران العودة بـ 4 ساعات',
        location: 'لوبي الفندق الرئيسي',
        details: 'توصيل خاص مباشر إلى صالة المغادرة الدولية.'
      },
      {
        type: 'flight',
        title: 'طيران العودة — الخطوط الجوية التركية (TK 786)',
        dateTime: 'اليوم الخامس — الساعة 18:45',
        location: 'مطار إسطنبول الدولي (IST) ➔ مطار العودة',
        details: 'يرجى إتمام الـ Check-in قبل 24 ساعة من موعد الإقلاع.'
      }
    ];

    await run(
      `INSERT INTO bookings (pnr, customer_name, family_name, phone, country, city, trip_title, price, terms, departure_at, segments_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'MRF842',
        'أحمد المنصور',
        'المنصور',
        '+966500000000',
        'تركيا',
        'Istanbul',
        'برنامج إسطنبول العائلي المتكامل',
        '1,450 دولار أمريكي (شامل الضرائب)',
        '• الأسعار شاملة الطيران والفندق والتوصيل المذكور أعلاه.\n• التعديل أو الإلغاء مجاني قبل 7 أيام من السفر.\n• يرجى التأكد من صلاحية جواز السفر لمدة لا تقل عن 6 أشهر.',
        dep,
        JSON.stringify(defaultSegments)
      ]
    );
  }
}

app.post('/api/login', async (req, res) => {
  try {
    const pnr = String(req.body.pnr || '').trim().toUpperCase();
    const familyName = String(req.body.familyName || '').trim();
    if (!pnr || !familyName) {
      return res.status(400).json({ error: 'يرجى إدخال رقم PNR واسم العائلة.' });
    }

    const row = await get(
      'SELECT * FROM bookings WHERE UPPER(pnr) = ? AND TRIM(family_name) = ?',
      [pnr, familyName]
    );
    if (!row) {
      return res.status(404).json({ error: 'لم يتم العثور على حجز مطابق. تأكد من رقم PNR واسم العائلة.' });
    }

    res.json({
      booking: {
        ...row,
        segments: JSON.parse(row.segments_json || '[]')
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ في الخادم أثناء البحث عن الحجز.' });
  }
});

app.post('/api/admin/auth', (req, res) => {
  const pin = String(req.body.pin || '').trim();
  if (pin === ADMIN_PIN) {
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: 'رمز الإدارة غير صحيح.' });
});

app.get('/api/admin/bookings', async (req, res) => {
  const pin = String(req.headers['x-admin-pin'] || '').trim();
  if (pin !== ADMIN_PIN) {
    return res.status(401).json({ error: 'غير مصرح.' });
  }
  try {
    const rows = await all('SELECT * FROM bookings ORDER BY id DESC');
    res.json({
      bookings: rows.map((r) => ({
        ...r,
        segments: JSON.parse(r.segments_json || '[]')
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'تعذر تحميل الحجوزات.' });
  }
});

app.post('/api/admin/bookings', async (req, res) => {
  const pin = String(req.headers['x-admin-pin'] || '').trim();
  if (pin !== ADMIN_PIN) {
    return res.status(401).json({ error: 'غير مصرح.' });
  }

  try {
    const {
      customer_name,
      family_name,
      phone,
      country,
      city,
      trip_title,
      price,
      terms,
      departure_at,
      segments
    } = req.body;

    if (!customer_name || !family_name || !country || !city || !trip_title || !price || !departure_at) {
      return res.status(400).json({ error: 'يرجى تعبئة كافة الحقول الأساسية للبرنامج.' });
    }

    let pnr = generatePNR();
    for (let i = 0; i < 10; i++) {
      const exists = await get('SELECT id FROM bookings WHERE pnr = ?', [pnr]);
      if (!exists) break;
      pnr = generatePNR();
    }

    const segArray = Array.isArray(segments) ? segments : [];
    await run(
      `INSERT INTO bookings (pnr, customer_name, family_name, phone, country, city, trip_title, price, terms, departure_at, segments_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pnr,
        customer_name.trim(),
        family_name.trim(),
        (phone || '').trim(),
        country.trim(),
        city.trim(),
        trip_title.trim(),
        price.trim(),
        (terms || 'تطبق شروط وأحكام شركة السياحة.').trim(),
        departure_at.trim(),
        JSON.stringify(segArray)
      ]
    );

    const created = await get('SELECT * FROM bookings WHERE pnr = ?', [pnr]);
    res.json({
      booking: {
        ...created,
        segments: JSON.parse(created.segments_json || '[]')
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'تعذر حفظ الحجز في قاعدة البيانات.' });
  }
});

app.delete('/api/admin/bookings/:pnr', async (req, res) => {
  const pin = String(req.headers['x-admin-pin'] || '').trim();
  if (pin !== ADMIN_PIN) {
    return res.status(401).json({ error: 'غير مصرح.' });
  }
  try {
    await run('DELETE FROM bookings WHERE UPPER(pnr) = ?', [String(req.params.pnr || '').toUpperCase()]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'تعذر حذف الحجز.' });
  }
});

app.post('/api/ai', async (req, res) => {
  try {
    const { question, booking, countryGuide, weatherSummary } = req.body || {};
    const q = String(question || '').trim();
    if (!q) {
      return res.status(400).json({ error: 'يرجى كتابة سؤالك.' });
    }

    if (process.env.OPENAI_API_KEY) {
      const systemPrompt = `أنت "المرافق"، مساعد سفر سياحي ذكي، دقيق، وودود تتحدث العربية بطلاقة وتساعد المسافر في كل ما يخص رحلته.
بيانات حجز المسافر:
${JSON.stringify(booking || {}, null, 2)}
معلومات الدولة التلقائية:
${JSON.stringify(countryGuide || {}, null, 2)}
ملخص الطقس الحالي:
${weatherSummary || 'غير متوفر'}
أجب بوضوح وتنظيم، وإذا سأل المسافر عن برنامجه أو سعره أو مواعيده أو فيوز الكهرباء أو المطاعم الحلال أو المناطق السياحية فاستخدم البيانات بدقة مع نصائح عملية إضافية.`;

      const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: q }
          ],
          temperature: 0.6
        })
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        const reply = aiData.choices?.[0]?.message?.content;
        if (reply) {
          return res.json({ reply });
        }
      }
    }

    const b = booking || {};
    const g = countryGuide || {};
    const text = q.toLowerCase();

    if (text.includes('فيوز') || text.includes('كهرب') || text.includes('شاحن') || text.includes('قابس')) {
      return res.json({
        reply: `🔌 بخصوص الكهرباء والفيوز في ${b.country || 'وجهتك'}:
• نوع القابس (الفيوز): ${g.plug || 'النوع الأوروبي الثنائي (Type C / F)'}
• الجهد الكهربائي: ${g.voltage || '220V - 50Hz'}
• نصيحة عملية: احمل معك محوّل سفر عالمي (Universal Adapter) ومشترك كهربائي صغير لشحن عدة أجهزة في الفندق بسهولة.`
      });
    }

    if (text.includes('حلال') || text.includes('مطعم') || text.includes('مطاعم') || text.includes('أكل') || text.includes('اكل')) {
      const list = Array.isArray(g.halalFood) ? g.halalFood.map((x) => `• ${x}`).join('
') : 'تتوفر مطاعم حلال متنوعة بالقرب من الفنادق والمراكز السياحية.';
      return res.json({
        reply: `🍽️ أفضل خيارات المطاعم الحلال في ${b.country || b.city || 'وجهتك'}:
${list}

💡 نصيحة: اطلب من موظف الاستقبال في (${b.hotel || 'فندقك'}) ترشيح أقرب مطعم حلال مشهور سيراً على الأقدام.`
      });
    }

    if (text.includes('سياح') || text.includes('أماكن') || text.includes('اماكن') || text.includes('معالم') || text.includes('زيار')) {
      const spots = Array.isArray(g.sights) ? g.sights.map((x) => `• ${x}`).join('
') : 'المعالم التاريخية والواجهات البحرية والأسواق التراثية.';
      return res.json({
        reply: `🗺️ أبرز المناطق السياحية المقترحة في ${b.country || b.city || 'وجهتك'}:
${spots}

✨ اقتراح: خصص الصباح للمعالم المفتوحة والمتاحف، والعصر للمطلات والأسواق.`
      });
    }

    if (text.includes('طقس') || text.includes('جو') || text.includes('حرار') || text.includes('ملابس') || text.includes('حقيب')) {
      return res.json({
        reply: `🌤️ حالة الطقس في ${b.city || b.country || 'وجهتك'}:
${weatherSummary || 'يرجى مراجعة بطاقة الطقس المباشر في الأعلى.'}

🧳 نصيحة الحقيبة: جهّز حذاءً مريحاً للمشي الطويل، وسترة خفيفة للمساء، وشاحناً متنقلاً، ونسخة من جواز سفرك.`
      });
    }

    if (text.includes('check') || text.includes('شيك') || text.includes('24') || text.includes('طيران') || text.includes('مطار') || text.includes('توصيل') || text.includes('فندق') || text.includes('مسار') || text.includes('برنامج')) {
      const segs = Array.isArray(b.segments)
        ? b.segments.map((s, idx) => `${idx + 1}. ${s.title} (${s.dateTime || ''})`).join('
')
        : 'يرجى مراجعة بطاقات المسار في تبويب برنامجي.';
      return res.json({
        reply: `✈️ تفاصيل مسار رحلتك (${b.trip_title || ''}) — رقم الحجز ${b.pnr || ''}:
${segs}

⏰ تذكير مهم: يُفتح الـ Check-in قبل موعد الطيران بـ 24 ساعة تماماً، وتواجد في المطار قبل الإقلاع بـ 3 ساعات.`
      });
    }

    if (text.includes('سعر') || text.includes('تكلف') || text.includes('شروط') || text.includes('دفع') || text.includes('إلغاء')) {
      return res.json({
        reply: `💳 تفاصيل السعر وشروط الحجز (${b.pnr || ''}):
• السعر الإجمالي: ${b.price || 'حسب العقد'}
• الشروط والأحكام:
${b.terms || 'تطبق شروط شركة السياحة.'}`
      });
    }

    return res.json({
      reply: `أهلاً بك يا ${b.customer_name || 'مسافرنا العزيز'} في رحلتك إلى ${b.country || b.city || 'وجهتك'} (حجز ${b.pnr || ''})! 🌟

بخصوص سؤالك: "${q}"
• إقامتك المسجلة: ${b.hotel || 'حسب البرنامج'}
• الطقس الحالي: ${weatherSummary || 'معتدل'}
• فيوز الكهرباء: ${g.plug || 'Type C / F'}

يمكنك سؤالي عن أي تفصيل حول: مسار الطيران والفندق والتوصيل، موعد الـ Check-in قبل 24 ساعة، المطاعم الحلال، الأماكن السياحية، الطقس، أو شروط الحجز والسعر.`
    });
  } catch (err) {
    res.status(500).json({ error: 'تعذر معالجة السؤال الآن.' });
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Al-Murafiq server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database init failed:', err);
    process.exit(1);
  });
