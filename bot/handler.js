// The pipeline every incoming WhatsApp message goes through:
//   log (and drop duplicates) -> ensure contact -> skip if the bot is off or this chat is paused
//   -> mark read + "typing…" -> AI agent -> send replies -> log replies
//   -> if the bot handed the chat over, tell the owner's handover number
// db, whatsapp and agent are passed in so tests can run it without a network.

const crypto = require("node:crypto");
const { saveMedia } = require("./media");

// Reduce a raw webhook message to what the agent needs. Photos and documents keep their media
// id (to download the file) and caption (as the text).
function normalize(msg) {
  const media = msg.type === "image" || msg.type === "document" ? msg[msg.type] : null;
  return {
    id: msg.id,
    from: msg.from,
    type: msg.type,
    text: msg.type === "text" ? (msg.text?.body ?? "") : (media?.caption ?? null),
    media: media?.id ? { id: media.id, mime: media.mime_type ?? null } : null,
  };
}

function createHandler({ db, whatsapp, agent, log = console, mediaDir }) {
  // Messages from one person are handled one at a time, in arrival order, so the agent
  // always sees the previous reply in the history before answering the next message.
  const queues = new Map();

  function handleMessage(msg) {
    const key = msg?.from ?? "";
    const run = (queues.get(key) ?? Promise.resolve())
      .then(() => processMessage(msg))
      .catch((err) => {
        log.error(`Failed to handle message from ${key}:`, err);
        return { status: "error", error: err };
      });
    queues.set(key, run);
    run.finally(() => { if (queues.get(key) === run) queues.delete(key); });
    return run;
  }

  async function processMessage(msg) {
    if (!msg?.id || !msg?.from) return { status: "invalid" };
    const incoming = normalize(msg);

    // The WhatsApp message id is the primary key, so a redelivery is refused here.
    if (!db.logMessage({ id: incoming.id, waId: incoming.from, direction: "in", type: incoming.type, body: incoming.text,
      mediaId: incoming.media?.id, mediaMime: incoming.media?.mime })) {
      return { status: "duplicate" };
    }

    // Keep the file before anything else, even for a paused chat: the owner may need to see it.
    if (incoming.media && whatsapp.isConfigured() && whatsapp.downloadMedia) {
      try {
        await saveMedia({ db, whatsapp, messageId: incoming.id, mediaId: incoming.media.id, mime: incoming.media.mime, ...(mediaDir ? { dir: mediaDir } : {}) });
      } catch (err) {
        log.error(`Could not save media from ${incoming.from}:`, err.message);
      }
    }

    const contact = db.ensureContact(incoming.from);
    if (db.getBusiness()?.bot_enabled === 0) {
      log.log(`Bot is switched off; not replying to ${contact.wa_id}.`);
      return { status: "bot_off" };
    }
    if (contact.bot_paused) {
      log.log(`Bot paused for ${contact.wa_id}; not replying.`);
      return { status: "paused" };
    }

    const configured = whatsapp.isConfigured();
    if (configured) {
      try {
        await whatsapp.markAsRead(incoming.id, { typing: true });
      } catch (err) {
        log.error("Could not mark as read:", err.message);
      }
    }

    const result = await agent.respond({ contact, incoming });

    // Every reply is logged, delivered or not, so the dashboard shows what the bot did.
    // The tools it ran and any agent error go on the first reply of the turn.
    const logReply = (reply, i, { id, status, error = null }) => db.logMessage({
      id: id ?? `local.${crypto.randomUUID()}`, waId: contact.wa_id, direction: "out", type: reply.type, body: reply.body,
      status, error, sentBy: "bot", ...(i === 0 ? { tools: result.toolLog, agentError: result.failed ? (result.error ?? "Agent failed") : null } : {}),
    });

    if (!configured) {
      log.warn("WhatsApp is not configured; replies not sent:", result.replies);
      result.replies.forEach((r, i) => logReply(r, i, { status: "not_sent", error: "WhatsApp is not configured (WHATSAPP_TOKEN / PHONE_NUMBER_ID)" }));
      return { status: "handled", ...result };
    }
    let failure = null;
    for (const [i, reply] of result.replies.entries()) {
      if (failure) { // don't send later parts of a reply out of order
        logReply(reply, i, { status: "not_sent", error: "Skipped because an earlier part didn't send" });
        continue;
      }
      try {
        const res = await whatsapp.send(contact.wa_id, reply);
        logReply(reply, i, { id: res?.messages?.[0]?.id, status: "sent" });
      } catch (err) {
        failure = err;
        log.error(`Failed to send to ${contact.wa_id}:`, err.message);
        logReply(reply, i, { status: "failed", error: err.message });
      }
    }
    if (result.handedOff) await notifyOwner(contact.wa_id);
    return { status: "handled", ...result };
  }

  // Best effort: WhatsApp only delivers a free-form message to a number that has messaged the
  // business in the last 24 hours, so this can fail; the chat still shows as "Needs you".
  async function notifyOwner(customerWaId) {
    const to = db.getBusiness()?.handover_number;
    if (!to || to === customerWaId) return;
    const summary = db.getContactByWaId(customerWaId)?.paused_reason?.replace(/^Handed over by the bot:\n/, "") ?? "";
    const body = `Catalyst: a student or parent needs you.\nFrom: +${customerWaId}\n${summary}\nReply to them from the dashboard (Conversations).`.slice(0, 4096);
    try {
      await whatsapp.send(to, { type: "text", body });
    } catch (err) {
      log.error(`Could not tell the handover number ${to} about ${customerWaId}:`, err.message);
    }
  }

  return { handleMessage };
}

module.exports = { createHandler, normalize };
