// Database tests (db/index.js, db/schema.sql) on an in-memory database. Run: npm test

process.env.DB_PATH = ":memory:";

const { test, beforeEach, describe } = require("node:test");
const assert = require("node:assert/strict");
const db = require("../db");
const { setupInstitute, REGULAR, PAUSED } = require("./fixtures");

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
      [["asks_for_person", 1], ["bot_unsure", 1], ["group_enrolment", 1]]);
    assert.deepEqual([db.listProducts(), db.listFaqs(), db.listConversations()], [[], [], []]);
  });

  test("applying the schema again keeps the data (it runs on every start)", () => {
    db.saveBusiness({ name: "Kept" });
    db.saveHandoverRules([{ key: "group_enrolment", enabled: false }]);
    const schema = require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "db", "schema.sql"), "utf8");
    db.open().exec(schema);
    assert.equal(db.getBusiness().name, "Kept");
    assert.equal(db.listHandoverRules().find((r) => r.key === "group_enrolment").enabled, 0);
    assert.equal(db.listHandoverRules().length, 3);
  });
});

describe("business details", () => {
  beforeEach(setupInstitute);

  test("saves only the fields given; the name is required", () => {
    db.saveBusiness({ opening_hours: "Every day 8–8" });
    const b = db.getBusiness();
    assert.equal(b.opening_hours, "Every day 8–8");
    assert.equal(b.name, "Test Academy");
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
  beforeEach(setupInstitute);

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
    db.saveHandoverRules([{ key: "group_enrolment", enabled: false }]);
    assert.equal(db.listHandoverRules().find((r) => r.key === "group_enrolment").enabled, 0);
    rejects(() => db.saveHandoverRules([{ key: "nope", enabled: true }]), /Unknown handover rule/);
  });

  test("the settings page is saved all or nothing", () => {
    // The handover rule is saved last and is the one that fails: the earlier parts must roll back.
    rejects(() => db.saveSettings({
      business: { opening_hours: "changed" },
      languages: { ta: false },
      handover_rules: [{ key: "nope", enabled: false }],
    }), /Unknown handover rule/);
    assert.equal(db.getBusiness().opening_hours, "Mon–Sat, 8:00 AM–6:00 PM");
    assert.equal(db.listReplyLanguages().find((l) => l.code === "ta").enabled, 1);

    const saved = db.saveSettings({ business: { opening_hours: "changed" }, languages: { ta: false }, handover_rules: [{ key: "group_enrolment", enabled: false }] });
    assert.equal(saved.business.opening_hours, "changed");
    assert.equal(saved.languages.find((l) => l.code === "ta").enabled, 0);
    assert.equal(saved.handover_rules.find((r) => r.key === "group_enrolment").enabled, 0);
  });
});

describe("office hours chips", () => {
  beforeEach(setupInstitute);

  test("a chip sets its wording; the wording is stored in opening_hours for the bot", () => {
    db.saveBusiness({ office_hours_preset: "mon_fri_9_5" });
    assert.deepEqual([db.getBusiness().office_hours_preset, db.getBusiness().opening_hours], ["mon_fri_9_5", "Mon–Fri, 9:00 AM–5:00 PM"]);
    db.saveBusiness({ office_hours_preset: "every_day_8_8" });
    assert.equal(db.getBusiness().opening_hours, "Every day, 8:00 AM–8:00 PM");
  });

  test("custom keeps the text the owner typed", () => {
    db.saveBusiness({ office_hours_preset: "custom", opening_hours: "By appointment" });
    assert.deepEqual([db.getBusiness().office_hours_preset, db.getBusiness().opening_hours], ["custom", "By appointment"]);
    db.saveBusiness({ office_hours_preset: "custom", opening_hours: "" });
    assert.equal(db.getBusiness().opening_hours, null, "an emptied custom field is cleared");
  });

  test("typed text that matches a chip counts as that chip; other text is custom", () => {
    db.saveBusiness({ opening_hours: "Mon–Sat, 8:00 AM–6:00 PM" });
    assert.equal(db.getBusiness().office_hours_preset, "mon_sat_8_6");
    db.saveBusiness({ opening_hours: "Weekdays only" });
    assert.equal(db.getBusiness().office_hours_preset, "custom");
  });

  test("an unknown chip is refused and nothing is saved", () => {
    db.saveBusiness({ office_hours_preset: "mon_fri_9_5" });
    rejects(() => db.saveBusiness({ office_hours_preset: "weekends", opening_hours: "x" }), /Choose one of the office hours/);
    assert.deepEqual([db.getBusiness().office_hours_preset, db.getBusiness().opening_hours], ["mon_fri_9_5", "Mon–Fri, 9:00 AM–5:00 PM"]);
  });

  test("a chip sets the start and finish times too", () => {
    db.saveBusiness({ office_hours_preset: "mon_sat_8_6" });
    assert.deepEqual([db.getBusiness().office_opens, db.getBusiness().office_closes], ["08:00", "18:00"]);
    db.saveBusiness({ office_hours_preset: "mon_fri_9_5", office_opens: "07:00", office_closes: "19:00" });
    assert.deepEqual([db.getBusiness().office_opens, db.getBusiness().office_closes], ["09:00", "17:00"], "times sent with a chip are ignored");
  });

  test("typed times are checked: both or neither, 24-hour, finish after start", () => {
    db.saveBusiness({ office_opens: "09:30", office_closes: "16:45" });
    assert.deepEqual([db.getBusiness().office_opens, db.getBusiness().office_closes], ["09:30", "16:45"]);
    rejects(() => db.saveBusiness({ office_opens: "09:30", office_closes: "" }), /both the opening and the closing/);
    rejects(() => db.saveBusiness({ office_opens: "17:00", office_closes: "08:00" }), /after the opening time/);
    rejects(() => db.saveBusiness({ office_opens: "8am", office_closes: "17:00" }), /like 08:00/);
    rejects(() => db.saveBusiness({ office_opens: "24:00", office_closes: "25:00" }), /like 08:00/);
    assert.deepEqual([db.getBusiness().office_opens, db.getBusiness().office_closes], ["09:30", "16:45"], "a refused save changes nothing");
    db.saveBusiness({ office_opens: "", office_closes: "" });
    assert.deepEqual([db.getBusiness().office_opens, db.getBusiness().office_closes], [null, null], "both blank clears them");
  });

  test("changing a time away from the chip makes the hours custom", () => {
    db.saveBusiness({ office_hours_preset: "mon_sat_8_6" });
    db.saveBusiness({ office_opens: "08:00", office_closes: "18:00" });
    assert.equal(db.getBusiness().office_hours_preset, "mon_sat_8_6", "same times: still the chip");
    db.saveBusiness({ office_opens: "08:30", office_closes: "18:00" });
    assert.equal(db.getBusiness().office_hours_preset, "custom");
  });

  test("clearing the chip leaves the hours text alone", () => {
    db.saveBusiness({ office_hours_preset: "mon_sat_8_6" });
    db.saveBusiness({ office_hours_preset: "" });
    assert.equal(db.getBusiness().office_hours_preset, null);
    assert.equal(db.getBusiness().opening_hours, "Mon–Sat, 8:00 AM–6:00 PM");
  });
});

describe("products", () => {
  beforeEach(setupInstitute);

  test("listed by category then name; hidden ones only when asked", () => {
    // A/L Science, IELTS, Languages, O/L (Grade 11 Maths, Old Hidden)
    assert.deepEqual(db.listProducts().map((p) => p.name),
      ["A/L Physics Theory", "IELTS Preparation", "Spoken English", "Grade 11 Maths", "Old Hidden Item"]);
    assert.ok(!db.listProducts({ activeOnly: true }).some((p) => p.name === "Old Hidden Item"));
  });

  test("fees accept spreadsheet formats but must be whole numbers; seats are optional", () => {
    const p = db.saveProduct(null, { name: "Chemistry Revision", price: "Rs 1,250", stock: "" });
    assert.equal(p.price, 1250);
    assert.equal(p.stock, null);
    assert.equal(db.saveProduct(null, { name: "Art Class", price: "LKR 900.00", stock: "7" }).stock, 7);
    rejects(() => db.saveProduct(null, { name: "Bad", price: "12.50" }), /whole number/);
    rejects(() => db.saveProduct(null, { name: "Bad", price: -1 }), /whole number/);
    rejects(() => db.saveProduct(null, { name: "Bad", price: 10, stock: "lots" }), /seats left in Bad/);
    rejects(() => db.saveProduct(null, { name: "", price: 10 }), /needs a name/);
  });

  test("names are unique in any case; update and delete", () => {
    rejects(() => db.saveProduct(null, { name: "grade 11 maths", price: 1 }), /already exists/);
    const tea = db.listProducts().find((p) => p.name === "IELTS Preparation");
    const updated = db.saveProduct(tea.id, { name: "IELTS Preparation", price: 1500, stock: 10 });
    assert.deepEqual([updated.price, updated.stock], [1500, 10]);
    assert.equal(db.deleteProduct(tea.id), true);
    assert.equal(db.getProduct(tea.id), null);
    rejects(() => db.saveProduct(tea.id, { name: "Gone", price: 1 }), /no longer exists/);
  });

  test("search matches name, subject and details; hidden courses never show", () => {
    assert.deepEqual(db.searchProducts("maths").map((p) => p.name), ["Grade 11 Maths"]);
    assert.deepEqual(db.searchProducts("ielts").map((p) => p.name), ["IELTS Preparation"]);
    assert.deepEqual(db.searchProducts("months").map((p) => p.name), ["Spoken English"]);
    assert.ok(!db.searchProducts("o/l").some((p) => p.name === "Old Hidden Item"));
    assert.equal(db.searchProducts("").length, 4, "empty = everything on offer");
    assert.deepEqual(db.searchProducts("piano"), []);
  });

  test("import: a dry run counts new and updated courses without saving", () => {
    const rows = [
      { name: "ielts preparation", price: "1,500", stock: "40", category: "IELTS" },
      { name: "Biology Revision", price: 1600 },
    ];
    const r = db.importProducts(rows, { dryRun: true });
    assert.deepEqual([r.ok, r.created, r.updated, r.errors], [true, 1, 1, []]);
    assert.equal(db.listProducts().length, 5, "nothing saved");
    const real = db.importProducts(rows);
    assert.equal(real.ok, true);
    assert.equal(db.listProducts().length, 6);
    assert.equal(db.searchProducts("ielts preparation")[0].price, 1500);
  });

  test("import: an update changes only the columns in the file and keeps the course's name", () => {
    db.importProducts([{ name: "ielts preparation", price: "1,500" }]);
    const tea = db.listProducts().find((p) => p.name.toLowerCase() === "ielts preparation");
    assert.equal(tea.name, "IELTS Preparation", "name kept as the owner wrote it");
    assert.equal(tea.price, 1500);
    assert.deepEqual([tea.description, tea.category, tea.stock], ["8 weeks, weekday evenings", "IELTS", null], "missing columns untouched");
    db.importProducts([{ name: "IELTS Preparation", price: 1500, description: "" }]);
    assert.equal(db.listProducts().find((p) => p.name === "IELTS Preparation").description, null, "an empty cell in a column that exists clears it");
  });

  test("bulk: hide, show and delete several courses at once; bad input saves nothing", () => {
    const ids = db.listProducts().filter((p) => ["Spoken English", "IELTS Preparation"].includes(p.name)).map((p) => p.id);
    assert.deepEqual(db.bulkProducts("hide", ids), { changed: 2 });
    assert.ok(db.listProducts().filter((p) => ids.includes(p.id)).every((p) => p.active === 0));
    assert.deepEqual(db.bulkProducts("hide", ids), { changed: 0 }, "already hidden: nothing changes");
    assert.deepEqual(db.bulkProducts("show", [ids[0], ids[0]]), { changed: 1 }, "duplicate ids count once");
    assert.deepEqual(db.bulkProducts("delete", ids), { changed: 2 });
    assert.equal(db.listProducts().length, 3);
    rejects(() => db.bulkProducts("explode", [1]), /Choose what to do/);
    rejects(() => db.bulkProducts("delete", []), /Select at least one/);
    rejects(() => db.bulkProducts("delete", [1, "x"]), /can't be found/);
    assert.equal(db.listProducts().length, 3, "nothing changed by the rejected calls");
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
    rejects(() => db.importProducts([]), /no courses/);
  });
});

describe("FAQs, contacts and messages", () => {
  beforeEach(setupInstitute);

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
