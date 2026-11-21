import React from "react";
import { WA } from "../theme";

type P = { size?: number; color?: string; style?: React.CSSProperties };

// WhatsApp glyph (speech bubble + handset), 24x24 path.
const WA_PATH =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

export const WaGlyph: React.FC<P> = ({ size = 24, color = "#fff", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
    <path d={WA_PATH} fill={color} />
  </svg>
);

/** iOS-style WhatsApp app icon (rounded square, green gradient). */
export const WaAppIcon: React.FC<{ size: number }> = ({ size }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.225,
      background: "linear-gradient(180deg, #5FFC7B 0%, #28D146 100%)",
      display: "grid",
      placeItems: "center",
      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
    }}
  >
    <WaGlyph size={size * 0.64} />
  </div>
);

export const Ticks: React.FC<P & { read?: boolean }> = ({ size = 18, read = true, style }) => (
  <svg width={size * 1.45} height={size} viewBox="0 0 16 11" style={style}>
    <path d="M11.07.65 4.7 7.02 2.36 4.68 1.3 5.74l3.4 3.4 7.43-7.43z" fill={read ? WA.tick : WA.meta} />
    <path d="M14.6.65 8.24 7.02l-.9-.9-1.06 1.06 1.96 1.96 7.43-7.43z" fill={read ? WA.tick : WA.meta} />
  </svg>
);

export const Chevron: React.FC<P> = ({ size = 28, color = WA.blue, style }) => (
  <svg width={size * 0.6} height={size} viewBox="0 0 12 20" style={style}>
    <path d="M10 2 2 10l8 8" stroke={color} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const VideoIcon: React.FC<P> = ({ size = 28, color = WA.blue }) => (
  <svg width={size * 1.3} height={size} viewBox="0 0 26 20">
    <rect x="1.5" y="3" width="15.5" height="14" rx="3.5" stroke={color} strokeWidth="2" fill="none" />
    <path d="m18.5 8 5.5-3.5v11L18.5 12z" stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round" />
  </svg>
);

export const PhoneIcon: React.FC<P> = ({ size = 28, color = WA.blue }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path
      d="M6.6 2.8c.5-.5 1.3-.5 1.8 0l2.3 2.6c.5.5.5 1.3 0 1.8L9.4 8.5c.9 2.2 2.6 4 4.9 5l1.4-1.3c.5-.5 1.3-.5 1.8 0l2.6 2.3c.5.5.5 1.3 0 1.8l-1.6 1.8c-.8.8-2 1.1-3.1.7C9.7 17.3 6.6 14.2 5.1 8.6c-.4-1.1-.1-2.3.7-3.1z"
      stroke={color}
      strokeWidth="1.9"
      fill="none"
      strokeLinejoin="round"
    />
  </svg>
);

export const PlusIcon: React.FC<P> = ({ size = 28, color = WA.blue }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M12 4v16M4 12h16" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const CameraIcon: React.FC<P> = ({ size = 28, color = WA.blue }) => (
  <svg width={size * 1.15} height={size} viewBox="0 0 26 22">
    <path
      d="M3 6.5A2.5 2.5 0 0 1 5.5 4h3l2-2.5h5l2 2.5h3A2.5 2.5 0 0 1 23 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 3 17.5z"
      stroke={color}
      strokeWidth="1.9"
      fill="none"
      strokeLinejoin="round"
    />
    <circle cx="13" cy="12" r="4.2" stroke={color} strokeWidth="1.9" fill="none" />
  </svg>
);

export const MicIcon: React.FC<P> = ({ size = 28, color = WA.blue }) => (
  <svg width={size * 0.8} height={size} viewBox="0 0 18 24">
    <rect x="5" y="1.5" width="8" height="13" rx="4" stroke={color} strokeWidth="1.9" fill="none" />
    <path d="M2 11a7 7 0 0 0 14 0M9 18v4.5" stroke={color} strokeWidth="1.9" fill="none" strokeLinecap="round" />
  </svg>
);

export const SendIcon: React.FC<P> = ({ size = 22, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M12 20V5M5.5 11 12 4.5l6.5 6.5" stroke={color} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const GlobeIcon: React.FC<P> = ({ size = 28, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9.2" stroke={color} strokeWidth="1.9" fill="none" />
    <path d="M2.8 12h18.4M12 2.8c2.6 2.7 3.9 5.8 3.9 9.2s-1.3 6.5-3.9 9.2c-2.6-2.7-3.9-5.8-3.9-9.2S9.4 5.5 12 2.8z" stroke={color} strokeWidth="1.9" fill="none" />
  </svg>
);

export const ClockIcon: React.FC<P & { minuteAngle?: number; hourAngle?: number }> = ({
  size = 28,
  color = "#fff",
  minuteAngle = 0,
  hourAngle = 300,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth="2" fill="none" />
    <line x1="12" y1="12" x2="12" y2="5.2" stroke={color} strokeWidth="2" strokeLinecap="round" transform={`rotate(${minuteAngle} 12 12)`} />
    <line x1="12" y1="12" x2="12" y2="7.6" stroke={color} strokeWidth="2.2" strokeLinecap="round" transform={`rotate(${hourAngle} 12 12)`} />
  </svg>
);

export const BoltIcon: React.FC<P> = ({ size = 24, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M13.5 2 4 13.5h6.5L9.5 22 20 9.5h-6.5z" fill={color} />
  </svg>
);

/** iOS status bar glyphs: signal, wifi, battery. */
export const StatusIcons: React.FC<{ color?: string; scale?: number }> = ({ color = "#000", scale = 1 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 7 * scale }}>
    <svg width={22 * scale} height={14 * scale} viewBox="0 0 22 14">
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 5.8} y={10 - i * 3.2} width="4" height={4 + i * 3.2} rx="1.2" fill={color} />
      ))}
    </svg>
    <svg width={20 * scale} height={14 * scale} viewBox="0 0 20 14">
      <path d="M10 13.2 7.3 10.3a3.8 3.8 0 0 1 5.4 0z" fill={color} />
      <path d="M4.6 7.6a7.6 7.6 0 0 1 10.8 0l-1.6 1.7a5.3 5.3 0 0 0-7.6 0z" fill={color} />
      <path d="M1.8 4.7a11.6 11.6 0 0 1 16.4 0l-1.6 1.6a9.3 9.3 0 0 0-13.2 0z" fill={color} />
    </svg>
    <svg width={30 * scale} height={14 * scale} viewBox="0 0 30 14">
      <rect x="0.8" y="0.8" width="25" height="12.4" rx="3.6" stroke={color} strokeOpacity="0.4" strokeWidth="1.4" fill="none" />
      <rect x="2.8" y="2.8" width="18" height="8.4" rx="2" fill={color} />
      <path d="M27.6 4.6v4.8c1-.3 1.6-1.3 1.6-2.4s-.6-2.1-1.6-2.4z" fill={color} fillOpacity="0.45" />
    </svg>
  </div>
);
