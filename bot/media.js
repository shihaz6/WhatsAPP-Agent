// Keeps the photos and PDFs people send (payment slips, mostly) so the teacher can see them on
// the dashboard. WhatsApp only keeps media for a limited time, so each file is downloaded as soon
// as it arrives and stored in MEDIA_DIR (default data/media, gitignored with the rest of data/).
//
// Files are named after the WhatsApp media id (sanitised), never after anything the sender chose,
// and only images and PDFs are kept.

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_DIR = path.join(__dirname, "..", "data", "media");
const TYPES = {
  "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/heic": ".heic",
  "application/pdf": ".pdf",
};

const mediaDir = () => process.env.MEDIA_DIR || DEFAULT_DIR;
const baseMime = (mime) => String(mime ?? "").split(";")[0].trim().toLowerCase();
const isKept = (mime) => Object.hasOwn(TYPES, baseMime(mime));
const fileName = (mediaId, mime) => `${String(mediaId).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 120)}${TYPES[baseMime(mime)]}`;

// Download one file and record it on its message. Returns the file name, or null if not kept.
async function saveMedia({ db, whatsapp, messageId, mediaId, mime, dir = mediaDir() }) {
  if (!isKept(mime)) return null;
  const { buffer, mime: actual } = await whatsapp.downloadMedia(mediaId);
  const type = isKept(actual) ? actual : mime;
  const name = fileName(mediaId, type);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), buffer);
  db.setMessageMedia(messageId, { file: name, mime: baseMime(type) });
  return name;
}

// Absolute path of a stored file, or null. `name` comes from the database, but is checked anyway.
function mediaPath(name, dir = mediaDir()) {
  if (!name || name !== path.basename(name)) return null;
  const full = path.join(dir, name);
  return fs.existsSync(full) ? full : null;
}

module.exports = { saveMedia, mediaPath, isKept, mediaDir };
