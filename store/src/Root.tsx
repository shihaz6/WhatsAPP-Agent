import { Composition } from "remotion";
import { Store } from "./Store";
import { H, W, cues } from "./kit";

export const RemotionRoot = () => (
  <Composition id="Store" component={Store} durationInFrames={cues.total} fps={cues.fps} width={W} height={H} />
);
