// 0:06–0:12 — The same questions scroll past at speed. "Every. Single. Day." slams on the beat,
// a tally of this week's repeats, then everything freezes and drops away: the phone goes quiet.
import { useCurrentFrame } from "remotion";
import { C, DISPLAY, FONT, Slam, Words, clamp01, cues, easeIn, pop, prog, rng } from "../kit";

const P = cues.pain;
const FEED: [string, string][] = [
  ["Sanuli's Amma", "Sir class time?"], ["Kavindu", "Recording link pls 🙏"], ["Mr. Ruwan", "Fees how much?"],
  ["Tharushi", "Miss tomorrow class thiyanawada?"], ["Nethmi", "Sir class eppo?"], ["Dinuka", "Paper class kawadda?"],
  ["Amaya's Thaththa", "Fees kiyada sir?"], ["Yasiru", "Link eka ewanna"], ["Hasini", "Class time??"],
  ["Pasindu", "Today class thiyanawada?"], ["Ishara's Amma", "Recording eka denna"], ["Sahan", "Sir what time tomorrow?"],
  ["Malsha", "Fees evlo sir?"], ["Chamod", "Zoom link?"], ["Ravindu's Amma", "Class cancel da?"], ["Senuri", "Recording link?"],
];
const ROW = 150;
const LAYOUT = (() => {
  const r = rng(21);
  return Array.from({ length: 40 }, (_, i) => ({ x: 60 + r() * 330, tilt: (r() - 0.5) * 4, i: i % FEED.length }));
})();
const TALLY: [string, string][] = [["Class time?", "×38"], ["Recording link?", "×31"], ["Fees how much?", "×24"]];

export function Pain() {
  const f = useCurrentFrame();
  const frozen = f >= P.freeze;
  const tf = Math.min(f, P.freeze);
  // fast scroll, easing in from the swipe
  const scroll = tf * 26;
  const fall = prog(f, P.freeze + 2, P.freeze + 22, easeIn);
  const dim = 1 - 0.55 * prog(f, P.every[0] - 4, P.every[0] + 4);
  const grey = prog(f, P.freeze, P.freeze + 4);
  const black = prog(f, P.freeze + 6, P.freeze + 24);
  const words = 1 - prog(f, P.tally[0] - 8, P.tally[0]);
  return (
    <>
      {/* the feed */}
      <div style={{ position: "absolute", inset: 0, opacity: dim * (1 - black), filter: `grayscale(${grey}) ${frozen ? "" : "blur(1.2px)"}` }}>
        {LAYOUT.map((l, k) => {
          const y = 1950 + k * ROW - scroll + fall * (600 + (k % 5) * 160);
          if (y < -200 || y > 2100) return null;
          const [who, msg] = FEED[l.i];
          return (
            <div key={k} style={{ position: "absolute", left: l.x, top: y, transform: `rotate(${l.tilt + fall * (k % 2 ? 14 : -14)}deg)`, fontFamily: FONT }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.orange, opacity: 0.85, marginLeft: 8, marginBottom: 6 }}>{who}</div>
              <div style={{ background: C.grey, color: C.white, fontSize: 38, fontWeight: 700, padding: "18px 28px", borderRadius: 32, borderBottomLeftRadius: 8, whiteSpace: "nowrap", boxShadow: "0 20px 40px -18px rgba(0,0,0,0.9)" }}>{msg}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 760, background: "linear-gradient(#1A1A1A 45%, rgba(26,26,26,0))", opacity: (1 - black) * 0.95 }} />

      {/* "Same questions." */}
      <div style={{ position: "absolute", left: 80, right: 80, top: 210, color: C.white, opacity: 1 - prog(f, P.every[0] - 6, P.every[0]) }}>
        <Words text="Same" start={P.same} style={{ fontFamily: DISPLAY, fontSize: 150, fontWeight: 800, letterSpacing: -6, lineHeight: 1 }} />
        <Words text="*questions.*" start={P.same + 6} style={{ fontFamily: DISPLAY, fontSize: 118, fontWeight: 800, letterSpacing: -5, lineHeight: 1.1 }} />
      </div>

      {/* Every. Single. Day. */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 560, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: words * (1 - black), transform: `translateY(${(1 - words) * -120}px)` }}>
        {["Every.", "Single.", "Day."].map((w, i) => (
          <Slam key={w} at={P.every[i]} style={{ fontFamily: DISPLAY, fontSize: 176, fontWeight: 900, letterSpacing: -8, lineHeight: 1.1, color: i === 2 ? C.orange : C.white, textShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>{w}</Slam>
        ))}
      </div>

      {/* this week's tally */}
      <div style={{ position: "absolute", left: 80, right: 80, top: 480, opacity: 1 - black, transform: `translateY(${fall * 400}px)` }}>
        <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 800, letterSpacing: 6, color: C.soft, marginBottom: 24, opacity: prog(f, P.tally[0], P.tally[0] + 6) }}>ASKED THIS WEEK</div>
        {TALLY.map(([q, n], i) => {
          const p = pop(f, P.tally[i], 13, 260);
          if (f < P.tally[i]) return null;
          return (
            <div key={q} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, padding: "28px 36px", borderRadius: 34,
              background: "linear-gradient(170deg, rgba(58,58,58,0.95), rgba(36,36,36,0.97))", border: "1.5px solid rgba(255,255,255,0.08)",
              opacity: clamp01(p * 2), transform: `translateX(${(1 - p) * 260}px) rotate(${(1 - p) * 4}deg)`,
              boxShadow: "0 40px 80px -30px rgba(0,0,0,0.9)",
            }}>
              <span style={{ fontFamily: FONT, fontSize: 46, fontWeight: 800, color: C.white }}>“{q}”</span>
              <span style={{ fontFamily: DISPLAY, fontSize: 64, fontWeight: 900, color: C.orange, letterSpacing: -2 }}>{n}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
