const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || '1234';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dbPath = process.env.DB_PATH || path.join(__dirname, 'murafiq.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('خطأ في الاتصال بقاعدة البيانات:', err.message);
    } else {
        console.log('تم الاتصال بقاعدة البيانات SQLite بنجاح.');
        initDatabase();
    }
});

function initDatabase() {
    db.serialize(() => {
        db.run("PRAGMA foreign_keys = ON;");

        db.run(`CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pnr TEXT UNIQUE NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            phone TEXT,
            destination TEXT NOT NULL,
            total_price REAL NOT NULL DEFAULT 0,
            currency TEXT DEFAULT 'USD',
            terms TEXT,
            checked_in INTEGER DEFAULT 0,
            seat_number TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS itinerary_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_id INTEGER NOT NULL,
            item_order INTEGER NOT NULL,
            type TEXT NOT NULL,
            from_location TEXT,
            to_location TEXT,
            departure_datetime TEXT,
            airline TEXT,
            flight_number TEXT,
            hotel_name TEXT,
            stars INTEGER,
            room_type TEXT,
            board_type TEXT,
            check_in_date TEXT,
            check_out_date TEXT,
            vehicle_type TEXT,
            transfer_from TEXT,
            transfer_to TEXT,
            transfer_datetime TEXT,
            notes TEXT,
            FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS destination_guides (
            destination TEXT PRIMARY KEY,
            weather TEXT,
            plug_type TEXT,
            halal_restaurants TEXT,
            attractions TEXT
        )`);

        const guides = [
            {
                destination: 'تركيا',
                weather: 'معتدل نهاراً (18°C - 24°C) ومائل للبرودة ليلاً، يُنصح بسترة خفيفة.',
                plug_type: 'النوع C و F (فيش ثنائي دائري قياسي - 220 فولت).',
                halal_restaurants: 'جميع المطاعم في تركيا تقدم لحوماً حلال 100%. أشهرها: مطعم المدينة، نصرت، ومطاعم السلطان أحمد.',
                attractions: 'آيا صوفيا، المسجد الأزرق، قصر توبكابي، جولة البسفور، بورصة، وطرابزون.'
            },
            {
                destination: 'ماليزيا',
                weather: 'استوائي دافئ ورطب طوال العام (26°C - 32°C) مع زخات مطر استوائية قصيرة.',
                plug_type: 'النوع G (فيش ثلاثي مستطيل بريطاني - 240 فولت).',
                halal_restaurants: 'تتوفر المطاعم الحلال المعتمدة في كل مكان، خاصة في شارع العرب (بوكيت بينتانج).',
                attractions: 'برجا بتروناس التوأم، مرتفعات جنتنج، جزيرة لنكاوي، كهوف باتو، وحديقة الطيور.'
            },
            {
                destination: 'الإمارات',
                weather: 'مشمس ودافئ (24°C - 34°C)، لطيف جداً في المساء.',
                plug_type: 'النوع G (فيش ثلاثي بريطاني - 220 فولت).',
                halal_restaurants: 'جميع المطاعم تقدم أطعمة حلال بالكامل مع خيارات عالمية وعربية متنوعة.',
                attractions: 'برج خليفة، دبي مول، نافورة دبي، متحف المستقبل، جامع الشيخ زايد الكبير.'
            },
            {
                destination: 'البوسنة',
                weather: 'قاري معتدل إلى بارد (12°C - 21°C)، أمطار متفرقة وطبيعة خضراء.',
                plug_type: 'النوع C و F (فيش ثنائي أوروبي دائري - 220 فولت).',
                halal_restaurants: 'تنتشر المطاعم الحلال بكثرة في منطقة باشتشارشيا القديمة في سراييفو.',
                attractions: 'البلدة القديمة في سراييفو، جسر موستار القديم، شلالات يايتسا، ونبع البوسنة.'
            },
            {
                destination: 'اليابان',
                weather: 'معتدل ولطيف (14°C - 22°C) مع أجواء صافية.',
                plug_type: 'النوع A و B (فيش ثنائي مسطح - 100 فولت، ستحتاج محولاً).',
                halal_restaurants: 'مطعم Halal Wagyu Yakiniku Panga في طوكيو، مطعم Ayam-YA Ramen، ومطاعم قرب مسجد طوكيو.',
                attractions: 'جبل فوجي، حي شيبويا، معابد كيوتو التاريخية، أوساكا، وحديقة نارا.'
            }
        ];

        const insertGuide = db.prepare(`INSERT OR IGNORE INTO destination_guides (destination, weather, plug_type, halal_restaurants, attractions) VALUES (?, ?, ?, ?, ?)`);
        guides.forEach(g => insertGuide.run(g.destination, g.weather, g.plug_type, g.halal_restaurants, g.attractions));
        insertGuide.finalize();

        db.get("SELECT COUNT(*) AS count FROM bookings", (err, row) => {
            if (row && row.count === 0) {
                const future14Hours = new Date(Date.now() + 14 * 60 * 60 * 1000).toISOString().slice(0, 16);
                const day1 = new Date(Date.now() + 14 * 60 * 60 * 1000).toISOString().slice(0, 10);
                const day5 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
                const returnFlight = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000).toISOString().slice(0, 16);

                db.run(`INSERT INTO bookings (pnr, first_name, last_name, phone, destination, total_price, currency, terms)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    ['MRF842', 'أحمد', 'المنصور', '+966501234567', 'تركيا', 1850, 'USD', 'يشمل السعر التذاكر الدولية، الإقامة الفندقية مع الإفطار، والاستقبال والتوديع الخاص من وإلى المطار.'],
                    function(err) {
                        if (!err) {
                            const bookingId = this.lastID;
                            const stmt = db.prepare(`INSERT INTO itinerary_items 
                                (booking_id, item_order, type, from_location, to_location, departure_datetime, airline, flight_number, hotel_name, stars, room_type, board_type, check_in_date, check_out_date, vehicle_type, transfer_from, transfer_to, transfer_datetime, notes)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

                            stmt.run(bookingId, 1, 'flight', 'مطار الملك خالد الدولي (RUH)', 'مطار إسطنبول الدولي (IST)', future14Hours, 'الخطوط التركية', 'TK 145', null, null, null, null, null, null, null, null, null, null, 'وزن الأمتعة المسموح: 30 كجم + 8 كجم حقيبة يد');
                            stmt.run(bookingId, 2, 'transfer', null, null, null, null, null, null, null, null, null, null, null, 'مرسيدس فيتو VIP', 'مطار إسطنبول الدولي (IST)', 'فندق سويس أوتيل البسفور', future14Hours, 'السائق ينتظركم عند بوابة الخروج رقم 14');
                            stmt.run(bookingId, 3, 'hotel', null, null, null, null, null, 'Swissôtel The Bosphorus Istanbul', 5, 'غرفة ديلوكس مطلة على البسفور', 'Bed & Breakfast', day1, day5, null, null, null, null, 'تسجيل الدخول الساعة 14:00 ظهراً');
                            stmt.run(bookingId, 4, 'flight', 'مطار إسطنبول الدولي (IST)', 'مطار الملك خالد الدولي (RUH)', returnFlight, 'الخطوط التركية', 'TK 144', null, null, null, null, null, null, null, null, null, null, 'التواجد في المطار قبل 3 ساعات');
                            stmt.finalize();
                        }
                    }
                );
            }
        });
    });
}

function generatePNR() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pnr = '';
    for (let i = 0; i < 6; i++) {
        pnr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pnr;
}

app.post('/api/customer/login', (req, res) => {
    const { pnr, last_name } = req.body;
    if (!pnr || !last_name) {
        return res.status(400).json({ error: 'يرجى إدخال رقم الـ PNR واسم العائلة.' });
    }

    db.get(
        `SELECT * FROM bookings WHERE UPPER(pnr) = UPPER(?) AND TRIM(last_name) = TRIM(?)`,
        [pnr.trim(), last_name.trim()],
        (err, booking) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!booking) return res.status(404).json({ error: 'لم يتم العثور على حجز مطابق. تأكد من رقم الـ PNR واسم العائلة.' });

            db.all(
                `SELECT * FROM itinerary_items WHERE booking_id = ? ORDER BY item_order ASC`,
                [booking.id],
                (err, items) => {
                    if (err) return res.status(500).json({ error: err.message });

                    db.get(
                        `SELECT * FROM destination_guides WHERE destination LIKE ?`,
                        [`%${booking.destination.trim()}%`],
                        (err, guide) => {
                            const defaultGuide = guide || {
                                destination: booking.destination,
                                weather: `يرجى التحقق من النشرة الجوية المحلية لـ ${booking.destination} قبل السفر بـ 48 ساعة.`,
                                plug_type: 'يُنصح بحمل محول كهرباء عالمي لضمان التوافق مع كافة المقابس.',
                                halal_restaurants: `تتوفر خيارات المطاعم الحلال والمأكولات البحرية في المناطق السياحية الرئيسية في ${booking.destination}.`,
                                attractions: `استكشف أبرز المعالم التاريخية والأسواق المحلية في ${booking.destination} عبر مساعد المرافق الذكي.`
                            };

                            res.json({ booking, itinerary: items, guide: defaultGuide });
                        }
                    );
                }
            );
        }
    );
});

app.post('/api/customer/checkin', (req, res) => {
    const { pnr, last_name, seat_preference } = req.body;
    const rows = ['12', '14', '15', '18', '21', '24'];
    const cols = seat_preference === 'window' ? ['A', 'F'] : seat_preference === 'aisle' ? ['C', 'D'] : ['B', 'E'];
    const seat = rows[Math.floor(Math.random() * rows.length)] + cols[Math.floor(Math.random() * cols.length)];

    db.run(
        `UPDATE bookings SET checked_in = 1, seat_number = ? WHERE UPPER(pnr) = UPPER(?) AND TRIM(last_name) = TRIM(?)`,
        [seat, pnr.trim(), last_name.trim()],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'الحجز غير موجود.' });
            res.json({ success: true, seat_number: seat });
        }
    );
});

app.post('/api/customer/ai-chat', (req, res) => {
    const { message, booking, itinerary, guide } = req.body;
    const q = (message || '').toLowerCase();

    let reply = '';
    if (q.includes('طيران') || q.includes('رحل') || q.includes('مطار') || q.includes('موعد')) {
        const flights = (itinerary || []).filter(i => i.type === 'flight');
        reply = flights.length > 0
            ? 'إليك تفاصيل رحلات الطيران الخاصة بك:\n' + flights.map((f, idx) => `${idx + 1}. من ${f.from_location} إلى ${f.to_location} — الموعد: ${(f.departure_datetime || '').replace('T', ' ')} (${f.airline || ''} ${f.flight_number || ''})`).join('\n')
            : 'لا توجد رحلات طيران مسجلة في برنامجك الحالي.';
    } else if (q.includes('فندق') || q.includes('اقام') || q.includes('إقام') || q.includes('غرف') || q.includes('فطور')) {
        const hotels = (itinerary || []).filter(i => i.type === 'hotel');
        reply = hotels.length > 0
            ? 'تفاصيل إقامتك الفندقية:\n' + hotels.map((h, idx) => `${idx + 1}. ${h.hotel_name} (${h.stars} نجوم) — الغرفة: ${h.room_type} — نظام الوجبات: ${h.board_type} — من ${h.check_in_date} إلى ${h.check_out_date}`).join('\n')
            : 'لا توجد حجوزات فنادق مسجلة في برنامجك.';
    } else if (q.includes('توصيل') || q.includes('مواصلات') || q.includes('سيار') || q.includes('سائق')) {
        const transfers = (itinerary || []).filter(i => i.type === 'transfer');
        reply = transfers.length > 0
            ? 'تفاصيل المواصلات الخاصة بك:\n' + transfers.map((t, idx) => `${idx + 1}. ${t.vehicle_type}: من ${t.transfer_from} إلى ${t.transfer_to} — الموعد: ${(t.transfer_datetime || '').replace('T', ' ')}`).join('\n')
            : 'لا توجد خدمات توصيل مسجلة في برنامجك.';
    } else if (q.includes('طقس') || q.includes('جو') || q.includes('ملابس')) {
        reply = `حالة الطقس المتوقعة في ${booking.destination}: ${guide.weather}`;
    } else if (q.includes('فيش') || q.includes('كهرب') || q.includes('شاحن')) {
        reply = `معلومات الكهرباء في ${booking.destination}: ${guide.plug_type}`;
    } else if (q.includes('مطعم') || q.includes('مطاعم') || q.includes('حلال') || q.includes('اكل') || q.includes('أكل')) {
        reply = `المطاعم الحلال في ${booking.destination}: ${guide.halal_restaurants}`;
    } else if (q.includes('سياح') || q.includes('اماكن') || q.includes('أماكن') || q.includes('زيار')) {
        reply = `أبرز المناطق السياحية في ${booking.destination}: ${guide.attractions}`;
    } else if (q.includes('سعر') || q.includes('شروط') || q.includes('تكلف')) {
        reply = `إجمالي تكلفة برنامجك: ${booking.total_price} ${booking.currency}.\nشروط الحجز: ${booking.terms || 'لا توجد شروط إضافية.'}`;
    } else {
        reply = `أهلاً بك يا ${booking.first_name}! أنا مساعدك الشخصي لرحلتك إلى ${booking.destination} (حجز رقم ${booking.pnr}). يمكنك سؤالي عن: مواعيد الطيران، تفاصيل الفندق، المواصلات، حالة الطقس، نوع فيش الكهرباء، المطاعم الحلال، أو الأماكن السياحية.`;
    }

    res.json({ reply });
});

app.post('/api/admin/auth', (req, res) => {
    const { passcode } = req.body;
    if (passcode === ADMIN_PASSCODE) {
        res.json({ authenticated: true });
    } else {
        res.status(401).json({ error: 'رمز الإدارة غير صحيح.' });
    }
});

app.get('/api/admin/bookings', (req, res) => {
    db.all(`SELECT * FROM bookings ORDER BY created_at DESC`, [], (err, bookings) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(bookings);
    });
});

app.post('/api/admin/bookings', (req, res) => {
    const { first_name, last_name, phone, destination, total_price, currency, terms, itinerary } = req.body;

    if (!first_name || !last_name || !destination) {
        return res.status(400).json({ error: 'يرجى إدخال اسم الزبون، اسم العائلة، والوجهة.' });
    }

    const pnr = generatePNR();

    db.run(
        `INSERT INTO bookings (pnr, first_name, last_name, phone, destination, total_price, currency, terms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [pnr, first_name.trim(), last_name.trim(), phone || '', destination.trim(), total_price || 0, currency || 'USD', terms || ''],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            const bookingId = this.lastID;

            if (Array.isArray(itinerary) && itinerary.length > 0) {
                const stmt = db.prepare(`INSERT INTO itinerary_items 
                    (booking_id, item_order, type, from_location, to_location, departure_datetime, airline, flight_number, hotel_name, stars, room_type, board_type, check_in_date, check_out_date, vehicle_type, transfer_from, transfer_to, transfer_datetime, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

                itinerary.forEach((item, index) => {
                    stmt.run(
                        bookingId,
                        index + 1,
                        item.type,
                        item.from_location || null,
                        item.to_location || null,
                        item.departure_datetime || null,
                        item.airline || null,
                        item.flight_number || null,
                        item.hotel_name || null,
                        item.stars || null,
                        item.room_type || null,
                        item.board_type || null,
                        item.check_in_date || null,
                        item.check_out_date || null,
                        item.vehicle_type || null,
                        item.transfer_from || null,
                        item.transfer_to || null,
                        item.transfer_datetime || null,
                        item.notes || null
                    );
                });
                stmt.finalize();
            }

            res.json({ success: true, pnr, booking_id: bookingId });
        }
    );
});

app.delete('/api/admin/bookings/:id', (req, res) => {
    db.run(`DELETE FROM bookings WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`تطبيق المرافق يعمل الآن على المنفذ: ${PORT}`);
});
