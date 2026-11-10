# WhatsApp Agent

A WhatsApp agent built on the [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api). Right now the project is a minimal webhook server with no dependencies. It receives and logs incoming WhatsApp messages and delivery status updates.

## Progress so far

- [x] **Webhook server** (`server.js`): plain Node.js using only built-in modules (`node:http`, `node:crypto`)
  - `GET /webhook`: answers Meta's verification check (`hub.mode`, `hub.verify_token`, `hub.challenge`)
  - `POST /webhook`: receives events, replies `200` right away (Meta resends events that aren't acknowledged), and logs incoming messages and status updates
  - Optional request signature check using `X-Hub-Signature-256` when `APP_SECRET` is set
  - Returns `400` for bad JSON, `401` for a bad signature, `403` for a wrong verify token, `404` for unknown paths, `405` for unsupported methods and `413` for bodies over 1 MB
  - Payloads with an unexpected shape are ignored instead of crashing the server
- [x] **`package.json`** with an `npm start` script
- [x] **`.gitignore`** covering secrets (`.env*`), `node_modules`, logs, build output, ngrok config and OS/editor files
- [x] Local smoke test passed for verification (pass and fail cases) and for receiving a text message

## Next steps

- [x] Send replies through the Graph API (`POST /{phone-number-id}/messages`): `whatsapp.js`
  - Marks incoming messages as read, replies quoting the original, ignores duplicate deliveries
- [x] **Phase 2a – Data model** (`db/`), on Node's built-in SQLite:
  - **Contacts vs students:** a contact is a WhatsApp number (parent or adult student) and is created on the first message; it holds the preferred language (`en`/`si`/`ta`) and a `bot_paused` flag for human handoff. Students belong to a contact (a parent can have several) and are created only when someone enrols, books a trial or books a one-to-one session.
  - Tutor, subjects, weekly classes with cancellations/reschedules, enrollments, availability, materials, FAQs, conversation state and a message log
  - **Payments** go `due → slip_received → approved`, or `→ rejected` (with reason) and back to `slip_received` when a new slip arrives; the slip image's media id, reviewer and review time are stored. One slip can cover several payments.
  - **Trials:** one session of a group class on a specific date, refused for cancelled, moved, past or full sessions
  - `npm run seed` loads demo data (refuses when `NODE_ENV=production`); `npm test` runs the data-model tests
- [ ] **Phase 2b – Conversation flow** in `agent.js` (it currently echoes text messages back)
- [x] Load config from a `.env` file and add an `.env.example`
- [ ] Deploy to a public host

## Requirements

- Node.js 22.13 or newer, for the built-in `node:sqlite` (developed on Node 24)
- A Meta developer app with the WhatsApp product added
- A tunnel such as [ngrok](https://ngrok.com/) for local development

## Configuration

| Variable       | Required | Default     | Description                                                   |
| -------------- | -------- | ----------- | ------------------------------------------------------------- |
| `PORT`         | No       | `3000`      | Port the server listens on                                    |
| `VERIFY_TOKEN` | Yes      | none        | Any secret string. It must match the token set in the Meta console. The server won't start without it |
| `APP_SECRET`   | No       | none        | Meta app secret. When set, the server checks request signatures. Leave unset only for local testing (a warning is printed) |
| `WHATSAPP_TOKEN` | For replies | none    | Access token from **WhatsApp → API Setup** (temporary tokens expire after 24h; use a System User token for anything longer-lived) |
| `PHONE_NUMBER_ID` | For replies | none   | Phone number ID from **WhatsApp → API Setup** (not the phone number itself) |
| `GRAPH_API_VERSION` | No    | `v24.0`     | Graph API version used for sending                            |

Put these in a `.env` file in the project root (copy `.env.example`). The server loads it at startup (Node 20.12+). The file is gitignored, so secrets stay out of the repo. Variables set in the shell override the file.

## Running locally

With a filled-in `.env`:
```bash
npm run seed   # first time: create data/tutor.db with demo data
npm start
```

Or pass the variables directly:

**PowerShell**
```powershell
$env:VERIFY_TOKEN="your-secret"; $env:APP_SECRET="your-app-secret"; npm start
```

**Bash**
```bash
VERIFY_TOKEN=your-secret APP_SECRET=your-app-secret npm start
```

The server starts at `http://localhost:3000/webhook`.

## Connecting to Meta

1. Make the server reachable from the internet:
   ```bash
   ngrok http 3000
   ```
2. In the Meta developer console, open **WhatsApp → Configuration → Webhook**:
   - **Callback URL:** `https://<your-ngrok-host>/webhook`
   - **Verify token:** the same value as `VERIFY_TOKEN`
3. Click **Verify and save**. The server logs `Webhook verified`.
4. Subscribe to the **`messages`** webhook field.
5. Send a WhatsApp message to your test number. The server logs it like this:
   ```
   Message from 94771234567 (text): hello
   ```

## Testing manually

```bash
# Verification check (should print 12345)
curl "http://localhost:3000/webhook?hub.mode=subscribe&hub.verify_token=your-secret&hub.challenge=12345"

# Simulated incoming message. This request has no signature, so it returns 401
# while APP_SECRET is set. To try it, comment out APP_SECRET in .env first.
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"entry":[{"changes":[{"value":{"messages":[{"from":"94771234567","type":"text","text":{"body":"hello"}}]}}]}]}'
```

## Project structure

```
WhatsApp-Agent/
├── server.js      # Webhook server: verification, signature check, event routing
├── whatsapp.js    # Graph API client: sendText, markAsRead
├── agent.js       # Reply logic (currently an echo)
├── db/
│   ├── schema.sql # Tables, constraints and indexes
│   ├── index.js   # Data access functions used by the agent
│   └── seed.js    # Demo tutor data (npm run seed; drops and recreates all tables)
├── test/
│   └── db.test.js # Data model tests (npm test)
├── data/          # tutor.db lives here (gitignored)
├── package.json   # Project metadata and npm start script
├── .env.example   # Template for .env (copy and fill in; .env is gitignored)
├── .gitignore     # Files git should not track
└── README.md
```
