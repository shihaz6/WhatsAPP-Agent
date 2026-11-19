// Database tests (db/index.js, db/schema.sql) on an in-memory database. Run: npm test

process.env.DB_PATH = ":memory:";

const { test, beforeEach, describe } = require("node:test");
const assert = require("node:assert/strict");
const db = require("../db");
const { setupShop, REGULAR, PAUSED } = require("./fixtures");

const rejects = (fn, pattern) => assert.throws(fn, (err) => err.status === 400 && pattern.test(err.message));

describe("a new database", () => {
  beforeEach(() => db.resetSchema());

  test("starts empty, with one business row, all reply languages on and the default handover rules", () => {
    const b = db.getBusiness();
    assert.equal(b.name, "");
    assert.equal(b.bot_enabled, 1);
    assert.equal(b.currency, "LKR");
    assert.deepEqual(db.listReplyLanguages(), [{ code: "si", enabled: 1 }, { code: "ta", enabled: 1 }, { code: "en", enabled: 1 }]);
    assert.deepEqual(db.listHandoverRules().map((r) => [r.key, r.enabled]),
      [["asks_for_person", 1], ["bot_unsure", 1], ["bulk_order", 1]]);
    assert.deepEqual([db.listProducts(), db.listFaqs(), db.listConversations()], [[], [], []]);
  });

  test("applying the schema again keeps the data (it runs on every start)", () => {
    db.saveBusiness({ name: "Kept" });
    db.saveHandoverRules([{ key: "bulk_order", enabled: false }]);
    const schema = require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "db", "schema.sql"), "utf8");
    db.open().exec(schema);
    assert.equal(db.getBusiness().name, "Kept");
    assert.equal(db.listHandoverRules().find((r) => r.key === "bulk_order").enabled, 0);
    assert.equal(db.listHandoverRules().length, 3);
  });
});

describe("business details", () => {
  beforeEach(setupShop);

  test("saves only the fields given; the name is required", () => {
    db.saveBusiness({ opening_hours: "Every day 8–8" });
    const b = db.getBusiness();
    assert.equal(b.opening_hours, "Every day 8–8");
    assert.equal(b.name, "Test Spice Shop");
    assert.equal(b.location, "1 Test Road, Colombo 03");
    rejects(() => db.saveBusiness({ name: "  " }), /name is required/);
    db.saveBusiness({ delivery_info: "" });
    assert.equal(db.getBusiness().delivery_info, null, "an emptied field is cleared");
  });

  test("the handover number is stored as digits with the country code", () => {
    assert.equal(db.saveBusiness({ handover_number: "+94 77 123 4567" }).handover_number, "94771234567");
    assert.equal(db.saveBusiness({ handover_number: "" }).handover_number, null);
    rejects(() => db.saveBusiness({ handover_number: "12345" }), /country code/);
  });

  test("currency must be a 3-letter code", () => {
    assert.equal(db.saveBusiness({ currency: "usd" }).currency, "USD");
    rejects(() => db.saveBusiness({ currency: "rupees" }), /3-letter/);
  });

  test("the bot can be switched off for everyone", () => {
    assert.equal(db.setBotEnabled(false).bot_enabled, 0);
    assert.equal(db.setBotEnabled(true).bot_enabled, 1);
  });
});

describe("reply languages and handover rules", () => {
  beforeEach(setupShop);

  test("languages are switched on and off; at least one stays on", () => {
    db.saveReplyLanguages({ ta: false });
    assert.deepEqual(db.listReplyLanguages().map((l) => l.enabled), [1, 0, 1]);
    rejects(() => db.saveReplyLanguages({ si: false, ta: false, en: false }), /at least one/);
    assert.deepEqual(db.listReplyLanguages().map((l) => l.enabled), [1, 0, 1], "a refused save changes nothing");
  });

  test("the reply language: theirs if allowed (Singlish counts as Sinhala), else English, else the first one on", () => {
    assert.equal(db.replyLanguageFor("singlish"), "singlish");
    db.saveReplyLanguages({ si: false });
    assert.equal(db.replyLanguageFor("singlish"), "en");
    assert.equal(db.replyLanguageFor("si"), "en");
    assert.equal(db.replyLanguageFor("tanglish"), "tanglish");
    db.saveReplyLanguages({ en: false, si: true });
    assert.equal(db.replyLanguageFor("en"), "si");
  });

  test("handover rules are switched on and off by key", () => {
    db.saveHandoverRules([{ key: "bulk_order", enabled: false }]);
    assert.equal(db.listHandoverRules().find((r) => r.key === "bulk_order").enabled, 0);
    rejects(() => db.saveHandoverRules([{ key: "nope", enabled: true }]), /Unknown handover rule/);
  });

  test("the settings page is saved all or nothing", () => {
    // The handover rule is saved last and is the one that fails: the earlier parts must roll back.
    rejects(() => db.saveSettings({
      business: { opening_hours: "changed" },
      languages: { ta: false },
      handover_rules: [{ key: "nope", enabled: false }],
    }), /Unknown handover rule/);
    assert.equal(db.getBusiness().opening_hours, "Mon–Sat, 9:00 AM–7:00 PM");
    assert.equal(db.listReplyLanguages().find((l) => l.code === "ta").enabled, 1);

    const saved = db.saveSettings({ business: { opening_hours: "changed" }, languages: { ta: false }, handover_rules: [{ key: "bulk_order", enabled: false }] });
    assert.equal(saved.business.opening_hours, "changed");
    assert.equal(saved.languages.find((l) => l.code === "ta").enabled, 0);
    assert.equal(saved.handover_rules.find((r) => r.key === "bulk_order").enabled, 0);
  });
});

describe("products", () => {
  beforeEach(setupShop);

  test("listed by category then name; hidden ones only when asked", () => {
    // Pantry, Spices (Cinnamon, Old Hidden), Sweeteners, Tea
    assert.deepEqual(db.listProducts().map((p) => p.name),
      ["Coconut Oil", "Cinnamon Sticks", "Old Hidden Item", "Kithul Treacle", "Black Tea"]);
    assert.ok(!db.listProducts({ activeOnly: true }).some((p) => p.name === "Old Hidden Item"));
  });

  test("prices accept spreadsheet formats but must be whole numbers; stock is optional", () => {
    const p = db.saveProduct(null, { name: "Pepper", price: "Rs 1,250", stock: "" });
    assert.equal(p.price, 1250);
    assert.equal(p.stock, null);
    assert.equal(db.saveProduct(null, { name: "Cloves", price: "LKR 900.00", stock: "7" }).stock, 7);
    rejects(() => db.saveProduct(null, { name: "Bad", price: "12.50" }), /whole number/);
    rejects(() => db.saveProduct(null, { name: "Bad", price: -1 }), /whole number/);
    rejects(() => db.saveProduct(null, { name: "Bad", price: 10, stock: "lots" }), /stock of Bad/);
    rejects(() => db.saveProduct(null, { name: "", price: 10 }), /needs a name/);
  });

  test("names are unique in any case; update and delete", () => {
    rejects(() => db.saveProduct(null, { name: "cinnamon sticks", price: 1 }), /already exists/);
    const tea = db.listProducts().find((p) => p.name === "Black Tea");
    const updated = db.saveProduct(tea.id, { name: "Black Tea", price: 1500, stock: 10 });
    assert.deepEqual([updated.price, updated.stock], [1500, 10]);
    assert.equal(db.deleteProduct(tea.id), true);
    assert.equal(db.getProduct(tea.id), null);
    rejects(() => db.saveProduct(tea.id, { name: "Gone", price: 1 }), /no longer exists/);
  });

  test("search matches name, category and description; hidden products never show", () => {
    assert.deepEqual(db.searchProducts("cinnamon").map((p) => p.name), ["Cinnamon Sticks"]);
    assert.deepEqual(db.searchProducts("tea").map((p) => p.name), ["Black Tea"]);
    assert.deepEqual(db.searchProducts("500ml").map((p) => p.name), ["Coconut Oil"]);
    assert.ok(!db.searchProducts("spices").some((p) => p.name === "Old Hidden Item"));
    assert.equal(db.searchProducts("").length, 4, "empty = everything on sale");
    assert.deepEqual(db.searchProducts("caviar"), []);
  });

  test("import: a dry run counts new and updated products without saving", () => {
    const rows = [
      { name: "black tea", price: "1,500", stock: "40", category: "Tea" },
      { name: "Green Tea", price: 1600 },
    ];
    const r = db.importProducts(rows, { dryRun: true });
    assert.deepEqual([r.ok, r.created, r.updated, r.errors], [true, 1, 1, []]);
    assert.equal(db.listProducts().length, 5, "nothing saved");
    const real = db.importProducts(rows);
    assert.equal(real.ok, true);
    assert.equal(db.listProducts().length, 6);
    assert.equal(db.searchProducts("black tea")[0].price, 1500);
  });

  test("import: an update changes only the columns in the file and keeps the product's name", () => {
    db.importProducts([{ name: "black tea", price: "1,500" }]);
    const tea = db.listProducts().find((p) => p.name.toLowerCase() === "black tea");
    assert.equal(tea.name, "Black Tea", "name kept as the owner wrote it");
    assert.equal(tea.price, 1500);
    assert.deepEqual([tea.description, tea.category, tea.stock], ["200g loose leaf", "Tea", null], "missing columns untouched");
    db.importProducts([{ name: "Black Tea", price: 1500, description: "" }]);
    assert.equal(db.listProducts().find((p) => p.name === "Black Tea").description, null, "an empty cell in a column that exists clears it");
  });

  test("import: any bad row means nothing is saved, and every problem is listed by row", () => {
    const r = db.importProducts([
      { name: "Good", price: 100 },
      { name: "", price: 100 },
      { name: "Pricey", price: "a lot" },
      { name: "good", price: 200 },
    ]);
    assert.equal(r.ok, false);
    assert.deepEqual(r.errors.map((e) => e.row), [2, 3, 4]);
    assert.match(r.errors[2].error, /in the file twice/);
    assert.equal(db.listProducts().length, 5);
    rejects(() => db.importProducts([]), /no products/);
  });
});

describe("FAQs, contacts and messages", () => {
  beforeEach(setupShop);

  test("FAQs: add, edit, delete; both fields required", () => {
    const f = db.saveFaq(null, { question: "Open on Sunday?", answer: "No." });
    assert.equal(db.saveFaq(f.id, { question: "Open on Sunday?", answer: "Only in December." }).answer, "Only in December.");
    assert.equal(db.deleteFaq(f.id), true);
    rejects(() => db.saveFaq(null, { question: "Q", answer: "" }), /question and an answer/);
    assert.equal(db.listFaqs().length, 2);
  });

  test("an unknown number gets a contact; name, language and pause live on it", () => {
    const c = db.ensureContact("94771112222");
    assert.equal(c.language, "en");
    assert.equal(db.ensureContact("94771112222").id, c.id, "same contact on the next message");
    assert.equal(db.updateContact(c.id, { name: "Nimal", language: "singlish" }).language, "singlish");
    const paused = db.setBotPaused(c.id, true, "Asked for a person");
    assert.deepEqual([paused.bot_paused, paused.paused_reason], [1, "Asked for a person"]);
    assert.ok(paused.paused_at);
    const resumed = db.setBotPaused(c.id, false);
    assert.deepEqual([resumed.bot_paused, resumed.paused_reason, resumed.paused_at], [0, null, null]);
  });

  test("the message log drops webhook retries; counts cover the dashboard", () => {
    assert.equal(db.logMessage({ id: "w1", waId: REGULAR, direction: "in", type: "text", body: "hi" }), true);
    assert.equal(db.logMessage({ id: "w1", waId: REGULAR, direction: "in", type: "text", body: "hi" }), false);
    db.logMessage({ id: "w2", waId: REGULAR, direction: "out", type: "text", body: "Hello", status: "sent", sentBy: "bot" });
    db.logMessage({ id: "w3", waId: REGULAR, direction: "out", type: "text", body: "Lost", status: "failed", sentBy: "bot", agentError: "boom" });
    const counts = db.dashboardCounts("2000-01-01T00:00:00Z");
    assert.deepEqual(
      [counts.contacts, counts.paused, counts.messages_in_24h, counts.messages_out_24h, counts.undelivered_24h, counts.agent_errors_24h, counts.products, counts.out_of_stock, counts.faqs],
      [3, 1, 1, 1, 1, 1, 4, 1, 2],
    );
    const [first] = db.listConversations();
    assert.equal(first.wa_id, REGULAR, "latest chat first");
    assert.equal(first.last_body, "Lost");
    assert.ok(db.listConversations().some((c) => c.wa_id === PAUSED && c.bot_paused === 1));
  });

  test("only the owner or the bot can be the sender of an outgoing message", () => {
    assert.throws(() => db.logMessage({ id: "x", waId: REGULAR, direction: "out", type: "text", body: "x", sentBy: "teacher" }), /CHECK/);
  });
});
