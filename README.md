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
- [x] **Data model** (`db/schema.sql`, `db/index.js`), on Node's built-in SQLite in `data/catalyst.db`. Everything the owner enters on the dashboard lives here, and the bot answers only from it:
  - **business** (one row): name, owner's name, opening hours, location, payment details, delivery info, handover number, the bot's on/off switch for everyone, currency
  - **products**: name (unique, any case), price (whole LKR), stock (empty = not tracked), category, details, hidden-from-bot flag. Added by hand or imported from a CSV (all or nothing; a dry run previews it)
  - **faqs**, **reply_languages** (Sinhala incl. Singlish, Tamil incl. Tanglish, English) and **handover_rules** ("Customer asks to speak to a person", "Bot is unsure of the answer", "Bulk order over 10 items")
  - **contacts** (a WhatsApp number, its language and a `bot_paused` flag for handover) and **messages** (every message in and out, deduplicated by WhatsApp id)
  - A new database starts empty; `npm test` runs the tests on an in-memory one
- [x] **AI agent** (`bot/`, `ai/`): a Groq model runs the conversation with the product list and business details in its prompt, and tools scoped to the sender: `search_products`, `get_business_info`, `get_faqs`, `hand_off_to_owner`
  - Replies mirror the language *and script* of the latest message (English, Sinhala, Tamil, Singlish, Tanglish), limited to the reply languages the owner switched on
  - Made-up prices and promises it can't keep (taking orders, reserving stock) are caught and the model answers again
  - Orders, complaints, photos and the owner's handover rules hand the chat over: the bot goes quiet there, and the handover number gets a WhatsApp alert (only delivered if that number messaged the business in the last 24 hours)
  - Photos and PDFs are saved in `data/media/` (`MEDIA_DIR`); the bot can't see them
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
| `AI_PROVIDER`  | No       | `gemini` if `GEMINI_API_KEY` is set, else `groq` | Which AI provider the agent uses: `gemini`, `nvidia`, `openrouter` or `groq` |
| `GEMINI_API_KEY` | For AI replies (Gemini) | none | Google AI Studio key. Without an AI key the bot only sends a "having trouble" message |
| `GEMINI_MODEL` | No       | `gemini-3.5-flash-lite` | Gemini model (new keys can't use 2.5 models) |
| `NVIDIA_API_KEY` | For AI replies (NVIDIA) | none | NVIDIA API key (`nvapi-...`) |
| `NVIDIA_MODEL` | No | `moonshotai/kimi-k3.1-pro` | NVIDIA-hosted model |
| `NVIDIA_REASONING_EFFORT` | No | model default | `low`/`medium`/`high` for reasoning models |
| `OPENROUTER_API_KEY` | For AI replies (OpenRouter) | none | OpenRouter API key (`sk-or-...`) |
| `OPENROUTER_MODEL` | No | `nvidia/nemotron-3.5-super-vl:free` | OpenRouter model; `:free` models cost nothing but have daily request limits |
| `GROQ_API_KEY` | For AI replies (Groq) | none  | Groq API key |
| `GROQ_MODEL`   | No       | `openai/gpt-oss-120b` | Groq model used by the agent                        |
| `GROQ_REASONING_EFFORT` | No | Groq default | `low`/`medium`/`high` for gpt-oss models. `low` was tested and made the agent skip tools and invent classes |
| `ADMIN_TOKEN`  | For the dashboard | none | Sign-in key for the AlchemyX Catalyst dashboard at `/admin`. Use a long random string. Without it the dashboard is open with no sign-in (anyone with the URL, including through ngrok, can use it) |

Put these in a `.env` file in the project root (copy `.env.example`). The server loads it at startup (Node 20.12+). The file is gitignored, so secrets stay out of the repo. Variables set in the shell override the file.

## Running locally

With a filled-in `.env`:
```bash
npm start      # creates data/catalyst.db (empty) on first run
# then open http://localhost:3000/admin/ and add the business details, products and FAQs
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

## AlchemyX Catalyst (owner's dashboard)

A web dashboard for the business owner, served by the same server at `http://localhost:3000/admin/` (and through ngrok at `https://<your-ngrok-host>/admin/`). Built with React + TypeScript + Vite + Tailwind in `web/`; the API is `admin/api.js`. The sidebar collapses to an icon rail with the ☰ button, and the open page is kept in the URL (`#conversations`).

- **Overview:** messages answered and received in the last 24 hours, customers, chats handed over, warnings for undelivered replies, AI failures or the bot being switched off, and a setup checklist until the business details, products and FAQs are in
- **Products:** the products the bot offers, with search. Add or edit one at a time (price, stock or "not tracked", category, details, hidden from the bot), or upload a CSV in the template's layout: it is checked first ("48 products · 40 new · 8 updated"), nothing is saved if any row is wrong, and updates only change the columns in the file. Google Sheet sync is not built yet
- **Conversations:** every chat, refreshed every few seconds, with search and a "Needs you" filter. **Take over** pauses the bot so the owner can reply from the dashboard (sent on WhatsApp from the business number); **Return to bot** resumes it
- **Bot settings:** business information, reply languages, handover number and rules (saved together, all or nothing), FAQs (saved one at a time), and the bot's on/off switch for everyone (takes effect at once)

If `ADMIN_TOKEN` is set, every API call needs it (you type it in to sign in; it is kept only for that browser tab). If it is not set, the dashboard opens straight away with no sign-in.

```bash
npm run web:install   # first time
npm run web:build     # build web/dist, then (re)start the server
npm run web:dev       # or: live-reloading UI at http://localhost:5173/admin/ (needs npm start running)
```

### Promo video

`video/` is a [Remotion](https://www.remotion.dev/) project that renders a 36-second promo of Catalyst (1920x1080, 30 fps): intro, overview, a Singlish conversation answered by the bot, the teacher taking over, approving a slip, and an outro. The screens reuse the dashboard's own stylesheet. The soundtrack is synthesized by `video/scripts/make-soundtrack.mjs` (no third-party music).

```bash
cd video
npm install
npm run studio   # preview and scrub at http://localhost:3211
npm run render   # writes out/catalyst-promo.mp4
```

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
├── ai/
│   └── groq.js    # Groq chat client (retries rate limits)
├── bot/
│   ├── handler.js # Per-message pipeline: log, contact, pause check, typing, agent, send
│   ├── agent.js   # System prompt, chat history, tool-calling loop, fallback
│   └── tools.js   # The agent's only access to data, scoped to the sender
├── scripts/
│   └── admin.js   # npm run admin -- show|pause|resume|lang <number>
├── db/
│   ├── schema.sql # Tables, constraints and indexes
│   └── index.js   # Data access and validation, used by the agent and the dashboard API
├── test/
│   ├── fixtures.js   # A small fictional shop the tests start from
│   ├── db.test.js    # Data model tests (npm test)
│   ├── bot.test.js   # Message pipeline tests (bot switch, handover alert)
│   ├── agent.test.js # Agent loop, tools, languages, fact checks (scripted fake model)
│   ├── admin.test.js # Dashboard API tests
│   └── groq.test.js  # Groq client retries (fake fetch)
├── data/          # catalyst.db and saved media live here (gitignored)
├── package.json   # Project metadata and npm start script
├── .env.example   # Template for .env (copy and fill in; .env is gitignored)
├── .gitignore     # Files git should not track
└── README.md
```
