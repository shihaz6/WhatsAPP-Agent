import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { C, DISPLAY, RiseLines, progress, useOrient } from "../kit";

// Hard flip to white: "What if every message answered itself?"
export function Turn() {
  const frame = useCurrentFrame();
  const { portrait, pick } = useOrient();
  const wipe = progress(frame, 0, 16, Easing.bezier(0.7, 0, 0.3, 1));
  const zoom = interpolate(frame, [0, 120], [1, 1.04]);

  const mark = (text: string, i: number) => {
    const p = progress(frame, 40 + i * 7, 60 + i * 7);
    return (
      <span style={{
        backgroundImage: `linear-gradient(${C.orange}, ${C.orange})`, backgroundRepeat: "no-repeat",
        backgroundSize: `${p * 100}% 78%`, backgroundPosition: "0 70%", padding: "0 0.1em",
      }}>{text}</span>
    );
  };

  const top = portrait ? ["What if", "every message"] : ["What if every message"];
  const bottom = portrait ? [mark("answered", 0), mark("itself?", 1)] : [mark("answered itself?", 0)];

  return (
    <AbsoluteFill style={{ background: C.white }}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `scale(${zoom})` }}>
        <div style={{ textAlign: "center", color: C.ink, fontFamily: DISPLAY }}>
          <RiseLines start={10} gap={5} lines={top}
            style={{ fontWeight: 600, fontSize: pick(96, 104), lineHeight: 1.1, letterSpacing: "-0.03em" }} />
          <RiseLines start={22} gap={6} lines={bottom}
            style={{ fontWeight: 800, fontSize: pick(156, 160), lineHeight: 1.08, letterSpacing: "-0.045em", marginTop: pick(14, 24) }} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: C.orange, transform: `translateY(${-wipe * 100}%)` }} />
    </AbsoluteFill>
  );
}
