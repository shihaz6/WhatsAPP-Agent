// 0:38–0:46 — The callback line, then the end card on full orange.
import { useCurrentFrame } from "remotion";
import { C, DISPLAY, FONT, Mark, Words, clamp01, cues, easeIn, pop, prog } from "../kit";

const CL = cues.close;
const CHIPS = ["Price questions", "Appointments", "Sinhala, Tamil & 8 more", "Payment slips", "Hand-off to you"];

export function Close() {
  const f = useCurrentFrame();
  const out = prog(f, CL.hit - 10, CL.hit, easeIn);
  const mark = pop(f, CL.hit, 10, 150);
  const word = prog(f, CL.hit + 6, CL.hit + 24);
  const arc = prog(f, CL.hit + 14, CL.hit + 40);
  const cta = pop(f, CL.cta, 13, 160);
  const shine = prog(f, CL.cta + 20, CL.cta + 50);

  return (
    <>
      {out < 1 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 330, opacity: 1 - out, filter: out ? `blur(${out * 14}px)` : undefined, transform: `scale(${1 + out * 0.2})` }}>
          <Words text="Every patient answered." align="center" start={CL.line} stagger={4} dur={16} style={{ fontFamily: DISPLAY, fontSize: 140, fontWeight: 800, letterSpacing: -5, lineHeight: 1.05, color: C.char }} />
          <Words text="Even mid root canal." align="center" start={CL.line2} stagger={4} dur={16} style={{ fontFamily: DISPLAY, fontSize: 140, fontWeight: 800, letterSpacing: -5, lineHeight: 1.05, color: C.white }} />
        </div>
      )}
      {f >= CL.hit - 1 && (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, top: 120, display: "flex", justifyContent: "center" }}>
            <div style={{ transform: `scale(${mark}) rotate(${(1 - mark) * 50}deg)`, filter: "drop-shadow(0 30px 40px rgba(122,48,10,0.35))" }}>
              <Mark size={150} tile="char" x={C.orange} />
            </div>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 300, textAlign: "center", fontFamily: DISPLAY, color: C.char, opacity: word, transform: `translateY(${(1 - word) * 40}px)` }}>
            <div style={{ fontSize: 132, fontWeight: 800, letterSpacing: -5, lineHeight: 1 }}>AlchemyX <span style={{ color: C.white }}>Catalyst</span></div>
          </div>
          <svg width="760" height="80" viewBox="0 0 760 80" style={{ position: "absolute", left: 580, top: 440, overflow: "visible" }}>
            <path d="M20 14 Q380 100 740 14" fill="none" stroke={C.white} strokeWidth="10" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - arc} />
          </svg>
          <div style={{ position: "absolute", left: 0, right: 0, top: 540, textAlign: "center", fontFamily: FONT, fontSize: 46, fontWeight: 700, color: C.char, letterSpacing: -0.5, opacity: prog(f, CL.hit + 18, CL.hit + 32), transform: `translateY(${(1 - prog(f, CL.hit + 18, CL.hit + 32)) * 18}px)` }}>
            The AI receptionist for dental clinics, on WhatsApp.
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 640, display: "flex", justifyContent: "center", gap: 14 }}>
            {CHIPS.map((c, i) => {
              const p = pop(f, CL.chips + i * 3, 14, 200);
              return <span key={c} style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, color: C.white, background: C.char, padding: "12px 24px", borderRadius: 999, opacity: clamp01(p * 1.5), transform: `translateY(${(1 - p) * 24}px)` }}>{c}</span>;
            })}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 780, display: "flex", justifyContent: "center", alignItems: "center", gap: 26, opacity: clamp01(cta * 1.4), transform: `translateY(${(1 - cta) * 30}px) scale(${0.94 + 0.06 * cta})` }}>
            <div style={{ position: "relative", overflow: "hidden", fontFamily: FONT, fontSize: 36, fontWeight: 800, color: C.white, background: C.char, padding: "24px 44px", borderRadius: 22, boxShadow: "0 24px 50px -18px rgba(70,25,5,0.55)" }}>
              Book a demo for your clinic →
              <div style={{ position: "absolute", top: 0, bottom: 0, width: 120, left: `${-20 + shine * 120}%`, background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.22), transparent)", transform: "skewX(-20deg)" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: FONT, fontSize: 34, fontWeight: 700, color: C.char }}>
              <svg width="40" height="40" viewBox="0 0 24 24"><path d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5z" fill="none" stroke={C.char} strokeWidth="2" /><path d="M8.6 7.8c.3-.6.6-.6.9-.6h.6c.2 0 .5 0 .7.6l.9 2.1c.1.3 0 .5-.1.7l-.6.7c-.1.2-.2.4 0 .6.6 1 1.6 2 2.8 2.6.2.1.4.1.6-.1l.8-.9c.2-.2.4-.2.6-.1l2 1c.3.1.4.3.4.5 0 .9-.6 1.8-1.5 2-1 .3-2.6.1-4.6-1.2-2.4-1.6-3.8-3.8-4-4.6-.4-1.1-.1-2.3.5-3.3z" fill={C.char} /></svg>
              <span>WhatsApp <b style={{ fontWeight: 900, letterSpacing: 1 }}>078 822 5521</b></span>
            </div>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 930, textAlign: "center", fontFamily: FONT, fontSize: 20, fontWeight: 800, letterSpacing: 8, color: "rgba(26,26,26,0.6)", opacity: prog(f, CL.cta + 16, CL.cta + 30) }}>
            ALCHEMYX GLOBAL · WHERE AI MEETS BUSINESS
          </div>
        </>
      )}
    </>
  );
}
