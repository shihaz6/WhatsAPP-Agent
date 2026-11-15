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

// Send one reply produced by the agent. Only text so far; buttons and lists come in step 3.
function send(to, reply) {
  if (reply.type === "text") return sendText(to, reply.body);
  throw new Error(`Unsupported reply type: ${reply.type}`);
}

// Mark an incoming message as read (blue ticks). With typing: true it also shows
// "typing…" until the reply is sent (or ~25 s). If the typing indicator is refused,
// fall back to a plain read receipt.
async function markAsRead(messageId, { typing = false } = {}) {
  const payload = { status: "read", message_id: messageId };
  if (!typing) return callMessagesApi(payload);
  try {
    return await callMessagesApi({ ...payload, typing_indicator: { type: "text" } });
  } catch {
    return callMessagesApi(payload);
  }
}

// Download a photo or document someone sent (e.g. a payment slip). WhatsApp gives a media id;
// the id resolves to a short-lived URL that needs the same token. Returns { buffer, mime }.
const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
async function downloadMedia(mediaId) {
  const { token, version } = config();
  const auth = { Authorization: `Bearer ${token}` };
  const metaRes = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(mediaId)}`, {
    headers: auth, signal: AbortSignal.timeout(10_000),
  });
  const meta = await metaRes.json().catch(() => ({}));
  if (!metaRes.ok || !meta.url) throw new Error(`Media lookup ${metaRes.status}: ${meta.error?.message ?? "no url"}`);
  if (meta.file_size > MAX_MEDIA_BYTES) throw new Error(`File too large (${meta.file_size} bytes)`);
  const fileRes = await fetch(meta.url, { headers: auth, signal: AbortSignal.timeout(20_000) });
  if (!fileRes.ok) throw new Error(`Media download ${fileRes.status}`);
  const buffer = Buffer.from(await fileRes.arrayBuffer());
  if (buffer.length > MAX_MEDIA_BYTES) throw new Error(`File too large (${buffer.length} bytes)`);
  return { buffer, mime: meta.mime_type || fileRes.headers.get("content-type") || "application/octet-stream" };
}

module.exports = { isConfigured, send, sendText, markAsRead, downloadMedia };
