import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { LogoMark, progress, useSpring } from "../kit";

// Logo tile springs in, the X draws itself, then the name and tagline rise in.
export function Intro() {
  const frame = useCurrentFrame();
  const pop = useSpring(4, { damping: 14, stiffness: 120, mass: 0.8 });
  const draw = progress(frame, 14, 40);
  const nameP = progress(frame, 30, 54);
  const byP = progress(frame, 42, 62);
  const tagP = progress(frame, 56, 80);
  const lift = interpolate(frame, [0, 120], [0, -10]);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translateY(${lift}px)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
        <div style={{ transform: `scale(${pop}) rotate(${(1 - pop) * -12}deg)`, filter: "drop-shadow(0 18px 30px rgba(34,160,107,0.35))" }}>
          <LogoMark size={150} draw={draw} />
        </div>
        <div className="wordmark" style={{ overflow: "hidden" }}>
          <div style={{ fontSize: 112, fontWeight: 700, letterSpacing: "-0.045em", lineHeight: 1,
            opacity: nameP, transform: `translateY(${(1 - nameP) * 60}px)` }}>Catalyst</div>
          <div style={{ fontSize: 30, fontWeight: 500, color: "#5e7266", marginTop: 12, letterSpacing: "0.01em",
            opacity: byP, transform: `translateY(${(1 - byP) * 20}px)` }}>by AlchemyX</div>
        </div>
      </div>
      <div className="wordmark" style={{ position: "absolute", top: 690, fontSize: 30, color: "#4d5f55", fontWeight: 500,
        opacity: tagP, transform: `translateY(${(1 - tagP) * 16}px)` }}>
        The WhatsApp assistant for tutors, with you in control.
      </div>
    </AbsoluteFill>
  );
}
