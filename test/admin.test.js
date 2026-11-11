// AlchemyX Catalyst dashboard API tests (admin/api.js). No network: WhatsApp is faked. Run: npm test

process.env.DB_PATH = ":memory:";

const { test, beforeEach, after, describe } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const db = require("../db");
const { seed } = require("../db/seed");
const { createAdmin } = require("../admin/api");

const NOW = new Date("2026-11-10T06:00:00Z");
const TOKEN = "test-token-123";
const PERERA = "94770000202";
const quietLog = { log() {}, warn() {}, error() {} };

const sent = [];
const fakeWhatsapp = {
  isConfigured: () => true,
  send: async (to, reply) => { sent.push({ to, ...reply }); return { messages: [{ id: `wamid.out.${sent.length}` }] }; },
};

function startServer(opts = {}) {
  const admin = createAdmin({ db, whatsapp: fakeWhatsapp, token: TOKEN, clock: () => NOW, log: quietLog, ...opts });
  const server = http.createServer((req, res) => {
    if (!admin.handle(req, res, new URL(req.url, "http://localhost"))) res.writeHead(404).end();
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

let server, base;
const call = async (method, path, { body, token = TOKEN } = {}) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
};

beforeEach(async () => {
  seed({ now: NOW });
  sent.length = 0;
  if (!server) { server = await startServer(); base = `http://localhost:${server.address().port}`; }
});
after(() => server?.close());

describe("access", () => {
  test("no key or a wrong key is refused", async () => {
    assert.equal((await call("GET", "/admin/api/overview", { token: null })).status, 401);
    assert.equal((await call("GET", "/admin/api/overview", { token: "nope" })).status, 401);
  });

  test("without ADMIN_TOKEN the dashboard is switched off", async () => {
    const off = await startServer({ token: "" });
    const res = await fetch(`http://localhost:${off.address().port}/admin/api/overview`, { headers: { Authorization: "Bearer " } });
    assert.equal(res.status, 503);
    off.close();
  });

  test("unknown endpoints are 404 and paths can't escape the web build", async () => {
    assert.equal((await call("GET", "/admin/api/nothing")).status, 404);
    assert.equal((await call("GET", "/admin/..%2f..%2fserver.js")).status, 403);
  });
});

describe("reading", () => {
  test("overview has counts, this week's sessions, paused contacts and slips", async () => {
    const { status, data } = await call("GET", "/admin/api/overview");
    assert.equal(status, 200);
    assert.equal(data.tutor.name, "Mr. Nuwan Jayasekara");
    assert.equal(data.counts.contacts, 10);
    assert.equal(data.counts.paused, 1);
    assert.ok(data.counts.languages.some((l) => l.language === "si"));
    assert.ok(data.sessions.some((s) => s.status === "cancelled"));
    assert.deepEqual(data.paused.map((c) => c.wa_id), ["94770000204"]);
    assert.equal(data.slips.length, data.counts.slips_waiting);
  });

  test("conversation list puts the latest chat first", async () => {
    db.logMessage({ id: "a1", waId: PERERA, direction: "in", type: "text", body: "class eka kawadada?" });
    const { data } = await call("GET", "/admin/api/conversations");
    assert.equal(data[0].wa_id, PERERA);
    assert.equal(data[0].last_body, "class eka kawadada?");
    assert.equal(data.length, 10);
  });

  test("one conversation: contact, students with classes, payments, messages", async () => {
    db.logMessage({ id: "a1", waId: PERERA, direction: "in", type: "text", body: "hi" });
    const { status, data } = await call("GET", `/admin/api/conversations/${PERERA}`);
    assert.equal(status, 200);
    assert.equal(data.contact.name, "Mrs. S. Perera");
    assert.deepEqual(data.students.map((s) => s.name), ["Dilini Perera", "Kasun Perera"]);
    assert.ok(data.students[1].enrollments.length > 0);
    assert.ok(data.payments.length > 0);
    assert.equal(data.messages.at(-1).body, "hi");
    assert.equal((await call("GET", "/admin/api/conversations/94700000000")).status, 404);
  });

  test("classes and payments", async () => {
    const classes = (await call("GET", "/admin/api/classes")).data;
    assert.equal(classes.classes.length, 7);
    assert.ok(classes.sessions.length > 7, "two weeks of sessions");
    const payments = (await call("GET", "/admin/api/payments")).data;
    assert.ok(payments.owed.length > 0);
    assert.ok(payments.owed.every((o) => o.total > 0));
  });
});

describe("actions", () => {
  test("pause, resume and language", async () => {
    let r = await call("POST", `/admin/api/conversations/${PERERA}/pause`, { body: { reason: "Teacher is replying" } });
    assert.equal(r.data.bot_paused, 1);
    assert.equal(r.data.paused_reason, "Teacher is replying");
    r = await call("POST", `/admin/api/conversations/${PERERA}/resume`);
    assert.equal(r.data.bot_paused, 0);
    r = await call("POST", `/admin/api/conversations/${PERERA}/language`, { body: { language: "singlish" } });
    assert.equal(r.data.language, "singlish");
    assert.equal((await call("POST", `/admin/api/conversations/${PERERA}/language`, { body: { language: "fr" } })).status, 400);
  });

  test("reply as the teacher: sent on WhatsApp and logged in the chat", async () => {
    const r = await call("POST", `/admin/api/conversations/${PERERA}/reply`, { body: { text: "Hello, this is the teacher." } });
    assert.equal(r.status, 200);
    assert.deepEqual(sent, [{ to: PERERA, type: "text", body: "Hello, this is the teacher." }]);
    assert.equal(db.recentMessages(PERERA, 1)[0].body, "Hello, this is the teacher.");
    assert.equal((await call("POST", `/admin/api/conversations/${PERERA}/reply`, { body: { text: "  " } })).status, 400);
  });

  test("approve and reject slips; a reject needs a reason", async () => {
    const slips = (await call("GET", "/admin/api/payments")).data.slips;
    assert.ok(slips.length >= 1, "seed has a slip waiting");
    const id = slips[0].id;
    assert.equal((await call("POST", `/admin/api/payments/${id}/reject`, { body: {} })).status, 400);
    const ok = await call("POST", `/admin/api/payments/${id}/approve`);
    assert.equal(ok.data.status, "approved");
    assert.equal(ok.data.reviewed_by, "Mr. Nuwan Jayasekara");
    assert.equal((await call("POST", `/admin/api/payments/${id}/approve`)).status, 409, "already reviewed");
  });

  test("bad JSON is a 400", async () => {
    const res = await fetch(`${base}/admin/api/conversations/${PERERA}/pause`, {
      method: "POST", headers: { Authorization: `Bearer ${TOKEN}` }, body: "{oops",
    });
    assert.equal(res.status, 400);
  });
});
