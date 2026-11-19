// Damsara's little shop, drawn flat in the brief's palette. `day` runs 0 (morning) → 1 (night).

import { C, FONT, clamp01, lerp } from "./kit";

const mix = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], t))).join(",")})`;
};

const BOXES: [number, number, number, number, string][] = [
  // shelf 1 (y base 470)
  [150, 60, 44, 0, C.orange], [200, 40, 52, 0, "#4a4a4a"], [246, 54, 38, 0, "#d9d9d9"], [306, 36, 58, 0, "#5a5a5a"], [348, 58, 46, 0, C.orange2],
  [520, 48, 50, 0, "#4a4a4a"], [574, 40, 36, 0, C.orange], [620, 62, 56, 0, "#6a6a6a"], [688, 52, 42, 0, "#d9d9d9"],
  // shelf 2 (y base 560)
  [150, 46, 54, 1, "#5a5a5a"], [202, 64, 40, 1, "#d9d9d9"], [272, 40, 60, 1, C.ember], [318, 50, 44, 1, "#4a4a4a"],
  [540, 56, 48, 1, C.orange2], [602, 44, 58, 1, "#5a5a5a"], [652, 70, 40, 1, C.orange], [698, 52, 52, 1, "#4a4a4a"],
];

export function Shop({ day = 0, frame = 0, customer = 0, phoneGlow = 0, width = 900 }: { day?: number; frame?: number; customer?: number; phoneGlow?: number; width?: number }) {
  const night = clamp01((day - 0.55) / 0.35);
  const dusk = clamp01(1 - Math.abs(day - 0.6) / 0.25);
  const skyTop = day < 0.6 ? mix("#FFB085", "#3a2a22", clamp01((day - 0.25) / 0.35)) : mix("#3a2a22", "#0d0d0f", night);
  const skyBot = day < 0.6 ? mix("#FF8A4C", "#e0602a", clamp01(day / 0.6)) : mix("#e0602a", "#1b1b1f", night);
  const u = clamp01(day / 0.62);
  const sunX = lerp(150, 750, u), sunY = 150 - Math.sin(Math.PI * u) * 85;
  const lamp = clamp01(0.25 + night * 0.9);
  const breathe = Math.sin(frame / 18) * 2;
  const H = 820;

  return (
    <svg width={width} height={(width * H) / 900} viewBox={`0 0 900 ${H}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skyTop} />
          <stop offset="1" stopColor={skyBot} />
        </linearGradient>
        <radialGradient id="lampglow" cx="50%" cy="15%" r="70%">
          <stop offset="0" stopColor="#FFB085" stopOpacity={0.55 * lamp} />
          <stop offset="0.6" stopColor="#FF8A4C" stopOpacity={0.12 * lamp} />
          <stop offset="1" stopColor="#FF8A4C" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="inside" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2c2c2c" />
          <stop offset="1" stopColor="#1a1a1a" />
        </linearGradient>
        <linearGradient id="rim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={C.orange} stopOpacity="0.9" />
          <stop offset="0.35" stopColor={C.orange} stopOpacity="0" />
        </linearGradient>
        <clipPath id="card"><rect x="0" y="0" width="900" height={H} rx="56" /></clipPath>
        <filter id="soft"><feGaussianBlur stdDeviation="18" /></filter>
      </defs>

      <g clipPath="url(#card)">
        {/* sky */}
        <rect width="900" height={H} fill="url(#sky)" />
        {/* stars */}
        {Array.from({ length: 26 }, (_, i) => {
          const x = (i * 137.5) % 900, y = 20 + ((i * 71.3) % 150);
          return <circle key={i} cx={x} cy={y} r={i % 5 === 0 ? 2.6 : 1.6} fill="#fff" opacity={night * (0.35 + 0.5 * Math.abs(Math.sin(frame / 12 + i)))} />;
        })}
        {/* sun, then moon */}
        <circle cx={sunX} cy={sunY} r={70} fill="#FFE3D1" opacity={(1 - night) * 0.35} filter="url(#soft)" />
        <circle cx={sunX} cy={sunY} r={42} fill="#FFF1E8" opacity={1 - night} />
        <g opacity={night}>
          <circle cx={740} cy={92} r={36} fill="#F2F2F2" />
          <circle cx={756} cy={80} r={32} fill={skyTop} />
        </g>
        {/* distant city blocks */}
        {[[-10, 120, 120], [100, 90, 170], [180, 140, 100], [610, 110, 150], [710, 120, 110], [820, 100, 170]].map(([x, w, h], i) => (
          <rect key={i} x={x} y={330 - h} width={w} height={h + 60} fill={mix("#2a2a2a", "#121214", night)} opacity={0.55} />
        ))}

        {/* facade */}
        <rect x="60" y="160" width="780" height="700" rx="10" fill="#232323" />
        <rect x="60" y="160" width="780" height="8" fill="#2f2f2f" />
        {/* sign */}
        <rect x="140" y="194" width="620" height="100" rx="18" fill="#121212" stroke={C.orange} strokeOpacity={0.35 + 0.5 * lamp} strokeWidth="3" />
        <rect x="140" y="194" width="620" height="100" rx="18" fill="none" stroke={C.orange} strokeOpacity={0.4 * lamp} strokeWidth="14" filter="url(#soft)" />
        <text x="450" y="260" textAnchor="middle" fontFamily={FONT} fontSize="44" fontWeight="800" fill={C.orange} letterSpacing="1"
          style={{ filter: `drop-shadow(0 0 ${8 + 14 * lamp}px rgba(255,138,76,${0.3 + 0.5 * lamp}))` }}>
          {'GA"DAMSARA STORES'}
        </text>

        {/* awning */}
        {Array.from({ length: 11 }, (_, i) => (
          <g key={i}>
            <path d={`M${80 + i * 67.3} 318 h67.3 v58 a33.65 26 0 0 1 -67.3 0 z`} fill={i % 2 ? "#3a3a3a" : C.orange} />
            <path d={`M${80 + i * 67.3} 318 h67.3 v10 h-67.3 z`} fill="#000" opacity="0.18" />
          </g>
        ))}

        {/* interior */}
        <rect x="110" y="404" width="680" height="460" fill="url(#inside)" />
        <rect x="110" y="404" width="680" height="460" fill="url(#lampglow)" />
        {/* hanging lamp */}
        <line x1="450" y1="404" x2="450" y2="444" stroke="#555" strokeWidth="3" />
        <path d="M424 444 h52 l-10 18 h-32 z" fill="#3d3d3d" />
        <circle cx="450" cy="468" r="9" fill="#FFE3D1" opacity={0.4 + 0.6 * lamp} />
        <circle cx="450" cy="468" r="40" fill="#FF8A4C" opacity={0.35 * lamp} filter="url(#soft)" />
        {/* shelves */}
        {[470, 560].map((y) => (
          <g key={y}>
            <rect x="130" y={y} width="640" height="10" rx="3" fill="#3f3f3f" />
            <rect x="130" y={y + 10} width="640" height="6" fill="#000" opacity="0.25" />
          </g>
        ))}
        {BOXES.map(([x, w, h, s, col], i) => (
          <g key={i}>
            <rect x={x} y={(s ? 560 : 470) - h} width={w} height={h} rx="5" fill={col} opacity={0.92} />
            <rect x={x} y={(s ? 560 : 470) - h} width={w} height={6} rx="3" fill="#fff" opacity={0.12} />
          </g>
        ))}

        {/* Damsara, behind the counter */}
        <g transform={`translate(0 ${breathe - 46})`}>
          <path d="M330 860 C 330 700 372 640 450 640 C 528 640 570 700 570 860 Z" fill="#1b1b1b" />
          <path d="M392 690 C 410 676 490 676 508 690 L 520 860 L 380 860 Z" fill={C.orange} opacity="0.9" />
          <path d="M412 660 L450 700 L488 660" fill="none" stroke="#1b1b1b" strokeWidth="10" strokeLinecap="round" />
          <circle cx="450" cy="588" r="50" fill="#1b1b1b" />
          <circle cx="450" cy="588" r="50" fill="none" stroke="url(#rim)" strokeWidth="5" />
          <path d="M330 860 C 330 700 372 640 450 640" fill="none" stroke={C.orange} strokeOpacity="0.55" strokeWidth="4" />
        </g>

        {/* counter */}
        <rect x="70" y="704" width="760" height="160" fill="#2e2e2e" />
        <rect x="58" y="694" width="784" height="18" rx="6" fill="#3d3d3d" />
        <rect x="70" y="748" width="760" height="10" fill={C.orange} opacity="0.85" />
        {/* jar */}
        <rect x="180" y="626" width="70" height="70" rx="14" fill="#fff" opacity="0.14" />
        <rect x="186" y="650" width="58" height="40" rx="8" fill={C.orange} opacity="0.75" />
        <rect x="176" y="616" width="78" height="16" rx="6" fill="#4a4a4a" />
        {/* scale */}
        <rect x="640" y="672" width="110" height="24" rx="6" fill="#4a4a4a" />
        <rect x="676" y="640" width="38" height="34" rx="4" fill="#3a3a3a" />
        <ellipse cx="695" cy="636" rx="62" ry="10" fill="#d9d9d9" opacity="0.8" />
        {/* phone on the counter */}
        <g transform="translate(560 640) rotate(-8)">
          <rect x="0" y="0" width="34" height="56" rx="7" fill="#0d0d0d" stroke="#4a4a4a" strokeWidth="2" />
          <rect x="3" y="5" width="28" height="44" rx="4" fill={C.orange} opacity={0.15 + 0.85 * phoneGlow} />
          <circle cx="17" cy="27" r={30} fill={C.orange} opacity={0.4 * phoneGlow} filter="url(#soft)" />
        </g>

        {/* the customer at the counter, seen from behind */}
        <g opacity={customer} transform={`translate(${(1 - customer) * -60} 0)`}>
          <path d="M60 860 C 60 760 110 720 200 720 C 290 720 340 760 340 860 Z" fill="#0f0f0f" />
          <circle cx="200" cy="668" r="58" fill="#0f0f0f" />
          <path d="M142 668 a58 58 0 0 1 116 0" fill="none" stroke="#fff" strokeOpacity="0.12" strokeWidth="4" />
        </g>
      </g>
      {/* card edge */}
      <rect x="1" y="1" width="898" height={H - 2} rx="55" fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="2" />
      {/* reflection of dusk on the card edge */}
      <rect x="1" y="1" width="898" height={H - 2} rx="55" fill="none" stroke={C.orange} strokeOpacity={0.25 * dusk} strokeWidth="3" />
    </svg>
  );
}
