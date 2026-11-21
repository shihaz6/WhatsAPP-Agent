// AlchemyX Catalyst dashboard API tests (admin/api.js). No network: WhatsApp is faked. Run: npm test

process.env.DB_PATH = ":memory:";

const { test, beforeEach, after, describe } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const db = require("../db");
const { setupInstitute, REGULAR, PAUSED } = require("./fixtures");
const { createAdmin } = require("../admin/api");

const NOW = new Date("2026-11-10T06:00:00Z");
const TOKEN = "test-token-123";
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
  const res = await fetch(`${base}/admin/api${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
};
const post = (path, body = {}) => call("POST", path, { body });

beforeEach(async () => {
  setupInstitute();
  sent.length = 0;
  if (!server) { server = await startServer(); base = `http://localhost:${server.address().port}`; }
});
after(() => server?.close());

describe("access", () => {
  test("no key or a wrong key is refused", async () => {
    assert.equal((await call("GET", "/overview", { token: null })).status, 401);
    assert.equal((await call("GET", "/overview", { token: "nope" })).status, 401);
  });

  test("without ADMIN_TOKEN the dashboard is open and says no key is needed", async () => {
    const open = await startServer({ token: "" });
    const url = `http://localhost:${open.address().port}/admin/api`;
    assert.equal((await fetch(`${url}/overview`)).status, 200);
    assert.deepEqual(await (await fetch(`${url}/auth`)).json(), { required: false });
    open.close();
  });

  test("with ADMIN_TOKEN the auth endpoint says a key is needed", async () => {
    assert.deepEqual((await call("GET", "/auth", { token: null })).data, { required: true });
  });

  test("unknown endpoints are 404 and paths can't escape the web build", async () => {
    assert.equal((await call("GET", "/nothing")).status, 404);
    assert.equal((await call("GET", "/classes")).status, 404, "the tutor endpoints are gone");
    const res = await fetch(`${base}/admin/..%2f..%2fserver.js`);
    assert.equal(res.status, 403);
  });
});

describe("overview and conversations", () => {
  test("overview has the business, counts and the chats waiting for the owner", async () => {
    db.logMessage({ id: "o1", waId: REGULAR, direction: "in", type: "text", body: "hi", });
    const { status, data } = await call("GET", "/overview");
    assert.equal(status, 200);
    assert.equal(data.business.name, "Test Academy");
    assert.deepEqual([data.counts.contacts, data.counts.paused, data.counts.products, data.counts.out_of_stock], [3, 1, 4, 1]);
    assert.deepEqual(data.paused.map((c) => c.wa_id), [PAUSED]);
  });

  test("conversation list puts the latest chat first; one conversation has its messages", async () => {
    db.logMessage({ id: "a1", waId: REGULAR, direction: "in", type: "text", body: "meeka kiyada?" });
    const list = (await call("GET", "/conversations")).data;
    assert.equal(list[0].wa_id, REGULAR);
    assert.equal(list[0].last_body, "meeka kiyada?");
    const one = await call("GET", `/conversations/${REGULAR}`);
    assert.equal(one.data.contact.name, "Test Parent");
    assert.equal(one.data.messages.at(-1).body, "meeka kiyada?");
    assert.equal((await call("GET", "/conversations/94700000000")).status, 404);
  });

  test("take over, hand back and language", async () => {
    let r = await post(`/conversations/${REGULAR}/pause`, { reason: "Owner is replying" });
    assert.deepEqual([r.data.bot_paused, r.data.paused_reason], [1, "Owner is replying"]);
    r = await post(`/conversations/${REGULAR}/resume`);
    assert.equal(r.data.bot_paused, 0);
    r = await post(`/conversations/${REGULAR}/language`, { language: "singlish" });
    assert.deepEqual([r.data.language, r.data.language_auto], ["singlish", 0]);
    assert.equal((await post(`/conversations/${REGULAR}/language`, { language: "fr" })).status, 400);
  });

  test("language back to auto: re-detected from their latest message that shows one", async () => {
    await post(`/conversations/${REGULAR}/language`, { language: "en" });
    db.logMessage({ id: "l1", waId: REGULAR, direction: "in", type: "text", body: "idhu evlo irukku?" });
    db.logMessage({ id: "l2", waId: REGULAR, direction: "in", type: "text", body: "ok" });
    const r = await post(`/conversations/${REGULAR}/language`, { language: "auto" });
    assert.deepEqual([r.data.language_auto, r.data.language], [1, "tanglish"]);
  });

  test("reply as the owner: sent on WhatsApp and logged in the chat", async () => {
    const r = await post(`/conversations/${REGULAR}/reply`, { text: "Hi, this is the owner." });
    assert.equal(r.status, 200);
    assert.deepEqual(sent, [{ to: REGULAR, type: "text", body: "Hi, this is the owner." }]);
    const [last] = db.recentMessages(REGULAR, 1);
    assert.deepEqual([last.body, last.sent_by, last.status], ["Hi, this is the owner.", "owner", "sent"]);
    assert.equal((await post(`/conversations/${REGULAR}/reply`, { text: "  " })).status, 400);
  });
});

describe("courses (stored as products)", () => {
  test("list, add, edit and delete; mistakes come back as 400 with a message for the owner", async () => {
    assert.equal((await call("GET", "/products")).data.length, 5, "hidden courses are listed for the owner");
    const added = await post("/products", { name: "Chemistry Revision", price: "Rs 750", stock: "", category: "A/L Science" });
    assert.equal(added.status, 200);
    assert.deepEqual([added.data.price, added.data.stock], [750, null]);
    const edited = await post(`/products/${added.data.id}`, { name: "Chemistry Paper Class", price: 800, stock: 5, active: false });
    assert.deepEqual([edited.data.name, edited.data.active], ["Chemistry Paper Class", 0]);
    const bad = await post("/products", { name: "grade 11 maths", price: 1 });
    assert.equal(bad.status, 400);
    assert.match(bad.data.error, /already exists/);
    assert.equal((await post(`/products/${added.data.id}/delete`)).data.ok, true);
    assert.equal((await call("GET", "/products")).data.length, 5);
  });

  test("bulk: the courses page sends one request for the selected courses", async () => {
    const ids = db.listProducts().slice(0, 2).map((p) => p.id);
    const hidden = await post("/products/bulk", { action: "hide", ids });
    assert.deepEqual([hidden.status, hidden.data.changed], [200, 2]);
    const deleted = await post("/products/bulk", { action: "delete", ids });
    assert.deepEqual([deleted.status, deleted.data.changed], [200, 2]);
    const bad = await post("/products/bulk", { action: "delete", ids: [] });
    assert.equal(bad.status, 400);
    assert.match(bad.data.error, /Select at least one/);
  });

  test("import: a dry run previews, the real run saves, and bad rows stop the whole import", async () => {
    const rows = [{ name: "Biology Revision", price: "1,600", stock: "10" }, { name: "ielts preparation", price: 1500 }];
    const preview = await post("/products/import", { rows, dry_run: true });
    assert.deepEqual([preview.status, preview.data.created, preview.data.updated], [200, 1, 1]);
    assert.equal(db.listProducts().length, 5);
    assert.equal((await post("/products/import", { rows })).status, 200);
    assert.equal(db.listProducts().length, 6);

    const bad = await post("/products/import", { rows: [{ name: "X", price: "free" }, { name: "Y", price: 1 }] });
    assert.equal(bad.status, 400);
    assert.match(bad.data.error, /1 row need fixing; nothing was imported/);
    assert.deepEqual(bad.data.errors.map((e) => e.row), [1]);
    assert.equal(db.listProducts().length, 6);
  });
});

describe("office hours from the settings page", () => {
  test("a chip saved from the page comes back as its wording", async () => {
    const r = await post("/settings", { business: { name: "Test Academy", office_hours_preset: "mon_fri_9_5" } });
    assert.equal(r.status, 200);
    assert.deepEqual([r.data.business.office_hours_preset, r.data.business.opening_hours], ["mon_fri_9_5", "Mon–Fri, 9:00 AM–5:00 PM"]);
    const bad = await post("/settings", { business: { office_hours_preset: "nonsense" } });
    assert.equal(bad.status, 400);
  });
});

describe("bot settings", () => {
  test("GET has everything on the page", async () => {
    const { data } = await call("GET", "/settings");
    assert.equal(data.business.name, "Test Academy");
    assert.deepEqual(data.languages.map((l) => l.code), ["si", "ta", "en"]);
    assert.equal(data.handover_rules.length, 3);
    assert.equal(data.faqs.length, 2);
  });

  test("POST saves business details, languages and handover rules together", async () => {
    const r = await post("/settings", {
      business: { name: "Renamed Academy", opening_hours: "Daily 8–8", handover_number: "+94 71 123 4567" },
      languages: { ta: false },
      handover_rules: [{ key: "group_enrolment", enabled: false }],
    });
    assert.equal(r.status, 200);
    assert.equal(r.data.business.name, "Renamed Academy");
    assert.equal(r.data.business.handover_number, "94711234567");
    assert.equal(r.data.languages.find((l) => l.code === "ta").enabled, 0);
    assert.equal(r.data.handover_rules.find((h) => h.key === "group_enrolment").enabled, 0);
  });

  test("a mistake anywhere saves nothing", async () => {
    const r = await post("/settings", { business: { name: "Renamed Academy" }, languages: { si: false, ta: false, en: false } });
    assert.equal(r.status, 400);
    assert.match(r.data.error, /at least one reply language/);
    assert.equal(db.getBusiness().name, "Test Academy");
  });

  test("the bot switch for everyone works at once", async () => {
    assert.equal((await post("/settings/bot", { enabled: false })).data.bot_enabled, 0);
    assert.equal(db.getBusiness().bot_enabled, 0);
    assert.equal((await post("/settings/bot", { enabled: true })).data.bot_enabled, 1);
  });

  test("FAQs: add, edit, delete", async () => {
    const f = (await post("/faqs", { question: "Open on Sunday?", answer: "No." })).data;
    assert.equal((await post(`/faqs/${f.id}`, { question: "Open on Sunday?", answer: "In December." })).data.answer, "In December.");
    assert.equal((await post(`/faqs/${f.id}/delete`)).data.ok, true);
    assert.equal((await post("/faqs", { question: "Q?" })).status, 400);
  });

  test("bad JSON is a 400", async () => {
    const res = await fetch(`${base}/admin/api/settings`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}` }, body: "{oops" });
    assert.equal(res.status, 400);
  });
});
