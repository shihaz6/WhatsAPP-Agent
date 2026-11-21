import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CUE, f, ORANGE } from "../theme";
import { Clip } from "../ui/Clip";
import { easeIn, easeInOut, easeOut, lerp, noise } from "../ui/anim";

/*
 * Clip plan (source seconds, every clip is 3.92s long, prepared at 60fps):
 *   Shot 1  0.0-3.2s   src 0.60 -> 3.80 @1.00   phone lights up ~0.4s in
 *   Shot 2  2.8-9.4s   src 0.00 -> 3.83 @0.58   one continuous take: full frame, then left of the split
 *   Shot 3  5.73-10.7s src 0.00 -> 3.80 @0.76   right of the split (waiting), then full frame (typing)
 *   Shot 4  10.27-12.2 src 1.63 -> 3.81 @1.13   shopkeeper with the phone + cash drawer
 *   Shot 5  11.8-20.3s src 0.00 -> 3.81 @0.45   phone down, eats in peace (slow, smooth)
 *   Shot 6  19.7-25.3s src 0.00 -> 3.81 @0.68   morning coffee, picks up the phone, smiles
 * (prepared clips end at 3.83s, so no layer ever asks for a frame past the end)
 */

// Split-screen crops: which source x appears at the left edge of each 540px half.
export const SPLIT_CROP_2 = 230; // face + phone hand of the owner
export const SPLIT_CROP_3 = 170; // the customer's face and shoulders

export const Footage: React.FC = () => {
  const frame = useCurrentFrame();

  // ---- Shot 1: buzz shake on each notification + slow push in ----
  const shake = CUE.notifications.reduce((acc, s) => {
    const d = frame - f(s);
    return d >= 0 ? acc + 7 * Math.exp(-d / 2.6) : acc;
  }, 0);
  const s1Scale = lerp(frame, [0, 90], [1.0, 1.07]);
  // T1 (3.0s): zoom punch with blur
  const t1 = lerp(frame, [84, 91], [0, 1], easeIn);
  const t1in = lerp(frame, [88, 99], [1, 0], easeOut);

  // ---- Shot 2 / Shot 3 split geometry ----
  const t2 = lerp(frame, [172, 188], [0, 1], easeInOut); // full -> split
  const t3 = lerp(frame, [263, 278], [0, 1], easeInOut); // split -> shot 3 full
  const leftW = 1080 - 540 * t2; // width of the Shot 2 panel
  const shot2Off = SPLIT_CROP_2 * t2;
  const rightLeft = 1080 - 540 * t2 - 540 * t3; // Shot 3 panel x
  const rightW = 540 + 540 * t3;
  const shot3Off = SPLIT_CROP_3 * (1 - t3);
  const s2Scale = lerp(frame, [84, 280], [1.06, 1.0]);

  // ---- T4 whip pan (10.5s) ----
  const w = lerp(frame, [309, 316], [0, 1], easeIn);
  const wIn = lerp(frame, [314, 322], [1, 0], easeOut);

  // ---- Shot 4 ka-ching punch ----
  const k = frame - f(CUE.kaching);
  const kPunch = k >= 0 ? 0.045 * Math.exp(-k / 5) : 0;

  // ---- Shot 5 ----
  const s5Scale = lerp(frame, [354, 606], [1.1, 1.16]);

  // ---- T7 (20s) night -> morning ----
  const t7 = lerp(frame, [590, 606], [0, 1], easeInOut);
  const s6Scale = lerp(frame, [594, 756], [1.0, 1.06]);
  // ---- T8 (25s) -> end card: footage recedes ----
  const t8 = lerp(frame, [742, 756], [0, 1], easeIn);

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {/* Shot 1 */}
      <Clip
        shot={1}
        from={0}
        to={92}
        srcAt={0.6}
        rate={1}
        style={{ opacity: 1 - lerp(frame, [89, 92], [0, 1]) }}
        videoStyle={{
          transform: `translate(${noise(frame) * shake}px, ${noise(frame + 99) * shake * 0.6}px) scale(${s1Scale * (1 + 0.22 * t1)})`,
          transformOrigin: "30% 68%",
          filter: `blur(${t1 * 10}px) brightness(${1 + t1 * 0.35})`,
        }}
      />

      {/* Shot 2: full frame, then left half of the split */}
      <Clip
        shot={2}
        from={86}
        to={282}
        srcAt={0}
        rate={0.58}
        style={{
          left: -300 * t3,
          width: leftW,
          right: "auto",
          opacity: lerp(frame, [86, 90], [0, 1]),
        }}
        videoStyle={{
          position: "absolute",
          left: -shot2Off,
          top: 0,
          width: 1080,
          height: 1920,
          transform: `scale(${s2Scale * (1 + 0.2 * t1in)})`,
          transformOrigin: "50% 40%",
          filter: `blur(${t1in * 10}px) brightness(${1 - 0.35 * t3})`,
        }}
      />

      {/* Shot 3: slides in on the right, then expands to full frame */}
      <Clip
        shot={3}
        from={172}
        to={322}
        srcAt={0}
        rate={0.76}
        style={{
          left: rightLeft,
          width: rightW,
          right: "auto",
          transform: `translateX(${-640 * w}px)`,
          filter: `blur(${w * 16}px)`,
          opacity: 1 - lerp(frame, [315, 318], [0, 1]),
        }}
        videoStyle={{
          position: "absolute",
          left: -shot3Off,
          top: 0,
          width: 1080,
          height: 1920,
          transform: `scale(${lerp(frame, [172, 322], [1.0, 1.08])})`,
          transformOrigin: "40% 30%",
        }}
      />

      {/* split divider */}
      {t2 > 0 && t3 < 1 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: rightLeft - 3,
            width: 6,
            background: ORANGE,
            boxShadow: `0 0 24px rgba(255,138,76,0.8)`,
            opacity: Math.min(t2, 1 - t3),
          }}
        />
      )}

      {/* Shot 4 */}
      <Clip
        shot={4}
        from={308}
        to={366}
        srcAt={1.63}
        rate={1.13}
        style={{
          opacity: lerp(frame, [313, 316], [0, 1]),
          transform: `translateX(${640 * wIn}px)`,
          filter: `blur(${wIn * 16}px)`,
        }}
        videoStyle={{ transform: `scale(${1.02 + kPunch})`, transformOrigin: "55% 60%" }}
      />

      {/* Shot 5 */}
      <Clip
        shot={5}
        from={354}
        to={608}
        srcAt={0}
        rate={0.45}
        style={{ opacity: frame < 361 ? 0 : 1 }}
        videoStyle={{ transform: `scale(${s5Scale})`, transformOrigin: "0% 0%" }}
      />

      {/* Shot 6 */}
      <Clip
        shot={6}
        from={590}
        to={758}
        srcAt={0}
        rate={0.68}
        style={{ opacity: t7 }}
        videoStyle={{
          transform: `scale(${s6Scale * (1 - 0.06 * t8)})`,
          transformOrigin: "50% 40%",
          filter: `brightness(${1 - 0.5 * t8})`,
        }}
      />

      {/* T7: warm morning bloom */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(circle at 70% 30%, rgba(255,236,200,1) 0%, rgba(255,214,160,0.85) 45%, rgba(255,190,120,0.5) 100%)",
          opacity: lerp(frame, [588, 599, 612], [0, 0.75, 0]),
          mixBlendMode: "screen",
        }}
      />
    </AbsoluteFill>
  );
};
