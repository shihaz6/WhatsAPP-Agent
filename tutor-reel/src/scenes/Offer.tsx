// 0:38–0:44 — On full orange: FREE 1-week trial. A 10-segment ring ticks up (only the first 10 tutors),
// then the comment box types CATALYST. WhatsApp number underneath.
import { useCurrentFrame } from "remotion";
import { C, DISPLAY, FONT, Slam, Words, clamp01, cues, pop, prog } from "../kit";

const O = cues.offer;
const WORD = "CATALYST";

function Ring({ f }: { f: number }) {
  const R = 170, SW = 30, N = 10;
  const lit = Math.max(0, Math.min(N, Math.floor((f - O.ring) / O.ringStep) + 1));
  const inP = pop(f, O.ring - 6, 13, 200);
  const done = f >= O.ring + O.ringStep * (N - 1);
  const pd = pop(f, O.ring + O.ringStep * (N - 1), 9, 300);
  return (
    <div style={{ position: "absolute", left: 540 - R - SW, top: 740, width: (R + SW) * 2, height: (R + SW) * 2, transform: `scale(${Math.max(0, inP) * (done ? 1 + 0.08 * Math.max(0, 1 - (f - O.ring - O.ringStep * 9) / 10) : 1)})` }}>
      <svg width={(R + SW) * 2} height={(R + SW) * 2} viewBox={`${-R - SW} ${-R - SW} ${(R + SW) * 2} ${(R + SW) * 2}`}>
        {Array.from({ length: N }, (_, i) => {
          const a0 = (i / N) * 2 * Math.PI - Math.PI / 2 + 0.07, a1 = ((i + 1) / N) * 2 * Math.PI - Math.PI / 2 - 0.07;
          const d = `M${R * Math.cos(a0)} ${R * Math.sin(a0)} A${R} ${R} 0 0 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)}`;
          const on = i < lit;
          return <path key={i} d={d} stroke={on ? C.char : "rgba(26,26,26,0.18)"} strokeWidth={SW} fill="none" strokeLinecap="round" />;
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.char }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 150, fontWeight: 900, letterSpacing: -8, lineHeight: 1, transform: `scale(${done ? 0.9 + 0.1 * Math.min(1.2, pd) : 1})` }}>{lit}</div>
        <div style={{ fontFamily: FONT, fontSize: 26, fontWeight: 800, letterSpacing: 5, marginTop: 4 }}>SPOTS</div>
      </div>
    </div>
  );
}

export function Offer() {
  const f = useCurrentFrame();
  const typed = Math.max(0, Math.min(WORD.length, Math.floor((f - O.type) / 3.75) + 1));
  const box = pop(f, O.comment, 13, 200);
  const caret = Math.floor(f / 8) % 2 === 0;
  const finger = Math.abs(Math.sin((f - O.comment) / 6)) * 18;
  const wa = prog(f, O.wa, O.wa + 12);
  const sent = f >= O.type + WORD.length * 3.75 + 10;
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 200, display: "flex", flexDirection: "column", alignItems: "center", color: C.char }}>
        <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 800, letterSpacing: 6, opacity: prog(f, 2, 10) }}>FOR TUTORS · LAUNCH OFFER</div>
        <Slam at={O.free} from={2.6} style={{ fontFamily: DISPLAY, fontSize: 270, fontWeight: 900, letterSpacing: -14, lineHeight: 1, marginTop: 10, color: C.char, textShadow: "0 14px 0 rgba(255,255,255,0.28)" }}>FREE</Slam>
        <Words text="1-week trial" start={O.trial} align="center" hot={C.white} style={{ fontFamily: DISPLAY, fontSize: 84, fontWeight: 800, letterSpacing: -4, lineHeight: 1.1, marginTop: 4 }} />
      </div>

      <Ring f={f} />

      <div style={{ position: "absolute", left: 0, right: 0, top: 1150, textAlign: "center", color: C.char }}>
        <Words text="Only the *first 10* tutors" start={O.only} align="center" hot={C.white} stagger={3} style={{ fontFamily: DISPLAY, fontSize: 58, fontWeight: 800, letterSpacing: -2.5 }} />
      </div>

      {/* comment box */}
      <div style={{ position: "absolute", left: 90, right: 90, top: 1330, opacity: clamp01(box * 2), transform: `translateY(${(1 - Math.min(1, box)) * 80}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, background: C.char, borderRadius: 999, padding: "16px 18px 16px 30px", boxShadow: "0 30px 60px -24px rgba(90,30,0,0.7)" }}>
          <span style={{ fontFamily: FONT, fontSize: 32, fontWeight: 800, color: C.soft }}>Comment</span>
          <span style={{ fontFamily: DISPLAY, fontSize: 46, fontWeight: 900, letterSpacing: 1, color: C.orange, flex: 1 }}>
            “{WORD.slice(0, typed)}{typed < WORD.length || !sent ? <span style={{ opacity: caret ? 1 : 0, color: C.white }}>|</span> : "”"}
          </span>
          <div style={{ width: 76, height: 76, borderRadius: 76, background: sent ? C.orange : "#333", display: "grid", placeItems: "center", transform: `scale(${sent ? 1 + 0.15 * Math.max(0, 1 - (f - (O.type + WORD.length * 3.75 + 10)) / 8) : 1})` }}>
            <svg width="34" height="34" viewBox="0 0 24 24"><path d="M3 11l18-8-8 18-2-8-8-2z" fill={sent ? C.char : C.mute} /></svg>
          </div>
        </div>
        <div style={{ position: "absolute", right: 22, top: -86, fontSize: 66, transform: `translateY(${finger}px)` }}>👇</div>
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, top: 1500, textAlign: "center", fontFamily: FONT, color: C.char, opacity: wa, transform: `translateY(${(1 - wa) * 20}px)` }}>
        <span style={{ fontSize: 32, fontWeight: 700 }}>or WhatsApp </span>
        <span style={{ fontFamily: DISPLAY, fontSize: 38, fontWeight: 800, letterSpacing: -0.5 }}>+94 78 822 5521</span>
      </div>
    </>
  );
}
