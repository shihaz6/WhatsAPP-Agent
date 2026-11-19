// 0:16–0:26 — The money shot. 2:07 AM, a parent asks in Singlish; Catalyst answers in Singlish in under 3 seconds,
// then sends last week's recording. "Even at 2 AM." while the tutor sleeps.
import type React from "react";
import { useCurrentFrame } from "remotion";
import { Avatar, Bolt, Bubble, C, ChatChip, DISPLAY, FONT, Phone, Typing, Words, clamp01, cues, pop, prog } from "../kit";

const D = cues.demo;

/** Reply stopwatch. Counts while Catalyst types, then turns orange: "2.8s REPLIED". Sits in the chat flow. */
function Timer({ f, start, stop, final }: { f: number; start: number; stop: number; final: number }) {
  if (f < start) return null;
  const running = f < stop;
  const secs = running ? ((f - start) / (stop - start)) * final : final;
  const p = pop(f, start, 14, 220);
  const done = pop(f, stop, 9, 320);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "10px 22px 10px 16px", borderRadius: 999, flexShrink: 0,
      background: running ? "rgba(40,40,40,0.95)" : C.orange, color: running ? C.white : C.char, border: running ? "2px solid rgba(255,138,76,0.6)" : "2px solid transparent",
      fontFamily: DISPLAY, fontWeight: 800, fontSize: 32, letterSpacing: -1,
      boxShadow: running ? "none" : "0 18px 44px -14px rgba(255,138,76,0.85)",
      opacity: clamp01(p * 2), transform: `scale(${0.8 + 0.2 * Math.min(1, p) + (running ? 0 : 0.14 * Math.max(0, 1 - (f - stop) / 8))}) rotate(${running ? 0 : (1 - Math.min(1, done)) * -6}deg)`,
      transformOrigin: "right center",
    }}>
      <Bolt size={24} color={running ? C.orange : C.char} />
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{secs.toFixed(1)}s</span>
      {!running && <span style={{ fontFamily: FONT, fontSize: 19, fontWeight: 800, letterSpacing: 1.5 }}>REPLIED</span>}
    </div>
  );
}
const Row = ({ children, mt = 0 }: { children: React.ReactNode; mt?: number }) => (
  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14, marginTop: mt }}>{children}</div>
);

export function Demo() {
  const f = useCurrentFrame();
  const phone = pop(f, 0, 15, 120);
  const night = prog(f, D.night - 8, D.night);
  const asleep = pop(f, D.asleep, 13, 200);
  return (
    <>
      {/* caption: swaps from speed to "even at 2 AM" */}
      <div style={{ position: "absolute", left: 80, right: 80, top: 190, height: 300, color: C.white }}>
        <div style={{ position: "absolute", inset: 0, opacity: 1 - night }}>
          <Words text="Replies in" start={D.cap} out={D.night - 10} style={{ fontFamily: DISPLAY, fontSize: 92, fontWeight: 800, letterSpacing: -4, lineHeight: 1.08 }} />
          <Words text="*3 seconds.*" start={D.cap + 6} out={D.night - 9} style={{ fontFamily: DISPLAY, fontSize: 112, fontWeight: 900, letterSpacing: -5, lineHeight: 1.08 }} />
        </div>
        <div style={{ position: "absolute", inset: 0 }}>
          <Words text="Even at" start={D.night} style={{ fontFamily: DISPLAY, fontSize: 92, fontWeight: 800, letterSpacing: -4, lineHeight: 1.08 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Words text="*2 AM.*" start={D.night + 6} style={{ fontFamily: DISPLAY, fontSize: 132, fontWeight: 900, letterSpacing: -6, lineHeight: 1.08 }} />
            {/* the moon */}
            <svg width="96" height="96" viewBox="0 0 24 24" style={{ opacity: prog(f, D.night + 10, D.night + 20), transform: `rotate(${(1 - prog(f, D.night + 10, D.night + 30)) * -60}deg)`, filter: "drop-shadow(0 0 24px rgba(255,138,76,0.7))" }}>
              <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill={C.orange} />
            </svg>
          </div>
        </div>
      </div>

      {/* "you're asleep" chip, top right of the phone */}
      <div style={{ position: "absolute", right: 70, top: 470, zIndex: 6, opacity: clamp01(asleep * 2), transform: `scale(${0.7 + 0.3 * Math.min(1.1, asleep)})`, transformOrigin: "right center" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center", padding: "14px 26px", borderRadius: 999, background: "rgba(36,36,36,0.95)", border: "2px solid rgba(255,255,255,0.1)", fontFamily: FONT, fontSize: 31, fontWeight: 800, color: C.white, boxShadow: "0 24px 60px -20px rgba(0,0,0,0.9)" }}>
          <span>Sir 😴 asleep</span><span style={{ color: C.mute }}>·</span><span style={{ color: C.orange }}>Catalyst ⚡ on it</span>
        </div>
      </div>

      <div style={{ position: "absolute", left: 130, top: 560, transform: `translateY(${(1 - phone) * 700}px) scale(${0.92 + 0.08 * phone})`, transformOrigin: "50% 0%" }}>
        <Phone title="Nimali · Sanuli's Amma" subtitle="online" avatar={<Avatar label="N" size={72} bg="#4A4A4A" />} clock="2:07" glow={0.4 + 0.4 * night}>
          <ChatChip>TODAY</ChatChip>
          <Bubble side="them" time="2:07 AM" p={pop(f, D.ask, 14, 220)}>Sir grade 10 maths class eka kawadda?</Bubble>
          {f >= D.type && f < D.reply && <Row><Timer f={f} start={D.type} stop={D.reply} final={2.8} /><Typing frame={f} p={pop(f, D.type, 14, 220)} /></Row>}
          {f >= D.reply && (
            <Bubble side="me" time="2:07 AM" ai p={pop(f, D.reply, 13, 220)}>
              Grade 10 Maths class eka <b>Saturday 8.00 AM</b> ta thiyenawa 📍 Nugegoda hall. Zoom link ekath thiyenawa!
            </Bubble>
          )}
          {f >= D.reply && <Row mt={-8}><Timer f={f} start={D.type} stop={D.reply} final={2.8} /></Row>}
          {f >= D.ask2 && <Bubble side="them" time="2:08 AM" p={pop(f, D.ask2, 14, 220)}>Recording link?</Bubble>}
          {f >= D.type2 && f < D.reply2 && <Row><Timer f={f} start={D.type2} stop={D.reply2} final={2.1} /><Typing frame={f} p={pop(f, D.type2, 14, 220)} /></Row>}
          {f >= D.reply2 && (
            <Bubble side="me" time="2:08 AM" ai p={pop(f, D.reply2, 13, 220)}>
              <div style={{ marginBottom: 12 }}>Here you go 🎥</div>
              <div style={{ display: "flex", gap: 16, alignItems: "center", background: "rgba(26,26,26,0.14)", borderRadius: 18, padding: 12 }}>
                <div style={{ width: 120, height: 84, borderRadius: 12, background: "linear-gradient(140deg, #2b2b2b, #111)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <svg width="34" height="34" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill={C.orange} /><path d="M10 8l6 4-6 4z" fill={C.char} /></svg>
                </div>
                <div style={{ lineHeight: 1.25 }}>
                  <div style={{ fontWeight: 800, fontSize: 28 }}>Grade 10 Maths · 14 Nov</div>
                  <div style={{ fontSize: 23, opacity: 0.7, fontWeight: 700 }}>Class recording · 1h 52m</div>
                </div>
              </div>
            </Bubble>
          )}
          {f >= D.reply2 && <Row mt={-8}><Timer f={f} start={D.type2} stop={D.reply2} final={2.1} /></Row>}
        </Phone>
      </div>
    </>
  );
}
