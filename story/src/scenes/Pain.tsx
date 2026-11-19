// 0:08–0:18 — A customer at the counter, and the phone won't stop. Fifteen of the same three questions.
import { useCurrentFrame } from "remotion";
import { C, DISPLAY, FONT, Headline, PersonIcon, Words, card, clamp01, cues, pop, prog } from "../kit";

const P = cues.pain;
const QS = ["මේක තියෙනවද?", "කීයද?", "Delivery කරනවද?"];
const NAMES = ["Nimali", "Kasun", "Dilan", "Sachini", "Tharindu", "Ayesha", "Ruwan", "Hiruni", "Lahiru", "Chamari", "Isuru", "Dulani", "Pasan", "Madhavi", "Supun"];
const SLOT = 132;

function Notification({ i, slot, p }: { i: number; slot: number; p: number }) {
  const fade = clamp01(1 - (slot - 5.2) / 1.2);
  return (
    <div style={{
      position: "absolute", left: 22, right: 22, top: 300 + slot * SLOT, height: 118,
      borderRadius: 30, background: "rgba(58,58,58,0.82)", border: "1px solid rgba(255,255,255,0.07)",
      display: "flex", alignItems: "center", gap: 20, padding: "0 24px",
      opacity: clamp01(p * 1.6) * fade, transform: `translateY(${(1 - p) * -40}px) scale(${0.9 + 0.1 * p})`,
      boxShadow: "0 16px 30px -14px rgba(0,0,0,0.8)",
    }}>
      <div style={{ width: 66, height: 66, borderRadius: 18, background: C.grey, display: "grid", placeItems: "center", flexShrink: 0, border: "1.5px solid rgba(255,255,255,0.1)" }}>
        <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 30, color: C.white }}>{NAMES[i][0]}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0, fontFamily: FONT }}>
        <div style={{ display: "flex", justifyContent: "space-between", color: C.white, fontSize: 25, fontWeight: 700 }}>
          <span>{NAMES[i]}</span><span style={{ color: C.mute, fontWeight: 500, fontSize: 21 }}>now</span>
        </div>
        <div style={{ color: "#E6E6E6", fontSize: 29, fontWeight: 500, marginTop: 2, whiteSpace: "nowrap" }}>{QS[i % 3]}</div>
      </div>
    </div>
  );
}

function Marquee({ y, dir, f, start }: { y: number; dir: 1 | -1; f: number; start: number }) {
  const p = prog(f, start, start + 20);
  const items = Array.from({ length: 12 }, (_, k) => QS[k % 3]);
  return (
    <div style={{ position: "absolute", top: y, left: 0, width: 3000, display: "flex", gap: 22, opacity: p * 0.9, transform: `translateX(${-900 + dir * (f - start) * 4.5 - (dir > 0 ? 300 : 0)}px)` }}>
      {items.map((q, k) => (
        <div key={k} style={{
          fontFamily: FONT, fontSize: 36, fontWeight: 600, color: k % 3 === 1 ? C.char : C.white, whiteSpace: "nowrap",
          padding: "18px 30px", borderRadius: 30, borderBottomLeftRadius: 8,
          background: k % 3 === 1 ? C.orange : C.grey, opacity: 0.55 + 0.45 * ((k + (dir > 0 ? 1 : 0)) % 2),
        }}>{q}</div>
      ))}
    </div>
  );
}

export function Pain() {
  const f = useCurrentFrame();
  const count = P.pings.filter((p) => f >= p).length;
  const lastPing = [...P.pings].reverse().find((p) => f >= p) ?? -100;
  const since = f - lastPing;
  const shake = since >= 0 && since < 10 ? Math.sin(since * 2.6) * (10 - since) * 0.55 : 0;
  const phone = pop(f, P.phoneIn, 16, 120);
  const same = prog(f, P.same, P.same + 18);
  const counter = pop(f, P.counter + 8);
  const badge = since >= 0 && since < 12 ? 1 + 0.35 * Math.exp(-since / 3) : 1;

  return (
    <>
      <Headline top={200} style={{ fontSize: 54, opacity: 1 - same, filter: same ? `blur(${same * 10}px)` : undefined }}>
        <Words text="කවුන්ටරේ ළඟ *ගනුදෙනුකාරයෙක්.*" start={P.counter} />
        <Words text="ඒ අතරේ ෆෝන් එකේ මැසේජ්:" start={P.phoneIn - 8} style={{ color: "#DADADA", fontWeight: 700, fontSize: 46, marginTop: 6 }} />
      </Headline>

      {/* the phone, buzzing */}
      <div style={{
        position: "absolute", left: 210, top: 540, width: 660, height: 1220,
        opacity: Math.min(1, phone * 1.4) * (1 - same * 0.8),
        transform: `translateY(${(1 - phone) * 260}px) rotate(${-3 + shake * 0.35}deg) translateX(${shake}px) scale(${1 - same * 0.06})`,
        filter: same ? `blur(${same * 12}px)` : undefined,
      }}>
        <div style={{
          position: "absolute", inset: 0, borderRadius: 84, padding: 16,
          background: "linear-gradient(150deg, #3a3a3a, #161616 40%, #0b0b0b)",
          boxShadow: `0 60px 120px -30px rgba(0,0,0,0.9), 0 0 0 2px #2c2c2c, 0 0 ${70 * Math.exp(-Math.max(0, since) / 6)}px rgba(255,138,76,0.5)`,
        }}>
          <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 70, overflow: "hidden", background: "linear-gradient(180deg, #232323, #121212)" }}>
            <div style={{ position: "absolute", width: 150, height: 40, borderRadius: 40, background: "#000", left: "50%", top: 18, transform: "translateX(-50%)" }} />
            <div style={{ position: "absolute", top: 92, left: 0, right: 0, textAlign: "center", fontFamily: DISPLAY, color: C.white }}>
              <div style={{ fontSize: 30, fontWeight: 600, opacity: 0.7, fontFamily: FONT }}>Tuesday</div>
              <div style={{ fontSize: 130, fontWeight: 700, lineHeight: 1.05, letterSpacing: -3 }}>1:12</div>
            </div>
            {P.pings.map((at, i) => {
              if (f < at) return null;
              let slot = 0;
              for (let j = i + 1; j < P.pings.length; j++) slot += prog(f, P.pings[j], P.pings[j] + 8);
              if (slot > 6.6) return null;
              return <Notification key={i} i={i} slot={slot} p={pop(f, at, 14, 220)} />;
            })}
          </div>
        </div>
        {/* unread badge */}
        <div style={{
          position: "absolute", right: -26, top: -26, minWidth: 104, height: 104, borderRadius: 104, padding: "0 18px",
          background: C.orange, color: C.char, display: count ? "grid" : "none", placeItems: "center",
          fontFamily: DISPLAY, fontWeight: 800, fontSize: 52, transform: `scale(${badge})`,
          boxShadow: "0 0 0 8px #1a1a1a, 0 20px 50px rgba(255,138,76,0.5)",
        }}>{count}</div>
      </div>

      {/* the customer still waiting at the counter */}
      <div style={{
        position: "absolute", left: 50, top: 420, width: 330, padding: "24px 26px", ...card, borderRadius: 34,
        opacity: Math.min(1, counter * 1.4) * (1 - same), transform: `translateX(${(1 - counter) * -80}px) rotate(-2deg)`,
        display: "flex", alignItems: "center", gap: 18, zIndex: 2,
      }}>
        <div style={{ width: 78, height: 78, borderRadius: 78, background: C.grey, display: "grid", placeItems: "center", boxShadow: `0 0 0 4px rgba(255,138,76,${0.3 + 0.3 * Math.sin(f / 6)})` }}>
          <PersonIcon size={50} color={C.soft} />
        </div>
        <div style={{ fontFamily: FONT, color: C.white }}>
          <div style={{ fontSize: 30, fontWeight: 800 }}>කවුන්ටරේ</div>
          <div style={{ fontSize: 22, color: C.mute, fontWeight: 600, display: "flex", gap: 6, marginTop: 4 }}>
            waiting
            {[0, 1, 2].map((k) => <span key={k} style={{ opacity: 0.3 + 0.7 * clamp01(Math.sin(f / 5 - k)) }}>•</span>)}
          </div>
        </div>
      </div>

      {/* same questions, all day */}
      {same > 0 && (
        <>
          <Marquee y={640} dir={-1} f={f} start={P.same} />
          <Marquee y={1460} dir={1} f={f} start={P.same + 4} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 760, height: 640, display: "grid", placeItems: "center" }}>
            <div style={{
              position: "absolute", fontFamily: DISPLAY, fontWeight: 800, fontSize: 620, lineHeight: 1, letterSpacing: -12,
              color: "transparent", WebkitTextStroke: `4px rgba(255,138,76,${0.55 * same})`, transform: `scale(${0.85 + 0.15 * same})`,
            }}>15</div>
            <div style={{ position: "relative", textAlign: "center", fontFamily: FONT, color: C.white }}>
              <Words text="එකම ප්‍රශ්න." start={P.same + 2} stagger={4} style={{ fontSize: 104, fontWeight: 900, letterSpacing: -1 }} />
              <Words text="දවසට *පහළොවක්.*" start={P.same + 22} stagger={5} style={{ fontSize: 88, fontWeight: 800, marginTop: 10 }} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
