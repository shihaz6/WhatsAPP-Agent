import { Composition } from "remotion";
import { Tourism } from "./Tourism";
import { H, W, cues } from "./kit";

export const RemotionRoot = () => (
  <>
    <Composition id="Tourism" component={Tourism} durationInFrames={cues.total} fps={cues.fps} width={W} height={H} defaultProps={{ lang: "en" as const }} />
    <Composition id="TourismSi" component={Tourism} durationInFrames={cues.total} fps={cues.fps} width={W} height={H} defaultProps={{ lang: "si" as const }} />
  </>
);
