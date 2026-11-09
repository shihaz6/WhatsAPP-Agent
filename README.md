# WhatsApp Agent

A WhatsApp agent built on the [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api). Right now the project is a minimal webhook server with no dependencies. It receives and logs incoming WhatsApp messages and delivery status updates.

## Progress so far

- [x] **Webhook server** (`server.js`): plain Node.js using only built-in modules (`node:http`, `node:crypto`)
  - `GET /webhook`: answers Meta's verification check (`hub.mode`, `hub.verify_token`, `hub.challenge`)
  - `POST /webhook`: receives events, replies `200` right away (Meta resends events that aren't acknowledged), and logs incoming messages and status updates
  - Optional request signature check using `X-Hub-Signature-256` when `APP_SECRET` is set
  - Returns `400` for bad JSON, `401` for a bad signature, `403` for a wrong verify token, `404` for unknown paths and `405` for unsupported methods
- [x] **`package.json`** with an `npm start` script
- [x] **`.gitignore`** covering secrets (`.env*`), `node_modules`, logs, build output, ngrok config and OS/editor files
- [x] Local smoke test passed for verification (pass and fail cases) and for receiving a text message

## Next steps

- [ ] Send replies through the Graph API (`POST /{phone-number-id}/messages`)
- [ ] Add the agent logic (decide how to respond to incoming messages)
- [ ] Load config from a `.env` file and add an `.env.example`
- [ ] Deploy to a public host

## Requirements

- Node.js 18 or newer (developed on Node 24)
- A Meta developer app with the WhatsApp product added
- A tunnel such as [ngrok](https://ngrok.com/) for local development

## Configuration

| Variable       | Required | Default     | Description                                                   |
| -------------- | -------- | ----------- | ------------------------------------------------------------- |
| `PORT`         | No       | `3000`      | Port the server listens on                                    |
| `VERIFY_TOKEN` | Yes      | `change-me` | Any secret string. It must match the token set in the Meta console |
| `APP_SECRET`   | No       | none        | Meta app secret. When set, the server checks request signatures |

## Running locally

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

# Simulated incoming message (leave APP_SECRET unset, because this request has no signature)
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"entry":[{"changes":[{"value":{"messages":[{"from":"94771234567","type":"text","text":{"body":"hello"}}]}}]}]}'
```

## Project structure

```
WhatsApp-Agent/
├── server.js      # Webhook server
├── package.json   # Project metadata and npm start script
├── .gitignore     # Files git should not track
└── README.md
```
