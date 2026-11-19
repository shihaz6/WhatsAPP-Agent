// Shared look and motion for the Catalyst small-shop story.
// Palette from the brief: charcoal #1A1A1A, orange #FF8A4C, white, dark grey #333333.

import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadSinhala } from "@remotion/google-fonts/NotoSansSinhala";
import { loadFont as loadSora } from "@remotion/google-fonts/Sora";
import type { CSSProperties, ReactNode } from "react";
import { Easing, interpolate, spring, useCurrentFrame } from "remotion";
import cuesJson from "./cues.json";

loadInter("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] });
loadSinhala("normal", { weights: ["400", "500", "600", "700", "800", "900"], subsets: ["sinhala"] });
loadSora("normal", { weights: ["600", "700", "800"], subsets: ["latin"] });

export const cues = cuesJson;
export const FPS = cues.fps;
export const W = 1080;
export const H = 1920;

// Latin glyphs come from Inter, Sinhala from Noto Sans Sinhala (its font-face only covers the Sinhala range).
export const FONT = `"Inter", "Noto Sans Sinhala", sans-serif`;
export const DISPLAY = `"Sora", "Noto Sans Sinhala", sans-serif`;

export const C = {
  char: "#1A1A1A",
  char2: "#141414",
  deep: "#0E0E0E",
  grey: "#333333",
  grey2: "#262626",
  line: "#3A3A3A",
  mute: "#8C8C8C",
  soft: "#BDBDBD",
  white: "#FFFFFF",
  orange: "#FF8A4C",
  orange2: "#FFB085",
  ember: "#E0602A",
};

export const ease = Easing.bezier(0.22, 1, 0.36, 1);
export const easeIn = Easing.bezier(0.55, 0, 0.75, 0.2);

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export function prog(frame: number, a: number, b: number, easing = ease) {
  return interpolate(frame, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** A springy 0→1 (overshoots a touch) that starts at `at`. */
export function pop(frame: number, at: number, damping = 13, stiffness = 170) {
  return spring({ frame: frame - at, fps: FPS, config: { damping, stiffness, mass: 0.9 } });
}

/** Rise in: fade, lift, unblur. */
export function riseIn(p: number, dist = 40, blur = 10): CSSProperties {
  return { opacity: clamp01(p * 1.4), transform: `translateY(${(1 - p) * dist}px)`, filter: p < 0.999 ? `blur(${(1 - p) * blur}px)` : undefined };
}

/**
 * Kinetic line of text. Words rise one after another out of a soft blur.
 * Wrap a phrase in *asterisks* to paint it orange.
 */
export function Words({
  text, start, stagger = 3, dur = 16, style, accent = C.orange, out, center = true,
}: { text: string; start: number; stagger?: number; dur?: number; style?: CSSProperties; accent?: string; out?: number; center?: boolean }) {
  const frame = useCurrentFrame();
  const parts: { w: string; hot: boolean }[] = [];
  text.split(/(\*[^*]+\*)/).forEach((chunk) => {
    if (!chunk) return;
    const hot = chunk.startsWith("*") && chunk.endsWith("*");
    const body = hot ? chunk.slice(1, -1) : chunk;
    body.split(/(\s+)/).forEach((w) => { if (w) parts.push({ w, hot }); });
  });
  const o = out === undefined ? 1 : 1 - prog(frame, out, out + 12, easeIn);
  let k = 0;
  return (
    <div style={{ textAlign: center ? "center" : "left", opacity: o, transform: `translateY(${(1 - o) * -20}px)`, ...style }}>
      {parts.map((p, i) => {
        if (/^\s+$/.test(p.w)) return <span key={i}>{" "}</span>;
        const t = prog(frame, start + k * stagger, start + k * stagger + dur);
        k++;
        return (
          <span key={i} style={{
            display: "inline-block",
            color: p.hot ? accent : undefined,
            opacity: clamp01(t * 1.5),
            transform: `translateY(${(1 - t) * 0.45}em) scale(${0.96 + 0.04 * t})`,
            filter: t < 0.999 ? `blur(${(1 - t) * 8}px)` : undefined,
            textShadow: p.hot ? `0 0 40px rgba(255,138,76,${0.35 * t})` : undefined,
          }}>{p.w}</span>
        );
      })}
    </div>
  );
}

/** Headline block in the top third, the narration's line. */
export function Headline({ children, top = 250, style }: { children: ReactNode; top?: number; style?: CSSProperties }) {
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top, fontFamily: FONT, color: C.white, fontWeight: 800, fontSize: 78, lineHeight: 1.32, letterSpacing: -0.5, ...style }}>
      {children}
    </div>
  );
}

/** The Catalyst mark: a rounded orange tile with a charcoal X. */
export function Mark({ size = 120, glow = 0 }: { size?: number; glow?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ overflow: "visible", filter: glow ? `drop-shadow(0 0 ${size * 0.35 * glow}px rgba(255,138,76,${0.75 * glow}))` : undefined }}>
      <defs>
        <linearGradient id="markg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFA06A" />
          <stop offset="1" stopColor="#FF7A36" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#markg)" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <path d="M10.5 10.5l11 11M21.5 10.5l-11 11" stroke={C.char} strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

/** Round avatar with an initial. */
export function Avatar({ label, size = 64, bg = C.grey, fg = C.white, ring }: { label: string; size?: number; bg?: string; fg?: string; ring?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size, background: bg, color: fg, display: "grid", placeItems: "center",
      fontFamily: FONT, fontWeight: 700, fontSize: size * 0.42, flexShrink: 0,
      boxShadow: ring ? `0 0 0 3px ${C.char2}, 0 0 0 6px ${ring}` : undefined,
    }}>{label}</div>
  );
}

/** Chat bubble. Agent (and the shop) is orange with charcoal text, the customer dark grey with white text. */
export function Bubble({
  side, children, time, ticks, p = 1, style, tail = true,
}: { side: "me" | "them"; children: ReactNode; time?: string; ticks?: boolean; p?: number; style?: CSSProperties; tail?: boolean }) {
  const me = side === "me";
  const s = Math.max(0, p);
  return (
    <div style={{ display: "flex", justifyContent: me ? "flex-end" : "flex-start", ...style }}>
      <div style={{
        maxWidth: "84%", position: "relative",
        background: me ? `linear-gradient(160deg, #FF9A62, ${C.orange})` : C.grey,
        color: me ? C.char : C.white,
        borderRadius: 30, borderBottomRightRadius: me && tail ? 8 : 30, borderBottomLeftRadius: !me && tail ? 8 : 30,
        padding: "20px 26px 14px",
        fontFamily: FONT, fontSize: 34, lineHeight: 1.38, fontWeight: 500,
        boxShadow: me ? "0 18px 40px -16px rgba(255,138,76,0.55)" : "0 18px 40px -18px rgba(0,0,0,0.8)",
        opacity: clamp01(s * 2),
        transform: `translateY(${(1 - s) * 26}px) scale(${0.85 + 0.15 * s})`,
        transformOrigin: me ? "bottom right" : "bottom left",
      }}>
        <div>{children}</div>
        {time && (
          <div style={{ fontSize: 21, marginTop: 6, textAlign: "right", fontWeight: 600, opacity: me ? 0.62 : 0.55, letterSpacing: 0.2 }}>
            {time}{ticks ? "  ✓✓" : ""}
          </div>
        )}
      </div>
    </div>
  );
}

/** Three bouncing dots. */
export function Typing({ frame, p = 1, side = "them" }: { frame: number; p?: number; side?: "me" | "them" }) {
  const me = side === "me";
  return (
    <div style={{ display: "flex", justifyContent: me ? "flex-end" : "flex-start", opacity: clamp01(p * 2), transform: `scale(${0.8 + 0.2 * p})`, transformOrigin: me ? "right" : "left" }}>
      <div style={{ background: me ? C.orange : C.grey, borderRadius: 30, padding: "24px 28px", display: "flex", gap: 10 }}>
        {[0, 1, 2].map((i) => {
          const b = Math.sin((frame / 30) * Math.PI * 3 - i * 0.9);
          return <div key={i} style={{ width: 14, height: 14, borderRadius: 14, background: me ? C.char : C.soft, opacity: 0.45 + 0.55 * Math.max(0, b), transform: `translateY(${-Math.max(0, b) * 7}px)` }} />;
        })}
      </div>
    </div>
  );
}

/** A phone with a WhatsApp-style chat header. */
export function Phone({
  width = 700, height = 1180, title, subtitle, avatar, children, style, accentAvatar = false, glow = 0,
}: { width?: number; height?: number; title: string; subtitle?: ReactNode; avatar: ReactNode; children: ReactNode; style?: CSSProperties; accentAvatar?: boolean; glow?: number }) {
  return (
    <div style={{
      width, height, borderRadius: 84, padding: 16, position: "relative",
      background: "linear-gradient(150deg, #3a3a3a, #161616 40%, #0b0b0b)",
      boxShadow: `0 60px 120px -30px rgba(0,0,0,0.9), 0 0 0 2px #2c2c2c, inset 0 0 0 2px rgba(255,255,255,0.06), 0 0 ${160 * glow}px ${-20 + 40 * glow}px rgba(255,138,76,${0.45 * glow})`,
      ...style,
    }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 70, overflow: "hidden", background: C.char2, position: "relative", display: "flex", flexDirection: "column" }}>
        {/* status bar */}
        <div style={{ height: 70, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 54px 0", fontFamily: FONT, fontSize: 24, fontWeight: 700, color: C.white }}>
          <span>1:12</span>
          <div style={{ width: 150, height: 40, borderRadius: 40, background: "#000", position: "absolute", left: "50%", top: 18, transform: "translateX(-50%)" }} />
          <span style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.9 }}>
            <svg width="30" height="20" viewBox="0 0 30 20"><rect x="0" y="12" width="5" height="8" rx="1.5" fill="#fff" /><rect x="8" y="8" width="5" height="12" rx="1.5" fill="#fff" /><rect x="16" y="4" width="5" height="16" rx="1.5" fill="#fff" /><rect x="24" y="0" width="5" height="20" rx="1.5" fill="#fff" /></svg>
            <svg width="42" height="20" viewBox="0 0 42 20"><rect x="0.5" y="0.5" width="36" height="19" rx="5" fill="none" stroke="#fff" opacity="0.5" /><rect x="3" y="3" width="26" height="14" rx="3" fill="#fff" /><rect x="38" y="6" width="3" height="8" rx="1.5" fill="#fff" opacity="0.5" /></svg>
          </span>
        </div>
        {/* chat header */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "18px 34px 22px", borderBottom: `1px solid ${C.grey2}`, background: "#181818" }}>
          <svg width="22" height="36" viewBox="0 0 22 36"><path d="M18 4L5 18l13 14" stroke={C.orange} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <div style={{ width: 72, height: 72, borderRadius: 72, overflow: "hidden", display: "grid", placeItems: "center", background: accentAvatar ? C.orange : C.grey, flexShrink: 0 }}>{avatar}</div>
          <div style={{ fontFamily: FONT, color: C.white, minWidth: 0 }}>
            <div style={{ fontSize: 32, fontWeight: 700, whiteSpace: "nowrap" }}>{title}</div>
            {subtitle && <div style={{ fontSize: 23, color: C.mute, fontWeight: 500, marginTop: 2, whiteSpace: "nowrap" }}>{subtitle}</div>}
          </div>
        </div>
        {/* thread */}
        <div style={{
          flex: 1, position: "relative", padding: "28px 30px", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 20,
          backgroundImage: "radial-gradient(rgba(255,255,255,0.035) 1.5px, transparent 1.6px)", backgroundSize: "34px 34px",
        }}>
          {children}
        </div>
        {/* composer */}
        <div style={{ display: "flex", gap: 16, padding: "18px 26px 36px", alignItems: "center", background: "#181818" }}>
          <div style={{ flex: 1, height: 74, borderRadius: 40, background: C.grey2, color: C.mute, fontFamily: FONT, fontSize: 27, display: "flex", alignItems: "center", padding: "0 30px" }}>Message</div>
          <div style={{ width: 74, height: 74, borderRadius: 74, background: C.orange, display: "grid", placeItems: "center" }}>
            <svg width="30" height="30" viewBox="0 0 24 24"><path d="M3 11l18-8-8 18-2-8-8-2z" fill={C.char} /></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small capsule label. */
export function Pill({ children, style, hot }: { children: ReactNode; style?: CSSProperties; hot?: boolean }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 12, padding: "12px 24px", borderRadius: 999,
      background: hot ? "rgba(255,138,76,0.14)" : "rgba(255,255,255,0.06)",
      border: `1.5px solid ${hot ? "rgba(255,138,76,0.55)" : "rgba(255,255,255,0.12)"}`,
      color: hot ? C.orange2 : C.soft, fontFamily: FONT, fontSize: 28, fontWeight: 600, whiteSpace: "nowrap",
      backdropFilter: "blur(8px)", ...style,
    }}>{children}</div>
  );
}

/** A frosted dark card. */
export const card: CSSProperties = {
  background: "linear-gradient(170deg, rgba(48,48,48,0.78), rgba(26,26,26,0.86))",
  border: "1.5px solid rgba(255,255,255,0.09)",
  borderRadius: 40,
  boxShadow: "0 40px 90px -30px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.06)",
  backdropFilter: "blur(14px)",
};

/** Simple person glyph (head + shoulders) for silhouettes. */
export function PersonIcon({ size = 60, color = C.soft }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40"><circle cx="20" cy="14" r="7.5" fill={color} /><path d="M6 37c1.5-8.5 7.2-13 14-13s12.5 4.5 14 13z" fill={color} /></svg>
  );
}

export function PhoneIcon({ size = 60, color = C.soft }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40"><rect x="11" y="3" width="18" height="34" rx="4.5" fill="none" stroke={color} strokeWidth="3" /><rect x="17" y="31" width="6" height="2.5" rx="1.2" fill={color} /></svg>
  );
}
