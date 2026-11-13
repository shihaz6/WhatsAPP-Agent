import type { ReactNode } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { C, SCENES, TEXT } from "./kit";
import { Ask } from "./scenes/Ask";
import { Build } from "./scenes/Build";
import { Close } from "./scenes/Close";
import { Flood } from "./scenes/Flood";
import { Flow } from "./scenes/Flow";
import { Grid } from "./scenes/Grid";

// 40 s, told as a chat. A question typed at 2 AM, Catalyst answers "I do." -> every question answered (orange) ->
// how it works (message -> understood -> replied -> booked & paid) -> the dashboard as a 3D stack that folds into one screen ->
// eight businesses flip to "answered" -> bookend chat "So when…?" "Very soon." -> Catalyst by AlchemyX Global lockup.
export function Teaser2() {
  const scenes: [[number, number], ReactNode][] = [
    [SCENES.ask, <Ask />],
    [SCENES.flood, <Flood />],
    [SCENES.flow, <Flow />],
    [SCENES.build, <Build />],
    [SCENES.grid, <Grid />],
    [SCENES.close, <Close />],
  ];
  return (
    <AbsoluteFill style={{ background: C.white, fontFamily: TEXT }}>
      {scenes.map(([[from, to], node], i) => (
        <Sequence key={i} from={from} durationInFrames={to - from} premountFor={30}>{node}</Sequence>
      ))}
      <Audio src={staticFile("soundtrack.wav")} />
    </AbsoluteFill>
  );
}
