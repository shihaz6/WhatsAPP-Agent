import { Composition } from "remotion";
import { cues } from "./kit";
import { Promo, type PromoProps } from "./Promo";

// Fiverr-safe by default. For socials, render with e.g. --props='{"contact":"@yourhandle"}'
const defaults: PromoProps = { contact: "Contact me on Fiverr", music: true };

export const RemotionRoot = () => (
  <>
    <Composition id="Promo-Landscape" component={Promo} durationInFrames={cues.total} fps={cues.fps} width={1920} height={1080} defaultProps={defaults} />
    <Composition id="Promo-Portrait" component={Promo} durationInFrames={cues.total} fps={cues.fps} width={1080} height={1920} defaultProps={defaults} />
  </>
);
