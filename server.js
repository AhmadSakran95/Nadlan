const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "Nadlantours" });
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
      return res.status(response.status).json({
        error: data?.error?.message || "فشل الاتصال بخدمة Gemini."
      });
    }
    return res.json(data);
  } catch (error) {
    console.error("Gemini proxy error:", error);
    return res.status(502).json({ error: "تعذر الاتصال بخدمة Gemini حالياً." });
  }
});

// SPA/static fallback
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Nadlantours running on port ${PORT}`);
});
