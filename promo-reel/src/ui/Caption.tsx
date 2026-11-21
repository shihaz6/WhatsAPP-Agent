import React from "react";
import { useCurrentFrame } from "remotion";
import { CHARCOAL, FONT_BRAND, ORANGE, SAFE_TOP, type Lang } from "../theme";
import { easeIn, lerp, pop } from "./anim";
import { emojify } from "./Emoji";

export const CAPTION_TOP = SAFE_TOP + 40;

/** Renders "*word*" segments in orange. */
export const Marked: React.FC<{ text: string; color?: string }> = ({ text, color = ORANGE }) => (
  <>
    {text.split(/(\*[^*]+\*)/g).map((part, i) =>
      part.startsWith("*") && part.endsWith("*") ? (
        <span key={i} style={{ color }}>
          {emojify(part.slice(1, -1))}
        </span>
      ) : (
        <React.Fragment key={i}>{emojify(part)}</React.Fragment>
      ),
    )}
  </>
);

/**
 * Bold caption in the top third. Each line is its own charcoal tag that slides in from below
 * (staggered), and the block lifts out at the end.
 */
export const Caption: React.FC<{ lines: string[]; from: number; to: number; lang: Lang; align?: "center" | "left" }> = ({
  lines,
  from,
  to,
  lang,
  align = "center",
}) => {
  const frame = useCurrentFrame();
  if (frame < from || frame > to) return null;
  const si = lang === "si";
  const exit = lerp(frame, [to - 7, to], [0, 1], easeIn);
  return (
    <div
      style={{
        position: "absolute",
        top: CAPTION_TOP,
        left: 48,
        right: 48,
        display: "flex",
        flexDirection: "column",
        alignItems: align === "left" ? "flex-start" : "center",
        gap: 10,
        opacity: 1 - exit,
        transform: `translateY(${-30 * exit}px)`,
        zIndex: 50,
      }}
    >
      {lines.map((line, i) => {
        const s = pop(frame, from + i * 3, { damping: 15, stiffness: 160, mass: 0.75 });
        return (
          <div
            key={i}
            data-qa="caption"
            style={{
              transform: `translateY(${(1 - s) * 70}px)`,
              opacity: lerp(s, [0, 0.45], [0, 1]),
              background: `rgba(26,26,26,0.92)`,
              borderRadius: 20,
              padding: si ? "10px 28px 14px" : "8px 28px 12px",
              fontFamily: FONT_BRAND,
              fontWeight: 800,
              fontSize: si ? 58 : 70,
              lineHeight: si ? 1.32 : 1.1,
              letterSpacing: si ? 0 : "-0.025em",
              color: "#fff",
              textAlign: "center",
              whiteSpace: "nowrap",
              boxShadow: `0 10px 30px rgba(0,0,0,0.28), inset 0 0 0 1px rgba(255,255,255,0.06)`,
              borderBottom: i === lines.length - 1 ? `5px solid ${ORANGE}` : undefined,
            }}
          >
            <Marked text={line} />
          </div>
        );
      })}
    </div>
  );
};

export { CHARCOAL };
