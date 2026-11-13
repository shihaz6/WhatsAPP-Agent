import { loadFont } from "@remotion/google-fonts/Inter";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from "remotion";
import { Backdrop, SceneFade } from "./kit";
import { ChatScene, TakeoverScene } from "./scenes/Chat";
import { Intro } from "./scenes/Intro";
import { OverviewScene } from "./scenes/Overview";
import { Outro } from "./scenes/Outro";
import { PaymentsScene } from "./scenes/Payments";
import { SCENES, TOTAL } from "./timeline";

loadFont("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

export function Promo() {
  const scenes = [
    [SCENES.intro, <Intro />],
    [SCENES.overview, <OverviewScene />],
    [SCENES.chat, <ChatScene />],
    [SCENES.takeover, <TakeoverScene />],
    [SCENES.payments, <PaymentsScene />],
    [SCENES.outro, <Outro />],
  ] as const;

  return (
    <AbsoluteFill style={{ fontFamily: "Inter, sans-serif" }}>
      <Backdrop />
      {scenes.map(([s, node], i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.duration} premountFor={30}>
          <SceneFade duration={s.duration}>{node}</SceneFade>
        </Sequence>
      ))}
      <Audio src={staticFile("soundtrack.wav")}
        volume={(f) => interpolate(f, [0, 20, TOTAL - 45, TOTAL], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
    </AbsoluteFill>
  );
}
