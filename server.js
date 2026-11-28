const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";

app.use(express.json({ limit: "8mb" }));
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

const weatherCache = new Map();
const WEATHER_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // ساعتان

function mapWeatherCodeToArabic(code) {
  if (code === 0) return "صافٍ";
  if ([1, 2].includes(code)) return "غائم جزئياً";
  if (code === 3) return "غائم";
  if ([45, 48].includes(code)) return "ضباب";
  if ([51, 53, 55, 61, 63, 80, 81].includes(code)) return "زخات خفيفة إلى متوسطة";
  if ([65, 82].includes(code)) return "أمطار غزيرة";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "ثلوج";
  if ([95, 96, 99].includes(code)) return "عواصف رعدية";
  return "متقلب";
}

app.get("/api/weather", async (req, res) => {
  try {
    const city = String(req.query.city || "").trim();
    if (!city) {
      return res.status(400).json({ error: "يرجى تحديد اسم المدينة (city)." });
    }

    const cacheKey = city.toLowerCase();
    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < WEATHER_CACHE_TTL_MS) {
      return res.json({ ok: true, cached: true, ...cached.data });
    }

    // 1) تحويل اسم المدينة إلى إحداثيات (خط عرض وطول)
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ar&format=json`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json().catch(() => ({}));
    const place = geoData?.results?.[0];

    if (!place) {
      return res.status(404).json({ error: `لم يتم العثور على مدينة باسم "${city}".` });
    }

    // 2) جلب توقعات الطقس لـ 5 أيام
    const forecastUrl =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${place.latitude}` +
      `&longitude=${place.longitude}` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min` +
      `&timezone=auto&forecast_days=5`;

    const forecastRes = await fetch(forecastUrl);
    const forecastData = await forecastRes.json().catch(() => ({}));
    const daily = forecastData?.daily;

    if (!daily || !Array.isArray(daily.time)) {
      return res.status(502).json({ error: "تعذر جلب توقعات الطقس من المزود." });
    }

    const days = daily.time.map((date, idx) => {
      const code = daily.weathercode?.[idx];
      return {
        date,
        maxTemp: Math.round(daily.temperature_2m_max?.[idx]),
        minTemp: Math.round(daily.temperature_2m_min?.[idx]),
        condition: mapWeatherCodeToArabic(code),
        code
      };
    });

    const payload = {
      city: place.name,
      country: place.country || "",
      days
    };

    weatherCache.set(cacheKey, { ts: Date.now(), data: payload });
    return res.json({ ok: true, cached: false, ...payload });
  } catch (error) {
    console.error("Weather API error:", error);
    return res.status(500).json({ error: "حدث خطأ أثناء جلب بيانات الطقس." });
  }
});

const halalCache = new Map();
const HALAL_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 ساعات

app.get("/api/halal-restaurants", async (req, res) => {
  try {
    const city = String(req.query.city || "").trim();
    const query = String(req.query.query || "halal restaurant").trim() || "halal restaurant";
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 5);

    if (!city) {
      return res.status(400).json({ error: "يرجى تحديد اسم المدينة (city)." });
    }

    const fsqKey = process.env.FOURSQUARE_API_KEY;
    if (!fsqKey) {
      return res.status(503).json({ error: "FOURSQUARE_API_KEY غير مضبوط." });
    }

    const cacheKey = `${city.toLowerCase()}__${query.toLowerCase()}__${limit}`;
    const cached = halalCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < HALAL_CACHE_TTL_MS) {
      return res.json({ ok: true, cached: true, restaurants: cached.restaurants });
    }

    const url = new URL("https://api.foursquare.com/v3/places/search");
    url.searchParams.set("query", query);
    url.searchParams.set("near", city);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("fields", "name,rating,categories,location");

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: fsqKey,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Foursquare HTTP ${response.status}` });
    }

    const data = await response.json().catch(() => ({}));
    const restaurants = (Array.isArray(data?.results) ? data.results : [])
      .slice(0, limit)
      .map((place, idx) => ({
        name: String(place?.name || `مطعم حلال ${idx + 1}`).trim(),
        rating:
          typeof place?.rating === "number"
            ? `${(place.rating > 5 ? place.rating / 2 : place.rating).toFixed(1)} ★`
            : "4.6 ★",
        cuisine:
          place?.categories?.[0]?.name ||
          place?.location?.neighborhood ||
          place?.location?.locality ||
          city
      }));

    halalCache.set(cacheKey, { ts: Date.now(), restaurants });
    return res.json({ ok: true, cached: false, restaurants });
  } catch (error) {
    console.error("Foursquare halal route error:", error);
    return res.status(500).json({ error: "حدث خطأ أثناء جلب المطاعم من Foursquare." });
  }
});

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

const geminiCache = new Map();
const GEMINI_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 ساعات

function getCacheKeyForGemini(body) {
  try {
    const textPart = body?.contents?.[0]?.parts?.find((p) => typeof p?.text === "string")?.text || "";
    const cityMatch = textPart.match(/لمدينة\s+"([^"]+)"/);
    if (cityMatch && cityMatch[1]) {
      return `dest_intel_${cityMatch[1].trim().toLowerCase()}`;
    }
    return null;
  } catch (_) {
    return null;
  }
}

function buildGroqMessagesFromGeminiBody(body) {
  const messages = [];
  const systemText = body?.systemInstruction?.parts
    ?.map((p) => (typeof p?.text === "string" ? p.text : ""))
    .filter(Boolean)
    .join("\\n")
    .trim();

  if (systemText) {
    messages.push({ role: "system", content: systemText });
  }

  let hasPdf = false;
  let hasImage = false;

  const contents = Array.isArray(body?.contents) ? body.contents : [];
  for (const turn of contents) {
    const role = turn?.role === "model" ? "assistant" : "user";
    const parts = Array.isArray(turn?.parts) ? turn.parts : [];
    const contentParts = [];

    for (const part of parts) {
      if (typeof part?.text === "string" && part.text.trim()) {
        contentParts.push({ type: "text", text: part.text });
      } else if (part?.inlineData?.data && part?.inlineData?.mimeType) {
        const mime = String(part.inlineData.mimeType).toLowerCase();
        if (mime.includes("pdf")) {
          hasPdf = true;
        } else if (mime.startsWith("image/")) {
          hasImage = true;
          contentParts.push({
            type: "image_url",
            image_url: {
              url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
            }
          });
        }
      }
    }

    if (contentParts.length === 1 && contentParts[0].type === "text") {
      messages.push({ role, content: contentParts[0].text });
    } else if (contentParts.length > 0) {
      messages.push({ role, content: contentParts });
    }
  }

  // تأكد أن أول رسالة بعد system هي user لتجنب رفض Groq
  const firstNonSystemIdx = messages.findIndex((m) => m.role !== "system");
  if (firstNonSystemIdx !== -1 && messages[firstNonSystemIdx].role === "assistant") {
    messages.splice(firstNonSystemIdx, 1);
  }

  const wantsJson = body?.generationConfig?.responseMimeType === "application/json";
  return { messages, hasPdf, hasImage, wantsJson };
}

async function callGroqFallback(body, groqApiKey) {
  const { messages, hasPdf, hasImage, wantsJson } = buildGroqMessagesFromGeminiBody(body);
  if (hasPdf || !messages.length) {
    return { ok: false, reason: hasPdf ? "PDF غير مدعوم مباشرة في Groq" : "محتوى فارغ" };
  }

  const modelToUse = hasImage ? GROQ_VISION_MODEL : GROQ_MODEL;
  const payload = {
    model: modelToUse,
    messages,
    temperature: 0.3
  };
  if (wantsJson && !hasImage) {
    payload.response_format = { type: "json_object" };
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqApiKey}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, reason: data?.error?.message || `Groq HTTP ${response.status}` };
  }

  const text = data?.choices?.[0]?.message?.content || "";
  if (!text) {
    return { ok: false, reason: "رد فارغ من Groq" };
  }

  return {
    ok: true,
    provider: "groq",
    geminiFormatted: {
      candidates: [
        {
          content: {
            role: "model",
            parts: [{ text }]
          }
        }
      ]
    }
  };
}

app.post("/api/gemini", async (req, res) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  console.log("HIT /api/gemini - geminiKey exists:", Boolean(geminiKey), "groqKey exists:", Boolean(groqKey));
  if (!geminiKey && !groqKey) {
    return res.status(503).json({
      error: "المساعد الذكي غير مفعّل. أضف GEMINI_API_KEY أو GROQ_API_KEY في متغيرات Railway."
    });
  }

  const cacheKey = getCacheKeyForGemini(req.body);
  if (cacheKey) {
    const cached = geminiCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < GEMINI_CACHE_TTL_MS) {
      return res.json(cached.data);
    }
  }

  let geminiErrorMsg = "تعذر الاتصال بخدمة Gemini.";
  let shouldFallbackToGroq = !geminiKey;

  if (geminiKey) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(geminiKey)}`;
    const bodyStr = JSON.stringify(req.body);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyStr
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        if (cacheKey && data) {
          geminiCache.set(cacheKey, { ts: Date.now(), data });
        }
        return res.json(data);
      }

      geminiErrorMsg = data?.error?.message || `Gemini HTTP ${response.status}`;
      if (
        response.status === 400 ||
        response.status === 404 ||
        response.status === 429 ||
        response.status >= 500
      ) {
        shouldFallbackToGroq = true;
      } else {
        return res.status(response.status).json({ error: geminiErrorMsg });
      }
    } catch (error) {
      console.error("Gemini primary error, switching to Groq:", error.message);
      shouldFallbackToGroq = true;
    }
  }

  if (shouldFallbackToGroq && groqKey) {
    console.log("Fallback to Groq triggered | geminiError:", geminiErrorMsg);
    const groqResult = await callGroqFallback(req.body, groqKey);
    if (groqResult.ok) {
      if (cacheKey && groqResult.geminiFormatted) {
        geminiCache.set(cacheKey, { ts: Date.now(), data: groqResult.geminiFormatted });
      }
      return res.json(groqResult.geminiFormatted);
    }
    console.error("Groq fallback failed reason:", groqResult.reason);
    return res.status(429).json({
      error: `تعذر إتمام الطلب عبر Gemini (${geminiErrorMsg}) و Groq (${groqResult.reason}).`
    });
  }

  return res.status(429).json({ error: geminiErrorMsg });
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
