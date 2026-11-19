import { Composition } from "remotion";
import { Dental } from "./Dental";
import { H, W, cues } from "./kit";

export const RemotionRoot = () => (
  <Composition id="Dental" component={Dental} durationInFrames={cues.total} fps={cues.fps} width={W} height={H} />
);
