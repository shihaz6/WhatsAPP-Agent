// 0:07–0:12 — The drop. Meet Catalyst.
import { useCurrentFrame } from "remotion";
import { C, DISPLAY, FONT, Mark, Words, clamp01, cues, pop, prog } from "../kit";

const T = cues.turn;

export function Turn() {
  const f = useCurrentFrame();
  const mark = pop(f, T.mark, 10, 160);
  const arc = prog(f, T.line1 + 6, T.line1 + 34);
  const chip = pop(f, T.line2 + 20, 14, 180);
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 170, display: "flex", justifyContent: "center" }}>
        <div style={{ transform: `scale(${mark}) rotate(${(1 - mark) * -40}deg)` }}>
          <Mark size={150} glow={0.6} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 360, color: C.char }}>
        <Words text="Meet *Catalyst.*" light align="center" start={T.line1} stagger={5} dur={16} style={{ fontFamily: DISPLAY, fontSize: 190, fontWeight: 800, letterSpacing: -7, lineHeight: 1 }} />
      </div>
      {/* the smile */}
      <svg width="900" height="120" viewBox="0 0 900 120" style={{ position: "absolute", left: 510, top: 575, overflow: "visible" }}>
        <path d="M20 20 Q450 150 880 20" fill="none" stroke={C.orange} strokeWidth="14" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - arc} />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: 720, color: C.char }}>
        <Words text="Your clinic's AI receptionist, on WhatsApp." align="center" start={T.line2} stagger={3} style={{ fontFamily: FONT, fontSize: 58, fontWeight: 700, letterSpacing: -1 }} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 830, display: "flex", justifyContent: "center", gap: 16, opacity: clamp01(chip * 1.4), transform: `translateY(${(1 - chip) * 20}px)` }}>
        {["Answers", "Books", "Speaks their language", "Hands off to you"].map((t, i) => (
          <span key={t} style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: i === 0 ? C.char : C.ink2, padding: "10px 22px", borderRadius: 999, border: `1.5px solid ${i === 0 ? C.orange : C.rule}`, background: i === 0 ? C.tint : C.white, opacity: prog(f, T.line2 + 20 + i * 4, T.line2 + 30 + i * 4) }}>{t}</span>
        ))}
      </div>
    </>
  );
}
