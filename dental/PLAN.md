# Catalyst for dental clinics — demo film (plan)

**Angle:** "You're mid root canal." The dentist can't touch the phone, and every unanswered WhatsApp is a patient booking somewhere else. Catalyst answers from the clinic's own price list, books the slot, speaks the patient's language, and hands real pain straight to the doctor.

**Different from the tourism and story promos on purpose:** landscape 16:9 (they were vertical); a real *demo* layout (patient chat + the clinic's dashboard reacting live), each act on its own palette ground (charcoal → white → charcoal night → full orange end card), a recurring orange "smile arc" wipe, Bricolage Grotesque + Plus Jakarta Sans (not Inter/Sora), and a piano-led 100 BPM track in A major (not tropical house).

**Format:** 1920×1080, 30 fps, 100 BPM → 1 beat = 18 frames, 1 bar = 72 frames. 1368 frames = 45.6 s. Every scene boundary on a bar.

| # | Frames | Scene | Ground | On screen | Transition out |
|---|---|---|---|---|---|
| 1 | 0–216 | Hook + cost | Charcoal | "You're mid root canal." Phone: 7 patient messages pile up, 14 unread. Then "Every unanswered chat is a lost patient." and messages get stamped "Booked elsewhere". | Smile-arc wipe to white (drop) |
| 2 | 216–360 | Reveal | White | Mark + "Meet Catalyst." "Your clinic's AI receptionist, on WhatsApp." | Zoom-through |
| 3 | 360–720 | Demo: answer + book | White | Phone (1:15 PM, dentist "with a patient") + dashboard (price list, Saturday diary). Patient asks scaling price + Saturday; Catalyst answers LKR 4,500 and offers 10:30/4:00; "10:30 please"; booked; slot fills orange in the diary. | Horizontal push |
| 4 | 720–936 | Languages | White | A 5×2 wall: English, සිංහල, தமிழ், Singlish, Tanglish + dental tourists in Deutsch, Русский, 中文, العربية (RTL), हिन्दी. Each question → reply in the same language and script; a counter climbs to 10. | Smile-arc wipe to charcoal |
| 5 | 936–1152 | Knows its limits | Charcoal (11:40 PM) | Swelling after an extraction. Catalyst gives no medical advice, alerts the doctor. Dashboard: URGENT → cursor clicks Take over → bot paused, Dr. Fernando replies. | Smile-arc wipe to orange |
| 6 | 1152–1368 | Close | Orange | "Every patient answered. Even mid root canal." → hit → AlchemyX Catalyst, "The AI receptionist for dental clinics", feature chips, "Book a demo for your clinic · WhatsApp 078 822 5521". | — |

**Data:** all patients, the doctor, the clinic and prices are fictional sample data ("Illustrative demo · Sample data" stays on screen). Nothing is read from `data/` or the database.

**Sound (synthesized, `scripts/make-soundtrack.mjs`):** short dental-drill sting + tense F#m pulse and tuned notification pops under the hook; riser into the drop; piano chords IV–V–iii–vi (Dmaj9–E6–C#m7–F#m7) with a sub bass, kick, clap and swung shaker through the demo; bright arp in the languages; half-time, filtered night groove with a soft alert tone and click for the hand-off; snare build into the end-card hit and a ringing piano chord.
