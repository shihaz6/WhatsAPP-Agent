import type { ReactNode } from "react";
import { AbsoluteFill, Audio, Sequence, getStaticFiles, staticFile, useCurrentFrame } from "remotion";
import { Backdrop, Note } from "./Backdrop";
import { Transitions } from "./Transitions";
import { H, W, cues, prog, pulse } from "./kit";
import { Hook } from "./scenes/Hook";
import { Pain } from "./scenes/Pain";
import { Turn } from "./scenes/Turn";
import { Demo } from "./scenes/Demo";
import { Langs } from "./scenes/Langs";
import { Trust } from "./scenes/Trust";
import { Offer } from "./scenes/Offer";
import { End } from "./scenes/End";

const S = cues.scenes;
type Move = "none" | "up" | "left";

/** Scene wrapper: a slow push-in, a kick bump, and the scene's own whip in and out. */
function Shell({ from, dur, children, out = "none", inn = "none" }: { from: number; dur: number; children: ReactNode; out?: Move; inn?: Move }) {
  const f = useCurrentFrame();
  const k = pulse(from + f);
  let x = 0, y = 0, blur = 0;
  const scale = 1 + 0.025 * (f / dur) + 0.006 * k;
  if (out !== "none") {
    const z = prog(f, dur - 10, dur, (t) => t * t);
    if (out === "up") y -= z * H; else x -= z * W;
    blur += z * 22;
  }
  if (inn !== "none") {
    const z = 1 - prog(f, 0, 12);
    if (inn === "up") y += z * H; else x += z * W;
    blur += z * 22;
  }
  return (
    <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px) scale(${scale})`, filter: blur > 0.3 ? `blur(${blur * 0.5}px)` : undefined }}>
      {children}
    </AbsoluteFill>
  );
}

const SCENES: [keyof typeof S, () => JSX.Element, Move?, Move?][] = [
  ["hook", Hook, "up"],
  ["pain", Pain, "none", "up"],
  ["turn", Turn],
  ["demo", Demo, "left"],
  ["langs", Langs, "none", "left"],
  ["trust", Trust],
  ["offer", Offer],
  ["end", End],
];

// A voiceover is optional: drop public/voiceover.wav in and re-render, and the music ducks under it.
const HAS_VO = getStaticFiles().some((s) => s.name === "voiceover.wav");

export function Reel() {
  return (
    <AbsoluteFill style={{ background: "#1A1A1A", overflow: "hidden" }}>
      <Backdrop />
      {SCENES.map(([key, Scene, out, inn]) => {
        const [a, b] = S[key];
        return (
          <Sequence key={key} from={a} durationInFrames={b - a} name={key}>
            <Shell from={a} dur={b - a} out={out} inn={inn}><Scene /></Shell>
          </Sequence>
        );
      })}
      <Transitions />
      <Note />
      <Audio src={staticFile("soundtrack.wav")} volume={HAS_VO ? 0.45 : 1} />
      {HAS_VO && <Audio src={staticFile("voiceover.wav")} />}
    </AbsoluteFill>
  );
}
