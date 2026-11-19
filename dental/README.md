# Catalyst — dental clinic demo (landscape)

A 45.6-second, 1920×1080 demo film for dental clinics, built with Remotion in the AlchemyX palette. "You're mid root canal" and the clinic's WhatsApp is piling up. Catalyst answers from the clinic's price list, books the slot, replies in ten languages (locals and dental tourists), and hands an after-hours emergency straight to the doctor.

```
npm install
npm run studio      # preview in the browser (port 3251)
npm run render      # -> out/dental.mp4
npm run stills      # preview PNGs -> out/stills
```

- `PLAN.md`: the storyboard.
- `src/cues.json`: every scene boundary and event frame (100 BPM, 18 frames a beat). The visuals and `scripts/make-soundtrack.mjs` both read it.
- `src/Backdrop.tsx`: the grounds (charcoal → white → charcoal → orange) and the orange "smile arc" wipe.
- `src/scenes/*`: one file per scene.
- Soundtrack is fully synthesized (piano-led, A major): drill sting, notification pops, drop, groove, night half-time, end-card hit.
- Chinese, Arabic, Russian and Hindi text uses fonts that ship with Windows (Microsoft YaHei, Segoe UI, Nirmala UI), so render on Windows or add those fonts.

All names, prices, the clinic and the chats are sample data; "Illustrative demo | Sample data" stays on screen.
