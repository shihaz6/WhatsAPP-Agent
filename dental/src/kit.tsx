// Shared look and motion for the Catalyst dental demo (landscape).
// AlchemyX palette: orange #FF8A4C (accent), charcoal #1A1A1A (dark ground), white (light ground), dark grey #333333.

import { loadFont as loadBricolage } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadJakarta } from "@remotion/google-fonts/PlusJakartaSans";
import { loadFont as loadSinhala } from "@remotion/google-fonts/NotoSansSinhala";
import { loadFont as loadTamil } from "@remotion/google-fonts/NotoSansTamil";
import type { CSSProperties, ReactNode } from "react";
import { Easing, interpolate, spring, useCurrentFrame } from "remotion";
import cuesJson from "./cues.json";

loadBricolage("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin"] });
loadJakarta("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] });
loadSinhala("normal", { weights: ["500", "600", "700"], subsets: ["sinhala"] });
loadTamil("normal", { weights: ["500", "600", "700"], subsets: ["tamil"] });

export const cues = cuesJson;
export const FPS = cues.fps;
export const W = 1920;
export const H = 1080;

export const FONT = `"Plus Jakarta Sans", "Noto Sans Sinhala", "Noto Sans Tamil", "Segoe UI Emoji", sans-serif`;
export const DISPLAY = `"Bricolage Grotesque", "Plus Jakarta Sans", sans-serif`;

export const C = {
  char: "#1A1A1A",
  char2: "#141414",
  deep: "#0F0F0F",
  grey: "#333333",
  grey2: "#262626",
  grey3: "#2C2C2C",
  mute: "#8A8A8A",
  soft: "#BDBDBD",
  paper: "#F6F5F3",
  rule: "#E8E6E3",
  ink2: "#5A5A5A",
  white: "#FFFFFF",
  orange: "#FF8A4C",
  orange2: "#FFB085",
  ember: "#E0602A",
  tint: "#FFF1E9",
};

export const ease = Easing.bezier(0.22, 1, 0.36, 1);
export const easeIn = Easing.bezier(0.55, 0, 0.75, 0.2);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export function prog(frame: number, a: number, b: number, easing = ease) {
  return interpolate(frame, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** A springy 0→1 (overshoots a touch) that starts at `at`. */
export function pop(frame: number, at: number, damping = 14, stiffness = 170) {
  return spring({ frame: frame - at, fps: FPS, config: { damping, stiffness, mass: 0.9 } });
}

/**
 * Kinetic line. Words snap up from a mask one after another.
 * *asterisks* mark hot words: orange text on dark grounds, an orange marker swipe on light ones.
 */
export function Words({
  text, start, stagger = 3, dur = 14, style, out, align = "left", light = false,
}: { text: string; start: number; stagger?: number; dur?: number; style?: CSSProperties; out?: number; align?: "left" | "center"; light?: boolean }) {
  const frame = useCurrentFrame();
  const parts: { w: string; hot: boolean }[] = [];
  text.split(/(\*[^*]+\*)/).forEach((chunk) => {
    if (!chunk) return;
    const hot = chunk.startsWith("*") && chunk.endsWith("*");
    const body = hot ? chunk.slice(1, -1) : chunk;
    body.split(/(\s+)/).forEach((w) => { if (w) parts.push({ w, hot }); });
  });
  const o = out === undefined ? 0 : prog(frame, out, out + 10, easeIn);
  let k = 0;
  return (
    <div style={{ textAlign: align, ...style }}>
      {parts.map((p, i) => {
        if (/^\s+$/.test(p.w)) return <span key={i}>{" "}</span>;
        const t = prog(frame, start + k * stagger, start + k * stagger + dur);
        const m = prog(frame, start + k * stagger + 6, start + k * stagger + 20);
        k++;
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: "0.26em", marginBottom: "-0.26em", paddingTop: "0.04em", marginTop: "-0.04em" }}>
            <span style={{
              display: "inline-block", position: "relative",
              color: p.hot && !light ? C.orange : undefined,
              transform: `translateY(${(1 - t) * 140 + o * -140}%) rotate(${(1 - t) * 4}deg)`,
              transformOrigin: "left bottom",
            }}>
              {p.hot && light && (
                <span style={{ position: "absolute", left: "-0.06em", right: "-0.06em", bottom: "0.04em", height: "0.3em", background: C.orange, borderRadius: "0.08em", transform: `scaleX(${m})`, transformOrigin: "left", zIndex: 0 }} />
              )}
              <span style={{ position: "relative" }}>{p.w}</span>
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** The Catalyst mark: a rounded tile with an X. */
export function Mark({ size = 120, glow = 0, tile = "orange", x = C.char }: { size?: number; glow?: number; tile?: "orange" | "char"; x?: string }) {
  const id = `mk-${tile}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ overflow: "visible", flexShrink: 0, filter: glow ? `drop-shadow(0 0 ${size * 0.3 * glow}px rgba(255,138,76,${0.7 * glow}))` : undefined }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={tile === "orange" ? "#FFA06A" : "#2A2A2A"} />
          <stop offset="1" stopColor={tile === "orange" ? "#FF7A36" : "#141414"} />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${id})`} />
      <path d="M10.5 10.5l11 11M21.5 10.5l-11 11" stroke={x} strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

export function Avatar({ label, size = 56, bg = C.grey, fg = C.white }: { label: string; size?: number; bg?: string; fg?: string }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size, background: bg, color: fg, display: "grid", placeItems: "center", fontFamily: FONT, fontWeight: 700, fontSize: size * 0.4, flexShrink: 0 }}>{label}</div>
  );
}

/** Chat bubble inside the dark phone. Catalyst is orange (right), the patient dark grey (left). */
export function Bubble({
  side, children, time, ticks, p = 1, style, fs = 23, ai,
}: { side: "me" | "them"; children: ReactNode; time?: string; ticks?: boolean; p?: number; style?: CSSProperties; fs?: number; ai?: boolean }) {
  const me = side === "me";
  const s = Math.max(0, p);
  return (
    <div style={{ display: "flex", justifyContent: me ? "flex-end" : "flex-start", ...style }}>
      <div style={{
        maxWidth: "86%",
        background: me ? `linear-gradient(160deg, #FF9A62, ${C.orange})` : C.grey,
        color: me ? C.char : C.white,
        borderRadius: 22, borderBottomRightRadius: me ? 6 : 22, borderBottomLeftRadius: me ? 22 : 6,
        padding: "13px 17px 9px",
        fontFamily: FONT, fontSize: fs, lineHeight: 1.36, fontWeight: 500,
        boxShadow: me ? "0 14px 30px -14px rgba(255,138,76,0.6)" : "0 14px 30px -16px rgba(0,0,0,0.8)",
        opacity: clamp01(s * 2),
        transform: `translateY(${(1 - s) * 18}px) scale(${0.86 + 0.14 * s})`,
        transformOrigin: me ? "bottom right" : "bottom left",
      }}>
        <div>{children}</div>
        {time && (
          <div style={{ fontSize: 14, marginTop: 4, textAlign: "right", fontWeight: 700, opacity: me ? 0.62 : 0.55, letterSpacing: 0.3, display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center" }}>
            {ai && <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, padding: "1px 6px", borderRadius: 5, background: "rgba(26,26,26,0.16)" }}>AI</span>}
            {time}{ticks ? " ✓✓" : ""}
          </div>
        )}
      </div>
    </div>
  );
}

export function Typing({ frame, p = 1 }: { frame: number; p?: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", opacity: clamp01(p * 2), transform: `scale(${0.8 + 0.2 * p})`, transformOrigin: "right" }}>
      <div style={{ background: C.orange, borderRadius: 22, borderBottomRightRadius: 6, padding: "17px 20px", display: "flex", gap: 7 }}>
        {[0, 1, 2].map((i) => {
          const b = Math.sin((frame / 30) * Math.PI * 3.3 - i * 0.9);
          return <div key={i} style={{ width: 10, height: 10, borderRadius: 10, background: C.char, opacity: 0.4 + 0.6 * Math.max(0, b), transform: `translateY(${-Math.max(0, b) * 5}px)` }} />;
        })}
      </div>
    </div>
  );
}

/** A dark phone showing the clinic's WhatsApp thread with one patient. */
export function Phone({
  width = 470, height = 930, title, subtitle, avatar, children, style, clock = "1:15", glow = 0,
}: { width?: number; height?: number; title: string; subtitle?: ReactNode; avatar: ReactNode; children: ReactNode; style?: CSSProperties; clock?: string; glow?: number }) {
  return (
    <div style={{
      width, height, borderRadius: 64, padding: 12, position: "relative",
      background: "linear-gradient(150deg, #3d3d3d, #171717 40%, #0b0b0b)",
      boxShadow: `0 50px 90px -30px rgba(0,0,0,0.55), 0 0 0 2px #2c2c2c, inset 0 0 0 2px rgba(255,255,255,0.07), 0 0 ${120 * glow}px ${-10 + 30 * glow}px rgba(255,138,76,${0.5 * glow})`,
      ...style,
    }}>
      <div style={{ width: "100%", height: "100%", borderRadius: 53, overflow: "hidden", background: C.char2, position: "relative", display: "flex", flexDirection: "column" }}>
        <div style={{ height: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 38px 0", fontFamily: FONT, fontSize: 17, fontWeight: 700, color: C.white }}>
          <span>{clock}</span>
          <div style={{ width: 110, height: 30, borderRadius: 30, background: "#000", position: "absolute", left: "50%", top: 13, transform: "translateX(-50%)" }} />
          <span style={{ display: "flex", gap: 6, alignItems: "center", opacity: 0.9 }}>
            <svg width="20" height="14" viewBox="0 0 30 20"><rect x="0" y="12" width="5" height="8" rx="1.5" fill="#fff" /><rect x="8" y="8" width="5" height="12" rx="1.5" fill="#fff" /><rect x="16" y="4" width="5" height="16" rx="1.5" fill="#fff" /><rect x="24" y="0" width="5" height="20" rx="1.5" fill="#fff" /></svg>
            <svg width="28" height="14" viewBox="0 0 42 20"><rect x="0.5" y="0.5" width="36" height="19" rx="5" fill="none" stroke="#fff" opacity="0.5" /><rect x="3" y="3" width="26" height="14" rx="3" fill="#fff" /></svg>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 22px 15px", borderBottom: `1px solid ${C.grey2}`, background: "#181818" }}>
          <svg width="14" height="24" viewBox="0 0 22 36"><path d="M18 4L5 18l13 14" stroke={C.orange} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {avatar}
          <div style={{ fontFamily: FONT, color: C.white, minWidth: 0 }}>
            <div style={{ fontSize: 21, fontWeight: 700, whiteSpace: "nowrap" }}>{title}</div>
            {subtitle && <div style={{ fontSize: 15, color: C.mute, fontWeight: 600, marginTop: 1, whiteSpace: "nowrap" }}>{subtitle}</div>}
          </div>
        </div>
        <div style={{
          flex: 1, position: "relative", padding: "20px 18px", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 13,
          backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1.2px, transparent 1.3px)", backgroundSize: "26px 26px",
        }}>
          {children}
        </div>
        <div style={{ display: "flex", gap: 11, padding: "12px 16px 24px", alignItems: "center", background: "#181818" }}>
          <div style={{ flex: 1, height: 50, borderRadius: 30, background: C.grey2, color: C.mute, fontFamily: FONT, fontSize: 18, display: "flex", alignItems: "center", padding: "0 20px" }}>Message</div>
          <div style={{ width: 50, height: 50, borderRadius: 50, background: C.orange, display: "grid", placeItems: "center" }}>
            <svg width="21" height="21" viewBox="0 0 24 24"><path d="M3 11l18-8-8 18-2-8-8-2z" fill={C.char} /></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Pointer hand. */
export function Cursor({ x, y, opacity, press = 1 }: { x: number; y: number; opacity: number; press?: number }) {
  return (
    <svg width="64" height="78" viewBox="0 0 24 30" style={{ position: "absolute", left: x, top: y, opacity, transform: `scale(${press})`, transformOrigin: "30% 10%", filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.45))", zIndex: 50 }}>
      <path d="M9 2.5a2 2 0 0 1 4 0V12l1-.3a2 2 0 0 1 2.4 1.3l.1.4.7-.2a2 2 0 0 1 2.5 1.4l.1.5.4-.1a2 2 0 0 1 2.5 1.6l.8 4.6a8 8 0 0 1-2 6.7l-.9 1H10l-5.5-8.3a2 2 0 0 1 3-2.6L9 19.5z" fill="#fff" stroke={C.char} strokeWidth="1.2" />
    </svg>
  );
}

/** Small uppercase eyebrow with an orange tick. */
export function Eyebrow({ children, color = C.ink2, style }: { children: ReactNode; color?: string; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: FONT, fontSize: 20, fontWeight: 800, letterSpacing: 4, color, textTransform: "uppercase", ...style }}>
      <span style={{ width: 30, height: 4, borderRadius: 4, background: C.orange }} />
      {children}
    </div>
  );
}

/** A white UI card for the light grounds. */
export const paperCard: CSSProperties = {
  background: C.white,
  borderRadius: 26,
  border: `1.5px solid ${C.rule}`,
  boxShadow: "0 30px 70px -34px rgba(26,26,26,0.35), 0 2px 0 rgba(26,26,26,0.02)",
};

/** A frosted dark card for the charcoal grounds. */
export const darkCard: CSSProperties = {
  background: "linear-gradient(170deg, rgba(51,51,51,0.92), rgba(32,32,32,0.95))",
  border: "1.5px solid rgba(255,255,255,0.08)",
  borderRadius: 26,
  boxShadow: "0 40px 90px -30px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.06)",
};
