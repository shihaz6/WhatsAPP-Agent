// Full-frame transitions drawn over the scenes. Each one covers the cut, so scenes never need to overlap.
//  360  strike: a lightning flash for the drop (Catalyst arrives)
//  480  bubble: an orange chat bubble swells out of the logo, then lifts away like a swipe
//  780  streaks: horizontal speed lines over the whip-pan (the push itself lives in the scene shell)
//  960  shutter: charcoal slats close from both sides and open the other way
//  1140 flood: the frame fills orange from the bottom with a moving wave edge (the offer lives on orange)
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, H, W, clamp01, cues, ease, easeIn, prog, rng } from "./kit";

const S = cues.scenes;

function Strike({ f }: { f: number }) {
  const t = f - S.turn[0];
  if (t < -2 || t > 14) return null;
  const flash = t < 0 ? 0 : Math.exp(-t / 3.5);
  // a jagged bolt from the top to the logo
  const r = rng(5 + Math.floor(t / 2));
  let x = 540 + (r() - 0.5) * 200, y = -20;
  const pts = [[x, y]];
  while (y < 760) { y += 60 + r() * 50; x += (r() - 0.5) * 150; pts.push([x, Math.min(y, 760)]); }
  pts.push([540, 760]);
  const d = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(0)} ${py.toFixed(0)}`).join(" ");
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 40%, rgba(255,255,255,${0.9 * flash}), rgba(255,138,76,${0.55 * flash}) 45%, rgba(255,138,76,0) 80%)` }} />
      {t >= 0 && t < 6 && (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 1 - t / 6 }}>
          <path d={d} stroke={C.orange} strokeWidth={22} fill="none" strokeLinejoin="round" style={{ filter: "blur(10px)" }} />
          <path d={d} stroke="#fff" strokeWidth={7} fill="none" strokeLinejoin="round" />
        </svg>
      )}
    </AbsoluteFill>
  );
}

function BubbleWipe({ f }: { f: number }) {
  const T = S.demo[0];
  if (f < T - 14 || f > T + 14) return null;
  const grow = prog(f, T - 14, T, easeIn);
  const lift = prog(f, T, T + 14, (x) => x * x);
  const s = 0.02 + grow * 7.5;
  const blur = lift * 40;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", transform: `translateY(${-lift * H * 1.25}px)`, filter: blur > 0.5 ? `blur(${blur}px)` : undefined }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <g transform={`translate(540 760) scale(${s}) translate(-120 -100)`}>
          <path d="M30 0h180a30 30 0 0 1 30 30v120a30 30 0 0 1-30 30H95l-55 40v-40H30A30 30 0 0 1 0 150V30A30 30 0 0 1 30 0z" fill={C.orange} />
        </g>
      </svg>
      {lift > 0 && <AbsoluteFill style={{ background: C.orange, top: H * 0.6 }} />}
    </AbsoluteFill>
  );
}

function Streaks({ f }: { f: number }) {
  const T = S.langs[0];
  const t = f - (T - 10);
  if (t < 0 || t > 20) return null;
  const r = rng(3);
  const env = Math.sin((t / 20) * Math.PI);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: env }}>
      {Array.from({ length: 26 }, (_, i) => {
        const y = r() * H, len = 300 + r() * 900, sp = 0.6 + r() * 1.2;
        const x = W + 200 - ((t * 140 * sp + r() * 600) % (W + len + 400));
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: len, height: 2 + r() * 5, borderRadius: 6, background: r() < 0.4 ? C.orange : "rgba(255,255,255,0.7)", filter: "blur(1.5px)" }} />;
      })}
    </AbsoluteFill>
  );
}

function Shutter({ f }: { f: number }) {
  const T = S.trust[0];
  if (f < T - 11 || f > T + 11) return null;
  const close = prog(f, T - 11, T, easeIn);
  const open = prog(f, T, T + 11, ease);
  const N = 8, h = H / N;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: N }, (_, i) => {
        const dir = i % 2 ? 1 : -1;
        const lag = (i % 4) * 0.06;
        const c = clamp01((close - lag) / (1 - lag));
        const o = clamp01((open - lag) / (1 - lag));
        // closed slat sits at x=0; it comes in from one side and leaves through the other
        const x = f < T ? dir * (1 - c) * W : -dir * o * W;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: i * h - 1, width: W, height: h + 2, background: "#151515", boxShadow: `inset ${dir > 0 ? 8 : -8}px 0 0 ${C.orange}` }} />
        );
      })}
    </AbsoluteFill>
  );
}

function Flood({ f }: { f: number }) {
  const T = S.offer[0];
  if (f < T - 20 || f >= T + 2) return null;
  const p = prog(f, T - 20, T, (x) => x * x * (3 - 2 * x));
  const top = H - p * (H + 220);
  const ph = f * 0.35;
  let d = `M0 ${H} L0 ${top}`;
  for (let x = 0; x <= W; x += 30) d += ` L${x} ${top + Math.sin(x / 140 + ph) * 46 + Math.sin(x / 61 - ph * 1.7) * 18}`;
  d += ` L${W} ${H} Z`;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <path d={d} fill={C.ember} transform="translate(0 -40)" opacity={0.85} />
        <path d={d} fill={C.orange} />
      </svg>
    </AbsoluteFill>
  );
}

export function Transitions() {
  const f = useCurrentFrame();
  return (
    <>
      <Strike f={f} />
      <BubbleWipe f={f} />
      <Streaks f={f} />
      <Shutter f={f} />
      <Flood f={f} />
    </>
  );
}
