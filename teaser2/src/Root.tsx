import { Composition } from "remotion";
import { cues } from "./kit";
import { Teaser2 } from "./Teaser2";

export const RemotionRoot = () => (
  <>
    <Composition id="Teaser2-Landscape" component={Teaser2} durationInFrames={cues.total} fps={cues.fps} width={1920} height={1080} />
    <Composition id="Teaser2-Portrait" component={Teaser2} durationInFrames={cues.total} fps={cues.fps} width={1080} height={1920} />
    <Composition id="Teaser2-Feed" component={Teaser2} durationInFrames={cues.total} fps={cues.fps} width={1080} height={1350} />
  </>
);
