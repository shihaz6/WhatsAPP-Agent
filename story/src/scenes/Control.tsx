// 0:48–0:56 — Damsara can take over any time; today's chats and open questions at a glance.
import { useCurrentFrame } from "remotion";
import { Avatar, C, DISPLAY, FONT, Headline, Mark, Words, card, clamp01, cues, lerp, pop, prog } from "../kit";

const K = cues.control;
const BARS = [1, 2, 1, 3, 2, 1, 2, 1, 1, 1]; // 9 AM → 6 PM, adds up to 15

export function Control() {
  const f = useCurrentFrame();
  const panel = pop(f, K.panel, 16, 110);
  const tapped = f >= K.tap;
  const tapP = prog(f, K.tap, K.tap + 18);
  const press = f >= K.tap - 3 && f < K.tap + 4 ? 0.93 : 1;
  const stats = prog(f, K.stats, K.stats + 18);
  const n = (to: number) => Math.round(lerp(0, to, prog(f, K.count, K.count + 34)));

  // cursor glides in, taps, leaves
  const cIn = prog(f, K.tap - 40, K.tap - 4);
  const cx = lerp(980, 822, cIn), cy = lerp(1500, 712, cIn);
  const cOut = prog(f, K.tap + 14, K.tap + 34);

  return (
    <>
      <Headline top={214} style={{ fontSize: 66 }}>
        <Words text={'GA"DAMSARA ට ඕන වෙලාවක *take over* කරන්න පුළුවන්.'} start={4} out={K.stats - 14} />
      </Headline>
      <Headline top={206} style={{ fontSize: 52 }}>
        <Words text="අද දවසේ chats, හිඟ ප්‍රශ්න..." start={K.stats - 2} style={{ color: "#D8D8D8", fontWeight: 700 }} />
        <Words text="dashboard එකෙන් *එක බැල්මකින්.*" start={K.stats + 18} stagger={4} style={{ fontSize: 54, fontWeight: 900, marginTop: 6 }} />
      </Headline>

      <div style={{
        position: "absolute", left: 60, right: 60, top: 540, padding: 34, ...card, borderRadius: 48,
        opacity: Math.min(1, panel * 1.4), transform: `translateY(${(1 - panel) * 120}px) perspective(1800px) rotateX(${(1 - panel) * 14}deg)`,
      }}>
        {/* top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontFamily: DISPLAY, color: C.white, marginBottom: 28 }}>
          <Mark size={58} />
          <span style={{ fontSize: 38, fontWeight: 800 }}>Catalyst</span>
          <span style={{ fontFamily: FONT, fontSize: 26, color: C.mute, fontWeight: 600 }}>Dashboard</span>
          <span style={{ marginLeft: "auto", fontFamily: FONT, fontSize: 24, fontWeight: 700, color: C.orange2, padding: "8px 20px", borderRadius: 999, background: "rgba(255,138,76,0.12)" }}>අද</span>
        </div>

        {/* the live chat row */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, padding: 24, borderRadius: 30, background: "rgba(0,0,0,0.3)", border: `2px solid rgba(255,138,76,${0.15 + 0.5 * tapP})` }}>
          <Avatar label="K" size={78} />
          <div style={{ flex: 1, minWidth: 0, fontFamily: FONT }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, color: C.white, fontSize: 32, fontWeight: 700 }}>
              Kasun
              <span style={{ fontSize: 20, fontWeight: 800, padding: "4px 12px", borderRadius: 10, background: tapped ? C.white : C.orange, color: C.char }}>{tapped ? "YOU" : "AI"}</span>
            </div>
            <div style={{ color: C.mute, fontSize: 26, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Blue colour eka thiyenawada?</div>
          </div>
          <div style={{
            position: "relative", padding: "20px 30px", borderRadius: 22, fontFamily: FONT, fontSize: 28, fontWeight: 800, whiteSpace: "nowrap",
            background: tapped ? C.white : C.orange, color: C.char, transform: `scale(${press})`,
            boxShadow: `0 14px 30px -10px rgba(255,138,76,${tapped ? 0.2 : 0.6})`,
          }}>
            {tapped ? "✓ You're in" : "Take over"}
            {tapP > 0 && tapP < 1 && <div style={{ position: "absolute", left: "50%", top: "50%", width: 40, height: 40, borderRadius: 40, transform: `translate(-50%,-50%) scale(${1 + tapP * 7})`, border: `3px solid rgba(255,138,76,${1 - tapP})` }} />}
          </div>
        </div>
        <div style={{ height: tapped ? lerp(0, 72, tapP) : 0, overflow: "hidden" }}>
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, fontFamily: FONT, color: C.soft, fontSize: 25, fontWeight: 600 }}>
            <span style={{ width: 12, height: 12, borderRadius: 12, background: C.white }} />
            AI paused for this chat · {'GA"DAMSARA'} replying
          </div>
        </div>

        {/* today at a glance */}
        <div style={{ opacity: stats, transform: `translateY(${(1 - stats) * 40}px)`, maxHeight: stats * 900, overflow: "hidden" }}>
          <div style={{ display: "flex", gap: 20, marginTop: 28 }}>
            {[["අද chats", n(15), true], ["AI උත්තර", n(14), false], ["හිඟ ප්‍රශ්න", n(1), false]].map(([label, value, hot], i) => (
              <div key={i} style={{ flex: 1, padding: "24px 24px 20px", borderRadius: 28, background: hot ? "rgba(255,138,76,0.12)" : "rgba(255,255,255,0.04)", border: `1.5px solid ${hot ? "rgba(255,138,76,0.45)" : "rgba(255,255,255,0.08)"}` }}>
                <div style={{ fontFamily: FONT, fontSize: 24, color: C.mute, fontWeight: 700 }}>{label}</div>
                <div style={{ fontFamily: DISPLAY, fontSize: 84, fontWeight: 800, color: hot ? C.orange : C.white, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 22, padding: "24px 26px 18px", borderRadius: 28, background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontFamily: FONT, fontSize: 24, color: C.mute, fontWeight: 700, marginBottom: 14 }}>Chats per hour</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 150 }}>
              {BARS.map((v, i) => {
                const g = prog(f, K.count + i * 3, K.count + i * 3 + 20);
                return <div key={i} style={{ flex: 1, height: `${(v / 3) * 100 * g}%`, borderRadius: 10, background: v === 3 ? C.orange : "#4a4a4a" }} />;
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT, fontSize: 20, color: C.mute, marginTop: 10, fontWeight: 600 }}><span>9 AM</span><span>6 PM</span></div>
          </div>
          <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 18, padding: "20px 24px", borderRadius: 26, border: "2px dashed rgba(255,138,76,0.5)", fontFamily: FONT }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: C.char, background: C.orange, padding: "6px 14px", borderRadius: 10, whiteSpace: "nowrap" }}>හිඟ ප්‍රශ්නය</span>
            <span style={{ color: C.white, fontSize: 28, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Blue colour eka thiyenawada?</span>
          </div>
        </div>
      </div>

      {/* finger cursor */}
      <svg width="90" height="110" viewBox="0 0 24 30" style={{
        position: "absolute", left: cx, top: cy, opacity: clamp01(cIn * 3) * (1 - cOut), transform: `scale(${press})`,
        filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.6))",
      }}>
        <path d="M9 2.5a2 2 0 0 1 4 0V12l1-.3a2 2 0 0 1 2.4 1.3l.1.4.7-.2a2 2 0 0 1 2.5 1.4l.1.5.4-.1a2 2 0 0 1 2.5 1.6l.8 4.6a8 8 0 0 1-2 6.7l-.9 1H10l-5.5-8.3a2 2 0 0 1 3-2.6L9 19.5z" fill="#fff" stroke={C.char} strokeWidth="1.2" />
      </svg>
    </>
  );
}
