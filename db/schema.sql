-- Tutor WhatsApp agent: data model (SQLite).
-- Conventions: times are local to the tutor's timezone (tutor.timezone);
-- day_of_week is ISO (1 = Monday ... 7 = Sunday); money is whole LKR (or tutor.currency);
-- timestamps are ISO 8601 UTC strings; local dates are 'YYYY-MM-DD'.

PRAGMA foreign_keys = ON;

-- The tutor running this agent (single row).
CREATE TABLE IF NOT EXISTS tutor (
  id                   INTEGER PRIMARY KEY CHECK (id = 1),
  name                 TEXT NOT NULL,
  phone                TEXT,
  bio                  TEXT,
  qualifications       TEXT,
  timezone             TEXT NOT NULL DEFAULT 'Asia/Colombo',
  currency             TEXT NOT NULL DEFAULT 'LKR',
  payment_instructions TEXT
);

-- What the tutor teaches.
CREATE TABLE IF NOT EXISTS subjects (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  level       TEXT NOT NULL,              -- e.g. 'O/L', 'A/L'
  description TEXT,
  UNIQUE (name, level)
);

-- Recurring group classes (one row per weekly batch).
CREATE TABLE IF NOT EXISTS classes (
  id               INTEGER PRIMARY KEY,
  subject_id       INTEGER NOT NULL REFERENCES subjects(id),
  title            TEXT NOT NULL,
  class_type       TEXT NOT NULL CHECK (class_type IN ('theory', 'revision', 'paper')),
  mode             TEXT NOT NULL CHECK (mode IN ('online', 'physical')),
  location         TEXT,                  -- hall address or meeting link
  day_of_week      INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time       TEXT NOT NULL,         -- 'HH:MM'
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  monthly_fee      INTEGER NOT NULL CHECK (monthly_fee >= 0),
  capacity         INTEGER,
  active           INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);

-- Dates a class doesn't run as usual (holidays, reschedules).
CREATE TABLE IF NOT EXISTS class_exceptions (
  id         INTEGER PRIMARY KEY,
  class_id   INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date       TEXT NOT NULL,               -- date of the normal session
  status     TEXT NOT NULL CHECK (status IN ('cancelled', 'rescheduled')),
  new_date   TEXT,                        -- for rescheduled
  new_time   TEXT,
  note       TEXT,
  UNIQUE (class_id, date)
);

-- A WhatsApp number that has messaged the agent: a parent or an adult student.
-- Created on the first message; students are added only when they enrol or book.
CREATE TABLE IF NOT EXISTS contacts (
  id            INTEGER PRIMARY KEY,
  wa_id         TEXT NOT NULL UNIQUE,     -- WhatsApp number (msg.from)
  name          TEXT,
  kind          TEXT CHECK (kind IN ('parent', 'student')),  -- NULL until known
  -- en | si / ta (Sinhala / Tamil script) | singlish / tanglish (written in English letters)
  language      TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'si', 'ta', 'singlish', 'tanglish')),
  bot_paused    INTEGER NOT NULL DEFAULT 0 CHECK (bot_paused IN (0, 1)),  -- human handoff
  paused_reason TEXT,
  paused_at     TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- A learner. Belongs to one contact; a parent contact can have several students.
CREATE TABLE IF NOT EXISTS students (
  id         INTEGER PRIMARY KEY,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  name       TEXT NOT NULL COLLATE NOCASE,
  grade      TEXT,
  school     TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (contact_id, name)
);

CREATE TABLE IF NOT EXISTS enrollments (
  id          INTEGER PRIMARY KEY,
  student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id    INTEGER NOT NULL REFERENCES classes(id),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled')),
  enrolled_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (student_id, class_id)
);

-- Monthly class fees and their bank-slip review:
--   due -> slip_received -> approved
--                        -> rejected -> slip_received (new slip) -> ...
--   due -> waived
CREATE TABLE IF NOT EXISTS payments (
  id               INTEGER PRIMARY KEY,
  student_id       INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id         INTEGER NOT NULL REFERENCES classes(id),
  month            TEXT NOT NULL,         -- 'YYYY-MM'
  amount           INTEGER NOT NULL CHECK (amount >= 0),
  status           TEXT NOT NULL DEFAULT 'due'
                   CHECK (status IN ('due', 'slip_received', 'approved', 'rejected', 'waived')),
  slip_media_id    TEXT,                  -- WhatsApp media id of the slip image
  slip_reference   TEXT,                  -- reference number written on the slip, if given
  slip_received_at TEXT,
  reviewed_by      TEXT,                  -- who approved / rejected it
  reviewed_at      TEXT,
  review_note      TEXT,                  -- e.g. why a slip was rejected
  UNIQUE (student_id, class_id, month),
  CHECK (status NOT IN ('slip_received', 'rejected') OR slip_media_id IS NOT NULL),
  CHECK (status NOT IN ('approved', 'rejected') OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);

-- Trial session of a group class: one specific class on one specific date.
CREATE TABLE IF NOT EXISTS trials (
  id         INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id   INTEGER NOT NULL REFERENCES classes(id),
  date       TEXT NOT NULL,               -- date the session actually runs
  status     TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'attended', 'no_show', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
-- One live trial per student per class (a cancelled one can be rebooked).
CREATE UNIQUE INDEX IF NOT EXISTS uq_trials_live ON trials(student_id, class_id) WHERE status != 'cancelled';

-- One-to-one sessions a student asks for.
CREATE TABLE IF NOT EXISTS bookings (
  id               INTEGER PRIMARY KEY,
  student_id       INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id       INTEGER NOT NULL REFERENCES subjects(id),
  starts_at        TEXT NOT NULL,         -- 'YYYY-MM-DD HH:MM' local time
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status           TEXT NOT NULL DEFAULT 'requested'
                   CHECK (status IN ('requested', 'confirmed', 'cancelled', 'completed')),
  topic            TEXT,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Rate for one-to-one sessions, per subject.
CREATE TABLE IF NOT EXISTS individual_rates (
  subject_id  INTEGER PRIMARY KEY REFERENCES subjects(id),
  hourly_rate INTEGER NOT NULL CHECK (hourly_rate >= 0)
);

-- Free time slots the tutor offers for one-to-one sessions (weekly).
CREATE TABLE IF NOT EXISTS availability (
  id          INTEGER PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time  TEXT NOT NULL,
  end_time    TEXT NOT NULL
);

-- Notes, past papers, recordings shared with a class.
CREATE TABLE IF NOT EXISTS materials (
  id         INTEGER PRIMARY KEY,
  class_id   INTEGER REFERENCES classes(id) ON DELETE CASCADE,  -- NULL = everyone
  title      TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('notes', 'paper', 'recording', 'link')),
  url        TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Ready answers the agent can use.
CREATE TABLE IF NOT EXISTS faqs (
  id       INTEGER PRIMARY KEY,
  question TEXT NOT NULL,
  answer   TEXT NOT NULL,
  keywords TEXT NOT NULL                  -- comma-separated, lower case
);

-- Conversation state per contact, for the multi-step flows.
CREATE TABLE IF NOT EXISTS conversations (
  contact_id INTEGER PRIMARY KEY REFERENCES contacts(id) ON DELETE CASCADE,
  state      TEXT NOT NULL DEFAULT 'idle',
  context    TEXT NOT NULL DEFAULT '{}',  -- JSON scratchpad for the current flow
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Every message in and out. The id is WhatsApp's message id, so it also
-- deduplicates webhook retries across server restarts. Keyed by raw wa_id so
-- logging never depends on other rows existing.
CREATE TABLE IF NOT EXISTS messages (
  id         TEXT PRIMARY KEY,
  wa_id      TEXT NOT NULL,
  direction  TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  type       TEXT NOT NULL,
  body       TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_students_contact   ON students(contact_id);
CREATE INDEX IF NOT EXISTS idx_classes_subject    ON classes(subject_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class  ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_payments_status    ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_student   ON payments(student_id, status);
CREATE INDEX IF NOT EXISTS idx_trials_class_date  ON trials(class_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_student   ON bookings(student_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_messages_wa        ON messages(wa_id, created_at);
