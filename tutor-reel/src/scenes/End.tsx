// 0:44–0:48 — The orange frame collapses into the Catalyst tile, the X draws on, and the end card lands.
import { useCurrentFrame } from "remotion";
import { C, DISPLAY, FONT, H, Mark, W, Words, clamp01, cues, ease, lerp, prog } from "../kit";

const E = cues.end;
const TILE = 230, CX = 540, CY = 700;

export function End() {
  const f = useCurrentFrame();
  const s = prog(f, E.shrink, E.shrink + 18, ease);
  const w = lerp(W * 1.5, TILE, s), h = lerp(H * 1.2, TILE, s);
  const r = lerp(0, TILE * 0.25, s);
  const settle = f >= E.shrink + 18;
  const wa = prog(f, E.wa, E.wa + 12);
  return (
    <>
      {!settle && (
        <div style={{ position: "absolute", left: CX - w / 2, top: CY - h / 2, width: w, height: h, borderRadius: r, background: `linear-gradient(135deg, #FFA36E, #FF7A36)`, boxShadow: `0 0 ${120 * s}px rgba(255,138,76,${0.5 * s})` }} />
      )}
      {settle && (
        <div style={{ position: "absolute", left: CX - TILE / 2, top: CY - TILE / 2 }}>
          <Mark size={TILE} glow={0.6 + 0.4 * Math.exp(-(f - E.shrink - 18) / 10)} draw={prog(f, E.x, E.x + 12)} />
        </div>
      )}
      <div style={{ position: "absolute", left: 0, right: 0, top: CY + TILE / 2 + 60, textAlign: "center", color: C.white }}>
        <Words text="AlchemyX" start={E.name} align="center" style={{ fontFamily: DISPLAY, fontSize: 116, fontWeight: 900, letterSpacing: -5, lineHeight: 1.05 }} />
        <Words text="Where AI Meets *Business*" start={E.tag} stagger={3} align="center" style={{ fontFamily: FONT, fontSize: 48, fontWeight: 700, color: C.soft, marginTop: 18 }} />
        <div style={{ display: "inline-flex", alignItems: "center", gap: 18, marginTop: 56, padding: "22px 40px", borderRadius: 999, background: C.orange, color: C.char, opacity: wa, transform: `translateY(${(1 - wa) * 24}px) scale(${0.94 + 0.06 * wa})` }}>
          <svg width="40" height="40" viewBox="0 0 24 24"><path d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5z" fill={C.char} /></svg>
          <span style={{ fontFamily: DISPLAY, fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>+94 78 822 5521</span>
        </div>
        <div style={{ marginTop: 36, fontFamily: FONT, fontSize: 28, fontWeight: 800, letterSpacing: 5, color: C.mute, opacity: clamp01(prog(f, E.wa + 10, E.wa + 22)) }}>CATALYST · YOUR WHATSAPP NEVER SLEEPS</div>
      </div>
    </>
  );
}
