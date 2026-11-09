// Minimal WhatsApp Cloud API webhook server (no dependencies).
// GET  /webhook -> Meta verification handshake
// POST /webhook -> incoming events (messages, statuses)

const http = require("node:http");
const crypto = require("node:crypto");

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "change-me";
const APP_SECRET = process.env.APP_SECRET; // optional: enables signature check

function verifySignature(rawBody, header) {
  if (!APP_SECRET) return true;
  if (!header) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(rawBody).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname !== "/webhook") {
    res.writeHead(404).end("Not found");
    return;
  }

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verified");
      res.writeHead(200, { "Content-Type": "text/plain" }).end(challenge);
    } else {
      res.writeHead(403).end("Forbidden");
    }
    return;
  }

  if (req.method === "POST") {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
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

      for (const entry of body.entry ?? []) {
        for (const change of entry.changes ?? []) {
          const value = change.value ?? {};
          for (const msg of value.messages ?? []) {
            console.log(`Message from ${msg.from} (${msg.type}):`, msg.text?.body ?? msg);
          }
          for (const status of value.statuses ?? []) {
            console.log(`Status ${status.status} for ${status.id}`);
          }
        }
      }
    });
    return;
  }

  res.writeHead(405).end("Method not allowed");
});

server.listen(PORT, () => console.log(`Webhook server listening on :${PORT}/webhook`));
