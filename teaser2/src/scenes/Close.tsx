import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, DISPLAY, Mark, RiseLetters, RiseLines, TEXT, cues, progress, useOrient } from "../kit";
import { ChatMoment } from "./ChatMoment";

// Bookend: the composer again. "So when do we get Catalyst?" -> "Very soon."
// The chat drops away and the lockup builds on white: mark, Catalyst, by AlchemyX Global, slogan, Coming soon.
export function Close() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { portrait, pick3 } = useOrient();
  const K = cues.close;
  const out = progress(frame, K.hit - 4, K.hit + 12, Easing.in(Easing.cubic));
  const l = frame - K.hit;
  const pop = spring({ frame: l - 4, fps, config: { damping: 12, stiffness: 130, mass: 0.8 } });
  const chip = spring({ frame: l - 64, fps, config: { damping: 11, stiffness: 150, mass: 0.7 } });
  const rule = progress(frame, K.hit + 40, K.hit + 56);
  const zoom = interpolate(frame, [K.hit, 272], [1, 1.04], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeIn = progress(frame, 0, 10);

  return (
    <AbsoluteFill style={{ background: C.white, overflow: "hidden", opacity: fadeIn }}>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 100%, rgba(255,138,76,0.10), transparent 60%)" }} />
      {frame < K.hit + 14 && <ChatMoment question="So when do we get Catalyst?" reply="Very soon." t={K} out={out} />}

      {frame >= K.hit && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `scale(${zoom})` }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: C.ink }}>
            <div style={{ transform: `scale(${pop}) rotate(${(1 - pop) * -20}deg)`, filter: "drop-shadow(0 24px 40px rgba(255,138,76,0.45))" }}>
              <Mark size={pick3(150, 170, 140)} draw={progress(frame, K.hit + 8, K.hit + 28)} bg={C.orange} fg={C.ink} />
            </div>
            <RiseLetters text="Catalyst" start={K.hit + 10} style={{
              marginTop: pick3(26, 36, 24), fontFamily: DISPLAY, fontWeight: 800, fontSize: pick3(210, 190, 170), lineHeight: 1, letterSpacing: "-0.05em",
            }} />
            <RiseLines start={K.hit + 24} lines={[<span>by <b style={{ fontWeight: 800 }}>AlchemyX Global</b></span>]}
              style={{ marginTop: pick3(14, 20, 14), fontFamily: DISPLAY, fontWeight: 500, fontSize: pick3(44, 50, 42), letterSpacing: "-0.01em", color: C.ink }} />
            <div style={{ width: 120, height: 6, borderRadius: 3, background: C.orange, margin: pick3("40px 0 36px", "52px 0 44px", "34px 0 30px"), transform: `scaleX(${rule})` }} />
            <RiseLines start={K.hit + 50} gap={6} lines={portrait ? ["Where AI", "Meets Business."] : ["Where AI Meets Business."]}
              style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: pick3(64, 78, 66), lineHeight: 1.1, letterSpacing: "-0.025em" }} />
            <div style={{
              marginTop: pick3(50, 64, 44), transform: `scale(${chip})`, background: C.ink, color: C.orange, borderRadius: 999,
              padding: pick3("18px 46px", "22px 56px", "18px 46px"), display: "flex", alignItems: "center", gap: 16,
              fontFamily: DISPLAY, fontWeight: 700, fontSize: pick3(36, 44, 38), letterSpacing: "0.08em",
            }}>
              <span style={{ width: 14, height: 14, borderRadius: 7, background: C.orange, opacity: 0.5 + 0.5 * Math.abs(Math.sin(frame / 8)) }} />
              COMING SOON
            </div>
            <div style={{ marginTop: pick3(26, 30, 22), fontFamily: TEXT, fontWeight: 600, fontSize: pick3(26, 30, 26), color: C.muteLight, opacity: progress(frame, K.hit + 80, K.hit + 96) }}>
              Your AI front desk, right inside WhatsApp.
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}
