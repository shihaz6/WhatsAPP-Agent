# AlchemyX Global: Catalyst teaser 2

A 40-second teaser made with [Remotion](https://www.remotion.dev/). It is deliberately different from teaser 1
(dark, late-night, tutors only): this one is bright, told as a chat, aimed at small and medium businesses in general,
and shows the interface and how the product works.

| Composition | Size | Output | Use for |
|---|---|---|---|
| `Teaser2-Landscape` | 1920×1080 | `out/alchemyx-teaser2-landscape.mp4` | YouTube, LinkedIn, website, presentations |
| `Teaser2-Portrait` | 1080×1920 (9:16) | `out/alchemyx-teaser2-portrait.mp4` | Reels, Stories, TikTok, WhatsApp Status |
| `Teaser2-Feed` | 1080×1350 (4:5) | `out/alchemyx-teaser2-feed-4x5.mp4` | Instagram/Facebook feed posts |

## Run

```bash
npm install
npm run studio    # preview in the browser (http://localhost:3251)
npm run render    # regenerates the soundtrack, then writes all three MP4s into out/
node scripts/stills.mjs 480,690,780 Teaser2-Landscape   # PNG previews of chosen frames
```

Rendering uses the Microsoft Edge that ships with Windows and port 3250, so it works while the bot is running on 3000.

## Story (30 fps, 112.5 BPM: one beat = 16 frames)

| Time | Scene | File |
|---|---|---|
| 0–5.3 s | White. A message box types "Who replies to your customers at 2 AM?", sends it, and Catalyst answers: **"I do."** The orange bubble floods the screen. | `scenes/Ask.tsx` |
| 5.3–9.6 s | Orange. "Every question. Answered." Questions from tutors, shops, realtors, salons, clinics, gyms (in Sinhala, Tamil, Singlish, Tanglish and English) step into the answer band and get ticked, on the beat. | `scenes/Flood.tsx` |
| 9.6–20.3 s | **How it works**: a glowing packet runs along a track and lights 4 stations that open into interface cards: Message in → Understood (language, intent, listing, hot lead) → Replied in 3 s → Booked & paid (viewing, deposit slip verified, owner notified). | `scenes/Flow.tsx` |
| 20.3–26.7 s | The dashboard as an exploded 3D stack (Payments, Bookings, AI chats, Inbox) that drops in on the beat and folds into one screen. | `scenes/Build.tsx` |
| 26.7–30.9 s | "One front desk. Every business." Eight business tiles flip from a customer question to an orange "answered" card. | `scenes/Grid.tsx` |
| 30.9–40 s | Bookend chat: "So when do we get Catalyst?" → "Very soon." Then the lockup: Catalyst, by AlchemyX Global, "Where AI Meets Business.", COMING SOON. | `scenes/Close.tsx` |

`scenes/ChatMoment.tsx` is the shared message box and chat used by the first and last scenes.

## Brand and legibility

Colours: orange `#FF8A4C`, charcoal `#1A1A1A`, white `#FFFFFF` (in `src/kit.tsx`). Text is always charcoal on
white or orange, or white/orange on charcoal. Orange text on white and white text on orange are never used
(about 2.3:1 contrast). Portrait keeps key text out of the top ~150 px and bottom ~350 px, where Reels/TikTok
put their buttons.

## Changing things

- **Timing:** `src/cues.json` drives both the visuals and the soundtrack (scene ranges plus the beats inside each scene).
- **Words:** the two chat lines are in `Ask.tsx` and `Close.tsx`; the questions in `Flood.tsx` (`QS`); the walkthrough in `Flow.tsx`;
  the businesses in `Grid.tsx` (`TILES`); the dashboard screens in `Build.tsx`.
- **Music:** `scripts/make-soundtrack.mjs` synthesizes it (no samples, no licensing): a bright D-major groove with claps, shaker,
  marimba and pluck bass, plus keyboard clicks, send/receive sounds and pops for the interface. `npm run render` regenerates it.
