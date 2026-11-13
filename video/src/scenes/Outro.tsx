import { AbsoluteFill, useCurrentFrame } from "remotion";
import { LogoMark, progress, useSpring } from "../kit";

const POINTS = ["Answers in 5 languages", "Hand-off to the teacher", "Payments in one place"];

export function Outro() {
  const frame = useCurrentFrame();
  const pop = useSpring(2, { damping: 16, stiffness: 110, mass: 0.8 });
  const nameP = progress(frame, 10, 32);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${pop})`, filter: "drop-shadow(0 18px 30px rgba(34,160,107,0.35))" }}>
        <LogoMark size={110} />
      </div>
      <div className="wordmark" style={{ marginTop: 34, textAlign: "center", opacity: nameP, transform: `translateY(${(1 - nameP) * 24}px)` }}>
        <div style={{ fontSize: 26, fontWeight: 600, color: "#177a50", letterSpacing: "0.18em", textTransform: "uppercase" }}>AlchemyX</div>
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: "-0.045em", lineHeight: 1.05 }}>Catalyst</div>
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 40 }}>
        {POINTS.map((p, i) => {
          const s = progress(frame, 30 + i * 7, 52 + i * 7);
          return (
            <div key={p} className="wordmark" style={{
              fontSize: 22, fontWeight: 500, color: "#2c4a3a", background: "#fff", border: "1px solid #d6e6dc",
              padding: "12px 22px", borderRadius: 999, opacity: s, transform: `translateY(${(1 - s) * 16}px)`,
              boxShadow: "0 8px 20px -14px rgba(21,60,38,0.35)",
            }}>{p}</div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
