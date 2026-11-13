import type { ReactNode } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { C, Grain, SCENES, TEXT } from "./kit";
import { EndCard } from "./scenes/EndCard";
import { Handoff, Languages, Payments } from "./scenes/Features";
import { Night } from "./scenes/Night";
import { Questions } from "./scenes/Questions";
import { Reveal } from "./scenes/Reveal";
import { Turn } from "./scenes/Turn";

// 31 s: late-night messages pile up -> the same questions, again -> "what if..." ->
// three glimpses of the product -> Catalyst, coming soon -> AlchemyX Global sign-off.
export function Teaser() {
  const scenes: [[number, number], ReactNode][] = [
    [SCENES.night, <Night />],
    [SCENES.questions, <Questions />],
    [SCENES.turn, <Turn />],
    [SCENES.languages, <Languages />],
    [SCENES.handoff, <Handoff />],
    [SCENES.payments, <Payments />],
    [SCENES.reveal, <Reveal />],
    [SCENES.end, <EndCard />],
  ];
  return (
    <AbsoluteFill style={{ background: C.ink, fontFamily: TEXT }}>
      {scenes.map(([[from, to], node], i) => (
        <Sequence key={i} from={from} durationInFrames={to - from} premountFor={30}>{node}</Sequence>
      ))}
      <Grain />
      <Audio src={staticFile("soundtrack.wav")} />
    </AbsoluteFill>
  );
}
