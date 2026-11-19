// 0:00–0:08 — Meet Damsara. His shop runs from morning to night.
import { useCurrentFrame } from "remotion";
import { Shop } from "../Shop";
import { C, DISPLAY, FONT, Headline, Words, cues, lerp, pop, prog } from "../kit";

const M = cues.meet;

function clockLabel(day: number) {
  // 7:00 AM → 9:30 PM
  const mins = Math.round(lerp(7 * 60, 21 * 60 + 30, day) / 5) * 5;
  const h24 = Math.floor(mins / 60), m = mins % 60;
  const h = ((h24 + 11) % 12) + 1;
  return { text: `${h}:${String(m).padStart(2, "0")}`, ampm: h24 < 12 ? "AM" : "PM", h24, m };
}

export function Meet() {
  const f = useCurrentFrame();
  const day = prog(f, M.dayStart, M.dayEnd, (x) => x * x * (3 - 2 * x));
  const shopIn = pop(f, 18, 18, 90);
  const chip = pop(f, M.dayStart - 10);
  const clk = clockLabel(day);
  const handA = (clk.h24 % 12) * 30 + clk.m * 0.5, handB = clk.m * 6;
  const slowZoom = 1 + f * 0.0004;

  return (
    <>
      <Headline top={210}>
        <Words text={'*GA"DAMSARA.*'} start={M.name} dur={22} style={{ fontSize: 112, fontWeight: 900, lineHeight: 1.3, letterSpacing: -1 }} />
        <Words text="පුංචි කඩයක අයිතිකාරයා." start={M.owner} style={{ fontSize: 62, fontWeight: 600, color: "#E8E8E8", marginTop: 6 }} />
      </Headline>

      <div style={{
        position: "absolute", left: 90, top: 600, width: 900,
        opacity: Math.min(1, shopIn * 1.3),
        transform: `translateY(${(1 - shopIn) * 120}px) scale(${(0.9 + 0.1 * shopIn) * slowZoom})`,
        transformOrigin: "50% 100%",
        filter: "drop-shadow(0 50px 80px rgba(0,0,0,0.65))",
      }}>
        <Shop day={day} frame={f} />
      </div>

      {/* the day ticking by */}
      <div style={{
        position: "absolute", right: 60, top: 548, display: "flex", alignItems: "center", gap: 18,
        padding: "16px 28px 16px 18px", borderRadius: 999, background: "rgba(16,16,16,0.82)", border: "1.5px solid rgba(255,138,76,0.45)",
        boxShadow: "0 20px 50px -10px rgba(0,0,0,0.7)", opacity: Math.min(1, chip * 1.4), transform: `scale(${0.7 + 0.3 * chip})`, transformOrigin: "right center",
      }}>
        <svg width="54" height="54" viewBox="-27 -27 54 54">
          <circle r="24" fill="none" stroke={C.orange} strokeWidth="3.5" />
          <line x1="0" y1="0" x2="0" y2="-12" stroke="#fff" strokeWidth="4" strokeLinecap="round" transform={`rotate(${handA})`} />
          <line x1="0" y1="0" x2="0" y2="-18" stroke={C.orange} strokeWidth="3" strokeLinecap="round" transform={`rotate(${handB})`} />
          <circle r="3" fill="#fff" />
        </svg>
        <span style={{ fontFamily: DISPLAY, fontSize: 46, fontWeight: 700, color: C.white, fontVariantNumeric: "tabular-nums", minWidth: 128, textAlign: "right" }}>{clk.text}</span>
        <span style={{ fontFamily: FONT, fontSize: 26, fontWeight: 700, color: C.orange }}>{clk.ampm}</span>
      </div>

      <div style={{ position: "absolute", left: 60, right: 60, top: 1490, fontFamily: FONT, color: C.white, textAlign: "center" }}>
        <Words text="උදේ ඉඳන් රෑ වෙනකම්..." start={M.caption} style={{ fontSize: 60, fontWeight: 700, color: "#DADADA" }} />
        <Words text="*කවුන්ටරේ ළඟමයි.*" start={M.caption + 34} dur={18} style={{ fontSize: 84, fontWeight: 800, marginTop: 8 }} />
      </div>
    </>
  );
}
