// One continuous background for the tourism film: a dotted globe with messages flying in to Sri Lanka,
// a night sky that turns to dawn, ocean lines along the bottom, and the brand's orange light following the mood.

import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, FONT, H, W, clamp01, cues, prog } from "./kit";

const S = cues.scenes;
const K = (pairs: [number, number][], f: number) =>
  interpolate(f, pairs.map((p) => p[0]), pairs.map((p) => p[1]), { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const P = S.problem[0], T = S.turn[0], HIT = S.close[0] + cues.close.hit;

const WARM: [number, number][] = [
  [0, 0.4], [S.hook[1], 0.55], [P + 20, 0.3], [P + 100, 0.22], [P + 140, 0.6], [P + 190, 0.35], [S.problem[1] - 2, 0.12],
  [T, 1.5], [T + 45, 0.9], [S.langs[0], 0.85], [S.wake[0], 0.9], [S.close[0], 0.7], [HIT, 1.3], [HIT + 60, 0.95], [cues.total, 0.85],
];
const NIGHT: [number, number][] = [[0, 1], [P + 70, 1], [P + 125, 0], [S.problem[1] - 30, 0.3], [T, 0], [S.close[0], 0], [S.close[0] + 30, 0.6], [cues.total, 0.6]];
const DAWN: [number, number][] = [[P + 60, 0], [P + 120, 1], [P + 185, 0.7], [S.problem[1], 0.2], [S.wake[0], 0.2], [S.wake[0] + 30, 0.9], [S.wake[1], 0.6], [S.close[0] + 20, 0.2]];
// globe placement: [frame, cx, cy, radius, opacity]
const GLOBE: [number, number, number, number, number][] = [
  [0, 540, 1380, 470, 1], [S.hook[1] - 30, 540, 1360, 470, 1], [P + 30, 540, 1820, 620, 0.45], [S.problem[1] - 10, 540, 1900, 700, 0.3],
  [T, 540, 960, 430, 0.9], [T + 60, 540, 980, 470, 0.7], [S.answer[0] + 20, 540, 2150, 980, 0.55], [S.wake[1], 540, 2150, 980, 0.55],
  [S.close[0] + 30, 540, 2080, 900, 0.6], [cues.total, 540, 2050, 880, 0.7],
];
const g = (i: number, f: number) => K(GLOBE.map((r) => [r[0], r[i]] as [number, number]), f);

const D2R = Math.PI / 180;
type V = [number, number, number];
const vec = (lat: number, lon: number): V => [Math.cos(lat * D2R) * Math.cos(lon * D2R), Math.cos(lat * D2R) * Math.sin(lon * D2R), Math.sin(lat * D2R)];

// globe dots, generated once
const DOTS: V[] = [];
for (let lat = -80; lat <= 80; lat += 5) {
  const n = Math.max(6, Math.round(72 * Math.cos(lat * D2R)));
  for (let k = 0; k < n; k++) DOTS.push(vec(lat, (k / n) * 360 + (lat % 10 ? 2.5 : 0)));
}
const SL = vec(7.9, 80.7);
const CITIES: { name: string; time: string; v: V; side: number }[] = [
  { name: "London", time: "9:42 PM", v: vec(51.5, -0.1), side: -1 },
  { name: "Tokyo", time: "6:42 AM", v: vec(35.7, 139.7), side: -1 },
  { name: "Melbourne", time: "8:42 AM", v: vec(-37.8, 145), side: 1 },
  { name: "Chennai", time: "3:12 AM", v: vec(13.1, 80.3), side: 1 },
  { name: "Dubai", time: "1:42 AM", v: vec(25.2, 55.3), side: -1 },
];

const STARS = Array.from({ length: 70 }, (_, i) => {
  const r = (n: number) => { const x = Math.sin(i * 91.7 + n * 47.3) * 43758.5453; return x - Math.floor(x); };
  return { x: r(1) * W, y: r(2) * H * 0.75, s: 1 + r(3) * 2.6, ph: r(4) * 6.28 };
});
const DUST = Array.from({ length: 36 }, (_, i) => {
  const r = (n: number) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  return { x: r(1) * W, y: r(2) * H, s: 2 + r(3) * 6, v: 0.25 + r(4) * 0.8, ph: r(5) * 6.28, hot: r(6) > 0.5, big: r(7) > 0.88 };
});

export function Backdrop() {
  const f = useCurrentFrame();
  const warm = K(WARM, f), night = K(NIGHT, f), dawn = K(DAWN, f);
  const cx = g(1, f), cy = g(2, f), R = g(3, f), gop = g(4, f);
  const t = f / 30;
  const bx = (a: number, b: number, s: number) => Math.sin(t * s + a) * b;

  // view: Sri Lanka near the front, the globe turning slowly
  const lon0 = (70 + f * 0.03) * D2R, lat0 = 18 * D2R;
  const proj = (v: V, h = 1) => {
    // rotate world so (lat0, lon0) faces the viewer
    const [x0, y0, z0] = v;
    const cl = Math.cos(-lon0), sl = Math.sin(-lon0);
    const x1 = x0 * cl - y0 * sl, y1 = x0 * sl + y0 * cl, z1 = z0;
    const ct = Math.cos(lat0), st = Math.sin(lat0);
    const depth = x1 * ct + z1 * st; // toward viewer
    const up = -x1 * st + z1 * ct;
    return { X: cx + R * h * y1, Y: cy - R * h * up, z: depth, rr: Math.hypot(y1, up) * h };
  };

  // the turn's shockwave and the end hit
  const sw = [T, HIT].map((at) => { const d = f - at; return d >= 0 && d < 70 ? d / 70 : -1; });
  const sweep = prog(f, T + 2, T + 40);
  const pin = proj(SL);

  return (
    <AbsoluteFill style={{ background: C.char, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, #1c1c1e 0%, ${C.char} 50%, #121212 100%)` }} />

      {/* night sky */}
      <AbsoluteFill style={{ opacity: night }}>
        {STARS.map((s, i) => (
          <div key={i} style={{ position: "absolute", left: s.x, top: s.y, width: s.s, height: s.s, borderRadius: 9, background: "#fff", opacity: 0.25 + 0.55 * Math.abs(Math.sin(t * 0.9 + s.ph)) }} />
        ))}
      </AbsoluteFill>

      {/* dawn on the horizon */}
      <AbsoluteFill style={{
        opacity: dawn,
        background: `radial-gradient(1400px 900px at 540px ${H + 160}px, rgba(255,138,76,0.55), rgba(255,138,76,0.18) 45%, transparent 75%), linear-gradient(0deg, rgba(255,138,76,0.16), transparent 55%)`,
      }} />

      {/* brand light */}
      <AbsoluteFill style={{
        opacity: Math.min(1.3, warm),
        background: [
          `radial-gradient(620px 760px at ${540 + bx(0, 170, 0.21)}px ${900 + bx(1, 160, 0.17)}px, rgba(255,138,76,0.36), rgba(255,138,76,0.1) 45%, transparent 72%)`,
          `radial-gradient(520px 520px at ${170 + bx(2, 120, 0.13)}px ${330 + bx(3, 140, 0.19)}px, rgba(224,96,42,0.26), transparent 70%)`,
          `radial-gradient(560px 600px at ${930 + bx(4, 110, 0.16)}px ${1500 + bx(5, 120, 0.12)}px, rgba(255,160,106,0.2), transparent 70%)`,
        ].join(","),
      }} />

      {/* light rays */}
      <AbsoluteFill style={{
        opacity: 0.5 * Math.min(1, warm),
        background: `conic-gradient(from ${180 + bx(0, 6, 0.1)}deg at 50% -8%, transparent 0deg, rgba(255,138,76,0.1) 8deg, transparent 15deg, transparent 22deg, rgba(255,255,255,0.05) 27deg, transparent 33deg, transparent 300deg, rgba(255,255,255,0.05) 330deg, transparent 336deg, rgba(255,138,76,0.09) 345deg, transparent 352deg)`,
        maskImage: "linear-gradient(180deg, black 0%, black 25%, transparent 75%)",
        WebkitMaskImage: "linear-gradient(180deg, black 0%, black 25%, transparent 75%)",
      }} />

      {/* the globe */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: gop }}>
        <defs>
          <radialGradient id="atmo" cx="50%" cy="50%" r="50%">
            <stop offset="0.86" stopColor={C.orange} stopOpacity="0" />
            <stop offset="0.93" stopColor={C.orange} stopOpacity={0.22 + 0.2 * Math.min(1, warm)} />
            <stop offset="1" stopColor={C.orange} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="body" cx="42%" cy="35%" r="70%">
            <stop offset="0" stopColor="#2a2a2a" />
            <stop offset="1" stopColor="#121212" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={R * 1.16} fill="url(#atmo)" />
        <circle cx={cx} cy={cy} r={R} fill="url(#body)" />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.orange} strokeOpacity={0.35} strokeWidth={2} />
        {DOTS.map((v, i) => {
          const p = proj(v);
          if (p.z <= 0.02) return null;
          return <circle key={i} cx={p.X} cy={p.Y} r={1.2 + 2.2 * p.z * (R / 470)} fill="#fff" opacity={0.08 + 0.32 * p.z} />;
        })}
        {/* Sri Lanka */}
        {pin.z > 0 && (
          <g>
            <circle cx={pin.X} cy={pin.Y} r={18 + 14 * Math.abs(Math.sin(t * 2))} fill={C.orange} opacity={0.18} />
            <circle cx={pin.X} cy={pin.Y} r={9} fill={C.orange} />
            <circle cx={pin.X} cy={pin.Y} r={9} fill="none" stroke="#fff" strokeWidth={2.5} />
          </g>
        )}
        {/* messages flying in (hook) */}
        {cues.hook.arcs.map((a, i) => {
          const c = CITIES[i];
          const head = prog(f, a, a + 26, (x) => x * (2 - x));
          const fade = 1 - prog(f, a + 40, a + 90);
          if (head <= 0 || fade <= 0) return null;
          const pts: string[] = [];
          const N = 40;
          const dot = c.v[0] * SL[0] + c.v[1] * SL[1] + c.v[2] * SL[2];
          const om = Math.acos(Math.min(1, dot));
          for (let k = 0; k <= N * head; k++) {
            const u = k / N;
            const s1 = Math.sin((1 - u) * om) / Math.sin(om), s2 = Math.sin(u * om) / Math.sin(om);
            const v: V = [c.v[0] * s1 + SL[0] * s2, c.v[1] * s1 + SL[1] * s2, c.v[2] * s1 + SL[2] * s2];
            const p = proj(v, 1 + 0.32 * Math.sin(Math.PI * u) * Math.min(1, om));
            pts.push(`${p.X.toFixed(1)},${p.Y.toFixed(1)}`);
          }
          const o = proj(c.v);
          const last = pts[pts.length - 1]?.split(",").map(Number);
          const land = f - (a + 26);
          return (
            <g key={i} opacity={fade}>
              <polyline points={pts.join(" ")} fill="none" stroke={C.orange} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
              <polyline points={pts.join(" ")} fill="none" stroke={C.orange} strokeWidth={14} strokeLinecap="round" opacity={0.15} />
              <circle cx={o.X} cy={o.Y} r={7} fill="#fff" opacity={o.z > 0 ? 0.9 : 0} />
              {last && head < 1 && <circle cx={last[0]} cy={last[1]} r={9} fill="#fff" />}
              {land >= 0 && land < 24 && <circle cx={pin.X} cy={pin.Y} r={10 + land * 4} fill="none" stroke={C.orange} strokeWidth={4} opacity={1 - land / 24} />}
            </g>
          );
        })}
        {/* shockwaves */}
        {sw.map((s, i) => s >= 0 && (
          <g key={i}>
            <circle cx={540} cy={i ? 700 : 960} r={60 + s * 1300} fill="none" stroke={C.orange} strokeOpacity={(1 - s) * 0.7} strokeWidth={4 + 30 * (1 - s)} />
            <circle cx={540} cy={i ? 700 : 960} r={20 + s * 900} fill="none" stroke="#fff" strokeOpacity={(1 - s) * 0.35} strokeWidth={2 + 8 * (1 - s)} />
          </g>
        ))}
      </svg>

      {/* city labels for the arcs */}
      {cues.hook.arcs.slice(0, 3).map((a, i) => {
        const c = CITIES[i];
        const o = proj(c.v);
        const p = prog(f, a - 4, a + 8) * (1 - prog(f, a + 50, a + 70));
        if (p <= 0 || o.z <= 0) return null;
        return (
          <div key={i} style={{
            position: "absolute", left: o.X + (c.side < 0 ? -24 : 24), top: o.Y - 30, transform: `translateX(${c.side < 0 ? "-100%" : "0"}) scale(${0.85 + 0.15 * p})`,
            opacity: p * gop, fontFamily: FONT, whiteSpace: "nowrap", padding: "10px 18px", borderRadius: 16,
            background: "rgba(16,16,16,0.85)", border: "1.5px solid rgba(255,138,76,0.5)", color: C.white, fontSize: 24, fontWeight: 700,
          }}>
            {c.name} <span style={{ color: C.orange, marginLeft: 8 }}>{c.time}</span>
          </div>
        );
      })}

      {/* ocean lines */}
      <svg width={W} height={260} style={{ position: "absolute", left: 0, bottom: 0, opacity: 0.55 }}>
        {[0, 1, 2, 3].map((k) => {
          const amp = 14 + k * 5, y0 = 70 + k * 46, sp = 0.6 + k * 0.25;
          let d = "";
          for (let x = 0; x <= W; x += 20) {
            const y = y0 + Math.sin(x / (150 + k * 30) + t * sp + k) * amp + Math.sin(x / 70 - t * 0.9) * 3;
            d += `${x === 0 ? "M" : "L"}${x} ${y.toFixed(1)}`;
          }
          return <path key={k} d={d} fill="none" stroke={k % 2 ? "#fff" : C.orange} strokeOpacity={k % 2 ? 0.08 : 0.16 + 0.12 * clamp01(warm)} strokeWidth={2.5} />;
        })}
      </svg>

      {/* dust */}
      <AbsoluteFill>
        {DUST.map((d, i) => {
          const y = ((d.y - f * d.v * (0.6 + warm * 0.7)) % (H + 80) + H + 80) % (H + 80) - 40;
          const x = d.x + Math.sin(t * 0.5 + d.ph) * 24;
          return (
            <div key={i} style={{
              position: "absolute", left: x, top: y, width: d.big ? d.s * 5 : d.s, height: d.big ? d.s * 5 : d.s, borderRadius: 999,
              background: d.hot ? C.orange : "#fff", opacity: (d.big ? 0.06 : 0.12 + 0.25 * Math.abs(Math.sin(t + d.ph))) * (d.hot ? Math.min(1, warm + 0.1) : 0.7),
              filter: d.big ? "blur(6px)" : undefined,
            }} />
          );
        })}
      </AbsoluteFill>

      {sweep > 0 && sweep < 1 && (
        <AbsoluteFill style={{ background: `linear-gradient(115deg, transparent ${sweep * 160 - 40}%, rgba(255,176,133,0.32) ${sweep * 160 - 20}%, transparent ${sweep * 160}%)`, mixBlendMode: "screen" }} />
      )}

      {/* grain */}
      <svg width={W / 2} height={H / 2} viewBox={`0 0 ${W / 2} ${H / 2}`} style={{ position: "absolute", inset: 0, width: W, height: H, opacity: 0.08, mixBlendMode: "overlay" }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={f % 12} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(1100px 1500px at 540px 900px, transparent 50%, rgba(0,0,0,0.6) 100%)" }} />
    </AbsoluteFill>
  );
}
