// 0:33–0:40 — Morning: the night's work on one screen. You approve the deposit; anything new comes to you.
import { useCurrentFrame } from "remotion";
import { Avatar, C, DISPLAY, FONT, Headline, Mark, Words, card, clamp01, cues, lerp, pop, prog } from "../kit";
import { useT } from "../i18n";

const WK = cues.wake;

export function Wake() {
  const f = useCurrentFrame();
  const { t, si } = useT();
  const panel = pop(f, WK.panel, 16, 110);
  const n = (to: number) => Math.round(lerp(0, to, prog(f, WK.stats, WK.stats + 30)));
  const tapped = f >= WK.tap;
  const tapP = prog(f, WK.tap, WK.tap + 18);
  const press = f >= WK.tap - 3 && f < WK.tap + 4 ? 0.93 : 1;
  const slip = pop(f, WK.slip, 14, 170);
  const ask = pop(f, WK.ask, 14, 170);
  const cIn = prog(f, WK.tap - 36, WK.tap - 4);
  const cOut = prog(f, WK.tap + 14, WK.tap + 32);
  const cx = lerp(990, 812, cIn), cy = lerp(1650, 1078, cIn);

  return (
    <>
      <Headline top={200} style={{ fontSize: si ? 64 : 70 }}>
        <Words text={t.wake.a1} start={4} stagger={3} out={WK.ask - 12} />
        <Words text={t.wake.a2} start={14} stagger={3} out={WK.ask - 12} />
      </Headline>
      <Headline top={200} style={{ fontSize: si ? 52 : 70 }}>
        <Words text={t.wake.b1} start={WK.ask - 2} stagger={3} style={{ fontSize: si ? 42 : 60 }} />
        <Words text={t.wake.b2} start={WK.ask + 12} stagger={4} style={{ fontWeight: 900 }} />
      </Headline>

      <div style={{
        position: "absolute", left: 60, right: 60, top: 470, padding: 32, ...card, borderRadius: 46,
        opacity: Math.min(1, panel * 1.4), transform: `translateY(${(1 - panel) * 120}px) perspective(1800px) rotateX(${(1 - panel) * 14}deg)`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: DISPLAY, color: C.white, marginBottom: 24 }}>
          <Mark size={56} />
          <span style={{ fontSize: 36, fontWeight: 800 }}>Catalyst</span>
          <span style={{ fontFamily: FONT, fontSize: 25, color: C.mute, fontWeight: 600 }}>Overnight</span>
          <span style={{ marginLeft: "auto", fontFamily: FONT, fontSize: 22, fontWeight: 700, color: C.orange2, padding: "8px 18px", borderRadius: 999, background: "rgba(255,138,76,0.12)" }}>11 PM – 7 AM</span>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {([["Chats answered", n(14), true], ["Booking requests", n(3), false], ["Slips to check", tapped ? 0 : n(1), false]] as [string, number, boolean][]).map(([label, value, hot], i) => (
            <div key={i} style={{ flex: 1, padding: "20px 20px 16px", borderRadius: 26, background: hot ? "rgba(255,138,76,0.12)" : "rgba(255,255,255,0.04)", border: `1.5px solid ${hot ? "rgba(255,138,76,0.45)" : "rgba(255,255,255,0.08)"}` }}>
              <div style={{ fontFamily: FONT, fontSize: 21, color: C.mute, fontWeight: 700 }}>{label}</div>
              <div style={{ fontFamily: DISPLAY, fontSize: 76, fontWeight: 800, color: hot ? C.orange : C.white, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* deposit slip */}
        <div style={{
          marginTop: 22, display: "flex", alignItems: "center", gap: 20, padding: 22, borderRadius: 28, background: "rgba(0,0,0,0.3)",
          border: `2px solid rgba(255,138,76,${0.15 + 0.5 * tapP})`, opacity: clamp01(slip * 1.5), transform: `translateY(${(1 - slip) * 30}px)`,
        }}>
          <div style={{ width: 78, height: 96, borderRadius: 12, background: "#EDEDED", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 7, flexShrink: 0 }}>
            {[0.9, 0.6, 0.75, 0.5].map((w, k) => <div key={k} style={{ height: 7, width: `${w * 100}%`, borderRadius: 4, background: k === 1 ? C.orange : "#9a9a9a" }} />)}
          </div>
          <div style={{ flex: 1, minWidth: 0, fontFamily: FONT }}>
            <div style={{ color: C.white, fontSize: 30, fontWeight: 700 }}>Emma W. <span style={{ color: C.mute, fontSize: 23, fontWeight: 600 }}>· 3:20 AM</span></div>
            <div style={{ color: C.soft, fontSize: 25, marginTop: 4 }}>Deposit slip · $60 · Dec 14–16</div>
          </div>
          <div style={{
            position: "relative", padding: "18px 28px", borderRadius: 20, fontFamily: FONT, fontSize: 28, fontWeight: 800, whiteSpace: "nowrap",
            background: tapped ? C.white : C.orange, color: C.char, transform: `scale(${press})`,
          }}>
            {tapped ? "✓ Approved" : "Approve"}
            {tapP > 0 && tapP < 1 && <div style={{ position: "absolute", left: "50%", top: "50%", width: 40, height: 40, borderRadius: 40, transform: `translate(-50%,-50%) scale(${1 + tapP * 7})`, border: `3px solid rgba(255,138,76,${1 - tapP})` }} />}
          </div>
        </div>

        {/* something not on the rate sheet comes to you */}
        <div style={{ maxHeight: ask * 200, overflow: "hidden", opacity: clamp01(ask * 1.4) }}>
          <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 18, padding: "20px 22px", borderRadius: 26, border: "2px dashed rgba(255,138,76,0.55)", fontFamily: FONT }}>
            <Avatar label="K" size={64} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: C.white, fontSize: 28, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>"Can you do a vegan dinner?"</div>
              <div style={{ color: C.mute, fontSize: 22, marginTop: 4 }}>{t.wake.notOnSheet}</div>
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, color: C.char, background: C.orange, padding: "8px 16px", borderRadius: 12, whiteSpace: "nowrap" }}>{t.wake.needs}</span>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, top: 1240, display: "flex", justifyContent: "center", opacity: prog(f, WK.ask + 24, WK.ask + 38), transform: `translateY(${(1 - prog(f, WK.ask + 24, WK.ask + 38)) * 20}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: FONT, fontSize: 30, fontWeight: 700, color: C.white, padding: "16px 30px", borderRadius: 999, border: "1.5px solid rgba(255,138,76,0.5)", background: "rgba(255,138,76,0.1)" }}>
          <span style={{ width: 12, height: 12, borderRadius: 12, background: C.orange }} />
          {t.wake.takeover}
        </div>
      </div>
      <svg width="90" height="110" viewBox="0 0 24 30" style={{ position: "absolute", left: cx, top: cy, opacity: clamp01(cIn * 3) * (1 - cOut), transform: `scale(${press})`, filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.6))" }}>
        <path d="M9 2.5a2 2 0 0 1 4 0V12l1-.3a2 2 0 0 1 2.4 1.3l.1.4.7-.2a2 2 0 0 1 2.5 1.4l.1.5.4-.1a2 2 0 0 1 2.5 1.6l.8 4.6a8 8 0 0 1-2 6.7l-.9 1H10l-5.5-8.3a2 2 0 0 1 3-2.6L9 19.5z" fill="#fff" stroke={C.char} strokeWidth="1.2" />
      </svg>
    </>
  );
}
