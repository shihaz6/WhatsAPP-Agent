// Settings tests: the teacher edits what the bot knows (db/index.js settings functions, admin/api.js
// routes, and that the bot's prompt and tools pick the changes up). No network. Run: npm test

process.env.DB_PATH = ":memory:";

const { test, beforeEach, after, describe } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const db = require("../db");
const { seed } = require("../db/seed");
const { createAdmin } = require("../admin/api");
const { systemPrompt } = require("../bot/agent");
const { createTools } = require("../bot/tools");

const NOW = new Date("2026-11-10T06:00:00Z"); // Tuesday 10 Nov 2026 in Colombo
const GRADE10 = 6;                             // Grade 10 Maths – Theory, Tuesdays 16:00
const TOKEN = "t";
const quiet = { log() {}, warn() {}, error() {} };

let server, base;
const call = async (method, path, body) => {
  const res = await fetch(`${base}/admin/api${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
};
const prompt = () => systemPrompt({ tutor: db.getTutor(), contact: db.ensureContact("94779990001"), students: [], now: NOW, db });
const tool = (name) => createTools({ db, contact: db.ensureContact("94779990001"), now: NOW }).run(name, "{}");

beforeEach(async () => {
  seed({ now: NOW });
  if (!server) {
    const admin = createAdmin({ db, whatsapp: { isConfigured: () => false }, token: TOKEN, clock: () => NOW, log: quiet });
    server = http.createServer((req, res) => { if (!admin.handle(req, res, new URL(req.url, "http://x"))) res.writeHead(404).end(); });
    await new Promise((r) => server.listen(0, r));
    base = `http://localhost:${server.address().port}`;
  }
});
after(() => server?.close());

describe("teacher and payment details", () => {
  test("saved details are what the bot gives parents", async () => {
    const r = await call("POST", "/settings/tutor", {
      name: "Mrs. Real Teacher", bio: "O/L Maths", qualifications: "BSc",
      payment_instructions: "Bank of Ceylon, Acc 123, Name: R. Teacher",
    });
    assert.equal(r.status, 200);
    assert.equal(tool("get_tutor_info").payment_instructions, "Bank of Ceylon, Acc 123, Name: R. Teacher");
    assert.match(prompt(), /WhatsApp assistant for Mrs\. Real Teacher/);
  });

  test("a name is required", async () => {
    assert.equal((await call("POST", "/settings/tutor", { name: " " })).status, 400);
  });
});

describe("subjects and one-to-one", () => {
  test("add a subject with a rate; clearing the rate removes one-to-one for it", async () => {
    const { data: s } = await call("POST", "/subjects", { name: "Chemistry", level: "A/L", hourly_rate: "2500" });
    assert.equal(s.hourly_rate, 2500);
    assert.match(prompt(), /Subjects taught: .*Chemistry \(A\/L\)/);
    assert.ok(tool("get_one_to_one_info").rates.some((r) => r.subject === "Chemistry (A/L)" && r.hourly_rate === "LKR 2,500"));
    const { data: cleared } = await call("POST", `/subjects/${s.id}`, { name: "Chemistry", level: "A/L", hourly_rate: "" });
    assert.equal(cleared.hourly_rate, null);
  });

  test("duplicates are refused, and a subject in use can't be deleted", async () => {
    assert.match((await call("POST", "/subjects", { name: "Physics", level: "A/L" })).data.error, /already exists/);
    const used = db.listSubjects()[0];
    const r = await call("POST", `/subjects/${used.id}/delete`);
    assert.equal(r.status, 400);
    assert.match(r.data.error, /Classes use this subject/);
    const { data: unused } = await call("POST", "/subjects", { name: "Art", level: "O/L" });
    assert.deepEqual((await call("POST", `/subjects/${unused.id}/delete`)).data, { ok: true });
  });

  test("free slots: added, validated and deleted", async () => {
    const { data: slot } = await call("POST", "/availability", { day_of_week: 3, start_time: "17:00", end_time: "19:00" });
    assert.equal(slot.day_name, "Wednesday");
    assert.equal((await call("POST", "/availability", { day_of_week: 3, start_time: "19:00", end_time: "18:00" })).status, 400);
    assert.equal((await call("POST", "/availability", { day_of_week: 9, start_time: "10:00", end_time: "11:00" })).status, 400);
    await call("POST", `/availability/${slot.id}/delete`);
    assert.ok(!db.listAvailability().some((a) => a.id === slot.id));
  });
});

describe("classes", () => {
  const subjectId = () => db.listSubjects().find((s) => s.level === "O/L").id;
  const newClass = () => ({
    title: "Grade 9 Maths", subject_id: subjectId(), class_type: "theory", mode: "physical",
    location: "Room 1", day_of_week: 1, start_time: "15:00", duration_minutes: "90", monthly_fee: "1800", capacity: "25",
  });

  test("a new class is offered by the bot straight away", async () => {
    const r = await call("POST", "/classes", newClass());
    assert.equal(r.status, 200);
    assert.equal(r.data.seats_left, 25);
    assert.match(prompt(), /\*Grade 9 Maths\* · Mathematics \(O\/L\) · Monday 15:00, 90 min · in person at Room 1 · LKR 1,800 a month · 25 seats left/);
  });

  test("editing the fee changes what the bot says", async () => {
    const c = db.getClass(GRADE10);
    await call("POST", `/classes/${GRADE10}`, { ...c, monthly_fee: 2200 });
    assert.match(prompt(), /\*Grade 10 Maths – Theory\*[^\n]*LKR 2,200 a month/);
  });

  test("bad input is refused with a clear reason", async () => {
    const cases = [
      [{ title: "" }, /title/],
      [{ mode: "physical", location: "" }, /venue/],
      [{ start_time: "4pm" }, /16:00/],
      [{ monthly_fee: "-5" }, /fee/],
      [{ subject_id: 999 }, /subject/],
    ];
    for (const [change, reason] of cases) {
      const r = await call("POST", "/classes", { ...newClass(), ...change });
      assert.equal(r.status, 400, JSON.stringify(change));
      assert.match(r.data.error, reason);
    }
    assert.equal((await call("POST", "/classes", { ...newClass(), mode: "online", location: "" })).status, 200, "an online class may have no link yet");
  });

  test("hiding a class: the bot stops offering it; it can be restored", async () => {
    await call("POST", `/classes/${GRADE10}/active`, { active: false });
    assert.doesNotMatch(prompt(), /Grade 10 Maths – Theory/);
    const { data } = await call("GET", "/classes");
    assert.ok(data.hidden.some((c) => c.id === GRADE10));
    await call("POST", `/classes/${GRADE10}/active`, { active: true });
    assert.match(prompt(), /Grade 10 Maths – Theory/);
  });
});

describe("cancelling and moving sessions", () => {
  const schedule = () => tool("get_class_schedule").filter((s) => s.class_id === GRADE10);

  test("a cancelled session shows as cancelled to the bot, with the note; undo restores it", async () => {
    const r = await call("POST", `/classes/${GRADE10}/sessions`, { date: "2026-11-17", status: "cancelled", note: "Teacher unwell" });
    assert.equal(r.status, 200);
    assert.deepEqual(schedule().find((s) => s.date === "2026-11-17"), {
      class_id: GRADE10, title: "Grade 10 Maths – Theory", date: "2026-11-17", day: "Tuesday", time: "16:00",
      status: "cancelled", note: "Teacher unwell", where: "Room 3, Apex Institute, 45 Galle Road, Colombo 06",
    });
    await call("POST", `/classes/${GRADE10}/sessions/2026-11-17/restore`);
    assert.equal(schedule().find((s) => s.date === "2026-11-17").status, "scheduled");
  });

  test("a moved session has its new date and time", async () => {
    await call("POST", `/classes/${GRADE10}/sessions`, { date: "2026-11-17", status: "rescheduled", new_date: "2026-11-18", new_time: "17:00" });
    const moved = schedule().find((s) => s.moved_from === "2026-11-17");
    assert.equal(moved.date, "2026-11-18");
    assert.equal(moved.time, "17:00");
  });

  test("wrong weekday, past dates and a move without a new date or time are refused", async () => {
    const tries = [
      [{ date: "2026-11-18", status: "cancelled" }, /Tuesdays/],
      [{ date: "2026-11-03", status: "cancelled" }, /past/],
      [{ date: "2026-11-17", status: "rescheduled" }, /new date, a new time/],
      [{ date: "2026-11-17", status: "rescheduled", new_date: "2026-11-01" }, /past/],
    ];
    for (const [body, reason] of tries) {
      const r = await call("POST", `/classes/${GRADE10}/sessions`, body);
      assert.equal(r.status, 400, JSON.stringify(body));
      assert.match(r.data.error, reason);
    }
  });

  test("a class's day can't change while it has upcoming cancellations", async () => {
    await call("POST", `/classes/${GRADE10}/sessions`, { date: "2026-11-17", status: "cancelled" });
    const r = await call("POST", `/classes/${GRADE10}`, { ...db.getClass(GRADE10), day_of_week: 3 });
    assert.equal(r.status, 400);
    assert.match(r.data.error, /Undo them/);
  });
});

describe("FAQs", () => {
  test("added, edited and deleted; the bot reads exactly these", async () => {
    const { data: faq } = await call("POST", "/faqs", { question: "Do you have exam papers?", answer: "Yes, every month." });
    assert.ok(tool("get_faqs").some((f) => f.question === "Do you have exam papers?"));
    await call("POST", `/faqs/${faq.id}`, { question: "Do you have exam papers?", answer: "Yes, twice a month." });
    assert.ok(tool("get_faqs").some((f) => f.answer === "Yes, twice a month."));
    await call("POST", `/faqs/${faq.id}/delete`);
    assert.ok(!tool("get_faqs").some((f) => f.question === "Do you have exam papers?"));
  });

  test("question and answer are required", async () => {
    assert.equal((await call("POST", "/faqs", { question: "x", answer: "" })).status, 400);
  });

  test("the settings endpoint returns everything the page needs", async () => {
    const { data } = await call("GET", "/settings");
    assert.equal(data.tutor.name, "Mr. Nuwan Jayasekara");
    assert.ok(data.subjects.every((s) => "hourly_rate" in s && "class_count" in s));
    assert.ok(data.availability.length > 0);
    assert.ok(data.faqs.length > 0 && data.faqs.every((f) => Object.keys(f).join() === "id,question,answer"));
  });
});
