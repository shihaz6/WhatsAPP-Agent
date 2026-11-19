// 0:33–0:40. 11 PM, shop closed: a message still gets an instant reply.
import { useCurrentFrame } from "remotion";
import { Bubble, C, Chat, DISPLAY, FONT, Tag, Words, clamp01, cues, pop } from "../kit";

const N = cues.night;

function Moon({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill={C.orange} /></svg>
  );
}

export function Night() {
  const f = useCurrentFrame();
  const clock = pop(f, N.clock + 2, 13, 140);
  const blink = Math.floor(f / 15) % 2 === 0 ? 1 : 0.25;
  const phone = pop(f, 16, 16, 110);
  return (
    <>
      {/* the clock */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 110, display: "flex", justifyContent: "center", opacity: clamp01(clock * 1.4), transform: `scale(${0.8 + 0.2 * clock})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 34, padding: "26px 56px", borderRadius: 48, background: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.12)" }}>
          <Moon />
          <div style={{ fontFamily: DISPLAY, fontSize: 170, fontWeight: 800, color: C.white, letterSpacing: -4, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            11<span style={{ opacity: blink }}>:</span>00 <span style={{ fontSize: 90, color: C.orange }}>PM</span>
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 70, right: 70, top: 380, color: C.white }}>
        <Words text="Shop closed. *Reply in seconds.*" align="center" start={10} stagger={3} style={{ fontFamily: DISPLAY, fontSize: 80, fontWeight: 800, letterSpacing: -2.5, lineHeight: 1.05 }} />
      </div>

      <div style={{ position: "absolute", left: 70, top: 640, opacity: clamp01(phone * 1.4), transform: `translateY(${(1 - phone) * 260}px)` }}>
        <Chat height={1110} clock="11:00" subtitle="● Catalyst is replying" glow={0.5}>
          <Bubble side="them" time="11:00 PM" p={pop(f, N.ask, 14, 200)} fs={42}>හෙට කීයට ද open කරන්නේ? 🙏</Bubble>
          {f >= N.reply && (
            <Bubble side="me" ai time="11:00 PM" p={pop(f, N.reply, 13, 190)} fs={42}>
              Heta <b>9:00 AM</b> sita <b>8:30 PM</b> wenakan open 😊 Welcome!
            </Bubble>
          )}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 10, height: f >= N.chip ? undefined : 0 }}>
            {f >= N.chip && <Tag dark p={pop(f, N.chip, 13, 180)} style={{ fontFamily: FONT }}>⚡ Replied in 3 seconds</Tag>}
          </div>
        </Chat>
      </div>
    </>
  );
}
