// Conversation flow tests, step 1: wiring and routing. Run: npm test
// Uses the real handler, router and database (in memory) with a fake WhatsApp client.

process.env.DB_PATH = ":memory:";

const { test, beforeEach, describe } = require("node:test");
const assert = require("node:assert/strict");
const db = require("../db");
const { seed } = require("../db/seed");
const { createHandler } = require("../bot/handler");

const NEW_NUMBER = "94779990001";
const PERERA = "94770000202";
const quietLog = { log() {}, warn() {}, error() {} };

// Fake WhatsApp client: records what would be sent. Each send takes a little time,
// so overlapping messages would interleave if the handler didn't queue them.
function fakeWhatsApp({ failSend = false, configured = true } = {}) {
  const fake = {
    sent: [], read: [], n: 0,
    isConfigured: () => configured,
    async markAsRead(id) { fake.read.push(id); },
    async send(to, reply) {
      await new Promise((r) => setTimeout(r, 5));
      if (failSend) throw new Error("Graph API 500: boom");
      fake.sent.push({ to, ...reply });
      return { messages: [{ id: `wamid.out.${++fake.n}` }] };
    },
  };
  return fake;
}

let msgSeq = 0;
const textMsg = (from, body, id = `wamid.in.${++msgSeq}`) => ({ id, from, type: "text", text: { body } });
const state = (waId) => db.getConversation(db.getContactByWaId(waId).id).state;
const messagesFor = (waId) =>
  db.open().prepare("SELECT direction, type, body FROM messages WHERE wa_id = ? ORDER BY rowid").all(waId).map((r) => ({ ...r }));

let wa, bot;
beforeEach(() => {
  seed({ now: new Date("2026-11-10T06:00:00Z") });
  wa = fakeWhatsApp();
  bot = createHandler({ db, whatsapp: wa, log: quietLog });
});

describe("wiring", () => {
  test("a new number gets a contact (no student), the menu, and both messages are logged", async () => {
    const r = await bot.handleMessage(textMsg(NEW_NUMBER, "hello"));
    assert.equal(r.status, "handled");
    const contact = db.getContactByWaId(NEW_NUMBER);
    assert.ok(contact);
    assert.deepEqual(db.listStudents(contact.id), []);
    assert.equal(state(NEW_NUMBER), "main_menu");
    assert.equal(wa.sent.length, 1);
    assert.match(wa.sent[0].body, /Welcome to Mr\. Nuwan Jayasekara's class assistant/);
    assert.equal(wa.read.length, 1);
    assert.deepEqual(messagesFor(NEW_NUMBER).map((m) => m.direction), ["in", "out"]);
  });

  test("a known contact is greeted by name", async () => {
    await bot.handleMessage(textMsg(PERERA, "hi"));
    assert.match(wa.sent[0].body, /^Hi Mrs\. S\. Perera!/);
  });

  test("a duplicate delivery is ignored", async () => {
    const m = textMsg(NEW_NUMBER, "hello");
    await bot.handleMessage(m);
    const r = await bot.handleMessage(m);
    assert.equal(r.status, "duplicate");
    assert.equal(wa.sent.length, 1);
  });

  test("a paused contact gets no reply and no read receipt, but the message is logged", async () => {
    const paused = "94770000204"; // seeded as paused
    const r = await bot.handleMessage(textMsg(paused, "hello?"));
    assert.equal(r.status, "paused");
    assert.equal(wa.sent.length, 0);
    assert.equal(wa.read.length, 0);
    assert.equal(messagesFor(paused).length, 1);
    assert.equal(state(paused), "idle", "state untouched");

    db.setBotPaused(db.getContactByWaId(paused).id, false);
    assert.equal((await bot.handleMessage(textMsg(paused, "hello?"))).status, "handled");
    assert.equal(wa.sent.length, 1);
  });

  test("even 'menu' doesn't wake a paused contact", async () => {
    const r = await bot.handleMessage(textMsg("94770000204", "menu"));
    assert.equal(r.status, "paused");
    assert.equal(wa.sent.length, 0);
  });

  test("messages from one person are handled in order, one at a time", async () => {
    await Promise.all([
      bot.handleMessage(textMsg(NEW_NUMBER, "first")),
      bot.handleMessage(textMsg(NEW_NUMBER, "second")),
      bot.handleMessage(textMsg(NEW_NUMBER, "menu")),
    ]);
    assert.deepEqual(wa.sent.map((s) => s.body.split(" ")[0]), ["Hi!", "Sorry,", "Hi!"]);
  });

  test("a failed send is logged, not thrown, and the state is still saved", async () => {
    const bad = createHandler({ db, whatsapp: fakeWhatsApp({ failSend: true }), log: quietLog });
    const r = await bad.handleMessage(textMsg(NEW_NUMBER, "hello"));
    assert.equal(r.status, "handled");
    assert.equal(state(NEW_NUMBER), "main_menu");
    assert.deepEqual(messagesFor(NEW_NUMBER).map((m) => m.direction), ["in"], "no 'out' row for a failed send");
  });

  test("without WhatsApp credentials it routes but sends nothing", async () => {
    const off = fakeWhatsApp({ configured: false });
    const r = await createHandler({ db, whatsapp: off, log: quietLog }).handleMessage(textMsg(NEW_NUMBER, "hi"));
    assert.equal(r.replies.length, 1);
    assert.equal(off.sent.length, 0);
  });

  test("malformed messages are ignored", async () => {
    assert.equal((await bot.handleMessage({ id: "x" })).status, "invalid");
    assert.equal((await bot.handleMessage(null)).status, "invalid");
    assert.equal(wa.sent.length, 0);
  });

  test("an image (no text) still routes", async () => {
    const r = await bot.handleMessage({ id: "wamid.img", from: NEW_NUMBER, type: "image", image: { id: "media1" } });
    assert.equal(r.status, "handled");
    assert.equal(messagesFor(NEW_NUMBER)[0].type, "image");
  });
});

describe("routing", () => {
  test("first message shows the menu; anything else in the menu gets a nudge", async () => {
    await bot.handleMessage(textMsg(NEW_NUMBER, "hello"));
    await bot.handleMessage(textMsg(NEW_NUMBER, "what?"));
    assert.match(wa.sent[1].body, /didn't catch that/);
    assert.equal(state(NEW_NUMBER), "main_menu");
  });

  test("'menu' resets from any state, in any case and with punctuation", async () => {
    for (const word of ["menu", "MENU", "  Menu. ", "menu!"]) {
      const c = db.ensureContact(NEW_NUMBER);
      db.setConversation(c.id, "some_flow_step", { half: "done" });
      wa.sent.length = 0;
      await bot.handleMessage(textMsg(NEW_NUMBER, word));
      assert.match(wa.sent[0].body, /Welcome/, `"${word}"`);
      assert.deepEqual(db.getConversation(c.id), { ...db.getConversation(c.id), state: "main_menu", context: {} });
    }
  });

  test("words merely containing 'menu' are not the command", async () => {
    await bot.handleMessage(textMsg(NEW_NUMBER, "hello"));
    await bot.handleMessage(textMsg(NEW_NUMBER, "show me the menu please"));
    assert.match(wa.sent[1].body, /didn't catch that/);
  });

  test("an unknown saved state falls back to the menu", async () => {
    const c = db.ensureContact(NEW_NUMBER);
    db.setConversation(c.id, "state_from_an_old_version", {});
    await bot.handleMessage(textMsg(NEW_NUMBER, "hi"));
    assert.match(wa.sent[0].body, /Welcome/);
    assert.equal(state(NEW_NUMBER), "main_menu");
  });
});
