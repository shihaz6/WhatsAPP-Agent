import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ORANGE } from "../theme";
import { easeIn, easeOut, lerp, pop } from "../ui/anim";
import { Logo } from "../ui/Logo";

/** 12-14s: flash of the Catalyst logo over the start of Shot 5. */
export const LogoFlash: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 354 || frame > 424) return null;
  const s = pop(frame, 361, { damping: 12, stiffness: 150, mass: 0.8 });
  const out = lerp(frame, [404, 416], [0, 1], easeIn);
  const ring = lerp(frame, [361, 384], [0, 1], easeOut);
  const shine = lerp(frame, [370, 390], [-0.3, 1.3]);

  return (
    <AbsoluteFill>
      {/* darken + focus */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(26,26,26,0.55) 0%, rgba(10,10,10,0.82) 75%)",
          opacity: lerp(frame, [360, 364], [0, 1]) * (1 - lerp(frame, [402, 418], [0, 1])),
        }}
      />
      {/* shock ring */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 960,
          width: 1100,
          height: 1100,
          marginLeft: -550,
          marginTop: -550,
          borderRadius: "50%",
          border: `${10 * (1 - ring) + 2}px solid ${ORANGE}`,
          transform: `scale(${0.2 + ring * 0.9})`,
          opacity: (1 - ring) * 0.8,
        }}
      />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          data-qa="overlay:logo"
          style={{
            position: "relative",
            transform: `scale(${(0.55 + 0.45 * s) * (1 - 0.35 * out)}) translateY(${out * -40}px)`,
            opacity: lerp(s, [0, 0.25], [0, 1]) * (1 - out),
            filter: `blur(${(1 - Math.min(1, s)) * 8 + out * 6}px)`,
          }}
        >
          <Logo size={150} glow={26} />
          {/* light sweep */}
          <div
            style={{
              position: "absolute",
              inset: -20,
              background: `linear-gradient(105deg, transparent ${shine * 100 - 12}%, rgba(255,255,255,0.55) ${shine * 100}%, transparent ${shine * 100 + 12}%)`,
              mixBlendMode: "overlay",
              pointerEvents: "none",
            }}
          />
        </div>
      </AbsoluteFill>
      {/* T5: white flash into the Catalyst moment (top layer) */}
      <AbsoluteFill style={{ background: "#fff", opacity: lerp(frame, [355, 360, 367], [0, 1, 0]) }} />
    </AbsoluteFill>
  );
};
