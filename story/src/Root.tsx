import { Composition } from "remotion";
import { Story } from "./Story";
import { H, W, cues } from "./kit";

export const RemotionRoot = () => (
  <Composition id="Story" component={Story} durationInFrames={cues.total} fps={cues.fps} width={W} height={H} />
);
