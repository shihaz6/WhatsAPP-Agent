-- Catalyst WhatsApp assistant for an educational institute: data model (SQLite).
-- Everything the owner enters on the dashboard lives here, and the bot answers only from it.
-- Conventions: money is whole units of business.currency (e.g. LKR 1250); timestamps are
-- ISO 8601 UTC strings ('2026-11-19T15:08:58Z'). Safe to run on every start (IF NOT EXISTS / OR IGNORE).

PRAGMA foreign_keys = ON;

-- The business the bot works for (single row, created empty). Bot settings > Business information,
-- plus the bot's on/off switch, the handover number and the product sheet link.
CREATE TABLE IF NOT EXISTS business (
  id                  INTEGER PRIMARY KEY CHECK (id = 1),
  name                TEXT NOT NULL DEFAULT '',  -- shown in the dashboard header; the bot speaks for it
  owner_name          TEXT,                      -- greeting and avatar on the dashboard
  opening_hours       TEXT,                      -- office hours, free text, e.g. 'Mon–Sat, 8:00 AM–6:00 PM'
  office_opens        TEXT,                      -- daily start time, 24-hour HH:MM, e.g. '08:00' (NULL = not set)
  office_closes       TEXT,                      -- daily finish time, 24-hour HH:MM, e.g. '18:00'
  office_hours_preset TEXT CHECK (office_hours_preset IS NULL OR office_hours_preset IN ('mon_fri_9_5', 'mon_sat_8_6', 'every_day_8_8', 'custom')),  -- which chip the owner picked; opening_hours holds its text
  location            TEXT,
  payment_details     TEXT,                      -- how fees are paid (bank details, at the office, ...)
  delivery_info       TEXT,                      -- classes and enrolment: physical/online, intakes, how to register
  handover_number     TEXT,                      -- WhatsApp number told about each handover (digits only)
  bot_enabled         INTEGER NOT NULL DEFAULT 1 CHECK (bot_enabled IN (0, 1)),  -- 0 = bot silent for everyone
  currency            TEXT NOT NULL DEFAULT 'LKR',
  timezone            TEXT NOT NULL DEFAULT 'Asia/Colombo',
  product_sheet_url   TEXT,                      -- Google Sheet the courses are synced from (sync not built yet)
  products_synced_at  TEXT,
  updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
INSERT OR IGNORE INTO business (id) VALUES (1);

-- The institute's courses and classes (kept in the products table). Courses page (manual or CSV import).
-- price = fee, stock = seats left, category = subject / grade, description = schedule, teacher, medium.
CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL COLLATE NOCASE UNIQUE,  -- imports match existing products by name
  price       INTEGER NOT NULL CHECK (price >= 0),  -- fee, whole currency units
  stock       INTEGER CHECK (stock IS NULL OR stock >= 0),  -- seats left; NULL = not limited
  category    TEXT,
  description TEXT,                                 -- schedule, teacher, medium, duration the bot can quote
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),  -- 0 = hidden from the bot
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Ready answers the bot can give. Bot settings > Frequently asked questions.
CREATE TABLE IF NOT EXISTS faqs (
  id         INTEGER PRIMARY KEY,
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Languages the bot may reply in. Bot settings > Reply languages.
-- si covers Sinhala script and Singlish; ta covers Tamil script and Tanglish.
CREATE TABLE IF NOT EXISTS reply_languages (
  code    TEXT PRIMARY KEY CHECK (code IN ('en', 'si', 'ta')),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1))
);
INSERT OR IGNORE INTO reply_languages (code) VALUES ('si'), ('ta'), ('en');

-- When the bot hands a chat to the owner. Bot settings > Handover > "Hand over when".
CREATE TABLE IF NOT EXISTS handover_rules (
  key     TEXT PRIMARY KEY,
  label   TEXT NOT NULL,                  -- shown on the dashboard and given to the bot as the rule
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  sort    INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO handover_rules (key, label, sort) VALUES
  ('asks_for_person', 'Student or parent asks to speak to a person', 1),
  ('bot_unsure',      'Bot is unsure of the answer', 2),
  ('group_enrolment', 'Group enrolment of 5 or more students', 3);

-- A WhatsApp number that has messaged the business. Created on the first message.
CREATE TABLE IF NOT EXISTS contacts (
  id            INTEGER PRIMARY KEY,
  wa_id         TEXT NOT NULL UNIQUE,     -- WhatsApp number (msg.from), digits only
  name          TEXT,
  -- en | si / ta (Sinhala / Tamil script) | singlish / tanglish (written in English letters)
  language      TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'si', 'ta', 'singlish', 'tanglish')),
  -- 1 = language follows what they write (detected from each message); 0 = fixed on the dashboard.
  language_auto INTEGER NOT NULL DEFAULT 1 CHECK (language_auto IN (0, 1)),
  bot_paused    INTEGER NOT NULL DEFAULT 0 CHECK (bot_paused IN (0, 1)),  -- handed over to the owner
  paused_reason TEXT,                     -- the bot's handover summary, or why the owner took over
  paused_at     TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Every message in and out. The id is WhatsApp's message id, so it also deduplicates webhook
-- retries across restarts. Keyed by raw wa_id so logging never depends on other rows existing.
CREATE TABLE IF NOT EXISTS messages (
  id          TEXT PRIMARY KEY,
  wa_id       TEXT NOT NULL,
  direction   TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  type        TEXT NOT NULL,              -- text, image, document, audio, ...
  body        TEXT,                       -- text, or the caption of a photo/PDF
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  -- Outgoing only (NULL for incoming):
  status      TEXT CHECK (status IN ('sent', 'failed', 'not_sent')),  -- failed = WhatsApp refused it; not_sent = never tried
  error       TEXT,                       -- why it failed / wasn't sent
  tools       TEXT,                       -- JSON [{ name, ok, error? }]: tools the bot ran for this reply
  agent_error TEXT,                       -- set when this is the fallback message because the AI failed
  sent_by     TEXT CHECK (sent_by IN ('bot', 'owner')),
  -- Incoming photos / PDFs. media_file is set once the file is saved in MEDIA_DIR.
  media_id    TEXT,
  media_mime  TEXT,
  media_file  TEXT
);
CREATE INDEX IF NOT EXISTS idx_messages_wa ON messages(wa_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
