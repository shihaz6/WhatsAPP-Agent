import type { ReactNode } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Backdrop } from "./Backdrop";
import { C, FONT, cues, easeIn, prog } from "./kit";
import { Hook } from "./scenes/Hook";
import { Problem } from "./scenes/Problem";
import { Answer } from "./scenes/Answer";
import { Turn } from "./scenes/Turn";
import { Langs } from "./scenes/Langs";
import { Wake } from "./scenes/Wake";
import { Close } from "./scenes/Close";
import { LangCtx, type Lang } from "./i18n";

const S = cues.scenes;

/** Every scene drifts in out of a soft blur and leaves the same way. */
function Shell({ dur, children, cutIn = false, cutOut = false }: { dur: number; children: ReactNode; cutIn?: boolean; cutOut?: boolean }) {
  const f = useCurrentFrame();
  const a = cutIn ? 1 : prog(f, 0, 16);
  const b = cutOut ? 0 : prog(f, dur - 14, dur, easeIn);
  const blur = (1 - a) * 16 + b * 18;
  return (
    <AbsoluteFill style={{
      opacity: Math.min(a * 1.2, 1) * (1 - b),
      transform: `scale(${1.05 - 0.05 * a - 0.04 * b}) translateY(${b * -40}px)`,
      filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
    }}>
      {children}
    </AbsoluteFill>
  );
}

const SCENES: [keyof typeof S, () => JSX.Element, { cutIn?: boolean; cutOut?: boolean }][] = [
  ["hook", Hook, {}],
  ["problem", Problem, { cutOut: true }],

  ["turn", Turn, { cutIn: true }],
  ["answer", Answer, {}],
  ["langs", Langs, {}],
  ["wake", Wake, {}],
  ["close", Close, {}],
];

function Note() {
  return (
    <div style={{ position: "absolute", top: 104, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div style={{
        fontFamily: FONT, fontSize: 24, fontWeight: 600, letterSpacing: 1.5, color: "rgba(255,255,255,0.62)",
        padding: "10px 22px", borderRadius: 999, border: "1.5px solid rgba(255,255,255,0.14)", background: "rgba(20,20,20,0.55)",
        display: "flex", gap: 14, alignItems: "center",
      }}>
        <span style={{ width: 9, height: 9, borderRadius: 9, background: C.orange }} />
        Illustrative example <span style={{ opacity: 0.4 }}>|</span> Sample data
      </div>
    </div>
  );
}

export function Tourism({ lang = "en" }: { lang?: Lang }) {
  return (
    <LangCtx.Provider value={lang}>
    <AbsoluteFill style={{ background: C.char }}>
      <Backdrop />
      {SCENES.map(([key, Scene, opts]) => {
        const [a, b] = S[key];
        return (
          <Sequence key={key} from={a} durationInFrames={b - a} name={key}>
            <Shell dur={b - a} {...opts}><Scene /></Shell>
          </Sequence>
        );
      })}
      <Note />
      <Audio src={staticFile("soundtrack.wav")} />
    </AbsoluteFill>
    </LangCtx.Provider>
  );
}
