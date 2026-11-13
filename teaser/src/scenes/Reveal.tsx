import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, DISPLAY, Mark, RiseLetters, RiseLines, TEXT, progress, useOrient } from "../kit";

// The product reveal on charcoal: shockwave rings, the mark, "Catalyst", and "Coming soon".
export function Reveal() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { portrait, pick, width, height } = useOrient();
  const reach = Math.hypot(width, height) * 0.6;
  const pop = spring({ frame: frame - 4, fps, config: { damping: 13, stiffness: 120, mass: 0.8 } });
  const pill = spring({ frame: frame - 64, fps, config: { damping: 12, stiffness: 140, mass: 0.7 } });
  const zoom = interpolate(frame, [0, 135], [1, 1.035]);

  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 45%, rgba(255,138,76,0.22), transparent 52%)", opacity: progress(frame, 0, 30) }} />
      {[0, 9, 18].map((d) => {
        const p = progress(frame, d, d + 50);
        const r = p * reach;
        return (
          <div key={d} style={{
            position: "absolute", left: width / 2 - r, top: height * 0.45 - r, width: r * 2, height: r * 2, borderRadius: "50%",
            border: `${3 - d / 9}px solid ${C.orange}`, opacity: (1 - p) * 0.7,
          }} />
        );
      })}

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `scale(${zoom})` }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ transform: `scale(${pop}) rotate(${(1 - pop) * -14}deg)`, filter: "drop-shadow(0 24px 40px rgba(255,138,76,0.45))" }}>
            <Mark size={pick(150, 170)} draw={progress(frame, 10, 32)} bg={C.orange} fg={C.ink} />
          </div>
          <RiseLetters text="Catalyst" start={16} style={{
            marginTop: pick(30, 40), fontFamily: DISPLAY, fontWeight: 800, fontSize: pick(220, 184), lineHeight: 1, letterSpacing: "-0.05em", color: C.white,
          }} />
          <RiseLines start={42} gap={5}
            lines={portrait ? ["The AI front desk for tutors,", "right inside WhatsApp."] : ["The AI front desk for tutors, right inside WhatsApp."]}
            style={{ marginTop: pick(26, 34), fontFamily: TEXT, fontWeight: 500, fontSize: pick(46, 50), lineHeight: 1.3, color: "#E8E8E8" }} />
          <div style={{ position: "relative", marginTop: pick(56, 72), transform: `scale(${pill})` }}>
            {[80, 105].map((at) => {
              const p = progress(frame, at, at + 24);
              return frame >= at ? (
                <div key={at} style={{ position: "absolute", inset: 0, borderRadius: 999, border: `3px solid ${C.orange}`, transform: `scale(${1 + p * 0.35}, ${1 + p * 0.8})`, opacity: 1 - p }} />
              ) : null;
            })}
            <div style={{
              background: C.orange, color: C.ink, fontFamily: DISPLAY, fontWeight: 700, fontSize: pick(44, 50), letterSpacing: "0.04em",
              padding: pick("20px 52px", "24px 60px"), borderRadius: 999, display: "flex", alignItems: "center", gap: 18,
            }}>
              <span style={{ width: 16, height: 16, borderRadius: 8, background: C.ink, opacity: 0.55 + 0.45 * Math.abs(Math.sin(frame / 8)) }} />
              COMING SOON
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
