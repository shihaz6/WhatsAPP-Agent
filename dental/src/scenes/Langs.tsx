// 0:24–0:31 — Locals and dental tourists, each answered in their own language and script,
// from the same price list and diary. A 5×2 wall of chats that fills on the half-beat.
import { useCurrentFrame } from "remotion";
import { C, DISPLAY, Eyebrow, FONT, Words, clamp01, cues, paperCard, pop, prog } from "../kit";

const LG = cues.langs;
// Scripts the brand fonts don't cover fall back to the fonts that ship with Windows.
const SI = `"Noto Sans Sinhala", "Nirmala UI", sans-serif`;
const TA = `"Noto Sans Tamil", "Nirmala UI", sans-serif`;
const HI = `"Nirmala UI", "Segoe UI", sans-serif`;
const ZH = `"Microsoft YaHei UI", "Microsoft YaHei", "Plus Jakarta Sans", sans-serif`;
const AR = `"Segoe UI", "Tahoma", sans-serif`;
const RU = `"Segoe UI", "Plus Jakarta Sans", sans-serif`;

type Card = { tag: string; name: string; q: string; a: string; font?: string; rtl?: boolean };
const CARDS: Card[] = [
  { tag: "English", name: "Local", q: "Do you treat kids?", a: "Yes! Monday to Saturday. Shall I book a check-up?" },
  { tag: "සිංහල", name: "Sinhala", q: "දතක් ගලවන්න කීයද?", a: "රු. 3,000යි. හෙට උදේ 10ට වෙලාවක් තියෙනවා.", font: SI },
  { tag: "தமிழ்", name: "Tamil", q: "ஞாயிறு திறந்திருக்குமா?", a: "ஆம்! காலை 9 முதல் மதியம் 1 வரை.", font: TA },
  { tag: "Singlish", name: "Sinhala, English letters", q: "Braces danna kiyada?", a: "Consultation eka Rs. 2,000i. Saturday slot thiyenawa!" },
  { tag: "Tanglish", name: "Tamil, English letters", q: "Whitening ku evlo aagum?", a: "Rs. 25,000. Appointment book pannalaama?" },
  { tag: "Deutsch", name: "Germany", q: "Was kostet eine Zahnreinigung?", a: "Reinigung & Politur kostet LKR 4.500." },
  { tag: "Русский", name: "Russia", q: "Сколько стоит отбеливание?", a: "Отбеливание — LKR 25 000. Записать вас?", font: RU },
  { tag: "中文", name: "China", q: "可以洗牙吗？", a: "可以！洗牙和抛光 LKR 4,500。", font: ZH },
  { tag: "العربية", name: "Gulf", q: "هل تعملون يوم الأحد؟", a: "نعم، من ٩ صباحًا حتى ١ ظهرًا.", font: AR, rtl: true },
  { tag: "हिन्दी", name: "India", q: "दांत निकलवाने का कितना लगेगा?", a: "LKR 3,000. कल सुबह 10 बजे स्लॉट है।", font: HI },
];
const CW = 330, CH = 282, GAP = 18, X0 = (1920 - (CW * 5 + GAP * 4)) / 2, Y0 = 300;

export function Langs() {
  const f = useCurrentFrame();
  const line = prog(f, LG.chips, LG.chips + 14);
  return (
    <>
      <div style={{ position: "absolute", left: X0, top: 84, color: C.char }}>
        <Eyebrow style={{ opacity: prog(f, 4, 14) }}>Your patients · and the dental tourists</Eyebrow>
        <Words text="It replies in *their* language." light start={8} stagger={3} style={{ fontFamily: DISPLAY, fontSize: 92, fontWeight: 800, letterSpacing: -3, lineHeight: 1.05, marginTop: 14 }} />
      </div>
      {/* running count, top right */}
      <div style={{ position: "absolute", right: X0, top: 120, textAlign: "right", fontFamily: FONT, color: C.char, opacity: prog(f, LG.cards[0], LG.cards[0] + 10) }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 110, fontWeight: 800, lineHeight: 0.9, letterSpacing: -4, fontVariantNumeric: "tabular-nums" }}>
          {LG.cards.filter((c) => f >= c).length}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 3, color: C.mute }}>LANGUAGES, ONE INBOX</div>
      </div>

      {CARDS.map((c, i) => {
        const at = LG.cards[i];
        const col = i % 5, row = Math.floor(i / 5);
        const card = pop(f, at - 5, 15, 160);
        const q = pop(f, at, 14, 210);
        const a = pop(f, at + LG.gap, 13, 200);
        const lit = Math.max(0, 1 - Math.abs(f - (at + LG.gap + 3)) / 12);
        const dir = c.rtl ? "rtl" : "ltr";
        return (
          <div key={c.tag} style={{
            position: "absolute", left: X0 + col * (CW + GAP), top: Y0 + row * (CH + GAP), width: CW, height: CH, padding: "16px 16px", boxSizing: "border-box", ...paperCard, borderRadius: 22,
            borderColor: `rgba(255,138,76,${0.12 + 0.65 * lit})`,
            opacity: clamp01(card * 1.5), transform: `translateY(${(1 - card) * 70}px) scale(${0.94 + 0.06 * Math.min(1, card)})`,
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontFamily: c.font ?? DISPLAY, fontSize: 32, fontWeight: 800, color: C.char, letterSpacing: c.font ? 0 : -0.5, lineHeight: 1.15 }}>{c.tag}</span>
              <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: C.mute, letterSpacing: 0.3, marginLeft: "auto", whiteSpace: "nowrap" }}>{c.name}</span>
            </div>
            <div dir={dir} style={{ alignSelf: c.rtl ? "flex-end" : "flex-start", maxWidth: "94%", background: "#F0EFED", color: C.char, borderRadius: 16, borderBottomLeftRadius: c.rtl ? 16 : 4, borderBottomRightRadius: c.rtl ? 4 : 16, padding: "9px 13px", fontFamily: c.font ?? FONT, fontSize: 20, fontWeight: 600, lineHeight: 1.38, opacity: clamp01(q * 1.6), transform: `translateY(${(1 - q) * 14}px) scale(${0.88 + 0.12 * q})`, transformOrigin: c.rtl ? "bottom right" : "bottom left" }}>{c.q}</div>
            <div dir={dir} style={{ alignSelf: c.rtl ? "flex-start" : "flex-end", maxWidth: "96%", background: `linear-gradient(160deg, #FF9A62, ${C.orange})`, color: C.char, borderRadius: 16, borderBottomRightRadius: c.rtl ? 16 : 4, borderBottomLeftRadius: c.rtl ? 4 : 16, padding: "9px 13px 7px", fontFamily: c.font ?? FONT, fontSize: 20, fontWeight: 600, lineHeight: 1.4, boxShadow: "0 12px 26px -12px rgba(255,138,76,0.7)", opacity: clamp01(a * 1.6), transform: `translateY(${(1 - a) * 14}px) scale(${0.88 + 0.12 * a})`, transformOrigin: c.rtl ? "bottom left" : "bottom right" }}>
              {c.a}
              <div dir="ltr" style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, letterSpacing: 1, marginTop: 4, opacity: 0.6, textAlign: "right" }}>AI · now ✓✓</div>
            </div>
          </div>
        );
      })}

      <div style={{ position: "absolute", left: 0, right: 0, top: 925, textAlign: "center", fontFamily: FONT, fontSize: 30, fontWeight: 700, color: C.ink2, opacity: line, transform: `translateY(${(1 - line) * 14}px)` }}>
        Locals and dental tourists. Same price list. <span style={{ color: C.char, fontWeight: 800 }}>Same diary.</span>
      </div>
    </>
  );
}
