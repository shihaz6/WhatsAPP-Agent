import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, DISPLAY, SCENES, cues, progress, shake, useOrient } from "../kit";

// The same questions, slammed in on the beat, with the clock creeping later. Then "Every. Single. Night."
const WORDS = [
  { land: ["Fees?"], port: ["Fees?"], time: "11:52 PM" },
  { land: ["Class times?"], port: ["Class", "times?"], time: "11:58 PM" },
  { land: ["Trial class?"], port: ["Trial", "class?"], time: "12:06 AM" },
  { land: ["Payment slip?"], port: ["Payment", "slip?"], time: "12:13 AM" },
];
const FINAL = ["Every.", "Single.", "Night."];

export function Questions() {
  const frame = useCurrentFrame();
  const { portrait, pick } = useOrient();
  const hits = cues.words.map((w) => w - SCENES.questions[0]);
  const finalStart = hits[WORDS.length];

  const slam = (at: number) => {
    const p = progress(frame, at, at + 8);
    return { opacity: p, transform: `scale(${1.22 - 0.22 * p})`, filter: `blur(${((1 - p) * 14).toFixed(1)}px)` };
  };
  const flash = hits.reduce((m, h) => (frame >= h && frame - h < 14 ? Math.max(m, 1 - (frame - h) / 14) : m), 0);

  const current = frame < finalStart ? WORDS[Math.max(0, hits.filter((h, i) => i < WORDS.length && frame >= h).length - 1)] : null;
  const ci = current ? WORDS.indexOf(current) : -1;

  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, rgba(255,138,76,${0.08 + flash * 0.18}), transparent 60%)` }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: shake(frame, hits, 16) }}>
        {current && (
          <div key={ci} style={{ textAlign: "center", ...slam(hits[ci]) }}>
            {(portrait ? current.port : current.land).map((l) => (
              <div key={l} style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: pick(220, 200), lineHeight: 1, letterSpacing: "-0.045em", color: C.white }}>{l}</div>
            ))}
            <div style={{ marginTop: pick(40, 50), fontFamily: DISPLAY, fontWeight: 600, fontSize: pick(40, 44), letterSpacing: "0.2em", color: C.muteDark }}>{current.time}</div>
          </div>
        )}
        {!current && (
          <div style={{ display: "flex", flexDirection: portrait ? "column" : "row", alignItems: "center", gap: pick(44, 10) }}>
            {FINAL.map((w, i) => {
              const at = hits[WORDS.length + i];
              if (frame < at) return <div key={w} style={{ visibility: "hidden", fontSize: pick(170, 210), fontFamily: DISPLAY, fontWeight: 800 }}>{w}</div>;
              return (
                <div key={w} style={{
                  fontFamily: DISPLAY, fontWeight: 800, fontSize: pick(170, 210), lineHeight: 1.02, letterSpacing: "-0.045em",
                  color: i === FINAL.length - 1 ? C.orange : C.white, ...slam(at),
                }}>{w}</div>
              );
            })}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
