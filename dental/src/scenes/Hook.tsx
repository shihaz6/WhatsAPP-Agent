// 0:00–0:07 — Mid root canal. The clinic's WhatsApp piles up on the lock screen, and every unanswered chat walks.
import { useCurrentFrame } from "remotion";
import { C, DISPLAY, Eyebrow, FONT, Words, clamp01, cues, pop, prog } from "../kit";

const HK = cues.hook;
const NOTES: [string, string][] = [
  ["Nadeesha P.", "How much is scaling? 🦷"],
  ["Kasun R.", "Toothache since morning, can I come today?"],
  ["Sunethra W.", "Are you open on Sunday?"],
  ["Rizwan M.", "Do you do braces for adults?"],
  ["Priya S.", "Price for teeth whitening?"],
  ["Dilan F.", "Is there parking near the clinic?"],
  ["Tharushi K.", "Can my son get a check-up on Saturday?"],
];
const CARD = 104;

function WaIcon({ size = 30 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, background: C.orange, display: "grid", placeItems: "center", flexShrink: 0 }}>
      <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 24 24"><path d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5z" fill={C.char} /></svg>
    </div>
  );
}

export function Hook() {
  const f = useCurrentFrame();
  const phone = pop(f, HK.phone, 16, 120);
  const arrived = HK.msgs.filter((m) => f >= m).length;
  const unread = arrived * 2;
  // a buzz on every arrival
  const buzz = HK.msgs.reduce((acc, m) => { const d = f - m; return d >= 0 && d < 8 ? Math.sin(d * 2.6) * (8 - d) * 1.1 : acc; }, 0);
  const lostCount = HK.lost.filter((m) => f >= m).length;

  return (
    <>
      {/* left: the line */}
      <div style={{ position: "absolute", left: 130, top: 250, width: 980, color: C.white }}>
        <div style={{ opacity: 1 - prog(f, HK.cost - 10, HK.cost) }}>
          <Eyebrow color={C.soft} style={{ opacity: prog(f, 2, 14) }}>Tuesday · 1:14 PM · Chair 2</Eyebrow>
        </div>
        <div style={{ position: "relative", marginTop: 28, height: 420 }}>
          <div style={{ position: "absolute", inset: 0 }}>
            <Words text="You're mid" start={HK.title} stagger={4} out={HK.cost - 12} style={{ fontFamily: DISPLAY, fontSize: 150, fontWeight: 800, lineHeight: 1, letterSpacing: -5 }} />
            <Words text="*root canal.*" start={HK.title + 8} stagger={4} out={HK.cost - 10} style={{ fontFamily: DISPLAY, fontSize: 150, fontWeight: 800, lineHeight: 1.05, letterSpacing: -5 }} />
            <Words text="Your WhatsApp doesn't wait." start={40} stagger={3} out={HK.cost - 14} style={{ fontFamily: FONT, fontSize: 44, fontWeight: 600, color: C.soft, marginTop: 36 }} />
          </div>
          <div style={{ position: "absolute", inset: 0 }}>
            <Words text="Every unanswered" start={HK.cost} stagger={3} style={{ fontFamily: DISPLAY, fontSize: 112, fontWeight: 800, lineHeight: 1.02, letterSpacing: -4 }} />
            <Words text="chat is a" start={HK.cost + 6} stagger={3} style={{ fontFamily: DISPLAY, fontSize: 112, fontWeight: 800, lineHeight: 1.02, letterSpacing: -4 }} />
            <Words text="*lost patient.*" start={HK.cost + 12} stagger={4} style={{ fontFamily: DISPLAY, fontSize: 112, fontWeight: 800, lineHeight: 1.02, letterSpacing: -4 }} />
          </div>
        </div>
      </div>

      {/* right: the lock screen */}
      <div style={{ position: "absolute", left: 1300, top: 76, opacity: clamp01(phone * 1.4), transform: `translateY(${(1 - phone) * 260}px) translateX(${buzz}px) rotate(${(1 - phone) * 6 + buzz * 0.08}deg)` }}>
        <div style={{ width: 470, height: 930, borderRadius: 64, padding: 12, background: "linear-gradient(150deg, #3d3d3d, #171717 40%, #0b0b0b)", boxShadow: "0 50px 90px -30px rgba(0,0,0,0.9), 0 0 0 2px #2c2c2c, inset 0 0 0 2px rgba(255,255,255,0.07)" }}>
          <div style={{ width: "100%", height: "100%", borderRadius: 53, overflow: "hidden", position: "relative", background: "radial-gradient(ellipse at 50% 0%, #3a2a22 0%, #161616 55%, #0d0d0d 100%)" }}>
            <div style={{ width: 110, height: 30, borderRadius: 30, background: "#000", position: "absolute", left: "50%", top: 13, transform: "translateX(-50%)" }} />
            <div style={{ position: "absolute", top: 70, left: 0, right: 0, textAlign: "center", fontFamily: FONT, color: C.white }}>
              <div style={{ fontSize: 19, fontWeight: 600, opacity: 0.75 }}>Tuesday 17 November</div>
              <div style={{ fontFamily: DISPLAY, fontSize: 104, fontWeight: 600, lineHeight: 1.05, letterSpacing: -2 }}>1:14</div>
            </div>
            {/* unread badge */}
            <div style={{ position: "absolute", top: 222, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: prog(f, HK.msgs[0], HK.msgs[0] + 6) }}>
              <div style={{ fontFamily: FONT, fontSize: 17, fontWeight: 800, color: C.char, background: C.orange, padding: "6px 14px", borderRadius: 999, transform: `scale(${1 + 0.12 * Math.max(0, 1 - (f - HK.msgs[Math.max(0, arrived - 1)]) / 6)})` }}>
                {unread} unread · Your Dental Clinic
              </div>
            </div>
            <div style={{ position: "absolute", top: 268, left: 14, right: 14, bottom: 0 }}>
              {NOTES.map(([who, msg], i) => {
                const at = HK.msgs[i];
                if (f < at - 1) return null;
                const p = pop(f, at, 15, 220);
                const newer = HK.msgs.filter((m) => m > at && f >= m).length;
                const shift = HK.msgs.slice(i + 1).reduce((s, m) => s + prog(f, m, m + 8) * CARD, 0);
                const lostIdx = (arrived - 1) - i; // newest card is index 0 of the stack
                const lost = lostIdx >= 0 && lostIdx < lostCount;
                const lp = lostIdx >= 0 && lostIdx < HK.lost.length ? prog(f, HK.lost[lostIdx], HK.lost[lostIdx] + 8) : 0;
                return (
                  <div key={i} style={{
                    position: "absolute", left: 0, right: 0, top: shift, height: CARD - 10, borderRadius: 22, padding: "13px 16px",
                    background: "rgba(58,58,58,0.82)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 12, alignItems: "flex-start",
                    opacity: clamp01(p * 1.5) * (newer > 5 ? 0 : 1) * (1 - 0.5 * lp), transform: `translateY(${(1 - p) * -40}px) scale(${0.9 + 0.1 * p})`,
                    filter: lp > 0 ? `grayscale(${lp})` : undefined,
                  }}>
                    <WaIcon />
                    <div style={{ flex: 1, minWidth: 0, fontFamily: FONT }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: C.white, fontSize: 18, fontWeight: 800 }}>
                        <span>{who}</span><span style={{ color: C.soft, fontWeight: 600, fontSize: 15 }}>now</span>
                      </div>
                      <div style={{ color: "#DADADA", fontSize: 18, fontWeight: 500, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{msg}</div>
                    </div>
                    {lost && (
                      <div style={{ position: "absolute", right: 14, top: "50%", transform: `translateY(-50%) rotate(-6deg) scale(${1.6 - 0.6 * lp})`, opacity: lp, fontFamily: FONT, fontSize: 15, fontWeight: 800, letterSpacing: 1.5, color: C.orange, border: `2.5px solid ${C.orange}`, borderRadius: 8, padding: "4px 9px", background: "rgba(26,26,26,0.92)", whiteSpace: "nowrap" }}>
                        BOOKED ELSEWHERE
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
