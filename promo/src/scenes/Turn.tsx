import { AbsoluteFill } from "remotion";
import { Appear, Backdrop, O, SCENES, headline, useOrient } from "../kit";

// 8.7-12.4s: hard cut to a brighter frame. "What if every message answered itself?"
// Landscape fits it in two lines. Vertical is too narrow for that at headline size, so it
// plays as two beats of two lines each (~1.8s each) instead of stacking four lines.
export function Turn() {
  const { portrait, safeX, pick } = useOrient();
  const end = SCENES.turn[1] - SCENES.turn[0];
  const half = 56;

  const box = { position: "absolute" as const, left: safeX, right: safeX, top: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" as const };

  return (
    <AbsoluteFill>
      <Backdrop glow={0.28} at="50% 30%" />
      {portrait ? (
        <>
          <div style={box}>
            <Appear start={3} end={half}><h1 style={headline(120)}>What if every<br />message…</h1></Appear>
          </div>
          <div style={box}>
            <Appear start={half + 1} end={end}><h1 style={headline(132)}><O>answered</O><br /><O>itself?</O></h1></Appear>
          </div>
        </>
      ) : (
        <div style={box}>
          <Appear start={3} end={end}><h1 style={headline(pick(124, 120))}>What if every message<br /><O>answered itself?</O></h1></Appear>
        </div>
      )}
    </AbsoluteFill>
  );
}
