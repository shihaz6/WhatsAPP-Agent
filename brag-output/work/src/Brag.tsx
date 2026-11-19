import "../../../web/src/styles.css";
import type { ReactNode } from "react";
import { AbsoluteFill, Audio, Easing, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Logo } from "../../../web/src/Glyph";
import { ListScreen, PaymentsScreen, ThreadScreen } from "./dashboard";
import { C, Cursor, FONT, Lines, cues, progress, useEnvelope } from "./kit";

const S = cues.scenes as Record<keyof typeof cues.scenes, [number, number]>;
const len = (k: keyof typeof S) => S[k][1] - S[k][0];

// 21 s. 11:42 PM, a parent asks in Singlish -> Catalyst answers from the timetable, in Singlish ->
// five languages in the inbox -> the teacher approves a slip -> one click to take over -> logo.
export function Brag() {
  const scenes: [keyof typeof S, ReactNode][] = [
    ["thread", <ThreadScene />],
    ["langs", <LangsScene />],
    ["slip", <SlipScene />],
    ["takeover", <TakeoverScene />],
    ["outro", <Outro />],
  ];
  return (
    <AbsoluteFill style={{ background: C.navy, fontFamily: FONT }}>
      <Backdrop />
      {scenes.map(([k, node]) => (
        <Sequence key={k} from={S[k][0]} durationInFrames={len(k)} premountFor={30}>{node}</Sequence>
      ))}
      <Audio src={staticFile("soundtrack.wav")} />
    </AbsoluteFill>
  );
}

function Backdrop() {
  const frame = useCurrentFrame();
  const x = 70 + Math.sin(frame / 60) * 6, y = 45 + Math.cos(frame / 70) * 6;
  return (
    <AbsoluteFill style={{
      background: `radial-gradient(circle at ${x}% ${y}%, rgba(245,165,36,0.13), transparent 50%), radial-gradient(circle at 10% 90%, rgba(20,184,166,0.10), transparent 45%)`,
    }} />
  );
}

// Left caption column + right product screen. Captions: gold kicker, white line(s).
function Split({ caption, screen, scale, envelope }: { caption: ReactNode; screen: ReactNode; scale: number; envelope: { i: number; o: number } }) {
  const { i, o } = envelope;
  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 110px", gap: 40 }}>
      <div style={{ width: 640, flex: "none", opacity: 1 - o, transform: `translateX(${-o * 60}px)` }}>{caption}</div>
      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <div style={{
          transform: `translateY(${(1 - i) * 80 - o * 40}px) scale(${scale * (0.94 + 0.06 * i)})`,
          opacity: Math.min(i * 1.4, 1 - o), transformOrigin: "center",
        }}>{screen}</div>
      </div>
    </AbsoluteFill>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return <span style={{ color: C.gold, fontWeight: 800, fontSize: 96, letterSpacing: "-0.035em", lineHeight: 1.02 }}>{children}</span>;
}
function Line({ children, size = 58 }: { children: ReactNode; size?: number }) {
  return <span style={{ color: C.white, fontWeight: 700, fontSize: size, letterSpacing: "-0.025em", lineHeight: 1.12 }}>{children}</span>;
}
function Small({ children }: { children: ReactNode }) {
  return <span style={{ color: C.onNavy, fontWeight: 500, fontSize: 32, lineHeight: 1.35 }}>{children}</span>;
}

// ---------- 1 + 2: the late-night question and the answer ----------
function ThreadScene() {
  const env = useEnvelope(len("thread"));
  const f = env.frame;
  const T = cues.thread;
  const swap = progress(f, T.drop - 10, T.drop, Easing.in(Easing.cubic));
  const zoom = interpolate(f, [0, T.drop, len("thread")], [1.58, 1.63, 1.67]);
  const caption = (
    <div style={{ position: "relative", height: 420 }}>
      {f < T.drop && (
        <div style={{ position: "absolute", top: 70, opacity: 1 - swap, transform: `translateY(${-swap * 40}px)` }}>
          <Lines start={T.captionA} gap={8} lines={[<Kicker>11:42 PM.</Kicker>, <Line>The tutor's asleep.</Line>]} />
        </div>
      )}
      {f >= T.drop && (
        <div style={{ position: "absolute", top: 40 }}>
          <Lines start={T.captionB} gap={8} lines={[
            <Kicker>Catalyst isn't.</Kicker>,
            <Line>Reads your timetable.</Line>,
            <Line>Replies in Singlish.</Line>,
          ]} />
        </div>
      )}
    </div>
  );
  return (
    <Split envelope={env} scale={zoom} caption={caption}
      screen={<ThreadScreen f={f} incomingAt={T.incoming} dotsAt={T.dots} replyAt={T.reply} toolAt={T.tool} />} />
  );
}

// ---------- 3: five languages ----------
function LangsScene() {
  const env = useEnvelope(len("langs"));
  const L = cues.langs;
  return (
    <Split envelope={env} scale={1.95}
      caption={<Lines start={6} gap={8} lines={[
        <Kicker>Five languages.</Kicker>,
        <Line>It replies in theirs.</Line>,
        <div style={{ marginTop: 26 }}><Small>English · සිංහල · தமிழ் · Singlish · Tanglish, in their own script.</Small></div>,
      ]} />}
      screen={<ListScreen f={env.frame} first={L.first} every={L.every} />} />
  );
}

// ---------- 4: the teacher approves a slip ----------
function SlipScene() {
  const env = useEnvelope(len("slip"));
  const P = cues.slip;
  const f = env.frame;
  // Pointer lives inside the Approve button's box (css px of the unscaled dashboard), so it scales with the screen.
  const anchor = (
    <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "scale(0.55)", transformOrigin: "0 0" }}>
        <Cursor path={[{ f: P.move, x: -520, y: 260 }, { f: P.click - 6, x: 0, y: 0 }]} clicks={[P.click]} />
      </div>
    </div>
  );
  return (
    <Split envelope={env} scale={1.62}
      caption={<Lines start={6} gap={8} lines={[
        <Kicker>Payment slips?</Kicker>,
        <Line>You check.</Line>,
        <Line>You approve.</Line>,
        <div style={{ marginTop: 26 }}><Small>The bot never tells a parent a fee is paid. You do.</Small></div>,
      ]} />}
      screen={<PaymentsScreen f={f} done={P.done} approveAnchor={f < P.done + 20 ? anchor : undefined} />} />
  );
}

// ---------- 5: one click to take over ----------
function TakeoverScene() {
  const env = useEnvelope(len("takeover"));
  const K = cues.takeover;
  const f = env.frame;
  const paused = f >= K.click + 2;
  const anchor = (
    <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: "45%", top: "55%", transform: "scale(0.55)", transformOrigin: "0 0" }}>
        <Cursor path={[{ f: K.move, x: -420, y: 520 }, { f: K.click - 6, x: 0, y: 0 }]} clicks={[K.click]} />
      </div>
    </div>
  );
  return (
    <Split envelope={env} scale={1.62}
      caption={<Lines start={4} gap={8} lines={[<Kicker>Want to step in?</Kicker>, <Line>One click.</Line>, <Line>The bot goes quiet.</Line>]} />}
      screen={<ThreadScreen f={999} incomingAt={0} dotsAt={0} replyAt={0} toolAt={0} paused={paused} pauseP={progress(f, K.click + 2, K.click + 12)}
        takeOverAnchor={f < K.click + 24 ? anchor : undefined} />} />
  );
}

// ---------- 6: logo ----------
function Outro() {
  const frame = useCurrentFrame();
  const h = cues.outro.hit;
  const logo = progress(frame, h, h + 16, Easing.out(Easing.back(1.6)));
  const zoom = interpolate(frame, [0, len("outro")], [1, 1.04]);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `scale(${zoom})` }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ transform: `scale(${logo}) rotate(${(1 - logo) * -25}deg)`, filter: "drop-shadow(0 22px 50px rgba(245,165,36,0.45))" }}>
          <Logo size={150} />
        </div>
        <Lines start={h + 8} lines={[<span style={{ color: C.white, fontWeight: 800, fontSize: 168, letterSpacing: "-0.05em", lineHeight: 1 }}>Catalyst</span>]} style={{ marginTop: 30 }} />
        <Lines start={h + 16} lines={[<span style={{ color: C.onNavy, fontWeight: 600, fontSize: 40 }}>by AlchemyX</span>]} style={{ marginTop: 12 }} />
        <div style={{ width: 110, height: 6, borderRadius: 3, background: C.gold, margin: "40px 0 34px", transform: `scaleX(${progress(frame, h + 24, h + 38)})` }} />
        <Lines start={h + 30} gap={8} lines={[
          <span style={{ color: C.gold, fontWeight: 700, fontSize: 30, letterSpacing: "0.16em" }}>WHERE AI MEETS BUSINESS</span>,
          <span style={{ color: C.white, fontWeight: 700, fontSize: 58, letterSpacing: "-0.025em", display: "inline-block", marginTop: 18 }}>Your AI front desk, right inside WhatsApp.</span>,
        ]} />
      </div>
    </AbsoluteFill>
  );
}
