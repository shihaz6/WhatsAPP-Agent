import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop, C, FONT, SCENES, SHADOW, cues, progress, shake, useOrient, useSpring } from "../kit";

// 3.7-8.7s: the same questions, on the beat. The three questions build up and stay on screen
// together (so each is readable for well over a second), then "Every. Single. Night." lands.
function Hit({ at, children, color = C.white }: { at: number; children: string; color?: string }) {
  const s = useSpring(at, { damping: 12, stiffness: 220, mass: 0.6 });
  return (
    <span style={{ display: "inline-block", color, opacity: Math.min(1, s * 2), transform: `scale(${1.35 - 0.35 * s})`, margin: "0 0.12em" }}>
      {children}
    </span>
  );
}

export function Pain() {
  const frame = useCurrentFrame();
  const { safeX, pick } = useOrient();
  const end = SCENES.pain[1] - SCENES.pain[0];
  const [fees, bookings, slips, every, single, night] = cues.words.map((w) => w - SCENES.pain[0]);

  const flash = cues.words
    .map((w) => w - SCENES.pain[0])
    .reduce((m, w) => (frame >= w && frame - w < 12 ? Math.max(m, 1 - (frame - w) / 12) : m), 0);

  const qOut = progress(frame, every - 10, every - 2);
  const fOut = progress(frame, end - 8, end);

  const text = {
    fontFamily: FONT, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.12,
    textShadow: SHADOW, textAlign: "center" as const, color: C.white,
  };

  return (
    <AbsoluteFill style={{ transform: shake(frame, cues.words.map((w) => w - SCENES.pain[0])) }}>
      <Backdrop glow={0.06 + flash * 0.16} />
      <AbsoluteFill style={{ left: safeX, right: safeX, width: "auto", justifyContent: "center", alignItems: "center" }}>
        {frame < every && (
          <div style={{ ...text, fontSize: pick(140, 100), opacity: 1 - qOut, transform: `scale(${1 - qOut * 0.06})` }}>
            <div><Hit at={fees}>Fees?</Hit>{frame >= bookings - 1 && <Hit at={bookings}>Bookings?</Hit>}</div>
            <div>{frame >= slips - 1 && <Hit at={slips} color={C.orange}>Payment slips?</Hit>}</div>
          </div>
        )}
        {frame >= every - 1 && (
          <div style={{ ...text, fontSize: pick(150, 128), opacity: 1 - fOut }}>
            <div><Hit at={every}>Every.</Hit>{frame >= single - 1 && <Hit at={single}>Single.</Hit>}</div>
            <div>{frame >= night - 1 && <Hit at={night} color={C.orange}>Night.</Hit>}</div>
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
