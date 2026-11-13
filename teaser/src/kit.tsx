// Shared pieces for the AlchemyX Global launch teaser (landscape 1920x1080 and portrait 1080x1920).
// Brand: bright orange #FF8A4C, charcoal #1A1A1A, white #FFFFFF.
// Legibility rule used everywhere: charcoal text on white or orange, white/orange text on charcoal.
// Never orange text on white or white text on orange (contrast ~2.3:1).

import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadSinhala } from "@remotion/google-fonts/NotoSansSinhala";
import { loadFont as loadTamil } from "@remotion/google-fonts/NotoSansTamil";
import { loadFont as loadSora } from "@remotion/google-fonts/Sora";
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import cuesJson from "./cues.json";

const sora = loadSora("normal", { weights: ["300", "600", "700", "800"], subsets: ["latin"] });
const inter = loadInter("normal", { weights: ["500", "600"], subsets: ["latin"] });
const sinhala = loadSinhala("normal", { weights: ["700"], subsets: ["sinhala"] });
const tamil = loadTamil("normal", { weights: ["700"], subsets: ["tamil"] });

export const DISPLAY = `${sora.fontFamily}, ${sinhala.fontFamily}, ${tamil.fontFamily}, sans-serif`;
export const TEXT = `${inter.fontFamily}, ${sinhala.fontFamily}, ${tamil.fontFamily}, sans-serif`;

export const C = {
  orange: "#FF8A4C",
  ink: "#1A1A1A",
  white: "#FFFFFF",
  card: "#242424",       // raised surface on charcoal
  line: "#363636",
  muteDark: "#A3A3A3",   // secondary text on charcoal (≥ 6:1)
  muteLight: "#555555",  // secondary text on white (≥ 7:1)
};

type Range = [number, number];
export const cues = cuesJson as {
  fps: number; total: number; pings: number[]; words: number[];
  scenes: Record<"night" | "questions" | "turn" | "languages" | "handoff" | "payments" | "reveal" | "end", Range>;
};
export const SCENES = cues.scenes;

export function useOrient() {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  // feed = 4:5 (1080x1350), the tallest shape Instagram/Facebook accept for normal feed posts.
  const feed = portrait && height / width < 1.5;
  return { portrait, feed, width, height, pick: <T,>(landscape: T, port: T): T => (portrait ? port : landscape) };
}

export const ease = Easing.bezier(0.22, 1, 0.36, 1);

export function progress(frame: number, a: number, b: number, easing = ease) {
  return interpolate(frame, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

// Short decaying camera shake after each hit frame.
export function shake(frame: number, hits: number[], amp = 14) {
  let x = 0, y = 0;
  for (const h of hits) {
    const t = frame - h;
    if (t < 0 || t > 14) continue;
    const d = Math.exp(-t / 3) * amp;
    x += Math.sin(t * 2.7 + h) * d;
    y += Math.cos(t * 3.1 + h) * d * 0.6;
  }
  return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
}

// Lines that rise out of a mask one after another.
export function RiseLines({ lines, start, gap = 5, dur = 20, style }: {
  lines: ReactNode[]; start: number; gap?: number; dur?: number; style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  return (
    <div style={style}>
      {lines.map((l, i) => {
        const p = progress(frame, start + i * gap, start + i * gap + dur);
        return (
          <div key={i} style={{ overflow: "hidden", paddingBottom: "0.1em", marginBottom: "-0.1em" }}>
            <div style={{ transform: `translateY(${(1 - p) * 110}%)`, opacity: Math.min(1, p * 1.6) }}>{l}</div>
          </div>
        );
      })}
    </div>
  );
}

// Letters that rise one by one (for the big names).
export function RiseLetters({ text, start, gap = 2, style }: { text: string; start: number; gap?: number; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", overflow: "hidden", paddingBottom: "0.08em", ...style }}>
      {[...text].map((ch, i) => {
        const p = progress(frame, start + i * gap, start + i * gap + 18);
        return <span key={i} style={{ display: "inline-block", transform: `translateY(${(1 - p) * 110}%)`, whiteSpace: "pre" }}>{ch}</span>;
      })}
    </div>
  );
}

// The X mark: rounded tile with an X that draws itself.
export function Mark({ size, draw = 1, bg, fg }: { size: number; draw?: number; bg: string; fg: string }) {
  const len = 16;
  const a = Math.min(1, Math.max(0, draw * 2));
  const b = Math.min(1, Math.max(0, draw * 2 - 1));
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="8" fill={bg} />
      <path d="M10.5 10.5l11 11" stroke={fg} strokeWidth="3" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - a)} />
      <path d="M21.5 10.5l-11 11" stroke={fg} strokeWidth="3" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - b)} />
    </svg>
  );
}

// Fine film grain over everything (changes every 2 frames).
export function Grain() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: 0.06, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <filter id="teaser-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(frame / 2) % 12} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#teaser-grain)" />
      </svg>
    </AbsoluteFill>
  );
}
