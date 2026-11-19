// Timing, fonts and motion helpers for the Catalyst brag video.
// The look comes from the dashboard itself: web/src/styles.css (navy, Alchemy gold, teal for the AI, Inter).

import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadSinhala } from "@remotion/google-fonts/NotoSansSinhala";
import { loadFont as loadTamil } from "@remotion/google-fonts/NotoSansTamil";
import type { CSSProperties, ReactNode } from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";

// Same families the dashboard loads, so var(--font) in styles.css resolves to them.
loadInter("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] });
loadSinhala("normal", { weights: ["400", "600"], subsets: ["sinhala"] });
loadTamil("normal", { weights: ["400", "600"], subsets: ["tamil"] });

export const FONT = `"Inter", "Noto Sans Sinhala", "Noto Sans Tamil", sans-serif`;

export const FPS = 30;
export const BEAT = 16; // 112.5 BPM
// Scene boundaries, all on the beat grid. Keep in sync with scripts/make-soundtrack.mjs (it reads this file's JSON twin).
export { default as cues } from "./cues.json";

export const C = {
  navy: "#0b1220", navy2: "#152036", line: "#1f2b45", onNavy: "#c9d0dc", onNavy2: "#8b95a7",
  gold: "#f5a524", teal: "#14b8a6", white: "#ffffff",
};

export const ease = Easing.bezier(0.22, 1, 0.36, 1);
export function progress(frame: number, a: number, b: number, easing = ease) {
  return interpolate(frame, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}
export const rise = (p: number, d = 30): CSSProperties => ({ opacity: Math.min(1, p * 1.5), transform: `translateY(${(1 - p) * d}px)` });

// A pop-in: overshoots slightly, then settles.
export function pop(frame: number, at: number, dur = 12) {
  const t = Math.max(0, Math.min(1, (frame - at) / dur));
  if (t <= 0) return 0;
  const s = 1.70158 * 1.4;
  const x = t - 1;
  return 1 + (s + 1) * x * x * x + s * x * x;
}

// Caption lines that rise out of a mask one after another.
export function Lines({ lines, start, gap = 5, style }: { lines: ReactNode[]; start: number; gap?: number; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  return (
    <div style={style}>
      {lines.map((l, i) => {
        const p = progress(frame, start + i * gap, start + i * gap + 18);
        return (
          <div key={i} style={{ overflow: "hidden", paddingBottom: "0.12em", marginBottom: "-0.12em" }}>
            <div style={{ transform: `translateY(${(1 - p) * 110}%)`, opacity: Math.min(1, p * 1.6) }}>{l}</div>
          </div>
        );
      })}
    </div>
  );
}

// Scene envelope: content rises in at the start and slides out before the cut (old out, then new in).
export function useEnvelope(length: number, inDur = 14, outDur = 10) {
  const frame = useCurrentFrame();
  const i = progress(frame, 0, inDur);
  const o = progress(frame, length - outDur, length, Easing.in(Easing.cubic));
  return { i, o, frame };
}

// Mouse pointer moving between points; `click` frames make it dip and ring.
export function Cursor({ path, clicks = [] }: { path: { f: number; x: number; y: number }[]; clicks?: number[] }) {
  const frame = useCurrentFrame();
  const fs = path.map((p) => p.f);
  const x = interpolate(frame, fs, path.map((p) => p.x), { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const y = interpolate(frame, fs, path.map((p) => p.y), { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const press = clicks.reduce((m, c) => Math.max(m, frame >= c && frame < c + 8 ? 1 - (frame - c) / 8 : 0), 0);
  const ring = clicks.map((c) => frame - c).find((d) => d >= 0 && d < 16);
  const show = progress(frame, path[0].f - 6, path[0].f + 2);
  return (
    <div style={{ position: "absolute", left: x, top: y, pointerEvents: "none", opacity: show, zIndex: 20 }}>
      {ring !== undefined && (
        <div style={{
          position: "absolute", left: -26, top: -26, width: 52, height: 52, borderRadius: "50%",
          border: `4px solid ${C.gold}`, opacity: 1 - ring / 16, transform: `scale(${0.4 + ring / 12})`,
        }} />
      )}
      <svg width="46" height="46" viewBox="0 0 24 24" style={{ transform: `scale(${1 - press * 0.15})`, transformOrigin: "0 0", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.35))" }}>
        <path d="M3 2l7.5 19 2.6-7.9L21 10.5z" fill="#fff" stroke="#0b1220" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
