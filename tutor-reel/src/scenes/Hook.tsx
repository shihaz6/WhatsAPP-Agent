// 0:00–0:06 — 11:47 PM. The tutor's phone won't stop buzzing; the unread badge slams 47… 83… 126… and keeps going.
import { useCurrentFrame } from "remotion";
import { C, DISPLAY, FONT, Words, clamp01, cues, pop, prog } from "../kit";

const HK = cues.hook;
const MSGS: [string, string][] = [
  ["Sanuli's Amma", "Sir class time?"],
  ["Kavindu", "Recording link pls 🙏"],
  ["Mr. Ruwan", "Fees how much?"],
  ["Tharushi", "Miss tomorrow class thiyanawada?"],
  ["Nethmi", "Sir class eppo?"],
  ["Dinuka", "Paper class kawadda?"],
  ["Amaya's Thaththa", "Fees kiyada sir?"],
  ["Yasiru", "Link eka ewanna 🙏"],
  ["Hasini", "Sir what time tomorrow?"],
  ["Pasindu", "Today class thiyanawada?"],
  ["Ishara's Amma", "Recording eka denna"],
  ["Sahan", "Class time??"],
];
const CARD = 132;

function WaIcon({ size = 48 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, background: C.orange, display: "grid", placeItems: "center", flexShrink: 0 }}>
      <svg width={size * 0.64} height={size * 0.64} viewBox="0 0 24 24"><path d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5z" fill={C.char} /></svg>
    </div>
  );
}

export function Hook() {
  const f = useCurrentFrame();
  // unread: jumps on the beat, creeps between
  let unread = HK.jumps[0][1];
  for (let i = 0; i < HK.jumps.length; i++) {
    const [at, n] = HK.jumps[i];
    if (f >= at) unread = n;
    const next = HK.jumps[i + 1];
    if (next && f >= at && f < next[0]) unread = n + Math.floor(((f - at) / (next[0] - at)) * (next[1] - n) * 0.5);
  }
  const lastJump = [...HK.jumps].reverse().find(([at]) => f >= at)?.[0] ?? 0;
  const slam = pop(f, lastJump, 9, 400);
  const arrived = HK.pings.filter((p) => f >= p).length;
  const lastPing = HK.pings[Math.max(0, arrived - 1)];
  const d = f - lastPing;
  const buzz = d >= 0 && d < 6 ? Math.sin(d * 2.9) * (6 - d) * 2.2 : 0;
  const phoneIn = pop(f, -4, 16, 140);

  return (
    <>
      <div style={{ position: "absolute", left: 80, right: 80, top: 190, color: C.white }}>
        <Words text="Tutors," start={HK.words[0]} style={{ fontFamily: DISPLAY, fontSize: 112, fontWeight: 800, letterSpacing: -4, lineHeight: 1.05 }} />
        <Words text="is this your" start={HK.words[1]} style={{ fontFamily: DISPLAY, fontSize: 80, fontWeight: 700, letterSpacing: -3, lineHeight: 1.1, color: C.soft }} />
        <Words text="WhatsApp" start={HK.words[2]} style={{ fontFamily: DISPLAY, fontSize: 124, fontWeight: 800, letterSpacing: -5, lineHeight: 1.05 }} />
        <Words text="*every night?*" start={HK.words[3]} stagger={4} style={{ fontFamily: DISPLAY, fontSize: 96, fontWeight: 800, letterSpacing: -4, lineHeight: 1.1 }} />
      </div>

      {/* the lock screen */}
      <div style={{ position: "absolute", left: 150, top: 830, transform: `translateY(${(1 - phoneIn) * 500}px) translateX(${buzz}px) rotate(${-3 + buzz * 0.12}deg)` }}>
        <div style={{ width: 780, height: 1300, borderRadius: 96, padding: 16, background: "linear-gradient(150deg, #474747, #1a1a1a 38%, #0b0b0b)", boxShadow: "0 70px 120px -30px rgba(0,0,0,0.95), 0 0 0 3px #2c2c2c, inset 0 0 0 2px rgba(255,255,255,0.08)" }}>
          <div style={{ width: "100%", height: "100%", borderRadius: 81, overflow: "hidden", position: "relative", background: "radial-gradient(ellipse at 50% 0%, #3b2a20 0%, #171717 55%, #0d0d0d 100%)" }}>
            <div style={{ width: 170, height: 46, borderRadius: 46, background: "#000", position: "absolute", left: "50%", top: 18, transform: "translateX(-50%)" }} />
            <div style={{ position: "absolute", top: 96, left: 0, right: 0, textAlign: "center", fontFamily: FONT, color: C.white }}>
              <div style={{ fontSize: 28, fontWeight: 700, opacity: 0.75 }}>Tuesday 17 November</div>
              <div style={{ fontFamily: DISPLAY, fontSize: 150, fontWeight: 600, lineHeight: 1.05, letterSpacing: -4 }}>11:47</div>
            </div>
            <div style={{ position: "absolute", top: 330, left: 22, right: 22, bottom: 0 }}>
              {HK.pings.map((at, i) => {
                if (f < at) return null;
                const newer = arrived - 1 - i; // 0 = newest, on top
                if (newer > 5) return null;
                const p = pop(f, at, 15, 240);
                const [who, msg] = MSGS[i % MSGS.length];
                const y = HK.pings.slice(i + 1).reduce((s, m) => s + prog(f, m, m + 6) * CARD, 0);
                return (
                  <div key={i} style={{
                    position: "absolute", left: 0, right: 0, top: y, height: CARD - 14, borderRadius: 32, padding: "18px 22px",
                    background: "rgba(62,62,62,0.85)", border: "1.5px solid rgba(255,255,255,0.08)", display: "flex", gap: 18, alignItems: "center",
                    opacity: clamp01(p * 1.6) * (newer >= 5 ? 1 - prog(f, HK.pings[i + 5] ?? 1e9, (HK.pings[i + 5] ?? 1e9) + 6) : 1),
                    transform: `translateY(${(1 - p) * -60}px) scale(${0.9 + 0.1 * p})`,
                  }}>
                    <WaIcon />
                    <div style={{ flex: 1, minWidth: 0, fontFamily: FONT }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: C.white, fontSize: 27, fontWeight: 800 }}>
                        <span>{who}</span><span style={{ color: C.soft, fontWeight: 700, fontSize: 22 }}>now</span>
                      </div>
                      <div style={{ color: "#DDD", fontSize: 27, fontWeight: 600, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{msg}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {/* the badge */}
        <div style={{
          position: "absolute", right: -50, top: -70, minWidth: 210, height: 210, padding: "0 30px", boxSizing: "border-box", borderRadius: 210, background: C.orange, color: C.char,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: DISPLAY,
          boxShadow: `0 0 0 10px rgba(26,26,26,0.9), 0 30px 60px -10px rgba(255,138,76,${0.4 + 0.4 * (1 - Math.min(1, slam))})`,
          transform: `scale(${(0.6 + 0.4 * Math.min(1.2, slam)) * phoneIn}) rotate(${(1 - Math.min(1, slam)) * 12}deg)`,
        }}>
          <div style={{ fontSize: 88, fontWeight: 900, letterSpacing: -4, lineHeight: 1 }}>{unread}</div>
          <div style={{ fontFamily: FONT, fontSize: 21, fontWeight: 800, letterSpacing: 2.5, marginTop: 4 }}>UNREAD</div>
        </div>
      </div>
    </>
  );
}
