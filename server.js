const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Use Railway volume path if mounted, otherwise local project directory
const dbDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;
const dbPath = path.join(dbDir, 'nadlantours.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening SQL database:', err.message);
  } else {
    console.log('✅ Connected to SQL database at:', dbPath);
    initDatabase();
  }
});

function ensureFlightFileColumns(callback) {
  db.all('PRAGMA table_info(itinerary_steps)', [], (err, cols) => {
    if (err) return callback(err);
    const existing = new Set((cols || []).map((c) => c.name));
    const alters = [];
    if (!existing.has('flight_file_name')) {
      alters.push('ALTER TABLE itinerary_steps ADD COLUMN flight_file_name VARCHAR(255)');
    }
    if (!existing.has('flight_file_mime')) {
      alters.push('ALTER TABLE itinerary_steps ADD COLUMN flight_file_mime VARCHAR(120)');
    }
    if (!existing.has('flight_file_data')) {
      alters.push('ALTER TABLE itinerary_steps ADD COLUMN flight_file_data TEXT');
    }
    if (!existing.has('voucher_file_name')) {
      alters.push('ALTER TABLE itinerary_steps ADD COLUMN voucher_file_name VARCHAR(255)');
    }
    if (!existing.has('voucher_file_mime')) {
      alters.push('ALTER TABLE itinerary_steps ADD COLUMN voucher_file_mime VARCHAR(120)');
    }
    if (!existing.has('voucher_file_data')) {
      alters.push('ALTER TABLE itinerary_steps ADD COLUMN voucher_file_data TEXT');
    }
    if (alters.length === 0) return callback(null);

    let idx = 0;
    function runNext() {
      if (idx >= alters.length) return callback(null);
      db.run(alters[idx++], (aErr) => {
        if (aErr) return callback(aErr);
        runNext();
      });
    }
    runNext();
  });
}

function initDatabase() {
  db.run('PRAGMA foreign_keys = ON');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema, (err) => {
    if (err) {
      console.error('❌ Schema execution error:', err.message);
    } else {
      ensureFlightFileColumns((colErr) => {
        if (colErr) console.error('❌ Column migration error:', colErr.message);
        seedInitialBookings();
        cleanupExpiredBookings();
      });
    }
  });
}

function seedInitialBookings() {
  db.get('SELECT COUNT(*) AS count FROM bookings', (err, row) => {
    if (err || row.count > 0) return;

    console.log('🌱 Seeding initial SQL bookings...');
    const demoBookings = [
      {
        pnr: 'NDL101',
        firstName: 'أحمد',
        lastName: 'المنصور',
        phone: '+972501112233',
        city: 'برشلونة',
        price: 2450,
        currency: '$',
        terms: '• السعر يشمل تذاكر الطيران ذهاباً وإياباً مع حقيبة 23 كغ لكل مسافر.\n• تسجيل الدخول للفنادق الساعة 15:00 والمغادرة الساعة 11:00.\n• السائق ينتظر في صالة الوصول حاملاً لافتة باسم Nadlantours.',
        itinerary: [
          { type: 'flight', from: 'مطار بن غوريون (TLV)', to: 'مطار برشلونة الدولي (BCN)', date: '2026-11-25 | الساعة 08:30 صباحاً', notes: 'الخطوط الجوية الإسبانية - رحلة رقم IB3312' },
          { type: 'hotel', hotelName: 'فندق كاتالونيا بلازا (Catalonia Plaza)', stars: '4 نجوم', boardType: 'إفطار فقط (BB)', notes: '3 ليالي - غرفة مزدوجة مطلة على ساحة إسبانيا' },
          { type: 'transfer', from: 'فندق كاتالونيا بلازا - برشلونة', to: 'منتجع كوستا برافا الساحلي', date: '2026-11-28 | الساعة 10:00 صباحاً', notes: 'سيارة مرسيدس فان خاصة مكيفة' },
          { type: 'hotel', hotelName: 'منتجع ريجال كوستا برافا (Regal Costa Brava)', stars: '5 نجوم', boardType: 'نصف إقامة (فطور + عشاء HB)', notes: 'ليلتان - جناح مطل على البحر مع دخول السبا' },
          { type: 'flight', from: 'مطار برشلونة الدولي (BCN)', to: 'مطار بن غوريون (TLV)', date: '2026-11-30 | الساعة 19:45 مساءً', notes: 'العودة - يُرجى التواجد في المطار قبل 3 ساعات' }
        ]
      },
      {
        pnr: 'NDL202',
        firstName: 'سارة',
        lastName: 'العلي',
        phone: '+972524445566',
        city: 'إسطنبول',
        price: 1380,
        currency: '$',
        terms: '• يشمل الاستقبال والتوديع من وإلى مطار إسطنبول الجديد.\n• الإفطار بوفيه مفتوح حلال يومياً في الفندق.',
        itinerary: [
          { type: 'flight', from: 'مطار الملكة علياء (AMM)', to: 'مطار إسطنبول الدولي (IST)', date: '2026-12-02 | الساعة 11:00 صباحاً', notes: 'الخطوط التركية TK815' },
          { type: 'hotel', hotelName: 'فندق إليت وورلد تقسيم (Elite World Taksim)', stars: '5 نجوم', boardType: 'إفطار فقط (BB)', notes: '4 ليالي - غرفة ديلوكس قريبة من ساحة تقسيم' },
          { type: 'transfer', from: 'فندق إليت وورلد تقسيم', to: 'مطار إسطنبول الدولي (IST)', date: '2026-12-06 | الساعة 14:00 ظهراً', notes: 'توصيل VIP خاص للمطار' },
          { type: 'flight', from: 'مطار إسطنبول الدولي (IST)', to: 'مطار الملكة علياء (AMM)', date: '2026-12-06 | الساعة 18:15 مساءً', notes: 'الخطوط التركية TK818' }
        ]
      }
    ];

    demoBookings.forEach((b) => insertBookingSQL(b, () => {}));
  });
}

function insertBookingSQL(b, callback) {
  const sqlBooking = `
    INSERT INTO bookings (pnr, first_name, last_name, phone, city, price, currency, terms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.run(
    sqlBooking,
    [b.pnr, b.firstName, b.lastName, b.phone, b.city, b.price, b.currency, b.terms],
    function (err) {
      if (err) return callback(err);
      const bookingId = this.lastID;
      insertStepsSQL(bookingId, b.itinerary, callback);
    }
  );
}

function insertStepsSQL(bookingId, steps, callback) {
  if (!steps || steps.length === 0) return callback(null);
  const stmt = db.prepare(`
    INSERT INTO itinerary_steps 
    (booking_id, step_order, step_type, from_location, to_location, travel_date, hotel_name, stars, board_type, tour_title, notes, flight_file_name, flight_file_mime, flight_file_data, voucher_file_name, voucher_file_mime, voucher_file_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  steps.forEach((s, idx) => {
    stmt.run([
      bookingId,
      idx + 1,
      s.type,
      s.from || null,
      s.to || null,
      s.date || null,
      s.hotelName || null,
      s.stars || null,
      s.boardType || null,
      s.title || null,
      s.notes || null,
      s.flightFileName || null,
      s.flightFileMime || null,
      s.flightFileData || null,
      s.voucherFileName || null,
      s.voucherFileMime || null,
      s.voucherFileData || null
    ]);
  });

  stmt.finalize(callback);
}

function formatBookingRow(row, stepRows) {
  return {
    id: row.id,
    pnr: row.pnr,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    city: row.city,
    price: row.price,
    currency: row.currency,
    terms: row.terms,
    createdAt: row.created_at,
    itinerary: stepRows.map((s) => ({
      type: s.step_type,
      from: s.from_location || '',
      to: s.to_location || '',
      date: s.travel_date || '',
      hotelName: s.hotel_name || '',
      stars: s.stars || '',
      boardType: s.board_type || '',
      title: s.tour_title || '',
      notes: s.notes || '',
      flightFileName: s.flight_file_name || '',
      flightFileMime: s.flight_file_mime || '',
      flightFileData: s.flight_file_data || '',
      voucherFileName: s.voucher_file_name || '',
      voucherFileMime: s.voucher_file_mime || '',
      voucherFileData: s.voucher_file_data || ''
    }))
  };
}

// ==================== EXTRACT FLIGHT DETAILS (MULTI-PASSENGER & ROUND-TRIP) ====================
app.post('/api/ai/extract-flight', async (req, res) => {
  const { fileName, mimeType, base64Data } = req.body;

  if (!base64Data || !mimeType) {
    return res.status(400).json({ error: 'يرجى إرفاق ملف PDF أو صورة لتفاصيل الطيران' });
  }

  if (!GEMINI_API_KEY) {
    return res.status(400).json({ error: 'مفتاح GEMINI_API_KEY غير مضبوط على السيرفر' });
  }

  const prompt = `حلّل ملف أو صورة تذكرة الطيران المرفقة بدقة عالية واستخرج جميع المسافرين، شركة الطيران، رقم حجز الطيران (PNR / Booking Reference) الخاص بالتذكرة، رابط صفحة Check-in لشركة الطيران إن وُجد أو الرابط الرسمي المعروف للشركة، وجميع قطاعات الرحلة (ذهاب وعودة أو عدة محطات إن وُجدت)، ثم أرجع النتيجة بصيغة JSON فقط بدون أي نص إضافي:
{
  "passengers": ["اسم المسافر الأول", "اسم المسافر الثاني"],
  "airlineName": "اسم شركة الطيران، مثال: Turkish Airlines أو El Al أو Ryanair أو Wizz Air",
  "flightPnr": "رمز حجز الطيران PNR / Booking Reference من التذكرة، مثال: ABC123",
  "checkInUrl": "رابط صفحة Check-in لشركة الطيران إن وجد في التذكرة أو الرابط الرسمي لصفحة Check-in للشركة",
  "outbound": {
    "from": "مطار المغادرة للذهاب مع الرمز إن وجد، مثال: مطار بن غوريون (TLV)",
    "to": "مطار الوصول للذهاب مع الرمز إن وجد، مثال: مطار برشلونة الدولي (BCN)",
    "date": "تاريخ ووقت رحلة الذهاب، مثال: 2026-12-01 | 08:30 صباحاً",
    "notes": "شركة الطيران ورقم الرحلة والملاحظات للذهاب"
  },
  "returnFlight": {
    "hasReturn": true,
    "from": "مطار المغادرة للعودة إن وُجدت عودة، وإلا نص فارغ",
    "to": "مطار الوصول للعودة إن وُجدت عودة، وإلا نص فارغ",
    "date": "تاريخ ووقت رحلة العودة إن وُجدت عودة، وإلا نص فارغ",
    "notes": "شركة الطيران ورقم الرحلة والملاحظات للعودة إن وُجدت عودة، وإلا نص فارغ"
  }
}
تنبيهات مهمة:
- استخرج كل أسماء المسافرين الموجودة في التذكرة في مصفوفة "passengers" حتى لو كان مسافراً واحداً أو عدة مسافرين.
- استخرج "flightPnr" (رمز حجز الطيران الخاص بشركة الطيران، مثل 6 أحرف/أرقام في التذكرة) بدقة.
- إذا كانت التذكرة ذهاباً وعودة (أو تحتوي على رحلة عودة)، اجعل "hasReturn": true واملأ حقول "returnFlight" بدقة. إذا كانت ذهاباً فقط اجعل "hasReturn": false.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Data
                  }
                },
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1200
          }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      const apiErrMsg = data?.error?.message || 'خطأ من خدمة الذكاء الاصطناعي';
      return res.status(502).json({ error: `تعذر قراءة ملف الطيران: ${apiErrMsg}` });
    }

    const rawText =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || '')
        .join('')
        .trim() || '';

    const cleaned = rawText.replace(/```json\s*|```/gi, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      return res.status(422).json({ error: 'لم يتمكن الذكاء الاصطناعي من استخراج حقول منظمة من الملف' });
    }

    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    const passengers = Array.isArray(parsed.passengers)
      ? parsed.passengers.map((p) => String(p || '').trim()).filter(Boolean)
      : [];

    const outObj = parsed.outbound || parsed;
    const retObj = parsed.returnFlight || {};
    const hasReturn = Boolean(
      retObj.hasReturn ||
        (retObj.from && String(retObj.from).trim()) ||
        (retObj.to && String(retObj.to).trim()) ||
        (retObj.date && String(retObj.date).trim())
    );

    const paxSuffix = passengers.length > 0 ? ` | المسافرون: ${passengers.join('، ')}` : '';
    const baseOutNotes = String(outObj.notes || '').trim();
    const outNotes = `${baseOutNotes}${paxSuffix}`.trim();

    const baseRetNotes = String(retObj.notes || '').trim();
    const retNotes = hasReturn ? `${baseRetNotes}${paxSuffix}`.trim() : '';

    const airlineName = String(parsed.airlineName || '').trim();
    const flightPnr = String(parsed.flightPnr || '').trim().toUpperCase();
    let checkInUrl = String(parsed.checkInUrl || '').trim();
    if (!checkInUrl && airlineName) {
      const low = airlineName.toLowerCase();
      if (low.includes('turkish')) checkInUrl = 'https://www.turkishairlines.com/en-int/flights/manage-booking/';
      else if (low.includes('el al')) checkInUrl = 'https://www.elal.com/en/Passengers-Info/Check-in/Pages/default.aspx';
      else if (low.includes('ryanair')) checkInUrl = 'https://www.ryanair.com/gb/en/trip-manager';
      else if (low.includes('wizz')) checkInUrl = 'https://wizzair.com/en-gb/check-in-and-booking';
      else if (low.includes('aegean')) checkInUrl = 'https://en.aegeanair.com/plan/check-in/';
      else if (low.includes('flydubai')) checkInUrl = 'https://www.flydubai.com/en/manage-booking/check-in';
      else if (low.includes('emirates')) checkInUrl = 'https://www.emirates.com/english/manage-booking/';
      else if (low.includes('qatar')) checkInUrl = 'https://www.qatarairways.com/en/hia-online-check-in.html';
    }
    const paxLastName = passengers.length > 0 ? passengers[0].trim().split(/\s+/).slice(-1)[0] : '';
    const flightPnr = String(parsed.flightPnr || '').trim().toUpperCase();
    const checkInUrl = String(parsed.checkInUrl || '').trim();
    const paxLastName = passengers.length > 0 ? passengers[0].trim().split(/\s+/).slice(-1)[0] : '';

        const airlineName = String(parsed.airlineName || '').trim();
    const flightPnr = String(parsed.flightPnr || '').trim().toUpperCase();
    const checkInUrl = String(parsed.checkInUrl || '').trim();
    const paxLastName = passengers.length > 0 ? passengers[0].trim().split(/\s+/).slice(-1)[0] : '';

    res.json({
      passengers,
      airlineName,
      flightPnr,
      checkInUrl,
      passengerLastName: paxLastName,
      outbound: {
        from: String(outObj.from || ''),
        to: String(outObj.to || ''),
        date: String(outObj.date || ''),
        notes: outNotes,
        airlineName,
        flightPnr,
        checkInUrl,
        passengerLastName: paxLastName,
        flightFileName: fileName || 'flight-ticket'
      },
      returnFlight: hasReturn
        ? {
            hasReturn: true,
            from: String(retObj.from || ''),
            to: String(retObj.to || ''),
            date: String(retObj.date || ''),
            notes: retNotes,
            airlineName,
            flightPnr,
            checkInUrl,
            passengerLastName: paxLastName,
            flightFileName: fileName || 'flight-ticket'
          }
        : { hasReturn: false }
    });
  } catch (err) {
    console.error('Flight extraction error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحليل ملف الطيران' });
  }
});

// ==================== EXTRACT HOTEL / TRANSFER VOUCHER DETAILS ====================
app.post('/api/ai/extract-voucher', async (req, res) => {
  const { fileName, mimeType, base64Data, voucherType } = req.body;

  if (!base64Data || !mimeType) {
    return res.status(400).json({ error: 'يرجى إرفاق ملف PDF أو صورة للفاوشر' });
  }

  if (!GEMINI_API_KEY) {
    return res.status(400).json({ error: 'مفتاح GEMINI_API_KEY غير مضبوط على السيرفر' });
  }

  const isHotel = voucherType === 'hotel';
  const prompt = isHotel
    ? `حلّل ملف أو صورة فاوشر الفندق المرفقة بدقة عالية واستخرج بيانات الحجز وأرجع النتيجة بصيغة JSON فقط بدون أي نص إضافي:
{
  "passengers": ["اسم الضيف الأول", "اسم الضيف الثاني"],
  "hotelName": "اسم الفندق كاملاً، مثال: فندق إليت وورلد تقسيم (Elite World Taksim)",
  "stars": "اختر الأقرب من القيم التالية فقط: 5 نجوم أو 4 نجوم أو 3 نجوم أو منتجع فاخر",
  "boardType": "اختر الأقرب من القيم التالية فقط: بدون وجبات (RO) أو إفطار فقط (BB) أو نصف إقامة (فطور + عشاء HB) أو إقامة كاملة (FB) أو شامل كلياً (All Inclusive)",
  "notes": "تواريخ الدخول والخروج وعدد الليالي ونوع الغرفة وأي ملاحظات أو رقم تأكيد الحجز"
}`
    : `حلّل ملف أو صورة فاوشر المواصلات / التوصيل المرفقة بدقة عالية واستخرج بيانات التوصيل وأرجع النتيجة بصيغة JSON فقط بدون أي نص إضافي:
{
  "passengers": ["اسم الراكب الأول", "اسم الراكب الثاني"],
  "from": "نقطة الانطلاق / الاستلام، مثال: مطار إسطنبول الدولي (IST)",
  "to": "نقطة الوصول / التوصيل، مثال: فندق إليت وورلد تقسيم",
  "date": "تاريخ ووقت التوصيل، مثال: 2026-12-02 | 12:30 ظهراً",
  "notes": "نوع السيارة أو شركة التوصيل أو رقم الحجز وأي ملاحظات مهمة"
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Data
                  }
                },
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1000
          }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      const apiErrMsg = data?.error?.message || 'خطأ من خدمة الذكاء الاصطناعي';
      return res.status(502).json({ error: `تعذر قراءة ملف الفاوشر: ${apiErrMsg}` });
    }

    const rawText =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || '')
        .join('')
        .trim() || '';

    const cleaned = rawText.replace(/```json\s*|```/gi, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      return res.status(422).json({ error: 'لم يتمكن الذكاء الاصطناعي من استخراج حقول منظمة من الفاوشر' });
    }

    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    const passengers = Array.isArray(parsed.passengers)
      ? parsed.passengers.map((p) => String(p || '').trim()).filter(Boolean)
      : [];
    const paxSuffix = passengers.length > 0 ? ` | المسافرون: ${passengers.join('، ')}` : '';
    const baseNotes = String(parsed.notes || '').trim();
    const fullNotes = `${baseNotes}${paxSuffix}`.trim();

    if (isHotel) {
      const allowedStars = ['5 نجوم', '4 نجوم', '3 نجوم', 'منتجع فاخر'];
      const allowedBoards = [
        'بدون وجبات (RO)',
        'إفطار فقط (BB)',
        'نصف إقامة (فطور + عشاء HB)',
        'إقامة كاملة (FB)',
        'شامل كلياً (All Inclusive)'
      ];
      const starsVal = allowedStars.includes(parsed.stars) ? parsed.stars : '4 نجوم';
      const boardVal = allowedBoards.includes(parsed.boardType) ? parsed.boardType : 'إفطار فقط (BB)';

      return res.json({
        passengers,
        voucher: {
          hotelName: String(parsed.hotelName || ''),
          stars: starsVal,
          boardType: boardVal,
          notes: fullNotes,
          voucherFileName: fileName || 'hotel-voucher'
        }
      });
    }

    res.json({
      passengers,
      voucher: {
        from: String(parsed.from || ''),
        to: String(parsed.to || ''),
        date: String(parsed.date || ''),
        notes: fullNotes,
        voucherFileName: fileName || 'transfer-voucher'
      }
    });
  } catch (err) {
    console.error('Voucher extraction error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحليل ملف الفاوشر' });
  }
});

// ==================== DEFAULT BOOKING TERMS SETTINGS ====================
db.run(`CREATE TABLE IF NOT EXISTS app_settings (setting_key VARCHAR(100) PRIMARY KEY, setting_value TEXT NOT NULL)`);

app.get('/api/settings/default-terms', (req, res) => {
  db.get(`SELECT setting_value FROM app_settings WHERE setting_key = 'default_terms'`, [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ defaultTerms: row ? row.setting_value : '' });
  });
});

app.put('/api/settings/default-terms', (req, res) => {
  const { defaultTerms } = req.body;
  if (typeof defaultTerms !== 'string') {
    return res.status(400).json({ error: 'نص الشروط غير صالح' });
  }
  db.run(
    `INSERT INTO app_settings (setting_key, setting_value) VALUES ('default_terms', ?)
     ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value`,
    [defaultTerms],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, defaultTerms });
    }
  );
});

// ==================== AI TRAVEL ASSISTANT ENDPOINT (GEMINI API) ====================
app.post('/api/ai/chat', async (req, res) => {
  const { message, booking, weatherSummary, history } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'يرجى إرسال نص السؤال' });
  }

  if (!GEMINI_API_KEY) {
    return res.status(200).json({
      reply: `⚠️ لم يتم ضبط مفتاح الذكاء الاصطناعي **GEMINI_API_KEY** على Railway بعد.

ل تفعيل الذكاء الاصطناعي الحقيقي الذي يجيب على أي سؤال عن السفر:
1. احصل على مفتاح API مجاني أو مدفوع من Google AI Studio.
2. في لوحة تحكم **Railway**، اذهب إلى تبويب **Variables**.
3. أضف متغير جديد باسم \`GEMINI_API_KEY\` وقيمته مفتاحك.
4. أعد النشر (Redeploy) وسيعمل المساعد الذكي بكامل طاقته على جميع أسئلة السفر!`,
      usedRealAI: false
    });
  }

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });

  const cleanItinerary = Array.isArray(booking?.itinerary)
    ? booking.itinerary.map(({ flightFileData, voucherFileData, ...rest }) => rest)
    : [];

  const bookingContext = booking
    ? JSON.stringify(
        {
          pnr: booking.pnr,
          passenger: `${booking.firstName} ${booking.lastName}`,
          destinationCity: booking.city,
          currentDate: today,
          totalPrice: `${booking.price} ${booking.currency}`,
          terms: booking.terms,
          itinerary: cleanItinerary
        },
        null,
        2
      )
    : 'لا يوجد حجز محدد حالياً.';

  const weatherContext =
    Array.isArray(weatherSummary) && weatherSummary.length > 0
      ? weatherSummary.join('\n')
      : 'غير متوفر حالياً.';

  const systemInstruction = `أنت مساعد سفر ذكي وخبير سياحي متكامل لوكالة "Nadlantours" (ندلان تورز).
تاريخ اليوم الفعلي هو: ${today}.
مهمتك مساعدة المسافر في **أي شيء يتعلق بالسفر** بأسلوب ودود، عملي، ودقيق باللغة العربية:
- اعتمد على تاريخ اليوم الفعلي (${today}) فقط عند حساب عدد الأيام المتبقية للرحلة أو الإجابة عن أي سؤال يتعلق بالوقت والتواريخ.
- قراءة وفهم تفاصيل حجز المسافر من قاعدة البيانات (الرحلات، الفنادق، التوصيلات، الجولات، السعر، الشروط).
- بناء جداول يومية مخصصة حسب اهتمامات المسافر (عائلات، أزواج، تسوق، طبيعة، أطفال، ميزانية).
- عند السؤال عن مطاعم حلال أو مقاهي أو أماكن سياحية: اذكر فقط أسماء مطاعم حقيقية ومشهورة ومؤكدة الوجود فعلياً في مدينة الوجهة (${booking?.city || ''})، ويُمنع منعاً باتاً اختراع أو تخمين أي اسم مطعم غير موجود أو غير متأكد من وجوده الحقيقي. اذكر اسم المطعم الحقيقي، نوع الطعام، والحي أو المنطقة، وأضف رابط بحث خرائط جوجل بصيغة: https://www.google.com/maps/search/?api=1&query=اسم+المطعم+اسم+المدينة
- اقتراح وسائل مواصلات (مترو، تاكسي، أوبر، قطارات، استئجار سيارة)، رحلات قريبة من الوجهة، نصائح السفر، التأشيرات/الجمارك العامة، الحقائب، العملات، التحويلات، لغة التواصل السريعة، وفيوز الكهرباء.
- الإجابة بوضوح وبدون تقييد بأسئلة جاهزة. إذا سأل المسافر عن شيء خارج بيانات الحجز، أجب بمعرفتك السياحية الواسعة والعملية.

بيانات حجز المسافر الحالية:
${bookingContext}

توقعات الطقس الحالية للوجهة:
${weatherContext}`;

  const contents = [];
  if (Array.isArray(history)) {
    for (const turn of history.slice(-8)) {
      if (turn && (turn.role === 'user' || turn.role === 'model') && turn.text) {
        contents.push({
          role: turn.role,
          parts: [{ text: String(turn.text) }]
        });
      }
    }
  }
  contents.push({
    role: 'user',
    parts: [{ text: message }]
  });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          contents,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1500
          }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      const apiErrMsg = data?.error?.message || 'خطأ من خدمة الذكاء الاصطناعي';
      return res.status(502).json({ error: `تعذر الحصول على رد من Gemini API: ${apiErrMsg}` });
    }

    const replyText =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || '')
        .join('')
        .trim() || 'عذراً، لم أتمكن من صياغة رد واضح الآن. جرّب إعادة صياغة سؤالك.';

    res.json({ reply: replyText, usedRealAI: true });
  } catch (err) {
    console.error('Gemini API error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء الاتصال بواجهة الذكاء الاصطناعي.' });
  }
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === '300795') {
    res.json({ success: true, token: 'nadlan-admin-session-2026' });
  } else {
    res.status(401).json({ success: false, message: 'رمز المرور غير صحيح' });
  }
});

app.post('/api/customer/login', (req, res) => {
  const { pnr, lastName } = req.body;
  if (!pnr || !lastName) {
    return res.status(400).json({ error: 'يرجى إدخال رقم PNR واسم العائلة' });
  }

  cleanupExpiredBookings(() => {
    db.get(
      `SELECT * FROM bookings WHERE UPPER(pnr) = UPPER(?) AND TRIM(last_name) = TRIM(?)`,
      [pnr.trim(), lastName.trim()],
      (err, bookingRow) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!bookingRow) return res.status(404).json({ error: 'لم يتم العثور على حجز مطابق' });

        db.all(
          `SELECT * FROM itinerary_steps WHERE booking_id = ? ORDER BY step_order ASC`,
          [bookingRow.id],
          (err2, stepRows) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json(formatBookingRow(bookingRow, stepRows));
          }
        );
      }
    );
  });
});

// ==================== AI TRAVEL ASSISTANT ENDPOINT (GEMINI API) ====================
app.post('/api/ai/chat', async (req, res) => {
  const { message, booking, weatherSummary, history } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'يرجى إرسال نص السؤال' });
  }

  if (!GEMINI_API_KEY) {
    return res.status(200).json({
      reply: `⚠️ لم يتم ضبط مفتاح الذكاء الاصطناعي **GEMINI_API_KEY** على Railway بعد.

ل تفعيل الذكاء الاصطناعي الحقيقي الذي يجيب على أي سؤال عن السفر:
1. احصل على مفتاح API مجاني أو مدفوع من Google AI Studio.
2. في لوحة تحكم **Railway**، اذهب إلى تبويب **Variables**.
3. أضف متغير جديد باسم \`GEMINI_API_KEY\` وقيمته مفتاحك.
4. أعد النشر (Redeploy) وسيعمل المساعد الذكي بكامل طاقته على جميع أسئلة السفر!`,
      usedRealAI: false
    });
  }

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });

  const cleanItinerary = Array.isArray(booking?.itinerary)
    ? booking.itinerary.map(({ flightFileData, voucherFileData, ...rest }) => rest)
    : [];

  const bookingContext = booking
    ? JSON.stringify(
        {
          pnr: booking.pnr,
          passenger: `${booking.firstName} ${booking.lastName}`,
          destinationCity: booking.city,
          currentDate: today,
          totalPrice: `${booking.price} ${booking.currency}`,
          terms: booking.terms,
          itinerary: cleanItinerary
        },
        null,
        2
      )
    : 'لا يوجد حجز محدد حالياً.';

  const weatherContext =
    Array.isArray(weatherSummary) && weatherSummary.length > 0
      ? weatherSummary.join('\n')
      : 'غير متوفر حالياً.';

  const systemInstruction = `أنت مساعد سفر ذكي وخبير سياحي متكامل لوكالة "Nadlantours" (ندلان تورز).
تاريخ اليوم الفعلي هو: ${today}.
مهمتك مساعدة المسافر في **أي شيء يتعلق بالسفر** بأسلوب ودود، عملي، ودقيق باللغة العربية:
- اعتمد على تاريخ اليوم الفعلي (${today}) فقط عند حساب عدد الأيام المتبقية للرحلة أو الإجابة عن أي سؤال يتعلق بالوقت والتواريخ.
- قراءة وفهم تفاصيل حجز المسافر من قاعدة البيانات (الرحلات، الفنادق، التوصيلات، الجولات، السعر، الشروط).
- بناء جداول يومية مخصصة حسب اهتمامات المسافر (عائلات، أزواج، تسوق، طبيعة، أطفال، ميزانية).
- عند السؤال عن مطاعم حلال أو مقاهي أو أماكن سياحية: اذكر فقط أسماء مطاعم حقيقية ومشهورة ومؤكدة الوجود فعلياً في مدينة الوجهة (${booking?.city || ''})، ويُمنع منعاً باتاً اختراع أو تخمين أي اسم مطعم غير موجود أو غير متأكد من وجوده الحقيقي. اذكر اسم المطعم الحقيقي، نوع الطعام، والحي أو المنطقة، وأضف رابط بحث خرائط جوجل بصيغة: https://www.google.com/maps/search/?api=1&query=اسم+المطعم+اسم+المدينة
- اقتراح وسائل مواصلات (مترو، تاكسي، أوبر، قطارات، استئجار سيارة)، رحلات قريبة من الوجهة، نصائح السفر، التأشيرات/الجمارك العامة، الحقائب، العملات، التحويلات، لغة التواصل السريعة، وفيوز الكهرباء.
- الإجابة بوضوح وبدون تقييد بأسئلة جاهزة. إذا سأل المسافر عن شيء خارج بيانات الحجز، أجب بمعرفتك السياحية الواسعة والعملية.

بيانات حجز المسافر الحالية:
${bookingContext}

توقعات الطقس الحالية للوجهة:
${weatherContext}`;

  const contents = [];
  if (Array.isArray(history)) {
    for (const turn of history.slice(-8)) {
      if (turn && (turn.role === 'user' || turn.role === 'model') && turn.text) {
        contents.push({
          role: turn.role,
          parts: [{ text: String(turn.text) }]
        });
      }
    }
  }
  contents.push({
    role: 'user',
    parts: [{ text: message }]
  });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          contents,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1500
          }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      const apiErrMsg = data?.error?.message || 'خطأ من خدمة الذكاء الاصطناعي';
      return res.status(502).json({ error: `تعذر الحصول على رد من Gemini API: ${apiErrMsg}` });
    }

    const replyText =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || '')
        .join('')
        .trim() || 'عذراً، لم أتمكن من صياغة رد واضح الآن. جرّب إعادة صياغة سؤالك.';

    res.json({ reply: replyText, usedRealAI: true });
  } catch (err) {
    console.error('Gemini API error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء الاتصال بواجهة الذكاء الاصطناعي.' });
  }
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === '300795') {
    res.json({ success: true, token: 'nadlan-admin-session-2026' });
  } else {
    res.status(401).json({ success: false, message: 'رمز المرور غير صحيح' });
  }
});

app.post('/api/customer/login', (req, res) => {
  const { pnr, lastName } = req.body;
  if (!pnr || !lastName) {
    return res.status(400).json({ error: 'يرجى إدخال رقم PNR واسم العائلة' });
  }

  cleanupExpiredBookings(() => {
    db.get(
      `SELECT * FROM bookings WHERE UPPER(pnr) = UPPER(?) AND TRIM(last_name) = TRIM(?)`,
      [pnr.trim(), lastName.trim()],
      (err, bookingRow) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!bookingRow) return res.status(404).json({ error: 'لم يتم العثور على حجز مطابق' });

        db.all(
          `SELECT * FROM itinerary_steps WHERE booking_id = ? ORDER BY step_order ASC`,
          [bookingRow.id],
          (err2, stepRows) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json(formatBookingRow(bookingRow, stepRows));
          }
        );
      }
    );
  });
});

app.post('/api/customer/login-legacy-unused', (req, res) => {
  if (!pnr || !lastName) {
    return res.status(400).json({ error: 'يرجى إدخال رقم PNR واسم العائلة' });
  }

  db.get(
    `SELECT * FROM bookings WHERE UPPER(pnr) = UPPER(?) AND TRIM(last_name) = TRIM(?)`,
    [pnr.trim(), lastName.trim()],
    (err, bookingRow) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!bookingRow) return res.status(404).json({ error: 'لم يتم العثور على حجز مطابق' });

      db.all(
        `SELECT * FROM itinerary_steps WHERE booking_id = ? ORDER BY step_order ASC`,
        [bookingRow.id],
        (err2, stepRows) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json(formatBookingRow(bookingRow, stepRows));
        }
      );
    }
  );
});

app.get('/api/bookings', (req, res) => {
  cleanupExpiredBookings(() => {
    db.all(`SELECT * FROM bookings ORDER BY id DESC`, [], (err, bookingRows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (bookingRows.length === 0) return res.json([]);

      db.all(`SELECT * FROM itinerary_steps ORDER BY step_order ASC`, [], (err2, allSteps) => {
        if (err2) return res.status(500).json({ error: err2.message });

        const result = bookingRows.map((b) => {
          const steps = allSteps.filter((s) => s.booking_id === b.id);
          return formatBookingRow(b, steps);
        });
        res.json(result);
      });
    });
  });
});

app.post('/api/bookings', (req, res) => {
  const data = req.body;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function tryGenerateAndInsert() {
    let pnr = 'NDL';
    for (let i = 0; i < 3; i++) {
      pnr += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    db.get(`SELECT id FROM bookings WHERE pnr = ?`, [pnr], (err, existing) => {
      if (existing) return tryGenerateAndInsert();

      const newBooking = { ...data, pnr };
      insertBookingSQL(newBooking, (insertErr) => {
        if (insertErr) return res.status(500).json({ error: insertErr.message });
        res.status(201).json(newBooking);
      });
    });
  }

  tryGenerateAndInsert();
});

app.put('/api/bookings/:pnr', (req, res) => {
  const { pnr } = req.params;
  const b = req.body;

  db.get(`SELECT id FROM bookings WHERE pnr = ?`, [pnr], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'الحجز غير موجود' });

    const bookingId = row.id;
    db.run(
      `UPDATE bookings SET first_name = ?, last_name = ?, phone = ?, city = ?, price = ?, currency = ?, terms = ? WHERE id = ?`,
      [b.firstName, b.lastName, b.phone, b.city, b.price, b.currency, b.terms, bookingId],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ error: updateErr.message });

        db.run(`DELETE FROM itinerary_steps WHERE booking_id = ?`, [bookingId], (delErr) => {
          if (delErr) return res.status(500).json({ error: delErr.message });

          insertStepsSQL(bookingId, b.itinerary, (stepErr) => {
            if (stepErr) return res.status(500).json({ error: stepErr.message });
            res.json({ ...b, pnr });
          });
        });
      }
    );
  });
});

app.delete('/api/bookings/:pnr', (req, res) => {
  const { pnr } = req.params;
  db.run(`DELETE FROM bookings WHERE pnr = ?`, [pnr], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, deleted: this.changes });
  });
});


// ==================== AUTO-CLEANUP EXPIRED FLIGHTS (+1 DAY AFTER DEPARTURE OR RETURN) ====================
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function parseFlightDateTime(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  const normalized = trimmed
    .replace(/صباحاً|صباحا|ص/g, 'AM')
    .replace(/مساءً|مساءا|م/g, 'PM')
    .replace(/ظهراً|ظهرا/g, 'PM')
    .replace(/[|،]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const dateMatch = normalized.match(/(\d{4}-\d{2}-\d{2})/);
  if (!dateMatch) return null;
  const ymd = dateMatch[1];

  const timeMatch = normalized.match(/(\d{1,2}:\d{2})(?:\s*(AM|PM))?/i);
  let hh = 23;
  let mm = 59;
  if (timeMatch) {
    let [hStr, mStr] = timeMatch[1].split(':');
    let h = parseInt(hStr, 10);
    mm = parseInt(mStr, 10);
    const mer = (timeMatch[2] || '').toUpperCase();
    if (mer === 'PM' && h < 12) h += 12;
    if (mer === 'AM' && h === 12) h = 0;
    if (h >= 0 && h <= 23 && mm >= 0 && mm <= 59) {
      hh = h;
    }
  }

  const isoCandidate = `${ymd}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
  const parsed = new Date(isoCandidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getExpirationDeadline(steps) {
  if (!Array.isArray(steps) || steps.length === 0) return null;
  const flightSteps = steps.filter((s) => s.step_type === 'flight' && s.travel_date);
  if (flightSteps.length === 0) return null;

  // For one-way flight, target flight is the single flight (first);
  // for round-trip (multiple flights), target flight is the return flight (last).
  const targetFlight = flightSteps.length === 1 ? flightSteps[0] : flightSteps[flightSteps.length - 1];
  const targetDt = parseFlightDateTime(targetFlight.travel_date);
  if (!targetDt) return null;

  // Delete 1 full day (24 hours) after the one-way flight date or return flight date
  return new Date(targetDt.getTime() + ONE_DAY_MS);
}

function cleanupExpiredBookings(callback) {
  const now = new Date();
  db.all(`SELECT id, pnr FROM bookings`, [], (err, bookingRows) => {
    if (err) {
      console.error('❌ Cleanup query error:', err.message);
      if (callback) callback(err);
      return;
    }
    if (!bookingRows || bookingRows.length === 0) {
      if (callback) callback(null, 0);
      return;
    }

    db.all(`SELECT booking_id, step_type, travel_date FROM itinerary_steps ORDER BY step_order ASC`, [], (err2, allSteps) => {
      if (err2) {
        console.error('❌ Cleanup steps query error:', err2.message);
        if (callback) callback(err2);
        return;
      }

      const expiredIds = [];
      const expiredPnrs = [];

      for (const b of bookingRows) {
        const steps = (allSteps || []).filter((s) => s.booking_id === b.id);
        const deadlineDt = getExpirationDeadline(steps);
        if (deadlineDt && deadlineDt.getTime() < now.getTime()) {
          expiredIds.push(b.id);
          expiredPnrs.push(b.pnr);
        }
      }

      if (expiredIds.length === 0) {
        if (callback) callback(null, 0);
        return;
      }

      const placeholders = expiredIds.map(() => '?').join(',');
      db.run(`DELETE FROM itinerary_steps WHERE booking_id IN (${placeholders})`, expiredIds, (delStepsErr) => {
        if (delStepsErr) {
          console.error('❌ Error deleting expired itinerary steps:', delStepsErr.message);
        }
        db.run(`DELETE FROM bookings WHERE id IN (${placeholders})`, expiredIds, function (delBookErr) {
          if (delBookErr) {
            console.error('❌ Error deleting expired bookings:', delBookErr.message);
            if (callback) callback(delBookErr);
            return;
          }
          console.log(`🧹 Auto-deleted ${this.changes} expired booking(s) (+1 day after flight/return) and all PDFs/vouchers: ${expiredPnrs.join(', ')}`);
          if (callback) callback(null, this.changes);
        });
      });
    });
  });
}

// Run cleanup every 15 minutes
setInterval(() => cleanupExpiredBookings(), 15 * 60 * 1000);

app.listen(PORT, HOST, () => {
  console.log(`🚀 Nadlantours Railway Server running on http://${HOST}:${PORT}`);
  console.log(`🤖 Gemini AI status: ${GEMINI_API_KEY ? 'Configured (' + GEMINI_MODEL + ')' : 'Missing GEMINI_API_KEY env var'}`);
});
