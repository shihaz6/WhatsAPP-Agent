// Payment slips (step 5): a parent sends a photo/PDF, it's saved, the bot links it to their unpaid
// fees, and the teacher sees it on the dashboard. No network: WhatsApp and the model are faked.
// Run: npm test

process.env.DB_PATH = ":memory:";

const { test, beforeEach, after, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const db = require("../db");
const { seed } = require("../db/seed");
const { createHandler } = require("../bot/handler");
const { createTools } = require("../bot/tools");
const { createAdmin } = require("../admin/api");

const NOW = new Date("2026-11-10T06:00:00Z");
const PERERA = "94770000202";   // two children; this month: 3 fees with slips already received (seed)
const FERNANDO = "94770000201"; // has a fee due
const PAUSED = "94770000204";
const quiet = { log() {}, warn() {}, error() {} };
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "slips-"));
after(() => fs.rmSync(dir, { recursive: true, force: true }));

function fakeWhatsApp({ failDownload = false } = {}) {
  return {
    sent: [], downloads: [],
    isConfigured: () => true,
    async markAsRead() {},
    async send(to, reply) { this.sent.push(reply); return { messages: [{ id: `wamid.out.${this.sent.length}` }] }; },
    async downloadMedia(id) {
      this.downloads.push(id);
      if (failDownload) throw new Error("Media download 404");
      return { buffer: JPEG, mime: "image/jpeg" };
    },
  };
}
const quietAgent = { respond: async () => ({ replies: [{ type: "text", body: "ok" }] }) };
let seq = 0;
const photo = (from, { caption, mime = "image/jpeg", type = "image" } = {}) => {
  const id = `wamid.slip.${++seq}`;
  return { id, from, type, [type]: { id: `media-${seq}`, mime_type: mime, ...(caption ? { caption } : {}) } };
};
const lastIn = (waId) => db.recentMessages(waId, 50).filter((m) => m.direction === "in").at(-1);
const tools = (waId, now = NOW) => createTools({ db, contact: db.ensureContact(waId), now });
const due = (waId) => db.listPaymentsForContact(db.getContactByWaId(waId).id).filter((p) => ["due", "rejected"].includes(p.status));

beforeEach(() => seed({ now: NOW }));

describe("receiving a slip", () => {
  test("a photo is saved with its caption, and the agent sees the caption", async () => {
    const wa = fakeWhatsApp();
    let seen;
    const agent = { respond: async ({ incoming }) => { seen = incoming; return { replies: [] }; } };
    await createHandler({ db, whatsapp: wa, agent, log: quiet, mediaDir: dir }).handleMessage(photo(FERNANDO, { caption: "Nov fees" }));
    const m = lastIn(FERNANDO);
    assert.equal(m.body, "Nov fees");
    assert.equal(m.media_mime, "image/jpeg");
    assert.ok(m.media_file.endsWith(".jpg"));
    assert.deepEqual(fs.readFileSync(path.join(dir, m.media_file)), JPEG);
    assert.equal(seen.text, "Nov fees");
    assert.equal(seen.type, "image");
  });

  test("a PDF slip is kept too", async () => {
    const wa = fakeWhatsApp();
    wa.downloadMedia = async () => ({ buffer: Buffer.from("%PDF-1.4"), mime: "application/pdf" });
    await createHandler({ db, whatsapp: wa, agent: quietAgent, log: quiet, mediaDir: dir })
      .handleMessage(photo(FERNANDO, { type: "document", mime: "application/pdf" }));
    assert.ok(lastIn(FERNANDO).media_file.endsWith(".pdf"));
  });

  test("a paused chat's slip is still saved (the teacher needs to see it)", async () => {
    const wa = fakeWhatsApp();
    const r = await createHandler({ db, whatsapp: wa, agent: quietAgent, log: quiet, mediaDir: dir }).handleMessage(photo(PAUSED));
    assert.equal(r.status, "paused");
    assert.ok(lastIn(PAUSED).media_file);
  });

  test("a failed download doesn't stop the reply; the message is kept without a file", async () => {
    const wa = fakeWhatsApp({ failDownload: true });
    const r = await createHandler({ db, whatsapp: wa, agent: quietAgent, log: quiet, mediaDir: dir }).handleMessage(photo(FERNANDO));
    assert.equal(r.status, "handled");
    assert.equal(lastIn(FERNANDO).media_id, `media-${seq}`);
    assert.equal(lastIn(FERNANDO).media_file, null);
  });

  test("other file types (e.g. a video) aren't downloaded", async () => {
    const wa = fakeWhatsApp();
    await createHandler({ db, whatsapp: wa, agent: quietAgent, log: quiet, mediaDir: dir })
      .handleMessage(photo(FERNANDO, { type: "document", mime: "application/zip" }));
    assert.equal(wa.downloads.length, 0);
  });
});

describe("seed TEST_PHONE", () => {
  test("adds that number as a parent with a fee due this month", () => {
    seed({ now: NOW, testPhone: "+94 77 123 4567" });
    const c = db.getContactByWaId("94771234567");
    assert.equal(c.name, "Test Parent");
    assert.ok(db.listPaymentsForContact(c.id).some((p) => p.status === "due"));
  });
});

describe("record_payment_slip", () => {
  const send = (waId) => createHandler({ db, whatsapp: fakeWhatsApp(), agent: quietAgent, log: quiet, mediaDir: dir }).handleMessage(photo(waId));
  const record = (waId, ids) => tools(waId).run("record_payment_slip", JSON.stringify({ payment_ids: ids }));

  test("links the latest slip to the chosen unpaid fee; the teacher sees it waiting", async () => {
    await send(FERNANDO);
    const [fee] = due(FERNANDO);
    const r = record(FERNANDO, [fee.id]);
    assert.equal(r.ok, true);
    assert.match(r.note, /don't say it's paid/);
    const p = db.getPayment(fee.id);
    assert.equal(p.status, "slip_received");
    assert.equal(p.slip_media_id, lastIn(FERNANDO).media_id);
    const waiting = db.listSlipsAwaitingReview().find((s) => s.id === fee.id);
    assert.ok(waiting.slip_file, "the Payments page can show the photo");
  });

  test("get_my_fees gives the payment ids the bot needs", () => {
    const r = tools(FERNANDO).run("get_my_fees", "{}");
    assert.ok(r.payments.every((p) => Number.isInteger(p.payment_id)));
  });

  test("another family's fee is refused", async () => {
    await send(FERNANDO);
    const other = db.listPaymentsForContact(db.getContactByWaId(PERERA).id)[0];
    assert.match(record(FERNANDO, [other.id]).error, /not one of this contact's fees/);
    assert.notEqual(db.getPayment(other.id).slip_media_id, lastIn(FERNANDO).media_id);
  });

  test("no recent photo: nothing is recorded", () => {
    const [fee] = due(FERNANDO);
    assert.match(record(FERNANDO, [fee.id]).error, /No photo or PDF/);
    assert.equal(db.getPayment(fee.id).status, fee.status);
  });

  test("a photo older than 24 hours doesn't count", async () => {
    await send(FERNANDO);
    const [fee] = due(FERNANDO);
    const later = new Date(Date.now() + 25 * 3600 * 1000);
    assert.match(tools(FERNANDO, later).run("record_payment_slip", JSON.stringify({ payment_ids: [fee.id] })).error, /No photo or PDF/);
  });

  test("a fee that's already approved or waiting isn't recorded again", async () => {
    await send(PERERA);
    const waiting = db.listPaymentsForContact(db.getContactByWaId(PERERA).id).find((p) => p.status === "slip_received");
    assert.match(record(PERERA, [waiting.id]).error, /not waiting for a slip/);
  });

  test("bad arguments", async () => {
    await send(FERNANDO);
    assert.match(record(FERNANDO, []).error, /payment_ids/);
    assert.match(record(FERNANDO, ["x"]).error, /payment_ids/);
  });
});

describe("the teacher sees the slip", () => {
  let server, base;
  const TOKEN = "t";
  after(() => server?.close());
  const start = async () => {
    if (server) return;
    const admin = createAdmin({ db, whatsapp: fakeWhatsApp(), token: TOKEN, clock: () => NOW, log: quiet, mediaDir: dir });
    server = http.createServer((req, res) => { if (!admin.handle(req, res, new URL(req.url, "http://x"))) res.writeHead(404).end(); });
    await new Promise((r) => server.listen(0, r));
    base = `http://localhost:${server.address().port}/admin/api`;
  };

  test("the photo is served to the signed-in dashboard only, with safe headers", async () => {
    await start();
    await createHandler({ db, whatsapp: fakeWhatsApp(), agent: quietAgent, log: quiet, mediaDir: dir }).handleMessage(photo(FERNANDO));
    const { media_id } = lastIn(FERNANDO);
    assert.equal((await fetch(`${base}/media/${media_id}`)).status, 401);
    const res = await fetch(`${base}/media/${media_id}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "image/jpeg");
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.deepEqual(Buffer.from(await res.arrayBuffer()), JPEG);
  });

  test("unknown or unsaved files are a 404, and odd ids are refused", async () => {
    await start();
    const auth = { headers: { Authorization: `Bearer ${TOKEN}` } };
    assert.equal((await fetch(`${base}/media/nope`, auth)).status, 404);
    assert.equal((await fetch(`${base}/media/..%2F..%2Fpackage.json`, auth)).status, 404);
  });

  const authed = (p, init = {}) => fetch(`${base}${p}`, {
    ...init, headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...init.headers },
  });
  const unmatched = async () => (await (await authed("/payments")).json()).unmatched;
  const handle = (msg) => createHandler({ db, whatsapp: fakeWhatsApp(), agent: quietAgent, log: quiet, mediaDir: dir }).handleMessage(msg);

  test("a slip the bot didn't link shows on Payments, with the sender's unpaid fees", async () => {
    await start();
    await handle(photo(FERNANDO, { caption: "Nov" }));
    const row = (await unmatched()).find((u) => u.wa_id === FERNANDO);
    assert.ok(row, "listed as unmatched");
    assert.equal(row.body, "Nov");
    assert.ok(row.media_file);
    assert.deepEqual(row.open_fees.map((p) => p.id).sort(), due(FERNANDO).map((p) => p.id).sort());
  });

  test("an unknown number's slip and a paused chat's slip are listed too", async () => {
    await start();
    await handle(photo("94779999999"));
    await handle(photo(PAUSED));
    const rows = await unmatched();
    const stranger = rows.find((u) => u.wa_id === "94779999999");
    assert.ok(stranger);
    assert.deepEqual(stranger.open_fees, []);
    assert.ok(rows.some((u) => u.wa_id === PAUSED));
  });

  test("the teacher links it to fees; it moves to review and leaves the unmatched list", async () => {
    await start();
    await handle(photo(FERNANDO));
    const { media_id } = lastIn(FERNANDO);
    const [fee] = due(FERNANDO);
    const res = await authed("/slips/link", { method: "POST", body: JSON.stringify({ media_id, payment_ids: [fee.id] }) });
    assert.equal(res.status, 200);
    assert.equal(db.getPayment(fee.id).status, "slip_received");
    assert.ok(!(await unmatched()).some((u) => u.media_id === media_id));
    const { slips } = await (await authed("/payments")).json();
    assert.ok(slips.some((s) => s.id === fee.id && s.slip_file));
  });

  test("linking refuses another family's fee, a fee not awaiting a slip, and an unknown file", async () => {
    await start();
    await handle(photo(FERNANDO));
    const { media_id } = lastIn(FERNANDO);
    const other = db.listPaymentsForContact(db.getContactByWaId(PERERA).id)[0];
    const link = (body) => authed("/slips/link", { method: "POST", body: JSON.stringify(body) });
    assert.equal((await link({ media_id, payment_ids: [other.id] })).status, 409);
    assert.notEqual(db.getPayment(other.id).slip_media_id, media_id);
    const approved = db.listPaymentsForContact(db.getContactByWaId(FERNANDO).id).find((p) => p.status === "approved");
    assert.equal((await link({ media_id, payment_ids: [approved.id] })).status, 409);
    assert.equal((await link({ media_id, payment_ids: [] })).status, 409);
    assert.equal((await link({ media_id: "nope", payment_ids: [1] })).status, 404);
  });

  test("chat messages carry the media fields the dashboard shows", async () => {
    await start();
    await createHandler({ db, whatsapp: fakeWhatsApp(), agent: quietAgent, log: quiet, mediaDir: dir }).handleMessage(photo(FERNANDO, { caption: "paid" }));
    const res = await fetch(`${base}/conversations/${FERNANDO}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    const m = (await res.json()).messages.filter((x) => x.direction === "in").at(-1);
    assert.equal(m.body, "paid");
    assert.ok(m.media_id && m.media_file && m.media_mime);
  });
});
