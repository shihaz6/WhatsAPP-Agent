import type { ReactNode } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Backdrop, Note, Wipes } from "./Backdrop";
import { C, W, cues, easeIn, prog } from "./kit";
import { Hook } from "./scenes/Hook";
import { Turn } from "./scenes/Turn";
import { Demo } from "./scenes/Demo";
import { Langs } from "./scenes/Langs";
import { Urgent } from "./scenes/Urgent";
import { Close } from "./scenes/Close";

const S = cues.scenes;
type Out = "wipe" | "zoom" | "push";
type In = "cut" | "push";

/** Scene wrapper: a slow camera drift, plus the scene's own way out (and in). */
function Shell({ dur, children, out, inn = "cut" }: { dur: number; children: ReactNode; out: Out; inn?: In }) {
  const f = useCurrentFrame();
  const drift = 1 + 0.018 * (f / dur);
  let x = 0, scale = drift, opacity = 1, blur = 0;
  if (out === "zoom") {
    const z = prog(f, dur - 18, dur, easeIn);
    scale *= 1 + z * 1.4; opacity = 1 - z; blur = z * 16;
  }
  if (out === "push") {
    const z = prog(f, dur - 18, dur, (t) => t * t);
    x -= z * W; blur += z * 10;
  }
  if (inn === "push") {
    const z = prog(f, 0, 18);
    x += (1 - z) * W; blur += (1 - z) * 10;
  }
  return (
    <AbsoluteFill style={{ transform: `translateX(${x}px) scale(${scale})`, opacity, filter: blur > 0.1 ? `blur(${blur}px)` : undefined }}>
      {children}
    </AbsoluteFill>
  );
}

const SCENES: [keyof typeof S, () => JSX.Element, Out, In?][] = [
  ["hook", Hook, "wipe"],
  ["turn", Turn, "zoom"],
  ["demo", Demo, "push"],
  ["langs", Langs, "wipe", "push"],
  ["urgent", Urgent, "wipe"],
  ["close", Close, "wipe"],
];

export function Dental() {
  return (
    <AbsoluteFill style={{ background: C.char, overflow: "hidden" }}>
      <Backdrop />
      {SCENES.map(([key, Scene, out, inn]) => {
        const [a, b] = S[key];
        return (
          <Sequence key={key} from={a} durationInFrames={b - a} name={key}>
            <Shell dur={b - a} out={out} inn={inn}><Scene /></Shell>
          </Sequence>
        );
      })}
      <Wipes />
      <Note />
      <Audio src={staticFile("soundtrack.wav")} />
    </AbsoluteFill>
  );
}
