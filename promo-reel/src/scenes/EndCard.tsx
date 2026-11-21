import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Copy } from "../copy";
import { CHARCOAL, CUE, f, FONT_BRAND, ORANGE, SAFE_BOTTOM, type Lang } from "../theme";
import { easeOut, lerp, pop } from "../ui/anim";
import { WaGlyph } from "../ui/icons";
import { Emoji } from "../ui/Emoji";
import { Logo } from "../ui/Logo";

/** 25-30s: end card on charcoal. */
export const EndCard: React.FC<{ copy: Copy; lang: Lang }> = ({ copy, lang }) => {
  const frame = useCurrentFrame();
  const start = f(CUE.endCard);
  if (frame < start - 8) return null;
  const si = lang === "si";

  const wipe = lerp(frame, [start - 7, start + 6], [0, 1], easeOut);
  const logo = pop(frame, start + 8, { damping: 13, stiffness: 160 });
  const btnAt = f(CUE.button);
  const btn = pop(frame, btnAt, { damping: 11, stiffness: 170, mass: 0.8 });
  const pulse = frame > btnAt + 15 ? 1 + 0.025 * Math.sin(((frame - btnAt - 15) / 30) * Math.PI * 2 * 1.1) : 1;
  const shine = ((frame - btnAt - 20) % 50) / 50; // sweep every ~1.7s
  const num = pop(frame, btnAt + 14, { damping: 15, stiffness: 160 });
  const foot = lerp(frame, [btnAt + 22, btnAt + 34], [0, 1]);
  const finger = frame > btnAt ? Math.abs(Math.sin(((frame - btnAt) / 30) * Math.PI * 1.6)) * 8 : 0;

  const rise = (at: number) => {
    const s = pop(frame, at, { damping: 16, stiffness: 150 });
    return { transform: `translateY(${(1 - s) * 60}px)`, opacity: lerp(s, [0, 0.4], [0, 1]) };
  };

  return (
    <AbsoluteFill
      style={{
        background: CHARCOAL,
        transform: `translateY(${(1 - wipe) * 1920}px)`,
        borderTop: wipe < 1 ? `10px solid ${ORANGE}` : undefined,
        overflow: "hidden",
      }}
    >
      {/* warm glows */}
      <div
        style={{
          position: "absolute",
          left: -300,
          top: 120,
          width: 1680,
          height: 1100,
          background: "radial-gradient(closest-side, rgba(255,138,76,0.20), rgba(255,138,76,0) 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 200,
          top: 1050,
          width: 680,
          height: 520,
          background: "radial-gradient(closest-side, rgba(255,138,76,0.16), rgba(255,138,76,0) 70%)",
          opacity: btn,
        }}
      />
      {/* faint dotted texture */}
      <AbsoluteFill
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1.5px, transparent 1.5px)",
          backgroundSize: "34px 34px",
          maskImage: "linear-gradient(180deg, transparent 0%, #000 30%, #000 70%, transparent 100%)",
        }}
      />

      <AbsoluteFill style={{ alignItems: "center", paddingTop: si ? 430 : 500 }}>
        <div data-qa="end:logo" style={{ transform: `scale(${0.6 + 0.4 * logo})`, opacity: lerp(logo, [0, 0.3], [0, 1]) }}>
          <Logo size={120} glow={18} />
        </div>

        <div style={{ marginTop: 86, display: "flex", flexDirection: "column", alignItems: "center", gap: si ? 4 : 0 }}>
          {copy.endHeadline.map((line, i) => (
            <div
              key={i}
              data-qa="end:headline"
              style={{
                ...rise(start + 14 + i * 4),
                fontFamily: FONT_BRAND,
                fontWeight: 800,
                fontSize: si ? 76 : 98,
                lineHeight: si ? 1.3 : 1.08,
                letterSpacing: si ? 0 : "-0.035em",
                color: i === copy.endHeadline.length - 1 ? ORANGE : "#fff",
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              {line}
            </div>
          ))}
        </div>

        {/* CTA button */}
        <div
          data-qa="end:button"
          style={{
            marginTop: 96,
            position: "relative",
            transform: `scale(${(0.5 + 0.5 * btn) * pulse})`,
            opacity: lerp(btn, [0, 0.25], [0, 1]),
            borderRadius: 999,
            background: `linear-gradient(180deg, #FF9A62 0%, ${ORANGE} 55%, #F27A3A 100%)`,
            padding: si ? "26px 54px 30px" : "28px 70px 32px",
            boxShadow: "0 22px 60px rgba(255,138,76,0.45), inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -4px 0 rgba(0,0,0,0.12)",
            textAlign: "center",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontFamily: FONT_BRAND,
              fontWeight: 800,
              fontSize: si ? 48 : 74,
              lineHeight: si ? 1.35 : 1.1,
              color: "#fff",
              letterSpacing: si ? 0 : "-0.02em",
              whiteSpace: "nowrap",
            }}
          >
            {copy.endButton.replace(" 👇", "")}{" "}
            <span style={{ display: "inline-block", transform: `translateY(${finger}px)` }}>
              <Emoji char="👇" />
            </span>
          </div>
          <div
            style={{
              fontFamily: FONT_BRAND,
              fontWeight: 700,
              fontSize: si ? 36 : 42,
              lineHeight: 1.3,
              marginTop: 6,
              color: "rgba(255,255,255,0.95)",
              whiteSpace: "nowrap",
            }}
          >
            {copy.endButtonSub}
          </div>
          {frame > btnAt + 20 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(105deg, transparent ${shine * 160 - 40}%, rgba(255,255,255,0.35) ${shine * 160 - 25}%, transparent ${shine * 160 - 10}%)`,
              }}
            />
          )}
        </div>

        {/* WhatsApp number */}
        <div
          data-qa="end:number"
          style={{
            marginTop: 84,
            display: "flex",
            alignItems: "center",
            gap: 18,
            transform: `translateY(${(1 - num) * 40}px)`,
            opacity: lerp(num, [0, 0.4], [0, 1]),
          }}
        >
          <div style={{ width: 68, height: 68, borderRadius: "50%", background: "#25D366", display: "grid", placeItems: "center" }}>
            <WaGlyph size={42} />
          </div>
          <span style={{ fontFamily: FONT_BRAND, fontWeight: 700, fontSize: 60, color: "#fff", letterSpacing: "-0.01em" }}>
            +94 78 822 5521
          </span>
        </div>
      </AbsoluteFill>

      {/* footer */}
      <div
        data-qa="end:footer"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: SAFE_BOTTOM - 74,
          textAlign: "center",
          fontFamily: FONT_BRAND,
          fontWeight: 500,
          fontSize: 30,
          color: "rgba(255,255,255,0.62)",
          letterSpacing: "0.01em",
          opacity: foot,
        }}
      >
        <span style={{ color: "#fff", fontWeight: 700 }}>AlchemyX</span>
        <span style={{ color: ORANGE, margin: "0 14px" }}>·</span>
        Where AI Meets Business
      </div>
    </AbsoluteFill>
  );
};
