// 0:15–0:19 — The turn: meet your 24/7 WhatsApp front desk.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, DISPLAY, FONT, Mark, Words, clamp01, cues, pop, prog } from "../kit";
import { useT } from "../i18n";

const T = cues.turn;

export function Turn() {
  const f = useCurrentFrame();
  const { t, si } = useT();
  const flash = 1 - prog(f, 0, 16);
  const logo = pop(f, T.logo, 11, 160);
  const rings = [0, 12, 24].map((d) => prog(f, T.logo + d, T.logo + d + 50));
  const word = prog(f, T.logo + 8, T.logo + 24);

  return (
    <>
      <div style={{ position: "absolute", left: 540, top: 820, transform: "translate(-50%, -50%)" }}>
        {rings.map((r, i) => r > 0 && r < 1 && (
          <div key={i} style={{ position: "absolute", left: "50%", top: "50%", width: 280, height: 280, borderRadius: 80, transform: `translate(-50%, -50%) scale(${1 + r * 2.6}) rotate(${r * 30}deg)`, border: `3px solid rgba(255,138,76,${(1 - r) * 0.8})` }} />
        ))}
        <div style={{ transform: `scale(${logo}) rotate(${(1 - logo) * -40}deg)` }}><Mark size={280} glow={1} /></div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1040, textAlign: "center", fontFamily: DISPLAY, color: C.white, opacity: word, transform: `translateY(${(1 - word) * 30}px)` }}>
        <div style={{ fontSize: 92, fontWeight: 800, letterSpacing: -2 }}>AlchemyX <span style={{ color: C.orange }}>Catalyst</span></div>
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 1190, fontFamily: FONT, color: C.white, textAlign: "center" }}>
        <Words text={t.turn.meet1} start={T.line + 10} stagger={3} style={{ fontSize: 64, fontWeight: 800 }} />
        <Words text={t.turn.meet2} start={T.line + 24} stagger={3} style={{ fontSize: 64, fontWeight: 800 }} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 380, display: "flex", justifyContent: "center", opacity: clamp01(prog(f, T.line + 30, T.line + 44)) }}>
        <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, letterSpacing: si ? 2 : 8, color: C.soft }}>{t.turn.audience}</div>
      </div>
      {flash > 0 && <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, #fff, ${C.orange} 45%, ${C.ember})`, opacity: flash * flash }} />}
    </>
  );
}
