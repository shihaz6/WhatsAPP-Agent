# Catalyst promo video

A 35-second promo for Catalyst, made with [Remotion](https://www.remotion.dev/), in two versions:

| Composition | Size | Output | Use for |
|---|---|---|---|
| `Promo-Landscape` | 1920×1080, 30fps | `out/catalyst-promo-landscape.mp4` | Fiverr gallery, YouTube, LinkedIn |
| `Promo-Portrait` | 1080×1920, 30fps | `out/catalyst-promo-vertical.mp4` | Reels, TikTok, WhatsApp Status |

## Run

```bash
npm install
npm run studio     # preview and tweak in the browser (http://localhost:3231)
npm run render     # regenerates the soundtrack, then writes both MP4s into out/
npm run stills     # PNG previews of key frames into out/stills
powershell -ExecutionPolicy Bypass -File scripts\sheet.ps1   # contact sheet of those stills
```

Rendering uses the Microsoft Edge that ships with Windows (see `remotion.config.ts`).

## Story

| Time | Scene | File |
|---|---|---|
| 0–3.7s | 11:47 PM, WhatsApp messages in 5 languages pile up. "The messages never stop." | `scenes/Night.tsx` |
| 3.7–8.7s | "Fees? Bookings? Payment slips?" on the beat, then "Every. Single. Night." | `scenes/Pain.tsx` |
| 8.7–12.4s | Hard cut: "What if every message answered itself?" | `scenes/Turn.tsx` |
| 12.4–15s | Logo reveal. "An AI front desk for your WhatsApp." | `scenes/Reveal.tsx` |
| 15–30s | Inbox, Payments, Analytics, Channels screenshots + AI/You hand-over, 3s each | `scenes/Features.tsx` |
| 30–35s | Lockup + "Where AI Meets Business.", then "Message us for a live demo" + contact | `scenes/Cta.tsx` |

## Changing things

- **Contact line:** Fiverr doesn't allow phone numbers or social handles in gig gallery media, so the default is
  `Contact me on Fiverr`. For a social version, render with your handle:
  ```bash
  npx remotion render Promo-Portrait out/catalyst-promo-vertical-social.mp4 --props="{\"contact\":\"@yourhandle\"}"
  ```
- **Music:** `scripts/make-soundtrack.mjs` synthesizes `public/soundtrack.wav` (no samples, no licensing) with hits
  on the cue frames. To use your own track, drop it in as `public/soundtrack.wav` and run the two `render:*` scripts
  directly (`npm run render` would regenerate the synth track). For a silent cut add `--props="{\"music\":false}"`.
- **Timing:** `src/cues.json` drives both the visuals and the soundtrack, so they stay in sync.
- **Screenshots:** `public/screens/` (copied from `posts/png`). Re-export there and re-render.
- **Captions and crops:** in `src/Promo.tsx`: `focus` is the zoom point for landscape, `vFocus` the crop centre for vertical.

## Legibility rules (enforced in `src/kit.tsx`)

- Inter 700/800 only; headlines 100–150px, supporting lines ≥ 52px.
- Text is white or orange on the dark background. Text over screenshots sits on an 86% dark scrim.
- Headline shadow `0 2px 12px rgba(0,0,0,.6)`; every text block springs in and fades out (no half-rendered cuts).
- All text inside a 10% safe margin; at most two lines on screen at a time.
- In the vertical cut the "What if every message answered itself?" line plays as two two-line beats, because it
  can't fit in two lines at headline size on a 1080-wide frame.
