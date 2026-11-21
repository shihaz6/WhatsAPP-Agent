import { Easing, interpolate, spring } from "remotion";
import { FPS } from "../theme";

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Clamped interpolate. */
export const lerp = (
  frame: number,
  input: number[],
  output: number[],
  easing?: (t: number) => number,
) => interpolate(frame, input, output, { ...CLAMP, easing });

/** Snappy UI spring starting at frame `at` (0 -> 1, slight overshoot). */
export const pop = (frame: number, at: number, cfg: { damping?: number; stiffness?: number; mass?: number } = {}) =>
  spring({
    frame: frame - at,
    fps: FPS,
    config: { damping: cfg.damping ?? 14, stiffness: cfg.stiffness ?? 190, mass: cfg.mass ?? 0.7 },
  });

/** Smooth spring without overshoot. */
export const glide = (frame: number, at: number, durationInFrames = 12) =>
  spring({ frame: frame - at, fps: FPS, config: { damping: 200 }, durationInFrames });

export const easeOut = Easing.out(Easing.cubic);
export const easeIn = Easing.in(Easing.cubic);
export const easeInOut = Easing.inOut(Easing.cubic);

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Visible inside [from, to] (frames, inclusive) */
export const within = (frame: number, from: number, to: number) => frame >= from && frame <= to;

/** Deterministic pseudo-random in [-1, 1] for a given integer seed. */
export const noise = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
};
