import { Composition } from "remotion";
import { Reel } from "./Reel";
import { H, W, cues } from "./kit";

export const RemotionRoot = () => (
  <Composition id="Reel" component={Reel} durationInFrames={cues.total} fps={cues.fps} width={W} height={H} />
);
