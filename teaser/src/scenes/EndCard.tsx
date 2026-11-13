import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, DISPLAY, Mark, RiseLetters, RiseLines, progress, useOrient } from "../kit";

// Company sign-off: orange floods in from the centre; charcoal wordmark and slogan on orange.
export function EndCard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { portrait, pick } = useOrient();
  const flood = progress(frame, 0, 20, Easing.bezier(0.7, 0, 0.3, 1));
  const pop = spring({ frame: frame - 10, fps, config: { damping: 14, stiffness: 120, mass: 0.8 } });
  const rule = progress(frame, 44, 62);
  const zoom = interpolate(frame, [0, 135], [1, 1.03]);

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <AbsoluteFill style={{ background: C.orange, clipPath: `circle(${flood * 80}% at 50% 50%)` }}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `scale(${zoom})` }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: C.ink }}>
            <div style={{ transform: `scale(${pop})` }}>
              <Mark size={pick(130, 150)} draw={progress(frame, 14, 34)} bg={C.ink} fg={C.orange} />
            </div>
            <RiseLetters text="AlchemyX" start={16} style={{
              marginTop: pick(30, 40), fontFamily: DISPLAY, fontWeight: 800, fontSize: pick(180, 164), lineHeight: 1, letterSpacing: "-0.05em",
            }} />
            <RiseLines start={30} lines={["GLOBAL"]} style={{
              marginTop: pick(12, 16), fontFamily: DISPLAY, fontWeight: 600, fontSize: pick(48, 54), letterSpacing: "0.6em", paddingLeft: "0.6em",
            }} />
            <div style={{ width: 120, height: 6, borderRadius: 3, background: C.ink, margin: pick("44px 0", "56px 0"), transform: `scaleX(${rule})` }} />
            <RiseLines start={50} gap={6} lines={portrait ? ["Where AI", "Meets Business."] : ["Where AI Meets Business."]}
              style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: pick(66, 80), lineHeight: 1.12, letterSpacing: "-0.025em" }} />
          </div>
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
