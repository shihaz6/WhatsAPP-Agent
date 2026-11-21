# Catalyst promo reel (30s, 1080x1920, 30fps)

Remotion project that cuts the six Google Flow clips (`../1.mp4` ... `../6.mp4`) into the Catalyst reel.

```bash
npm install
npm run prep        # mute + 60fps motion-interpolate the clips -> public/clips (≈15 min, once)
ffmpeg -ss 1.0 -i ../2.mp4 -frames:v 1 public/cover-bg.png   # cover background frame
npm run audio       # synthesize the soundtrack -> public/audio/soundtrack.wav (-14 LUFS)
npm run render      # out/catalyst-reel.mp4
npm run render:si   # out/catalyst-reel-sinhala.mp4 (Sinhala captions + end card)
npm run cover       # out/catalyst-cover.png
npm run vo          # English voiceover cuts (after `render`), from public/audio/voiceover-en.wav:
                    #   out/catalyst-reel-en-vo-sfx.mp4    voiceover + music + SFX
                    #   out/catalyst-reel-en-vo-nosfx.mp4  voiceover + music
```

`npm run vo` keeps the picture of `out/catalyst-reel.mp4` and only replaces the audio. The VO is cut at its
own pauses and placed on the picture's beats (`voiceover.clips` in `src/timeline.json`, no time-stretch);
music and SFX duck under it. Stems are written to `public/audio/vo/`. The voiceover file is the generated
TTS take (`../Generated Audio November 21, 2026 - 1_11PM.wav`) copied to `public/audio/voiceover-en.wav`.

QA:

```bash
node scripts/qa-stills.mjs CatalystReel out/qa     # stills: every section + middle of every transition
node scripts/qa-check.mjs CatalystReel             # every frame: safe area, cut-off, overlaps, copy rules
```

- Timing lives in `src/timeline.json` (shared by the scenes and the audio script).
- Copy (English + Sinhala) is in `src/copy.ts`.
- Emoji are Noto (Apache-2.0) SVGs from `@iconify-json/noto`, drawn inline (`scripts/extract-emoji.mjs`).
- All music and SFX are synthesized (`scripts/synth.mjs`, placed by `make-audio.mjs` / `make-vo-mix.mjs`); no samples or third-party music.
