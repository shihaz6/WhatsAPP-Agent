import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Appear, Backdrop, C, FONT, Mark, O, RiseLetters, SCENES, SHADOW, cues, headline, progress, useOrient, useSpring } from "../kit";

// 30-35s: logo lockup + tagline, then the call to action. The last frame holds (no fade-out).
export function Cta({ contact }: { contact: string }) {
  const frame = useCurrentFrame();
  const { portrait, safeX, pick } = useOrient();
  const swap = cues.ctaSwap - SCENES.cta[0];
  const s = useSpring(0, { damping: 12, stiffness: 140 });
  const lockOut = progress(frame, swap - 10, swap);
  const move = progress(frame, swap - 6, swap + 14);
  const flood = progress(frame, 0, 20);

  const markSize = interpolate(move, [0, 1], [pick(150, 180), pick(130, 150)]);
  const markY = interpolate(move, [0, 1], [0, pick(-250, -330)]);

  return (
    <AbsoluteFill>
      <Backdrop glow={0.16 + flood * 0.22} at="50% 50%" />
      {/* Warm orange flood from the bottom edge (no text sits on it). */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 90% 45% at 50% 115%, rgba(255,107,26,${0.55 * flood}), transparent 70%)` }} />

      <AbsoluteFill style={{ left: safeX, right: safeX, width: "auto", alignItems: "center", justifyContent: "center" }}>
        {/* Phase 1: lockup + tagline */}
        <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center", opacity: 1 - lockOut }}>
          <div style={{ display: "flex", flexDirection: portrait ? "column" : "row", alignItems: "center", gap: pick(40, 32) }}>
            <div style={{ transform: `scale(${s})` }}><Mark size={pick(150, 180)} /></div>
            <RiseLetters text="Catalyst" start={4} style={{ fontFamily: FONT, fontWeight: 800, fontSize: pick(150, 140), letterSpacing: "-0.04em", color: C.white, textShadow: SHADOW, lineHeight: 1 }} />
          </div>
          <Appear start={14} style={{ marginTop: pick(44, 52), textAlign: "center" }}>
            <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: pick(72, 64), color: C.orange, textShadow: SHADOW, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
              Where AI Meets {portrait && <br />}Business.
            </div>
          </Appear>
        </div>

        {/* Phase 2: mark moves up, CTA lands */}
        {frame >= swap - 6 && (
          <>
            <div style={{ position: "absolute", transform: `translateY(${markY}px)` }}><Mark size={markSize} /></div>
            <div style={{ position: "absolute", textAlign: "center", marginTop: pick(110, 120) }}>
              <Appear start={swap + 2}>
                <h1 style={headline(pick(110, 104))}>Message us for {portrait && <br />}a live demo</h1>
              </Appear>
              <Appear start={swap + 12} style={{ marginTop: pick(36, 44) }}>
                <div style={{
                  display: "inline-block", fontFamily: FONT, fontWeight: 800, fontSize: pick(60, 52), color: C.white, textShadow: SHADOW,
                  background: C.scrim, border: `3px solid ${C.orange}`, borderRadius: 999, padding: pick("16px 48px", "14px 30px"),
                }}><O>→</O> {contact}</div>
              </Appear>
            </div>
          </>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
