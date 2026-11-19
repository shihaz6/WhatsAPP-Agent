# Catalyst reel for tutors: "Your WhatsApp Never Sleeps"

48-second 9:16 reel (1080×1920) made with Remotion. Charcoal + orange AlchemyX palette, synthesized soundtrack, no stock assets.
Storyboard and timings: `PLAN.md`. Optional voiceover script and timings: `VOICEOVER.md`.

```
npm install
npm run soundtrack   # writes public/soundtrack.wav and public/sfx-only.wav from src/cues.json
npm run studio       # preview on http://localhost:3271
npm run render       # out/reel.mp4
npm run stills       # preview frames into out/stills
```

- `src/cues.json` is the single timeline: scene bars, every on-screen cue and the kick pattern. The visuals and the soundtrack both read it, so they stay in sync if you move things.
- All chats, names and numbers in the phone are sample data; the "Illustrative demo · Sample chats" label stays on screen.
- `out/reel-sfx-only.mp4` keeps the sound design but drops the music, for posting with a trending sound added in Instagram/TikTok.
- Ports 3270/3271 (3000 is the bot's server). Uses the system Edge as the headless browser.
