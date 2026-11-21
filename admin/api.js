// AlchemyX Catalyst: the business owner's dashboard. This file serves its JSON API (/admin/api/...)
// and the built web app (web/dist at /admin). When ADMIN_TOKEN is set, every API call needs
//   Authorization: Bearer <ADMIN_TOKEN>
// When ADMIN_TOKEN is not set the dashboard is OPEN: anyone who can reach the server
// (including through ngrok) can read conversations and send messages.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { detectLanguage } = require("../bot/language");
const { mediaPath, mediaDir: defaultMediaDir } = require("../bot/media");

const DIST = path.join(__dirname, "..", "web", "dist");
const MAX_JSON = 2 * 1024 * 1024; // product imports send the whole sheet
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json",
  ".woff2": "font/woff2", ".map": "application/json",
};

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" }).end(JSON.stringify(data));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_JSON) { reject(Object.assign(new Error("Body too large"), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => {
      if (!size) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch { reject(Object.assign(new Error("Bad JSON"), { status: 400 })); }
    });
    req.on("error", reject);
  });
}

const iso = (d) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

function createAdmin({ db, whatsapp, token = process.env.ADMIN_TOKEN, clock = () => new Date(), log = console, mediaDir = defaultMediaDir() }) {
  const settings = () => ({
    business: db.getBusiness(),
    languages: db.listReplyLanguages(),
    handover_rules: db.listHandoverRules(),
    faqs: db.listFaqs(),
  });

  // [method, pattern, handler(params, body)] — handlers return [status, data].
  const routes = [
    ["GET", /^\/overview$/, () => [200, {
      business: db.getBusiness(),
      counts: db.dashboardCounts(iso(new Date(clock().getTime() - 24 * 3600 * 1000))),
      paused: db.listConversations().filter((c) => c.bot_paused),
    }]],

    // Conversations
    ["GET", /^\/conversations$/, () => [200, db.listConversations()]],
    ["GET", /^\/conversations\/(\d+)$/, ([waId]) => {
      const contact = db.getContactByWaId(waId);
      return contact ? [200, { contact, messages: db.recentMessages(waId, 200) }] : [404, { error: "No such contact" }];
    }],
    ["POST", /^\/conversations\/(\d+)\/pause$/, ([waId], body) => withContact(waId, (c) =>
      db.setBotPaused(c.id, true, String(body.reason ?? "").trim() || "Paused from Catalyst"))],
    ["POST", /^\/conversations\/(\d+)\/resume$/, ([waId]) => withContact(waId, (c) => db.setBotPaused(c.id, false))],
    // "auto" (the default): the language follows what they write. A language code fixes it, so
    // the bot stops changing it from their messages.
    ["POST", /^\/conversations\/(\d+)\/language$/, ([waId], body) => {
      if (body.language === "auto") {
        return withContact(waId, (c) => db.updateContact(c.id, { language_auto: 1, language: latestLanguage(waId) ?? c.language }));
      }
      if (!db.LANGUAGES.includes(body.language)) return [400, { error: `language must be "auto" or one of ${db.LANGUAGES.join(", ")}` }];
      return withContact(waId, (c) => db.updateContact(c.id, { language: body.language, language_auto: 0 }));
    }],
    ["POST", /^\/conversations\/(\d+)\/reply$/, async ([waId], body) => {
      const text = String(body.text ?? "").trim();
      if (!text) return [400, { error: "Message is empty" }];
      if (text.length > 4096) return [400, { error: "WhatsApp messages are limited to 4096 characters" }];
      if (!db.getContactByWaId(waId)) return [404, { error: "No such contact" }];
      if (!whatsapp.isConfigured()) return [503, { error: "WhatsApp is not configured (WHATSAPP_TOKEN / PHONE_NUMBER_ID)" }];
      try {
        const res = await whatsapp.send(waId, { type: "text", body: text });
        const id = res?.messages?.[0]?.id ?? `catalyst.${crypto.randomUUID()}`;
        db.logMessage({ id, waId, direction: "out", type: "text", body: text, status: "sent", sentBy: "owner" });
        return [200, { ok: true, id }];
      } catch (err) {
        log.error(`Catalyst reply to ${waId} failed:`, err.message);
        return [502, { error: err.message }];
      }
    }],

    // Products. Changes reach the bot on the next message (no restart).
    ["GET", /^\/products$/, () => [200, db.listProducts()]],
    ["POST", /^\/products$/, (_, body) => [200, db.saveProduct(null, body)]],
    ["POST", /^\/products\/import$/, (_, body) => {
      const r = db.importProducts(body.rows, { dryRun: Boolean(body.dry_run) });
      return [r.ok ? 200 : 400, r.ok ? r : { ...r, error: `${r.errors.length} row${r.errors.length === 1 ? "" : "s"} need fixing; nothing was imported.` }];
    }],
    ["POST", /^\/products\/(\d+)$/, ([id], body) => [200, db.saveProduct(Number(id), body)]],
    ["POST", /^\/products\/(\d+)\/delete$/, ([id]) => [200, { ok: db.deleteProduct(Number(id)) }]],
    ["POST", /^\/products\/bulk$/, (_, body) => [200, db.bulkProducts(body.action, body.ids)]],

    // Bot settings: business details, reply languages and handover rules are saved together.
    ["GET", /^\/settings$/, () => [200, settings()]],
    ["POST", /^\/settings$/, (_, body) => {
      db.saveSettings({ business: body.business, languages: body.languages, handover_rules: body.handover_rules });
      return [200, settings()];
    }],
    // The bot's switch for everyone takes effect at once (no Save needed).
    ["POST", /^\/settings\/bot$/, (_, body) => [200, db.setBotEnabled(Boolean(body.enabled))]],
    ["POST", /^\/faqs$/, (_, body) => [200, db.saveFaq(null, body)]],
    ["POST", /^\/faqs\/(\d+)$/, ([id], body) => [200, db.saveFaq(Number(id), body)]],
    ["POST", /^\/faqs\/(\d+)\/delete$/, ([id]) => [200, { ok: db.deleteFaq(Number(id)) }]],
  ];

  // The language of their most recent message that shows one (skips "ok", emojis, photos).
  function latestLanguage(waId) {
    for (const m of db.recentMessages(waId, 50).reverse()) {
      const lang = m.direction === "in" ? detectLanguage(m.body) : null;
      if (lang) return lang;
    }
    return null;
  }

  function withContact(waId, fn) {
    const c = db.getContactByWaId(waId);
    return c ? [200, fn(c)] : [404, { error: "No such contact" }];
  }

  async function handleApi(req, res, subpath) {
    // Tells the web app whether to show the sign-in screen. Public on purpose.
    if (subpath === "/auth" && req.method === "GET") return sendJson(res, 200, { required: Boolean(token) });
    if (token) {
      const auth = req.headers.authorization ?? "";
      if (!auth.startsWith("Bearer ") || !safeEqual(auth.slice(7), token)) return sendJson(res, 401, { error: "Wrong or missing access key" });
    }

    // A photo or PDF someone sent. Behind the same access check as everything else.
    const media = subpath.match(/^\/media\/([A-Za-z0-9_.-]{1,200})$/);
    if (media && req.method === "GET") return serveMedia(res, media[1]);

    for (const [method, pattern, handler] of routes) {
      const m = subpath.match(pattern);
      if (!m) continue;
      if (req.method !== method) continue;
      try {
        const body = method === "POST" ? await readJson(req) : {};
        const [status, data] = await handler(m.slice(1).map(decodeURIComponent), body ?? {});
        return sendJson(res, status, data);
      } catch (err) {
        if (err.status) return sendJson(res, err.status, { error: err.message });
        log.error("Catalyst API error:", err);
        return sendJson(res, 500, { error: "Server error" });
      }
    }
    return sendJson(res, 404, { error: "Unknown endpoint" });
  }

  function serveMedia(res, mediaId) {
    const m = db.getMedia(mediaId);
    const file = m?.media_file ? mediaPath(m.media_file, mediaDir) : null;
    if (!file) return sendJson(res, 404, { error: "This file wasn't saved." });
    res.writeHead(200, {
      "Content-Type": m.media_mime || "application/octet-stream",
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    });
    fs.createReadStream(file).pipe(res);
  }

  function serveStatic(req, res, subpath) {
    if (req.method !== "GET" && req.method !== "HEAD") return res.writeHead(405).end("Method not allowed");
    const rel = decodeURIComponent(subpath).replace(/^\/+/, "");
    let file = path.join(DIST, rel);
    if (file !== DIST && !file.startsWith(DIST + path.sep)) return res.writeHead(403).end("Forbidden");
    if (!rel || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, "index.html"); // SPA
    if (!fs.existsSync(file)) {
      return res.writeHead(503, { "Content-Type": "text/plain" })
        .end("AlchemyX Catalyst isn't built yet. Run: npm run web:build");
    }
    const ext = path.extname(file);
    res.writeHead(200, {
      "Content-Type": TYPES[ext] ?? "application/octet-stream",
      // Vite puts a content hash in asset names, so they can be cached forever; index.html can't.
      "Cache-Control": rel.startsWith("assets/") ? "public, max-age=31536000, immutable" : "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
    });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  }

  // Returns true when the request was for the dashboard.
  function handle(req, res, url) {
    const p = url.pathname;
    if (p === "/admin") { res.writeHead(301, { Location: "/admin/" }).end(); return true; }
    if (p.startsWith("/admin/api/")) { handleApi(req, res, p.slice("/admin/api".length)); return true; }
    if (p.startsWith("/admin/")) { serveStatic(req, res, p.slice("/admin".length)); return true; }
    return false;
  }

  return { handle, requiresKey: () => Boolean(token) };
}

module.exports = { createAdmin };
