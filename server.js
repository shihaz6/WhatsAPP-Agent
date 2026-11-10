// Minimal WhatsApp Cloud API webhook server (no dependencies).
// GET  /webhook -> Meta verification handshake
// POST /webhook -> incoming events (messages, statuses); replies via the Graph API

const http = require("node:http");
const crypto = require("node:crypto");
const path = require("node:path");

// Load .env (gitignored) if present. Variables already set in the shell take precedence.
// process.loadEnvFile needs Node 20.12+; on older Node, set the variables in the shell instead.
if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(path.join(__dirname, ".env"));
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
}

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const APP_SECRET = process.env.APP_SECRET; // optional: enables signature check
const MAX_BODY_BYTES = 1024 * 1024; // 1 MB; Meta webhook payloads are far smaller

if (!VERIFY_TOKEN) {
  console.error("VERIFY_TOKEN is not set. Set it to the token configured in the Meta console.");
  process.exit(1);
}
if (!APP_SECRET) {
  console.warn("Warning: APP_SECRET is not set; request signatures will NOT be checked.");
}

const whatsapp = require("./whatsapp");
const agent = require("./agent");

if (!whatsapp.isConfigured()) {
  console.warn("Warning: WHATSAPP_TOKEN or PHONE_NUMBER_ID is not set; replies are disabled.");
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

function verifySignature(rawBody, header) {
  if (!APP_SECRET) return true;
  if (!header) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(rawBody).digest("hex");
  return safeEqual(header, expected);
}

// Keep only object items, so malformed payloads can't throw or log junk.
const asArray = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : []);

// Meta can deliver the same message more than once; remember recent IDs to reply only once.
const seenMessageIds = new Set();
const MAX_SEEN = 1000;

function firstTime(id) {
  if (seenMessageIds.has(id)) return false;
  seenMessageIds.add(id);
  if (seenMessageIds.size > MAX_SEEN) {
    seenMessageIds.delete(seenMessageIds.values().next().value); // drop the oldest
  }
  return true;
}

async function replyTo(msg) {
  if (!msg.id || !msg.from || !firstTime(msg.id)) return;
  if (!whatsapp.isConfigured()) return;

  const reply = agent.getReply(msg);
  try {
    await whatsapp.markAsRead(msg.id);
    if (reply) {
      await whatsapp.sendText(msg.from, reply, msg.id);
      console.log(`Replied to ${msg.from}:`, reply);
    }
  } catch (err) {
    console.error(`Failed to reply to ${msg.from}:`, err.message);
  }
}

function handleEvent(body) {
  for (const entry of asArray(body?.entry)) {
    for (const change of asArray(entry?.changes)) {
      const value = change?.value ?? {};
      for (const msg of asArray(value.messages)) {
        console.log(`Message from ${msg?.from} (${msg?.type}):`, msg?.text?.body ?? msg);
        replyTo(msg).catch((err) => console.error("Reply failed:", err)); // runs after the 200
      }
      for (const status of asArray(value.statuses)) {
        console.log(`Status ${status?.status} for ${status?.id}`);
      }
    }
  }
}

const server = http.createServer((req, res) => {
  // Fixed base: the Host header is client-controlled and may not form a valid URL.
  const url = new URL(req.url, "http://localhost");

  if (url.pathname !== "/webhook") {
    res.writeHead(404).end("Not found");
    return;
  }

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token !== null && safeEqual(token, VERIFY_TOKEN)) {
      console.log("Webhook verified");
      res.writeHead(200, { "Content-Type": "text/plain" }).end(challenge ?? "");
    } else {
      res.writeHead(403).end("Forbidden");
    }
    return;
  }

  if (req.method === "POST") {
    const chunks = [];
    let size = 0;
    let aborted = false;

    req.on("error", (err) => {
      aborted = true;
      console.error("Request error:", err.message);
    });

    req.on("data", (c) => {
      if (aborted) return;
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        aborted = true;
        res.writeHead(413, { Connection: "close" }).end("Payload too large");
        req.destroy();
        return;
      }
      chunks.push(c);
    });

    req.on("end", () => {
      if (aborted) return;
      const raw = Buffer.concat(chunks);
      if (!verifySignature(raw, req.headers["x-hub-signature-256"])) {
        res.writeHead(401).end("Invalid signature");
        return;
      }
      let body;
      try {
        body = JSON.parse(raw.toString("utf8"));
      } catch {
        res.writeHead(400).end("Bad JSON");
        return;
      }

      // Acknowledge quickly; Meta retries if it doesn't get a 200.
      res.writeHead(200).end("EVENT_RECEIVED");

      try {
        handleEvent(body);
      } catch (err) {
        console.error("Failed to process event:", err);
      }
    });
    return;
  }

  res.writeHead(405).end("Method not allowed");
});

server.listen(PORT, () => console.log(`Webhook server listening on :${PORT}/webhook`));
