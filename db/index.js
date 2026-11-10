// Data access for the tutor agent, on Node's built-in SQLite (node:sqlite, Node 22.13+).
// Every query the conversation flow needs lives here, so the rest of the app never writes SQL.

const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const DEFAULT_PATH = path.join(__dirname, "..", "data", "tutor.db");
let db;

function open(file = process.env.DB_PATH || DEFAULT_PATH) {
  if (db) return db;
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));
  return db;
}

function close() {
  db?.close();
  db = undefined;
}

const q = (sql) => open().prepare(sql);
const plain = (row) => (row ? { ...row } : null); // node:sqlite rows have a null prototype

function transaction(fn) {
  open().exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

// ---------- Dates (tutor's local time) ----------

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Today's date and time in the given timezone, e.g. { date: '2026-11-10', time: '14:05' }.
function localNow(timeZone, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(now).map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const isoDayOfWeek = (date) => new Date(`${date}T00:00:00Z`).getUTCDay() || 7;

// ---------- Tutor & catalog ----------

function getTutor() {
  return plain(q("SELECT * FROM tutor WHERE id = 1").get());
}

function listSubjects() {
  return q("SELECT * FROM subjects ORDER BY level, name").all().map(plain);
}

const CLASS_SELECT = `
  SELECT c.*, s.name AS subject_name, s.level AS subject_level,
         (SELECT COUNT(*) FROM enrollments e
           WHERE e.class_id = c.id AND e.status = 'active') AS enrolled_count
  FROM classes c JOIN subjects s ON s.id = c.subject_id`;

function listClasses({ subjectId } = {}) {
  const rows = subjectId
    ? q(`${CLASS_SELECT} WHERE c.active = 1 AND c.subject_id = ? ORDER BY c.day_of_week, c.start_time`).all(subjectId)
    : q(`${CLASS_SELECT} WHERE c.active = 1 ORDER BY c.day_of_week, c.start_time`).all();
  return rows.map(withSeats);
}

function getClass(id) {
  const row = q(`${CLASS_SELECT} WHERE c.id = ?`).get(id);
  return row ? withSeats(row) : null;
}

function withSeats(row) {
  const c = plain(row);
  c.day_name = DAY_NAMES[c.day_of_week];
  c.seats_left = c.capacity == null ? null : Math.max(0, c.capacity - c.enrolled_count);
  return c;
}

function getIndividualRate(subjectId) {
  return q("SELECT hourly_rate FROM individual_rates WHERE subject_id = ?").get(subjectId)?.hourly_rate ?? null;
}

function listAvailability() {
  return q("SELECT * FROM availability ORDER BY day_of_week, start_time").all()
    .map((r) => ({ ...r, day_name: DAY_NAMES[r.day_of_week] }));
}

// ---------- Students ----------

function getStudentByWaId(waId) {
  return plain(q("SELECT * FROM students WHERE wa_id = ?").get(waId));
}

const STUDENT_FIELDS = ["name", "grade", "school", "parent_name", "parent_phone"];

// Create the student if new, otherwise update only the fields given.
function upsertStudent(waId, fields = {}) {
  const keys = STUDENT_FIELDS.filter((k) => fields[k] !== undefined);
  q("INSERT INTO students (wa_id) VALUES (?) ON CONFLICT(wa_id) DO NOTHING").run(waId);
  if (keys.length) {
    q(`UPDATE students SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE wa_id = ?`)
      .run(...keys.map((k) => fields[k]), waId);
  }
  return getStudentByWaId(waId);
}

// ---------- Enrollments ----------

// Returns { ok, reason?, enrollment? }. A full class or a duplicate is refused.
function enroll(studentId, classId) {
  return transaction(() => {
    const cls = getClass(classId);
    if (!cls || !cls.active) return { ok: false, reason: "class_not_found" };
    const existing = plain(q("SELECT * FROM enrollments WHERE student_id = ? AND class_id = ?").get(studentId, classId));
    if (existing && existing.status !== "cancelled") return { ok: false, reason: "already_enrolled", enrollment: existing };
    if (cls.seats_left === 0) return { ok: false, reason: "class_full" };
    if (existing) {
      q("UPDATE enrollments SET status = 'pending', enrolled_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?").run(existing.id);
    } else {
      q("INSERT INTO enrollments (student_id, class_id) VALUES (?, ?)").run(studentId, classId);
    }
    return { ok: true, enrollment: plain(q("SELECT * FROM enrollments WHERE student_id = ? AND class_id = ?").get(studentId, classId)) };
  });
}

function setEnrollmentStatus(studentId, classId, status) {
  return q("UPDATE enrollments SET status = ? WHERE student_id = ? AND class_id = ?").run(status, studentId, classId).changes > 0;
}

function listEnrollments(studentId) {
  return q(`
    SELECT e.status, e.enrolled_at, c.id AS class_id, c.title, c.day_of_week, c.start_time,
           c.duration_minutes, c.mode, c.location, c.monthly_fee, s.name AS subject_name, s.level AS subject_level
    FROM enrollments e
    JOIN classes c ON c.id = e.class_id
    JOIN subjects s ON s.id = c.subject_id
    WHERE e.student_id = ? AND e.status != 'cancelled'
    ORDER BY c.day_of_week, c.start_time`).all(studentId)
    .map((r) => ({ ...r, day_name: DAY_NAMES[r.day_of_week] }));
}

// ---------- Schedule ----------

// Class sessions in the next `days` days for the given classes, with holidays
// and reschedules applied. Sorted by date and time.
function upcomingSessions(classIds, { days = 7, now = new Date() } = {}) {
  if (!classIds.length) return [];
  const tz = getTutor()?.timezone || "Asia/Colombo";
  const today = localNow(tz, now);
  const end = addDays(today.date, days);
  const sessions = [];

  for (const id of classIds) {
    const cls = getClass(id);
    if (!cls?.active) continue;
    const exceptions = new Map(
      q("SELECT * FROM class_exceptions WHERE class_id = ?").all(id).map((e) => [e.date, plain(e)]),
    );
    for (let i = 0; i < days; i++) {
      const date = addDays(today.date, i);
      if (isoDayOfWeek(date) !== cls.day_of_week) continue;
      const ex = exceptions.get(date);
      const s = { class_id: id, title: cls.title, subject_name: cls.subject_name, mode: cls.mode,
                  location: cls.location, date, time: cls.start_time, duration_minutes: cls.duration_minutes,
                  status: "scheduled", note: null };
      if (ex?.status === "cancelled") Object.assign(s, { status: "cancelled", note: ex.note });
      if (ex?.status === "rescheduled") {
        Object.assign(s, { status: "rescheduled", date: ex.new_date || date, time: ex.new_time || s.time,
                           note: ex.note, original_date: date });
      }
      sessions.push(s);
    }
    // Sessions moved into this window from a date outside it.
    for (const ex of exceptions.values()) {
      if (ex.status === "rescheduled" && ex.new_date && ex.new_date >= today.date && ex.new_date < end
          && !(ex.date >= today.date && ex.date < end)) {
        sessions.push({ class_id: id, title: cls.title, subject_name: cls.subject_name, mode: cls.mode,
                        location: cls.location, date: ex.new_date, time: ex.new_time || cls.start_time,
                        duration_minutes: cls.duration_minutes, status: "rescheduled", note: ex.note,
                        original_date: ex.date });
      }
    }
  }
  // Drop sessions that already ended today.
  return sessions
    .filter((s) => s.date > today.date || s.time >= today.time || s.status === "cancelled")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

// ---------- Payments ----------

function listPayments(studentId, { status } = {}) {
  const sql = `
    SELECT p.*, c.title AS class_title FROM payments p JOIN classes c ON c.id = p.class_id
    WHERE p.student_id = ? ${status ? "AND p.status = ?" : ""} ORDER BY p.month, c.title`;
  return (status ? q(sql).all(studentId, status) : q(sql).all(studentId)).map(plain);
}

function amountDue(studentId) {
  return q("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE student_id = ? AND status = 'due'").get(studentId).total;
}

// Create this month's fee rows for every active enrollment (safe to run repeatedly).
function generateMonthlyFees(month) {
  return q(`
    INSERT INTO payments (student_id, class_id, month, amount)
    SELECT e.student_id, e.class_id, ?, c.monthly_fee
    FROM enrollments e JOIN classes c ON c.id = e.class_id
    WHERE e.status = 'active'
    ON CONFLICT(student_id, class_id, month) DO NOTHING`).run(month).changes;
}

function markPaid(paymentId, reference) {
  return q(`UPDATE payments SET status = 'paid', paid_at = strftime('%Y-%m-%dT%H:%M:%SZ','now'), reference = ?
            WHERE id = ? AND status = 'due'`).run(reference ?? null, paymentId).changes > 0;
}

// ---------- One-to-one bookings ----------

function createBooking({ studentId, subjectId, startsAt, durationMinutes = 60, topic }) {
  const { lastInsertRowid } = q(`
    INSERT INTO bookings (student_id, subject_id, starts_at, duration_minutes, topic)
    VALUES (?, ?, ?, ?, ?)`).run(studentId, subjectId, startsAt, durationMinutes, topic ?? null);
  return getBooking(Number(lastInsertRowid));
}

function getBooking(id) {
  return plain(q(`SELECT b.*, s.name AS subject_name FROM bookings b JOIN subjects s ON s.id = b.subject_id
                  WHERE b.id = ?`).get(id));
}

function listBookings(studentId, { upcomingOnly = true } = {}) {
  const tz = getTutor()?.timezone || "Asia/Colombo";
  const { date, time } = localNow(tz);
  return q(`
    SELECT b.*, s.name AS subject_name FROM bookings b JOIN subjects s ON s.id = b.subject_id
    WHERE b.student_id = ? ${upcomingOnly ? "AND b.starts_at >= ? AND b.status IN ('requested','confirmed')" : ""}
    ORDER BY b.starts_at`).all(...(upcomingOnly ? [studentId, `${date} ${time}`] : [studentId])).map(plain);
}

function setBookingStatus(id, status) {
  return q("UPDATE bookings SET status = ? WHERE id = ?").run(status, id).changes > 0;
}

// ---------- Materials & FAQs ----------

// General materials plus those for classes the student is enrolled in.
function listMaterials(studentId) {
  return q(`
    SELECT m.*, c.title AS class_title FROM materials m LEFT JOIN classes c ON c.id = m.class_id
    WHERE m.class_id IS NULL OR m.class_id IN
      (SELECT class_id FROM enrollments WHERE student_id = ? AND status = 'active')
    ORDER BY m.created_at DESC`).all(studentId).map(plain);
}

// FAQs whose keywords appear in the text, best match first.
function findFaqs(text) {
  const t = String(text).toLowerCase();
  return q("SELECT * FROM faqs").all()
    .map((f) => ({ ...f, score: f.keywords.split(",").map((k) => k.trim()).filter((k) => k && t.includes(k)).length }))
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score);
}

// ---------- Conversation state & message log ----------

function getConversation(waId) {
  const row = q("SELECT * FROM conversations WHERE wa_id = ?").get(waId);
  return row ? { ...row, context: JSON.parse(row.context) } : { wa_id: waId, state: "idle", context: {} };
}

function setConversation(waId, state, context = {}) {
  q(`INSERT INTO conversations (wa_id, state, context, updated_at)
     VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'))
     ON CONFLICT(wa_id) DO UPDATE SET state = excluded.state, context = excluded.context,
                                     updated_at = excluded.updated_at`).run(waId, state, JSON.stringify(context));
}

// Returns false if this message id was already logged (a webhook retry).
function logMessage({ id, waId, direction, type, body }) {
  return q(`INSERT INTO messages (id, wa_id, direction, type, body) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO NOTHING`).run(id, waId, direction, type, body ?? null).changes > 0;
}

module.exports = {
  open, close, transaction, localNow, DAY_NAMES,
  getTutor, listSubjects, listClasses, getClass, getIndividualRate, listAvailability,
  getStudentByWaId, upsertStudent,
  enroll, setEnrollmentStatus, listEnrollments,
  upcomingSessions,
  listPayments, amountDue, generateMonthlyFees, markPaid,
  createBooking, getBooking, listBookings, setBookingStatus,
  listMaterials, findFaqs,
  getConversation, setConversation, logMessage,
};
