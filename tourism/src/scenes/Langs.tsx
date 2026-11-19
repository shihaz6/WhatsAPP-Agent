// Guests from everywhere, each answered in their own language: a fast reel scrolling through a chat feed.
import { useCurrentFrame } from "remotion";
import { Bubble, C, FONT, Headline, Words, clamp01, cues, pop, prog } from "../kit";
import { useT } from "../i18n";

const LG = cues.langs;
const JP = `"Noto Sans JP", "Inter", sans-serif`;
const SC = `"Noto Sans SC", "Inter", sans-serif`;

const PAIRS: { lang: string; city: string; q: string; a: string; font?: string }[] = [
  { lang: "Deutsch", city: "Berlin", q: "Was kostet die Safari in Yala?", a: "Die Halbtagessafari kostet $70 pro Jeep, für bis zu 6 Personen." },
  { lang: "Français", city: "Paris", q: "Vous proposez un transfert depuis l'aéroport ?", a: "Oui ! Le transfert depuis BIA coûte $45." },
  { lang: "Русский", city: "Moscow", q: "Сколько стоит номер за ночь?", a: "Делюкс дабл — $60 за ночь, завтрак включён." },
  { lang: "中文", city: "Shanghai", q: "含早餐吗？", a: "含的！豪华双人房每晚60美元，含早餐。", font: SC },
  { lang: "日本語", city: "Tokyo", q: "空港送迎はありますか？", a: "はい、BIAからの送迎は45ドルです。", font: JP },
  { lang: "हिन्दी", city: "Mumbai", q: "सफ़ारी कितने की है?", a: "हाफ-डे जीप सफ़ारी: एक जीप के $70, 6 लोगों तक।" },
  { lang: "සිංහල", city: "Kandy", q: "යාල safari එකට කීයද?", a: "Half-day jeep safari එක jeep එකකට $70යි. 6 දෙනෙක්ට යන්න පුළුවන්." },
  { lang: "தமிழ்", city: "Chennai", q: "யால சஃபாரிக்கு எவ்வளவு?", a: "அரை நாள் ஜீப் சஃபாரி: ஒரு ஜீப்புக்கு $70, 6 பேர் வரை." },
];
const CHIPS = ["English", "Deutsch", "Français", "Русский", "中文", "日本語", "हिन्दी", "සිංහල", "தமிழ்", "Singlish", "Tanglish"];
const PH = 330;

export function Langs() {
  const f = useCurrentFrame();
  const { t } = useT();
  let scroll = 0;
  for (let i = 3; i < PAIRS.length; i++) scroll += prog(f, LG.pairs[i] - 4, LG.pairs[i] + 10) * PH;
  const sub = prog(f, LG.sub, LG.sub + 14);

  return (
    <>
      <Headline top={200}>
        <Words text={t.langs.h1} start={4} style={{ fontSize: 84, fontWeight: 900, letterSpacing: -1 }} />
        <Words text={t.langs.h2} start={12} stagger={4} style={{ fontSize: 84, fontWeight: 900, letterSpacing: -1 }} />
      </Headline>

      <div style={{
        position: "absolute", left: 0, right: 0, top: 440, height: 1190, overflow: "hidden",
        maskImage: "linear-gradient(180deg, transparent 0, black 60px, black 94%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(180deg, transparent 0, black 60px, black 94%, transparent 100%)",
        opacity: 1 - sub * 0.25,
      }}>
        {PAIRS.map((p, i) => {
          const at = LG.pairs[i];
          const y = 90 + i * PH - scroll;
          if (y < -PH || y > 1200) return null;
          const head = prog(f, at - 6, at + 4);
          return (
            <div key={i} style={{ position: "absolute", left: 60, right: 60, top: y, display: "flex", flexDirection: "column", gap: 12, opacity: clamp01((y + 40) / 130) }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: head, transform: `translateX(${(1 - head) * -30}px)` }}>
                <span style={{ fontFamily: p.font ?? FONT, fontSize: 25, fontWeight: 800, color: C.char, background: C.orange, padding: "5px 16px", borderRadius: 10 }}>{p.lang}</span>
                <span style={{ fontFamily: FONT, fontSize: 23, color: C.mute, fontWeight: 600 }}>{p.city}</span>
              </div>
              <Bubble side="them" fs={30} p={pop(f, at, 14, 220)}><span style={{ fontFamily: p.font }}>{p.q}</span></Bubble>
              <Bubble side="me" fs={30} ticks time="now" p={pop(f, at + LG.gap, 14, 220)}><span style={{ fontFamily: p.font }}>{p.a}</span></Bubble>
            </div>
          );
        })}
      </div>

      <div style={{ position: "absolute", left: 50, right: 50, top: 1620, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, opacity: sub, transform: `translateY(${(1 - sub) * 20}px)` }}>
        {CHIPS.map((l, k) => (
          <span key={l} style={{
            fontFamily: l === "中文" ? SC : l === "日本語" ? JP : FONT, fontSize: 25, fontWeight: 700, color: C.white, padding: "9px 18px", borderRadius: 999,
            border: "1.5px solid rgba(255,138,76,0.5)", background: "rgba(255,138,76,0.1)",
            opacity: clamp01(prog(f, LG.sub + k * 2, LG.sub + k * 2 + 10)),
          }}>{l}</span>
        ))}
      </div>
    </>
  );
}
