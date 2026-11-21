import React from "react";
import { FONT_UI, WA } from "../theme";
import { emojify } from "./Emoji";
import { CameraIcon, Chevron, MicIcon, PhoneIcon, PlusIcon, SendIcon, Ticks, VideoIcon } from "./icons";

const AVATAR_COLORS: Record<string, string> = {
  K: "#5B8DEF",
  F: "#E0699B",
  R: "#2FA37A",
  T: "#C9853A",
  N: "#8C6FE0",
  S: "#D9603B",
  A: "#3D9BB8",
};

export const Avatar: React.FC<{ name: string; size: number; bg?: string; children?: React.ReactNode }> = ({
  name,
  size,
  bg,
  children,
}) => {
  const initial = name.trim()[0]?.toUpperCase() ?? "?";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg ?? `linear-gradient(160deg, ${AVATAR_COLORS[initial] ?? "#7a8a99"} 0%, ${shade(AVATAR_COLORS[initial] ?? "#7a8a99")} 100%)`,
        color: "#fff",
        display: "grid",
        placeItems: "center",
        fontFamily: FONT_UI,
        fontWeight: 600,
        fontSize: size * 0.44,
        flexShrink: 0,
      }}
    >
      {children ?? initial}
    </div>
  );
};

function shade(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) - 40);
  const g = Math.max(0, ((n >> 8) & 255) - 40);
  const b = Math.max(0, (n & 255) - 40);
  return `rgb(${r},${g},${b})`;
}

/** WhatsApp chat wallpaper: beige with faint doodles. */
export const Wallpaper: React.FC = () => {
  const tile = encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180' fill='none' stroke='#8a7660' stroke-opacity='0.075' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'>
<circle cx='28' cy='30' r='11'/><path d='M22 30h12M28 24v12'/>
<path d='M90 18l5 10 11 1.6-8 7.8 1.9 11L90 43.3 80.1 48.4 82 37.4 74 29.6 85 28z'/>
<path d='M150 28c0-6 8-9 11-3 3-6 11-3 11 3 0 7-11 13-11 13s-11-6-11-13z'/>
<rect x='18' y='90' width='26' height='36' rx='5'/><path d='M27 120h8'/>
<path d='M80 100c8-14 28-14 36 0M86 112c5-7 19-7 24 0'/><circle cx='98' cy='122' r='2.5'/>
<path d='M140 92l24 12-24 12z'/>
<path d='M24 158c6-10 18-10 24 0s18 10 24 0'/>
<circle cx='112' cy='158' r='12'/><path d='M106 156h0M118 156h0M106 163c4 4 8 4 12 0'/>
<path d='M150 146h20v20h-20zM155 146v-5h10v5'/>
</svg>`);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: WA.wallpaper,
        backgroundImage: `url("data:image/svg+xml,${tile}")`,
        backgroundSize: "180px 180px",
      }}
    />
  );
};

export const ChatHeader: React.FC<{
  name: string;
  subtitle?: React.ReactNode;
  unread?: number | null;
  avatar: React.ReactNode;
  unreadBump?: number; // 0..1 pulse when the unread number changes
  compact?: boolean;
}> = ({ name, subtitle, unread, avatar, unreadBump = 0, compact }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: compact ? "14px 18px 14px 12px" : "16px 20px 16px 12px",
      background: "rgba(246,245,243,0.97)",
      borderBottom: "1px solid rgba(0,0,0,0.08)",
      fontFamily: FONT_UI,
      position: "relative",
      zIndex: 2,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 2, minWidth: unread != null ? 62 : 22 }}>
      <Chevron size={26} />
      {unread != null && (
        <span
          style={{
            color: WA.blue,
            fontSize: 25,
            fontWeight: 500,
            display: "inline-block",
            transform: `scale(${1 + unreadBump * 0.35})`,
            transformOrigin: "left center",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {unread}
        </span>
      )}
    </div>
    {avatar}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 25, fontWeight: 600, color: WA.text, lineHeight: 1.15, whiteSpace: "nowrap" }}>{name}</div>
      {subtitle && <div style={{ fontSize: 18, color: WA.meta, lineHeight: 1.3, whiteSpace: "nowrap" }}>{subtitle}</div>}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
      <VideoIcon size={22} />
      <PhoneIcon size={24} />
    </div>
  </div>
);

export const Bubble: React.FC<{
  side: "in" | "out";
  time: string;
  read?: boolean;
  tail?: boolean;
  appear?: number; // spring value 0..1
  label?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: number;
  fontSize?: number;
}> = ({ side, time, read = true, tail = true, appear = 1, label, children, maxWidth = 400, fontSize = 26 }) => {
  const out = side === "out";
  const bg = out ? WA.outBubble : WA.inBubble;
  const s = Math.max(0, appear);
  return (
    <div
      style={{
        display: "flex",
        justifyContent: out ? "flex-end" : "flex-start",
        padding: "0 14px",
        marginTop: tail ? 10 : 4,
        opacity: Math.min(1, s * 1.6),
        transform: `translateY(${(1 - Math.min(1, s)) * 18}px) scale(${0.82 + 0.18 * Math.min(1, s)})`,
        transformOrigin: out ? "right bottom" : "left bottom",
      }}
    >
      <div
        style={{
          position: "relative",
          maxWidth,
          background: bg,
          borderRadius: 18,
          borderTopRightRadius: out && tail ? 4 : 18,
          borderTopLeftRadius: !out && tail ? 4 : 18,
          padding: "8px 14px 8px 14px",
          boxShadow: "0 1px 0.5px rgba(11,20,26,0.13)",
          fontFamily: FONT_UI,
          fontSize,
          lineHeight: 1.3,
          color: WA.text,
          letterSpacing: "-0.005em",
        }}
      >
        {tail && (
          <svg
            width="14"
            height="18"
            viewBox="0 0 14 18"
            style={{ position: "absolute", top: 0, [out ? "right" : "left"]: -9 } as React.CSSProperties}
          >
            <path d={out ? "M0 0h14L0 16z" : "M14 0H0l14 16z"} fill={bg} />
          </svg>
        )}
        {label && <div style={{ marginBottom: 2 }}>{label}</div>}
        <span style={{ whiteSpace: "pre-wrap" }}>{typeof children === "string" ? emojify(children) : children}</span>
        {/* spacer so the meta never overlaps the last line */}
        <span style={{ display: "inline-block", width: out ? 118 : 84 }} />
        <span
          style={{
            position: "absolute",
            right: 12,
            bottom: 6,
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: fontSize * 0.62,
            color: WA.meta,
          }}
        >
          {time}
          {out && <Ticks size={fontSize * 0.56} read={read} />}
        </span>
      </div>
    </div>
  );
};

/** Incoming "typing" bubble with three bouncing dots. */
export const TypingBubble: React.FC<{ frame: number; appear?: number }> = ({ frame, appear = 1 }) => (
  <div
    style={{
      display: "flex",
      padding: "0 14px",
      marginTop: 10,
      opacity: Math.min(1, appear * 1.6),
      transform: `scale(${0.8 + 0.2 * Math.min(1, appear)})`,
      transformOrigin: "left bottom",
    }}
  >
    <div
      style={{
        position: "relative",
        background: WA.inBubble,
        borderRadius: 18,
        borderTopLeftRadius: 4,
        padding: "16px 20px",
        display: "flex",
        gap: 7,
        boxShadow: "0 1px 0.5px rgba(11,20,26,0.13)",
      }}
    >
      <svg width="14" height="18" viewBox="0 0 14 18" style={{ position: "absolute", top: 0, left: -9 }}>
        <path d="M14 0H0l14 16z" fill={WA.inBubble} />
      </svg>
      {[0, 1, 2].map((i) => {
        const ph = ((frame - i * 4) % 18) / 18;
        const up = Math.max(0, Math.sin(ph * Math.PI * 2));
        return (
          <div
            key={i}
            style={{
              width: 11,
              height: 11,
              borderRadius: "50%",
              background: "#8696A0",
              opacity: 0.45 + 0.55 * up,
              transform: `translateY(${-up * 4}px)`,
            }}
          />
        );
      })}
    </div>
  </div>
);

export const InputBar: React.FC<{ text?: string; caret?: boolean; sendScale?: number }> = ({
  text = "",
  caret = false,
  sendScale = 0,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 14px 16px",
      background: "rgba(246,245,243,0.97)",
      borderTop: "1px solid rgba(0,0,0,0.06)",
      fontFamily: FONT_UI,
    }}
  >
    <PlusIcon size={28} />
    <div
      style={{
        flex: 1,
        minHeight: 44,
        borderRadius: 22,
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.12)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        fontSize: 24,
        color: WA.text,
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
    >
      {emojify(text)}
      {caret && <span style={{ width: 2.5, height: 28, background: WA.teal, marginLeft: 2, display: "inline-block" }} />}
    </div>
    {sendScale > 0.02 ? (
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: WA.green,
          display: "grid",
          placeItems: "center",
          transform: `scale(${sendScale})`,
        }}
      >
        <SendIcon size={24} />
      </div>
    ) : (
      <div style={{ display: "flex", gap: 16 }}>
        <CameraIcon size={24} />
        <MicIcon size={26} />
      </div>
    )}
  </div>
);

/** iOS notification banner (frosted glass). */
export const IosBanner: React.FC<{
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  time?: string;
  width: number;
  scale?: number;
  dark?: boolean;
}> = ({ icon, title, body, time = "now", width, scale = 1, dark = false }) => (
  <div
    style={{
      width,
      display: "flex",
      alignItems: "center",
      gap: 20 * scale,
      padding: `${20 * scale}px ${24 * scale}px`,
      borderRadius: 38 * scale,
      background: dark ? "rgba(40,40,42,0.72)" : "rgba(246,246,248,0.80)",
      backdropFilter: "blur(28px) saturate(1.6)",
      WebkitBackdropFilter: "blur(28px) saturate(1.6)",
      boxShadow: "0 18px 50px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(255,255,255,0.35)",
      fontFamily: FONT_UI,
      color: dark ? "#fff" : "#000",
    }}
  >
    {icon}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 29 * scale, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{title}</span>
        <span style={{ fontSize: 23 * scale, color: dark ? "rgba(255,255,255,0.6)" : "rgba(60,60,67,0.6)" }}>{time}</span>
      </div>
      <div style={{ fontSize: 28 * scale, lineHeight: 1.25, marginTop: 2 * scale, letterSpacing: "-0.01em" }}>{typeof body === "string" ? emojify(body) : body}</div>
    </div>
  </div>
);
