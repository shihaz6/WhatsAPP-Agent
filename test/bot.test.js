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

  test("a failed send is logged, not thrown", async () => {
    const bad = createHandler({ db, whatsapp: fakeWhatsApp({ failSend: true }), agent, log: quietLog });
    const r = await bad.handleMessage(textMsg(NEW_NUMBER, "hello"));
    assert.equal(r.status, "handled");
    assert.deepEqual(messagesFor(NEW_NUMBER).map((m) => m.direction), ["in"], "no 'out' row for a failed send");
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
