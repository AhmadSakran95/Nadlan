const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json());
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

function initDatabase() {
  db.run('PRAGMA foreign_keys = ON');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema, (err) => {
    if (err) {
      console.error('❌ Schema execution error:', err.message);
    } else {
      seedInitialBookings();
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
    (booking_id, step_order, step_type, from_location, to_location, travel_date, hotel_name, stars, board_type, tour_title, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      s.notes || null
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
      notes: s.notes || ''
    }))
  };
}

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === '1234') {
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

app.listen(PORT, HOST, () => {
  console.log(`🚀 Nadlantours Railway Server running on http://${HOST}:${PORT}`);
});
