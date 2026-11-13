import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, DISPLAY, Icon, RiseLines, TEXT, cues, progress, useOrient } from "../kit";

// Eight kinds of business. Each tile shows a customer's question, then flips to orange: answered.
const TILES = [
  { icon: "book", who: "Tutors", q: "Fees for Grade 10?", a: "LKR 3,500 a month" },
  { icon: "bag", who: "Shops", q: "Delivery to Galle?", a: "Yes, in 2 days" },
  { icon: "home", who: "Real estate", q: "Still available?", a: "Viewing booked" },
  { icon: "scissors", who: "Salons", q: "Any slots Saturday?", a: "Booked for 11:00" },
  { icon: "plus", who: "Clinics", q: "Is the doctor in?", a: "Token #12 confirmed" },
  { icon: "fork", who: "Restaurants", q: "Table for 4 tonight?", a: "Reserved for 8 PM" },
  { icon: "dumbbell", who: "Gyms", q: "Membership price?", a: "LKR 6,000 a month" },
  { icon: "plane", who: "Travel", q: "Ella trip next week?", a: "Package sent" },
];

export function Grid() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { portrait, pick3 } = useOrient();
  const G = cues.grid;
  const L = pick3(
    { cols: 4, w: 400, h: 300, gap: 26, top: 330, head: 80, fs: 60 },
    { cols: 2, w: 465, h: 262, gap: 24, top: 440, head: 180, fs: 92 },
    { cols: 2, w: 465, h: 244, gap: 22, top: 270, head: 50, fs: 76 },
  );
  const gridW = L.cols * L.w + (L.cols - 1) * L.gap;
  const zoom = interpolate(frame, [80, 128], [1, 1.04], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exit = progress(frame, 116, 128, Easing.in(Easing.cubic));

  return (
    <AbsoluteFill style={{ background: C.paper, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, opacity: 1 - exit }}>
        <div style={{ position: "absolute", top: L.head, left: 0, right: 0, textAlign: "center" }}>
          <RiseLines start={2} gap={6} lines={portrait ? ["One front desk.", <span>Every <span style={{ background: C.orange, padding: "0 0.12em", borderRadius: 12 }}>business.</span></span>] : [<span>One front desk. Every <span style={{ background: C.orange, padding: "0 0.12em", borderRadius: 12 }}>business.</span></span>]}
            style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: L.fs * (portrait ? 1 : 1.35), lineHeight: 1.08, letterSpacing: "-0.04em", color: C.ink }} />
        </div>
        <div style={{ position: "absolute", top: L.top, left: "50%", marginLeft: -gridW / 2, width: gridW, display: "grid", gridTemplateColumns: `repeat(${L.cols}, ${L.w}px)`, gap: L.gap }}>
          {TILES.map((t, i) => {
            const enter = spring({ frame: frame - i * 2, fps, config: { damping: 16, stiffness: 140 } });
            const flipAt = G.first + i * G.every;
            const f = spring({ frame: frame - flipAt, fps, config: { damping: 13, stiffness: 120, mass: 0.8 } });
            const deg = f * 180;
            const showBack = deg > 90;
            return (
              <div key={t.who} style={{ height: L.h, perspective: 1200, opacity: Math.min(1, enter * 1.5), transform: `translateY(${(1 - enter) * 50}px)` }}>
                <div style={{
                  width: "100%", height: "100%", position: "relative", transform: `rotateY(${deg}deg)`, transformStyle: "preserve-3d",
                }}>
                  {!showBack ? (
                    <div style={{ position: "absolute", inset: 0, borderRadius: 30, background: C.white, border: "2px solid #E4E4E4", padding: "26px 28px", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 20px 40px -24px rgba(26,26,26,0.3)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <span style={{ width: 56, height: 56, borderRadius: 16, background: C.ink, display: "grid", placeItems: "center" }}><Icon name={t.icon} size={30} color={C.orange} /></span>
                        <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 30, color: C.ink, letterSpacing: "-0.02em" }}>{t.who}</span>
                      </div>
                      <div style={{ alignSelf: "flex-start", background: C.paper, borderRadius: 18, borderTopLeftRadius: 6, padding: "12px 18px", fontFamily: TEXT, fontWeight: 600, fontSize: 27, color: C.ink }}>{t.q}</div>
                    </div>
                  ) : (
                    <div style={{ position: "absolute", inset: 0, borderRadius: 30, background: C.orange, padding: "26px 28px", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between", transform: "rotateY(180deg)", color: C.ink }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 30, letterSpacing: "-0.02em" }}>{t.who}</span>
                        <span style={{ width: 52, height: 52, borderRadius: 26, background: C.ink, display: "grid", placeItems: "center" }}><Icon name="check" size={30} color={C.orange} stroke={3.4} /></span>
                      </div>
                      <div>
                        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 33, lineHeight: 1.1, letterSpacing: "-0.02em" }}>{t.a}</div>
                        <div style={{ marginTop: 6, fontFamily: TEXT, fontWeight: 700, fontSize: 20, opacity: 0.8 }}>answered in 2s</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
