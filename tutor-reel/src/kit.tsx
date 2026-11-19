// Shared look and motion for "Your WhatsApp Never Sleeps" (9:16 reel for tutors).
// AlchemyX palette: orange #FF8A4C (accent), charcoal #1A1A1A (ground), white, dark grey #333333.

import { loadFont as loadUnbounded } from "@remotion/google-fonts/Unbounded";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";
import { loadFont as loadSinhala } from "@remotion/google-fonts/NotoSansSinhala";
import { loadFont as loadTamil } from "@remotion/google-fonts/NotoSansTamil";
import type { CSSProperties, ReactNode } from "react";
import { Easing, interpolate, spring, useCurrentFrame } from "remotion";
import cuesJson from "./cues.json";

loadUnbounded("normal", { weights: ["500", "600", "700", "800", "900"], subsets: ["latin"] });
loadManrope("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin"] });
loadSinhala("normal", { weights: ["500", "600", "700", "800"], subsets: ["sinhala"] });
loadTamil("normal", { weights: ["500", "600", "700", "800"], subsets: ["tamil"] });

export const cues = cuesJson;
export const FPS = cues.fps;
export const BEAT = cues.beat;
export const W = 1080;
export const H = 1920;

export const FONT = `"Manrope", "Noto Sans Sinhala", "Noto Sans Tamil", "Segoe UI Emoji", sans-serif`;
export const DISPLAY = `"Unbounded", "Manrope", sans-serif`;
export const SI = `"Noto Sans Sinhala", "Manrope", sans-serif`;
export const TA = `"Noto Sans Tamil", "Manrope", sans-serif`;

export const C = {
  char: "#1A1A1A",
  deep: "#111111",
  grey: "#333333",
  grey2: "#262626",
  grey3: "#2E2E2E",
  mute: "#8C8C8C",
  soft: "#C4C4C4",
  white: "#FFFFFF",
  orange: "#FF8A4C",
  orange2: "#FFB287",
  ember: "#E8672E",
};

export const ease = Easing.bezier(0.22, 1, 0.36, 1);
export const easeIn = Easing.bezier(0.55, 0, 0.75, 0.2);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function prog(frame: number, a: number, b: number, easing = ease) {
  return interpolate(frame, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}
/** A springy 0→1 that overshoots a touch, starting at `at`. */
export function pop(frame: number, at: number, damping = 14, stiffness = 170) {
  return spring({ frame: frame - at, fps: FPS, config: { damping, stiffness, mass: 0.9 } });
}

/** Seeded random, so every render is identical. */
export function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}

/** Every kick in the soundtrack, as frames (same list the soundtrack script builds from). */
export const KICKS: number[] = (() => {
  const out: number[] = [...cues.kicks.hits];
  for (const [a, b, step] of cues.kicks.runs) for (let f = a; f < b; f += step) out.push(f);
  return out.sort((x, y) => x - y);
})();
/** 1 on a kick, decaying over a few frames. Drives the background's light. */
export function pulse(f: number, decay = 4.5) {
  let last = -1e9;
  for (const k of KICKS) { if (k > f) break; last = k; }
  return Math.exp(-(f - last) / decay);
}

/**
 * Kinetic line. Words rise out of a mask one after another.
 * *asterisks* mark hot words (orange on dark grounds, white on orange).
 */
export function Words({
  text, start, stagger = 3, dur = 13, style, out, align = "left", hot = C.orange,
}: { text: string; start: number; stagger?: number; dur?: number; style?: CSSProperties; out?: number; align?: "left" | "center"; hot?: string }) {
  const frame = useCurrentFrame();
  const parts: { w: string; hot: boolean }[] = [];
  text.split(/(\*[^*]+\*)/).forEach((chunk) => {
    if (!chunk) return;
    const isHot = chunk.startsWith("*") && chunk.endsWith("*");
    const body = isHot ? chunk.slice(1, -1) : chunk;
    body.split(/(\s+)/).forEach((w) => { if (w) parts.push({ w, hot: isHot }); });
  });
  const o = out === undefined ? 0 : prog(frame, out, out + 9, easeIn);
  let k = 0;
  return (
    <div style={{ textAlign: align, ...style }}>
      {parts.map((p, i) => {
        if (/^\s+$/.test(p.w)) return <span key={i}>{" "}</span>;
        const t = prog(frame, start + k * stagger, start + k * stagger + dur);
        k++;
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: "0.22em", marginBottom: "-0.22em", paddingTop: "0.06em", marginTop: "-0.06em" }}>
            <span style={{
              display: "inline-block",
              color: p.hot ? hot : undefined,
              transform: `translateY(${(1 - t) * 130 + o * -130}%) rotate(${(1 - t) * 5}deg)`,
              transformOrigin: "left bottom",
            }}>{p.w}</span>
          </span>
        );
      })}
    </div>
  );
}

/** One word that slams in: big, blurred and fast, then settles. */
export function Slam({ children, at, style, from = 2.2 }: { children: ReactNode; at: number; style?: CSSProperties; from?: number }) {
  const f = useCurrentFrame();
  if (f < at) return null;
  const p = pop(f, at, 13, 320);
  const s = lerp(from, 1, Math.min(1, p)) + (p > 1 ? (p - 1) * 0.4 : 0);
  const blur = Math.max(0, (1 - p) * 18);
  return (
    <div style={{ transform: `scale(${s})`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined, opacity: clamp01(p * 3), ...style }}>{children}</div>
  );
}

/** The Catalyst mark: a rounded orange tile with an X. */
export function Mark({ size = 120, glow = 0, draw = 1, tile = C.orange, x = C.char }: { size?: number; glow?: number; draw?: number; tile?: string; x?: string }) {
  const L = 15.6;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ overflow: "visible", flexShrink: 0, filter: glow ? `drop-shadow(0 0 ${size * 0.35 * glow}px rgba(255,138,76,${0.75 * glow}))` : undefined }}>
      <defs>
        <linearGradient id="mk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFA36E" />
          <stop offset="1" stopColor="#FF7A36" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={tile === C.orange ? "url(#mk)" : tile} />
      <path d="M10.5 10.5l11 11" stroke={x} strokeWidth="2.9" strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - clamp01(draw * 2))} />
      <path d="M21.5 10.5l-11 11" stroke={x} strokeWidth="2.9" strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - clamp01(draw * 2 - 1))} />
    </svg>
  );
}

export function Bolt({ size = 60, color = C.orange, style }: { size?: number; color?: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size * 1.4} viewBox="0 0 20 28" style={style}>
      <path d="M12.5 0L1 16h7.5L6.5 28 19 11h-7.6z" fill={color} />
    </svg>
  );
}

/** Small uppercase label with an orange tick. */
export function Eyebrow({ children, color = C.soft, style }: { children: ReactNode; color?: string; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: FONT, fontSize: 26, fontWeight: 800, letterSpacing: 5, color, textTransform: "uppercase", ...style }}>
      <span style={{ width: 34, height: 5, borderRadius: 5, background: C.orange }} />
      {children}
    </div>
  );
}

export function Avatar({ label, size = 64, bg = C.grey, fg = C.white }: { label: string; size?: number; bg?: string; fg?: string }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size, background: bg, color: fg, display: "grid", placeItems: "center", fontFamily: FONT, fontWeight: 800, fontSize: size * 0.4, flexShrink: 0 }}>{label}</div>
  );
}

/** Chat bubble. Catalyst replies on the right in orange, the parent on the left in dark grey. */
export function Bubble({
  side, children, time, p = 1, fs = 33, ai, style, font,
}: { side: "me" | "them"; children: ReactNode; time?: string; p?: number; fs?: number; ai?: boolean; style?: CSSProperties; font?: string }) {
  const me = side === "me";
  const s = Math.max(0, p);
  return (
    <div style={{ display: "flex", justifyContent: me ? "flex-end" : "flex-start", ...style }}>
      <div style={{
        maxWidth: "84%",
        background: me ? `linear-gradient(160deg, #FFA06A, ${C.orange})` : C.grey,
        color: me ? C.char : C.white,
        borderRadius: 30, borderBottomRightRadius: me ? 8 : 30, borderBottomLeftRadius: me ? 30 : 8,
        padding: "18px 24px 12px",
        fontFamily: font ?? FONT, fontSize: fs, lineHeight: 1.36, fontWeight: 600,
        boxShadow: me ? "0 18px 40px -16px rgba(255,138,76,0.65)" : "0 18px 40px -18px rgba(0,0,0,0.85)",
        opacity: clamp01(s * 2),
        transform: `translateY(${(1 - s) * 26}px) scale(${0.84 + 0.16 * s})`,
        transformOrigin: me ? "bottom right" : "bottom left",
      }}>
        <div>{children}</div>
        {time && (
          <div style={{ fontFamily: FONT, fontSize: 19, marginTop: 6, fontWeight: 800, opacity: me ? 0.62 : 0.55, display: "flex", justifyContent: "flex-end", gap: 10, alignItems: "center" }}>
            {ai && <span style={{ fontSize: 15, letterSpacing: 1.2, padding: "2px 8px", borderRadius: 6, background: "rgba(26,26,26,0.16)" }}>AI</span>}
            {time}{me ? " ✓✓" : ""}
          </div>
        )}
      </div>
    </div>
  );
}

export function Typing({ frame, p = 1 }: { frame: number; p?: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", opacity: clamp01(p * 2), transform: `scale(${0.8 + 0.2 * p})`, transformOrigin: "right" }}>
      <div style={{ background: C.orange, borderRadius: 30, borderBottomRightRadius: 8, padding: "24px 28px", display: "flex", gap: 10 }}>
        {[0, 1, 2].map((i) => {
          const b = Math.sin((frame / 30) * Math.PI * 3.6 - i * 0.9);
          return <div key={i} style={{ width: 14, height: 14, borderRadius: 14, background: C.char, opacity: 0.4 + 0.6 * Math.max(0, b), transform: `translateY(${-Math.max(0, b) * 7}px)` }} />;
        })}
      </div>
    </div>
  );
}

/** A dark phone running the tutor's WhatsApp, one chat open. Messages flow from the top. */
export function Phone({
  width = 820, height = 1420, title, subtitle, avatar, children, style, clock = "2:07", glow = 0,
}: { width?: number; height?: number; title: string; subtitle?: ReactNode; avatar: ReactNode; children: ReactNode; style?: CSSProperties; clock?: string; glow?: number }) {
  return (
    <div style={{
      width, height, borderRadius: 96, padding: 16, position: "relative",
      background: "linear-gradient(150deg, #444, #1a1a1a 38%, #0b0b0b)",
      boxShadow: `0 70px 120px -40px rgba(0,0,0,0.9), 0 0 0 3px #2c2c2c, inset 0 0 0 2px rgba(255,255,255,0.08), 0 0 ${160 * glow}px ${-10 + 40 * glow}px rgba(255,138,76,${0.45 * glow})`,
      ...style,
    }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 81, overflow: "hidden", background: "#141414", position: "relative", display: "flex", flexDirection: "column" }}>
        <div style={{ height: 76, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 64px 0", fontFamily: FONT, fontSize: 27, fontWeight: 800, color: C.white }}>
          <span>{clock}</span>
          <div style={{ width: 170, height: 46, borderRadius: 46, background: "#000", position: "absolute", left: "50%", top: 18, transform: "translateX(-50%)" }} />
          <span style={{ display: "flex", gap: 9, alignItems: "center", opacity: 0.9 }}>
            <svg width="30" height="20" viewBox="0 0 30 20"><rect x="0" y="12" width="5" height="8" rx="1.5" fill="#fff" /><rect x="8" y="8" width="5" height="12" rx="1.5" fill="#fff" /><rect x="16" y="4" width="5" height="16" rx="1.5" fill="#fff" /><rect x="24" y="0" width="5" height="20" rx="1.5" fill="#fff" /></svg>
            <svg width="42" height="20" viewBox="0 0 42 20"><rect x="0.5" y="0.5" width="36" height="19" rx="5" fill="none" stroke="#fff" opacity="0.5" /><rect x="3" y="3" width="22" height="14" rx="3" fill="#fff" /></svg>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "18px 34px 22px", borderBottom: `1.5px solid ${C.grey2}`, background: "#1B1B1B" }}>
          <svg width="20" height="34" viewBox="0 0 22 36"><path d="M18 4L5 18l13 14" stroke={C.orange} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {avatar}
          <div style={{ fontFamily: FONT, color: C.white, minWidth: 0 }}>
            <div style={{ fontSize: 33, fontWeight: 800, whiteSpace: "nowrap" }}>{title}</div>
            {subtitle && <div style={{ fontSize: 23, color: C.mute, fontWeight: 700, marginTop: 2, whiteSpace: "nowrap" }}>{subtitle}</div>}
          </div>
        </div>
        <div style={{
          flex: 1, position: "relative", padding: "30px 28px", display: "flex", flexDirection: "column", gap: 20,
          backgroundImage: "radial-gradient(rgba(255,255,255,0.045) 1.6px, transparent 1.7px)", backgroundSize: "36px 36px",
        }}>
          {children}
        </div>
        <div style={{ display: "flex", gap: 16, padding: "18px 24px 36px", alignItems: "center", background: "#1B1B1B" }}>
          <div style={{ flex: 1, height: 74, borderRadius: 40, background: C.grey2, color: C.mute, fontFamily: FONT, fontSize: 27, fontWeight: 600, display: "flex", alignItems: "center", padding: "0 30px" }}>Message</div>
          <div style={{ width: 74, height: 74, borderRadius: 74, background: C.orange, display: "grid", placeItems: "center" }}>
            <svg width="30" height="30" viewBox="0 0 24 24"><path d="M3 11l18-8-8 18-2-8-8-2z" fill={C.char} /></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A centred date / system chip inside a chat. */
export function ChatChip({ children, p = 1, tone = "dark" }: { children: ReactNode; p?: number; tone?: "dark" | "orange" }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", opacity: clamp01(p * 2), transform: `scale(${0.85 + 0.15 * p})` }}>
      <div style={{
        fontFamily: FONT, fontSize: 22, fontWeight: 800, letterSpacing: 0.5, padding: "8px 18px", borderRadius: 14,
        background: tone === "orange" ? "rgba(255,138,76,0.16)" : C.grey2, color: tone === "orange" ? C.orange : C.soft,
        border: tone === "orange" ? "1.5px solid rgba(255,138,76,0.45)" : "none",
      }}>{children}</div>
    </div>
  );
}

export const glass: CSSProperties = {
  background: "linear-gradient(170deg, rgba(58,58,58,0.88), rgba(34,34,34,0.92))",
  border: "1.5px solid rgba(255,255,255,0.09)",
  borderRadius: 36,
  boxShadow: "0 50px 100px -40px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.07)",
};
