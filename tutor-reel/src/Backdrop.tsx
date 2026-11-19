// The living background: a charcoal night with an orange aurora that breathes on the kick,
// a drifting dot field, rising chat-bubble particles, giant outlined ghost type per scene, grain and vignette.
// From the offer onward the ground floods orange (see Transitions.tsx).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, DISPLAY, H, W, clamp01, cues, prog, pulse, rng } from "./kit";

const S = cues.scenes;
export const isOrange = (f: number) => f >= S.offer[0] && f < S.end[0];

type P = { x: number; y: number; s: number; v: number; o: number; orange: boolean; bubble: boolean; sway: number; ph: number };
const PARTS: P[] = (() => {
  const r = rng(11);
  return Array.from({ length: 34 }, () => {
    const s = 6 + r() ** 2.2 * 70;
    return { x: r() * W, y: r() * H, s, v: 0.5 + (s / 76) * 2.2, o: 0.05 + r() * 0.16, orange: r() < 0.38, bubble: s > 22 && r() < 0.75, sway: 10 + r() * 30, ph: r() * 6.28 };
  })
})();

const GHOST: [number, number, string][] = [
  [S.hook[0], S.hook[1], "11:47 PM · 11:47 PM · "],
  [S.pain[0], S.pain[1] - 30, "AGAIN? AGAIN? AGAIN? "],
  [S.demo[0], S.demo[1], "2:07 AM · 2:07 AM · "],
  [S.langs[0], S.langs[1], "සිංහල · தமிழ் · ENGLISH · SINGLISH · "],
  [S.trust[0], S.trust[1] - 20, "YOU · YOU · YOU · "],
  [S.offer[0], S.offer[1], "FREE · FREE · FREE · "],
];

function Ghost({ f }: { f: number }) {
  const g = GHOST.find(([a, b]) => f >= a && f < b);
  if (!g) return null;
  const [a, b, text] = g;
  const o = prog(f, a, a + 14) * (1 - prog(f, b - 14, b));
  const orange = isOrange(f);
  const row = (y: number, dir: number, size: number, op: number) => (
    <div style={{
      position: "absolute", left: 0, top: y, whiteSpace: "nowrap", fontFamily: `${DISPLAY}, "Noto Sans Sinhala", "Noto Sans Tamil"`, fontWeight: 900, fontSize: size, letterSpacing: -4, lineHeight: 1,
      color: "transparent", WebkitTextStroke: `2.5px ${orange ? `rgba(26,26,26,${op * 1.2})` : `rgba(255,255,255,${op})`}`,
      transform: `translateX(${dir > 0 ? -((f - a) * 3.2) % 2400 : -2400 + ((f - a) * 3.2) % 2400}px)`,
    }}>{text.repeat(4)}</div>
  );
  return (
    <AbsoluteFill style={{ opacity: o, transform: "rotate(-9deg) scale(1.25)" }}>
      {row(250, 1, 300, 0.06)}
      {row(1350, -1, 300, 0.045)}
    </AbsoluteFill>
  );
}

function Particles({ f, orange }: { f: number; orange: boolean }) {
  return (
    <AbsoluteFill>
      {PARTS.map((p, i) => {
        const y = ((p.y - f * p.v) % (H + 160) + H + 160) % (H + 160) - 80;
        const x = p.x + Math.sin(f / 40 + p.ph) * p.sway;
        const col = orange ? (p.orange ? C.white : C.char) : p.orange ? C.orange : C.white;
        const op = p.o * (orange ? 1.3 : 1);
        const blur = p.s > 40 ? (p.s - 40) / 10 : 0;
        if (p.bubble) {
          return (
            <svg key={i} width={p.s} height={p.s} viewBox="0 0 24 24" style={{ position: "absolute", left: x, top: y, opacity: op, filter: blur ? `blur(${blur}px)` : undefined }}>
              <path d="M4 3h16a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H10l-5 4v-4H4a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z" fill="none" stroke={col} strokeWidth="1.8" />
            </svg>
          );
        }
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: p.s * 0.4, height: p.s * 0.4, borderRadius: 99, background: col, opacity: op * 1.4, filter: blur ? `blur(${blur}px)` : undefined }} />;
      })}
    </AbsoluteFill>
  );
}

function Grain({ f, op }: { f: number; op: number }) {
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: op, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={Math.floor(f / 2) % 97} stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  );
}

export function Backdrop() {
  const f = useCurrentFrame();
  const k = pulse(f);
  const orange = isOrange(f);
  // night glow rises slowly through the film; it peaks on the drops
  const night = 0.75 + 0.25 * Math.sin(f / 70);
  if (orange) {
    const r = (f - S.offer[0]) * 0.25;
    return (
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 90% 60% at 50% 42%, #FFA56F 0%, ${C.orange} 55%, #F27838 100%)`, overflow: "hidden" }}>
        <AbsoluteFill style={{ background: `repeating-conic-gradient(from ${r}deg at 50% 46%, rgba(26,26,26,0.05) 0deg 7deg, transparent 7deg 18deg)`, opacity: 0.8 + 0.2 * k }} />
        {[0, 1, 2, 3, 4].map((i) => {
          const s = ((f - S.offer[0]) * 3 + i * 260) % 1300;
          return <div key={i} style={{ position: "absolute", left: W / 2 - s, top: 880 - s, width: s * 2, height: s * 2, borderRadius: "50%", border: `3px solid rgba(255,255,255,${0.22 * (1 - s / 1300)})` }} />;
        })}
        <Particles f={f} orange />
        <Ghost f={f} />
        <Grain f={f} op={0.22} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 70% at 50% 45%, transparent 55%, rgba(120,40,0,0.28) 100%)" }} />
      </AbsoluteFill>
    );
  }
  const drift = (a: number, sp: number) => Math.sin(f / sp + a);
  // scene-aware warmth: the hook and pain stay colder, the product scenes glow
  const warm = f < S.turn[0] ? 0.55 : 1;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 120% 70% at 50% 0%, #262321 0%, ${C.char} 45%, #121212 100%)`, overflow: "hidden" }}>
      {/* aurora */}
      <div style={{ position: "absolute", left: 600 + drift(0, 60) * 140, top: -260 + drift(1, 80) * 90, width: 900, height: 900, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,138,76,0.55), rgba(255,138,76,0) 65%)", opacity: (0.32 + 0.22 * k) * warm * night, filter: "blur(30px)" }} />
      <div style={{ position: "absolute", left: -380 + drift(2, 75) * 120, top: 1150 + drift(3, 66) * 130, width: 1000, height: 1000, borderRadius: "50%", background: "radial-gradient(circle, rgba(232,103,46,0.5), rgba(232,103,46,0) 65%)", opacity: (0.26 + 0.18 * k) * warm, filter: "blur(30px)" }} />
      <div style={{ position: "absolute", left: 200 + drift(4, 90) * 300, top: 640 + drift(5, 55) * 200, width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,178,135,0.22), rgba(255,178,135,0) 65%)", opacity: 0.5 * warm, filter: "blur(40px)" }} />
      {/* dot field, scrolling up like a feed */}
      <AbsoluteFill style={{
        backgroundImage: "radial-gradient(rgba(255,255,255,0.09) 1.8px, transparent 2px)", backgroundSize: "54px 54px", backgroundPosition: `0px ${-f * 1.4}px`,
        maskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 85%)", WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 85%)",
        opacity: 0.8,
      }} />
      <Ghost f={f} />
      <Particles f={f} orange={false} />
      {/* horizon light, breathing on the kick */}
      <div style={{ position: "absolute", left: -200, right: -200, bottom: -520, height: 900, borderRadius: "50%", background: "radial-gradient(ellipse at 50% 30%, rgba(255,138,76,0.5), rgba(255,138,76,0) 62%)", opacity: (0.35 + 0.5 * k) * warm }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 6, background: C.orange, opacity: 0.0 + 0.5 * k * warm, filter: "blur(8px)" }} />
      <Grain f={f} op={0.16} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 75% at 50% 48%, transparent 50%, rgba(0,0,0,0.6) 100%)" }} />
    </AbsoluteFill>
  );
}

/** Small honest label. Kept high in the frame, where the Reels caption won't sit on it. */
export function Note() {
  const f = useCurrentFrame();
  const orange = isOrange(f);
  if (f >= S.end[0]) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 70, textAlign: "center", fontFamily: `"Manrope", sans-serif`, fontSize: 19, fontWeight: 800, letterSpacing: 3, color: orange ? "rgba(26,26,26,0.55)" : "rgba(255,255,255,0.32)", opacity: clamp01(f / 10) }}>
      ILLUSTRATIVE DEMO · SAMPLE CHATS
    </div>
  );
}
