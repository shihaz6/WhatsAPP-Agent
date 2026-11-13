import type { ReactNode } from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Backdrop, C, Caption, FONT, O, progress, useOrient, useSpring } from "../kit";

// 15-30s: one screenshot per 3s beat, each with ONE caption on a dark scrim.
export const BEAT = 90;
const IMG_RATIO = 1.6; // screenshots are 1600x1000 (exported at 2x)

// Shows `src` inside a w x h window, zoomed by z and centred on (fx, fy) without leaving gaps.
function Shot({ src, w, h, fx, fy, z }: { src: string; w: number; h: number; fx: number; fy: number; z: number }) {
  let iw = w * z, ih = iw / IMG_RATIO;
  if (ih < h) { iw *= h / ih; ih = h; }
  const left = Math.min(0, Math.max(w - iw, w / 2 - fx * iw));
  const top = Math.min(0, Math.max(h - ih, h / 2 - fy * ih));
  return (
    <div style={{ width: w, height: h, overflow: "hidden", position: "relative", borderRadius: 28 }}>
      <Img src={staticFile(src)} style={{ position: "absolute", left, top, width: iw, height: ih }} />
    </div>
  );
}

// Window that slides in, slowly pushes in toward the focus point, and slides out at the end of the beat.
function Window({ src, focus, vFocus }: { src: string; focus: [number, number]; vFocus: [number, number] }) {
  const frame = useCurrentFrame();
  const { portrait, width, pick } = useOrient();
  const s = useSpring(0, { damping: 18, stiffness: 120, mass: 0.9 });
  const out = progress(frame, BEAT - 10, BEAT);
  const push = interpolate(frame, [0, BEAT], [0, 1]);

  const w = pick(1500, 920), h = pick(938, 1100);
  const left = (width - w) / 2, top = pick(52, 210);
  const [fx, fy] = portrait ? vFocus : focus;
  const z = portrait ? 2 + push * 0.12 : 1 + push * 0.07;

  return (
    <div style={{
      position: "absolute", left, top, width: w, height: h,
      transform: `translateX(${(1 - s) * 220 - out * 220}px) scale(${0.93 + 0.07 * s})`, opacity: Math.min(1, s * 1.6) * (1 - out),
    }}>
      <div style={{ position: "absolute", inset: -60, background: "radial-gradient(closest-side, rgba(255,107,26,0.22), transparent)", filter: "blur(20px)" }} />
      <div style={{ position: "relative", borderRadius: 28, border: `2px solid ${C.line}`, boxShadow: "0 40px 120px rgba(0,0,0,0.6)" }}>
        <Shot src={src} w={w} h={h} fx={fx} fy={fy} z={z} />
      </div>
    </div>
  );
}

export function Feature({ src, focus, vFocus, children }: {
  src: string; focus: [number, number]; vFocus: [number, number]; children: ReactNode;
}) {
  return (
    <AbsoluteFill>
      <Backdrop glow={0.1} />
      <Window src={src} focus={focus} vFocus={vFocus} />
      <Caption start={10} end={BEAT - 4}>{children}</Caption>
    </AbsoluteFill>
  );
}

// Hand-over beat: a big AI / You switch flips to "You" with a cursor click.
export function Handover() {
  const frame = useCurrentFrame();
  const { width, height, pick } = useOrient();
  const s = useSpring(0, { damping: 16, stiffness: 140 });
  const out = progress(frame, BEAT - 10, BEAT);
  const CLICK = 34;
  const flip = progress(frame, CLICK, CLICK + 12);
  const cursor = progress(frame, 6, CLICK - 2);
  const press = frame >= CLICK && frame < CLICK + 6 ? 0.85 : 1;
  const ripple = progress(frame, CLICK, CLICK + 20);

  const segW = pick(320, 330), segH = pick(140, 140), pad = 12;
  const cardW = segW * 2 + pad * 2, cardH = segH + pad * 2;
  const cx = width / 2, cy = pick(470, 780);
  const youX = cx + segW / 2, youY = cy;
  const curX = interpolate(cursor, [0, 1], [cx + pick(520, 380), youX + 20]);
  const curY = interpolate(cursor, [0, 1], [cy + pick(320, 420), youY + 20]);
  const pill = interpolate(flip, [0, 1], [0, segW]);
  const pillColor = flip < 0.5 ? C.green : C.orange;

  const label = (active: boolean) => ({
    width: segW, height: segH, display: "flex", alignItems: "center", justifyContent: "center", gap: 18,
    fontFamily: FONT, fontWeight: 800, fontSize: 64, color: active ? C.ink : C.white, position: "relative" as const,
  });
  const icon = (d: string, active: boolean) => (
    <svg width={52} height={52} viewBox="0 0 24 24" fill="none" stroke={active ? C.ink : C.white} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: d }} />
  );
  const SPARK = '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>';
  const USER = '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>';

  return (
    <AbsoluteFill>
      <Backdrop glow={0.1} />
      <AbsoluteFill style={{ opacity: 0.32 * (1 - out), filter: "blur(6px)" }}>
        <Img src={staticFile("screens/1-inbox.png")} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "60% 30%" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% ${(cy / height) * 100}%, rgba(21,24,28,0.55), rgba(21,24,28,0.92) 60%)` }} />

      <div style={{
        position: "absolute", left: cx - cardW / 2, top: cy - cardH / 2, width: cardW, height: cardH,
        transform: `scale(${(0.85 + 0.15 * s) * (1 - out * 0.05)})`, opacity: Math.min(1, s * 1.5) * (1 - out),
        background: C.bg1, border: `3px solid ${C.line}`, borderRadius: cardH / 2, boxShadow: "0 30px 100px rgba(0,0,0,0.6)",
        padding: pad, boxSizing: "border-box", display: "flex",
      }}>
        <div style={{
          position: "absolute", left: pad + pill, top: pad, width: segW, height: segH, borderRadius: segH / 2,
          background: pillColor, boxShadow: `0 10px 40px ${flip < 0.5 ? "rgba(37,211,102,0.45)" : "rgba(255,107,26,0.5)"}`,
        }} />
        <div style={label(flip < 0.5)}>{icon(SPARK, flip < 0.5)}AI</div>
        <div style={label(flip >= 0.5)}>{icon(USER, flip >= 0.5)}You</div>
      </div>

      {frame >= CLICK && ripple < 1 && (
        <div style={{
          position: "absolute", left: youX - 60, top: youY - 60, width: 120, height: 120, borderRadius: "50%",
          border: `5px solid ${C.white}`, transform: `scale(${1 + ripple * 2})`, opacity: (1 - ripple) * 0.7 * (1 - out),
        }} />
      )}
      <svg width={70} height={70} viewBox="0 0 24 24" style={{
        position: "absolute", left: curX, top: curY, transform: `scale(${press})`, transformOrigin: "top left",
        opacity: Math.min(1, frame / 6) * (1 - out), filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.6))",
      }}>
        <path d="M4 2l16 9.5-7 1.6-3.6 6.6z" fill="#fff" stroke="#15181C" strokeWidth={1.4} strokeLinejoin="round" />
      </svg>

      <Caption start={12} end={BEAT - 4}>You take over <O>anytime</O></Caption>
    </AbsoluteFill>
  );
}
