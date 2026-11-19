import type { ReactNode } from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Backdrop, Note, Wipes } from "./Backdrop";
import { C, W, cues, prog } from "./kit";
import { Title } from "./scenes/Title";
import { Price } from "./scenes/Price";
import { Size } from "./scenes/Size";
import { Budget } from "./scenes/Budget";
import { Night } from "./scenes/Night";
import { Unknown } from "./scenes/Unknown";
import { Dash } from "./scenes/Dash";
import { Close } from "./scenes/Close";

const S = cues.scenes;
type Out = "wipe" | "push";

/** Scene wrapper: a slow drift, plus a horizontal push out (and in) between scenes on the same ground. */
function Shell({ dur, children, out, pushIn }: { dur: number; children: ReactNode; out: Out; pushIn: boolean }) {
  const f = useCurrentFrame();
  const drift = 1 + 0.012 * (f / dur);
  let x = 0;
  if (out === "push") x -= prog(f, dur - 14, dur, (t) => t * t) * W;
  if (pushIn) x += (1 - prog(f, 0, 14)) * W;
  return <AbsoluteFill style={{ transform: `translateX(${x}px) scale(${drift})` }}>{children}</AbsoluteFill>;
}

const SCENES: [keyof typeof S, () => JSX.Element, Out][] = [
  ["title", Title, "wipe"],
  ["price", Price, "push"],
  ["size", Size, "push"],
  ["budget", Budget, "wipe"],
  ["night", Night, "wipe"],
  ["unknown", Unknown, "push"],
  ["dash", Dash, "wipe"],
  ["close", Close, "wipe"],
];

export function Store() {
  return (
    <AbsoluteFill style={{ background: C.char, overflow: "hidden" }}>
      <Backdrop />
      {SCENES.map(([key, Scene, out], i) => {
        const [a, b] = S[key];
        const pushIn = i > 0 && SCENES[i - 1][2] === "push";
        return (
          <Sequence key={key} from={a} durationInFrames={b - a} name={key}>
            <Shell dur={b - a} out={out} pushIn={pushIn}><Scene /></Shell>
          </Sequence>
        );
      })}
      <Wipes />
      <Note />
    </AbsoluteFill>
  );
}
