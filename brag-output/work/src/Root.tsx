import { Composition } from "remotion";
import { Brag } from "./Brag";
import { cues } from "./kit";

export const RemotionRoot = () => (
  <Composition id="Brag" component={Brag} durationInFrames={cues.total} fps={cues.fps} width={1920} height={1080} />
);
