import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { Appear, Backdrop, C, FONT, O, SCENES, cues, headline, progress, useOrient } from "../kit";

// 0-3.7s: 11:47 PM, WhatsApp messages in five languages keep stacking up on a phone.
const MESSAGES = [
  { who: "Sofía M.", msg: "¿Tienen cita hoy?" },
  { who: "Wei C.", msg: "请问周日营业吗？" },
  { who: "James P.", msg: "Price for a haircut?" },
  { who: "Aisha R.", msg: "هل يمكنني الدفع نقداً؟" },
  { who: "Priya S.", msg: "क्या आज स्लॉट खाली है?" },
  { who: "Lucía G.", msg: "¿Aceptan tarjeta?" },
  { who: "Omar H.", msg: "أرسلت إيصال الدفع" },
  { who: "Mei L.", msg: "价格包括洗发吗？" },
  { who: "Rahul V.", msg: "Sent the slip 🙏" },
  { who: "Emma C.", msg: "Open tomorrow?" },
];

function WaGlyph({ size }: { size: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: C.green, display: "grid", placeItems: "center", flex: "none" }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24">
        <path fill="#fff" d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3zm-3 5.2c-.2 0-.5 0-.7.3-.3.3-1 1-1 2.3s1 2.7 1.2 2.9c.1.2 2 3.1 4.9 4.2 2.4.9 2.9.8 3.4.7.5 0 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4l-.5-.3-1.8-.9c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.6.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.5-1.5-1.8-.1-.3 0-.4.1-.5l.4-.5.3-.4v-.5l-.8-2c-.2-.5-.4-.5-.6-.5H9z" />
      </svg>
    </div>
  );
}

export function Night() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { portrait, safeX, pick } = useOrient();
  const end = SCENES.night[1] - SCENES.night[0];

  const pings = cues.pings.map((p) => p - SCENES.night[0]);
  const s = pings.map((p) => spring({ frame: frame - p, fps, config: { damping: 17, stiffness: 190, mass: 0.7 } }));
  const arrived = pings.filter((p) => frame >= p).length;
  const glow = pings.reduce((m, p) => (frame >= p && frame - p < 14 ? Math.max(m, 1 - (frame - p) / 14) : m), 0);

  // Phone geometry
  const P = pick({ left: 1100, top: 96, w: 620, h: 1100 }, { left: 150, top: 190, w: 780, h: 1300 });
  const inner = P.w - 36;
  const cardW = inner - 32, cardH = pick(156, 170), gap = 14;
  const listTop = pick(250, 290);
  const phoneIn = spring({ frame, fps, config: { damping: 20, stiffness: 120 } });
  const out = progress(frame, end - 8, end);

  return (
    <AbsoluteFill style={{ overflow: "hidden", opacity: 1 - out * 0.6 }}>
      <Backdrop glow={0.08 + glow * 0.1} at={pick("72% 40%", "50% 35%")} />

      {/* Phone */}
      <div style={{
        position: "absolute", left: P.left, top: P.top, width: P.w, height: P.h,
        transform: `translateY(${(1 - phoneIn) * 120}px)`, opacity: phoneIn,
        background: "#0B0D10", borderRadius: 86, border: "18px solid #2A2F37",
        boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 ${80 + glow * 80}px rgba(37,211,102,${0.08 + glow * 0.12})`,
        boxSizing: "border-box", overflow: "hidden",
        WebkitMaskImage: portrait ? "linear-gradient(to bottom, black 78%, transparent 100%)" : undefined,
      }}>
        <div style={{ position: "absolute", top: 18, left: "50%", width: 150, height: 40, marginLeft: -75, borderRadius: 20, background: "#000" }} />
        <div style={{ position: "absolute", top: pick(84, 96), left: 0, right: 0, textAlign: "center", fontFamily: FONT, fontWeight: 800, color: C.white, fontSize: pick(104, 120), letterSpacing: "-0.04em", lineHeight: 1 }}>
          11:47 <span style={{ fontSize: pick(56, 64), color: C.orange }}>PM</span>
        </div>

        <div style={{ position: "absolute", left: 16, top: listTop, width: cardW, bottom: 0, WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent 98%)" }}>
          {MESSAGES.map((m, i) => {
            if (frame < pings[i] - 1) return null;
            let y = 0;
            for (let j = i + 1; j < MESSAGES.length; j++) y += s[j] * (cardH + gap);
            const newest = i === arrived - 1;
            return (
              <div key={i} style={{
                position: "absolute", left: 0, top: 0, width: cardW, height: cardH, boxSizing: "border-box",
                transform: `translateY(${y + (1 - s[i]) * -40}px) scale(${0.92 + 0.08 * s[i]})`, transformOrigin: "top center",
                opacity: Math.min(1, s[i] * 1.5), background: C.card2, borderRadius: 30,
                border: `2px solid ${newest ? C.green : "rgba(255,255,255,0.08)"}`,
                padding: "18px 24px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 6,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <WaGlyph size={pick(46, 50)} />
                  <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: pick(42, 44), color: C.white, flex: 1 }}>{m.who}</span>
                  <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: pick(42, 44), color: C.orange }}>now</span>
                </div>
                <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: pick(42, 46), color: C.white, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.msg}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Headline */}
      <div style={portrait
        ? { position: "absolute", left: safeX, right: safeX, top: 1420, textAlign: "center" }
        : { position: "absolute", left: 192, width: 860, top: 0, bottom: 0, display: "flex", alignItems: "center" }}>
        <Appear start={38} end={end + 8}>
          <h1 style={headline(pick(118, 116))}>The messages<br /><O>never stop.</O></h1>
        </Appear>
      </div>
    </AbsoluteFill>
  );
}
