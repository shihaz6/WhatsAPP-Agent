// 0:00–0:05. Title: "Catalyst for department stores (sample data)".
import { useCurrentFrame } from "remotion";
import { C, DISPLAY, FONT, Mark, Words, clamp01, cues, pop, prog } from "../kit";

const T = cues.title;

export function Title() {
  const f = useCurrentFrame();
  const mark = pop(f, T.mark, 11, 150);
  const pill = pop(f, T.pill, 14, 170);
  const bar = prog(f, T.line2 + 8, T.line2 + 30);
  return (
    <>
      <div style={{ position: "absolute", left: 0, right: 0, top: 470, display: "flex", justifyContent: "center" }}>
        <div style={{ transform: `scale(${mark}) rotate(${(1 - mark) * -40}deg)` }}><Mark size={220} glow={0.7} /></div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 760, color: C.white }}>
        <Words text="Catalyst" align="center" start={T.line1} stagger={4} dur={16} style={{ fontFamily: DISPLAY, fontSize: 200, fontWeight: 800, letterSpacing: -7, lineHeight: 1 }} />
        <Words text="for *department stores*" align="center" start={T.line2} stagger={4} dur={16} style={{ marginTop: 30, fontFamily: DISPLAY, fontSize: 96, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05 }} />
      </div>
      <div style={{ position: "absolute", left: 340, width: 400, top: 1120, height: 10, borderRadius: 10, background: C.orange, transform: `scaleX(${bar})` }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1200, display: "flex", flexDirection: "column", alignItems: "center", gap: 34, opacity: clamp01(pill * 1.4), transform: `translateY(${(1 - pill) * 30}px)` }}>
        <div style={{ fontFamily: FONT, fontSize: 48, fontWeight: 600, color: C.soft, textAlign: "center", lineHeight: 1.3 }}>Your store's AI assistant<br />on WhatsApp</div>
        <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 800, letterSpacing: 3, color: C.char, background: C.orange, padding: "16px 40px", borderRadius: 999 }}>SAMPLE DATA</div>
      </div>
    </>
  );
}
