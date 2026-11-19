// 0:31–0:38 — 11:40 PM. Pain after an extraction: Catalyst gives no medical advice, it hands the chat to the doctor.
import { useCurrentFrame } from "remotion";
import { Avatar, Bubble, C, Cursor, DISPLAY, Eyebrow, FONT, Phone, Words, clamp01, cues, darkCard, lerp, pop, prog } from "../kit";

const U = cues.urgent;

export function Urgent() {
  const f = useCurrentFrame();
  const phone = pop(f, 0, 16, 110);
  const alert = pop(f, U.alert, 13, 170);
  const tapped = f >= U.tap;
  const tapP = prog(f, U.tap, U.tap + 18);
  const press = f >= U.tap - 3 && f < U.tap + 4 ? 0.9 : 1;
  const cIn = prog(f, U.cursor, U.tap - 4);
  const cOut = prog(f, U.tap + 20, U.tap + 34);
  const cx = lerp(1050, 330, cIn), cy = lerp(1120, 805, cIn);
  const sys = pop(f, U.tap + 4, 14, 190);
  const doc = pop(f, U.doctor, 13, 190);
  const beacon = (f % 36) / 36;

  return (
    <>
      <div style={{ position: "absolute", left: 130, top: 92, width: 1100, color: C.white }}>
        <Eyebrow color={C.soft} style={{ opacity: prog(f, 4, 14) }}>11:40 PM · Clinic closed</Eyebrow>
        <Words text="Real pain goes straight" start={8} stagger={3} style={{ fontFamily: DISPLAY, fontSize: 80, fontWeight: 800, letterSpacing: -3, lineHeight: 1.04, marginTop: 14 }} />
        <Words text="to *the doctor.*" start={20} stagger={3} style={{ fontFamily: DISPLAY, fontSize: 80, fontWeight: 800, letterSpacing: -3, lineHeight: 1.04 }} />
      </div>

      {/* hand-off card */}
      <div style={{
        position: "absolute", left: 130, top: 370, width: 1060, padding: 30, ...darkCard,
        border: `2px solid rgba(255,138,76,${0.25 + 0.55 * clamp01(alert) * (tapped ? 0.4 : 1)})`,
        opacity: clamp01(alert * 1.4), transform: `translateY(${(1 - alert) * 80}px) scale(${0.96 + 0.04 * alert})`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: FONT, marginBottom: 22 }}>
          <span style={{ position: "relative", width: 16, height: 16 }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: 16, background: C.orange }} />
            {!tapped && <span style={{ position: "absolute", inset: 0, borderRadius: 16, border: `2px solid ${C.orange}`, transform: `scale(${1 + beacon * 2.4})`, opacity: 1 - beacon }} />}
          </span>
          <span style={{ fontSize: 24, fontWeight: 800, color: C.white }}>{tapped ? "You're handling this" : "Needs you"}</span>
          <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: 2, color: C.char, background: C.orange, padding: "5px 11px", borderRadius: 7 }}>URGENT</span>
          <span style={{ marginLeft: "auto", fontSize: 17, fontWeight: 700, color: C.soft }}>Handed over by Catalyst · 11:40 PM</span>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          <Avatar label="K" size={70} bg="#4A4A4A" />
          <div style={{ flex: 1, fontFamily: FONT }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: C.white }}>Kasun R.</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: C.soft, marginTop: 4 }}>Swelling and pain after an extraction</div>
            <div style={{ marginTop: 18, padding: "16px 20px", borderRadius: 16, background: "rgba(0,0,0,0.28)", borderLeft: `4px solid ${C.orange}`, fontSize: 20, lineHeight: 1.45, color: "#E4E4E4", fontWeight: 500 }}>
              <span style={{ color: C.orange2, fontWeight: 800, fontSize: 14, letterSpacing: 1.5 }}>CATALYST'S NOTE FOR YOU</span><br />
              Tooth out on Monday. Face swollen since this evening, pain getting worse. Asked for help tonight.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 26, fontFamily: FONT }}>
          <div style={{
            position: "relative", padding: "18px 30px", borderRadius: 16, fontSize: 22, fontWeight: 800, whiteSpace: "nowrap",
            background: tapped ? C.white : C.orange, color: C.char, transform: `scale(${press})`,
          }}>
            {tapped ? "✓ You're in the chat" : "Take over chat"}
            {tapP > 0 && tapP < 1 && <div style={{ position: "absolute", left: "50%", top: "50%", width: 40, height: 40, borderRadius: 40, transform: `translate(-50%,-50%) scale(${1 + tapP * 7})`, border: `3px solid rgba(255,138,76,${1 - tapP})` }} />}
          </div>
          <div style={{ padding: "18px 26px", borderRadius: 16, fontSize: 22, fontWeight: 700, color: C.soft, border: "1.5px solid rgba(255,255,255,0.16)" }}>Call patient</div>
          <div style={{ marginLeft: "auto", alignSelf: "center", fontSize: 18, fontWeight: 700, color: tapped ? C.orange2 : C.mute }}>{tapped ? "AI paused for this chat" : "AI won't give medical advice"}</div>
        </div>
      </div>

      {/* the chat */}
      <div style={{ position: "absolute", left: 1320, top: 75, opacity: clamp01(phone * 1.4), transform: `translateY(${(1 - phone) * 200}px) rotate(${(1 - phone) * 5}deg)` }}>
        <Phone title="Kasun R." clock="11:40" glow={0.3 * clamp01(alert)}
          avatar={<Avatar label="K" size={44} bg="#4A4A4A" />}
          subtitle={<span style={{ color: tapped ? C.white : C.orange }}>{tapped ? "● Dr. Fernando is in the chat" : "● Catalyst is replying"}</span>}>
          <Bubble side="them" time="11:40 PM" p={pop(f, U.ask, 14, 200)}>My face is swollen after the extraction and it really hurts 😣</Bubble>
          {f >= U.reply - 1 && (
            <Bubble side="me" ai time="11:40 PM" ticks p={pop(f, U.reply, 13, 190)}>
              I'm sorry, Kasun. I've alerted <b>Dr. Fernando</b> right now. He'll reply to you here.
            </Bubble>
          )}
          {f >= U.tap + 3 && (
            <div style={{ display: "flex", justifyContent: "center", opacity: clamp01(sys * 1.5), transform: `scale(${0.85 + 0.15 * sys})` }}>
              <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.orange2, background: "rgba(255,138,76,0.1)", border: "1px solid rgba(255,138,76,0.35)", padding: "7px 14px", borderRadius: 10 }}>Dr. Fernando joined · AI paused</span>
            </div>
          )}
          {f >= U.doctor - 1 && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{
                maxWidth: "86%", background: C.white, color: C.char, borderRadius: 22, borderBottomRightRadius: 6, padding: "13px 17px 9px", fontFamily: FONT, fontSize: 23, lineHeight: 1.36, fontWeight: 500,
                opacity: clamp01(doc * 2), transform: `translateY(${(1 - doc) * 18}px) scale(${0.86 + 0.14 * doc})`, transformOrigin: "bottom right",
              }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.ember, letterSpacing: 0.5, marginBottom: 2 }}>Dr. Fernando</div>
                Hi Kasun, I'm here. Can you come in at 8 AM tomorrow?
                <div style={{ fontSize: 14, marginTop: 4, textAlign: "right", fontWeight: 700, opacity: 0.55 }}>11:42 PM ✓✓</div>
              </div>
            </div>
          )}
        </Phone>
      </div>

      <Cursor x={cx} y={cy} opacity={clamp01(cIn * 3) * (1 - cOut)} press={press} />
    </>
  );
}
