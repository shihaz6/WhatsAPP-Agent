// 0:56–1:00. End card: "Your own items, tested on your own phone. WhatsApp 078 822 5521".
import { useCurrentFrame } from "remotion";
import { C, DISPLAY, FONT, Mark, Words, clamp01, cues, pop } from "../kit";

const E = cues.close;

export function Close() {
  const f = useCurrentFrame();
  const mark = pop(f, E.line, 12, 150);
  const cta = pop(f, E.cta, 13, 160);
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 380, display: "flex", justifyContent: "center", transform: `scale(${mark})` }}>
        <div style={{ borderRadius: 40, boxShadow: "0 30px 60px -20px rgba(26,26,26,0.45)" }}><Mark size={170} /></div>
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 640, color: C.char }}>
        <Words text="Your own items," align="center" start={E.line + 4} stagger={3} style={{ fontFamily: DISPLAY, fontSize: 112, fontWeight: 800, letterSpacing: -4, lineHeight: 1.04 }} />
        <Words text="tested on *your own phone.*" hot={C.white} align="center" start={E.line + 12} stagger={3} style={{ fontFamily: DISPLAY, fontSize: 112, fontWeight: 800, letterSpacing: -4, lineHeight: 1.04, marginTop: 6 }} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1130, display: "flex", flexDirection: "column", alignItems: "center", gap: 26, opacity: clamp01(cta * 1.4), transform: `translateY(${(1 - cta) * 40}px) scale(${0.9 + 0.1 * cta})` }}>
        <div style={{ fontFamily: FONT, fontSize: 44, fontWeight: 800, color: C.char, letterSpacing: 1 }}>Message us on WhatsApp</div>
        <div style={{ display: "flex", alignItems: "center", gap: 26, padding: "30px 54px", borderRadius: 999, background: C.char, boxShadow: "0 30px 60px -24px rgba(26,26,26,0.6)" }}>
          <svg width="70" height="70" viewBox="0 0 24 24"><path d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5z" fill={C.orange} /><path d="M8.6 7.6c.3-.6.6-.6.9-.6h.6c.2 0 .4 0 .6.5l.8 1.9c.1.3 0 .5-.1.7l-.6.7c-.2.2-.2.4 0 .7a7 7 0 0 0 3.2 2.8c.3.1.5.1.7-.1l.8-1c.2-.3.4-.3.7-.2l1.9.9c.3.2.5.2.5.4 0 .7-.3 1.6-1 2-.8.5-1.8.7-3.4.1a10.4 10.4 0 0 1-5.4-5.1c-.6-1.2-.7-2.5.3-3.7z" fill={C.char} /></svg>
          <span style={{ fontFamily: DISPLAY, fontSize: 100, fontWeight: 800, color: C.white, letterSpacing: -1, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>078 822 5521</span>
        </div>
        <div style={{ fontFamily: FONT, fontSize: 38, fontWeight: 700, color: "rgba(26,26,26,0.78)", marginTop: 8 }}>Catalyst for department stores</div>
      </div>
    </>
  );
}
