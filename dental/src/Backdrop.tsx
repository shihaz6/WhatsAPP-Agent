// The grounds under every scene (charcoal → white → charcoal night → orange) and the orange
// "smile arc" wipe that carries the film from one ground to the next.

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, FONT, H, W, clamp01, cues, easeInOut, lerp, prog } from "./kit";

const S = cues.scenes;
const WIPE = cues.wipe;

export type Ground = "char" | "white" | "orange";
export function groundAt(f: number): Ground {
  if (f < S.turn[0]) return "char";
  if (f < S.urgent[0]) return "white";
  if (f < S.close[0]) return "char";
  return "orange";
}

const WIPES: { cut: number; fill: string; ring: string }[] = [
  { cut: S.turn[0], fill: C.white, ring: C.orange },
  { cut: S.urgent[0], fill: C.char, ring: C.orange },
  { cut: S.close[0], fill: C.orange, ring: C.white },
];

/** Horizontal whip-pan between the demo and the languages: offset of the grid, in px. */
export function panAt(f: number) {
  const a = prog(f, S.demo[1] - 18, S.demo[1], (t) => t * t);
  const b = prog(f, S.langs[0], S.langs[0] + 18);
  return -(a * 0.5 + b * 0.5) * W * 0.35;
}

const DOTS = Array.from({ length: 40 }, (_, i) => {
  const r = (n: number) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  return { x: r(1) * W, y: r(2) * H, s: 1.5 + r(3) * 3.5, v: 0.2 + r(4) * 0.6, ph: r(5) * 6.28 };
});

function Dark({ f, night }: { f: number; night: boolean }) {
  const t = f / 30;
  const gx = 1500 + Math.sin(t * 0.5) * 120, gy = 300 + Math.cos(t * 0.4) * 80;
  return (
    <AbsoluteFill style={{ background: C.char }}>
      <div style={{ position: "absolute", left: gx - 700, top: gy - 700, width: 1400, height: 1400, borderRadius: "50%", background: `radial-gradient(circle, rgba(255,138,76,${night ? 0.16 : 0.13}) 0%, rgba(255,138,76,0) 60%)` }} />
      <div style={{ position: "absolute", left: -400, top: 500, width: 1200, height: 1200, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0) 60%)" }} />
      {DOTS.map((d, i) => (
        <div key={i} style={{ position: "absolute", left: d.x, top: (d.y - f * d.v * 0.6 + H * 2) % H, width: d.s, height: d.s, borderRadius: d.s, background: "#fff", opacity: 0.05 + 0.06 * Math.sin(t * 1.3 + d.ph) }} />
      ))}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(0,0,0,0.45) 100%)" }} />
    </AbsoluteFill>
  );
}

function Light({ f }: { f: number }) {
  const t = f / 30;
  const pan = panAt(f);
  const ox = ((pan % 80) + 80) % 80;
  return (
    <AbsoluteFill style={{ background: C.white }}>
      <AbsoluteFill style={{
        backgroundImage: `linear-gradient(${C.rule} 1.5px, transparent 1.5px), linear-gradient(90deg, ${C.rule} 1.5px, transparent 1.5px)`,
        backgroundSize: "80px 80px", backgroundPosition: `${ox}px 0`, opacity: 0.55,
        maskImage: "radial-gradient(ellipse at 50% 45%, black 20%, transparent 75%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 45%, black 20%, transparent 75%)",
      }} />
      <div style={{ position: "absolute", left: 1250 + Math.sin(t * 0.4) * 80 + pan * 0.4, top: -380, width: 1100, height: 1100, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,138,76,0.16) 0%, rgba(255,138,76,0) 62%)" }} />
      <div style={{ position: "absolute", left: -350 + pan * 0.2, top: 600, width: 900, height: 900, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,138,76,0.08) 0%, rgba(255,138,76,0) 62%)" }} />
    </AbsoluteFill>
  );
}

function Orange({ f }: { f: number }) {
  const t = f / 30;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, #FF9A62 0%, ${C.orange} 55%, #F57A3A 100%)` }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 9 }, (_, i) => {
          const r = 700 + i * 150 + ((f * 1.2) % 150);
          return <circle key={i} cx={W / 2} cy={-560} r={r} fill="none" stroke="#fff" strokeWidth={2} opacity={0.12 * clamp01(1 - (r - 700) / 1350)} />;
        })}
      </svg>
      <div style={{ position: "absolute", left: 960 - 600 + Math.sin(t * 0.6) * 40, top: 540 - 600, width: 1200, height: 1200, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 60%)" }} />
    </AbsoluteFill>
  );
}

export function Backdrop() {
  const f = useCurrentFrame();
  const g = groundAt(f);
  if (g === "char") return <Dark f={f} night={f >= S.urgent[0]} />;
  if (g === "white") return <Light f={f} />;
  return <Orange f={f} />;
}

/** The smile wipe: a huge circle dropping from above the frame, its lower edge a smile, led by a ring. */
export function Wipes() {
  const f = useCurrentFrame();
  const w = WIPES.find((x) => f >= x.cut - WIPE && f < x.cut);
  if (!w) return null;
  const p = prog(f, w.cut - WIPE, w.cut, easeInOut);
  const cy = -1050;
  const r = lerp(1000, 2480, p);
  const band = 120;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, zIndex: 40 }}>
      <circle cx={W / 2} cy={cy} r={r} fill={w.ring} />
      <circle cx={W / 2} cy={cy} r={Math.max(0, r - band * 0.55)} fill={w.ring === C.orange ? "#FFB085" : "rgba(255,255,255,0.85)"} opacity={0.5} />
      <circle cx={W / 2} cy={cy} r={Math.max(0, r - band)} fill={w.fill} />
    </svg>
  );
}

/** "Illustrative demo · Sample data", always on, coloured for the ground under it. */
export function Note() {
  const f = useCurrentFrame();
  const g = groundAt(f);
  const col = g === "white" ? "rgba(26,26,26,0.5)" : g === "orange" ? "rgba(26,26,26,0.62)" : "rgba(255,255,255,0.5)";
  const bd = g === "white" ? "rgba(26,26,26,0.12)" : g === "orange" ? "rgba(26,26,26,0.2)" : "rgba(255,255,255,0.14)";
  return (
    <div style={{ position: "absolute", right: 40, bottom: 32, zIndex: 60, fontFamily: FONT, fontSize: 16, fontWeight: 700, letterSpacing: 1.2, color: col, padding: "7px 15px", borderRadius: 999, border: `1.5px solid ${bd}`, display: "flex", gap: 10, alignItems: "center" }}>
      <span style={{ width: 7, height: 7, borderRadius: 7, background: g === "orange" ? C.char : C.orange }} />
      Illustrative demo <span style={{ opacity: 0.45 }}>|</span> Sample data
    </div>
  );
}
