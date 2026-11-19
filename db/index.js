// Data access for the Catalyst shop assistant, on Node's built-in SQLite (node:sqlite, Node 22.13+).
// Every query lives here, so the rest of the app never writes SQL.
//
// What the owner enters on the dashboard (business details, products, FAQs, reply languages,
// handover rules) is saved through the save* functions, which validate input and throw an Error
// with status 400 and a message meant for the owner. The bot reads the same tables.

const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const DEFAULT_PATH = path.join(__dirname, "..", "data", "catalyst.db");
const SCHEMA = path.join(__dirname, "schema.sql");
let db;
let schemaApplied = false;

function connect(file = process.env.DB_PATH || DEFAULT_PATH) {
  if (db) return db;
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  schemaApplied = false;
  return db;
}

function open(file) {
  connect(file);
  if (!schemaApplied) {
    db.exec(fs.readFileSync(SCHEMA, "utf8"));
    schemaApplied = true;
  }
  return db;
}

function close() {
  db?.close();
  db = undefined;
}

// Drop every table and recreate the empty schema (tests use this to start clean).
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

// ---------- Validation helpers ----------

function invalid(message) {
  return Object.assign(new Error(message), { status: 400 });
}
const text = (v) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());
const optionalText = (v) => text(v) || null;
const isBlank = (v) => v === null || v === undefined || text(v) === "";

// Whole numbers from inputs and spreadsheets: 1250, "1250", "1,250", "Rs 1,250", "LKR 1250.00".
function wholeNumber(v, label, { optional = false } = {}) {
  if (optional && isBlank(v)) return null;
  const s = typeof v === "number" ? String(v) : text(v).replace(/^(rs\.?|lkr)\s*/i, "").replace(/[,\s]/g, "");
  if (!/^\d+(\.0+)?$/.test(s)) throw invalid(`${label} must be a whole number, like 1250.`);
  const n = Number(s);
  if (!Number.isSafeInteger(n)) throw invalid(`${label} is too large.`);
  return n;
}
const flag = (v) => (v === true || v === 1 || v === "1" || v === "true" ? 1 : 0);

// ---------- Languages ----------

// Languages a contact can write in. Keep in sync with the CHECK on contacts.language.
const LANGUAGES = ["en", "si", "ta", "singlish", "tanglish"];
// Reply-language switches on the dashboard; Singlish counts as Sinhala, Tanglish as Tamil.
const REPLY_LANGUAGES = ["si", "ta", "en"];
const replyGroup = (language) => ({ singlish: "si", tanglish: "ta" })[language] ?? language;

// ---------- Business ----------

function getBusiness() {
  return plain(q("SELECT * FROM business WHERE id = 1").get());
}

// WhatsApp numbers are stored as digits with the country code (what WhatsApp calls the wa_id).
function phoneDigits(v, label) {
  if (isBlank(v)) return null;
  const digits = text(v).replace(/[^\d]/g, "");
  if (digits.length < 8 || digits.length > 15) throw invalid(`${label} must be a full number with the country code, like +94 77 123 4567.`);
  return digits;
}

const BUSINESS_TEXT = ["owner_name", "opening_hours", "location", "payment_details", "delivery_info", "product_sheet_url"];

// Saves the fields given (others are left as they are). The business name is required.
function saveBusiness(fields = {}) {
  const set = {};
  if (fields.name !== undefined) {
    set.name = text(fields.name);
    if (!set.name) throw invalid("The business name is required.");
  }
  for (const k of BUSINESS_TEXT) if (fields[k] !== undefined) set[k] = optionalText(fields[k]);
  if (fields.handover_number !== undefined) set.handover_number = phoneDigits(fields.handover_number, "The handover number");
  if (fields.currency !== undefined) {
    set.currency = text(fields.currency).toUpperCase();
    if (!/^[A-Z]{3}$/.test(set.currency)) throw invalid("Currency must be a 3-letter code like LKR.");
  }
  const keys = Object.keys(set);
  if (keys.length) {
    q(`UPDATE business SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = ${NOW_SQL} WHERE id = 1`)
      .run(...keys.map((k) => set[k]));
  }
  return getBusiness();
}

// The switch for everyone. Single chats are paused with setBotPaused instead.
function setBotEnabled(enabled) {
  q(`UPDATE business SET bot_enabled = ?, updated_at = ${NOW_SQL} WHERE id = 1`).run(enabled ? 1 : 0);
  return getBusiness();
}

// ---------- Reply languages ----------

function listReplyLanguages() {
  const rows = new Map(q("SELECT code, enabled FROM reply_languages").all().map((r) => [r.code, r.enabled]));
  return REPLY_LANGUAGES.map((code) => ({ code, enabled: rows.get(code) ?? 1 }));
}

// { en: true, si: true, ta: false }; codes left out keep their setting. At least one must stay on.
function saveReplyLanguages(choice = {}) {
  return transaction(() => {
    const stmt = q("INSERT INTO reply_languages (code, enabled) VALUES (?, ?) ON CONFLICT(code) DO UPDATE SET enabled = excluded.enabled");
    for (const code of REPLY_LANGUAGES) if (choice[code] !== undefined) stmt.run(code, flag(choice[code]));
    if (!listReplyLanguages().some((l) => l.enabled)) throw invalid("Keep at least one reply language on.");
    return listReplyLanguages();
  });
}

// The language to reply in for someone who writes in `language`: theirs if it's switched on,
// otherwise English if that's on, otherwise the first language that is.
function replyLanguageFor(language) {
  const on = listReplyLanguages().filter((l) => l.enabled).map((l) => l.code);
  if (on.includes(replyGroup(language))) return language;
  return on.includes("en") ? "en" : (on[0] ?? "en");
}

// ---------- Handover rules ----------

function listHandoverRules() {
  return q("SELECT key, label, enabled FROM handover_rules ORDER BY sort, key").all().map(plain);
}

// [{ key, enabled }]; unknown keys are refused.
function saveHandoverRules(rules = []) {
  if (!Array.isArray(rules)) throw invalid("Handover rules must be a list.");
  return transaction(() => {
    const known = new Set(listHandoverRules().map((r) => r.key));
    const stmt = q("UPDATE handover_rules SET enabled = ? WHERE key = ?");
    for (const r of rules) {
      if (!known.has(r?.key)) throw invalid(`Unknown handover rule "${r?.key}".`);
      stmt.run(flag(r.enabled), r.key);
    }
    return listHandoverRules();
  });
}

// The Bot settings page saves everything on it at once, so nothing is half saved.
function saveSettings({ business, languages, handover_rules } = {}) {
  return transaction(() => ({
    business: business ? saveBusiness(business) : getBusiness(),
    languages: languages ? saveReplyLanguages(languages) : listReplyLanguages(),
    handover_rules: handover_rules ? saveHandoverRules(handover_rules) : listHandoverRules(),
  }));
}

// ---------- Products ----------

function getProduct(id) {
  return plain(q("SELECT * FROM products WHERE id = ?").get(id));
}

function listProducts({ activeOnly = false } = {}) {
  return q(`SELECT * FROM products ${activeOnly ? "WHERE active = 1" : ""} ORDER BY category IS NULL, category, name`).all().map(plain);
}

// Products the bot can offer whose name, category or description has every word of `query`.
function searchProducts(query, { limit = 20 } = {}) {
  const words = text(query).toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  const all = listProducts({ activeOnly: true });
  if (!words.length) return all.slice(0, limit);
  const hay = (p) => `${p.name} ${p.category ?? ""} ${p.description ?? ""}`.toLowerCase();
  const scored = all
    .map((p) => ({ p, score: words.filter((w) => hay(p).includes(w)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name));
  return scored.slice(0, limit).map((x) => x.p);
}

function productFields(fields) {
  const name = text(fields.name);
  if (!name) throw invalid("The product needs a name.");
  if (name.length > 200) throw invalid("The product name is too long.");
  return {
    name,
    price: wholeNumber(fields.price, `The price of ${name}`),
    stock: wholeNumber(fields.stock, `The stock of ${name}`, { optional: true }),
    category: optionalText(fields.category),
    description: optionalText(fields.description),
    active: fields.active === undefined ? 1 : flag(fields.active),
  };
}

function saveProduct(id, fields = {}) {
  const p = productFields(fields);
  return transaction(() => {
    const clash = q("SELECT id FROM products WHERE name = ?").get(p.name);
    if (clash && clash.id !== id) throw invalid(`A product called "${p.name}" already exists.`);
    const cols = Object.keys(p);
    if (id == null) {
      id = Number(q(`INSERT INTO products (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`).run(...Object.values(p)).lastInsertRowid);
    } else if (!q(`UPDATE products SET ${cols.map((k) => `${k} = ?`).join(", ")}, updated_at = ${NOW_SQL} WHERE id = ?`).run(...Object.values(p), id).changes) {
      throw invalid("That product no longer exists.");
    }
    return getProduct(id);
  });
}

const deleteProduct = (id) => q("DELETE FROM products WHERE id = ?").run(id).changes > 0;

// Import rows from a spreadsheet: [{ name, price, stock?, category?, description? }]. A row whose
// name matches an existing product (any case) updates it, changing only the columns the file has
// (a sheet without a Description column keeps the descriptions) and keeping the product's name as
// written. All or nothing: if any row is wrong, nothing is saved and every problem is returned.
// dryRun checks and counts without saving.
const IMPORT_COLUMNS = ["price", "stock", "category", "description", "active"];
function importProducts(rows, { dryRun = false } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) throw invalid("The file has no products.");
  if (rows.length > 5000) throw invalid("That's more than 5,000 products; split the file.");
  const existing = new Map(listProducts().map((p) => [p.name.toLowerCase(), p]));
  const errors = [];
  const parsed = []; // [id or null, fields]
  const seen = new Set();
  rows.forEach((row, i) => {
    try {
      const r = row && typeof row === "object" ? row : {};
      const key = text(r.name).toLowerCase();
      const before = existing.get(key);
      // For an update, columns missing from the file keep the product's current values.
      const merged = before
        ? { ...before, ...Object.fromEntries(IMPORT_COLUMNS.filter((k) => Object.hasOwn(r, k)).map((k) => [k, r[k]])) }
        : r;
      const p = productFields(merged);
      if (seen.has(key)) throw invalid(`"${p.name}" is in the file twice.`);
      seen.add(key);
      parsed.push([before?.id ?? null, p]);
    } catch (err) {
      errors.push({ row: i + 1, error: err.message });
    }
  });
  const updated = parsed.filter(([id]) => id !== null).length;
  const summary = { total: rows.length, created: parsed.length - updated, updated, errors };
  if (errors.length || dryRun) return { ok: errors.length === 0, ...summary };
  transaction(() => {
    for (const [id, p] of parsed) saveProduct(id, p);
  });
  return { ok: true, ...summary };
}

// ---------- FAQs ----------

function listFaqs() {
  return q("SELECT id, question, answer FROM faqs ORDER BY id").all().map(plain);
}

function saveFaq(id, fields = {}) {
  const question = text(fields.question);
  const answer = text(fields.answer);
  if (!question || !answer) throw invalid("An FAQ needs a question and an answer.");
  if (id == null) id = Number(q("INSERT INTO faqs (question, answer) VALUES (?, ?)").run(question, answer).lastInsertRowid);
  else if (!q(`UPDATE faqs SET question = ?, answer = ?, updated_at = ${NOW_SQL} WHERE id = ?`).run(question, answer, id).changes) {
    throw invalid("That FAQ no longer exists.");
  }
  return plain(q("SELECT id, question, answer FROM faqs WHERE id = ?").get(id));
}

const deleteFaq = (id) => q("DELETE FROM faqs WHERE id = ?").run(id).changes > 0;

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

const CONTACT_FIELDS = ["name", "language", "language_auto"];

function updateContact(contactId, fields = {}) {
  const keys = CONTACT_FIELDS.filter((k) => fields[k] !== undefined);
  if (keys.length) {
    q(`UPDATE contacts SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`).run(...keys.map((k) => fields[k]), contactId);
  }
  return getContact(contactId);
}

// Handover: while paused, the bot stays silent for this contact until the owner hands it back.
function setBotPaused(contactId, paused, reason) {
  q(`UPDATE contacts SET bot_paused = ?, paused_reason = ?, paused_at = ${paused ? NOW_SQL : "NULL"} WHERE id = ?`)
    .run(paused ? 1 : 0, paused ? reason ?? null : null, contactId);
  return getContact(contactId);
}

// ---------- Messages ----------

// Returns false if this message id was already logged (a webhook retry).
// status/error/tools/agentError/sentBy are for outgoing messages; see the messages table.
function logMessage({ id, waId, direction, type, body, status = null, error = null, tools = null, agentError = null, sentBy = null, mediaId = null, mediaMime = null }) {
  return q(`INSERT INTO messages (id, wa_id, direction, type, body, status, error, tools, agent_error, sent_by, media_id, media_mime)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`)
    .run(id, waId, direction, type, body ?? null, status, error, tools?.length ? JSON.stringify(tools) : null, agentError, sentBy, mediaId, mediaMime)
    .changes > 0;
}

// Recent messages with one WhatsApp number, oldest first.
function recentMessages(waId, limit = 16) {
  return q(`SELECT id, direction, type, body, created_at, status, error, tools, agent_error, sent_by, media_id, media_mime, media_file
            FROM messages WHERE wa_id = ? ORDER BY rowid DESC LIMIT ?`).all(waId, limit).map(plain).reverse();
}

function setMessageMedia(messageId, { file, mime }) {
  return q("UPDATE messages SET media_file = ?, media_mime = ? WHERE id = ?").run(file, mime, messageId).changes > 0;
}

// The stored file for a WhatsApp media id (for the dashboard).
function getMedia(mediaId) {
  return plain(q("SELECT id AS message_id, wa_id, media_id, media_mime, media_file FROM messages WHERE media_id = ? LIMIT 1").get(mediaId));
}

// ---------- Dashboard ----------

// Every contact with their latest message, most recent chat first.
function listConversations() {
  return q(`
    SELECT c.id, c.wa_id, c.name, c.language, c.language_auto, c.bot_paused, c.paused_reason, c.paused_at, c.created_at,
           m.body AS last_body, m.type AS last_type, m.direction AS last_direction, m.created_at AS last_at,
           (SELECT COUNT(*) FROM messages x WHERE x.wa_id = c.wa_id) AS message_count
    FROM contacts c
    LEFT JOIN messages m ON m.rowid = (SELECT rowid FROM messages WHERE wa_id = c.wa_id ORDER BY rowid DESC LIMIT 1)
    ORDER BY (m.created_at IS NULL), m.created_at DESC, c.id DESC`).all().map(plain);
}

function dashboardCounts(sinceIso) {
  const one = (sql, ...args) => q(sql).get(...args).n;
  return {
    contacts: one("SELECT COUNT(*) AS n FROM contacts"),
    paused: one("SELECT COUNT(*) AS n FROM contacts WHERE bot_paused = 1"),
    messages_in_24h: one("SELECT COUNT(*) AS n FROM messages WHERE direction = 'in' AND created_at >= ?", sinceIso),
    messages_out_24h: one(`SELECT COUNT(*) AS n FROM messages WHERE direction = 'out' AND created_at >= ?
                           AND (status IS NULL OR status = 'sent')`, sinceIso),
    undelivered_24h: one(`SELECT COUNT(*) AS n FROM messages WHERE direction = 'out' AND created_at >= ?
                          AND status IN ('failed', 'not_sent')`, sinceIso),
    agent_errors_24h: one("SELECT COUNT(*) AS n FROM messages WHERE agent_error IS NOT NULL AND created_at >= ?", sinceIso),
    products: one("SELECT COUNT(*) AS n FROM products WHERE active = 1"),
    out_of_stock: one("SELECT COUNT(*) AS n FROM products WHERE active = 1 AND stock = 0"),
    faqs: one("SELECT COUNT(*) AS n FROM faqs"),
    languages: q("SELECT language, COUNT(*) AS n FROM contacts GROUP BY language ORDER BY n DESC").all().map(plain),
  };
}

module.exports = {
  open, close, resetSchema, transaction, LANGUAGES, REPLY_LANGUAGES, replyGroup,
  getBusiness, saveBusiness, setBotEnabled,
  listReplyLanguages, saveReplyLanguages, replyLanguageFor,
  listHandoverRules, saveHandoverRules, saveSettings,
  getProduct, listProducts, searchProducts, saveProduct, deleteProduct, importProducts,
  listFaqs, saveFaq, deleteFaq,
  getContact, getContactByWaId, ensureContact, updateContact, setBotPaused,
  logMessage, recentMessages, setMessageMedia, getMedia,
  listConversations, dashboardCounts,
};
