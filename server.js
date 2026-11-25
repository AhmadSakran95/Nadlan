// خادم ويب بسيط وسريع لتشغيل موقع ندلان تورز على Railway
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

function resolveIndexHtmlPath() {
  const candidates = [
    path.join(__dirname, "index.html"),
    path.join(process.cwd(), "index.html"),
    "/app/index.html"
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (_) {}
  }
  return path.join(__dirname, "index.html");
}

function resolveDataDir() {
  const candidates = [
    process.env.DATA_DIR,
    "/app/data",
    path.join(__dirname, "data")
  ].filter(Boolean);

  for (const dir of candidates) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
      return dir;
    } catch (_) {}
  }
  return __dirname;
}

const DATA_DIR = resolveDataDir();
const BOOKINGS_FILE = path.join(DATA_DIR, "bookings.json");

function readBookingsFile() {
  try {
    if (!fs.existsSync(BOOKINGS_FILE)) return [];
    const raw = fs.readFileSync(BOOKINGS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function writeBookingsFile(list) {
  try {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(Array.isArray(list) ? list : [], null, 2), "utf8");
    return true;
  } catch (_) {
    return false;
  }
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const cleanUrl = (req.url || "/").split("?")[0];
  const method = (req.method || "GET").toUpperCase();

  if (cleanUrl === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("OK");
  }

  if (cleanUrl === "/api/bookings") {
    if (method === "GET") {
      const list = readBookingsFile();
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-cache"
      });
      return res.end(JSON.stringify({ ok: true, bookings: list }));
    }

    if (method === "POST" || method === "PUT") {
      try {
        const body = await readJsonBody(req);
        const incoming = body && body.booking ? body.booking : body;
        if (!incoming || !incoming.pnr) {
          res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
          return res.end(JSON.stringify({ ok: false, error: "بيانات الحجز غير مكتملة" }));
        }
        const current = readBookingsFile();
        const normalizedId = incoming.id || `b-${Date.now()}`;
        const updatedBooking = { ...incoming, id: normalizedId, updatedAt: Date.now() };
        const idx = current.findIndex(
          (b) => b.id === normalizedId || String(b.pnr || "").toUpperCase() === String(updatedBooking.pnr).toUpperCase()
        );
        if (idx !== -1) {
          current[idx] = { ...current[idx], ...updatedBooking, id: current[idx].id };
        } else {
          current.unshift(updatedBooking);
        }
        writeBookingsFile(current);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({ ok: true, booking: current[idx !== -1 ? idx : 0], bookings: current }));
      } catch (_) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        return res.end(JSON.stringify({ ok: false, error: "تعذر قراءة بيانات الطلب" }));
      }
    }
  }

  const deleteMatch = cleanUrl.match(/^\/api\/bookings\/([^/]+)$/);
  if (deleteMatch && method === "DELETE") {
    const targetId = decodeURIComponent(deleteMatch[1]);
    const current = readBookingsFile();
    const filtered = current.filter((b) => b.id !== targetId);
    writeBookingsFile(filtered);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify({ ok: true, bookings: filtered }));
  }

  const htmlPath = resolveIndexHtmlPath();
  fs.readFile(htmlPath, "utf8", (err, content) => {
    if (err) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head><meta charset="UTF-8"><title>ندلان تورز — تنبيه الملفات</title></head>
        <body style="font-family:sans-serif;padding:24px;background:#0f172a;color:#fff;">
          <h2>لم يتم العثور على ملف index.html في مجلد التشغيل</h2>
          <p>تأكد من وجود <strong>index.html</strong> بجانب <strong>server.js</strong> في مستودع GitHub، وأن Mount Path للـ Volume هو <strong>/app/data</strong> وليس <strong>/app</strong>.</p>
        </body>
        </html>
      `);
    }

    const safeHtml = String(content).replace(
      /(<script(?:\s+type="text\/plain"[^>]*)?>)([\s\S]*?)(<\/script>)/gi,
      (_, openTag, body, closeTag) => `${openTag}${body.replace(/<\/script>/gi, "<\\/script>")}${closeTag}`
    );

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache"
    });
    res.end(safeHtml);
  });
});

process.on("SIGTERM", () => {
  try {
    server.close(() => process.exit(0));
  } catch (_) {
    process.exit(0);
  }
});

process.on("SIGINT", () => {
  try {
    server.close(() => process.exit(0));
  } catch (_) {
    process.exit(0);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Nadlantours server running on port ${PORT} (data: ${DATA_DIR})`);
});