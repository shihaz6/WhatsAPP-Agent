# Catalyst — tourism promo (vertical)

A 48-second, 1080×1920 promo, in English (`Tourism`) and Sinhala (`TourismSi`), built with Remotion for hotels, villas, tours and safaris. At 3:12 AM in Ella, guests write in from London, Tokyo and Melbourne. No reply until morning means a lost booking. Catalyst answers from the owner's own rate sheet, in the guest's language, and leaves deposits and anything unusual to the owner.

```
npm install
npm run studio      # preview in the browser (port 3251)
npm run render      # English -> out/tourism.mp4
npm run render:si   # Sinhala -> out/tourism-si.mp4
npm run stills      # preview PNGs -> out/stills
```

- `src/cues.json`: every scene boundary and event frame (120 BPM, 15 frames a beat). The visuals and `scripts/make-soundtrack.mjs` both read it.
- `src/Backdrop.tsx`: the continuous background (dotted globe with message arcs, night sky to dawn, ocean lines, brand light).
- `src/scenes/*`: one file per beat. `src/i18n.tsx` holds the on-screen copy for both versions; guest chats stay in each guest's own language.
- `public/fonts/`: tiny Japanese/Chinese subsets with only the glyphs used. If you change the 中文/日本語 chat lines, re-download them (Google Fonts css2 `text=` parameter) or the new characters fall back to a system font.
- Soundtrack is fully synthesized: ocean waves, crickets, dawn birds, a ticking clock, message whooshes and pings, and a tropical house groove after the turn.

Features shown match what the agent does today: answers from the owner's data, replies in the guest's language (the reel shows German, French, Russian, Chinese, Japanese, Hindi, Sinhala and Tamil; the bot's prompt mirrors the guest's language, but only the five local languages are named in code, so phone-test the others before running the ad), hands off what it can't answer, owner approves payment slips, owner can take over. All names, prices and chats are sample data.
