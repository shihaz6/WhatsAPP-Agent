// 0:40–0:46 — Sleep easy. End card.
import { useCurrentFrame } from "remotion";
import { C, DISPLAY, FONT, Mark, Words, clamp01, cues, easeIn, pop, prog } from "../kit";
import { useT } from "../i18n";

const CL = cues.close;

export function Close() {
  const f = useCurrentFrame();
  const { t, si } = useT();
  const out = prog(f, CL.hit - 10, CL.hit, easeIn);
  const logo = pop(f, CL.hit, 11, 150);
  const word = prog(f, CL.hit + 8, CL.hit + 26);
  const ticks = prog(f, CL.hit + 4, CL.hit + 50);
  const aud = prog(f, CL.audience, CL.audience + 14);
  const phone = pop(f, CL.phone);

  return (
    <>
      {out < 1 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 760, textAlign: "center", fontFamily: FONT, color: C.white, opacity: 1 - out, filter: out ? `blur(${out * 14}px)` : undefined, transform: `scale(${1 + out * 0.15})` }}>
          <Words text={t.close.sleep} start={CL.line} stagger={5} dur={18} style={{ fontSize: si ? 110 : 150, fontWeight: 900, letterSpacing: si ? -1 : -4, lineHeight: 1.25 }} />
        </div>
      )}
      {f >= CL.hit - 2 && (
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
            <Words text={t.close.tag1} start={CL.tag} stagger={3} style={{ fontSize: si ? 52 : 58, fontWeight: 700, color: "#E0E0E0" }} />
            <Words text={t.close.tag2} start={CL.tag + 12} stagger={4} style={{ fontSize: si ? 70 : 80, fontWeight: 900, marginTop: 2 }} />
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 1470, textAlign: "center", fontFamily: FONT, fontSize: 30, fontWeight: 700, letterSpacing: si ? 2 : 6, color: C.soft, opacity: aud, transform: `translateY(${(1 - aud) * 16}px)` }}>
            {t.close.audience}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 1560, display: "flex", justifyContent: "center", opacity: clamp01(phone * 1.5), transform: `translateY(${(1 - phone) * 20}px)` }}>
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
