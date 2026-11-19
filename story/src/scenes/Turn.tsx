// 0:28–0:38 — The turn. Damsara adds AlchemyX Catalyst, and the same question gets an answer in the same minute.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Bubble, C, DISPLAY, FONT, Headline, Mark, Phone, Pill, Typing, Words, clamp01, cues, ease, lerp, pop, prog } from "../kit";

const T = cues.turn;

export function Turn() {
  const f = useCurrentFrame();
  const flash = 1 - prog(f, 0, 16);
  const logo = pop(f, T.logo, 11, 160);
  const toTop = prog(f, T.phone - 20, T.phone + 14, ease);
  const phone = pop(f, T.phone, 16, 110);
  const typing = prog(f, T.typing, T.typing + 6) * (1 - prog(f, T.reply - 4, T.reply));
  const reply = pop(f, T.reply, 13, 190);
  const fast = pop(f, T.reply + 22);

  // logo: big and central, then tucked into the top lockup
  const lx = lerp(540, 300, toTop), ly = lerp(860, 318, toTop), ls = lerp(1, 0.36, toTop);
  const rings = [0, 12, 24].map((d) => prog(f, T.logo + d, T.logo + d + 50));

  return (
    <>
      <Headline top={230} style={{ opacity: 1 - toTop, filter: toTop ? `blur(${toTop * 10}px)` : undefined }}>
        <Words text={'ඊට පස්සේ GA"DAMSARA,'} start={4} style={{ fontSize: 60, fontWeight: 700, color: "#E2E2E2" }} />
        <Words text="*AlchemyX Catalyst* එකතු කළා." start={T.logo + 4} stagger={4} style={{ fontSize: 76, fontWeight: 900, marginTop: 8 }} />
      </Headline>

      {/* logo burst */}
      <div style={{ position: "absolute", left: lx, top: ly, transform: `translate(-50%, -50%) scale(${ls})` }}>
        {rings.map((r, i) => r > 0 && r < 1 && (
          <div key={i} style={{ position: "absolute", left: "50%", top: "50%", width: 280, height: 280, borderRadius: 80, transform: `translate(-50%, -50%) scale(${1 + r * 2.6}) rotate(${r * 30}deg)`, border: `3px solid rgba(255,138,76,${(1 - r) * 0.8})` }} />
        ))}
        <div style={{ transform: `scale(${logo}) rotate(${(1 - logo) * -40}deg)` }}>
          <Mark size={280} glow={1 - toTop * 0.6} />
        </div>
      </div>
      <div style={{
        position: "absolute", left: 0, right: 0, top: 1060, textAlign: "center", fontFamily: DISPLAY, color: C.white,
        opacity: clamp01(prog(f, T.logo + 10, T.logo + 26) - toTop * 1.5), transform: `translateY(${(1 - prog(f, T.logo + 10, T.logo + 26)) * 30}px)`,
      }}>
        <div style={{ fontFamily: FONT, fontSize: 36, fontWeight: 700, letterSpacing: 14, color: C.soft }}>WHATSAPP AGENT</div>
      </div>

      {/* top lockup once the phone is up */}
      <div style={{ position: "absolute", left: 370, top: 268, fontFamily: DISPLAY, color: C.white, opacity: prog(f, T.phone - 4, T.phone + 12) }}>
        <div style={{ fontSize: 50, fontWeight: 800, letterSpacing: -1, lineHeight: 1.1 }}>AlchemyX <span style={{ color: C.orange }}>Catalyst</span></div>
        <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 700, letterSpacing: 6, color: C.mute, marginTop: 6 }}>{'ONLINE FOR GA"DAMSARA'}</div>
      </div>

      <div style={{
        position: "absolute", left: 190, top: 450, opacity: Math.min(1, phone * 1.5),
        transform: `translateY(${(1 - phone) * 400}px) rotate(${(1 - phone) * 6}deg)`,
      }}>
        <Phone width={700} height={1210} title={'GA"DAMSARA STORES'} accentAvatar glow={0.6 + 0.4 * reply}
          subtitle={<span style={{ color: C.orange }}>● Catalyst · online</span>}
          avatar={<Mark size={50} />}>
          <div style={{ marginBottom: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 18, paddingTop: 10, opacity: prog(f, T.phone + 6, T.phone + 20) }}>
            <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 700, color: C.soft, background: C.grey2, padding: "8px 20px", borderRadius: 12, letterSpacing: 1 }}>TODAY</div>
            <div style={{ fontFamily: FONT, fontSize: 23, fontWeight: 500, color: C.orange2, background: "rgba(255,138,76,0.1)", border: "1px solid rgba(255,138,76,0.3)", padding: "12px 22px", borderRadius: 16, textAlign: "center", lineHeight: 1.4 }}>
              {"Catalyst answers from GA\"DAMSARA's own price list"}
            </div>
          </div>
          <Bubble side="them" time="1:12 PM" p={pop(f, T.ask, 14, 200)}>Bag eka thiyenawada? Price kiyada?</Bubble>
          {reply < 0.05 ? (
            <div style={{ height: 96, display: "flex", alignItems: "flex-end" }}><div style={{ width: "100%" }}><Typing frame={f} p={typing} side="me" /></div></div>
          ) : (
            <Bubble side="me" time="1:12 PM" ticks p={reply}>
              Ow, <b>Rs. 3,200</b>. Kade 9 idan 7 wenakam. Colombo athule delivery <b>Rs. 350</b>.
            </Bubble>
          )}
          <div style={{ height: 20 }} />
        </Phone>
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, top: 1700, display: "flex", justifyContent: "center", opacity: clamp01(fast * 1.4), transform: `scale(${0.8 + 0.2 * fast})` }}>
        <Pill hot style={{ fontSize: 32, padding: "16px 32px" }}>
          <svg width="26" height="32" viewBox="0 0 26 32"><path d="M15 1L2 18h9l-2 13 13-17h-9z" fill={C.orange} /></svg>
          එම විනාඩියේම reply
        </Pill>
      </div>

      {/* the hit */}
      {flash > 0 && <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, #fff, ${C.orange} 45%, ${C.ember})`, opacity: flash * flash }} />}
    </>
  );
}
