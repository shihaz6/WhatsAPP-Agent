// Small admin tool for testing. Works while the server is running.
//   npm run admin -- show   <wa_id>            contact and last messages
//   npm run admin -- pause  <wa_id> [reason]   bot stops replying (handover)
//   npm run admin -- resume <wa_id>            bot replies again
//   npm run admin -- lang   <wa_id> <language> auto (follow what they write) or fix it: en|si|ta|singlish|tanglish
// wa_id is the number as WhatsApp sends it: country code, no "+" or spaces (e.g. 94771234567).

const path = require("node:path");
if (typeof process.loadEnvFile === "function") {
  try { process.loadEnvFile(path.join(__dirname, "..", ".env")); } catch {}
}
const db = require("../db");

const [cmd, rawWaId, ...rest] = process.argv.slice(2);
const waId = rawWaId?.replace(/[^\d]/g, "");
const usage = () => {
  console.log("Usage: npm run admin -- <show|pause|resume|lang> <wa_id> [reason|language]");
  process.exit(1);
};
if (!cmd || !waId) usage();
if (waId.length < 8) {
  console.error(`"${rawWaId}" doesn't look like a full number. Type it without spaces, e.g. 94771234567.`);
  process.exit(1);
}

const contact = db.getContactByWaId(waId);
if (!contact) {
  console.error(`No contact with WhatsApp number ${waId}. They need to message the bot first.`);
  process.exit(1);
}

switch (cmd) {
  case "show": {
    console.log("Contact:", contact);
    console.log("Last messages:");
    for (const m of db.recentMessages(waId, 10)) console.log(`  ${m.created_at} ${m.direction === "in" ? "<-" : "->"} [${m.type}] ${m.body ?? ""}`);
    break;
  }
  case "pause":
    db.setBotPaused(contact.id, true, rest.join(" ") || "Paused by admin");
    console.log(`Bot paused for ${waId}.`);
    break;
  case "resume":
    db.setBotPaused(contact.id, false);
    console.log(`Bot resumed for ${waId}.`);
    break;
  case "lang": {
    const language = rest[0]?.toLowerCase();
    if (language === "auto") {
      db.updateContact(contact.id, { language_auto: 1 });
      console.log(`Language for ${waId} is automatic again: it follows what they write.`);
      break;
    }
    if (!db.LANGUAGES.includes(language)) {
      console.error(`Language must be auto or one of: ${db.LANGUAGES.join(", ")}`);
      process.exit(1);
    }
    db.updateContact(contact.id, { language, language_auto: 0 });
    console.log(`Language for ${waId} fixed to ${language}. (Use "lang ${waId} auto" to follow what they write again.)`);
    break;
  }
  default:
    usage();
}
db.close();
