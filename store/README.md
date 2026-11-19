# Catalyst — department store demo (vertical, silent)

A 60-second, 1080×1920 demo video for department stores, made with Remotion. No sound, no voiceover: every point is told with large on-screen text so it works on mute. All items, prices and chats are sample data, and "SAMPLE DATA" stays on screen the whole time.

```
npm install
npm run studio      # preview in the browser (port 3271)
npm run render      # -> out/store.mp4
npm run stills      # preview PNGs -> out/stills
```

| Time | Scene | File |
|---|---|---|
| 0:00–0:05 | Title: "Catalyst for department stores", SAMPLE DATA | `src/scenes/Title.tsx` |
| 0:05–0:15 | "Shoe eka price eka kiyada?" → Rs. 6,950 from the item list | `src/scenes/Price.tsx` |
| 0:15–0:25 | "Size 42 thiyenawada?" New stock: available. Old stock: staff will confirm | `src/scenes/Size.tsx` |
| 0:25–0:33 | "Rs. 2000 budget, mokakda thiyenne?" → 3 picks under budget | `src/scenes/Budget.tsx` |
| 0:33–0:40 | 11:00 PM clock, Sinhala question, instant reply | `src/scenes/Night.tsx` |
| 0:40–0:48 | Rice cooker (not on the list): no price invented, passed to staff | `src/scenes/Unknown.tsx` |
| 0:48–0:56 | Catalyst dashboard (web/ look, "Items" page): 6,950 → 5,950, same question → new price | `src/scenes/Dash.tsx` |
| 0:56–1:00 | "Your own items, tested on your own phone." WhatsApp 078 822 5521 | `src/scenes/Close.tsx` |

- `src/cues.json` holds every scene boundary and event frame (30 fps).
- `src/kit.tsx` has the shared pieces: chat, bubbles, captions, tags. Brand colours: orange #FF8A4C, charcoal #1A1A1A, white.
- The dashboard scene copies the real dashboard's styling from `web/src/styles.css` (navy, gold, Inter) but is drawn inside the video. Nothing in `web/` is used or changed.
