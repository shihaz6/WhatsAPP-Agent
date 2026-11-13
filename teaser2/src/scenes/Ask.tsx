import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { C, cues, progress, useOrient } from "../kit";
import { ChatMoment } from "./ChatMoment";

// Opening, bright and quiet: "Who replies to your customers at 2 AM?" -> Catalyst: "I do."
// Then the orange answer bubble swells and floods the screen (into the next scene).
export function Ask() {
  const frame = useCurrentFrame();
  const { pick3 } = useOrient();
  const A = cues.ask;
  const [, end] = cues.scenes.ask;
  const swell = progress(frame, end - 26, end - 8, Easing.in(Easing.cubic));
  const flood = progress(frame, end - 16, end, Easing.bezier(0.7, 0, 0.3, 1));
  const origin = pick3("30% 52%", "30% 58%", "30% 52%");

  return (
    <AbsoluteFill style={{ background: C.white, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 100%, rgba(255,138,76,0.10), transparent 60%)" }} />
      <ChatMoment question="Who replies to your customers at 2 AM?" reply="I do." t={A} replyScale={1 + swell * 0.25} />
      <AbsoluteFill style={{ background: C.orange, clipPath: `circle(${flood * 130}% at ${origin})` }} />
    </AbsoluteFill>
  );
}
