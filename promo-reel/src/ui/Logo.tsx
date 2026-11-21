import React from "react";
import { FONT_BRAND, ORANGE } from "../theme";

/**
 * The Catalyst mark, redrawn from the dashboard's <Logo>: an orange rounded square
 * with a white "X" made of two rounded bars (the back bar at 70% white).
 */
export const LogoMark: React.FC<{ size: number; glow?: number }> = ({ size, glow = 0 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    style={{ display: "block", filter: glow ? `drop-shadow(0 0 ${glow}px rgba(255,138,76,0.75))` : undefined }}
  >
    <rect x="0" y="0" width="32" height="32" rx="9" fill={ORANGE} />
    <rect x="13" y="9" width="6" height="14" rx="3" fill="rgba(255,255,255,0.7)" transform="rotate(45 16 16)" />
    <rect x="13" y="9" width="6" height="14" rx="3" fill="#fff" transform="rotate(-45 16 16)" />
  </svg>
);

export const Logo: React.FC<{ size: number; color?: string; glow?: number }> = ({ size, color = "#fff", glow }) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.32 }}>
    <LogoMark size={size} glow={glow} />
    <span
      style={{
        fontFamily: FONT_BRAND,
        fontWeight: 700,
        fontSize: size * 0.78,
        letterSpacing: "-0.03em",
        color,
        lineHeight: 1,
        marginTop: -size * 0.06,
      }}
    >
      catalyst
    </span>
  </div>
);
