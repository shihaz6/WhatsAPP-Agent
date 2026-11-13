// Shared pieces for the Catalyst promo (landscape 1920x1080 and vertical 1080x1920).
//
// Legibility rules applied everywhere:
//  - Inter 700/800 only. Headlines 100-150px, supporting lines >= 48px.
//  - Text is white or orange on the dark background. Text over screenshots sits on a dark scrim.
//  - Every text block lives inside a 10% safe margin and is faded/sprung in and out.

import { loadFont } from "@remotion/google-fonts/Inter";
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import cuesJson from "./cues.json";

const inter = loadFont("normal", { weights: ["700", "800"], subsets: ["latin", "latin-ext"] });
// System fallbacks cover the Chinese, Arabic and Hindi customer messages.
export const FONT = `${inter.fontFamily}, "Segoe UI", "Microsoft YaHei", "Nirmala UI", sans-serif`;

export const C = {
  bg1: "#15181C",
  bg2: "#1E2228",
  card: "#1F2630",
  card2: "#252D38",
  line: "rgba(255,255,255,0.10)",
  orange: "#FF6B1A",
  green: "#25D366",
  white: "#FFFFFF",
  ink: "#15181C", // dark text, only ever used on orange/green UI pills
  scrim: "rgba(13,15,18,0.86)",
};

export const SHADOW = "0 2px 12px rgba(0,0,0,.6)";

type Range = [number, number];
export const cues = cuesJson as {
  fps: number; total: number; pings: number[]; words: number[]; beats: number[]; ctaSwap: number;
  scenes: Record<"night" | "pain" | "turn" | "reveal" | "features" | "cta", Range>;
};
export const SCENES = cues.scenes;

export function useOrient() {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  // 10% safe margin on every side for all text.
  return {
    portrait, width, height,
    safeX: Math.round(width * 0.1), safeY: Math.round(height * 0.1),
    pick: <T,>(landscape: T, vertical: T): T => (portrait ? vertical : landscape),
  };
}

export const ease = Easing.bezier(0.22, 1, 0.36, 1);

export function progress(frame: number, a: number, b: number, easing = ease) {
  return interpolate(frame, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

export function useSpring(start: number, config: { damping?: number; stiffness?: number; mass?: number } = { damping: 15, stiffness: 160, mass: 0.8 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - start, fps, config });
}

// Decaying camera shake after each hit frame.
export function shake(frame: number, hits: number[], amp = 12) {
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

// Text block that springs in at `start` and fades out over the 8 frames before `end`.
export function Appear({ start, end, children, style, rise = 40 }: {
  start: number; end?: number; children: ReactNode; style?: CSSProperties; rise?: number;
}) {
  const frame = useCurrentFrame();
  const s = useSpring(start);
  const out = end === undefined ? 0 : progress(frame, end - 8, end);
  return (
    <div style={{ ...style, opacity: Math.min(1, s * 1.4) * (1 - out), transform: `translateY(${(1 - s) * rise - out * 20}px)` }}>
      {children}
    </div>
  );
}

export const headline = (size: number): CSSProperties => ({
  fontFamily: FONT, fontWeight: 800, fontSize: size, lineHeight: 1.06, letterSpacing: "-0.035em",
  color: C.white, textShadow: SHADOW, margin: 0,
});

export const O = ({ children }: { children: ReactNode }) => <span style={{ color: C.orange }}>{children}</span>;

// Charcoal gradient with a faint grid and an optional orange glow.
export function Backdrop({ glow = 0.12, at = "50% 45%" }: { glow?: number; at?: string }) {
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${C.bg1} 0%, ${C.bg2} 100%)` }}>
      <AbsoluteFill style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
        backgroundSize: "80px 80px",
        WebkitMaskImage: "radial-gradient(ellipse at 50% 45%, black 20%, transparent 75%)",
      }} />
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${at}, rgba(255,107,26,${glow}), transparent 55%)` }} />
    </AbsoluteFill>
  );
}

// Logo: lightning bolt in a rounded orange square.
export function Mark({ size, glow = 1 }: { size: number; glow?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28, flex: "none",
      background: "linear-gradient(140deg, #FF8A3D, #FF6B1A 55%, #E2540A)",
      boxShadow: `0 ${size * 0.12}px ${size * 0.4}px rgba(255,107,26,${0.45 * glow})`,
      display: "grid", placeItems: "center",
    }}>
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="#fff" /></svg>
    </div>
  );
}

// Letters that rise one by one (for the wordmark).
export function RiseLetters({ text, start, gap = 2, style }: { text: string; start: number; gap?: number; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", overflow: "hidden", paddingBottom: "0.1em", ...style }}>
      {[...text].map((ch, i) => {
        const p = progress(frame, start + i * gap, start + i * gap + 16);
        return <span key={i} style={{ display: "inline-block", transform: `translateY(${(1 - p) * 110}%)`, whiteSpace: "pre" }}>{ch}</span>;
      })}
    </div>
  );
}

// Caption on a solid dark scrim, for text placed over screenshots.
export function Caption({ start, end, children }: { start: number; end: number; children: ReactNode }) {
  const { portrait, safeX, pick } = useOrient();
  return (
    <div style={{
      position: "absolute", left: safeX, right: safeX, display: "flex", justifyContent: "center",
      ...(portrait ? { top: 1380 } : { bottom: 120 }),
    }}>
      <Appear start={start} end={end} rise={30}>
        <div style={{
          background: C.scrim, border: `2px solid ${C.line}`, borderRadius: 30, padding: pick("22px 44px", "26px 40px"),
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
          fontFamily: FONT, fontWeight: 800, fontSize: pick(58, 56), lineHeight: 1.15, letterSpacing: "-0.02em",
          color: C.white, textShadow: SHADOW, textAlign: "center",
        }}>{children}</div>
      </Appear>
    </div>
  );
}
