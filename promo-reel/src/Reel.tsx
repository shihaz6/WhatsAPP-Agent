import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { COPY } from "./copy";
import { CatalystChat } from "./scenes/CatalystChat";
import { EndCard } from "./scenes/EndCard";
import { Footage } from "./scenes/Footage";
import { LogoFlash } from "./scenes/LogoFlash";
import { MorningBanner } from "./scenes/MorningBanner";
import { S1Notifications } from "./scenes/S1Notifications";
import { S2Chat } from "./scenes/S2Chat";
import { SplitAndSwitch } from "./scenes/SplitAndSwitch";
import { type Lang } from "./theme";
import { Caption } from "./ui/Caption";
import { QaProbe } from "./ui/QaProbe";

export type ReelProps = { lang: Lang; showSafeArea?: boolean; qa?: boolean };

/** Caption windows, in frames (enter, exit). */
const CAPTIONS = [
  ["c1", 8, 86],
  ["c2", 97, 172],
  ["c3a", 276, 311],
  ["c3b", 318, 357, "left"], // Shot 4: shopkeeper's face is right of centre, keep it clear
  ["c4", 370, 416],
  ["c5", 428, 590],
  ["c6", 608, 742],
] as const satisfies readonly (readonly [string, number, number, ("left" | "center")?])[];

export const Reel: React.FC<ReelProps> = ({ lang, showSafeArea, qa }) => {
  const copy = COPY[lang];
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Footage />
      {/* top scrim keeps captions readable on bright footage */}
      <AbsoluteFill
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.12) 26%, rgba(0,0,0,0) 36%)" }}
      />
      <S1Notifications />
      <S2Chat />
      <SplitAndSwitch />
      <LogoFlash />
      <CatalystChat />
      <MorningBanner />
      {CAPTIONS.map(([key, from, to, align]) => (
        <Caption key={key} lines={copy[key]} from={from} to={to} lang={lang} align={align} />
      ))}
      <EndCard copy={copy} lang={lang} />
      <Audio src={staticFile("audio/soundtrack.wav")} />
      {qa && <QaProbe />}
      {showSafeArea && (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 200, background: "rgba(255,0,0,0.25)", borderBottom: "2px dashed red" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 200, background: "rgba(255,0,0,0.25)", borderTop: "2px dashed red" }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 640, borderTop: "2px dashed rgba(0,255,255,0.8)" }} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
