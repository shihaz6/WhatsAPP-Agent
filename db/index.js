// Data access for the tutor agent, on Node's built-in SQLite (node:sqlite, Node 22.13+).
// Every query the conversation flow needs lives here, so the rest of the app never writes SQL.
//
// People model: a *contact* is a WhatsApp number (a parent or an adult student) and is
// created on the first message. A *student* belongs to a contact and is only created when
// someone enrols, books a trial or books a one-to-one session. Those functions take a
// "student ref": either an existing student id, or { contactId, name, grade?, school? }
// for a new student, which is created only if the action succeeds.

const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const DEFAULT_PATH = path.join(__dirname, "..", "data", "tutor.db");
const SCHEMA = path.join(__dirname, "schema.sql");
let db;

// Connect without touching the schema (resetSchema needs this for databases with an old schema).
function connect(file = process.env.DB_PATH || DEFAULT_PATH) {
  if (db) return db;
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  schemaApplied = false;
  return db;
}

let schemaApplied = false;
function open(file) {
  connect(file);
  if (!schemaApplied) {
    db.exec(fs.readFileSync(SCHEMA, "utf8"));
    migrate(db);
    schemaApplied = true;
  }
  return db;
}

// Languages a contact can prefer. Keep in sync with the CHECK on contacts.language in schema.sql.
const LANGUAGES = ["en", "si", "ta", "singlish", "tanglish"];

// Bring an existing database up to date. CREATE TABLE IF NOT EXISTS doesn't change existing
// tables, so a CHECK that grew needs the table rebuilt (SQLite can't alter a CHECK).
function migrate(conn) {
  const row = conn.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'contacts'").get();
  if (!row || row.sql.includes("'singlish'")) return;
  const check = `CHECK (language IN (${LANGUAGES.map((l) => `'${l}'`).join(", ")}))`;
  const ddl = row.sql
    .replace(/CREATE TABLE (IF NOT EXISTS )?"?contacts"?/i, "CREATE TABLE contacts_new")
    .replace(/CHECK \(language IN \([^)]*\)\)/, check);
  // The official rebuild recipe: foreign keys off, build the new table, swap it in by name.
  conn.exec("PRAGMA foreign_keys = OFF;");
  try {
    conn.exec("BEGIN");
    conn.exec(ddl);
    conn.exec("INSERT INTO contacts_new SELECT * FROM contacts");
    conn.exec("DROP TABLE contacts");
    conn.exec("ALTER TABLE contacts_new RENAME TO contacts");
    conn.exec("COMMIT");
  } catch (err) {
    conn.exec("ROLLBACK");
    throw err;
  } finally {
    conn.exec("PRAGMA foreign_keys = ON;");
  }
}

function close() {
  db?.close();
  db = undefined;
}

// Drop every table and recreate the schema (used by the seed; there are no migrations yet).
function resetSchema() {
  const conn = connect();
  conn.exec("PRAGMA foreign_keys = OFF;");
  const tables = conn.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all();
  for (const { name } of tables) conn.exec(`DROP TABLE IF EXISTS "${name}"`);
  conn.exec(fs.readFileSync(SCHEMA, "utf8")); // also turns foreign_keys back on
  schemaApplied = true;
}

const q = (sql) => open().prepare(sql);
const plain = (row) => (row ? { ...row } : null); // node:sqlite rows have a null prototype
const NOW_SQL = "strftime('%Y-%m-%dT%H:%M:%SZ','now')";

let txDepth = 0;
function transaction(fn) {
  if (txDepth > 0) return fn(); // already inside one: join it
  open().exec("BEGIN");
  txDepth++;
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  } finally {
    txDepth--;
  }
}

// ---------- Dates (tutor's local time) ----------

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Date and time in the given timezone, e.g. { date: '2026-11-10', time: '14:05' }.
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
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
const tutorNow = (now) => localNow(getTutor()?.timezone || "Asia/Colombo", now);

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

// ---------- Contacts ----------

function getContactByWaId(waId) {
  return plain(q("SELECT * FROM contacts WHERE wa_id = ?").get(waId));
}

function getContact(id) {
  return plain(q("SELECT * FROM contacts WHERE id = ?").get(id));
}

// Called on every incoming message: returns the contact, creating it for a new number.
function ensureContact(waId) {
  q("INSERT INTO contacts (wa_id) VALUES (?) ON CONFLICT(wa_id) DO NOTHING").run(waId);
  return getContactByWaId(waId);
}

const CONTACT_FIELDS = ["name", "kind", "language"];

function updateContact(contactId, fields = {}) {
  const keys = CONTACT_FIELDS.filter((k) => fields[k] !== undefined);
  if (keys.length) {
    q(`UPDATE contacts SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`)
      .run(...keys.map((k) => fields[k]), contactId);
  }
  return getContact(contactId);
}

// Human handoff: while paused, the bot should stay silent for this contact.
function setBotPaused(contactId, paused, reason) {
  q(`UPDATE contacts SET bot_paused = ?, paused_reason = ?, paused_at = ${paused ? NOW_SQL : "NULL"} WHERE id = ?`)
    .run(paused ? 1 : 0, paused ? reason ?? null : null, contactId);
  return getContact(contactId);
}

// ---------- Students ----------

function getStudent(id) {
  return plain(q("SELECT * FROM students WHERE id = ?").get(id));
}

function listStudents(contactId) {
  return q("SELECT * FROM students WHERE contact_id = ? ORDER BY name").all(contactId).map(plain);
}

const STUDENT_FIELDS = ["name", "grade", "school"];

function updateStudent(studentId, fields = {}) {
  const keys = STUDENT_FIELDS.filter((k) => fields[k] !== undefined);
  if (keys.length) {
    q(`UPDATE students SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`)
      .run(...keys.map((k) => fields[k]), studentId);
  }
  return getStudent(studentId);
}

// Look up a student ref without creating anything. Returns { student, create }:
// `student` if it exists, otherwise `create()` makes it (call only once the action is allowed).
function resolveStudentRef(ref) {
  if (typeof ref === "number") {
    const student = getStudent(ref);
    if (!student) throw new Error(`Student ${ref} not found`);
    return { student };
  }
  if (!ref?.contactId || !ref?.name?.trim()) throw new Error("A new student needs contactId and name");
  if (!getContact(ref.contactId)) throw new Error(`Contact ${ref.contactId} not found`);
  const name = ref.name.trim();
  const existing = plain(q("SELECT * FROM students WHERE contact_id = ? AND name = ?").get(ref.contactId, name));
  if (existing) return { student: existing };
  return {
    student: null,
    create: () => {
      const { lastInsertRowid } = q("INSERT INTO students (contact_id, name, grade, school) VALUES (?, ?, ?, ?)")
        .run(ref.contactId, name, ref.grade ?? null, ref.school ?? null);
      return getStudent(Number(lastInsertRowid));
    },
  };
}

// ---------- Enrollments ----------

// Returns { ok, reason?, enrollment?, student? }. Refused for a full class, unknown class or duplicate.
function enroll(studentRef, classId) {
  return transaction(() => {
    const { student: existing, create } = resolveStudentRef(studentRef);
    const cls = getClass(classId);
    if (!cls || !cls.active) return { ok: false, reason: "class_not_found" };
    const prior = existing && plain(q("SELECT * FROM enrollments WHERE student_id = ? AND class_id = ?").get(existing.id, classId));
    if (prior && prior.status !== "cancelled") return { ok: false, reason: "already_enrolled", enrollment: prior };
    if (cls.seats_left === 0) return { ok: false, reason: "class_full" };

    const student = existing ?? create();
    if (prior) {
      q(`UPDATE enrollments SET status = 'pending', enrolled_at = ${NOW_SQL} WHERE id = ?`).run(prior.id);
    } else {
      q("INSERT INTO enrollments (student_id, class_id) VALUES (?, ?)").run(student.id, classId);
    }
    const enrollment = plain(q("SELECT * FROM enrollments WHERE student_id = ? AND class_id = ?").get(student.id, classId));
    return { ok: true, enrollment, student };
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

// Sessions of one class whose (actual) date is in [from, to), with cancellations and
// reschedules applied. Rescheduled sessions carry original_date.
function sessionsForClass(cls, from, to) {
  const exceptions = new Map(
    q("SELECT * FROM class_exceptions WHERE class_id = ?").all(cls.id).map((e) => [e.date, plain(e)]),
  );
  const base = { class_id: cls.id, title: cls.title, subject_name: cls.subject_name, mode: cls.mode,
                 location: cls.location, duration_minutes: cls.duration_minutes };
  const out = [];
  // Look back/ahead a few weeks so sessions moved across the window edge are included.
  for (let date = addDays(from, -28); date < addDays(to, 28); date = addDays(date, 1)) {
    if (isoDayOfWeek(date) !== cls.day_of_week) continue;
    const ex = exceptions.get(date);
    let s = { ...base, date, time: cls.start_time, status: "scheduled", note: null };
    if (ex?.status === "cancelled") s = { ...s, status: "cancelled", note: ex.note };
    if (ex?.status === "rescheduled") {
      s = { ...s, status: "rescheduled", date: ex.new_date || date, time: ex.new_time || cls.start_time,
            note: ex.note, original_date: date };
    }
    if (s.date >= from && s.date < to) out.push(s);
  }
  return out;
}

// Class sessions in the next `days` days for the given classes. Sorted by date and time.
function upcomingSessions(classIds, { days = 7, now = new Date() } = {}) {
  const today = tutorNow(now);
  const sessions = classIds
    .map(getClass)
    .filter((c) => c?.active)
    .flatMap((c) => sessionsForClass(c, today.date, addDays(today.date, days)));
  return sessions
    .filter((s) => s.date > today.date || s.time >= today.time || s.status === "cancelled")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

// ---------- Trials (one session of a group class) ----------

// Book a trial of class `classId` on `date` (the date the session actually runs).
// Returns { ok, reason?, trial?, student?, moved_to? }.
function bookTrial(studentRef, classId, date, { now = new Date() } = {}) {
  return transaction(() => {
    const { student: existing, create } = resolveStudentRef(studentRef);
    const cls = getClass(classId);
    if (!cls || !cls.active) return { ok: false, reason: "class_not_found" };
    if (!isDate(date)) return { ok: false, reason: "invalid_date" };

    const ex = plain(q("SELECT * FROM class_exceptions WHERE class_id = ? AND date = ?").get(classId, date));
    const session = sessionsForClass(cls, date, addDays(date, 1))[0];
    if (ex?.status === "cancelled") return { ok: false, reason: "session_cancelled", note: ex.note };
    if (ex?.status === "rescheduled" && (ex.new_date || date) !== date) {
      return { ok: false, reason: "session_rescheduled", moved_to: { date: ex.new_date, time: ex.new_time || cls.start_time } };
    }
    if (!session || session.status === "cancelled") return { ok: false, reason: "no_session_on_date" };

    const today = tutorNow(now);
    if (session.date < today.date || (session.date === today.date && session.time <= today.time)) {
      return { ok: false, reason: "in_past" };
    }
    if (cls.seats_left === 0) return { ok: false, reason: "class_full" };
    if (existing) {
      const enrolled = q("SELECT 1 FROM enrollments WHERE student_id = ? AND class_id = ? AND status != 'cancelled'").get(existing.id, classId);
      if (enrolled) return { ok: false, reason: "already_enrolled" };
      const live = q("SELECT 1 FROM trials WHERE student_id = ? AND class_id = ? AND status != 'cancelled'").get(existing.id, classId);
      if (live) return { ok: false, reason: "trial_exists" };
    }

    const student = existing ?? create();
    const { lastInsertRowid } = q("INSERT INTO trials (student_id, class_id, date) VALUES (?, ?, ?)")
      .run(student.id, classId, session.date);
    return { ok: true, trial: { ...getTrial(Number(lastInsertRowid)), time: session.time }, student };
  });
}

function getTrial(id) {
  return plain(q(`SELECT t.*, c.title AS class_title, c.start_time, c.location FROM trials t
                  JOIN classes c ON c.id = t.class_id WHERE t.id = ?`).get(id));
}

function listTrials(studentId) {
  return q(`SELECT t.*, c.title AS class_title FROM trials t JOIN classes c ON c.id = t.class_id
            WHERE t.student_id = ? ORDER BY t.date`).all(studentId).map(plain);
}

function setTrialStatus(id, status) {
  return q("UPDATE trials SET status = ? WHERE id = ?").run(status, id).changes > 0;
}

// ---------- Payments ----------

const PAYMENT_SELECT = `
  SELECT p.*, c.title AS class_title, st.name AS student_name, st.contact_id
  FROM payments p JOIN classes c ON c.id = p.class_id JOIN students st ON st.id = p.student_id`;

function getPayment(id) {
  return plain(q(`${PAYMENT_SELECT} WHERE p.id = ?`).get(id));
}

function listPayments(studentId, { status } = {}) {
  const sql = `${PAYMENT_SELECT} WHERE p.student_id = ? ${status ? "AND p.status = ?" : ""} ORDER BY p.month, c.title`;
  return (status ? q(sql).all(studentId, status) : q(sql).all(studentId)).map(plain);
}

// All payments for every student of a contact (a parent pays for each child).
function listPaymentsForContact(contactId, { status } = {}) {
  const sql = `${PAYMENT_SELECT} WHERE st.contact_id = ? ${status ? "AND p.status = ?" : ""} ORDER BY p.month, st.name, c.title`;
  return (status ? q(sql).all(contactId, status) : q(sql).all(contactId)).map(plain);
}

// Still owed: due, or rejected and not yet re-sent. Slips awaiting review are not counted.
const OWED = "status IN ('due', 'rejected')";

function amountDue(studentId) {
  return q(`SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE student_id = ? AND ${OWED}`).get(studentId).total;
}

function amountDueForContact(contactId) {
  return q(`SELECT COALESCE(SUM(p.amount), 0) AS total FROM payments p JOIN students st ON st.id = p.student_id
            WHERE st.contact_id = ? AND p.${OWED}`).get(contactId).total;
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

// A slip image arrived for one or more payments (one transfer often covers several).
// Allowed from 'due' or 'rejected'. All-or-nothing: returns { ok, reason?, paymentId? }.
function submitSlip(paymentIds, { mediaId, reference } = {}) {
  const ids = [].concat(paymentIds);
  if (!mediaId) throw new Error("submitSlip needs the slip's mediaId");
  return transaction(() => {
    for (const id of ids) {
      const p = getPayment(id);
      if (!p) return { ok: false, reason: "payment_not_found", paymentId: id };
      if (!["due", "rejected"].includes(p.status)) return { ok: false, reason: `not_awaiting_slip:${p.status}`, paymentId: id };
    }
    const stmt = q(`UPDATE payments SET status = 'slip_received', slip_media_id = ?, slip_reference = ?,
                    slip_received_at = ${NOW_SQL}, reviewed_by = NULL, reviewed_at = NULL, review_note = NULL
                    WHERE id = ?`);
    for (const id of ids) stmt.run(mediaId, reference ?? null, id);
    return { ok: true };
  });
}

function listSlipsAwaitingReview() {
  return q(`${PAYMENT_SELECT} WHERE p.status = 'slip_received' ORDER BY p.slip_received_at`).all().map(plain);
}

function review(paymentId, status, reviewer, note) {
  if (!reviewer) throw new Error("A review needs the reviewer's name");
  const changed = q(`UPDATE payments SET status = ?, reviewed_by = ?, reviewed_at = ${NOW_SQL}, review_note = ?
                     WHERE id = ? AND status = 'slip_received'`).run(status, reviewer, note ?? null, paymentId).changes;
  return changed ? { ok: true, payment: getPayment(paymentId) } : { ok: false, reason: "no_slip_to_review" };
}

const approvePayment = (paymentId, reviewer, note) => review(paymentId, "approved", reviewer, note);
const rejectPayment = (paymentId, reviewer, reason) => {
  if (!reason) throw new Error("Rejecting a slip needs a reason to tell the parent");
  return review(paymentId, "rejected", reviewer, reason);
};

function waivePayment(paymentId, reviewer, note) {
  const changed = q(`UPDATE payments SET status = 'waived', reviewed_by = ?, reviewed_at = ${NOW_SQL}, review_note = ?
                     WHERE id = ? AND status IN ('due', 'rejected')`).run(reviewer, note ?? null, paymentId).changes;
  return changed > 0;
}

// ---------- One-to-one bookings ----------

function createBooking({ student, subjectId, startsAt, durationMinutes = 60, topic }) {
  return transaction(() => {
    const { student: existing, create } = resolveStudentRef(student);
    if (!q("SELECT 1 FROM subjects WHERE id = ?").get(subjectId)) return { ok: false, reason: "subject_not_found" };
    const s = existing ?? create();
    const { lastInsertRowid } = q(`
      INSERT INTO bookings (student_id, subject_id, starts_at, duration_minutes, topic)
      VALUES (?, ?, ?, ?, ?)`).run(s.id, subjectId, startsAt, durationMinutes, topic ?? null);
    return { ok: true, booking: getBooking(Number(lastInsertRowid)), student: s };
  });
}

function getBooking(id) {
  return plain(q(`SELECT b.*, s.name AS subject_name FROM bookings b JOIN subjects s ON s.id = b.subject_id
                  WHERE b.id = ?`).get(id));
}

function listBookings(studentId, { upcomingOnly = true, now = new Date() } = {}) {
  const { date, time } = tutorNow(now);
  return q(`
    SELECT b.*, s.name AS subject_name FROM bookings b JOIN subjects s ON s.id = b.subject_id
    WHERE b.student_id = ? ${upcomingOnly ? "AND b.starts_at >= ? AND b.status IN ('requested','confirmed')" : ""}
    ORDER BY b.starts_at`).all(...(upcomingOnly ? [studentId, `${date} ${time}`] : [studentId])).map(plain);
}

function setBookingStatus(id, status) {
  return q("UPDATE bookings SET status = ? WHERE id = ?").run(status, id).changes > 0;
}

// ---------- Materials & FAQs ----------

// General materials plus those for classes the student is actively enrolled in.
function listMaterials(studentId) {
  return q(`
    SELECT m.*, c.title AS class_title FROM materials m LEFT JOIN classes c ON c.id = m.class_id
    WHERE m.class_id IS NULL OR m.class_id IN
      (SELECT class_id FROM enrollments WHERE student_id = ? AND status = 'active')
    ORDER BY m.created_at DESC`).all(studentId).map(plain);
}

function listFaqs() {
  return q("SELECT * FROM faqs ORDER BY id").all().map(plain);
}

// Recent messages with one WhatsApp number, oldest first (for the agent's chat history).
function recentMessages(waId, limit = 16) {
  return q(`SELECT id, direction, type, body, created_at FROM messages WHERE wa_id = ?
            ORDER BY rowid DESC LIMIT ?`).all(waId, limit).map(plain).reverse();
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

function getConversation(contactId) {
  const row = q("SELECT * FROM conversations WHERE contact_id = ?").get(contactId);
  return row ? { ...row, context: JSON.parse(row.context) } : { contact_id: contactId, state: "idle", context: {} };
}

function setConversation(contactId, state, context = {}) {
  q(`INSERT INTO conversations (contact_id, state, context, updated_at) VALUES (?, ?, ?, ${NOW_SQL})
     ON CONFLICT(contact_id) DO UPDATE SET state = excluded.state, context = excluded.context,
                                          updated_at = excluded.updated_at`)
    .run(contactId, state, JSON.stringify(context));
}

// Returns false if this message id was already logged (a webhook retry).
function logMessage({ id, waId, direction, type, body }) {
  return q(`INSERT INTO messages (id, wa_id, direction, type, body) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO NOTHING`).run(id, waId, direction, type, body ?? null).changes > 0;
}

// ---------- Dashboard (AlchemyX Catalyst) ----------

// Every contact with their latest message, most recent chat first.
function listConversations() {
  return q(`
    SELECT c.id, c.wa_id, c.name, c.kind, c.language, c.bot_paused, c.paused_reason, c.paused_at,
           (SELECT COUNT(*) FROM students s WHERE s.contact_id = c.id) AS student_count,
           m.body AS last_body, m.type AS last_type, m.direction AS last_direction, m.created_at AS last_at,
           (SELECT COUNT(*) FROM messages x WHERE x.wa_id = c.wa_id) AS message_count
    FROM contacts c
    LEFT JOIN messages m ON m.rowid = (SELECT rowid FROM messages WHERE wa_id = c.wa_id ORDER BY rowid DESC LIMIT 1)
    ORDER BY (m.created_at IS NULL), m.created_at DESC, c.id DESC`).all().map(plain);
}

// Who still owes money (due or rejected), per contact.
function listOwedByContact() {
  return q(`
    SELECT c.id AS contact_id, c.wa_id, c.name, SUM(p.amount) AS total, COUNT(*) AS items
    FROM payments p JOIN students st ON st.id = p.student_id JOIN contacts c ON c.id = st.contact_id
    WHERE p.${OWED}
    GROUP BY c.id ORDER BY total DESC`).all().map(plain);
}

function dashboardCounts(sinceIso) {
  const one = (sql, ...args) => q(sql).get(...args).n;
  return {
    contacts: one("SELECT COUNT(*) AS n FROM contacts"),
    students: one("SELECT COUNT(*) AS n FROM students"),
    active_enrollments: one("SELECT COUNT(*) AS n FROM enrollments WHERE status = 'active'"),
    paused: one("SELECT COUNT(*) AS n FROM contacts WHERE bot_paused = 1"),
    messages_in_24h: one("SELECT COUNT(*) AS n FROM messages WHERE direction = 'in' AND created_at >= ?", sinceIso),
    messages_out_24h: one("SELECT COUNT(*) AS n FROM messages WHERE direction = 'out' AND created_at >= ?", sinceIso),
    slips_waiting: one("SELECT COUNT(*) AS n FROM payments WHERE status = 'slip_received'"),
    owed_total: one(`SELECT COALESCE(SUM(amount), 0) AS n FROM payments WHERE ${OWED}`),
    languages: q("SELECT language, COUNT(*) AS n FROM contacts GROUP BY language ORDER BY n DESC").all().map(plain),
  };
}

module.exports = {
  open, close, resetSchema, transaction, LANGUAGES, localNow, addDays, DAY_NAMES,
  getTutor, listSubjects, listClasses, getClass, getIndividualRate, listAvailability,
  getContact, getContactByWaId, ensureContact, updateContact, setBotPaused,
  getStudent, listStudents, updateStudent,
  enroll, setEnrollmentStatus, listEnrollments,
  upcomingSessions, sessionsForClass,
  bookTrial, getTrial, listTrials, setTrialStatus,
  getPayment, listPayments, listPaymentsForContact, amountDue, amountDueForContact, generateMonthlyFees,
  submitSlip, listSlipsAwaitingReview, approvePayment, rejectPayment, waivePayment,
  createBooking, getBooking, listBookings, setBookingStatus,
  listMaterials, listFaqs, findFaqs,
  getConversation, setConversation, logMessage, recentMessages,
  listConversations, listOwedByContact, dashboardCounts,
};
