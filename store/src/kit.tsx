// Shared look and motion for the Catalyst department-store demo (vertical 1080×1920, silent).
// Brand palette: orange #FF8A4C, charcoal #1A1A1A, white. Text is sized to read on a phone held upright.

import { loadFont as loadBricolage } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadJakarta } from "@remotion/google-fonts/PlusJakartaSans";
import { loadFont as loadSinhala } from "@remotion/google-fonts/NotoSansSinhala";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import type { CSSProperties, ReactNode } from "react";
import { Easing, interpolate, spring, useCurrentFrame } from "remotion";
import cuesJson from "./cues.json";

loadBricolage("normal", { weights: ["600", "700", "800"], subsets: ["latin"] });
loadJakarta("normal", { weights: ["500", "600", "700", "800"], subsets: ["latin"] });
loadSinhala("normal", { weights: ["500", "600", "700"], subsets: ["sinhala"] });
// The Catalyst web dashboard (web/) uses Inter.
loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

export const cues = cuesJson;
export const FPS = cues.fps;
export const W = 1080;
export const H = 1920;

export const FONT = `"Plus Jakarta Sans", "Noto Sans Sinhala", "Segoe UI Emoji", sans-serif`;
export const DISPLAY = `"Bricolage Grotesque", "Plus Jakarta Sans", "Noto Sans Sinhala", sans-serif`;

export const C = {
  char: "#1A1A1A",
  char2: "#141414",
  grey: "#333333",
  grey2: "#262626",
  mute: "#8A8A8A",
  soft: "#C4C4C4",
  paper: "#F6F5F3",
  rule: "#E8E6E3",
  ink2: "#555555",
  white: "#FFFFFF",
  orange: "#FF8A4C",
  orange2: "#FFB085",
  ember: "#D9561C",
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

export function pop(frame: number, at: number, damping = 14, stiffness = 170) {
  return spring({ frame: frame - at, fps: FPS, config: { damping, stiffness, mass: 0.9 } });
}

/** Kinetic line: words snap up one after another. *asterisks* mark hot words (orange, or an orange marker on light grounds). */
export function Words({
  text, start, stagger = 3, dur = 14, style, align = "left", light = false, hot = C.orange,
}: { text: string; start: number; stagger?: number; dur?: number; style?: CSSProperties; align?: "left" | "center"; light?: boolean; hot?: string }) {
  const frame = useCurrentFrame();
  const parts: { w: string; hot: boolean }[] = [];
  text.split(/(\*[^*]+\*)/).forEach((chunk) => {
    if (!chunk) return;
    const hot = chunk.startsWith("*") && chunk.endsWith("*");
    const body = hot ? chunk.slice(1, -1) : chunk;
    body.split(/(\s+)/).forEach((w) => { if (w) parts.push({ w, hot }); });
  });
  let k = 0;
  return (
    <div style={{ textAlign: align, ...style }}>
      {parts.map((p, i) => {
        if (/^\s+$/.test(p.w)) return <span key={i}>{" "}</span>;
        const t = prog(frame, start + k * stagger, start + k * stagger + dur);
        const m = prog(frame, start + k * stagger + 6, start + k * stagger + 20);
        k++;
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: "0.22em", marginBottom: "-0.22em", paddingTop: "0.04em", marginTop: "-0.04em" }}>
            <span style={{ display: "inline-block", position: "relative", color: p.hot && !light ? hot : undefined, transform: `translateY(${(1 - t) * 140}%) rotate(${(1 - t) * 4}deg)`, transformOrigin: "left bottom" }}>
              {p.hot && light && (
                <span style={{ position: "absolute", left: "-0.05em", right: "-0.05em", bottom: "0.06em", height: "0.32em", background: C.orange, borderRadius: "0.08em", transform: `scaleX(${m})`, transformOrigin: "left", zIndex: 0 }} />
              )}
              <span style={{ position: "relative" }}>{p.w}</span>
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** Scene headline block at the top of the frame: an eyebrow and a big two-line caption. */
export function Caption({ eyebrow, text, start = 4, light = true, top = 120 }: { eyebrow: string; text: string; start?: number; light?: boolean; top?: number }) {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top, color: light ? C.char : C.white }}>
      <Eyebrow color={light ? C.ink2 : C.soft} style={{ opacity: prog(f, start, start + 10) }}>{eyebrow}</Eyebrow>
      <Words text={text} light={light} start={start + 4} stagger={3} style={{ marginTop: 18, fontFamily: DISPLAY, fontSize: 92, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02 }} />
    </div>
  );
}

export function Eyebrow({ children, color = C.ink2, style }: { children: ReactNode; color?: string; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: FONT, fontSize: 30, fontWeight: 800, letterSpacing: 4, color, textTransform: "uppercase", ...style }}>
      <span style={{ width: 40, height: 6, borderRadius: 6, background: C.orange }} />
      {children}
    </div>
  );
}

/** The Catalyst mark: a rounded orange tile with an X. */
export function Mark({ size = 120, glow = 0 }: { size?: number; glow?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ overflow: "visible", flexShrink: 0, filter: glow ? `drop-shadow(0 0 ${size * 0.3 * glow}px rgba(255,138,76,${0.7 * glow}))` : undefined }}>
      <defs>
        <linearGradient id="mk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFA06A" />
          <stop offset="1" stopColor="#FF7A36" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#mk)" />
      <path d="M10.5 10.5l11 11M21.5 10.5l-11 11" stroke={C.char} strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

/** Chat bubble. "me" = the store's Catalyst (orange, right); "them" = the customer (dark grey, left). */
export function Bubble({
  side, children, time, p = 1, fs = 38, ai, style,
}: { side: "me" | "them"; children: ReactNode; time?: string; p?: number; fs?: number; ai?: boolean; style?: CSSProperties }) {
  const me = side === "me";
  const s = Math.max(0, p);
  return (
    <div style={{ display: "flex", justifyContent: me ? "flex-end" : "flex-start", ...style }}>
      <div style={{
        maxWidth: "88%",
        background: me ? `linear-gradient(160deg, #FF9A62, ${C.orange})` : C.grey,
        color: me ? C.char : C.white,
        borderRadius: 32, borderBottomRightRadius: me ? 8 : 32, borderBottomLeftRadius: me ? 32 : 8,
        padding: "18px 26px 12px",
        fontFamily: FONT, fontSize: fs, lineHeight: 1.32, fontWeight: 600,
        boxShadow: me ? "0 18px 36px -16px rgba(255,138,76,0.7)" : "0 18px 36px -18px rgba(0,0,0,0.8)",
        opacity: clamp01(s * 2),
        transform: `translateY(${(1 - s) * 24}px) scale(${0.86 + 0.14 * s})`,
        transformOrigin: me ? "bottom right" : "bottom left",
      }}>
        <div>{children}</div>
        {time && (
          <div style={{ fontSize: 22, marginTop: 6, fontWeight: 700, opacity: me ? 0.65 : 0.6, display: "flex", justifyContent: "flex-end", gap: 10, alignItems: "center" }}>
            {ai && <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: 1, padding: "2px 8px", borderRadius: 6, background: "rgba(26,26,26,0.16)" }}>AI</span>}
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
      <div style={{ background: C.orange, borderRadius: 32, borderBottomRightRadius: 8, padding: "24px 28px", display: "flex", gap: 10 }}>
        {[0, 1, 2].map((i) => {
          const b = Math.sin((frame / 30) * Math.PI * 3.3 - i * 0.9);
          return <div key={i} style={{ width: 15, height: 15, borderRadius: 15, background: C.char, opacity: 0.4 + 0.6 * Math.max(0, b), transform: `translateY(${-Math.max(0, b) * 7}px)` }} />;
        })}
      </div>
    </div>
  );
}

/** Typing dots between two cue frames, then nothing (the reply bubble takes its place). */
export function Dots({ f, from, to }: { f: number; from: number; to: number }) {
  if (f < from || f >= to) return null;
  return <div style={{ height: 63 }}><Typing frame={f} p={prog(f, from, from + 6) * (1 - prog(f, to - 4, to))} /></div>;
}

/** WhatsApp-style chat as the store sees it. Use `bezel` for a full phone, or leave it off for a flat chat card. */
export function Chat({
  width = 940, height = 1300, title = "Customer", subtitle, children, style, clock = "4:20", bezel = true, glow = 0, composer = true,
}: { width?: number; height?: number; title?: string; subtitle?: ReactNode; children: ReactNode; style?: CSSProperties; clock?: string; bezel?: boolean; glow?: number; composer?: boolean }) {
  const inner = (
    <div style={{ width: "100%", height: "100%", borderRadius: bezel ? 70 : 40, overflow: "hidden", background: C.char2, position: "relative", display: "flex", flexDirection: "column" }}>
      {bezel && (
        <div style={{ height: 70, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 60px 0", fontFamily: FONT, fontSize: 26, fontWeight: 700, color: C.white }}>
          <span>{clock}</span>
          <div style={{ width: 150, height: 40, borderRadius: 40, background: "#000", position: "absolute", left: "50%", top: 18, transform: "translateX(-50%)" }} />
          <svg width="42" height="20" viewBox="0 0 42 20"><rect x="0.5" y="0.5" width="36" height="19" rx="5" fill="none" stroke="#fff" opacity="0.5" /><rect x="3" y="3" width="26" height="14" rx="3" fill="#fff" /></svg>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 20, padding: bezel ? "16px 34px 20px" : "22px 34px", borderBottom: `1px solid ${C.grey2}`, background: "#1C1C1C" }}>
        <div style={{ width: 70, height: 70, borderRadius: 70, background: "#454545", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <svg width="38" height="38" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4.2" fill="#9A9A9A" /><path d="M3.5 21c1-4.4 4.4-6.6 8.5-6.6s7.5 2.2 8.5 6.6z" fill="#9A9A9A" /></svg>
        </div>
        <div style={{ fontFamily: FONT, color: C.white, minWidth: 0 }}>
          <div style={{ fontSize: 34, fontWeight: 700, whiteSpace: "nowrap" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 25, color: C.orange, fontWeight: 700, marginTop: 2, whiteSpace: "nowrap" }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{
        flex: 1, position: "relative", padding: "26px 28px", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 20,
        backgroundImage: "radial-gradient(rgba(255,255,255,0.035) 1.5px, transparent 1.6px)", backgroundSize: "34px 34px",
      }}>
        {children}
      </div>
      {composer && (
        <div style={{ display: "flex", gap: 16, padding: bezel ? "16px 26px 34px" : "16px 26px", alignItems: "center", background: "#1C1C1C" }}>
          <div style={{ flex: 1, height: 72, borderRadius: 40, background: C.grey2, color: C.mute, fontFamily: FONT, fontSize: 28, display: "flex", alignItems: "center", padding: "0 30px" }}>Message</div>
          <div style={{ width: 72, height: 72, borderRadius: 72, background: C.orange, display: "grid", placeItems: "center" }}>
            <svg width="30" height="30" viewBox="0 0 24 24"><path d="M3 11l18-8-8 18-2-8-8-2z" fill={C.char} /></svg>
          </div>
        </div>
      )}
    </div>
  );
  return (
    <div style={{
      width, height, position: "relative",
      borderRadius: bezel ? 86 : 40, padding: bezel ? 16 : 0,
      background: bezel ? "linear-gradient(150deg, #3d3d3d, #171717 40%, #0b0b0b)" : undefined,
      boxShadow: `0 50px 100px -30px rgba(0,0,0,0.55), 0 0 0 2px #2c2c2c, 0 0 ${140 * glow}px ${-10 + 30 * glow}px rgba(255,138,76,${0.5 * glow})`,
      ...style,
    }}>
      {inner}
    </div>
  );
}

/** A chip that pops in under a chat: "✓ From your item list", "→ Sent to staff". */
export function Tag({ children, p, dark = false, style }: { children: ReactNode; p: number; dark?: boolean; style?: CSSProperties }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 14, padding: "16px 28px", borderRadius: 999,
      background: dark ? C.char : C.white, color: dark ? C.white : C.char,
      border: `2.5px solid ${C.orange}`, fontFamily: FONT, fontSize: 34, fontWeight: 800, whiteSpace: "nowrap",
      boxShadow: "0 20px 40px -20px rgba(0,0,0,0.5)",
      opacity: clamp01(p * 1.5), transform: `translateY(${(1 - p) * 30}px) scale(${0.85 + 0.15 * p})`, ...style,
    }}>{children}</div>
  );
}

/** Pointer arrow. */
export function Cursor({ x, y, opacity, press = 1 }: { x: number; y: number; opacity: number; press?: number }) {
  return (
    <svg width="58" height="72" viewBox="0 0 20 25" style={{ position: "absolute", left: x, top: y, opacity, transform: `scale(${press})`, transformOrigin: "10% 5%", filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.4))", zIndex: 50 }}>
      <path d="M2 1.5l15 13.2-6.6.6 3.9 7.6-3 1.4-3.8-7.6L2 21.4z" fill={C.char} stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export const paperCard: CSSProperties = {
  background: C.white,
  borderRadius: 36,
  border: `2px solid ${C.rule}`,
  boxShadow: "0 40px 80px -36px rgba(26,26,26,0.4)",
};
