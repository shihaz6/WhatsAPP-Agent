// 0:00–0:07 — 3:12 AM in Sri Lanka. Messages fly in from guests in other time zones.
import { useCurrentFrame } from "remotion";
import { C, FONT, Headline, Words, clamp01, cues, pop, prog } from "../kit";
import { useT } from "../i18n";

const HK = cues.hook;
export const GUESTS = [
  { name: "Emma", city: "London", msg: "Hi! Do you have a double room for Dec 14–⁠16?" },
  { name: "Kenji", city: "Tokyo", msg: "Do you do airport pickup from BIA?" },
  { name: "Mia", city: "Melbourne", msg: "How much is the Yala safari?" },
];

export function Hook() {
  const f = useCurrentFrame();
  const { t, si } = useT();
  return (
    <>
      <Headline top={200}>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 22, marginBottom: 6, opacity: prog(f, 0, 14) }}>
          <svg width="56" height="56" viewBox="0 0 40 40"><path d="M27 4a16 16 0 1 0 9 26A14 14 0 0 1 27 4z" fill={C.orange} /></svg>
          <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: si ? 2 : 8, color: C.soft }}>{t.hook.country}</span>
        </div>
        <Words text={t.hook.title} start={HK.title} stagger={4} dur={18} style={{ fontSize: si ? 76 : 112, fontWeight: 900, letterSpacing: -2, lineHeight: 1.15 }} />
        <Words text={t.hook.sub} start={HK.title + 22} style={{ fontSize: si ? 54 : 58, fontWeight: 700, color: "#E2E2E2", marginTop: 8 }} />
      </Headline>

      {/* notifications landing as each arc arrives */}
      {HK.msgs.map((at, i) => {
        let slot = 0;
        for (let j = i + 1; j < HK.msgs.length; j++) slot += prog(f, HK.msgs[j], HK.msgs[j] + 10);
        const p = pop(f, at, 14, 200);
        const g = GUESTS[i];
        return (
          <div key={i} style={{
            position: "absolute", left: 70, right: 70, top: 540 + slot * 132, height: 116, borderRadius: 30,
            background: "rgba(46,46,46,0.86)", border: "1.5px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", gap: 22, padding: "0 26px",
            boxShadow: `0 24px 50px -20px rgba(0,0,0,0.9), 0 0 ${40 * clamp01(1 - (f - at) / 20)}px rgba(255,138,76,0.5)`,
            opacity: clamp01(p * 1.6) * (1 - slot * 0.18), transform: `translateY(${(1 - p) * -50}px) scale(${(0.9 + 0.1 * p) * (1 - slot * 0.03)})`,
          }}>
            <div style={{ width: 68, height: 68, borderRadius: 68, background: i === 0 ? C.orange : C.grey, color: i === 0 ? C.char : C.white, display: "grid", placeItems: "center", fontFamily: FONT, fontWeight: 800, fontSize: 30, flexShrink: 0 }}>{g.name[0]}</div>
            <div style={{ flex: 1, minWidth: 0, fontFamily: FONT }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: C.white, fontSize: 26, fontWeight: 700 }}>
                <span>{g.name} <span style={{ color: C.mute, fontWeight: 600 }}>· {g.city}</span></span>
                <span style={{ color: C.orange, fontWeight: 600, fontSize: 22 }}>now</span>
              </div>
              <div style={{ color: "#E8E8E8", fontSize: 29, fontWeight: 500, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.msg}</div>
            </div>
          </div>
        );
      })}
    </>
  );
}
