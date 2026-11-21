import React from "react";
import data from "./emoji.json";

const EMOJI = data as Record<string, { w: number; h: number; body: string }>;
const KEYS = Object.keys(EMOJI);
// Emoji may carry a variation selector (U+FE0F); strip it when matching.
const SPLIT = new RegExp(`(${KEYS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\uFE0F?`, "gu");

/** One Noto emoji as inline SVG, sized to the surrounding text. */
export const Emoji: React.FC<{ char: string; size?: string }> = ({ char, size = "1.12em" }) => {
  const e = EMOJI[char];
  if (!e) return <>{char}</>;
  return (
    <svg
      viewBox={`0 0 ${e.w} ${e.h}`}
      style={{ width: size, height: size, display: "inline-block", verticalAlign: "-0.18em", flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: e.body }}
    />
  );
};

/** Replaces known emoji characters in a string with <Emoji/>. */
export function emojify(text: string): React.ReactNode {
  const parts = text.split(SPLIT);
  if (parts.length === 1) return text;
  return parts.map((p, i) => (EMOJI[p] ? <Emoji key={i} char={p} /> : p ? <React.Fragment key={i}>{p}</React.Fragment> : null));
}
