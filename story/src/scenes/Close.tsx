// 0:56–1:05 — Damsara faces the counter; the agent keeps the phone. End card.
import { useCurrentFrame } from "remotion";
import { Shop } from "../Shop";
import { C, DISPLAY, FONT, Headline, Mark, Words, clamp01, cues, easeIn, pop, prog } from "../kit";

const CL = cues.close;
const REPLIES = [["Rs. 3,200", "Nimali"], ["9 AM – 7 PM", "Dilan"], ["Delivery Rs. 350", "Sachini"]];

export function Close() {
  const f = useCurrentFrame();
  const out = prog(f, CL.card - 12, CL.card + 6, easeIn);
  const shop = pop(f, 4, 18, 90);
  const lastReply = [...CL.replies].reverse().find((r) => f >= r) ?? -99;
  const glow = clamp01(Math.exp(-Math.max(0, f - lastReply) / 12)) * (f >= CL.replies[0] ? 1 : 0);

  const logo = pop(f, CL.hit, 11, 150);
  const word = prog(f, CL.hit + 8, CL.hit + 26);
  const ticks = prog(f, CL.hit + 4, CL.hit + 56);
  const phone = pop(f, CL.phone);

  return (
    <>
      {out < 1 && (
        <div style={{ position: "absolute", inset: 0, opacity: 1 - out, filter: out ? `blur(${out * 14}px)` : undefined, transform: `scale(${1 - out * 0.06})` }}>
          <Headline top={206} style={{ fontSize: 58 }}>
            <Words text={'දැන් GA"DAMSARA, කවුන්ටරේ *ගනුදෙනුකාරයා දිහා* බලාගෙන වැඩ කරනවා.'} start={4} stagger={3} />
          </Headline>
          <div style={{
            position: "absolute", left: 130, top: 470, width: 820, opacity: Math.min(1, shop * 1.3),
            transform: `translateY(${(1 - shop) * 100}px) scale(${0.92 + 0.08 * shop + f * 0.0003})`, transformOrigin: "50% 100%",
            filter: "drop-shadow(0 50px 80px rgba(0,0,0,0.65))",
          }}>
            <Shop day={0.32} frame={f} customer={clamp01(shop * 1.2)} phoneGlow={glow} width={820} />
          </div>
          {/* replies going out from the phone on the counter */}
          {REPLIES.map(([what, who], i) => {
            const p = pop(f, CL.replies[i], 14, 170);
            const rise = prog(f, CL.replies[i], CL.replies[i] + 22);
            return (
              <div key={i} style={{
                position: "absolute", right: 40, top: 1110 - rise * (330 - i * 100), display: "flex", alignItems: "center", gap: 14,
                padding: "16px 24px", borderRadius: 26, borderBottomRightRadius: 8, background: C.orange, color: C.char,
                fontFamily: FONT, fontSize: 29, fontWeight: 700, whiteSpace: "nowrap",
                opacity: clamp01(p * 1.6), transform: `scale(${0.6 + 0.4 * p})`, transformOrigin: "right bottom",
                boxShadow: "0 20px 44px -12px rgba(255,138,76,0.6), 0 0 0 6px rgba(26,26,26,0.6)",
              }}>
                <span>✓✓</span><span>{what}</span><span style={{ opacity: 0.6, fontWeight: 600 }}>→ {who}</span>
              </div>
            );
          })}
          <div style={{ position: "absolute", left: 60, right: 60, top: 1300, fontFamily: FONT, color: C.white }}>
            <Words text="ෆෝන් එකත් බලාගන්නේ..." start={CL.replies[0] + 4} style={{ fontSize: 58, fontWeight: 700, color: "#D8D8D8" }} />
            <Words text="*එක WhatsApp agent කෙනෙක්.*" start={CL.replies[1] + 6} stagger={4} style={{ fontSize: 64, fontWeight: 900, marginTop: 8 }} />
          </div>
        </div>
      )}

      {/* end card */}
      {f >= CL.card && (
        <>
          <div style={{ position: "absolute", left: 540, top: 700, transform: "translate(-50%, -50%)" }}>
            <svg width="560" height="560" viewBox="-280 -280 560 560" style={{ position: "absolute", left: -280, top: -280, overflow: "visible" }}>
              {Array.from({ length: 24 }, (_, i) => {
                const on = ticks * 24 > i;
                return <line key={i} x1="0" y1="-236" x2="0" y2={i % 6 === 0 ? -270 : -258} stroke={on ? C.orange : "#444"} strokeWidth={i % 6 === 0 ? 8 : 5} strokeLinecap="round" transform={`rotate(${i * 15})`} opacity={clamp01(logo * 1.5)} style={{ filter: on ? "drop-shadow(0 0 8px rgba(255,138,76,0.8))" : undefined }} />;
              })}
              <circle r="216" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" opacity={logo} />
            </svg>
            <div style={{ transform: `scale(${logo}) rotate(${(1 - logo) * 30}deg)` }}><Mark size={250} glow={1} /></div>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 1010, textAlign: "center", fontFamily: DISPLAY, color: C.white, opacity: word, transform: `translateY(${(1 - word) * 40}px)` }}>
            <div style={{ fontSize: 100, fontWeight: 800, letterSpacing: -3, lineHeight: 1.05 }}>AlchemyX <span style={{ color: C.orange }}>Catalyst</span></div>
            <div style={{ fontFamily: FONT, fontSize: 34, fontWeight: 700, letterSpacing: 12, color: C.soft, marginTop: 14 }}>WHATSAPP AGENT</div>
          </div>
          <div style={{ position: "absolute", left: 60, right: 60, top: 1236, fontFamily: FONT, color: C.white }}>
            <Words text="ඔබේ ව්‍යාපාරය..." start={CL.tag} style={{ fontSize: 54, fontWeight: 700, color: "#D8D8D8" }} />
            <Words text="දවසේ *පැය විසි හතරම,*" start={CL.tag + 12} stagger={4} style={{ fontSize: 74, fontWeight: 900, marginTop: 4 }} />
            <Words text="WhatsApp එකේ." start={CL.tag + 24} stagger={4} style={{ fontSize: 74, fontWeight: 900 }} />
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 1600, display: "flex", justifyContent: "center", opacity: clamp01(phone * 1.5), transform: `translateY(${(1 - phone) * 20}px)` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: FONT, fontSize: 32, fontWeight: 600, color: C.soft, padding: "14px 30px", borderRadius: 999, border: "1.5px solid rgba(255,255,255,0.16)", background: "rgba(20,20,20,0.6)" }}>
              <svg width="30" height="30" viewBox="0 0 24 24"><path d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5z" fill="none" stroke={C.orange} strokeWidth="2" /><path d="M8.6 7.8c.3-.6.6-.6.9-.6h.6c.2 0 .5 0 .7.6l.9 2.1c.1.3 0 .5-.1.7l-.6.7c-.1.2-.2.4 0 .6.6 1 1.6 2 2.8 2.6.2.1.4.1.6-.1l.8-.9c.2-.2.4-.2.6-.1l2 1c.3.1.4.3.4.5 0 .9-.6 1.8-1.5 2-1 .3-2.6.1-4.6-1.2-2.4-1.6-3.8-3.8-4-4.6-.4-1.1-.1-2.3.5-3.3z" fill={C.orange} /></svg>
              WhatsApp <span style={{ color: C.white, fontWeight: 800, letterSpacing: 1 }}>078 822 5521</span>
            </div>
          </div>
        </>
      )}
    </>
  );
}
