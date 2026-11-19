// 0:12–0:16 — The drop. A lightning strike, the Catalyst mark lands with a shockwave: "Meet Catalyst ⚡".
import { useCurrentFrame } from "remotion";
import { Bolt, C, DISPLAY, FONT, Mark, Words, clamp01, cues, pop, prog, pulse } from "../kit";

const T = cues.turn;

export function Turn() {
  const f = useCurrentFrame();
  const logo = pop(f, T.logo, 10, 200);
  const k = pulse(cues.scenes.turn[0] + f);
  const bolt = pop(f, T.name + 8, 9, 260);
  const tag = prog(f, T.tag, T.tag + 14);
  // the mark leans into the bubble wipe at the end
  const lean = prog(f, T.wipe - 10, T.wipe + 4);
  return (
    <>
      {/* shockwave rings */}
      {[0, 6, 12].map((d, i) => {
        const t = prog(f, d, d + 40);
        if (f < d) return null;
        return <div key={i} style={{ position: "absolute", left: 540 - t * 900, top: 640 - t * 900, width: t * 1800, height: t * 1800, borderRadius: "50%", border: `${10 - i * 3}px solid rgba(255,138,76,${0.6 * (1 - t)})` }} />;
      })}
      <div style={{ position: "absolute", left: 540 - 160, top: 480, width: 320, height: 320, transform: `scale(${Math.max(0, logo) * (1 + 0.03 * k) * (1 + lean * 0.25)}) rotate(${(1 - Math.min(1, logo)) * -30}deg)` }}>
        <Mark size={320} glow={0.7 + 0.5 * k} draw={prog(f, 4, 18)} />
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, top: 880, textAlign: "center", color: C.white, opacity: 1 - lean }}>
        <Words text="Meet" start={T.meet} align="center" style={{ fontFamily: FONT, fontSize: 64, fontWeight: 700, color: C.soft }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 6 }}>
          <Words text="Catalyst" start={T.name} align="center" style={{ fontFamily: DISPLAY, fontSize: 150, fontWeight: 900, letterSpacing: -6, lineHeight: 1.05 }} />
          <div style={{ transform: `scale(${Math.max(0, bolt)}) rotate(${(1 - Math.min(1, bolt)) * 40}deg)`, filter: `drop-shadow(0 0 ${20 + 30 * k}px rgba(255,138,76,0.9))` }}>
            <Bolt size={86} />
          </div>
        </div>
        <div style={{ marginTop: 40, fontFamily: FONT, fontSize: 46, fontWeight: 700, color: C.white, opacity: tag, transform: `translateY(${(1 - tag) * 24}px)` }}>
          Your AI assistant <span style={{ color: C.orange }}>on WhatsApp.</span>
        </div>
        <div style={{ marginTop: 22, fontFamily: FONT, fontSize: 26, fontWeight: 800, letterSpacing: 6, color: C.mute, opacity: clamp01(prog(f, T.by, T.by + 12)) }}>BY ALCHEMYX</div>
      </div>
    </>
  );
}
