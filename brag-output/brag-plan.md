# Brag plan: Catalyst (AlchemyX WhatsApp tutor agent)

## Rubric
- **What is it?** An AI assistant that answers a tutor's WhatsApp, plus a dashboard (Catalyst) where the tutor watches every chat, approves payment slips and takes over when they want.
- **Who for / what it does for them?** Sri Lankan tutors and institutes. Parents get answers about classes, fees and trials at any hour; the tutor stops living on their phone.
- **What sets it apart?** It replies in the parent's own language *and script*: English, Sinhala, Tamil, Singlish, Tanglish. It never says a fee is paid; the teacher approves slips. One click hands a chat to the teacher.
- **Most impressive claim:** a Singlish question at 11:42 PM gets a correct Singlish answer from the real timetable.
- **Visual hook:** the real Catalyst chat screen, a Singlish message arriving late at night.
- **Real UI shown:** Conversations thread (AI badge, tool note "Looked up the schedule", Take over), conversation list with language chips, Payments slip row with Approve.
- **Tone:** `app-store`, warm and clean. The product's own look: navy, Alchemy gold, teal for the AI, Inter.
- **Share caption:** "11:42 PM, a parent asks in Singlish. Catalyst answers from the real timetable, in Singlish, while the tutor sleeps."

## Shape (30 fps, 112.5 BPM: one beat = 16 frames; every cut on a beat) — 640 frames = 21.3 s

| # | Frames | Time | Scene | On screen | Caption (left) |
|---|---|---|---|---|---|
| 1 | 0–112 | 0–3.7 s | Hook | Real thread, parent's Singlish bubble lands (23:42), typing dots | **11:42 PM.** The tutor's asleep. |
| 2 | 112–224 | 3.7–7.5 s | Reveal | AI reply in Singlish, "AI 23:42 ✓", tool note "Looked up the schedule" | **Catalyst isn't.** Answers from your timetable, in Singlish. |
| 3 | 224–336 | 7.5–11.2 s | Languages | Real conversation list: five chats pop in, one per language | **Five languages.** It replies in theirs. |
| 4 | 336–448 | 11.2–14.9 s | Slips | Payments: a slip row, cursor clicks Approve, "Approved" | **Payment slips?** You check. You approve. |
| 5 | 448–528 | 14.9–17.6 s | Take over | Thread header, cursor clicks Take over, "Bot paused" banner | **Want to step in?** One click. |
| 6 | 528–640 | 17.6–21.3 s | Outro | Logo, Catalyst by AlchemyX, WHERE AI MEETS BUSINESS | Your AI front desk, right inside WhatsApp. |

Transitions: old content slides out, then new content rises in over the navy background (no muddy crossfades).

## Data
All names, numbers and messages are fictional stand-ins. Nothing is read from `data/` (the real database and slips).

## Sound
Synthesized (no samples), D major, 112.5 BPM: soft pad + key clicks for the hook, the drop on "Catalyst isn't.", groove under the middle, a pop per chat, click + chime on Approve and Take over, final hit and marimba tag on the logo.

## Build
Remotion in `work/`, importing the dashboard's real stylesheet (`web/src/styles.css`) and its `Glyph`/`Logo` components; screens mirror the real markup and class names.
