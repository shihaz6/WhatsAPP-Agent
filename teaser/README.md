# AlchemyX Global: Catalyst launch teaser

A 31-second pre-launch teaser made with [Remotion](https://www.remotion.dev/), in two versions:

| Version | Size | Use for |
|---|---|---|
| `Teaser-Landscape` | 1920×1080 | YouTube, LinkedIn, website, presentations |
| `Teaser-Portrait` | 1080×1920 (9:16) | Instagram/Facebook **Reels** and Stories, TikTok, WhatsApp Status |
| `Teaser-Feed` | 1080×1350 (4:5) | Instagram/Facebook **feed posts** (feed rejects 9:16; it accepts 4:5 to 16:9) |

## Run

```bash
npm install
npm run studio    # preview and tweak in the browser (http://localhost:3221)
npm run render    # writes the landscape, portrait and 4:5 feed videos into out/
npm run render:feed   # just the 4:5 feed version
node scripts/stills.mjs 130,450,760   # quick PNG previews of chosen frames
```

## Story (30 fps)

| Time | Scene |
|---|---|
| 0–5 s | 11:47 PM: parent messages keep piling up. "The messages never stop." |
| 5–9 s | "Fees?" "Class times?" "Trial class?" "Payment slip?" on the beat. "Every. Single. Night." |
| 9–13 s | Flip to white: "What if every message *answered itself?*" |
| 13–22 s | Three glimpses: 5 languages, hand-off to the teacher, payments tracked |
| 22–26.5 s | Catalyst reveal, "COMING SOON" |
| 26.5–31 s | AlchemyX Global, "Where AI Meets Business." |

## Brand and legibility

Colours: orange `#FF8A4C`, charcoal `#1A1A1A`, white `#FFFFFF` (in `src/kit.tsx`).
Text is always charcoal on white or orange, or white/orange on charcoal. Orange text on white or
white text on orange is never used, because that pairing is only about 2.3:1 contrast.
Portrait keeps key text out of the top ~150 px and bottom ~350 px, where Reels/TikTok overlay their UI.

## Changing things

- **Timing:** `src/cues.json` drives both the visuals and the soundtrack, so they stay in sync.
- **Words:** each scene is in `src/scenes/`.
- **Logo:** the X tile is drawn by `Mark` in `src/kit.tsx`. Replace it there to use the official logo.
- **Music:** `scripts/make-soundtrack.mjs` synthesizes it (no samples, no licensing). `npm run render` regenerates it.
