// Minimal WhatsApp Cloud API client (Graph API) using Node's built-in fetch.
// Config is read at call time so .env loading in server.js always comes first.

function config() {
  return {
    token: process.env.WHATSAPP_TOKEN,
    phoneNumberId: process.env.PHONE_NUMBER_ID,
    version: process.env.GRAPH_API_VERSION || "v24.0",
  };
}

function isConfigured() {
  const { token, phoneNumberId } = config();
  return Boolean(token && phoneNumberId);
}

async function callMessagesApi(payload) {
  const { token, phoneNumberId, version } = config();
  const res = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = data.error ?? {};
    throw new Error(`Graph API ${res.status}: ${e.message ?? "unknown error"} (code ${e.code ?? "?"})`);
  }
  return data;
}

// Send a text message. replyTo (optional) quotes the incoming message in the chat.
function sendText(to, body, replyTo) {
  return callMessagesApi({
    recipient_type: "individual",
    to,
    type: "text",
    text: { body: body.slice(0, 4096) }, // WhatsApp's text limit
    ...(replyTo ? { context: { message_id: replyTo } } : {}),
  });
}

// Mark an incoming message as read (blue ticks).
function markAsRead(messageId) {
  return callMessagesApi({ status: "read", message_id: messageId });
}

module.exports = { isConfigured, sendText, markAsRead };
