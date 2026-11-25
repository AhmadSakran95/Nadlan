const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const HTML_FILE = path.join(__dirname, "index.html");
const DATA_DIR = fs.existsSync("/app") ? path.join("/app", "data") : path.join(__dirname, "data");

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (_) {}

const server = http.createServer((req, res) => {
  const cleanUrl = (req.url || "/").split("?")[0];

  if (cleanUrl === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("OK");
  }

  fs.readFile(HTML_FILE, "utf8", (err, content) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("خطأ في تحميل ملف index.html");
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
  console.log(`Nadlantours server running on port ${PORT}`);
});