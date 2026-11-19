# Setting up the WhatsApp Agent on a normal PC

This guide takes you from a fresh Windows, macOS or Linux computer to a running bot that answers WhatsApp messages, plus the AlchemyX Catalyst dashboard for the teacher. No programming knowledge is needed; you only copy and paste commands.

Plan for about 30–45 minutes the first time. Most of that is creating the Meta and Groq accounts.

---

## 1. What you need

| Thing | Why | Cost |
| --- | --- | --- |
| A PC running Windows 10/11, macOS or Linux | Runs the bot | – |
| An internet connection that stays on | Meta sends messages to your PC | – |
| [Node.js](https://nodejs.org/) **22.13 or newer** (24 LTS recommended) | Runs the server and its built-in database | Free |
| [Git](https://git-scm.com/downloads) | Downloads the project | Free |
| A [Meta developer account](https://developers.facebook.com/) with a WhatsApp app | Sends and receives WhatsApp messages | Free test number |
| A [Groq](https://console.groq.com/) account | The AI model that writes the replies | Free tier |
| [ngrok](https://ngrok.com/download) | Gives your PC a public web address so Meta can reach it | Free tier |

> The PC must stay switched on and awake while the bot is in use. If it sleeps, the bot stops answering.

---

## 2. Install the tools

### Windows
1. Download and install **Node.js LTS** from <https://nodejs.org/> (keep the default options).
2. Download and install **Git** from <https://git-scm.com/download/win> (keep the default options).
3. Download **ngrok** from <https://ngrok.com/download>, unzip it, and follow the page's instructions to add your authtoken (`ngrok config add-authtoken <your-token>`).
4. Open **PowerShell** (Start menu → type "PowerShell").

### macOS
1. Install Node.js LTS from <https://nodejs.org/>.
2. Git: run `git --version` in **Terminal**; macOS offers to install it if it's missing.
3. Install ngrok from <https://ngrok.com/download> and add your authtoken.

### Linux (Ubuntu/Debian)
```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs git
```
Then install ngrok from <https://ngrok.com/download> and add your authtoken.

### Check it worked
```bash
node --version   # must print v22.13.0 or higher
git --version
ngrok version
```
If `node --version` shows an older version, install the newer one from nodejs.org and open a new terminal window.

---

## 3. Download the project

```bash
git clone <repository-url> WhatsApp-Agent
cd WhatsApp-Agent
npm install
```

Replace `<repository-url>` with the project's Git URL. (If you received the project as a zip file instead, unzip it, open a terminal in that folder and run `npm install`.)

The server itself has no outside packages; `npm install` just prepares the folder.

---

## 4. Get your keys

### 4a. Meta / WhatsApp
1. Go to <https://developers.facebook.com/apps> → **Create app** → choose **Business** → add the **WhatsApp** product.
2. Open **WhatsApp → API Setup**. Copy:
   - **Phone number ID** (a long number, *not* the phone number itself) → `PHONE_NUMBER_ID`
   - **Temporary access token** → `WHATSAPP_TOKEN`
     (it expires after 24 hours; for long-term use create a **System User** token in Meta Business Settings)
3. On the same page, add your own phone number under **To** so the test number is allowed to message you.
4. Open **App settings → Basic** and copy the **App secret** → `APP_SECRET`.

### 4b. Groq
1. Sign in at <https://console.groq.com/keys> → **Create API key**.
2. Copy it → `GROQ_API_KEY`.

### 4c. Make up two secrets yourself
- `VERIFY_TOKEN`: any word or phrase, e.g. `my-tutor-bot-2026`. You'll type the same value into Meta later.
- `ADMIN_TOKEN`: the password for the dashboard. Generate a strong one:
  ```bash
  node -e "console.log(crypto.randomBytes(24).toString('base64url'))"
  ```

---

## 5. Create the `.env` file

Copy the example file:

```powershell
# Windows (PowerShell)
Copy-Item .env.example .env
```
```bash
# macOS / Linux
cp .env.example .env
```

Open `.env` in any text editor (Notepad is fine) and fill in the values from step 4:

```ini
APP_SECRET=paste-meta-app-secret
VERIFY_TOKEN=my-tutor-bot-2026
PHONE_NUMBER_ID=123456789012345
WHATSAPP_TOKEN=EAAG...
GROQ_API_KEY=gsk_...
ADMIN_TOKEN=paste-the-generated-string
```

Save the file. Never share it or upload it anywhere; it is already excluded from Git.

---

## 6. Prepare the database and dashboard

```bash
npm run web:install   # installs the dashboard's packages (first time only)
npm run web:build     # builds the dashboard into web/dist
```

The database (`data/catalyst.db`) is created empty the first time the server starts. The bot only states facts that are in it, so before going live open the dashboard and fill in:

- **Bot settings:** business name, opening hours, location, payment details, delivery information, reply languages, handover number and rules, and FAQs
- **Products:** add them one by one, or download the template, fill it in and upload it as a CSV

---

## 7. Start the bot

```bash
npm start
```

You should see something like:

```
AlchemyX Catalyst dashboard: http://localhost:3000/admin/
```

Leave this window open. Pressing `Ctrl + C` stops the bot.

Open <http://localhost:3000/admin/> in your browser and sign in with your `ADMIN_TOKEN`.

---

## 8. Connect it to WhatsApp

1. Open a **second** terminal window and run:
   ```bash
   ngrok http 3000
   ```
   Copy the `https://....ngrok-free.app` address it shows.
2. In the Meta developer console open **WhatsApp → Configuration → Webhook → Edit**:
   - **Callback URL:** `https://<your-ngrok-address>/webhook`
   - **Verify token:** the same value as `VERIFY_TOKEN` in `.env`
3. Click **Verify and save**. The bot's window prints `Webhook verified`.
4. Under **Webhook fields**, subscribe to **`messages`**.
5. From your phone, send a WhatsApp message (e.g. "hi") to the test number. The bot's window logs it and the bot replies within a few seconds.

> On the free ngrok plan the address can change each time you restart ngrok. When it changes, update the Callback URL in Meta (step 8.2) again.

---

## 9. Everyday use

Each time you turn the PC on:

1. Open a terminal in the project folder and run `npm start`.
2. Open a second terminal and run `ngrok http 3000` (update the Meta Callback URL if the address changed).
3. Open the dashboard at <http://localhost:3000/admin/>.

Useful commands:

| Command | What it does |
| --- | --- |
| `npm start` | Starts the bot and dashboard |
| `npm test` | Runs the automatic checks (no WhatsApp or Groq calls) |
| `npm run admin -- show <number>` | Shows a contact's details |
| `npm run admin -- pause <number>` / `resume <number>` | Stops or restarts the bot for one chat |
| `npm run admin -- lang <number> <en\|si\|ta\|singlish\|tanglish>` | Sets a contact's reply language |
| `npm run web:build` | Rebuilds the dashboard after changes (then restart `npm start`) |

Back up the `data/` folder regularly; it holds the database (`catalyst.db`) and the photos and PDFs people send.

---

## 10. Troubleshooting

| Problem | Fix |
| --- | --- |
| `node: command not found` / `npm is not recognized` | Node.js isn't installed, or the terminal was open before installing. Install it and open a new terminal. |
| Error mentioning `node:sqlite` | Node is too old. Install 22.13 or newer. |
| Server exits saying `VERIFY_TOKEN` is missing | `.env` isn't in the project folder or the value is empty. |
| Meta says "The callback URL or verify token couldn't be validated" | Check that `npm start` and ngrok are both running, the URL ends in `/webhook`, and the verify token matches `.env` exactly. |
| Messages arrive but no reply is sent | `WHATSAPP_TOKEN` expired (temporary tokens last 24 h) or `PHONE_NUMBER_ID` is wrong. Get a new token and restart. |
| Bot replies "having trouble" | `GROQ_API_KEY` is missing/wrong, or the Groq free-tier limit was hit. Wait a minute and try again. |
| Requests rejected with `401` | `APP_SECRET` doesn't match the Meta app. Copy it again from **App settings → Basic**. |
| Dashboard page is blank or 404 | Run `npm run web:build`, then restart `npm start`. |
| Error `EADDRINUSE` (port 3000 already in use) | Another copy is running. Close it, or set `PORT=3001` in `.env` and use `ngrok http 3001`. |

For details on every setting and how the code is organised, see [README.md](README.md).
