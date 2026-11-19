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
  migrateContacts(conn);
  addColumns(conn, "contacts", CONTACT_COLUMNS);
  addColumns(conn, "messages", MESSAGE_COLUMNS);
}

// Columns added after the first databases were made. Keep in sync with schema.sql.
const CONTACT_COLUMNS = {
  language_auto: "INTEGER NOT NULL DEFAULT 1 CHECK (language_auto IN (0, 1))",
};
const MESSAGE_COLUMNS = {
  status: "TEXT CHECK (status IN ('sent', 'failed', 'not_sent'))",
  error: "TEXT",
  tools: "TEXT",
  agent_error: "TEXT",
  sent_by: "TEXT CHECK (sent_by IN ('bot', 'teacher'))",
  media_id: "TEXT",
  media_mime: "TEXT",
  media_file: "TEXT",
};
function addColumns(conn, table, columns) {
  const have = new Set(conn.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
  for (const [name, type] of Object.entries(columns)) {
    if (!have.has(name)) conn.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
  }
}

function migrateContacts(conn) {
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

const CONTACT_FIELDS = ["name", "kind", "language", "language_auto"];

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

// slip_file: the stored photo/PDF of the slip, if it was saved (demo data has none).
function listSlipsAwaitingReview() {
  return q(`SELECT x.*, (SELECT m.media_file FROM messages m WHERE m.media_id = x.slip_media_id AND m.media_file IS NOT NULL LIMIT 1) AS slip_file,
                   (SELECT m.media_mime FROM messages m WHERE m.media_id = x.slip_media_id LIMIT 1) AS slip_mime
            FROM (${PAYMENT_SELECT} WHERE p.status = 'slip_received') x ORDER BY x.slip_received_at`).all().map(plain);
}

// ---------- Media (slips and other photos people send) ----------

function setMessageMedia(messageId, { file, mime }) {
  return q("UPDATE messages SET media_file = ?, media_mime = ? WHERE id = ?").run(file, mime, messageId).changes > 0;
}

// The stored file for a WhatsApp media id (for the dashboard).
function getMedia(mediaId) {
  return plain(q("SELECT id AS message_id, wa_id, media_id, media_mime, media_file FROM messages WHERE media_id = ? LIMIT 1").get(mediaId));
}

// The newest photo/PDF this number sent since `sinceIso` (the slip the bot links to fees).
function latestIncomingMedia(waId, sinceIso) {
  return plain(q(`SELECT id, media_id, media_mime, media_file, body, created_at FROM messages
                  WHERE wa_id = ? AND direction = 'in' AND media_id IS NOT NULL AND created_at >= ?
                  ORDER BY rowid DESC LIMIT 1`).get(waId, sinceIso));
}

// Photos/PDFs people sent since `sinceIso` that no payment points at: a slip the bot couldn't link
// (unknown number, no unpaid fees, chat paused, or the photo came after the bot replied). Each row
// carries the sender's fees that can still take a slip, so the teacher can link it by hand.
function listUnmatchedSlips(sinceIso) {
  const rows = q(`SELECT m.id AS message_id, m.wa_id, m.media_id, m.media_mime, m.media_file, m.body, m.created_at,
                         c.id AS contact_id, c.name
                  FROM messages m LEFT JOIN contacts c ON c.wa_id = m.wa_id
                  WHERE m.direction = 'in' AND m.media_id IS NOT NULL AND m.created_at >= ?
                    AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.slip_media_id = m.media_id)
                  ORDER BY m.created_at DESC, m.rowid DESC`).all(sinceIso).map(plain);
  return rows.map((r) => ({
    ...r,
    open_fees: r.contact_id ? listPaymentsForContact(r.contact_id).filter((p) => ["due", "rejected"].includes(p.status)) : [],
  }));
}

// The teacher links an unmatched slip to fees from the dashboard. Same rules as the bot's tool:
// only that sender's own fees, only ones waiting for a slip.
function linkSlip(mediaId, paymentIds) {
  const m = q("SELECT wa_id, body FROM messages WHERE media_id = ? AND direction = 'in' LIMIT 1").get(mediaId);
  if (!m) return { ok: false, reason: "slip_not_found" };
  const contact = getContactByWaId(m.wa_id);
  const mine = new Set(contact ? listPaymentsForContact(contact.id).map((p) => p.id) : []);
  const ids = [...new Set([].concat(paymentIds).map(Number))];
  if (!ids.length || ids.some((id) => !Number.isInteger(id))) return { ok: false, reason: "no_payments" };
  const notMine = ids.find((id) => !mine.has(id));
  if (notMine !== undefined) return { ok: false, reason: "not_this_contact", paymentId: notMine };
  return submitSlip(ids, { mediaId, reference: m.body ? m.body.slice(0, 120) : null });
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
  return q(`SELECT id, direction, type, body, created_at, status, error, tools, agent_error, sent_by, media_id, media_mime, media_file FROM messages WHERE wa_id = ?
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
// status/error/tools/agentError/sentBy are for outgoing replies; see the messages table in schema.sql.
function logMessage({ id, waId, direction, type, body, status = null, error = null, tools = null, agentError = null, sentBy = null, mediaId = null, mediaMime = null }) {
  return q(`INSERT INTO messages (id, wa_id, direction, type, body, status, error, tools, agent_error, sent_by, media_id, media_mime)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`)
    .run(id, waId, direction, type, body ?? null, status, error, tools?.length ? JSON.stringify(tools) : null, agentError, sentBy, mediaId, mediaMime)
    .changes > 0;
}

// ---------- Settings (edited from the dashboard) ----------
// Everything the bot tells parents comes from these tables, so the teacher must be able to keep
// them right. Bad input throws an Error with status 400 and a message meant for the teacher.

function invalid(message) {
  return Object.assign(new Error(message), { status: 400 });
}
const isTime = (s) => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
const text = (v) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());
const optionalText = (v) => text(v) || null;
function wholeNumber(v, label, { min = 0, optional = false } = {}) {
  if (optional && (v === null || v === undefined || v === "")) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min) throw invalid(`${label} must be a whole number${min > 0 ? ` of at least ${min}` : ""}.`);
  return n;
}

// Teacher profile and payment details. Creates the row the first time.
function saveTutor(fields) {
  const name = text(fields.name);
  if (!name) throw invalid("The teacher's name is required.");
  const values = [name, optionalText(fields.bio), optionalText(fields.qualifications), optionalText(fields.payment_instructions)];
  q(`INSERT INTO tutor (id, name, bio, qualifications, payment_instructions) VALUES (1, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, bio = excluded.bio,
       qualifications = excluded.qualifications, payment_instructions = excluded.payment_instructions`).run(...values);
  return getTutor();
}

// Subjects, with the one-to-one rate (null = no one-to-one for it) and how many classes use it.
function listSubjectsForSettings() {
  return q(`SELECT s.*, r.hourly_rate,
              (SELECT COUNT(*) FROM classes c WHERE c.subject_id = s.id) AS class_count
            FROM subjects s LEFT JOIN individual_rates r ON r.subject_id = s.id
            ORDER BY s.level, s.name`).all().map(plain);
}

function saveSubject(id, fields) {
  const name = text(fields.name);
  const level = text(fields.level);
  if (!name || !level) throw invalid("A subject needs a name and a level (e.g. Mathematics, O/L).");
  const rate = wholeNumber(fields.hourly_rate, "The one-to-one rate", { optional: true });
  return transaction(() => {
    const clash = q("SELECT id FROM subjects WHERE name = ? AND level = ?").get(name, level);
    if (clash && clash.id !== id) throw invalid(`${name} (${level}) already exists.`);
    if (id == null) {
      id = Number(q("INSERT INTO subjects (name, level) VALUES (?, ?)").run(name, level).lastInsertRowid);
    } else if (!q("UPDATE subjects SET name = ?, level = ? WHERE id = ?").run(name, level, id).changes) {
      throw invalid("That subject no longer exists.");
    }
    if (rate == null) q("DELETE FROM individual_rates WHERE subject_id = ?").run(id);
    else q(`INSERT INTO individual_rates (subject_id, hourly_rate) VALUES (?, ?)
            ON CONFLICT(subject_id) DO UPDATE SET hourly_rate = excluded.hourly_rate`).run(id, rate);
    return listSubjectsForSettings().find((s) => s.id === id);
  });
}

// Only a subject no class uses (even a hidden one) can be deleted.
function deleteSubject(id) {
  if (q("SELECT 1 FROM classes WHERE subject_id = ?").get(id)) {
    throw invalid("Classes use this subject. Move or hide those classes first.");
  }
  return transaction(() => {
    q("DELETE FROM individual_rates WHERE subject_id = ?").run(id);
    return q("DELETE FROM subjects WHERE id = ?").run(id).changes > 0;
  });
}

function addAvailability(fields) {
  const day = wholeNumber(fields.day_of_week, "Day", { min: 1 });
  if (day > 7) throw invalid("Day must be 1 (Monday) to 7 (Sunday).");
  if (!isTime(fields.start_time) || !isTime(fields.end_time)) throw invalid("Times must look like 16:00.");
  if (fields.end_time <= fields.start_time) throw invalid("The slot must end after it starts.");
  const id = q("INSERT INTO availability (day_of_week, start_time, end_time) VALUES (?, ?, ?)")
    .run(day, fields.start_time, fields.end_time).lastInsertRowid;
  return listAvailability().find((a) => a.id === Number(id));
}

const deleteAvailability = (id) => q("DELETE FROM availability WHERE id = ?").run(id).changes > 0;

// Every class, hidden ones too (the bot and the Classes page only see active ones).
function listAllClasses() {
  return q(`${CLASS_SELECT} ORDER BY c.active DESC, c.day_of_week, c.start_time`).all().map(withSeats);
}

function classFields(fields) {
  const title = text(fields.title);
  if (!title) throw invalid("The class needs a title.");
  const subjectId = wholeNumber(fields.subject_id, "Subject", { min: 1 });
  if (!q("SELECT 1 FROM subjects WHERE id = ?").get(subjectId)) throw invalid("Choose a subject.");
  if (!["theory", "revision", "paper"].includes(fields.class_type)) throw invalid("Choose a class type.");
  if (!["online", "physical"].includes(fields.mode)) throw invalid("Choose online or in person.");
  const location = optionalText(fields.location);
  if (fields.mode === "physical" && !location) throw invalid("An in-person class needs a venue.");
  const day = wholeNumber(fields.day_of_week, "Day", { min: 1 });
  if (day > 7) throw invalid("Day must be Monday to Sunday.");
  if (!isTime(fields.start_time)) throw invalid("Start time must look like 16:00.");
  return {
    subject_id: subjectId, title, class_type: fields.class_type, mode: fields.mode, location,
    day_of_week: day, start_time: fields.start_time,
    duration_minutes: wholeNumber(fields.duration_minutes, "Duration", { min: 1 }),
    monthly_fee: wholeNumber(fields.monthly_fee, "The monthly fee"),
    capacity: wholeNumber(fields.capacity, "Seats", { min: 1, optional: true }),
  };
}

function saveClass(id, fields, { now = new Date() } = {}) {
  const c = classFields(fields);
  const cols = Object.keys(c);
  if (id == null) {
    id = Number(q(`INSERT INTO classes (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`)
      .run(...Object.values(c)).lastInsertRowid);
  } else {
    const before = getClass(id);
    if (!before) throw invalid("That class no longer exists.");
    // Cancellations are stored against the weekly date; a new weekday would orphan them.
    if (before.day_of_week !== c.day_of_week && q("SELECT 1 FROM class_exceptions WHERE class_id = ? AND date >= ?").get(id, tutorNow(now).date)) {
      throw invalid("This class has upcoming cancellations or moved sessions. Undo them before changing its day.");
    }
    q(`UPDATE classes SET ${cols.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`).run(...Object.values(c), id);
  }
  return getClass(id);
}

// Hidden classes keep their students and payments; the bot stops offering them.
function setClassActive(id, active) {
  if (!q("UPDATE classes SET active = ? WHERE id = ?").run(active ? 1 : 0, id).changes) throw invalid("That class no longer exists.");
  return getClass(id);
}

// Cancel or move one session. `date` is the class's normal weekly date for that session.
function setClassException(classId, fields, { now = new Date() } = {}) {
  const cls = getClass(classId);
  if (!cls) throw invalid("That class no longer exists.");
  const { date } = fields;
  if (!isDate(date)) throw invalid("Choose a date.");
  if (isoDayOfWeek(date) !== cls.day_of_week) throw invalid(`${cls.title} runs on ${cls.day_name}s; pick one of those dates.`);
  const today = tutorNow(now).date;
  if (date < today) throw invalid("That session is in the past.");
  const status = fields.status;
  if (!["cancelled", "rescheduled"].includes(status)) throw invalid("Choose cancel or move.");
  let newDate = null, newTime = null;
  if (status === "rescheduled") {
    newDate = optionalText(fields.new_date);
    newTime = optionalText(fields.new_time);
    if (newDate && !isDate(newDate)) throw invalid("The new date isn't valid.");
    if (newTime && !isTime(newTime)) throw invalid("The new time must look like 16:00.");
    if (!newDate && !newTime) throw invalid("Give a new date, a new time, or both.");
    if (newDate && newDate < today) throw invalid("The new date is in the past.");
  }
  q(`INSERT INTO class_exceptions (class_id, date, status, new_date, new_time, note) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(class_id, date) DO UPDATE SET status = excluded.status, new_date = excluded.new_date,
       new_time = excluded.new_time, note = excluded.note`)
    .run(classId, date, status, newDate, newTime, optionalText(fields.note));
  return plain(q("SELECT * FROM class_exceptions WHERE class_id = ? AND date = ?").get(classId, date));
}

const deleteClassException = (classId, date) =>
  q("DELETE FROM class_exceptions WHERE class_id = ? AND date = ?").run(classId, date).changes > 0;

// The bot reads every FAQ, so keywords aren't needed for new ones (kept for old rows).
function saveFaq(id, fields) {
  const question = text(fields.question);
  const answer = text(fields.answer);
  if (!question || !answer) throw invalid("An FAQ needs a question and an answer.");
  if (id == null) id = Number(q("INSERT INTO faqs (question, answer, keywords) VALUES (?, ?, '')").run(question, answer).lastInsertRowid);
  else if (!q("UPDATE faqs SET question = ?, answer = ? WHERE id = ?").run(question, answer, id).changes) throw invalid("That FAQ no longer exists.");
  return plain(q("SELECT * FROM faqs WHERE id = ?").get(id));
}

const deleteFaq = (id) => q("DELETE FROM faqs WHERE id = ?").run(id).changes > 0;

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
    messages_out_24h: one(`SELECT COUNT(*) AS n FROM messages WHERE direction = 'out' AND created_at >= ?
                           AND (status IS NULL OR status = 'sent')`, sinceIso),
    undelivered_24h: one(`SELECT COUNT(*) AS n FROM messages WHERE direction = 'out' AND created_at >= ?
                          AND status IN ('failed', 'not_sent')`, sinceIso),
    agent_errors_24h: one("SELECT COUNT(*) AS n FROM messages WHERE agent_error IS NOT NULL AND created_at >= ?", sinceIso),
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
  setMessageMedia, getMedia, latestIncomingMedia, listUnmatchedSlips, linkSlip,
  createBooking, getBooking, listBookings, setBookingStatus,
  listMaterials, listFaqs, findFaqs,
  getConversation, setConversation, logMessage, recentMessages,
  listConversations, listOwedByContact, dashboardCounts,
  saveTutor, listSubjectsForSettings, saveSubject, deleteSubject, addAvailability, deleteAvailability,
  listAllClasses, saveClass, setClassActive, setClassException, deleteClassException, saveFaq, deleteFaq,
};
