// One continuous background for the whole film. Its mood follows the story:
// warm at the shop, tense under the pings, cold and grey at the loss, an orange eruption at the turn.

import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, H, W, cues, prog } from "./kit";

const S = cues.scenes;
const K = (pairs: [number, number][], f: number) =>
  interpolate(f, pairs.map((p) => p[0]), pairs.map((p) => p[1]), { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// 0 = dead, 1 = full orange energy.
const WARM: [number, number][] = [
  [0, 0.35], [60, 0.55], [S.meet[1] - 20, 0.6], [S.pain[0] + 20, 0.42], [S.pain[1] - 40, 0.55],
  [S.loss[0] + 30, 0.3], [S.loss[0] + 180, 0.1], [S.loss[1] - 4, 0.02],
  [S.turn[0], 1.5], [S.turn[0] + 45, 0.85], [S.how[0], 0.75], [S.control[0], 0.7],
  [S.close[0], 0.8], [S.close[0] + cues.close.hit, 1.25], [S.close[0] + cues.close.hit + 60, 0.95], [cues.total, 0.85],
];
// 0 = colour, 1 = drained grey (the loss).
const COLD: [number, number][] = [
  [S.loss[0] + 120, 0], [S.loss[0] + 220, 0.75], [S.loss[1] - 2, 0.85], [S.turn[0], 0],
];
// Where the main light sits (y).
const FOCUS: [number, number][] = [
  [0, 980], [S.pain[0], 1120], [S.loss[0], 1000], [S.turn[0], 860], [S.how[0], 1000], [S.control[0], 1060], [S.close[0], 940], [cues.total, 900],
];

// Deterministic dust.
const DUST = Array.from({ length: 46 }, (_, i) => {
  const r = (n: number) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  return { x: r(1) * W, y: r(2) * H, s: 2 + r(3) * 7, v: 0.25 + r(4) * 0.9, ph: r(5) * 6.28, hot: r(6) > 0.55, depth: r(7) };
});

export function Backdrop() {
  const f = useCurrentFrame();
  const warm = K(WARM, f);
  const cold = K(COLD, f);
  const fy = K(FOCUS, f);

  // Pain: every incoming message thumps the light a little.
  let ping = 0;
  for (const p of cues.pain.pings) { const d = f - (S.pain[0] + p); if (d >= 0 && d < 20) ping = Math.max(ping, Math.exp(-d / 5)); }
  const energy = warm + ping * 0.25;

  // The clock face: a slow drift, a full hour sweep during the "an hour later" jump, a kick at the turn.
  const jump = prog(f, S.loss[0] + cues.loss.jump, S.loss[0] + cues.loss.jumpEnd);
  const kick = prog(f, S.turn[0], S.turn[0] + 50);
  const rot = f * 0.045 + jump * 360 + kick * 30;
  const minuteHand = f * 0.6 + jump * 360 * 1 + kick * 90;

  // Turn: shockwave and a light sweep.
  const tl = f - S.turn[0];
  const shock = tl >= 0 && tl < 70 ? tl / 70 : -1;
  const hit = S.close[0] + cues.close.hit;
  const hl = f - hit;
  const shock2 = hl >= 0 && hl < 70 ? hl / 70 : -1;
  const sweep = prog(f, S.turn[0] + 2, S.turn[0] + 40);

  const t = f / 30;
  const bx = (a: number, b: number, s: number) => Math.sin(t * s + a) * b;

  return (
    <AbsoluteFill style={{ background: C.char, overflow: "hidden" }}>
      {/* base: charcoal with a deeper floor */}
      <AbsoluteFill style={{ background: `linear-gradient(180deg, #1d1d1d 0%, ${C.char} 45%, #121212 100%)` }} />

      {/* aurora: three slow lights */}
      <AbsoluteFill style={{
        opacity: Math.min(1.3, energy),
        background: [
          `radial-gradient(620px 760px at ${540 + bx(0, 160, 0.21)}px ${fy + bx(1, 120, 0.17)}px, rgba(255,138,76,0.42), rgba(255,138,76,0.12) 45%, transparent 72%)`,
          `radial-gradient(520px 520px at ${160 + bx(2, 120, 0.13)}px ${360 + bx(3, 140, 0.19)}px, rgba(224,96,42,0.30), transparent 70%)`,
          `radial-gradient(560px 600px at ${940 + bx(4, 110, 0.16)}px ${1620 + bx(5, 120, 0.12)}px, rgba(255,160,106,0.24), transparent 70%)`,
        ].join(","),
      }} />
      {/* a neutral fill light so the cold scene still has depth */}
      <AbsoluteFill style={{
        background: `radial-gradient(900px 1100px at 540px ${fy}px, rgba(255,255,255,${0.05 + 0.05 * cold}), transparent 70%)`,
      }} />

      {/* god rays from the top, like light through a shop window */}
      <AbsoluteFill style={{
        opacity: 0.55 * Math.min(1, energy),
        background: `conic-gradient(from ${180 + bx(0, 6, 0.1)}deg at 50% -8%, transparent 0deg, rgba(255,138,76,0.10) 8deg, transparent 15deg, transparent 22deg, rgba(255,255,255,0.05) 27deg, transparent 33deg, transparent 300deg, rgba(255,255,255,0.05) 330deg, transparent 336deg, rgba(255,138,76,0.09) 345deg, transparent 352deg)`,
        maskImage: "linear-gradient(180deg, black 0%, black 25%, transparent 75%)",
        WebkitMaskImage: "linear-gradient(180deg, black 0%, black 25%, transparent 75%)",
      }} />

      {/* dot grid, fading to the edges */}
      <AbsoluteFill style={{
        backgroundImage: "radial-gradient(rgba(255,255,255,0.11) 1.6px, transparent 1.8px)",
        backgroundSize: "44px 44px",
        backgroundPosition: `${(f * 0.15) % 44}px ${(f * 0.35) % 44}px`,
        maskImage: `radial-gradient(760px 1000px at 540px ${fy}px, rgba(0,0,0,0.9), transparent 75%)`,
        WebkitMaskImage: `radial-gradient(760px 1000px at 540px ${fy}px, rgba(0,0,0,0.9), transparent 75%)`,
        opacity: 0.55,
      }} />

      {/* the giant clock face */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="ringfade" cx="50%" cy="50%" r="50%">
            <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#fff" stopOpacity="1" />
          </radialGradient>
        </defs>
        <g transform={`translate(540 ${fy}) rotate(${rot})`}>
          {Array.from({ length: 120 }, (_, i) => {
            const major = i % 10 === 0;
            const r0 = major ? 690 : 712, r1 = 735;
            const a = (i / 120) * Math.PI * 2;
            return (
              <line key={i} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * r1} y2={Math.sin(a) * r1}
                stroke={major ? C.orange : "#fff"} strokeOpacity={major ? 0.16 + 0.3 * Math.min(1, energy) : 0.07} strokeWidth={major ? 4 : 2} strokeLinecap="round" />
            );
          })}
          <circle r={760} fill="none" stroke="#fff" strokeOpacity={0.05} strokeWidth={2} />
          <circle r={520} fill="none" stroke="#fff" strokeOpacity={0.04} strokeWidth={2} strokeDasharray="4 18" />
          <circle r={1020} fill="none" stroke={C.orange} strokeOpacity={0.05 + 0.08 * Math.min(1, energy)} strokeWidth={2} />
        </g>
        {/* a faint sweeping minute hand */}
        <g transform={`translate(540 ${fy}) rotate(${minuteHand})`} opacity={0.5 + 0.5 * jump * (1 - jump) * 4}>
          <defs>
            <linearGradient id="hand" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={C.orange} stopOpacity="0" />
              <stop offset="1" stopColor={C.orange} stopOpacity={0.22 + 0.4 * jump * (1 - jump) * 4} />
            </linearGradient>
          </defs>
          <path d="M0 0 L700 -2 L700 2 Z" fill="url(#hand)" />
          <path d="M0 0 L700 -140 A715 715 0 0 1 700 0 Z" fill={C.orange} opacity={0.025 + 0.05 * Math.min(1, energy)} />
        </g>
        {/* shockwaves */}
        {[shock, shock2].map((s, i) => s >= 0 && (
          <g key={i}>
            <circle cx={540} cy={i ? 700 : fy} r={60 + s * 1300} fill="none" stroke={C.orange} strokeOpacity={(1 - s) * 0.7} strokeWidth={4 + 30 * (1 - s)} />
            <circle cx={540} cy={i ? 700 : fy} r={20 + s * 900} fill="none" stroke="#fff" strokeOpacity={(1 - s) * 0.35} strokeWidth={2 + 8 * (1 - s)} />
          </g>
        ))}
      </svg>

      {/* dust and bokeh */}
      <AbsoluteFill>
        {DUST.map((d, i) => {
          const y = ((d.y - f * d.v * (0.6 + energy * 0.8)) % (H + 80) + H + 80) % (H + 80) - 40;
          const x = d.x + Math.sin(t * 0.5 + d.ph) * 24;
          const tw = 0.5 + 0.5 * Math.sin(t * 1.3 + d.ph * 3);
          const big = d.depth > 0.86;
          return (
            <div key={i} style={{
              position: "absolute", left: x, top: y, width: big ? d.s * 5 : d.s, height: big ? d.s * 5 : d.s, borderRadius: 999,
              background: d.hot ? C.orange : "#fff",
              opacity: (big ? 0.06 : 0.12 + 0.3 * tw) * (d.hot ? Math.min(1, energy + 0.1) : 0.7),
              filter: big ? "blur(6px)" : d.depth > 0.6 ? "blur(1.5px)" : undefined,
            }} />
          );
        })}
      </AbsoluteFill>

      {/* light sweep at the turn */}
      {sweep > 0 && sweep < 1 && (
        <AbsoluteFill style={{
          background: `linear-gradient(115deg, transparent ${sweep * 160 - 40}%, rgba(255,176,133,0.32) ${sweep * 160 - 20}%, transparent ${sweep * 160}%)`,
          mixBlendMode: "screen",
        }} />
      )}

      {/* drained colour at the loss */}
      <AbsoluteFill style={{ background: "#151515", opacity: cold * 0.55, mixBlendMode: "saturation" }} />
      <AbsoluteFill style={{ background: "rgba(10,10,10,1)", opacity: cold * 0.3 }} />

      {/* film grain */}
      <svg width={W / 2} height={H / 2} viewBox={`0 0 ${W / 2} ${H / 2}`} style={{ position: "absolute", inset: 0, width: W, height: H, opacity: 0.09, mixBlendMode: "overlay" }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={f % 12} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>

      {/* vignette */}
      <AbsoluteFill style={{ background: `radial-gradient(1100px 1500px at 540px ${fy}px, transparent 50%, rgba(0,0,0,${0.55 + cold * 0.25}) 100%)` }} />
    </AbsoluteFill>
  );
}
