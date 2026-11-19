// 0:18–0:28 — Counter or phone? The reply goes an hour late, and the phone customer is gone.
import { useCurrentFrame } from "remotion";
import { Bubble, C, DISPLAY, FONT, Headline, PersonIcon, PhoneIcon, Words, card, clamp01, cues, easeIn, lerp, pop, prog } from "../kit";

const L = cues.loss;

function Plate({ icon, label, p, hot }: { icon: JSX.Element; label: string; p: number; hot: number }) {
  return (
    <div style={{
      width: 400, padding: "34px 24px 30px", ...card, borderRadius: 36, textAlign: "center",
      border: `2px solid rgba(255,138,76,${0.15 + 0.6 * hot})`,
      boxShadow: `0 40px 90px -30px rgba(0,0,0,0.85), 0 0 ${60 * hot}px rgba(255,138,76,${0.35 * hot})`,
      opacity: clamp01(p * 1.5), transform: `translateY(${(1 - p) * 60}px)`,
    }}>
      <div style={{ width: 120, height: 120, borderRadius: 120, margin: "0 auto 20px", background: hot > 0.5 ? "rgba(255,138,76,0.18)" : C.grey, display: "grid", placeItems: "center" }}>{icon}</div>
      <div style={{ fontFamily: FONT, color: C.white, fontSize: 40, fontWeight: 800, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

export function Loss() {
  const f = useCurrentFrame();

  // --- A: the seesaw of "who first?"
  const aOut = prog(f, 92, 106, easeIn);
  const tilt = Math.sin(f / 9) * lerp(4, 11, prog(f, 10, 90));
  const left = pop(f, 18), right = pop(f, 26);

  // --- B: the thread with an hour-long gap
  const bIn = prog(f, 100, 116);
  const gap = prog(f, L.jump, L.jumpEnd, (x) => x * x * (3 - 2 * x));
  const mins = Math.round(lerp(12, 74, gap));
  const tNow = `${1 + Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`;
  const lost = prog(f, L.lost, L.lost + 40);
  const strike = prog(f, L.lost + 10, L.lost + 26);

  return (
    <>
      {/* A */}
      {aOut < 1 && (
        <div style={{ position: "absolute", inset: 0, opacity: 1 - aOut, filter: aOut ? `blur(${aOut * 12}px)` : undefined }}>
          <Headline top={250}>
            <Words text="*ඉස්සරවෙන්නේ*" start={L.ask} style={{ fontSize: 112, fontWeight: 900 }} />
            <Words text="කාටද?" start={L.ask + 10} style={{ fontSize: 112, fontWeight: 900, color: "#E4E4E4" }} />
          </Headline>
          <div style={{ position: "absolute", left: 0, right: 0, top: 880, height: 700 }}>
            <div style={{ position: "absolute", left: 90, right: 90, top: 330, height: 14, borderRadius: 14, background: "linear-gradient(90deg, #555, #8a8a8a, #555)", transform: `rotate(${tilt}deg)` }} />
            <div style={{ position: "absolute", left: 500, top: 344, width: 0, height: 0, borderLeft: "40px solid transparent", borderRight: "40px solid transparent", borderBottom: `90px solid ${C.grey}` }} />
            <div style={{ position: "absolute", left: 60, top: 0, transform: `translateY(${Math.sin((tilt * Math.PI) / 180) * -440}px)` }}>
              <Plate icon={<PersonIcon size={74} color={tilt < 0 ? C.orange : C.soft} />} label="කවුන්ටරේ ඉන්න කෙනාටද," p={left} hot={clamp01(-tilt / 8)} />
            </div>
            <div style={{ position: "absolute", right: 60, top: 0, transform: `translateY(${Math.sin((tilt * Math.PI) / 180) * 440}px)` }}>
              <Plate icon={<PhoneIcon size={74} color={tilt > 0 ? C.orange : C.soft} />} label="ෆෝන් එකේ ඉන්න කෙනාටද?" p={right} hot={clamp01(tilt / 8)} />
            </div>
          </div>
        </div>
      )}

      {/* B */}
      {f >= 100 && (
        <div style={{ position: "absolute", inset: 0, opacity: bIn }}>
          <Headline top={230} style={{ fontSize: 66 }}>
            <Words text="රිප්ලයි එක යනකොට *පැයක් පහු වෙලා.*" start={L.jump - 6} out={L.lost - 22} />
          </Headline>
          <Headline top={200} style={{ fontSize: 50 }}>
            <Words text="කවුන්ටරේ ඉන්න කෙනාට" start={L.lost - 8} style={{ color: "#D0D0D0", fontWeight: 700 }} />
            <Words text="උත්තර දුන්නත්..." start={L.lost - 2} style={{ color: "#D0D0D0", fontWeight: 700 }} />
            <Words text="ෆෝන් එකේ කෙනා *අහිමියි.*" start={L.lost + 8} stagger={5} dur={20} style={{ fontSize: 68, fontWeight: 900, marginTop: 8 }} />
          </Headline>

          <div style={{
            position: "absolute", left: 70, right: 70, top: 560, height: 1060, ...card, borderRadius: 48, overflow: "hidden",
            transform: `translateY(${(1 - bIn) * 80 + lost * 60}px) rotate(${lost * -2.5}deg) scale(${1 - lost * 0.05})`,
            opacity: 1 - lost * 0.45, filter: `grayscale(${lost})`,
          }}>
            {/* header */}
            <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "28px 36px", borderBottom: "1.5px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.25)" }}>
              <div style={{ width: 74, height: 74, borderRadius: 74, background: C.grey, display: "grid", placeItems: "center", fontFamily: FONT, fontWeight: 800, fontSize: 32, color: C.white }}>K</div>
              <div style={{ fontFamily: FONT, color: C.white }}>
                <div style={{ fontSize: 34, fontWeight: 700 }}>Kasun</div>
                <div style={{ fontSize: 23, color: C.mute, fontWeight: 500 }}>{lost > 0.3 ? "last seen 2:15 PM" : "online"}</div>
              </div>
            </div>
            <div style={{ position: "relative", padding: "34px 34px" }}>
              <Bubble side="them" time="1:12 PM" p={pop(f, L.msg, 14, 200)}>Bag eka thiyenawada?</Bubble>

              {/* the hour that passes */}
              <div style={{ height: lerp(40, 330, gap), position: "relative", overflow: "hidden", opacity: clamp01(gap * 4) }}>
                <div style={{ position: "absolute", left: 0, right: 0, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 26, justifyContent: "center" }}>
                  <div style={{ flex: 1, height: 2, background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.25) 0 10px, transparent 10px 20px)" }} />
                  <svg width="170" height="170" viewBox="-85 -85 170 170">
                    <circle r="78" fill="#151515" stroke={C.orange} strokeWidth="5" />
                    {Array.from({ length: 12 }, (_, k) => <line key={k} x1="0" y1="-62" x2="0" y2="-70" stroke="#fff" strokeOpacity="0.5" strokeWidth="4" transform={`rotate(${k * 30})`} />)}
                    <path d={`M0 0 L0 -64 A64 64 0 ${gap > 0.5 ? 1 : 0} 1 ${Math.sin(gap * 2 * Math.PI) * 64} ${-Math.cos(gap * 2 * Math.PI) * 64} Z`} fill={C.orange} opacity="0.35" />
                    <line x1="0" y1="0" x2="0" y2="-60" stroke={C.orange} strokeWidth="5" strokeLinecap="round" transform={`rotate(${gap * 360})`} />
                    <line x1="0" y1="0" x2="0" y2="-38" stroke="#fff" strokeWidth="6" strokeLinecap="round" transform={`rotate(${36 + gap * 30})`} />
                    <circle r="6" fill="#fff" />
                  </svg>
                  <div style={{ fontFamily: DISPLAY, color: C.white, textAlign: "left" }}>
                    <div style={{ fontSize: 70, fontWeight: 800, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{tNow}</div>
                    <div style={{ fontFamily: FONT, fontSize: 32, fontWeight: 800, color: C.orange, marginTop: 8 }}>+1 පැය</div>
                  </div>
                  <div style={{ flex: 1, height: 2, background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.25) 0 10px, transparent 10px 20px)" }} />
                </div>
              </div>

              <Bubble side="me" time="2:14 PM" ticks p={pop(f, L.reply, 14, 200)}>Ow thiyenawa! Rs. 3,200.</Bubble>
              <Bubble side="them" time="2:15 PM" p={pop(f, L.bye, 14, 200)} style={{ marginTop: 22 }}>It's ok, වෙන කඩයකින් ගත්තා.</Bubble>

              {/* the sale that walked */}
              <div style={{ display: "flex", justifyContent: "center", marginTop: 40, opacity: prog(f, L.lost, L.lost + 12), transform: `scale(${0.8 + 0.2 * pop(f, L.lost)})` }}>
                <div style={{ position: "relative", fontFamily: DISPLAY, fontSize: 56, fontWeight: 800, color: "#9a9a9a", padding: "14px 34px", borderRadius: 24, border: "2px dashed rgba(255,255,255,0.25)" }}>
                  Rs. 3,200
                  <div style={{ position: "absolute", left: 20, right: 20, top: "52%", height: 6, borderRadius: 6, background: C.white, transformOrigin: "left", transform: `scaleX(${strike}) rotate(-4deg)` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
