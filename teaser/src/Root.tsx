import { Composition } from "remotion";
import { cues } from "./kit";
import { Teaser } from "./Teaser";

export const RemotionRoot = () => (
  <>
    <Composition id="Teaser-Landscape" component={Teaser} durationInFrames={cues.total} fps={cues.fps} width={1920} height={1080} />
    <Composition id="Teaser-Portrait" component={Teaser} durationInFrames={cues.total} fps={cues.fps} width={1080} height={1920} />
    <Composition id="Teaser-Feed" component={Teaser} durationInFrames={cues.total} fps={cues.fps} width={1080} height={1350} />
  </>
);
