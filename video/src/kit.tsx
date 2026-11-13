// Building blocks shared by the scenes: easing helpers, backdrop, app window, sidebar,
// cursor and captions. The dashboard's own stylesheet is imported so the UI matches the app.

import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import "../../web/src/styles.css";
import "./video.css";
import { APP_H, APP_W, FADE } from "./timeline";

export const ease = Easing.bezier(0.22, 1, 0.36, 1); // smooth "ease-out-quint"

// 0 -> 1 between frames a and b (clamped, eased).
export function progress(frame: number, a: number, b: number, easing = ease) {
  return interpolate(frame, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

export function useSpring(delay = 0, config = { damping: 200, stiffness: 120, mass: 0.9 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config });
}

// Fade a whole scene in at its start and out at its end (for cross-dissolves).
export function SceneFade({ duration, children, style }: { duration: number; children: ReactNode; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const opacity = Math.min(progress(frame, 0, FADE), 1 - progress(frame, duration - FADE, duration));
  return <AbsoluteFill style={{ opacity, ...style }}>{children}</AbsoluteFill>;
}

// Light green backdrop with slow drifting soft light.
export function Backdrop() {
  const frame = useCurrentFrame();
  const drift = (speed: number, amp: number, phase = 0) => Math.sin(frame / speed + phase) * amp;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg, #f4faf6 0%, #e9f6ee 55%, #f7fbf8 100%)", overflow: "hidden" }}>
      <div className="blob" style={{ width: 900, height: 900, left: -260 + drift(90, 40), top: -320 + drift(110, 30, 1), background: "radial-gradient(circle, rgba(34,160,107,0.16), transparent 65%)" }} />
      <div className="blob" style={{ width: 1000, height: 1000, right: -360 + drift(120, 50, 2), bottom: -420 + drift(95, 40), background: "radial-gradient(circle, rgba(140,198,63,0.13), transparent 65%)" }} />
      <div className="grid-lines" />
    </AbsoluteFill>
  );
}

// A clean browser-style window holding the app at its natural size, scaled to `width`.
export function AppWindow({ x, y, width, children, zoom }: {
  x: number; y: number; width: number; children: ReactNode;
  zoom?: { scale: number; originX: number; originY: number };
}) {
  const scale = width / APP_W;
  const z = zoom ?? { scale: 1, originX: APP_W / 2, originY: APP_H / 2 };
  return (
    <div className="window" style={{ left: x, top: y, width, height: APP_H * scale + 40 }}>
      <div className="window-bar">
        <span className="window-dot" /><span className="window-dot" /><span className="window-dot" />
        <div className="window-url">catalyst · /admin</div>
      </div>
      <div style={{ width: APP_W * scale, height: APP_H * scale, overflow: "hidden", position: "relative" }}>
        <div style={{
          width: APP_W, height: APP_H, transform: `scale(${scale})`, transformOrigin: "0 0", position: "absolute",
        }}>
          <div style={{
            width: APP_W, height: APP_H,
            transform: `scale(${z.scale})`, transformOrigin: `${z.originX}px ${z.originY}px`,
          }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// The dashboard chrome: sidebar + main area.
export type Tab = "overview" | "conversations" | "classes" | "payments";
const NAV: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <Icon d={<><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>} /> },
  { id: "conversations", label: "Conversations", icon: <Icon d={<path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 17H10l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5z" />} /> },
  { id: "classes", label: "Classes", icon: <Icon d={<><rect x="4" y="5.5" width="16" height="14.5" rx="2" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></>} /> },
  { id: "payments", label: "Payments", icon: <Icon d={<><rect x="3.5" y="6" width="17" height="13" rx="2" /><path d="M3.5 10h17M15.5 14.5h2" /></>} /> },
];

export function Icon({ d, size = 18 }: { d: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
  );
}

export function LogoMark({ size = 30, draw = 1 }: { size?: number; draw?: number }) {
  const len = 16; // length of one X stroke in the 32-unit box
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="8" fill="#22a06b" />
      <path d="M10.5 10.5l11 11" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - Math.min(1, draw * 2))} />
      <path d="M21.5 10.5l-11 11" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - Math.max(0, Math.min(1, draw * 2 - 1)))} />
    </svg>
  );
}

export function AppShell({ tab, children }: { tab: Tab; children: ReactNode }) {
  return (
    <div className="shell" style={{ width: APP_W, height: APP_H, minHeight: 0, background: "var(--bg)", position: "relative" }}>
      <aside className="sidebar" style={{ height: APP_H, position: "relative" }}>
        <div className="brand">
          <LogoMark />
          <div className="brand-text"><span className="brand-product">Catalyst</span><span className="brand-company">by AlchemyX</span></div>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <div key={n.id} className={`nav-item ${tab === n.id ? "active" : ""}`}>{n.icon}<span>{n.label}</span></div>
          ))}
        </nav>
        <div className="nav-item sidebar-foot"><Icon d={<path d="M14 4.5h3.5A1.5 1.5 0 0 1 19 6v12a1.5 1.5 0 0 1-1.5 1.5H14M10 16l-4-4 4-4M6 12h9" />} /><span>Sign out</span></div>
      </aside>
      <main className="main" style={{ maxWidth: "none", height: APP_H, overflow: "hidden" }}>{children}</main>
    </div>
  );
}

// Mouse pointer that glides between keyframes (in app coordinates) and pulses on clicks.
export type CursorKey = { f: number; x: number; y: number };
export function Cursor({ keys, clicks = [], appear = 0 }: { keys: CursorKey[]; clicks?: number[]; appear?: number }) {
  const frame = useCurrentFrame();
  let x = keys[0].x, y = keys[0].y;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (frame >= a.f) {
      const p = progress(frame, a.f, b.f, Easing.bezier(0.45, 0, 0.2, 1));
      x = a.x + (b.x - a.x) * p;
      y = a.y + (b.y - a.y) * p;
    }
  }
  const opacity = progress(frame, appear, appear + 10);
  const press = clicks.reduce((s, c) => Math.max(s, 1 - Math.abs(frame - c - 3) / 4), 0);
  return (
    <div style={{ position: "absolute", left: x, top: y, zIndex: 50, opacity, pointerEvents: "none" }}>
      {clicks.map((c) => {
        const t = frame - c;
        if (t < 0 || t > 22) return null;
        const p = t / 22;
        return <div key={c} className="click-ring" style={{ transform: `translate(-50%, -50%) scale(${0.4 + p * 1.6})`, opacity: 1 - p }} />;
      })}
      <svg width="26" height="30" viewBox="0 0 26 30" style={{ transform: `scale(${1 - press * 0.15})`, transformOrigin: "4px 3px", filter: "drop-shadow(0 3px 6px rgba(21,36,28,0.25))" }}>
        <path d="M4 3l17 11.5-7.4 1.3 4.6 8.4-3.4 1.8-4.5-8.5L4.8 22z" fill="#15241c" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// Left-hand caption: small step label, headline, one supporting line.
export function Caption({ step, title, body, delay = 8 }: { step: string; title: string; body: string; delay?: number }) {
  const frame = useCurrentFrame();
  const line = (d: number) => {
    const p = progress(frame, delay + d, delay + d + 22);
    return { opacity: p, transform: `translateY(${(1 - p) * 18}px)` };
  };
  return (
    <div className="caption">
      <div className="caption-step" style={line(0)}><span className="caption-bar" />{step}</div>
      <h2 className="caption-title" style={line(5)}>{title}</h2>
      <p className="caption-body" style={line(11)}>{body}</p>
    </div>
  );
}

// Count up from `from` to `to` between frames a and b.
export function useCount(from: number, to: number, a: number, b: number) {
  const frame = useCurrentFrame();
  return Math.round(from + (to - from) * progress(frame, a, b));
}

export const lkr = (n: number) => `LKR ${new Intl.NumberFormat("en-LK").format(n)}`;

// Reveal style for items that slide in one after another.
export function stagger(frame: number, start: number, i: number, gap = 4, dist = 14): CSSProperties {
  const p = progress(frame, start + i * gap, start + i * gap + 18);
  return { opacity: p, transform: `translateY(${(1 - p) * dist}px)` };
}
