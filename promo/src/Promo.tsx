import type { ReactNode } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { C, FONT, O, SCENES, cues } from "./kit";
import { Cta } from "./scenes/Cta";
import { BEAT, Feature, Handover } from "./scenes/Features";
import { Night } from "./scenes/Night";
import { Pain } from "./scenes/Pain";
import { Reveal } from "./scenes/Reveal";
import { Turn } from "./scenes/Turn";

export type PromoProps = {
  /** Shown on the last card. Fiverr gallery media must not contain phone numbers or social handles. */
  contact: string;
  /** Play public/soundtrack.wav. Set to false for a silent render. */
  music: boolean;
};

// 35s: messages pile up at night -> the same questions every night -> "what if..." ->
// Catalyst reveal -> five feature beats -> lockup + call to action.
export function Promo({ contact, music }: PromoProps) {
  const [b1, b2, b3, b4, b5] = cues.beats;
  const scenes: [number, number, ReactNode][] = [
    [...SCENES.night, <Night />],
    [...SCENES.pain, <Pain />],
    [...SCENES.turn, <Turn />],
    [...SCENES.reveal, <Reveal />],
    [b1, b1 + BEAT, <Feature src="screens/1-inbox.png" focus={[0.5, 0.42]} vFocus={[0.4, 0.5]}>Replies in <O>40+ languages</O>, 24/7</Feature>],
    [b2, b2 + BEAT, <Feature src="screens/4-payments.png" focus={[0.6, 0.5]} vFocus={[0.75, 0.5]}>Reads &amp; <O>verifies</O> payment slips</Feature>],
    [b3, b3 + BEAT, <Feature src="screens/3-analytics.png" focus={[0.5, 0.25]} vFocus={[0.42, 0.42]}>See <O>everything</O> it handled</Feature>],
    [b4, b4 + BEAT, <Feature src="screens/5-channels.png" focus={[0.55, 0.3]} vFocus={[0.4, 0.5]}>WhatsApp, Instagram, <O>Messenger &amp; Telegram</O></Feature>],
    [b5, b5 + BEAT, <Handover />],
    [...SCENES.cta, <Cta contact={contact} />],
  ];
  return (
    <AbsoluteFill style={{ background: C.bg1, fontFamily: FONT }}>
      {scenes.map(([from, to, node], i) => (
        <Sequence key={i} from={from} durationInFrames={to - from} premountFor={30}>{node}</Sequence>
      ))}
      {music && <Audio src={staticFile("soundtrack.wav")} />}
    </AbsoluteFill>
  );
}
