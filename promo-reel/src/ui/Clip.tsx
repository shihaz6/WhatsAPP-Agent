import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from "remotion";
import { FPS } from "../theme";

/**
 * One Flow clip on the timeline.
 *  from/to   composition frames the layer is mounted for (include transition overlap)
 *  srcAt     source-clip second shown at frame `from`
 *  rate      playback rate (the prepared clips are 60fps, so rates down to ~0.5 stay smooth)
 * The clips are already 9:16 (1080x1920); `objectPosition` keeps the subject centred if cropped.
 */
export const Clip: React.FC<{
  shot: 1 | 2 | 3 | 4 | 5 | 6;
  from: number;
  to: number;
  srcAt: number;
  rate: number;
  style?: React.CSSProperties;
  videoStyle?: React.CSSProperties;
}> = ({ shot, from, to, srcAt, rate, style, videoStyle }) => (
  <Sequence from={from} durationInFrames={to - from} layout="none" name={`Shot ${shot}`}>
    <AbsoluteFill style={{ overflow: "hidden", ...style }}>
      <OffthreadVideo
        src={staticFile(`clips/shot${shot}.mp4`)}
        trimBefore={Math.round(srcAt * FPS)}
        playbackRate={rate}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover", ...videoStyle }}
      />
    </AbsoluteFill>
  </Sequence>
);
