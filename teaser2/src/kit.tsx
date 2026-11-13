// Shared pieces for AlchemyX Global teaser 2 (Catalyst: the interface and how it works).
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
const inter = loadInter("normal", { weights: ["500", "600", "700"], subsets: ["latin"] });
const sinhala = loadSinhala("normal", { weights: ["500", "700"], subsets: ["sinhala"] });
const tamil = loadTamil("normal", { weights: ["700"], subsets: ["tamil"] });

export const DISPLAY = `${sora.fontFamily}, ${sinhala.fontFamily}, ${tamil.fontFamily}, sans-serif`;
export const TEXT = `${inter.fontFamily}, ${sinhala.fontFamily}, ${tamil.fontFamily}, sans-serif`;

export const C = {
  orange: "#FF8A4C",
  orangeSoft: "#FFE6D8", // light orange surface (charcoal text on it)
  ink: "#1A1A1A",
  white: "#FFFFFF",
  card: "#242424",       // raised surface on charcoal
  card2: "#2E2E2E",
  line: "#363636",
  muteDark: "#A3A3A3",   // secondary text on charcoal (≥ 6:1)
  muteLight: "#555555",  // secondary text on white (≥ 7:1)
  paper: "#F4F4F2",      // off-white surface
};

type Range = [number, number];
type SceneName = "ask" | "flood" | "flow" | "build" | "grid" | "close";
export const cues = cuesJson as {
  fps: number; total: number; beat: number; drop: number;
  scenes: Record<SceneName, Range>;
  ask: Record<"typeFrom" | "typeTo" | "send" | "dots" | "reply", number>;
  flood: Record<"first" | "every" | "count", number>;
  flow: { nodes: number[]; wide: number };
  build: { drops: number[]; fold: number; folded: number };
  grid: Record<"first" | "every", number>;
  close: Record<"typeFrom" | "typeTo" | "send" | "dots" | "reply" | "hit", number>;
};
export const SCENES = cues.scenes;

export function useOrient() {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  // feed = 4:5 (1080x1350), the tallest shape Instagram/Facebook accept for normal feed posts.
  const feed = portrait && height / width < 1.5;
  return {
    portrait, feed, width, height,
    pick: <T,>(landscape: T, port: T): T => (portrait ? port : landscape),
    pick3: <T,>(landscape: T, port: T, fd: T): T => (feed ? fd : portrait ? port : landscape),
  };
}

export const ease = Easing.bezier(0.22, 1, 0.36, 1);

export function progress(frame: number, a: number, b: number, easing = ease) {
  return interpolate(frame, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

export const rise = (p: number, d = 40): CSSProperties => ({ opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * d}px)` });

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

// Text typed out character by character between frames a and b (with a blinking caret while typing).
export function typed(text: string, frame: number, a: number, b: number) {
  const chars = [...text];
  const n = Math.round(interpolate(frame, [a, b], [0, chars.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return chars.slice(0, n).join("");
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

// Grows an item's height from 0 so the rest of a bottom-anchored list slides up smoothly instead of jumping.
export function Grow({ p, max, children, style }: { p: number; max: number; children: ReactNode; style?: CSSProperties }) {
  if (p <= 0) return null;
  return (
    <div style={{ maxHeight: p * max, overflow: "hidden", flex: "none", ...style }}>
      <div style={{ opacity: Math.min(1, p * 1.5), transform: `translateY(${(1 - p) * 24}px)` }}>{children}</div>
    </div>
  );
}

// The X mark: rounded tile with an X that draws itself.
export function Mark({ size, draw = 1, bg, fg }: { size: number; draw?: number; bg: string; fg: string }) {
  const len = 16;
  const a = Math.min(1, Math.max(0, draw * 2));
  const b = Math.min(1, Math.max(0, draw * 2 - 1));
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ display: "block", flex: "none" }}>
      <rect width="32" height="32" rx="8" fill={bg} />
      <path d="M10.5 10.5l11 11" stroke={fg} strokeWidth="3" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - a)} />
      <path d="M21.5 10.5l-11 11" stroke={fg} strokeWidth="3" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - b)} />
    </svg>
  );
}

// Small line icons used in the interface mock-ups.
const ICONS: Record<string, ReactNode> = {
  spark: <path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z" />,
  inbox: <><path d="M3 13h5l1.5 3h5L16 13h5" /><path d="M5 5h14l2 8v6H3v-6z" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  wallet: <><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M16 12.5h2M3 9.5h18" /></>,
  chart: <path d="M4 19V5M4 19h16M8 15l3.5-4 3 2.5L20 7" />,
  brain: <><path d="M9 4a3 3 0 0 0-3 3v.5A3 3 0 0 0 4 13a3 3 0 0 0 2 5 3 3 0 0 0 3 2V4z" /><path d="M15 4a3 3 0 0 1 3 3v.5A3 3 0 0 1 20 13a3 3 0 0 1-2 5 3 3 0 0 1-3 2V4z" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" /></>,
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  send: <path d="M4 12l16-8-6 16-2.5-6.5z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>,
  tag: <><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.5" /></>,
  fire: <path d="M12 3c1 4 5 5.5 5 10.5a5 5 0 0 1-10 0c0-2.5 1.5-3.5 2-5.5 1 1 1.5 2 1.5 3C12 9 12 6 12 3z" />,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" /></>,
  bag: <><path d="M5 8h14l-1 13H6z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  home: <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></>,
  scissors: <><circle cx="6" cy="7" r="3" /><circle cx="6" cy="17" r="3" /><path d="M8.5 8.5L20 19M8.5 15.5L20 5" /></>,
  plus: <><rect x="3" y="3" width="18" height="18" rx="5" /><path d="M12 8v8M8 12h8" /></>,
  fork: <><path d="M7 3v8a2 2 0 0 0 4 0V3M9 13v8" /><path d="M17 3c-2 2-2 7 0 9v9" /></>,
  dumbbell: <><path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" /></>,
  plane: <path d="M10.5 13.5L3 11l1.5-1.5 8 .5 4.5-5c1-1 2.5-1 3 0s0 2-1 3l-5 4.5.5 8L13 21.5z" />,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  layers: <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></>,
};
export function Icon({ name, size = 20, color = "currentColor", stroke = 2, fill }: { name: keyof typeof ICONS | string; size?: number; color?: string; stroke?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ?? "none"} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", flex: "none" }}>
      {ICONS[name]}
    </svg>
  );
}

// Three bouncing dots ("typing…").
export function Dots({ size = 10, color = C.muteDark }: { size?: number; color?: string }) {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", gap: size * 0.6, alignItems: "center", height: size * 2 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: size, height: size, borderRadius: size, background: color,
          transform: `translateY(${Math.sin((frame - i * 4) / 3.2) * size * 0.35}px)`, opacity: 0.55 + 0.45 * Math.max(0, Math.sin((frame - i * 4) / 3.2)),
        }} />
      ))}
    </div>
  );
}

export function Avatar({ text, size, bg = "#3A3A3A", fg = C.white }: { text: string; size: number; bg?: string; fg?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: bg, color: fg, flex: "none",
      display: "grid", placeItems: "center", fontFamily: DISPLAY, fontWeight: 700, fontSize: size * 0.36,
    }}>{text}</div>
  );
}

export function Pill({ children, bg, fg, size = 20, style }: { children: ReactNode; bg: string; fg: string; size?: number; style?: CSSProperties }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: size * 0.4, background: bg, color: fg, borderRadius: 999,
      padding: `${size * 0.32}px ${size * 0.75}px`, fontFamily: TEXT, fontWeight: 700, fontSize: size, lineHeight: 1.1, whiteSpace: "nowrap", ...style,
    }}>{children}</span>
  );
}

// Fine film grain over everything (changes every 2 frames).
export function Grain() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: 0.06, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <filter id="teaser2-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(frame / 2) % 12} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#teaser2-grain)" />
      </svg>
    </AbsoluteFill>
  );
}
