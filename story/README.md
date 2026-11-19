# Catalyst — small shop story (Sinhala, vertical)

A 65-second, 1080×1920 promo built with Remotion: GA"DAMSARA, his counter, and the phone he can't keep up with.

```
npm install
npm run studio      # preview in the browser (port 3251)
npm run render      # -> out/story.mp4
npm run stills      # preview PNGs -> out/stills
```

- `src/cues.json`: every scene boundary and event frame (120 BPM, 15 frames a beat). The visuals and `scripts/make-soundtrack.mjs` both read it, so retime here and both stay in sync.
- `src/Backdrop.tsx`: the one continuous background. Its warmth follows the story: warm at the shop, cold and grey at the loss, an orange burst at the turn.
- `src/Shop.tsx`: the illustrated shop (day to night).
- `src/scenes/*`: one file per beat of the script.
- The soundtrack is fully synthesized (`npm run soundtrack` writes `public/soundtrack.wav`). There is no voiceover; the narration appears on screen. To add a VO, drop a file in `public/` and add a second `<Audio>` in `src/Story.tsx`.

All names, prices and chats are sample data; the "Illustrative example | Sample data" note stays on screen throughout.
