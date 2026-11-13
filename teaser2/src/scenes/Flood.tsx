import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { C, DISPLAY, Icon, RiseLines, TEXT, cues, progress, useOrient } from "../kit";

// On orange: questions from every kind of business stream upward; each one is answered as it crosses the line.
const QS = [
  { q: "Grade 10 fees kiyada?", who: "Tutor", lang: "Singlish" },
  { q: "Galle ku delivery irukka?", who: "Shop", lang: "Tanglish" },
  { q: "Is the 2BR still available?", who: "Real estate", lang: "English" },
  { q: "සෙනසුරාදා slot තියෙනවද?", who: "Salon", lang: "Sinhala" },
  { q: "Table for 4 tonight?", who: "Restaurant", lang: "English" },
  { q: "டாக்டர் நாளை இருக்காரா?", who: "Clinic", lang: "Tamil" },
  { q: "Monthly membership price?", who: "Gym", lang: "English" },
  { q: "Slip eka hambuda?", who: "Tutor", lang: "Singlish" },
  { q: "Size M stock irukka?", who: "Shop", lang: "Tanglish" },
  { q: "Can I view it Saturday?", who: "Real estate", lang: "English" },
  { q: "Bridal package price?", who: "Salon", lang: "English" },
  { q: "Online class thiyenawada?", who: "Tutor", lang: "Singlish" },
];

export function Flood() {
  const frame = useCurrentFrame();
  const { portrait, pick3 } = useOrient();
  const F = cues.flood;
  const L = pick3(
    { tick: { left: 930, width: 880, top: 0, height: 1080 }, line: 560, head: { left: 130, top: 0 }, row: 132, q: 46 },
    { tick: { left: 60, width: 960, top: 640, height: 900 }, line: 1060, head: { left: 70, top: 190 }, row: 128, q: 46 },
    { tick: { left: 60, width: 960, top: 420, height: 900 }, line: 820, head: { left: 70, top: 60 }, row: 116, q: 42 },
  );
  // Step motion: each question glides into the band in 60% of a step, then holds (snaps on the beat).
  const raw = (frame - F.first) / F.every;
  const whole = Math.floor(raw), frac = raw - whole;
  const stepPos = whole + Easing.bezier(0.6, 0, 0.2, 1)(Math.min(1, frac / 0.6));
  const arrive = (k: number) => F.first + k * F.every + Math.round(F.every * 0.6);
  const answered = QS.filter((_, k) => frame >= arrive(k)).length;
  const minutes = Math.min(9, Math.floor(answered * 0.75));
  const enter = progress(frame, 0, 16);
  const exit = progress(frame, 116, 128);

  return (
    <AbsoluteFill style={{ background: C.orange, overflow: "hidden" }}>
      {/* headline block */}
      <div style={{
        position: "absolute", left: L.head.left, ...(portrait ? { top: L.head.top, right: 70 } : { top: 0, bottom: 0, width: 760, display: "flex", flexDirection: "column", justifyContent: "center" }),
        color: C.ink, opacity: 1 - exit,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: DISPLAY, fontWeight: 700, fontSize: pick3(30, 32, 28), letterSpacing: "0.18em", opacity: enter }}>
          <Icon name="clock" size={pick3(34, 36, 32)} color={C.ink} stroke={2.4} /> 2:0{minutes} AM
        </div>
        <RiseLines start={2} gap={6} lines={["Every question.", "Answered."]}
          style={{ marginTop: 18, fontFamily: DISPLAY, fontWeight: 800, fontSize: pick3(116, 118, 100), lineHeight: 1.0, letterSpacing: "-0.045em" }} />
        <div style={{ marginTop: pick3(36, 30, 22), display: "flex", alignItems: "baseline", gap: 18, fontFamily: TEXT, fontWeight: 700, fontSize: pick3(36, 38, 34), opacity: enter }}>
          <span style={{ background: C.ink, color: C.orange, borderRadius: 18, padding: "6px 20px", fontFamily: DISPLAY, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{answered * 4 + 3}</span>
          customers answered. Zero waiting.
        </div>
      </div>

      {/* ticker */}
      <div style={{
        position: "absolute", left: L.tick.left, top: L.tick.top, width: L.tick.width, height: L.tick.height, overflow: "hidden",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)", opacity: 1 - exit,
      }}>
        {/* the answer line */}
        <div style={{ position: "absolute", left: -12, right: 0, top: L.line - L.tick.top - L.row / 2 - 4, height: L.row - 8, borderRadius: 28, background: "rgba(26,26,26,0.10)", border: "3px solid rgba(26,26,26,0.85)", boxSizing: "border-box" }} />
        {QS.map((x, k) => {
          const cross = arrive(k);
          const y = L.line - L.tick.top + L.row * (k - stepPos) - L.row / 2 + 4;
          if (y < -L.row || y > L.tick.height + L.row) return null;
          const done = frame >= cross;
          const pop = done ? interpolate(frame - cross, [0, 4, 10], [1.25, 0.95, 1], { extrapolateRight: "clamp" }) : 1;
          return (
            <div key={k} style={{ position: "absolute", left: 0, right: 0, top: y, height: L.row - 16, display: "flex", alignItems: "center", gap: 24, paddingLeft: 14 }}>
              <span style={{
                width: 64, height: 64, borderRadius: 32, flex: "none", display: "grid", placeItems: "center",
                background: done ? C.ink : "transparent", border: `4px solid ${C.ink}`, boxSizing: "border-box", transform: `scale(${pop})`,
              }}>{done && <Icon name="check" size={34} color={C.orange} stroke={3.4} />}</span>
              <div style={{ flex: 1, minWidth: 0, color: C.ink }}>
                <div style={{ fontFamily: TEXT, fontWeight: 700, fontSize: L.q, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", opacity: done ? 1 : 0.62 }}>{x.q}</div>
                <div style={{ marginTop: 6, display: "flex", gap: 12, alignItems: "center", fontFamily: TEXT, fontWeight: 700, fontSize: L.q * 0.56 }}>
                  <span style={{ opacity: 0.75 }}>{x.who} · {x.lang}</span>
                  {done && <span style={{ background: C.ink, color: C.orange, borderRadius: 999, padding: "3px 12px" }}>answered in 2s</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
