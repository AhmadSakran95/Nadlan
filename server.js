const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "public")));

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    })
  : null;

let databaseReady;
async function ensureDatabase() {
  if (!pool) throw new Error("DATABASE_URL غير مضبوط. اربطي خدمة PostgreSQL مع التطبيق في Railway.");
  if (!databaseReady) {
    databaseReady = pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        pnr TEXT NOT NULL,
        booking_data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS bookings_pnr_idx ON bookings (pnr);
    `).catch((error) => {
      databaseReady = null;
      throw error;
    });
  }
  await databaseReady;
}

app.get("/api/health", async (_req, res) => {
  try {
    await ensureDatabase();
    await pool.query("SELECT 1");
    res.json({ ok: true, service: "Nadlantours", database: "connected" });
  } catch (error) {
    res.status(503).json({ ok: false, service: "Nadlantours", database: "disconnected", error: error.message });
  }
});

// Booking data is stored in Railway PostgreSQL, not in the visitor's browser.
app.get("/api/bookings", async (_req, res) => {
  try {
    await ensureDatabase();
    const result = await pool.query(
      "SELECT booking_data FROM bookings ORDER BY created_at DESC, id DESC"
    );
    res.json({ bookings: result.rows.map((row) => row.booking_data) });
  } catch (error) {
    console.error("Bookings read error:", error);
    res.status(503).json({ error: "تعذر قراءة الحجوزات من قاعدة البيانات. تأكدي من ربط PostgreSQL في Railway." });
  }
});

app.post("/api/bookings", async (req, res) => {
  try {
    await ensureDatabase();
    const booking = req.body;
    if (!booking || typeof booking !== "object" || Array.isArray(booking)) {
      return res.status(400).json({ error: "بيانات الحجز غير صالحة." });
    }
    const id = String(booking.id || "").trim();
    const pnr = String(booking.pnr || "").trim().toUpperCase();
    if (!id || !pnr || !booking.firstName || !booking.lastName) {
      return res.status(400).json({ error: "يرجى إدخال رقم الحجز واسم الزبون." });
    }
    const saved = { ...booking, id, pnr };
    await pool.query(
      `INSERT INTO bookings (id, pnr, booking_data)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         pnr = EXCLUDED.pnr,
         booking_data = EXCLUDED.booking_data,
         updated_at = NOW()`,
      [id, pnr, JSON.stringify(saved)]
    );
    res.json({ ok: true, booking: saved });
  } catch (error) {
    console.error("Booking save error:", error);
    res.status(500).json({ error: "تعذر حفظ الحجز في قاعدة البيانات." });
  }
});

app.delete("/api/bookings/:id", async (req, res) => {
  try {
    await ensureDatabase();
    const result = await pool.query("DELETE FROM bookings WHERE id = $1", [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: "الحجز غير موجود." });
    res.json({ ok: true });
  } catch (error) {
    console.error("Booking delete error:", error);
    res.status(500).json({ error: "تعذر حذف الحجز من قاعدة البيانات." });
  }
});

app.post("/api/gemini", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "المساعد الذكي غير مفعّل. أضف GEMINI_API_KEY في متغيرات Railway."
    });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body)
      }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || "فشل الاتصال بخدمة Gemini." });
    }
    return res.json(data);
  } catch (error) {
    console.error("Gemini proxy error:", error);
    return res.status(502).json({ error: "تعذر الاتصال بخدمة Gemini حالياً." });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Nadlantours running on port ${PORT}`);
});

process.on("SIGTERM", async () => {
  if (pool) await pool.end().catch(() => {});
  process.exit(0);
});
