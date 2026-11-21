import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CUE, f } from "../theme";
import { lerp, pop } from "../ui/anim";
import { LogoMark } from "../ui/Logo";
import { IosBanner } from "../ui/WhatsApp";

/** 20-25s: the morning notification. Rises out of the phone on the table (Shot 6). */
const FINAL = { x: 60, y: 1438, w: 960 };
const FROM = { x: 470, y: 1640 };

export const MorningBanner: React.FC = () => {
  const frame = useCurrentFrame();
  const at = f(CUE.banner);
  if (frame < at || frame > 758) return null;
  const s = pop(frame, at, { damping: 13, stiffness: 150, mass: 0.8 });
  const g1 = pop(frame, at + 5, { damping: 16, stiffness: 160 });
  const g2 = pop(frame, at + 9, { damping: 16, stiffness: 160 });
  const x = FROM.x - FINAL.w / 2 + (FINAL.x - (FROM.x - FINAL.w / 2)) * Math.min(1, s);
  const y = FROM.y + (FINAL.y - FROM.y) * s;
  const breathe = 1 + 0.012 * Math.sin((frame - at) / 9);

  const ghost = (k: number, v: number): React.CSSProperties => ({
    position: "absolute",
    left: 24 * k,
    right: 24 * k,
    top: 0,
    bottom: 0,
    borderRadius: 38,
    background: "rgba(240,240,244,0.55)",
    backdropFilter: "blur(20px)",
    transform: `translateY(${v * 18 * k}px)`,
    opacity: v * (1 - 0.25 * k),
    boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
  });

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          transform: `scale(${(0.3 + 0.7 * s) * breathe})`,
          transformOrigin: "50% 100%",
          opacity: lerp(s, [0, 0.3], [0, 1]),
        }}
      >
        <div style={ghost(2, g2)} />
        <div style={ghost(1, g1)} />
        <div data-qa="overlay:morning-banner" style={{ position: "relative" }}>
          <IosBanner
            width={FINAL.w}
            scale={1.08}
            icon={
              <div style={{ borderRadius: 18, overflow: "hidden", flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
                <LogoMark size={84} />
              </div>
            }
            title="Catalyst"
            body="7 new orders waiting for you ☕"
            time="now"
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
