// Grounds under the scenes (charcoal → white → charcoal night → white → orange) and the orange ring wipe between them.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, FONT, H, W, cues, easeInOut, lerp, prog } from "./kit";

const S = cues.scenes;
const WIPE = cues.wipe;

export type Ground = "char" | "white" | "orange";
export function groundAt(f: number): Ground {
  if (f < S.price[0]) return "char";
  if (f < S.night[0]) return "white";
  if (f < S.unknown[0]) return "char";
  if (f < S.close[0]) return "white";
  return "orange";
}

const WIPES: { cut: number; fill: string; ring: string }[] = [
  { cut: S.price[0], fill: C.white, ring: C.orange },
  { cut: S.night[0], fill: C.char, ring: C.orange },
  { cut: S.unknown[0], fill: C.white, ring: C.orange },
  { cut: S.close[0], fill: C.orange, ring: C.white },
];

function Dark({ f }: { f: number }) {
  const t = f / 30;
  return (
    <AbsoluteFill style={{ background: C.char }}>
      <div style={{ position: "absolute", left: 540 - 800 + Math.sin(t * 0.5) * 100, top: 200 - 800, width: 1600, height: 1600, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,138,76,0.15) 0%, rgba(255,138,76,0) 60%)" }} />
      <div style={{ position: "absolute", left: -500, top: 1200, width: 1400, height: 1400, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 60%)" }} />
    </AbsoluteFill>
  );
}

function Light({ f }: { f: number }) {
  const t = f / 30;
  return (
    <AbsoluteFill style={{ background: C.white }}>
      <AbsoluteFill style={{
        backgroundImage: `linear-gradient(${C.rule} 1.5px, transparent 1.5px), linear-gradient(90deg, ${C.rule} 1.5px, transparent 1.5px)`,
        backgroundSize: "90px 90px", opacity: 0.5,
        maskImage: "radial-gradient(ellipse at 50% 40%, black 15%, transparent 70%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, black 15%, transparent 70%)",
      }} />
      <div style={{ position: "absolute", left: 500 + Math.sin(t * 0.4) * 80, top: -500, width: 1200, height: 1200, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,138,76,0.16) 0%, rgba(255,138,76,0) 62%)" }} />
    </AbsoluteFill>
  );
}

function Orange({ f }: { f: number }) {
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, #FF9A62 0%, ${C.orange} 55%, #F57A3A 100%)` }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 8 }, (_, i) => {
          const r = 300 + i * 160 + ((f * 1.4) % 160);
          return <circle key={i} cx={W / 2} cy={H + 200} r={r} fill="none" stroke="#fff" strokeWidth={2.5} opacity={0.14 * Math.max(0, 1 - (r - 300) / 1300)} />;
        })}
      </svg>
    </AbsoluteFill>
  );
}

export function Backdrop() {
  const f = useCurrentFrame();
  const g = groundAt(f);
  if (g === "char") return <Dark f={f} />;
  if (g === "white") return <Light f={f} />;
  return <Orange f={f} />;
}

/** A circle rising from below the frame, led by a ring, that floods the next ground in. */
export function Wipes() {
  const f = useCurrentFrame();
  const w = WIPES.find((x) => f >= x.cut - WIPE && f < x.cut);
  if (!w) return null;
  const p = prog(f, w.cut - WIPE, w.cut, easeInOut);
  const r = lerp(0, 2300, p);
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, zIndex: 40 }}>
      <circle cx={W / 2} cy={H + 100} r={r} fill={w.ring} />
      <circle cx={W / 2} cy={H + 100} r={Math.max(0, r - 130)} fill={w.fill} />
    </svg>
  );
}

/** "Sample data", always on screen, coloured for the ground under it. */
export function Note() {
  const f = useCurrentFrame();
  const g = groundAt(f);
  const col = g === "white" ? "rgba(26,26,26,0.62)" : g === "orange" ? "rgba(26,26,26,0.75)" : "rgba(255,255,255,0.7)";
  const bd = g === "white" ? "rgba(26,26,26,0.16)" : g === "orange" ? "rgba(26,26,26,0.25)" : "rgba(255,255,255,0.2)";
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 44, zIndex: 60, display: "flex", justifyContent: "center" }}>
      <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 700, letterSpacing: 1.5, color: col, padding: "10px 26px", borderRadius: 999, border: `2px solid ${bd}`, display: "flex", gap: 14, alignItems: "center" }}>
        <span style={{ width: 10, height: 10, borderRadius: 10, background: g === "orange" ? C.char : C.orange }} />
        SAMPLE DATA <span style={{ opacity: 0.45 }}>|</span> Illustrative demo
      </div>
    </div>
  );
}
