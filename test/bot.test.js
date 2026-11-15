// Message pipeline tests (bot/handler.js). Run: npm test
// Real handler and database (in memory); fake WhatsApp client and fake agent.

process.env.DB_PATH = ":memory:";

const { test, beforeEach, describe } = require("node:test");
const assert = require("node:assert/strict");
const db = require("../db");
const { seed } = require("../db/seed");
const { createHandler } = require("../bot/handler");

const NEW_NUMBER = "94779990001";
const PAUSED = "94770000204"; // seeded as paused
const quietLog = { log() {}, warn() {}, error() {} };

// Fake WhatsApp client: records what would be sent. Each send takes a little time,
// so overlapping messages would interleave if the handler didn't queue them.
function fakeWhatsApp({ failSend = false, configured = true } = {}) {
  const fake = {
    sent: [], read: [], n: 0,
    isConfigured: () => configured,
    async markAsRead(id, opts) { fake.read.push({ id, ...opts }); },
    async send(to, reply) {
      await new Promise((r) => setTimeout(r, 5));
      if (failSend) throw new Error("Graph API 500: boom");
      fake.sent.push({ to, ...reply });
      return { messages: [{ id: `wamid.out.${++fake.n}` }] };
    },
  };
  return fake;
}

// Fake agent: replies "re: <text>" and records what it was asked.
function fakeAgent() {
  const agent = {
    calls: [],
    async respond({ contact, incoming }) {
      agent.calls.push({ contact, incoming });
      await new Promise((r) => setTimeout(r, 5));
      return { replies: [{ type: "text", body: `re: ${incoming.text ?? `[${incoming.type}]`}` }] };
    },
  };
  return agent;
}

let msgSeq = 0;
const textMsg = (from, body, id = `wamid.in.${++msgSeq}`) => ({ id, from, type: "text", text: { body } });
const messagesFor = (waId) => db.recentMessages(waId, 100);

let wa, agent, bot;
beforeEach(() => {
  seed({ now: new Date("2026-11-10T06:00:00Z") });
  wa = fakeWhatsApp();
  agent = fakeAgent();
  bot = createHandler({ db, whatsapp: wa, agent, log: quietLog });
});

describe("message pipeline", () => {
  test("a new number gets a contact (no student); the agent's reply is sent and both are logged", async () => {
    const r = await bot.handleMessage(textMsg(NEW_NUMBER, "hello"));
    assert.equal(r.status, "handled");
    const contact = db.getContactByWaId(NEW_NUMBER);
    assert.ok(contact);
    assert.deepEqual(db.listStudents(contact.id), []);
    assert.equal(agent.calls[0].contact.id, contact.id);
    assert.equal(agent.calls[0].incoming.text, "hello");
    assert.deepEqual(wa.sent.map((s) => [s.to, s.body]), [[NEW_NUMBER, "re: hello"]]);
    assert.equal(wa.read[0].typing, true, "shows typing while the agent works");
    assert.deepEqual(messagesFor(NEW_NUMBER).map((m) => [m.direction, m.body]), [["in", "hello"], ["out", "re: hello"]]);
  });

  test("a duplicate delivery is ignored", async () => {
    const m = textMsg(NEW_NUMBER, "hello");
    await bot.handleMessage(m);
    assert.equal((await bot.handleMessage(m)).status, "duplicate");
    assert.equal(agent.calls.length, 1);
    assert.equal(wa.sent.length, 1);
  });

  test("a paused contact: no agent call, no reply, no read receipt; message still logged", async () => {
    const r = await bot.handleMessage(textMsg(PAUSED, "hello?"));
    assert.equal(r.status, "paused");
    assert.equal(agent.calls.length, 0);
    assert.equal(wa.sent.length, 0);
    assert.equal(wa.read.length, 0);
    assert.equal(messagesFor(PAUSED).length, 1);

    db.setBotPaused(db.getContactByWaId(PAUSED).id, false);
    assert.equal((await bot.handleMessage(textMsg(PAUSED, "hello?"))).status, "handled");
    assert.equal(wa.sent.length, 1);
  });

  test("messages from one person are answered in order, one at a time", async () => {
    await Promise.all(["first", "second", "third"].map((t) => bot.handleMessage(textMsg(NEW_NUMBER, t))));
    assert.deepEqual(wa.sent.map((s) => s.body), ["re: first", "re: second", "re: third"]);
    assert.deepEqual(messagesFor(NEW_NUMBER).map((m) => m.body),
      ["first", "re: first", "second", "re: second", "third", "re: third"]);
  });

  test("a failed send is saved as failed (with the reason), not thrown", async () => {
    const bad = createHandler({ db, whatsapp: fakeWhatsApp({ failSend: true }), agent, log: quietLog });
    const r = await bad.handleMessage(textMsg(NEW_NUMBER, "hello"));
    assert.equal(r.status, "handled");
    const out = messagesFor(NEW_NUMBER).filter((m) => m.direction === "out");
    assert.deepEqual(out.map((m) => [m.body, m.status, m.error]), [["re: hello", "failed", "Graph API 500: boom"]]);
    assert.match(out[0].id, /^local./);
    assert.equal(db.dashboardCounts("2000-01-01T00:00:00Z").messages_out_24h, 0, "not counted as sent");
    assert.equal(db.dashboardCounts("2000-01-01T00:00:00Z").undelivered_24h, 1);
  });

  test("after a failed part, later parts are saved as not sent and not attempted", async () => {
    let calls = 0;
    const flaky = { ...fakeWhatsApp(), isConfigured: () => true, markAsRead: async () => {},
      send: async () => { calls++; throw new Error("Graph API 400: bad"); } };
    const two = { respond: async () => ({ replies: [{ type: "text", body: "one" }, { type: "text", body: "two" }] }) };
    await createHandler({ db, whatsapp: flaky, agent: two, log: quietLog }).handleMessage(textMsg(NEW_NUMBER, "hi"));
    assert.equal(calls, 1);
    assert.deepEqual(messagesFor(NEW_NUMBER).filter((m) => m.direction === "out").map((m) => [m.body, m.status]),
      [["one", "failed"], ["two", "not_sent"]]);
  });

  test("sent replies carry the agent's tool runs and agent error", async () => {
    const fallback = { respond: async () => ({ replies: [{ type: "text", body: "Sorry" }], failed: true, error: "Groq API 429: rate limit",
      toolLog: [{ name: "hand_off_to_team", ok: false, error: "summary is required." }] }) };
    await createHandler({ db, whatsapp: wa, agent: fallback, log: quietLog }).handleMessage(textMsg(NEW_NUMBER, "hi"));
    const [out] = messagesFor(NEW_NUMBER).filter((m) => m.direction === "out");
    assert.equal(out.status, "sent");
    assert.equal(out.sent_by, "bot");
    assert.equal(out.id, "wamid.out.1");
    assert.equal(out.agent_error, "Groq API 429: rate limit");
    assert.deepEqual(JSON.parse(out.tools), [{ name: "hand_off_to_team", ok: false, error: "summary is required." }]);
  });

  test("an agent crash is contained", async () => {
    const boom = { respond: async () => { throw new Error("agent exploded"); } };
    const r = await createHandler({ db, whatsapp: wa, agent: boom, log: quietLog }).handleMessage(textMsg(NEW_NUMBER, "hi"));
    assert.equal(r.status, "error");
    // and the queue keeps working for the next message
    assert.equal((await bot.handleMessage(textMsg(NEW_NUMBER, "again"))).status, "handled");
  });

  test("without WhatsApp credentials the agent runs but nothing is sent", async () => {
    const off = fakeWhatsApp({ configured: false });
    const r = await createHandler({ db, whatsapp: off, agent, log: quietLog }).handleMessage(textMsg(NEW_NUMBER, "hi"));
    assert.equal(r.replies.length, 1);
    assert.equal(off.sent.length, 0);
    assert.equal(off.read.length, 0);
    const out = messagesFor(NEW_NUMBER).filter((m) => m.direction === "out");
    assert.deepEqual(out.map((m) => [m.body, m.status]), [["re: hi", "not_sent"]], "saved so the dashboard shows it");
    assert.match(out[0].error, /not configured/);
  });

  test("malformed messages are ignored", async () => {
    assert.equal((await bot.handleMessage({ id: "x" })).status, "invalid");
    assert.equal((await bot.handleMessage(null)).status, "invalid");
    assert.equal(agent.calls.length, 0);
  });

  test("non-text messages reach the agent with their type", async () => {
    await bot.handleMessage({ id: "wamid.img", from: NEW_NUMBER, type: "image", image: { id: "media1" } });
    assert.equal(agent.calls[0].incoming.type, "image");
    assert.equal(agent.calls[0].incoming.text, null);
    assert.equal(messagesFor(NEW_NUMBER)[0].type, "image");
  });
});
