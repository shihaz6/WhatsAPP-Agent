// 0:19–0:27 — The same 3:12 AM question, answered in seconds from the owner's own rates.
import { useCurrentFrame } from "remotion";
import { Bubble, C, FONT, Headline, Mark, Phone, Pill, Typing, Words, card, clamp01, cues, pop, prog } from "../kit";
import { useT } from "../i18n";

const A = cues.answer;
const RATES: [string, string, string][] = [
  ["Deluxe Double", "breakfast included", "$60 / night"],
  ["Airport pickup", "from BIA", "$45"],
  ["Yala jeep safari", "half day, up to 6", "$70"],
];

export function Answer() {
  const f = useCurrentFrame();
  const { t, si } = useT();
  const rateIn = pop(f, 4, 16, 120);
  const phone = pop(f, 20, 16, 110);
  const typing = prog(f, A.typing, A.typing + 6) * (1 - prog(f, A.reply - 4, A.reply));
  const reply = pop(f, A.reply, 13, 190);
  const fast = pop(f, A.fast);
  const hand = pop(f, A.handoff, 14, 180);

  return (
    <>
      <Headline top={200}>
        <Words text={t.answer.h1} start={4} stagger={4} style={{ fontSize: si ? 84 : 92, fontWeight: 900, letterSpacing: -1.5 }} />
        <Words text={t.answer.h2} start={18} stagger={4} style={{ fontSize: si ? 56 : 60, fontWeight: 800, marginTop: 4 }} />
      </Headline>

      {/* the owner's rate sheet */}
      <div style={{ position: "absolute", left: 70, right: 70, top: 440, padding: "22px 30px 16px", ...card, borderRadius: 36, opacity: Math.min(1, rateIn * 1.4), transform: `translateY(${(1 - rateIn) * 60}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: FONT, marginBottom: 6 }}>
          <svg width="34" height="34" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="3" fill="none" stroke={C.orange} strokeWidth="2" /><path d="M8 8h8M8 12h8M8 16h5" stroke={C.orange} strokeWidth="2" strokeLinecap="round" /></svg>
          <span style={{ color: C.white, fontSize: 30, fontWeight: 800 }}>{t.answer.sheet}</span>
          <span style={{ marginLeft: "auto", fontSize: 20, fontWeight: 700, color: C.mute, letterSpacing: 3 }}>SAMPLE</span>
        </div>
        {RATES.map(([k, sub, v], i) => {
          const p = pop(f, A.rates[i], 14, 200);
          const glow = i < 2 ? Math.max(0, 1 - Math.abs(f - (A.reply + i * 6)) / 16) : 0;
          return (
            <div key={k} style={{
              display: "flex", alignItems: "center", gap: 18, padding: "14px 18px", marginTop: 8, borderRadius: 20, fontFamily: FONT,
              background: `rgba(255,138,76,${0.03 + 0.18 * glow})`, border: `1.5px solid rgba(255,255,255,${0.05 + 0.25 * glow})`,
              opacity: clamp01(p * 1.6), transform: `translateX(${(1 - p) * -50}px)`,
            }}>
              <span style={{ color: C.white, fontSize: 30, fontWeight: 700 }}>{k}</span>
              <span style={{ color: C.mute, fontSize: 23, fontWeight: 500 }}>{sub}</span>
              <span style={{ marginLeft: "auto", color: C.orange, fontSize: 32, fontWeight: 800 }}>{v}</span>
            </div>
          );
        })}
      </div>

      <div style={{ position: "absolute", left: 150, top: 830, opacity: Math.min(1, phone * 1.4), transform: `translateY(${(1 - phone) * 300}px)` }}>
        <Phone width={780} height={960} title="Your Villa · Ella" accentAvatar glow={0.5 + 0.5 * reply}
          subtitle={<span style={{ color: C.orange }}>● Catalyst · online</span>} avatar={<Mark size={50} />}>
          <div style={{ marginBottom: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, paddingTop: 6, opacity: prog(f, 26, 40) }}>
            <div style={{ fontFamily: FONT, fontSize: 21, fontWeight: 700, color: C.soft, background: C.grey2, padding: "8px 18px", borderRadius: 12, letterSpacing: 1 }}>TODAY</div>
            <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 500, color: C.orange2, background: "rgba(255,138,76,0.1)", border: "1px solid rgba(255,138,76,0.3)", padding: "10px 20px", borderRadius: 14 }}>{t.answer.note}</div>
          </div>
          <Bubble side="them" time="3:12 AM" fs={31} p={pop(f, A.ask, 14, 200)}>Hi! Do you have a double room for Dec 14–⁠16? And airport pickup?</Bubble>
          {reply < 0.05 ? (
            <div style={{ height: 90, display: "flex", alignItems: "flex-end" }}><div style={{ width: "100%" }}><Typing frame={f} p={typing} side="me" /></div></div>
          ) : (
            <Bubble side="me" time="3:12 AM" ticks fs={31} p={reply}>
              Hi Emma! A Deluxe Double is <b>$60/night</b> with breakfast, and pickup from BIA is <b>$45</b>. I'll pass your dates to the owner to confirm.
            </Bubble>
          )}
          <div style={{ display: "flex", justifyContent: "center", opacity: clamp01(hand * 1.5), transform: `scale(${0.8 + 0.2 * hand})`, height: hand > 0.01 ? undefined : 0 }}>
            <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: C.orange2, background: "rgba(255,138,76,0.1)", border: "1px solid rgba(255,138,76,0.35)", padding: "10px 20px", borderRadius: 14 }}>
              {t.answer.sent}
            </div>
          </div>
        </Phone>
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, top: 1808, display: "flex", justifyContent: "center", opacity: clamp01(fast * 1.4), transform: `scale(${0.8 + 0.2 * fast})` }}>
        <Pill hot style={{ fontSize: 30, padding: "14px 30px" }}>
          <svg width="24" height="30" viewBox="0 0 26 32"><path d="M15 1L2 18h9l-2 13 13-17h-9z" fill={C.orange} /></svg>
          {t.answer.fast}
        </Pill>
      </div>
    </>
  );
}
