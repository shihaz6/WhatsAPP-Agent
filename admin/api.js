// AlchemyX Catalyst: the tutor's dashboard. This file serves its JSON API (/admin/api/...)
// and the built web app (web/dist at /admin). Every API call needs
//   Authorization: Bearer <ADMIN_TOKEN>
// The server is public through ngrok, so without ADMIN_TOKEN the dashboard stays switched off.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const DIST = path.join(__dirname, "..", "web", "dist");
const MAX_JSON = 64 * 1024;
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

function createAdmin({ db, whatsapp, token = process.env.ADMIN_TOKEN, clock = () => new Date(), log = console }) {
  const tutorName = () => db.getTutor()?.name ?? "Tutor";

  function conversation(waId) {
    const contact = db.getContactByWaId(waId);
    if (!contact) return null;
    const students = db.listStudents(contact.id).map((s) => ({
      ...s,
      enrollments: db.listEnrollments(s.id),
      trials: db.listTrials(s.id),
      bookings: db.listBookings(s.id, { now: clock() }),
    }));
    return {
      contact,
      students,
      payments: db.listPaymentsForContact(contact.id),
      owed: db.amountDueForContact(contact.id),
      messages: db.recentMessages(waId, 200),
    };
  }

  // [method, pattern, handler(params, body)] — handlers return [status, data].
  const routes = [
    ["GET", /^\/overview$/, () => {
      const now = clock();
      const since = new Date(now.getTime() - 24 * 3600 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
      const classes = db.listClasses();
      return [200, {
        tutor: db.getTutor(),
        counts: db.dashboardCounts(since),
        sessions: db.upcomingSessions(classes.map((c) => c.id), { days: 7, now }),
        paused: db.listConversations().filter((c) => c.bot_paused),
        slips: db.listSlipsAwaitingReview(),
      }];
    }],
    ["GET", /^\/conversations$/, () => [200, db.listConversations()]],
    ["GET", /^\/conversations\/(\d+)$/, ([waId]) => {
      const c = conversation(waId);
      return c ? [200, c] : [404, { error: "No such contact" }];
    }],
    ["POST", /^\/conversations\/(\d+)\/pause$/, ([waId], body) => withContact(waId, (c) =>
      db.setBotPaused(c.id, true, String(body.reason ?? "").trim() || "Paused from Catalyst"))],
    ["POST", /^\/conversations\/(\d+)\/resume$/, ([waId]) => withContact(waId, (c) => db.setBotPaused(c.id, false))],
    ["POST", /^\/conversations\/(\d+)\/language$/, ([waId], body) => {
      if (!db.LANGUAGES.includes(body.language)) return [400, { error: `language must be one of ${db.LANGUAGES.join(", ")}` }];
      return withContact(waId, (c) => db.updateContact(c.id, { language: body.language }));
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
        db.logMessage({ id, waId, direction: "out", type: "text", body: text });
        return [200, { ok: true, id }];
      } catch (err) {
        log.error(`Catalyst reply to ${waId} failed:`, err.message);
        return [502, { error: err.message }];
      }
    }],
    ["GET", /^\/classes$/, () => {
      const classes = db.listClasses();
      return [200, { classes, sessions: db.upcomingSessions(classes.map((c) => c.id), { days: 14, now: clock() }) }];
    }],
    ["GET", /^\/payments$/, () => [200, { slips: db.listSlipsAwaitingReview(), owed: db.listOwedByContact() }]],
    ["POST", /^\/payments\/(\d+)\/approve$/, ([id]) => reviewed(db.approvePayment(Number(id), tutorName()))],
    ["POST", /^\/payments\/(\d+)\/reject$/, ([id], body) => {
      const reason = String(body.reason ?? "").trim();
      if (!reason) return [400, { error: "Give a reason; the parent will need it" }];
      return reviewed(db.rejectPayment(Number(id), tutorName(), reason));
    }],
  ];

  function withContact(waId, fn) {
    const c = db.getContactByWaId(waId);
    return c ? [200, fn(c)] : [404, { error: "No such contact" }];
  }
  const reviewed = (r) => (r.ok ? [200, r.payment] : [409, { error: "This payment has no slip waiting for review" }]);

  async function handleApi(req, res, subpath) {
    if (!token) return sendJson(res, 503, { error: "Catalyst is switched off: set ADMIN_TOKEN in .env and restart." });
    const auth = req.headers.authorization ?? "";
    if (!auth.startsWith("Bearer ") || !safeEqual(auth.slice(7), token)) return sendJson(res, 401, { error: "Wrong or missing access key" });

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

  return { handle, isEnabled: () => Boolean(token) };
}

module.exports = { createAdmin };
