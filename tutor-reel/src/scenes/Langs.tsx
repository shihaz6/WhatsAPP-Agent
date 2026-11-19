// 0:26–0:32 — Same question, four ways: Sinhala, Tamil, English, Singlish. Each answered in kind, on the beat.
import { useCurrentFrame } from "remotion";
import { C, DISPLAY, FONT, SI, TA, Words, clamp01, cues, glass, pop } from "../kit";

const LG = cues.langs;
type Card = { tag: string; name: string; q: string; a: string; font?: string };
const CARDS: Card[] = [
  { tag: "සිංහල", name: "Sinhala", q: "ගණිත පන්තිය කීයටද?", a: "සෙනසුරාදා උදේ 8.00ට, නුගේගොඩ 📍", font: SI },
  { tag: "தமிழ்", name: "Tamil", q: "வகுப்பு எப்போது?", a: "சனிக்கிழமை காலை 8.00 மணிக்கு 📍", font: TA },
  { tag: "English", name: "English", q: "How much are the fees?", a: "LKR 3,000 a month. Want the bank details?" },
  { tag: "Singlish", name: "Sinhala in English letters", q: "Miss tomorrow class thiyanawada?", a: "Ow! Heta 4.00 PM ta class eka thiyenawa 👍" },
];
const CHIPS = ["Sinhala", "Tamil", "English", "Singlish"];

export function Langs() {
  const f = useCurrentFrame();
  const tang = pop(f, LG.chips, 13, 220);
  return (
    <>
      <div style={{ position: "absolute", left: 80, right: 80, top: 190, color: C.white }}>
        <Words text="In *their*" start={LG.head} style={{ fontFamily: DISPLAY, fontSize: 104, fontWeight: 900, letterSpacing: -5, lineHeight: 1.06 }} />
        <Words text="language." start={LG.head + 6} style={{ fontFamily: DISPLAY, fontSize: 104, fontWeight: 900, letterSpacing: -5, lineHeight: 1.06 }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 30, alignItems: "center" }}>
          {CHIPS.map((c, i) => {
            const on = pop(f, LG.cards[i] + LG.gap, 12, 260);
            const lit = f >= LG.cards[i] + LG.gap;
            return (
              <div key={c} style={{
                fontFamily: FONT, fontSize: 30, fontWeight: 800, padding: "12px 24px", borderRadius: 999,
                background: lit ? C.orange : "rgba(255,255,255,0.06)", color: lit ? C.char : "rgba(255,255,255,0.4)",
                border: lit ? "none" : "2px solid rgba(255,255,255,0.12)",
                transform: `scale(${lit ? 0.9 + 0.1 * Math.min(1.15, on) : 0.94})`,
              }}>{c}</div>
            );
          })}
          <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 800, color: C.orange, opacity: clamp01(tang * 2), transform: `translateX(${(1 - Math.min(1, tang)) * 30}px)` }}>+ Tanglish</div>
        </div>
      </div>

      {CARDS.map((c, i) => {
        const at = LG.cards[i];
        const card = pop(f, at - 4, 14, 180);
        const q = pop(f, at, 14, 230);
        const a = pop(f, at + LG.gap, 13, 220);
        const dir = i % 2 ? 1 : -1;
        return (
          <div key={c.tag} style={{
            position: "absolute", left: 60, right: 60, top: 590 + i * 236, height: 216, ...glass, borderRadius: 34, padding: "20px 26px", boxSizing: "border-box",
            display: "flex", gap: 22, alignItems: "stretch",
            opacity: clamp01(card * 1.8), transform: `translateX(${(1 - card) * dir * 500}px) rotate(${(1 - card) * dir * 5}deg)`,
          }}>
            <div style={{ width: 196, flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center", borderRight: "2px solid rgba(255,255,255,0.08)", paddingRight: 12 }}>
              <div style={{ fontFamily: c.font ?? DISPLAY, fontSize: c.font ? 44 : 36, fontWeight: 800, color: C.orange, letterSpacing: c.font ? 0 : -1.5, lineHeight: 1.2 }}>{c.tag}</div>
              <div style={{ fontFamily: FONT, fontSize: 19, fontWeight: 800, color: C.mute, marginTop: 6, lineHeight: 1.25 }}>{c.name}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
              <div style={{ alignSelf: "flex-start", maxWidth: "100%", background: C.grey, color: C.white, borderRadius: 24, borderBottomLeftRadius: 6, padding: "12px 20px", fontFamily: c.font ?? FONT, fontSize: 29, fontWeight: 700, lineHeight: 1.3, opacity: clamp01(q * 2), transform: `translateY(${(1 - q) * 16}px) scale(${0.86 + 0.14 * q})`, transformOrigin: "bottom left", whiteSpace: "nowrap" }}>{c.q}</div>
              <div style={{ alignSelf: "flex-end", maxWidth: "100%", background: `linear-gradient(160deg, #FFA06A, ${C.orange})`, color: C.char, borderRadius: 24, borderBottomRightRadius: 6, padding: "12px 20px", fontFamily: c.font ?? FONT, fontSize: 29, fontWeight: 700, lineHeight: 1.3, opacity: clamp01(a * 2), transform: `translateY(${(1 - a) * 16}px) scale(${0.86 + 0.14 * a})`, transformOrigin: "bottom right", boxShadow: "0 16px 34px -14px rgba(255,138,76,0.7)" }}>{c.a}</div>
            </div>
          </div>
        );
      })}
    </>
  );
}
