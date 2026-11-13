import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Appear, Backdrop, C, FONT, Mark, O, RiseLetters, SCENES, SHADOW, progress, useOrient, useSpring } from "../kit";

// 12.4-15s: the Catalyst logo lands, then "An AI front desk for your WhatsApp."
export function Reveal() {
  const frame = useCurrentFrame();
  const { portrait, safeX, pick } = useOrient();
  const end = SCENES.reveal[1] - SCENES.reveal[0];
  const s = useSpring(0, { damping: 11, stiffness: 150, mass: 0.8 });
  const ring = progress(frame, 0, 26);
  const out = progress(frame, end - 8, end);
  const markSize = pick(170, 200);

  return (
    <AbsoluteFill>
      <Backdrop glow={0.22 + (1 - ring) * 0.2} />
      <AbsoluteFill style={{ left: safeX, right: safeX, width: "auto", alignItems: "center", justifyContent: "center", opacity: 1 - out }}>
        <div style={{ display: "flex", flexDirection: portrait ? "column" : "row", alignItems: "center", gap: pick(44, 36), position: "relative" }}>
          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute", left: "50%", top: "50%", width: markSize, height: markSize, borderRadius: "50%",
              border: `6px solid ${C.orange}`, transform: `translate(-50%,-50%) scale(${1 + ring * 1.6})`, opacity: (1 - ring) * 0.8,
            }} />
            <div style={{ transform: `scale(${s}) rotate(${(1 - s) * -25}deg)` }}><Mark size={markSize} /></div>
          </div>
          <RiseLetters text="Catalyst" start={6} style={{ fontFamily: FONT, fontWeight: 800, fontSize: pick(170, 150), letterSpacing: "-0.04em", color: C.white, textShadow: SHADOW, lineHeight: 1 }} />
        </div>
        <Appear start={16} style={{ marginTop: pick(48, 56), textAlign: "center" }}>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: pick(60, 58), lineHeight: 1.2, color: C.white, textShadow: SHADOW, letterSpacing: "-0.015em" }}>
            An AI front desk {portrait && <br />}for your <O>WhatsApp.</O>
          </div>
        </Appear>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
