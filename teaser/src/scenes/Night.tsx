import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, DISPLAY, RiseLines, SCENES, TEXT, cues, progress, useOrient } from "../kit";

// 11:47 PM. Parent messages keep arriving and stacking up.
const CARDS = [
  { who: "Nimal's mum", msg: "Fees kiyada for Grade 8?" },
  { who: "Parent · Grade 9", msg: "What time is class tomorrow?" },
  { who: "Kavitha", msg: "Next class eppo start aagum?" },
  { who: "Ruwan", msg: "Did you get my payment slip?" },
  { who: "Ayesha", msg: "Is there a free trial class?" },
  { who: "Kasun", msg: "Class eka cancel da ada?" },
  { who: "Sanjay", msg: "Payment pannitten, check pannunga" },
  { who: "Dilani", msg: "Can my son join the maths class?" },
  { who: "Parent · Grade 7", msg: "Seats thiyenawada?" },
  { who: "Farah", msg: "Where is the class held?" },
  { who: "Tharindu", msg: "Sir, fees eka kohomada gewanne?" },
  { who: "Meena", msg: "Online class irukka?" },
];

const initials = (name: string) => name.replace(/[^A-Za-z ]/g, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export function Night() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { portrait, feed, pick } = useOrient();
  // Vertical positions for the tall layouts: 9:16 (Reels/Stories) and 4:5 (feed).
  const P = feed ? { clock: 50, cards: 440, cardsH: 520, head: 1000 } : { clock: 160, cards: 640, cardsH: 720, head: 1390 };

  const pings = cues.pings.map((p) => p - SCENES.night[0]);
  const arrived = pings.filter((p) => frame >= p).length;
  const unread = arrived ? arrived * 4 - 1 : 0;
  const lastPing = pings[Math.max(0, arrived - 1)];
  const badgePop = arrived ? 1 + 0.12 * Math.max(0, 1 - (frame - lastPing) / 8) : 1;
  const glow = pings.reduce((m, p) => (frame >= p && frame - p < 18 ? Math.max(m, 1 - (frame - p) / 18) : m), 0);

  const H = pick(150, 172), GAP = pick(18, 22), W = pick(800, 920);
  const s = pings.map((p) => spring({ frame: frame - p, fps, config: { damping: 17, stiffness: 180, mass: 0.7 } }));

  const clock = frame >= 120 ? "11:48" : "11:47";
  const fadeIn = progress(frame, 0, 12);

  const clockBlock = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: portrait ? "center" : "flex-start", opacity: fadeIn }}>
      <div style={{ fontFamily: DISPLAY, fontSize: pick(30, 34), fontWeight: 600, letterSpacing: "0.22em", color: C.muteDark }}>TUESDAY NIGHT</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 18, fontFamily: DISPLAY, color: C.white, marginTop: 6 }}>
        <span style={{ fontSize: pick(190, 200), fontWeight: 300, letterSpacing: "-0.05em", lineHeight: 1 }}>{clock}</span>
        <span style={{ fontSize: pick(60, 64), fontWeight: 600, color: C.muteDark }}>PM</span>
      </div>
      <div style={{
        marginTop: pick(26, 24), opacity: arrived ? 1 : 0, transform: `scale(${badgePop})`, transformOrigin: portrait ? "center" : "left center",
        background: C.orange, color: C.ink, fontFamily: DISPLAY, fontWeight: 700, fontSize: pick(36, 40),
        padding: "12px 30px", borderRadius: 999, display: "flex", alignItems: "center", gap: 14,
      }}>
        <span style={{ width: 14, height: 14, borderRadius: 7, background: C.ink }} />
        {unread} unread messages
      </div>
    </div>
  );

  const headline = (
    <RiseLines start={86} gap={6} lines={["The messages", <span style={{ color: C.orange }}>never stop.</span>]}
      style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: pick(92, 98), lineHeight: 1.05, letterSpacing: "-0.035em", color: C.white, textAlign: portrait ? "center" : "left" }} />
  );

  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${pick("72% 50%", "50% 48%")}, rgba(255,138,76,${0.1 + glow * 0.12}), transparent 55%)` }} />

      {portrait ? (
        <>
          <div style={{ position: "absolute", top: P.clock, left: 0, right: 0 }}>{clockBlock}</div>
          <div style={{ position: "absolute", top: P.head, left: 60, right: 60 }}>{headline}</div>
        </>
      ) : (
        <div style={{ position: "absolute", left: 140, top: 0, bottom: 0, width: 760, display: "flex", flexDirection: "column", justifyContent: "center", gap: 70 }}>
          {clockBlock}
          <div style={{ minHeight: 200 }}>{headline}</div>
        </div>
      )}

      <div style={{
        position: "absolute", left: pick(980, 80), top: pick(130, P.cards), width: W, height: pick(820, P.cardsH),
        WebkitMaskImage: "linear-gradient(to bottom, black 72%, transparent 100%)",
      }}>
        {CARDS.map((c, i) => {
          if (frame < pings[i] - 1) return null;
          let y = 0;
          for (let j = i + 1; j < CARDS.length; j++) y += s[j] * (H + GAP);
          const si = s[i];
          const newest = i === arrived - 1;
          return (
            <div key={i} style={{
              position: "absolute", left: 0, top: 0, width: W, height: H, boxSizing: "border-box",
              transform: `translateY(${y + (1 - si) * -50}px) scale(${0.9 + 0.1 * si})`, transformOrigin: "top center",
              opacity: Math.min(1, si * 1.5), background: C.card, borderRadius: 30,
              border: `2px solid ${newest ? C.orange : C.line}`,
              display: "flex", alignItems: "center", gap: 26, padding: "0 32px",
            }}>
              <div style={{
                width: pick(84, 96), height: pick(84, 96), borderRadius: "50%", flex: "none", background: "#3A3A3A",
                display: "grid", placeItems: "center", color: C.white, fontFamily: DISPLAY, fontWeight: 700, fontSize: pick(30, 34),
              }}>{initials(c.who) || "P"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontFamily: TEXT, fontWeight: 600, fontSize: pick(30, 34), color: C.white }}>{c.who}</span>
                  <span style={{ fontFamily: TEXT, fontWeight: 500, fontSize: pick(26, 28), color: newest ? C.orange : C.muteDark }}>now</span>
                </div>
                <div style={{ fontFamily: TEXT, fontWeight: 500, fontSize: pick(34, 37), color: "#E4E4E4", marginTop: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.msg}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
