import React from "react";
import { Composition, Still } from "remotion";
import "./fonts";
import { Cover } from "./Cover";
import { Reel, type ReelProps } from "./Reel";
import { DURATION, FPS, H, W } from "./theme";

export const Root: React.FC = () => (
  <>
    <Composition<any, ReelProps>
      id="CatalystReel"
      component={Reel}
      durationInFrames={DURATION}
      fps={FPS}
      width={W}
      height={H}
      defaultProps={{ lang: "en", showSafeArea: false }}
    />
    <Composition<any, ReelProps>
      id="CatalystReelSinhala"
      component={Reel}
      durationInFrames={DURATION}
      fps={FPS}
      width={W}
      height={H}
      defaultProps={{ lang: "si", showSafeArea: false }}
    />
    <Still id="Cover" component={Cover} width={W} height={H} />
  </>
);
