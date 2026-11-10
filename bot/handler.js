// The pipeline every incoming WhatsApp message goes through:
//   log (and drop duplicates) -> ensure contact -> skip if paused -> mark read + "typing…"
//   -> AI agent -> send replies -> log replies
// db, whatsapp and agent are passed in so tests can run it without a network.

// Reduce a raw webhook message to what the agent needs.
function normalize(msg) {
  return {
    id: msg.id,
    from: msg.from,
    type: msg.type,
    text: msg.type === "text" ? (msg.text?.body ?? "") : null,
  };
}

function createHandler({ db, whatsapp, agent, log = console }) {
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
    if (!db.logMessage({ id: incoming.id, waId: incoming.from, direction: "in", type: incoming.type, body: incoming.text })) {
      return { status: "duplicate" };
    }

    const contact = db.ensureContact(incoming.from);
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

    if (!configured) {
      log.warn("WhatsApp is not configured; replies not sent:", result.replies);
      return { status: "handled", ...result };
    }
    for (const reply of result.replies) {
      try {
        const res = await whatsapp.send(contact.wa_id, reply);
        const outId = res?.messages?.[0]?.id;
        if (outId) db.logMessage({ id: outId, waId: contact.wa_id, direction: "out", type: reply.type, body: reply.body });
      } catch (err) {
        log.error(`Failed to send to ${contact.wa_id}:`, err.message);
        break; // don't send later parts of a reply out of order
      }
    }
    return { status: "handled", ...result };
  }

  return { handleMessage };
}

module.exports = { createHandler, normalize };
