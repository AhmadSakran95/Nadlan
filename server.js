const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
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
    .join("\n")
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
  const groqKey = process.env.GROQ_API_KEY || "Gsk_jMoQGTMuotZyXmEb30y8WGdyb3FYcAGAoh400ZrAfYX8L8SZvxqL";
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
