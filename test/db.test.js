// Data model tests. Run: npm test
// Each test starts from a freshly seeded in-memory database with a fixed "today"
// (Tue 2026-11-10, 11:30 in Colombo), so dates such as the cancelled Nov 14 class are stable.

process.env.DB_PATH = ":memory:";

const { test, beforeEach, describe } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const db = require("../db");
const { seed } = require("../db/seed");

const NOW = new Date("2026-11-10T06:00:00Z");
const REVIEWER = "Mr. Nuwan Jayasekara";
const PERERA = "94770000202"; // parent with two children
const contactId = (waId) => db.getContactByWaId(waId).id;
const countStudents = () => db.open().prepare("SELECT COUNT(*) AS n FROM students").get().n;
const payment = (studentId, classId, month = "2026-11") =>
  db.listPayments(studentId).find((p) => p.class_id === classId && p.month === month);

let seeded;
beforeEach(() => { seeded = seed({ now: NOW }); });

describe("catalog", () => {
  test("tutor, subjects and classes with seat counts", () => {
    assert.equal(db.getTutor().name, "Mr. Nuwan Jayasekara");
    assert.equal(db.listSubjects().length, 3);
    assert.equal(db.listClasses().length, 7);
    assert.equal(db.listClasses({ subjectId: 2 }).length, 2);
    assert.equal(db.getClass(1).enrolled_count, 3);
    assert.equal(db.getClass(7).seats_left, 0);
    assert.equal(db.getClass(7).day_name, "Friday");
  });
});

describe("contacts and students", () => {
  test("an unknown number gets a contact, not a student", () => {
    const before = countStudents();
    const c = db.ensureContact("94779999999");
    assert.equal(c.wa_id, "94779999999");
    assert.equal(c.language, "en");
    assert.equal(c.bot_paused, 0);
    assert.equal(db.ensureContact("94779999999").id, c.id, "second message reuses the contact");
    assert.deepEqual(db.listStudents(c.id), []);
    assert.equal(countStudents(), before);
  });

  test("seeded new contact has no students", () => {
    assert.deepEqual(db.listStudents(contactId("94770000109")), []);
  });

  test("one parent contact has two children", () => {
    const id = contactId(PERERA);
    assert.equal(db.getContact(id).kind, "parent");
    assert.deepEqual(db.listStudents(id).map((s) => s.name), ["Dilini Perera", "Kasun Perera"]);
    const kids = new Set(db.listPaymentsForContact(id).map((p) => p.student_name));
    assert.deepEqual([...kids].sort(), ["Dilini Perera", "Kasun Perera"]);
  });

  test("an adult student is their own contact", () => {
    const id = contactId("94770000103");
    assert.equal(db.getContact(id).kind, "student");
    assert.deepEqual(db.listStudents(id).map((s) => s.name), ["Kavindu Silva"]);
  });

  test("language preference and bot pause live on the contact", () => {
    const id = db.ensureContact("94779999999").id;
    assert.equal(db.updateContact(id, { language: "ta", name: "Mr. T" }).language, "ta");
    const paused = db.setBotPaused(id, true, "Asked to speak to the tutor");
    assert.equal(paused.bot_paused, 1);
    assert.equal(paused.paused_reason, "Asked to speak to the tutor");
    assert.ok(paused.paused_at);
    const resumed = db.setBotPaused(id, false);
    assert.equal(resumed.bot_paused, 0);
    assert.equal(resumed.paused_at, null);
    assert.equal(db.getContactByWaId("94770000204").bot_paused, 1, "seed has a paused contact");
    assert.equal(db.getContactByWaId(PERERA).language, "si");
    assert.throws(() => db.updateContact(id, { language: "fr" }), /CHECK/);
  });
});

describe("enrollment creates students only on success", () => {
  test("a parent enrols a third child: new student under the same contact", () => {
    const id = contactId(PERERA);
    const r = db.enroll({ contactId: id, name: "Nimesh Perera", grade: "Grade 10" }, 6);
    assert.equal(r.ok, true);
    assert.equal(r.student.contact_id, id);
    assert.equal(r.enrollment.status, "pending");
    assert.equal(db.listStudents(id).length, 3);
  });

  test("same child's name (any case) reuses the student", () => {
    const id = contactId(PERERA);
    const r = db.enroll({ contactId: id, name: "kasun perera" }, 6);
    assert.equal(r.reason, "already_enrolled");
    assert.equal(db.listStudents(id).length, 2);
  });

  test("a refused enrolment does not create a student", () => {
    const c = db.ensureContact("94779999999");
    const before = countStudents();
    assert.equal(db.enroll({ contactId: c.id, name: "New Kid" }, 7).reason, "class_full");
    assert.equal(db.enroll({ contactId: c.id, name: "New Kid" }, 999).reason, "class_not_found");
    assert.equal(countStudents(), before);
  });

  test("duplicate, re-enrol after cancel, bad refs", () => {
    assert.equal(db.enroll(1, 1).reason, "already_enrolled");
    assert.equal(db.enroll(5, 4).ok, true, "student 5 had cancelled class 4");
    assert.throws(() => db.enroll({ contactId: 1 }, 1), /name/);
    assert.throws(() => db.enroll(9999, 1), /not found/);
    assert.equal(db.listEnrollments(1).length, 3);
  });
});

describe("schedule", () => {
  test("upcoming sessions apply the cancellation and reschedule", () => {
    const s = db.upcomingSessions([1, 3], { days: 14, now: NOW });
    const line = (x) => `${x.date} ${x.time} ${x.status} ${x.class_id}`;
    assert.deepEqual(s.map(line), [
      "2026-11-13 19:00 rescheduled 3",
      "2026-11-14 08:00 cancelled 1",
      "2026-11-18 18:00 scheduled 3",
      "2026-11-21 08:00 scheduled 1",
    ]);
    assert.equal(seeded.cancelledDate, "2026-11-14");
  });
});

describe("trials", () => {
  test("cannot book a trial on the cancelled Nov 14 session", () => {
    const c = db.ensureContact("94779999999");
    const before = countStudents();
    const r = db.bookTrial({ contactId: c.id, name: "Trial Kid" }, 1, "2026-11-14", { now: NOW });
    assert.equal(r.ok, false);
    assert.equal(r.reason, "session_cancelled");
    assert.match(r.note, /Hall unavailable/);
    assert.equal(countStudents(), before, "no student created");
  });

  test("a trial on another class that Saturday works", () => {
    const c = db.ensureContact("94779999999");
    const r = db.bookTrial({ contactId: c.id, name: "Trial Kid" }, 4, "2026-11-14", { now: NOW });
    assert.equal(r.ok, true);
    assert.equal(r.trial.status, "booked");
    assert.equal(r.trial.time, "13:30");
    assert.equal(r.student.contact_id, c.id);
    assert.equal(db.bookTrial(r.student.id, 4, "2026-11-21", { now: NOW }).reason, "trial_exists");
    assert.ok(db.setTrialStatus(r.trial.id, "cancelled"));
    assert.equal(db.bookTrial(r.student.id, 4, "2026-11-21", { now: NOW }).ok, true, "rebook after cancelling");
  });

  test("rescheduled session: old date refused with the new date, new date accepted", () => {
    const c = db.ensureContact("94779999999");
    const old = db.bookTrial({ contactId: c.id, name: "Trial Kid" }, 3, "2026-11-11", { now: NOW });
    assert.equal(old.reason, "session_rescheduled");
    assert.deepEqual(old.moved_to, { date: "2026-11-13", time: "19:00" });
    const moved = db.bookTrial({ contactId: c.id, name: "Trial Kid" }, 3, "2026-11-13", { now: NOW });
    assert.equal(moved.ok, true);
    assert.equal(moved.trial.time, "19:00");
  });

  test("other refusals", () => {
    const ref = { contactId: db.ensureContact("94779999999").id, name: "Trial Kid" };
    assert.equal(db.bookTrial(ref, 1, "2026-11-15", { now: NOW }).reason, "no_session_on_date", "a Sunday");
    assert.equal(db.bookTrial(ref, 1, "2026-11-07", { now: NOW }).reason, "in_past");
    assert.equal(db.bookTrial(ref, 1, "2026-13-40", { now: NOW }).reason, "invalid_date");
    assert.equal(db.bookTrial(ref, 7, "2026-11-13", { now: NOW }).reason, "class_full");
    assert.equal(db.bookTrial(1, 1, "2026-11-21", { now: NOW }).reason, "already_enrolled");
  });
});

describe("payments and slips", () => {
  test("full path: due -> slip received -> approved", () => {
    const p = payment(1, 4); // Sahan, Physics theory, November
    assert.equal(p.status, "due");
    const dueBefore = db.amountDue(1);

    assert.deepEqual(db.submitSlip(p.id, { mediaId: "media-123", reference: "TRX999" }), { ok: true });
    const received = db.getPayment(p.id);
    assert.equal(received.status, "slip_received");
    assert.equal(received.slip_media_id, "media-123");
    assert.equal(received.slip_reference, "TRX999");
    assert.ok(received.slip_received_at);
    assert.equal(db.amountDue(1), dueBefore - p.amount, "a slip under review is not counted as owed");
    assert.ok(db.listSlipsAwaitingReview().some((x) => x.id === p.id));

    const r = db.approvePayment(p.id, REVIEWER);
    assert.equal(r.ok, true);
    assert.equal(r.payment.status, "approved");
    assert.equal(r.payment.reviewed_by, REVIEWER);
    assert.ok(r.payment.reviewed_at);
    assert.ok(!db.listSlipsAwaitingReview().some((x) => x.id === p.id));
    assert.equal(db.approvePayment(p.id, REVIEWER).reason, "no_slip_to_review", "can't approve twice");
  });

  test("rejected slip: owed again, reason kept, then a new slip is approved", () => {
    const p = payment(5, 1); // Rizwan, CM theory, November
    db.submitSlip(p.id, { mediaId: "blurry-photo" });
    assert.throws(() => db.rejectPayment(p.id, REVIEWER), /reason/);

    const r = db.rejectPayment(p.id, REVIEWER, "Photo is unreadable");
    assert.equal(r.payment.status, "rejected");
    assert.equal(r.payment.review_note, "Photo is unreadable");
    assert.equal(r.payment.reviewed_by, REVIEWER);
    assert.equal(r.payment.slip_media_id, "blurry-photo", "rejected slip stays on record");
    assert.equal(db.amountDue(5), p.amount, "rejected counts as owed again");

    assert.equal(db.submitSlip(p.id, { mediaId: "clear-photo" }).ok, true);
    const resent = db.getPayment(p.id);
    assert.equal(resent.status, "slip_received");
    assert.equal(resent.slip_media_id, "clear-photo");
    assert.equal(resent.reviewed_by, null);
    assert.equal(resent.review_note, null);
    assert.equal(db.approvePayment(p.id, REVIEWER).payment.status, "approved");
  });

  test("invalid transitions are refused", () => {
    const due = payment(1, 4);
    const approved = payment(1, 1);
    assert.equal(approved.status, "approved");
    assert.equal(db.approvePayment(due.id, REVIEWER).reason, "no_slip_to_review");
    assert.equal(db.submitSlip(approved.id, { mediaId: "m" }).reason, "not_awaiting_slip:approved");
    assert.throws(() => db.submitSlip(due.id, {}), /mediaId/);
    // one slip for several payments is all-or-nothing
    assert.equal(db.submitSlip([due.id, approved.id], { mediaId: "m" }).ok, false);
    assert.equal(db.getPayment(due.id).status, "due");
    // the schema itself refuses an approval with no reviewer
    assert.throws(() => db.open().prepare("UPDATE payments SET status = 'approved' WHERE id = ?").run(due.id), /CHECK/);
  });

  test("one slip covers both of a parent's children", () => {
    const id = contactId(PERERA);
    const waiting = db.listPaymentsForContact(id, { status: "slip_received" });
    assert.deepEqual([...new Set(waiting.map((p) => p.student_name))].sort(), ["Dilini Perera", "Kasun Perera"]);
    assert.equal(new Set(waiting.map((p) => p.slip_media_id)).size, 1);
  });

  test("seeded rejected slip and monthly fee generation", () => {
    const rejected = payment(4, 5, "2026-10");
    assert.equal(rejected.status, "rejected");
    assert.match(rejected.review_note, /2,000/);
    assert.equal(db.generateMonthlyFees("2026-11"), 0, "idempotent");
    assert.ok(db.waivePayment(payment(1, 4).id, REVIEWER, "Scholarship"));
  });
});

describe("one-to-one bookings", () => {
  test("booking for a new number creates the student then", () => {
    const id = contactId("94770000109");
    const r = db.createBooking({ student: { contactId: id, name: "Pasindu" }, subjectId: 1,
                                 startsAt: "2099-01-05 17:00", topic: "Vectors" });
    assert.equal(r.ok, true);
    assert.equal(r.booking.status, "requested");
    assert.equal(r.booking.subject_name, "Combined Mathematics");
    assert.deepEqual(db.listStudents(id).map((s) => s.name), ["Pasindu"]);
    assert.equal(db.createBooking({ student: r.student.id, subjectId: 99, startsAt: "2099-01-05 17:00" }).reason,
      "subject_not_found");
  });

  test("upcoming bookings, rates and availability", () => {
    assert.equal(db.listBookings(3, { now: NOW }).length, 1);
    assert.equal(db.listBookings(7, { now: NOW }).length, 0, "only a past, completed one");
    assert.equal(db.getIndividualRate(2), 3000);
    assert.equal(db.listAvailability()[0].day_name, "Monday");
  });
});

describe("materials, FAQs, conversations, message log", () => {
  test("materials are scoped to active enrollments", () => {
    const titles = db.listMaterials(6).map((m) => m.title);
    assert.ok(titles.includes("Grade 10 – Algebra worksheet"));
    assert.ok(titles.includes("2027 class timetable"));
    assert.ok(!titles.some((t) => t.includes("Physics")));
  });

  test("FAQ matching", () => {
    assert.equal(db.findFaqs("how much is the fee?")[0].question, "How much are the class fees?");
    assert.equal(db.findFaqs("can I try a class?")[0].question, "Can I try a class first?");
    assert.equal(db.findFaqs("xyz").length, 0);
  });

  test("conversation state is per contact", () => {
    const id = contactId(PERERA);
    assert.equal(db.getConversation(id).state, "idle");
    db.setConversation(id, "enrolling", { classId: 3 });
    db.setConversation(id, "enrolling", { classId: 4, studentId: 9 });
    assert.deepEqual(db.getConversation(id).context, { classId: 4, studentId: 9 });
  });

  test("message log deduplicates by WhatsApp id", () => {
    const m = { id: "wamid.X", waId: PERERA, direction: "in", type: "text", body: "hi" };
    assert.equal(db.logMessage(m), true);
    assert.equal(db.logMessage(m), false);
  });
});

describe("seed guard", () => {
  test("seed() refuses when NODE_ENV is production", () => {
    const old = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      assert.throws(() => seed({ now: NOW }), /production/);
    } finally {
      if (old === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = old;
    }
    assert.equal(db.listClasses().length, 7, "existing data untouched");
  });

  test("npm run seed exits with an error in production and doesn't create a database", () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "seed-guard-")), "tutor.db");
    const r = spawnSync(process.execPath, [path.join(__dirname, "..", "db", "seed.js")], {
      env: { ...process.env, NODE_ENV: "production", DB_PATH: file }, encoding: "utf8",
    });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Refusing to seed/);
    assert.equal(fs.existsSync(file), false);
  });
});
